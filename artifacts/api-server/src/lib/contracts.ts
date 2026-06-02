import { db } from "@workspace/db";
import { contractsTable, contractLineItemsTable, accountsTable } from "@workspace/db";
import { eq, and, inArray, sql, asc } from "drizzle-orm";

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
    .orderBy(asc(contractsTable.activatedAt));

  if (contracts.length === 0) return {};

  const contractIds = contracts.map((c) => c.id);
  const meta = new Map(contracts.map((c) => [c.id, c]));
  const lineItems = await db
    .select()
    .from(contractLineItemsTable)
    .where(inArray(contractLineItemsTable.contractId, contractIds));

  const out: Record<number, ContractPrice> = {};
  // Iterate in activation order so later contracts override earlier ones.
  for (const li of lineItems) {
    if (li.productId == null) continue;
    const m = meta.get(li.contractId);
    if (!m) continue;
    out[li.productId] = {
      productId: li.productId,
      unitPrice: Number(li.unitPrice),
      contractId: li.contractId,
      contractNumber: m.contractNumber,
    };
  }
  return out;
}
