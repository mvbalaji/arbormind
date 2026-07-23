import { db } from "@workspace/db";
import { contractsTable, contractLineItemsTable, accountsTable } from "@workspace/db";
import { eq, and, inArray, sql, asc, lt } from "drizzle-orm";

export interface ContractPrice {
  productId: number;
  unitPrice: number;
  contractId: number;
  contractNumber: string;
}

/**
 * Compute the contract end date from a start date and a term in months.
 */
export function computeEndDate(startDate: Date | null, termMonths: number | null): Date | null {
  if (!startDate || !termMonths) return null;
  const d = new Date(startDate);
  d.setMonth(d.getMonth() + termMonths);
  return d;
}

/**
 * Returns the negotiated per-product pricing in force for an account today.
 *
 * Pricing only applies when the account has CLM enabled (`clmEnabled`) and has
 * at least one activated contract whose date window covers today. When multiple
 * active contracts price the same product, the most recently activated wins.
 */
export async function getActiveContractPricing(accountId: number): Promise<Record<number, ContractPrice>> {
  const [account] = await db
    .select({ clmEnabled: accountsTable.clmEnabled })
    .from(accountsTable)
    .where(eq(accountsTable.id, accountId));
  if (!account?.clmEnabled) return {};

  // Reconcile any elapsed contracts before reading pricing so status and the
  // date window stay consistent.
  await expireElapsedContracts(accountId);

  const now = new Date();
  const contracts = await db
    .select({ id: contractsTable.id, contractNumber: contractsTable.contractNumber })
    .from(contractsTable)
    .where(
      and(
        eq(contractsTable.accountId, accountId),
        eq(contractsTable.status, "activated"),
        sql`(${contractsTable.startDate} IS NULL OR ${contractsTable.startDate} <= ${now})`,
        sql`(${contractsTable.endDate} IS NULL OR ${contractsTable.endDate} >= ${now})`,
      ),
    )
    .orderBy(asc(contractsTable.activatedAt), asc(contractsTable.id));

  if (contracts.length === 0) return {};

  const contractIds = contracts.map((c) => c.id);
  const meta = new Map(contracts.map((c) => [c.id, c]));
  // Activation rank: index in the activation-ordered list. Higher rank wins.
  const rank = new Map(contractIds.map((id, i) => [id, i]));
  const lineItems = await db
    .select()
    .from(contractLineItemsTable)
    .where(inArray(contractLineItemsTable.contractId, contractIds));

  const out: Record<number, ContractPrice> = {};
  const winningRank: Record<number, number> = {};
  // Row return order is not guaranteed, so compare activation rank explicitly:
  // the most recently activated contract's price wins per product.
  for (const li of lineItems) {
    if (li.productId == null) continue;
    const m = meta.get(li.contractId);
    if (!m) continue;
    const r = rank.get(li.contractId) ?? -1;
    if (li.productId in winningRank && winningRank[li.productId] >= r) continue;
    winningRank[li.productId] = r;
    out[li.productId] = {
      productId: li.productId,
      unitPrice: Number(li.unitPrice),
      contractId: li.contractId,
      contractNumber: m.contractNumber,
    };
  }
  return out;
}

/**
 * Transitions activated contracts whose end date has passed to `expired`.
 * Idempotent; scope to a single account when provided, otherwise all accounts.
 * Returns the number of contracts expired.
 */
export async function expireElapsedContracts(accountId?: number): Promise<number> {
  const now = new Date();
  const conditions = [
    eq(contractsTable.status, "activated"),
    sql`${contractsTable.endDate} IS NOT NULL`,
    lt(contractsTable.endDate, now),
  ];
  if (accountId != null) conditions.push(eq(contractsTable.accountId, accountId));
  const updated = await db
    .update(contractsTable)
    .set({ status: "expired", updatedAt: now })
    .where(and(...conditions))
    .returning({ id: contractsTable.id });
  return updated.length;
}
