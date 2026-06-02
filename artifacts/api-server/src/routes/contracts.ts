import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  contractsTable,
  contractLineItemsTable,
  accountsTable,
  contactsTable,
  opportunitiesTable,
  opportunityItemsTable,
  usersTable,
} from "@workspace/db";
import { eq, sql, inArray, desc } from "drizzle-orm";

import { requireScreenAccess } from "../lib/access-control";
import { computeEndDate, getActiveContractPricing } from "../lib/contracts";

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

function itemRows(contractId: number, items: LineItemInput[]) {
  return items.map((item) => {
    const qty = item.quantity ?? 1;
    return {
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

async function nextContractNumber(): Promise<string> {
  const [maxRow] = await db.select({ maxNum: sql<string>`max(contract_number)` }).from(contractsTable);
  const nextNum = maxRow?.maxNum ? parseInt(maxRow.maxNum.replace("CNTR-", "")) + 1 : 1001;
  return `CNTR-${nextNum}`;
}

function sessionUserId(req: any): number | null {
  return req.session?.user?.id ?? req.user?.id ?? null;
}

// ----- Active contract pricing lookup for an account -----
router.get("/contracts/active-pricing/:accountId", async (req, res) => {
  try {
    const accountId = parseId(req.params.accountId);
    if (!accountId) { res.status(400).json({ error: "Invalid account ID" }); return; }
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
    const { accountId, status, page = "1", limit = "50" } = req.query as Record<string, string>;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    const conditions = [];
    if (accountId) conditions.push(eq(contractsTable.accountId, parseInt(accountId)));
    if (status) conditions.push(eq(contractsTable.status, status));
    const where = conditions.length > 0 ? sql.join(conditions, sql` AND `) : undefined;

    const baseQuery = db
      .select(contractFields)
      .from(contractsTable)
      .leftJoin(accountsTable, eq(contractsTable.accountId, accountsTable.id))
      .leftJoin(contactsTable, eq(contractsTable.contactId, contactsTable.id))
      .leftJoin(opportunitiesTable, eq(contractsTable.opportunityId, opportunitiesTable.id))
      .leftJoin(usersTable, eq(contractsTable.ownerId, usersTable.id));

    const rawData = await (where ? baseQuery.where(where) : baseQuery)
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

    const contractNumber = await nextContractNumber();
    const discountPct = Number(data.discount) || 0;
    const taxPct = Number(data.tax) || 0;
    const { subtotal, total } = computeTotals(items, discountPct, taxPct);

    const startDate = data.startDate ? new Date(data.startDate as string) : null;
    const termMonths = data.contractTermMonths != null ? Number(data.contractTermMonths) : null;
    const endDate = data.endDate ? new Date(data.endDate as string) : computeEndDate(startDate, termMonths);

    const [contract] = await db.insert(contractsTable).values({
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
      await db.insert(contractLineItemsTable).values(itemRows(contract.id, items));
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

    const [opp] = await db.select().from(opportunitiesTable).where(eq(opportunitiesTable.id, opportunityId));
    if (!opp) { res.status(404).json({ error: "Opportunity not found" }); return; }

    const oppItems = await db.select().from(opportunityItemsTable).where(eq(opportunityItemsTable.opportunityId, opportunityId));
    const items: LineItemInput[] = oppItems.map((oi) => ({
      productId: oi.productId ?? null,
      productName: oi.productName,
      quantity: Number(oi.quantity),
      listPrice: Number(oi.unitPrice),
      unitPrice: Number(oi.unitPrice),
      discount: Number(oi.discount),
    }));

    const contractNumber = await nextContractNumber();
    const { subtotal, total } = computeTotals(items, 0, 0);

    const [contract] = await db.insert(contractsTable).values({
      contractNumber,
      name: `Contract for ${opp.name}`,
      accountId: opp.accountId ?? null,
      contactId: opp.contactId ?? null,
      opportunityId: opp.id,
      ownerId: opp.ownerId ?? sessionUserId(req),
      status: "draft",
      subtotal: subtotal.toString(),
      discount: "0",
      tax: "0",
      total: total.toString(),
      createdByUserId: sessionUserId(req),
    }).returning();

    if (items.length > 0) {
      await db.insert(contractLineItemsTable).values(itemRows(contract.id, items));
    }

    res.status(201).json(formatContract(contract, []));
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

    const [contract] = await db
      .select(contractFields)
      .from(contractsTable)
      .leftJoin(accountsTable, eq(contractsTable.accountId, accountsTable.id))
      .leftJoin(contactsTable, eq(contractsTable.contactId, contactsTable.id))
      .leftJoin(opportunitiesTable, eq(contractsTable.opportunityId, opportunitiesTable.id))
      .leftJoin(usersTable, eq(contractsTable.ownerId, usersTable.id))
      .where(eq(contractsTable.id, id));

    if (!contract) { res.status(404).json({ error: "Contract not found" }); return; }

    const items = await db.select().from(contractLineItemsTable).where(eq(contractLineItemsTable.contractId, id));
    res.json(formatContract(contract, items.map(formatItem)));
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

    const [existing] = await db.select().from(contractsTable).where(eq(contractsTable.id, id));
    if (!existing) { res.status(404).json({ error: "Contract not found" }); return; }

    const { items, ...data } = req.body as { items?: LineItemInput[]; [key: string]: unknown };

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
        await db.insert(contractLineItemsTable).values(itemRows(id, items));
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

    const [contract] = await db.update(contractsTable).set(updateData).where(eq(contractsTable.id, id)).returning();
    const updatedItems = await db.select().from(contractLineItemsTable).where(eq(contractLineItemsTable.contractId, id));
    res.json(formatContract(contract, updatedItems.map(formatItem)));
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

    const [existing] = await db.select().from(contractsTable).where(eq(contractsTable.id, id));
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
    }).where(eq(contractsTable.id, id)).returning();

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

    const [existing] = await db.select().from(contractsTable).where(eq(contractsTable.id, id));
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
    }).where(eq(contractsTable.id, id)).returning();

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

    const [existing] = await db.select().from(contractsTable).where(eq(contractsTable.id, id));
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
    const contractNumber = await nextContractNumber();

    const [contract] = await db.insert(contractsTable).values({
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
      await db.insert(contractLineItemsTable).values(itemRows(contract.id, items));
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
    await db.delete(contractLineItemsTable).where(eq(contractLineItemsTable.contractId, id));
    await db.delete(contractsTable).where(eq(contractsTable.id, id));
    res.json({ success: true, id });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
