import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  contractsTable,
  contractLineItemsTable,
  contractDocumentsTable,
  accountsTable,
  contactsTable,
  opportunitiesTable,
  opportunityItemsTable,
  usersTable,
} from "@workspace/db";
import { eq, and, sql, inArray, desc } from "drizzle-orm";

import { requireScreenAccess } from "../lib/access-control";
import { computeEndDate, getActiveContractPricing, expireElapsedContracts } from "../lib/contracts";
import { generateContractDocument } from "../lib/contract-document";


const router: IRouter = Router();
router.use("/contracts", requireScreenAccess("contracts"));

function parseId(raw: string): number | null {
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

type LineItemInput = {
  productId?: number | null;
  productName: string;
  quantity?: number;
  listPrice?: number;
  unitPrice: number;
  discount?: number;
};

const contractFields = {
  id: contractsTable.id,
  contractNumber: contractsTable.contractNumber,
  name: contractsTable.name,
  accountId: contractsTable.accountId,
  accountName: accountsTable.name,
  contactId: contractsTable.contactId,
  contactFirstName: contactsTable.firstName,
  contactLastName: contactsTable.lastName,
  opportunityId: contractsTable.opportunityId,
  opportunityName: opportunitiesTable.name,
  priceBookId: contractsTable.priceBookId,
  ownerId: contractsTable.ownerId,
  ownerName: usersTable.name,
  status: contractsTable.status,
  startDate: contractsTable.startDate,
  contractTermMonths: contractsTable.contractTermMonths,
  endDate: contractsTable.endDate,
  signedDate: contractsTable.signedDate,
  companySignedById: contractsTable.companySignedById,
  customerSignedByContactId: contractsTable.customerSignedByContactId,
  autoRenew: contractsTable.autoRenew,
  renewalTermMonths: contractsTable.renewalTermMonths,
  specialTerms: contractsTable.specialTerms,
  description: contractsTable.description,
  subtotal: contractsTable.subtotal,
  discount: contractsTable.discount,
  tax: contractsTable.tax,
  total: contractsTable.total,
  activatedAt: contractsTable.activatedAt,
  terminatedAt: contractsTable.terminatedAt,
  terminationReason: contractsTable.terminationReason,
  createdByUserId: contractsTable.createdByUserId,
  createdAt: contractsTable.createdAt,
  updatedAt: contractsTable.updatedAt,
};

type ContractRow = {
  contactFirstName?: string | null;
  contactLastName?: string | null;
  subtotal: string | null;
  discount: string | null;
  tax: string | null;
  total: string | null;
  [key: string]: unknown;
};

function formatContract(c: ContractRow, items: unknown[] = []) {
  const { contactFirstName, contactLastName, ...rest } = c;
  return {
    ...rest,
    contactName: contactFirstName ? `${contactFirstName} ${contactLastName ?? ""}`.trim() : null,
    subtotal: Number(c.subtotal),
    discount: Number(c.discount),
    tax: Number(c.tax),
    total: Number(c.total),
    items,
  };
}

function formatItem(item: { quantity: string; listPrice: string; unitPrice: string; discount: string; total: string; [key: string]: unknown }) {
  return {
    ...item,
    quantity: Number(item.quantity),
    listPrice: Number(item.listPrice),
    unitPrice: Number(item.unitPrice),
    discount: Number(item.discount),
    total: Number(item.total),
  };
}

function computeTotals(items: LineItemInput[], discountPct: number, taxPct: number) {
  let subtotal = 0;
  for (const item of items) {
    const qty = item.quantity ?? 1;
    subtotal += qty * item.unitPrice * (1 - (item.discount ?? 0) / 100);
  }
  const total = subtotal * (1 - discountPct / 100) * (1 + taxPct / 100);
  return { subtotal, total };
}

function itemRows(orgId: number, contractId: number, items: LineItemInput[]) {
  return items.map((item) => {
    const qty = item.quantity ?? 1;
    return {
      orgId,
      contractId,
      productId: item.productId ?? null,
      productName: item.productName,
      quantity: qty.toString(),
      listPrice: (item.listPrice ?? item.unitPrice).toString(),
      unitPrice: item.unitPrice.toString(),
      discount: (item.discount ?? 0).toString(),
      total: (qty * item.unitPrice * (1 - (item.discount ?? 0) / 100)).toString(),
    };
  });
}

async function nextContractNumber(orgId: number): Promise<string> {
  const [maxRow] = await db.select({ maxNum: sql<string>`max(contract_number)` }).from(contractsTable).where(eq(contractsTable.orgId, orgId));
  const nextNum = maxRow?.maxNum ? parseInt(maxRow.maxNum.replace("CNTR-", "")) + 1 : 1001;
  return `CNTR-${nextNum}`;
}

function sessionUserId(req: any): number | null {
  const id = req.session?.user?.id ?? req.user?.id ?? null;
  return id != null && Number(id) > 0 ? Number(id) : null;
}

// Allocate the next version and insert a contract document revision. A composite
// unique index on (contract_id, version) guards against duplicates; retry on a
// unique violation in case two revisions race for the same number.
async function insertContractDocumentVersion(
  orgId: number,
  contractId: number,
  values: { title: string | null; content: string; changeSummary: string | null; createdByUserId: number | null },
): Promise<typeof contractDocumentsTable.$inferSelect | undefined> {
  let doc: typeof contractDocumentsTable.$inferSelect | undefined;
  for (let attempt = 0; attempt < 5 && !doc; attempt++) {
    const [maxRow] = await db
      .select({ maxVer: sql<number>`max(${contractDocumentsTable.version})` })
      .from(contractDocumentsTable)
      .where(eq(contractDocumentsTable.contractId, contractId));
    const version = (Number(maxRow?.maxVer) || 0) + 1;
    try {
      // Deactivate all previous documents for this contract
      await db.update(contractDocumentsTable)
        .set({ isActive: false })
        .where(eq(contractDocumentsTable.contractId, contractId));
      [doc] = await db.insert(contractDocumentsTable).values({
        orgId,
        contractId,
        version,
        title: values.title,
        content: values.content,
        changeSummary: values.changeSummary,
        createdByUserId: values.createdByUserId,
        isActive: true,
      }).returning();
    } catch (e) {
      if ((e as { code?: string })?.code === "23505") continue; // unique violation: retry
      throw e;
    }
  }
  return doc;
}

// Builds the contract document text from the contract's current data (including all CLM fields).
// Returns "not_found" if the contract is missing, otherwise the title/content.
async function buildContractDocumentContent(
  contractId: number,
): Promise<"not_found" | { title: string; content: string }> {
  // Fetch base fields + all CLM-specific columns in one query
  const clmRows = await db.execute(sql`
    SELECT c.*,
           a.name AS account_name,
           con.first_name AS contact_first_name, con.last_name AS contact_last_name,
           opp.name AS opportunity_name,
           u.name AS owner_name
    FROM contracts c
    LEFT JOIN accounts a ON a.id = c.account_id
    LEFT JOIN contacts con ON con.id = c.contact_id
    LEFT JOIN opportunities opp ON opp.id = c.opportunity_id
    LEFT JOIN users u ON u.id = c.owner_id
    WHERE c.id = ${contractId}
  `);
  const row = clmRows.rows[0] as Record<string, unknown> | undefined;
  if (!row) return "not_found";

  const items = await db.select().from(contractLineItemsTable).where(eq(contractLineItemsTable.contractId, contractId));

  let companySignerName: string | null = null;
  if (row.company_signed_by_id) {
    const [u] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, row.company_signed_by_id as number));
    companySignerName = u?.name ?? null;
  }
  let customerSignerName: string | null = null;
  if (row.customer_signed_by_contact_id) {
    const [c] = await db
      .select({ firstName: contactsTable.firstName, lastName: contactsTable.lastName })
      .from(contactsTable).where(eq(contactsTable.id, row.customer_signed_by_contact_id as number));
    customerSignerName = c ? `${c.firstName} ${c.lastName ?? ""}`.trim() : null;
  }

  // Fetch active CLM templates for the contract's type (if set) to include standard clauses
  let templateClauses: string | null = null;
  if (row.template_id) {
    const tplRows = await db.execute(sql`SELECT content FROM clm_templates WHERE id = ${row.template_id as number} AND active = true`);
    if (tplRows.rows[0]) templateClauses = (tplRows.rows[0] as Record<string, unknown>).content as string | null;
  } else if (row.contract_type) {
    const tplRows = await db.execute(sql`SELECT content FROM clm_templates WHERE category = ${row.contract_type as string} AND active = true ORDER BY id LIMIT 1`);
    if (tplRows.rows[0]) templateClauses = (tplRows.rows[0] as Record<string, unknown>).content as string | null;
  }

  const contactName = row.contact_first_name ? `${row.contact_first_name} ${row.contact_last_name ?? ""}`.trim() : null;

  // Fetch CLM reviews, signers, and notes for the document
  const [reviewRows, signerRows, noteRows] = await Promise.all([
    db.execute(sql`
      SELECT r.stage, r.status, r.due_date, r.completed_date, r.notes, u.name AS reviewer_name
      FROM clm_reviews r LEFT JOIN users u ON u.id = r.reviewer_id
      WHERE r.contract_id = ${contractId} ORDER BY r.created_at ASC
    `),
    db.execute(sql`
      SELECT s.name, s.email, s.role, s.status, s.signed_at
      FROM clm_signers s WHERE s.contract_id = ${contractId} ORDER BY s.signing_order ASC
    `),
    db.execute(sql`
      SELECT body, created_by_name, created_at, attachment_name, attachment_url
      FROM entity_notes WHERE entity_type = 'contract' AND entity_id = ${contractId}
      ORDER BY created_at ASC
    `),
  ]);

  return generateContractDocument({
    contractNumber: row.contract_number as string,
    name: row.name as string,
    status: row.status as string | null,
    accountName: row.account_name as string | null,
    contactName,
    ownerName: row.owner_name as string | null,
    opportunityName: row.opportunity_name as string | null,
    startDate: row.start_date as Date | null,
    endDate: row.end_date as Date | null,
    contractTermMonths: row.contract_term_months as number | null,
    autoRenew: row.auto_renew as boolean | null,
    renewalTermMonths: row.renewal_term_months as number | null,
    specialTerms: row.special_terms as string | null,
    description: row.description as string | null,
    total: Number(row.total),
    subtotal: Number(row.subtotal),
    discount: Number(row.discount),
    tax: Number(row.tax),
    companySignerName,
    customerSignerName,
    // CLM authoring fields
    contractType: row.contract_type as string | null,
    territory: row.territory as string | null,
    businessUnit: row.business_unit as string | null,
    priority: row.priority as string | null,
    governingLaw: row.governing_law as string | null,
    paymentTerms: row.payment_terms as string | null,
    liabilityCapMultiplier: row.liability_cap_multiplier as number | null,
    confidentialityPeriodYears: row.confidentiality_period_years as number | null,
    ipOwnership: row.ip_ownership as string | null,
    terminationNoticeDays: row.termination_notice_days as number | null,
    counterpartyCompany: row.counterparty_company as string | null,
    counterpartySignerName: row.counterparty_signer_name as string | null,
    counterpartySignerEmail: row.counterparty_signer_email as string | null,
    counterpartySignerTitle: row.counterparty_signer_title as string | null,
    counterpartyAddress: row.counterparty_address as string | null,
    signingProvider: row.signing_provider as string | null,
    signingOrder: row.signing_order as string | null,
    signingDeadline: row.signing_deadline as Date | null,
    yearlyEscalationPct: row.yearly_escalation_pct as number | null,
    minimumAnnualCommit: row.minimum_annual_commit as number | null,
    renewalStatus: row.renewal_status as string | null,
    renewalWindowDays: row.renewal_window_days as number | null,
    arrAtRisk: row.arr_at_risk as number | null,
    riskScore: row.risk_score as number | null,
    redlineRound: row.redline_round as number | null,
    templateClauses,
    reviews: (reviewRows.rows as Record<string, unknown>[]).map((r) => ({
      stage: r.stage as string,
      reviewerName: r.reviewer_name as string | null,
      status: r.status as string,
      dueDate: r.due_date as Date | null,
      completedDate: r.completed_date as Date | null,
      notes: r.notes as string | null,
    })),
    signers: (signerRows.rows as Record<string, unknown>[]).map((s) => ({
      name: s.name as string,
      email: s.email as string | null,
      role: s.role as string | null,
      status: s.status as string | null,
      signedAt: s.signed_at as Date | null,
    })),
    notes: (noteRows.rows as Record<string, unknown>[]).map((n) => ({
      body: n.body as string,
      createdByName: n.created_by_name as string | null,
      createdAt: n.created_at as Date | null,
      attachmentName: n.attachment_name as string | null,
      attachmentUrl: n.attachment_url as string | null,
    })),
    items: items.map((it) => ({
      productName: it.productName,
      quantity: Number(it.quantity),
      unitPrice: Number(it.unitPrice),
      listPrice: Number((it as Record<string, unknown>).listPrice ?? it.unitPrice),
      discount: Number((it as Record<string, unknown>).discount ?? 0),
      total: Number(it.total),
    })),
  });
}

