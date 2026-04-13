import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { quotesTable, quoteItemsTable, opportunitiesTable, contactsTable, accountsTable, opportunityItemsTable } from "@workspace/db";
import { eq, sql, inArray, desc, and } from "drizzle-orm";
import PDFDocument from "pdfkit";
import nodemailer from "nodemailer";
import { Writable } from "stream";

const router: IRouter = Router();

function parseId(raw: string): number | null {
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

const quoteFields = {
  id: quotesTable.id,
  quoteNumber: quotesTable.quoteNumber,
  name: quotesTable.name,
  version: quotesTable.version,
  parentQuoteId: quotesTable.parentQuoteId,
  opportunityId: quotesTable.opportunityId,
  opportunityName: opportunitiesTable.name,
  contactId: quotesTable.contactId,
  contactFirstName: contactsTable.firstName,
  contactLastName: contactsTable.lastName,
  contactEmail: contactsTable.email,
  accountId: quotesTable.accountId,
  accountName: accountsTable.name,
  status: quotesTable.status,
  validUntil: quotesTable.validUntil,
  subtotal: quotesTable.subtotal,
  discount: quotesTable.discount,
  tax: quotesTable.tax,
  total: quotesTable.total,
  notes: quotesTable.notes,
  createdAt: quotesTable.createdAt,
  updatedAt: quotesTable.updatedAt,
};

type QuoteRow = {
  contactFirstName?: string | null;
  contactLastName?: string | null;
  contactEmail?: string | null;
  subtotal: string | null;
  discount: string | null;
  tax: string | null;
  total: string | null;
  version?: number;
  parentQuoteId?: number | null;
  [key: string]: unknown;
};

function formatQuote(q: QuoteRow, items: unknown[] = []) {
  const { contactFirstName, contactLastName, contactEmail, ...rest } = q;
  return {
    ...rest,
    contactName: contactFirstName ? `${contactFirstName} ${contactLastName ?? ""}`.trim() : null,
    contactEmail: contactEmail ?? null,
    subtotal: Number(q.subtotal),
    discount: Number(q.discount),
    tax: Number(q.tax),
    total: Number(q.total),
    items,
  };
}

function formatItem(item: { quantity: string; unitPrice: string; discount: string; total: string; [key: string]: unknown }) {
  return {
    ...item,
    quantity: Number(item.quantity),
    unitPrice: Number(item.unitPrice),
    discount: Number(item.discount),
    total: Number(item.total),
  };
}

interface QuoteForPdf {
  quoteNumber: string;
  name: string;
  version: number;
  contactFirstName?: string | null;
  contactLastName?: string | null;
  contactEmail?: string | null;
  accountName?: string | null;
  validUntil?: Date | string | null;
  subtotal: string | null;
  discount: string | null;
  tax: string | null;
  total: string | null;
  notes?: string | null;
  createdAt: Date | string;
}

interface QuoteItemForPdf {
  productName: string;
  quantity: string;
  unitPrice: string;
  discount: string;
  total: string;
}

function generatePdfDoc(quote: QuoteForPdf, items: QuoteItemForPdf[]): PDFKit.PDFDocument {
  const doc = new PDFDocument({ size: "A4", margin: 50 });

  doc.fontSize(20).font("Helvetica-Bold").text("arbormind.in", 50, 50);
  doc.fontSize(10).font("Helvetica").text("CRM Solutions", 50, 75);
  doc.fontSize(10).text("support@arbormind.in", 50, 88);

  doc.fontSize(24).font("Helvetica-Bold").text("QUOTATION", 350, 50, { align: "right" });
  doc.fontSize(10).font("Helvetica").text(`Quote #: ${quote.quoteNumber}`, 350, 80, { align: "right" });
  doc.text(`Version: ${quote.version}`, 350, 93, { align: "right" });
  doc.text(`Date: ${new Date(quote.createdAt).toLocaleDateString()}`, 350, 106, { align: "right" });
  if (quote.validUntil) {
    doc.text(`Valid Until: ${new Date(quote.validUntil).toLocaleDateString()}`, 350, 119, { align: "right" });
  }

  doc.moveTo(50, 140).lineTo(545, 140).stroke("#cccccc");

  let y = 155;
  if (quote.contactFirstName || quote.accountName) {
    doc.fontSize(11).font("Helvetica-Bold").text("Bill To:", 50, y);
    y += 16;
    if (quote.contactFirstName) {
      doc.fontSize(10).font("Helvetica").text(`${quote.contactFirstName} ${quote.contactLastName ?? ""}`, 50, y);
      y += 14;
    }
    if (quote.accountName) {
      doc.text(quote.accountName, 50, y);
      y += 14;
    }
    if (quote.contactEmail) {
      doc.text(quote.contactEmail, 50, y);
      y += 14;
    }
  }

  y += 10;
  doc.fontSize(11).font("Helvetica-Bold").text("Quote: " + quote.name, 50, y);
  y += 20;

  const tableTop = y;
  const colX = [50, 250, 320, 390, 460];
  doc.fontSize(9).font("Helvetica-Bold");
  doc.text("Product", colX[0], tableTop);
  doc.text("Qty", colX[1], tableTop, { width: 60, align: "right" });
  doc.text("Unit Price", colX[2], tableTop, { width: 60, align: "right" });
  doc.text("Disc %", colX[3], tableTop, { width: 60, align: "right" });
  doc.text("Total", colX[4], tableTop, { width: 85, align: "right" });
  y = tableTop + 18;
  doc.moveTo(50, y).lineTo(545, y).stroke("#cccccc");
  y += 6;

  doc.font("Helvetica").fontSize(9);
  for (const item of items) {
    doc.text(item.productName, colX[0], y, { width: 195 });
    doc.text(Number(item.quantity).toString(), colX[1], y, { width: 60, align: "right" });
    doc.text(`$${Number(item.unitPrice).toFixed(2)}`, colX[2], y, { width: 60, align: "right" });
    doc.text(`${Number(item.discount)}%`, colX[3], y, { width: 60, align: "right" });
    doc.text(`$${Number(item.total).toFixed(2)}`, colX[4], y, { width: 85, align: "right" });
    y += 16;
    if (y > 700) { doc.addPage(); y = 50; }
  }

  y += 8;
  doc.moveTo(50, y).lineTo(545, y).stroke("#cccccc");
  y += 12;

  const subtotal = Number(quote.subtotal);
  const discount = Number(quote.discount);
  const tax = Number(quote.tax);
  const total = Number(quote.total);

  doc.font("Helvetica").fontSize(10);
  doc.text("Subtotal:", 380, y, { width: 80, align: "right" });
  doc.text(`$${subtotal.toFixed(2)}`, 460, y, { width: 85, align: "right" });
  y += 16;

  if (discount > 0) {
    doc.text(`Discount (${discount}%):`, 380, y, { width: 80, align: "right" });
    doc.text(`-$${(subtotal * discount / 100).toFixed(2)}`, 460, y, { width: 85, align: "right" });
    y += 16;
  }

  if (tax > 0) {
    doc.text(`Tax (${tax}%):`, 380, y, { width: 80, align: "right" });
    doc.text(`$${(subtotal * (1 - discount / 100) * tax / 100).toFixed(2)}`, 460, y, { width: 85, align: "right" });
    y += 16;
  }

  y += 4;
  doc.font("Helvetica-Bold").fontSize(12);
  doc.text("Total:", 380, y, { width: 80, align: "right" });
  doc.text(`$${total.toFixed(2)}`, 460, y, { width: 85, align: "right" });

  if (quote.notes) {
    y += 40;
    doc.font("Helvetica-Bold").fontSize(10).text("Notes & Terms:", 50, y);
    y += 16;
    doc.font("Helvetica").fontSize(9).text(quote.notes, 50, y, { width: 495 });
  }

  return doc;
}

function pdfToBuffer(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const writable = new Writable({
      write(chunk: Buffer, _encoding, callback) {
        chunks.push(chunk);
        callback();
      },
    });
    writable.on("finish", () => resolve(Buffer.concat(chunks)));
    writable.on("error", reject);
    doc.pipe(writable);
    doc.end();
  });
}