// Builds the contract document from current contract data and stores it as a new
// revision. Returns "not_found" if the contract is missing, the inserted document,
// or undefined if version allocation failed after retries.
async function generateContractDocumentRevision(
  orgId: number,
  contractId: number,
  userId: number | null,
  changeSummary: string,
): Promise<"not_found" | typeof contractDocumentsTable.$inferSelect | undefined> {
  const built = await buildContractDocumentContent(contractId);
  if (built === "not_found") return "not_found";

  return insertContractDocumentVersion(orgId, contractId, {
    title: built.title,
    content: built.content,
    changeSummary,
    createdByUserId: userId,
  });
}

// Keeps a draft contract's latest existing document in sync with edits by
// rewriting its content in place — no new revision is created. No-op when the
// contract has no document yet (nothing to download) or has been removed.
async function syncDraftContractDocument(contractId: number): Promise<void> {
  const [latest] = await db
    .select({ id: contractDocumentsTable.id })
    .from(contractDocumentsTable)
    .where(eq(contractDocumentsTable.contractId, contractId))
    .orderBy(desc(contractDocumentsTable.version))
    .limit(1);
  if (!latest) return;

  const built = await buildContractDocumentContent(contractId);
  if (built === "not_found") return;

  await db.update(contractDocumentsTable)
    .set({ title: built.title, content: built.content })
    .where(eq(contractDocumentsTable.id, latest.id));
}