async function isLatestVersion(quoteId: number, parentQuoteId: number | null): Promise<boolean> {
  const rootId = parentQuoteId ?? quoteId;
  const [maxRow] = await db
    .select({ maxVer: sql<number>`max(${quotesTable.version})` })
    .from(quotesTable)
    .where(sql`${quotesTable.parentQuoteId} = ${rootId} OR ${quotesTable.id} = ${rootId}`);
  const [current] = await db.select({ version: quotesTable.version }).from(quotesTable).where(eq(quotesTable.id, quoteId));
  return current?.version === maxRow?.maxVer;
}

router.get("/quotes", async (req, res) => {
  try {
    const { opportunityId, page = "1", limit = "50" } = req.query as Record<string, string>;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    const baseQuery = db
      .select(quoteFields)
      .from(quotesTable)
      .leftJoin(opportunitiesTable, eq(quotesTable.opportunityId, opportunitiesTable.id))
      .leftJoin(contactsTable, eq(quotesTable.contactId, contactsTable.id))
      .leftJoin(accountsTable, eq(quotesTable.accountId, accountsTable.id));

    const rawData = await (opportunityId
      ? baseQuery.where(eq(quotesTable.opportunityId, parseInt(opportunityId)))
      : baseQuery
    ).orderBy(desc(quotesTable.createdAt)).limit(limitNum).offset(offset);

    const quoteIds = rawData.map(q => q.id);
    const allItems = quoteIds.length > 0
      ? await db.select().from(quoteItemsTable).where(inArray(quoteItemsTable.quoteId, quoteIds))
      : [];

    const itemsByQuote = new Map<number, ReturnType<typeof formatItem>[]>();
    for (const item of allItems) {
      if (!itemsByQuote.has(item.quoteId)) itemsByQuote.set(item.quoteId, []);
      itemsByQuote.get(item.quoteId)!.push(formatItem(item));
    }

    const quoteWhere = opportunityId ? eq(quotesTable.opportunityId, parseInt(opportunityId)) : undefined;
    const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(quotesTable).where(quoteWhere);
    res.json({
      data: rawData.map(q => formatQuote(q, itemsByQuote.get(q.id) ?? [])),
      total: Number(countResult.count),
      page: pageNum,
      limit: limitNum,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/quotes", async (req, res) => {
  try {
    let { items = [], ...quoteData } = req.body as {
      items?: Array<{ productId?: number; productName: string; quantity: number; unitPrice: number; discount?: number }>;
      [key: string]: unknown;
    };

    if (items.length === 0 && quoteData.opportunityId) {
      const oppItems = await db.select().from(opportunityItemsTable)
        .where(eq(opportunityItemsTable.opportunityId, quoteData.opportunityId as number));
      if (oppItems.length > 0) {
        items = oppItems.map(oi => ({
          productId: oi.productId ?? undefined,
          productName: oi.productName,
          quantity: Number(oi.quantity),
          unitPrice: Number(oi.unitPrice),
          discount: Number(oi.discount),
        }));
      }
    }

    const [maxQuote] = await db.select({ maxNum: sql<string>`max(quote_number)` }).from(quotesTable);
    const nextNum = maxQuote?.maxNum ? parseInt(maxQuote.maxNum.replace("QT-", "")) + 1 : 1001;
    const quoteNumber = `QT-${nextNum}`;

    let subtotal = 0;
    for (const item of items) {
      subtotal += item.quantity * item.unitPrice * (1 - (item.discount ?? 0) / 100);
    }
    const discountPct = Number(quoteData.discount) || 0;
    const taxPct = Number(quoteData.tax) || 0;
    const total = subtotal * (1 - discountPct / 100) * (1 + taxPct / 100);

    const insertData = {
      name: (quoteData.name as string) ?? "",
      opportunityId: (quoteData.opportunityId as number | null) ?? null,
      contactId: (quoteData.contactId as number | null) ?? null,
      accountId: (quoteData.accountId as number | null) ?? null,
      status: (quoteData.status as string) ?? "draft",
      validUntil: quoteData.validUntil ? new Date(quoteData.validUntil as string) : null,
      discount: (quoteData.discount as string) ?? "0",
      tax: (quoteData.tax as string) ?? "0",
      notes: (quoteData.notes as string) ?? null,
      quoteNumber,
      subtotal: subtotal.toString(),
      total: total.toString(),
      version: 1,
      parentQuoteId: null,
    };
    const [quote] = await db.insert(quotesTable).values(insertData).returning();

    if (items.length > 0) {
      await db.insert(quoteItemsTable).values(items.map(item => ({
        quoteId: quote.id,
        productId: item.productId ?? null,
        productName: item.productName,
        quantity: item.quantity.toString(),
        unitPrice: item.unitPrice.toString(),
        discount: (item.discount ?? 0).toString(),
        total: (item.quantity * item.unitPrice * (1 - (item.discount ?? 0) / 100)).toString(),
      })));
    }

    res.status(201).json(formatQuote(quote, []));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/quotes/:id", async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) { res.status(400).json({ error: "Invalid quote ID" }); return; }
    const [quote] = await db
      .select(quoteFields)
      .from(quotesTable)
      .leftJoin(opportunitiesTable, eq(quotesTable.opportunityId, opportunitiesTable.id))
      .leftJoin(contactsTable, eq(quotesTable.contactId, contactsTable.id))
      .leftJoin(accountsTable, eq(quotesTable.accountId, accountsTable.id))
      .where(eq(quotesTable.id, id));

    if (!quote) {
      res.status(404).json({ error: "Quote not found" });
      return;
    }

    const quoteItems = await db.select().from(quoteItemsTable).where(eq(quoteItemsTable.quoteId, id));

    const versions = await db
      .select({ id: quotesTable.id, version: quotesTable.version, quoteNumber: quotesTable.quoteNumber, status: quotesTable.status, createdAt: quotesTable.createdAt })
      .from(quotesTable)
      .where(
        quote.parentQuoteId
          ? sql`${quotesTable.parentQuoteId} = ${quote.parentQuoteId} OR ${quotesTable.id} = ${quote.parentQuoteId}`
          : sql`${quotesTable.parentQuoteId} = ${quote.id} OR ${quotesTable.id} = ${quote.id}`
      )
      .orderBy(quotesTable.version);

    const maxVersion = Math.max(...versions.map(v => v.version));
    const latestVersion = quote.version === maxVersion;

    res.json({
      ...formatQuote(quote, quoteItems.map(formatItem)),
      versions,
      isLatestVersion: latestVersion,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

const VALID_QUOTE_STATUSES = new Set(["draft", "sent", "accepted", "rejected", "expired"]);

router.put("/quotes/:id", async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) { res.status(400).json({ error: "Invalid quote ID" }); return; }

    if (req.body.status && !VALID_QUOTE_STATUSES.has(req.body.status)) {
      res.status(400).json({ error: `Invalid status. Must be one of: ${[...VALID_QUOTE_STATUSES].join(", ")}` });
      return;
    }

    const [existing] = await db.select().from(quotesTable).where(eq(quotesTable.id, id));
    if (!existing) { res.status(404).json({ error: "Quote not found" }); return; }

    const isLatest = await isLatestVersion(id, existing.parentQuoteId);
    if (!isLatest) {
      res.status(403).json({ error: "Only the latest version of a quote can be edited. Create a new version instead." });
      return;
    }

    const { items, ...quoteData } = req.body as {
      items?: Array<{ productId?: number | null; productName: string; quantity: number; unitPrice: number; discount?: number }>;
      [key: string]: unknown;
    };

    const allowedFields = ["name", "status", "validUntil", "discount", "tax", "notes", "opportunityId", "contactId", "accountId"];
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    for (const key of allowedFields) {
      if (quoteData[key] !== undefined) {
        if (key === "validUntil" && quoteData[key]) {
          updateData[key] = new Date(quoteData[key] as string);
        } else {
          updateData[key] = quoteData[key];
        }
      }
    }

    if (items) {
      await db.delete(quoteItemsTable).where(eq(quoteItemsTable.quoteId, id));
      if (items.length > 0) {
        await db.insert(quoteItemsTable).values(items.map(item => ({
          quoteId: id,
          productId: item.productId ?? null,
          productName: item.productName,
          quantity: item.quantity.toString(),
          unitPrice: item.unitPrice.toString(),
          discount: (item.discount ?? 0).toString(),
          total: (item.quantity * item.unitPrice * (1 - (item.discount ?? 0) / 100)).toString(),
        })));
      }
    }

    const needsRecalc = items !== undefined || quoteData.discount !== undefined || quoteData.tax !== undefined;
    if (needsRecalc) {
      const currentItems = await db.select().from(quoteItemsTable).where(eq(quoteItemsTable.quoteId, id));
      let subtotal = 0;
      for (const item of currentItems) {
        subtotal += Number(item.quantity) * Number(item.unitPrice) * (1 - Number(item.discount) / 100);
      }
      const discountPct = Number(quoteData.discount ?? existing.discount) || 0;
      const taxPct = Number(quoteData.tax ?? existing.tax) || 0;
      const total = subtotal * (1 - discountPct / 100) * (1 + taxPct / 100);
      updateData.subtotal = subtotal.toString();
      updateData.total = total.toString();
    }

    const [quote] = await db.update(quotesTable)
      .set(updateData)
      .where(eq(quotesTable.id, id))
      .returning();
    if (!quote) {
      res.status(404).json({ error: "Quote not found" });
    } else {
      const updatedItems = await db.select().from(quoteItemsTable).where(eq(quoteItemsTable.quoteId, id));
      res.json(formatQuote(quote, updatedItems.map(formatItem)));
    }
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/quotes/:id/version", async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) { res.status(400).json({ error: "Invalid quote ID" }); return; }

    const [original] = await db.select().from(quotesTable).where(eq(quotesTable.id, id));
    if (!original) { res.status(404).json({ error: "Quote not found" }); return; }

    const rootId = original.parentQuoteId ?? original.id;

    const [maxVersionRow] = await db
      .select({ maxVer: sql<number>`max(${quotesTable.version})` })
      .from(quotesTable)
      .where(sql`${quotesTable.parentQuoteId} = ${rootId} OR ${quotesTable.id} = ${rootId}`);
    const nextVersion = (maxVersionRow?.maxVer ?? 1) + 1;

    const [maxQuote] = await db.select({ maxNum: sql<string>`max(quote_number)` }).from(quotesTable);
    const nextNum = maxQuote?.maxNum ? parseInt(maxQuote.maxNum.replace("QT-", "")) + 1 : 1001;
    const quoteNumber = `QT-${nextNum}`;

    const [newQuote] = await db.insert(quotesTable).values({
      quoteNumber,
      name: original.name,
      version: nextVersion,
      parentQuoteId: rootId,
      opportunityId: original.opportunityId,
      contactId: original.contactId,
      accountId: original.accountId,
      status: "draft",
      validUntil: original.validUntil,
      subtotal: original.subtotal,
      discount: original.discount,
      tax: original.tax,
      total: original.total,
      notes: original.notes,
    }).returning();

    const originalItems = await db.select().from(quoteItemsTable).where(eq(quoteItemsTable.quoteId, id));
    if (originalItems.length > 0) {
      await db.insert(quoteItemsTable).values(originalItems.map(item => ({
        quoteId: newQuote.id,
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
        total: item.total,
      })));
    }

    res.status(201).json(formatQuote(newQuote, []));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/quotes/:id/pdf", async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) { res.status(400).json({ error: "Invalid quote ID" }); return; }

    const [quote] = await db
      .select(quoteFields)
      .from(quotesTable)
      .leftJoin(opportunitiesTable, eq(quotesTable.opportunityId, opportunitiesTable.id))
      .leftJoin(contactsTable, eq(quotesTable.contactId, contactsTable.id))
      .leftJoin(accountsTable, eq(quotesTable.accountId, accountsTable.id))
      .where(eq(quotesTable.id, id));

    if (!quote) { res.status(404).json({ error: "Quote not found" }); return; }

    const items = await db.select().from(quoteItemsTable).where(eq(quoteItemsTable.quoteId, id));

    const doc = generatePdfDoc(quote, items);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${quote.quoteNumber}.pdf"`);
    doc.pipe(res);
    doc.end();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/quotes/:id/send", async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) { res.status(400).json({ error: "Invalid quote ID" }); return; }

    const [quote] = await db
      .select(quoteFields)
      .from(quotesTable)
      .leftJoin(opportunitiesTable, eq(quotesTable.opportunityId, opportunitiesTable.id))
      .leftJoin(contactsTable, eq(quotesTable.contactId, contactsTable.id))
      .leftJoin(accountsTable, eq(quotesTable.accountId, accountsTable.id))
      .where(eq(quotesTable.id, id));

    if (!quote) { res.status(404).json({ error: "Quote not found" }); return; }

    const [rawQuote] = await db.select().from(quotesTable).where(eq(quotesTable.id, id));
    const isLatest = await isLatestVersion(id, rawQuote?.parentQuoteId ?? null);
    if (!isLatest) {
      res.status(403).json({ error: "Only the latest version of a quote can be sent. Create a new version instead." });
      return;
    }

    if (quote.status !== "draft") {
      res.status(400).json({ error: `Cannot send a quote with status '${quote.status}'. Only draft quotes can be sent.` });
      return;
    }

    const contactEmail = quote.contactEmail;
    const contactName = quote.contactFirstName
      ? `${quote.contactFirstName} ${quote.contactLastName ?? ""}`.trim()
      : "Customer";

    const items = await db.select().from(quoteItemsTable).where(eq(quoteItemsTable.quoteId, id));
    const doc = generatePdfDoc(quote, items);
    const pdfBuffer = await pdfToBuffer(doc);

    let emailSent = false;
    let emailError: string | null = null;

    if (!contactEmail) {
      res.status(400).json({ success: false, error: "No contact email configured. Cannot send quote." });
      return;
    }

    try {
        const smtpHost = process.env.SMTP_HOST ?? "mail.spacemail.com";
        const smtpPort = parseInt(process.env.SMTP_PORT ?? "465");
        const smtpUser = process.env.SMTP_USER ?? "";
        const smtpPass = process.env.SMTP_PASS ?? "";

        if (!smtpUser || !smtpPass) {
          res.status(500).json({ success: false, error: "SMTP credentials not configured." });
          return;
        }

        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: { user: smtpUser, pass: smtpPass },
        });

        await transporter.sendMail({
          from: '"arbormind.in" <support@arbormind.in>',
          to: contactEmail,
          subject: `Quotation ${quote.quoteNumber} - ${quote.name}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px;">
              <h2 style="color: #333;">Quotation from arbormind.in</h2>
              <p>Dear ${contactName},</p>
              <p>Please find attached the quotation <strong>${quote.quoteNumber}</strong> for <strong>${quote.name}</strong>.</p>
              <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Quote Number</td><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">${quote.quoteNumber}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Total</td><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">$${Number(quote.total).toFixed(2)}</td></tr>
                ${quote.validUntil ? `<tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Valid Until</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${new Date(quote.validUntil).toLocaleDateString()}</td></tr>` : ""}
              </table>
              <p>Please review the attached PDF for full details.</p>
              <p style="color: #888; font-size: 12px; margin-top: 24px;">— arbormind.in CRM</p>
            </div>
          `,
          attachments: [{
            filename: `${quote.quoteNumber}.pdf`,
            content: pdfBuffer,
            contentType: "application/pdf",
          }],
        });
        emailSent = true;
      } catch (mailErr) {
        emailError = mailErr instanceof Error ? mailErr.message : "Failed to send email";
        req.log.error({ mailErr }, "Failed to send quote email");
      }

    if (!emailSent) {
      res.status(502).json({
        success: false,
        error: `Email delivery failed: ${emailError}`,
        sentTo: contactEmail,
      });
      return;
    }

    await db.update(quotesTable)
      .set({ status: "sent", updatedAt: new Date() })
      .where(eq(quotesTable.id, id));

    res.json({
      success: true,
      message: `Quotation ${quote.quoteNumber} sent to ${contactEmail}`,
      sentTo: contactEmail,
      contactName,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/quotes/:id", async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) { res.status(400).json({ error: "Invalid quote ID" }); return; }
    await db.delete(quoteItemsTable).where(eq(quoteItemsTable.quoteId, id));
    await db.delete(quotesTable).where(eq(quotesTable.id, id));
    res.json({ success: true, id });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