// ----- Active contract pricing lookup for an account -----
router.get("/contracts/active-pricing/:accountId", async (req, res) => {
  try {
    const accountId = parseId(req.params.accountId);
    if (!accountId) { res.status(400).json({ error: "Invalid account ID" }); return; }
    const [ownedAccount] = await db.select({ id: accountsTable.id }).from(accountsTable).where(and(eq(accountsTable.id, accountId), eq(accountsTable.orgId, req.orgId!)));
    if (!ownedAccount) { res.status(404).json({ error: "Account not found" }); return; }
    const pricing = await getActiveContractPricing(accountId);
    res.json({ accountId, pricing });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ----- List -----
router.get("/contracts", async (req, res) => {
  try {
    const { accountId, opportunityId, status, page = "1", limit = "50" } = req.query as Record<string, string>;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    // Keep lifecycle state current: expire any elapsed activated contracts.
    await expireElapsedContracts(accountId ? parseInt(accountId) : undefined);

    const conditions = [eq(contractsTable.orgId, req.orgId!)];
    if (accountId) conditions.push(eq(contractsTable.accountId, parseInt(accountId)));
    if (opportunityId) conditions.push(eq(contractsTable.opportunityId, parseInt(opportunityId)));
    if (status) conditions.push(eq(contractsTable.status, status));
    const where = and(...conditions);

    const baseQuery = db
      .select(contractFields)
      .from(contractsTable)
      .leftJoin(accountsTable, eq(contractsTable.accountId, accountsTable.id))
      .leftJoin(contactsTable, eq(contractsTable.contactId, contactsTable.id))
      .leftJoin(opportunitiesTable, eq(contractsTable.opportunityId, opportunitiesTable.id))
      .leftJoin(usersTable, eq(contractsTable.ownerId, usersTable.id));

    const rawData = await baseQuery
      .where(where)
      .orderBy(desc(contractsTable.createdAt))
      .limit(limitNum)
      .offset(offset);

    const contractIds = rawData.map((c) => c.id);
    const allItems = contractIds.length > 0
      ? await db.select().from(contractLineItemsTable).where(inArray(contractLineItemsTable.contractId, contractIds))
      : [];
    const itemsByContract = new Map<number, ReturnType<typeof formatItem>[]>();
    for (const item of allItems) {
      if (!itemsByContract.has(item.contractId)) itemsByContract.set(item.contractId, []);
      itemsByContract.get(item.contractId)!.push(formatItem(item));
    }

    const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(contractsTable).where(where);
    res.json({
      data: rawData.map((c) => formatContract(c, itemsByContract.get(c.id) ?? [])),
      total: Number(countResult.count),
      page: pageNum,
      limit: limitNum,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ----- Create -----
router.post("/contracts", async (req, res) => {
  try {
    const { items = [], ...data } = req.body as { items?: LineItemInput[]; [key: string]: unknown };

    // Verify any referenced account/contact/opportunity/signer contact actually
    // belongs to this org — otherwise a crafted request could attach this
    // contract to another org's records.
    for (const [field, table] of [
      ["accountId", accountsTable],
      ["contactId", contactsTable],
      ["opportunityId", opportunitiesTable],
      ["customerSignedByContactId", contactsTable],
    ] as const) {
      const refId = data[field];
      if (refId != null) {
        const [row] = await db.select({ id: table.id }).from(table).where(and(eq(table.id, refId as number), eq(table.orgId, req.orgId!)));
        if (!row) { res.status(400).json({ error: `Invalid ${field}` }); return; }
      }
    }

    const contractNumber = await nextContractNumber(req.orgId!);
    const discountPct = Number(data.discount) || 0;
    const taxPct = Number(data.tax) || 0;
    const { subtotal, total } = computeTotals(items, discountPct, taxPct);

    const startDate = data.startDate ? new Date(data.startDate as string) : null;
    const termMonths = data.contractTermMonths != null ? Number(data.contractTermMonths) : null;
    const endDate = data.endDate ? new Date(data.endDate as string) : computeEndDate(startDate, termMonths);

    const [contract] = await db.insert(contractsTable).values({
      orgId: req.orgId!,
      contractNumber,
      name: (data.name as string) ?? `Contract ${contractNumber}`,
      accountId: (data.accountId as number | null) ?? null,
      contactId: (data.contactId as number | null) ?? null,
      opportunityId: (data.opportunityId as number | null) ?? null,
      priceBookId: (data.priceBookId as number | null) ?? null,
      ownerId: (data.ownerId as number | null) ?? sessionUserId(req),
      status: (data.status as string) ?? "draft",
      startDate,
      contractTermMonths: termMonths,
      endDate,
      signedDate: data.signedDate ? new Date(data.signedDate as string) : null,
      companySignedById: (data.companySignedById as number | null) ?? null,
      customerSignedByContactId: (data.customerSignedByContactId as number | null) ?? null,
      autoRenew: Boolean(data.autoRenew),
      renewalTermMonths: data.renewalTermMonths != null ? Number(data.renewalTermMonths) : null,
      specialTerms: (data.specialTerms as string) ?? null,
      description: (data.description as string) ?? null,
      subtotal: subtotal.toString(),
      discount: discountPct.toString(),
      tax: taxPct.toString(),
      total: total.toString(),
      createdByUserId: sessionUserId(req),
    }).returning();

    if (items.length > 0) {
      await db.insert(contractLineItemsTable).values(itemRows(req.orgId!, contract.id, items));
    }

    res.status(201).json(formatContract(contract, []));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ----- Create from opportunity -----
router.post("/contracts/from-opportunity/:opportunityId", async (req, res) => {
  try {
    const opportunityId = parseId(req.params.opportunityId);
    if (!opportunityId) { res.status(400).json({ error: "Invalid opportunity ID" }); return; }

    const [opp] = await db.select().from(opportunitiesTable).where(and(eq(opportunitiesTable.id, opportunityId), eq(opportunitiesTable.orgId, req.orgId!)));
    if (!opp) { res.status(404).json({ error: "Opportunity not found" }); return; }

    const oppItems = await db.select().from(opportunityItemsTable).where(and(eq(opportunityItemsTable.opportunityId, opportunityId), eq(opportunityItemsTable.orgId, req.orgId!)));
    const items: LineItemInput[] = oppItems.map((oi) => ({
      productId: oi.productId ?? null,
      productName: oi.productName,
      quantity: Number(oi.quantity),
      listPrice: Number(oi.unitPrice),
      unitPrice: Number(oi.unitPrice),
      discount: Number(oi.discount),
    }));

    const contractNumber = await nextContractNumber(req.orgId!);
    const { subtotal, total } = computeTotals(items, 0, 0);

    const [contract] = await db.insert(contractsTable).values({
      orgId: req.orgId!,
      contractNumber,
      name: `Contract for ${opp.name}`,
      accountId: opp.accountId ?? null,
      contactId: opp.contactId ?? null,
      opportunityId: opp.id,
      ownerId: opp.assignedTo ?? sessionUserId(req),
      status: "draft",
      subtotal: subtotal.toString(),
      discount: "0",
      tax: "0",
      total: total.toString(),
      createdByUserId: sessionUserId(req),
    }).returning();

    if (items.length > 0) {
      await db.insert(contractLineItemsTable).values(itemRows(req.orgId!, contract.id, items));
    }

    res.status(201).json(formatContract(contract, []));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ----- Contract documents (versioned, with revision history) -----
const documentFields = {
  id: contractDocumentsTable.id,
  contractId: contractDocumentsTable.contractId,
  version: contractDocumentsTable.version,
  title: contractDocumentsTable.title,
  content: contractDocumentsTable.content,
  changeSummary: contractDocumentsTable.changeSummary,
  createdByUserId: contractDocumentsTable.createdByUserId,
  createdByName: usersTable.name,
  isActive: contractDocumentsTable.isActive,
  createdAt: contractDocumentsTable.createdAt,
};

router.get("/contracts/:id/documents", async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) { res.status(400).json({ error: "Invalid contract ID" }); return; }
    const [contract] = await db.select({ id: contractsTable.id }).from(contractsTable).where(and(eq(contractsTable.id, id), eq(contractsTable.orgId, req.orgId!)));
    if (!contract) { res.status(404).json({ error: "Contract not found" }); return; }
    const docs = await db
      .select(documentFields)
      .from(contractDocumentsTable)
      .leftJoin(usersTable, eq(contractDocumentsTable.createdByUserId, usersTable.id))
      .where(eq(contractDocumentsTable.contractId, id))
      .orderBy(desc(contractDocumentsTable.version));
    res.json({ data: docs });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/contracts/:id/documents", async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) { res.status(400).json({ error: "Invalid contract ID" }); return; }
    const [contract] = await db.select({ id: contractsTable.id }).from(contractsTable).where(and(eq(contractsTable.id, id), eq(contractsTable.orgId, req.orgId!)));
    if (!contract) { res.status(404).json({ error: "Contract not found" }); return; }

    const data = req.body ?? {};
    if (typeof data.content !== "string" || data.content.trim() === "") {
      res.status(400).json({ error: "content is required" });
      return;
    }

    const doc = await insertContractDocumentVersion(req.orgId!, id, {
      title: data.title ?? null,
      content: data.content,
      changeSummary: data.changeSummary ?? null,
      createdByUserId: sessionUserId(req),
    });

    if (!doc) {
      res.status(409).json({ error: "Could not allocate a document version, please retry" });
      return;
    }
    res.status(201).json({ ...doc, createdByName: null });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ----- Get one -----
router.get("/contracts/:id", async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) { res.status(400).json({ error: "Invalid contract ID" }); return; }

    // Use raw SQL to include CLM authoring columns not in the Drizzle schema mapping
    const rows = await db.execute(sql`
      SELECT c.*,
             a.name                            AS account_name,
             con.first_name                    AS contact_first_name,
             con.last_name                     AS contact_last_name,
             opp.name                          AS opportunity_name,
             u.name                            AS owner_name
      FROM contracts c
      LEFT JOIN accounts a       ON a.id   = c.account_id
      LEFT JOIN contacts con     ON con.id = c.contact_id
      LEFT JOIN opportunities opp ON opp.id = c.opportunity_id
      LEFT JOIN users u          ON u.id   = c.owner_id
      WHERE c.id = ${id} AND c.org_id = ${req.orgId!}
    `);
    const row = rows.rows[0] as Record<string, unknown> | undefined;
    if (!row) { res.status(404).json({ error: "Contract not found" }); return; }

    const items = await db.select().from(contractLineItemsTable).where(and(eq(contractLineItemsTable.contractId, id), eq(contractLineItemsTable.orgId, req.orgId!)));

    const contactName = row.contact_first_name
      ? `${row.contact_first_name} ${row.contact_last_name ?? ""}`.trim()
      : null;

    res.json({
      id: row.id,
      contractNumber: row.contract_number,
      name: row.name,
      status: row.status,
      accountId: row.account_id,
      accountName: row.account_name,
      contactId: row.contact_id,
      contactName,
      opportunityId: row.opportunity_id,
      opportunityName: row.opportunity_name,
      priceBookId: row.price_book_id,
      ownerId: row.owner_id,
      ownerName: row.owner_name,
      startDate: row.start_date,
      endDate: row.end_date,
      contractTermMonths: row.contract_term_months,
      signedDate: row.signed_date,
      companySignedById: row.company_signed_by_id,
      customerSignedByContactId: row.customer_signed_by_contact_id,
      autoRenew: row.auto_renew,
      renewalTermMonths: row.renewal_term_months,
      specialTerms: row.special_terms,
      description: row.description,
      subtotal: Number(row.subtotal),
      discount: Number(row.discount),
      tax: Number(row.tax),
      total: Number(row.total),
      activatedAt: row.activated_at,
      terminatedAt: row.terminated_at,
      terminationReason: row.termination_reason,
      createdByUserId: row.created_by_user_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      // CLM authoring fields
      contractType: row.contract_type,
      territory: row.territory,
      businessUnit: row.business_unit,
      priority: row.priority,
      governingLaw: row.governing_law,
      paymentTerms: row.payment_terms,
      liabilityCapMultiplier: row.liability_cap_multiplier,
      confidentialityPeriodYears: row.confidentiality_period_years,
      ipOwnership: row.ip_ownership,
      terminationNoticeDays: row.termination_notice_days,
      counterpartyCompany: row.counterparty_company,
      counterpartySignerName: row.counterparty_signer_name,
      counterpartySignerEmail: row.counterparty_signer_email,
      counterpartySignerTitle: row.counterparty_signer_title,
      counterpartyAddress: row.counterparty_address,
      signingProvider: row.signing_provider,
      signingOrder: row.signing_order,
      signingDeadline: row.signing_deadline,
      renewalStatus: row.renewal_status,
      renewalDecisionDate: row.renewal_decision_date,
      renewalWindowDays: row.renewal_window_days,
      arrAtRisk: row.arr_at_risk,
      yearlyEscalationPct: row.yearly_escalation_pct,
      minimumAnnualCommit: row.minimum_annual_commit,
      riskScore: row.risk_score,
      redlineRound: row.redline_round,
      templateId: row.template_id,
      items: items.map(formatItem),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ----- Update -----
router.put("/contracts/:id", async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) { res.status(400).json({ error: "Invalid contract ID" }); return; }

    const [existing] = await db.select().from(contractsTable).where(and(eq(contractsTable.id, id), eq(contractsTable.orgId, req.orgId!)));
    if (!existing) { res.status(404).json({ error: "Contract not found" }); return; }

    const { items, ...data } = req.body as { items?: LineItemInput[]; [key: string]: unknown };

    for (const [field, table] of [
      ["accountId", accountsTable],
      ["contactId", contactsTable],
      ["opportunityId", opportunitiesTable],
      ["customerSignedByContactId", contactsTable],
    ] as const) {
      const refId = data[field];
      if (refId != null) {
        const [row] = await db.select({ id: table.id }).from(table).where(and(eq(table.id, refId as number), eq(table.orgId, req.orgId!)));
        if (!row) { res.status(400).json({ error: `Invalid ${field}` }); return; }
      }
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    const directFields = ["name", "accountId", "contactId", "opportunityId", "priceBookId", "ownerId", "status",
      "companySignedById", "customerSignedByContactId", "specialTerms", "description", "renewalTermMonths"];
    for (const key of directFields) {
      if (data[key] !== undefined) updateData[key] = data[key];
    }
    if (data.autoRenew !== undefined) updateData.autoRenew = Boolean(data.autoRenew);
    if (data.startDate !== undefined) updateData.startDate = data.startDate ? new Date(data.startDate as string) : null;
    if (data.signedDate !== undefined) updateData.signedDate = data.signedDate ? new Date(data.signedDate as string) : null;
    if (data.contractTermMonths !== undefined) updateData.contractTermMonths = data.contractTermMonths != null ? Number(data.contractTermMonths) : null;

    // Recompute end date when start date or term changes (unless an explicit endDate is provided).
    if (data.endDate !== undefined) {
      updateData.endDate = data.endDate ? new Date(data.endDate as string) : null;
    } else if (data.startDate !== undefined || data.contractTermMonths !== undefined) {
      const startDate = (updateData.startDate as Date | null) ?? existing.startDate;
      const term = (updateData.contractTermMonths as number | null) ?? existing.contractTermMonths;
      updateData.endDate = computeEndDate(startDate, term);
    }

    if (items) {
      await db.delete(contractLineItemsTable).where(eq(contractLineItemsTable.contractId, id));
      if (items.length > 0) {
        await db.insert(contractLineItemsTable).values(itemRows(req.orgId!, id, items));
      }
    }

    const needsRecalc = items !== undefined || data.discount !== undefined || data.tax !== undefined;
    if (needsRecalc) {
      const currentItems = await db.select().from(contractLineItemsTable).where(eq(contractLineItemsTable.contractId, id));
      let subtotal = 0;
      for (const item of currentItems) {
        subtotal += Number(item.quantity) * Number(item.unitPrice) * (1 - Number(item.discount) / 100);
      }
      const discountPct = Number(data.discount ?? existing.discount) || 0;
      const taxPct = Number(data.tax ?? existing.tax) || 0;
      updateData.subtotal = subtotal.toString();
      updateData.discount = discountPct.toString();
      updateData.tax = taxPct.toString();
      updateData.total = (subtotal * (1 - discountPct / 100) * (1 + taxPct / 100)).toString();
    }

    const [contract] = await db.update(contractsTable).set(updateData).where(and(eq(contractsTable.id, id), eq(contractsTable.orgId, req.orgId!))).returning();
    const updatedItems = await db.select().from(contractLineItemsTable).where(eq(contractLineItemsTable.contractId, id));

    // Keep a draft contract's existing document in sync with the edit so a
    // downloaded PDF/Word reflects the latest data. Drafts are not yet signed,
    // so we rewrite the latest document in place rather than adding a revision.
    // Best-effort: the edit already committed, so a sync hiccup must not fail it.
    if (contract.status === "draft") {
      try {
        await syncDraftContractDocument(id);
      } catch (syncErr) {
        req.log.error({ err: syncErr, contractId: id }, "Failed to sync draft contract document after edit");
      }
    }

    res.json(formatContract(contract, updatedItems.map(formatItem)));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ----- Lifecycle: submit for approval (auto-generates the contract document) -----
router.post("/contracts/:id/submit-for-approval", async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) { res.status(400).json({ error: "Invalid contract ID" }); return; }

    // Atomically claim the draft -> in_approval transition so concurrent submits
    // cannot both proceed and generate duplicate documents.
    const [claimed] = await db.update(contractsTable)
      .set({ status: "in_approval", updatedAt: new Date() })
      .where(and(eq(contractsTable.id, id), eq(contractsTable.status, "draft")))
      .returning();
    if (!claimed) {
      const [exists] = await db.select({ status: contractsTable.status }).from(contractsTable).where(and(eq(contractsTable.id, id), eq(contractsTable.orgId, req.orgId!)));
      if (!exists) { res.status(404).json({ error: "Contract not found" }); return; }
      res.status(400).json({ error: `Only draft contracts can be submitted for approval (current status: ${exists.status})` });
      return;
    }

    const doc = await generateContractDocumentRevision(req.orgId!, id, sessionUserId(req), "Auto-generated on submission for approval");
    if (doc === "not_found" || !doc) {
      // Generation failed after we claimed the transition; roll status back to draft.
      await db.update(contractsTable)
        .set({ status: "draft", updatedAt: new Date() })
        .where(and(eq(contractsTable.id, id), eq(contractsTable.orgId, req.orgId!)));
      res.status(409).json({ error: "Could not generate the contract document, please retry" });
      return;
    }

    const items = await db.select().from(contractLineItemsTable).where(eq(contractLineItemsTable.contractId, id));
    res.json(formatContract(claimed, items.map(formatItem)));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ----- Generate the contract document from current data (no status change) -----
router.post("/contracts/:id/generate-document", async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) { res.status(400).json({ error: "Invalid contract ID" }); return; }

    const [contract] = await db.select({ id: contractsTable.id }).from(contractsTable).where(and(eq(contractsTable.id, id), eq(contractsTable.orgId, req.orgId!)));
    if (!contract) { res.status(404).json({ error: "Contract not found" }); return; }

    const doc = await generateContractDocumentRevision(req.orgId!, id, sessionUserId(req), "Generated from contract data");
    if (doc === "not_found") { res.status(404).json({ error: "Contract not found" }); return; }
    if (!doc) { res.status(409).json({ error: "Could not generate the contract document, please retry" }); return; }

    res.status(201).json({ ...doc, createdByName: null });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ----- Lifecycle: activate -----
router.post("/contracts/:id/activate", async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) { res.status(400).json({ error: "Invalid contract ID" }); return; }

    const [existing] = await db.select().from(contractsTable).where(and(eq(contractsTable.id, id), eq(contractsTable.orgId, req.orgId!)));
    if (!existing) { res.status(404).json({ error: "Contract not found" }); return; }
    if (existing.status === "activated") { res.status(400).json({ error: "Contract is already activated" }); return; }
    if (["terminated", "cancelled", "expired"].includes(existing.status)) {
      res.status(400).json({ error: `Cannot activate a ${existing.status} contract` });
      return;
    }

    const now = new Date();
    const startDate = existing.startDate ?? now;
    const endDate = existing.endDate ?? computeEndDate(startDate, existing.contractTermMonths);

    const [contract] = await db.update(contractsTable).set({
      status: "activated",
      activatedAt: now,
      startDate,
      endDate,
      updatedAt: now,
    }).where(and(eq(contractsTable.id, id), eq(contractsTable.orgId, req.orgId!))).returning();

    res.json(formatContract(contract, []));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ----- Lifecycle: terminate -----
router.post("/contracts/:id/terminate", async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) { res.status(400).json({ error: "Invalid contract ID" }); return; }

    const [existing] = await db.select().from(contractsTable).where(and(eq(contractsTable.id, id), eq(contractsTable.orgId, req.orgId!)));
    if (!existing) { res.status(404).json({ error: "Contract not found" }); return; }
    if (["terminated", "cancelled", "expired"].includes(existing.status)) {
      res.status(400).json({ error: `Contract is already ${existing.status}` });
      return;
    }

    const now = new Date();
    const [contract] = await db.update(contractsTable).set({
      status: "terminated",
      terminatedAt: now,
      terminationReason: (req.body?.reason as string) ?? null,
      updatedAt: now,
    }).where(and(eq(contractsTable.id, id), eq(contractsTable.orgId, req.orgId!))).returning();

    res.json(formatContract(contract, []));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ----- Lifecycle: renew (creates a new draft contract continuing the term) -----
router.post("/contracts/:id/renew", async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) { res.status(400).json({ error: "Invalid contract ID" }); return; }

    const [existing] = await db.select().from(contractsTable).where(and(eq(contractsTable.id, id), eq(contractsTable.orgId, req.orgId!)));
    if (!existing) { res.status(404).json({ error: "Contract not found" }); return; }

    const oldItems = await db.select().from(contractLineItemsTable).where(eq(contractLineItemsTable.contractId, id));
    const items: LineItemInput[] = oldItems.map((li) => ({
      productId: li.productId ?? null,
      productName: li.productName,
      quantity: Number(li.quantity),
      listPrice: Number(li.listPrice),
      unitPrice: Number(li.unitPrice),
      discount: Number(li.discount),
    }));

    const term = existing.renewalTermMonths ?? existing.contractTermMonths;
    const startDate = existing.endDate ?? new Date();
    const endDate = computeEndDate(startDate, term);
    const contractNumber = await nextContractNumber(req.orgId!);

    const [contract] = await db.insert(contractsTable).values({
      orgId: req.orgId!,
      contractNumber,
      name: `${existing.name} (Renewal)`,
      accountId: existing.accountId,
      contactId: existing.contactId,
      opportunityId: existing.opportunityId,
      priceBookId: existing.priceBookId,
      ownerId: existing.ownerId ?? sessionUserId(req),
      status: "draft",
      startDate,
      contractTermMonths: term,
      endDate,
      autoRenew: existing.autoRenew,
      renewalTermMonths: existing.renewalTermMonths,
      specialTerms: existing.specialTerms,
      description: existing.description,
      subtotal: existing.subtotal,
      discount: existing.discount,
      tax: existing.tax,
      total: existing.total,
      createdByUserId: sessionUserId(req),
    }).returning();

    if (items.length > 0) {
      await db.insert(contractLineItemsTable).values(itemRows(req.orgId!, contract.id, items));
    }

    res.status(201).json(formatContract(contract, []));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ----- Delete -----
router.delete("/contracts/:id", async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) { res.status(400).json({ error: "Invalid contract ID" }); return; }
    const [existing] = await db.select({ id: contractsTable.id }).from(contractsTable).where(and(eq(contractsTable.id, id), eq(contractsTable.orgId, req.orgId!)));
    if (!existing) { res.status(404).json({ error: "Contract not found" }); return; }
    await db.delete(contractDocumentsTable).where(eq(contractDocumentsTable.contractId, id));
    await db.delete(contractLineItemsTable).where(eq(contractLineItemsTable.contractId, id));
    await db.delete(contractsTable).where(and(eq(contractsTable.id, id), eq(contractsTable.orgId, req.orgId!)));
    res.json({ success: true, id });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
