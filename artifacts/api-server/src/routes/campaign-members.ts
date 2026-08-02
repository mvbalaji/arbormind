import { Router, type IRouter, type Request } from "express";
import { db } from "@workspace/db";
import {
  campaignMembersTable, contactsTable, leadsTable, accountsTable,
} from "@workspace/db";
import { eq, ilike, or, sql, and, inArray } from "drizzle-orm";
import { requireScreenAccess } from "../lib/access-control";

const router: IRouter = Router();
router.use("/campaigns", requireScreenAccess("campaigns"));

interface SessionUser { id: number; email?: string; name?: string }
function getUser(req: Request): SessionUser | null {
  const sess = req.session as unknown as { user?: SessionUser };
  return sess?.user ?? null;
}

/* ── helpers ─────────────────────────────────────────── */

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, "").toLowerCase().replace(/\s+/g, "_"));
  return lines.slice(1).map(line => {
    const vals = line.match(/(".*?"|[^,]+|(?<=,)(?=,)|(?<=,)$|^(?=,))/g) ?? line.split(",");
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = (vals[i] ?? "").trim().replace(/^"|"$/g, "");
    });
    return row;
  }).filter(r => Object.values(r).some(v => v.length > 0));
}

function normaliseHeader(raw: Record<string, string>) {
  const aliases: Record<string, string[]> = {
    firstName: ["first_name", "firstname", "first"],
    lastName:  ["last_name",  "lastname",  "last"],
    email:     ["email", "email_id", "emailid", "email_address"],
    companyName: ["company_name", "company", "organisation", "organization"],
    role:      ["role", "designation", "title", "job_title", "jobtitle"],
  };
  const out: Record<string, string> = {};
  for (const [field, keys] of Object.entries(aliases)) {
    for (const k of keys) {
      if (raw[k] !== undefined) { out[field] = raw[k]; break; }
    }
  }
  return out;
}

/** Find or create account by name. Returns accountId or null. */
async function resolveAccount(orgId: number, name: string | undefined) {
  if (!name?.trim()) return null;
  const norm = name.trim();
  const [existing] = await db.select({ id: accountsTable.id })
    .from(accountsTable)
    .where(and(ilike(accountsTable.name, norm), eq(accountsTable.orgId, orgId)))
    .limit(1);
  if (existing) return existing.id;
  const [created] = await db.insert(accountsTable)
    .values({ orgId, name: norm } as typeof accountsTable.$inferInsert)
    .returning({ id: accountsTable.id });
  return created?.id ?? null;
}

/** Find existing contact/lead by email, or create new contact. Returns { contactId, leadId } */
async function resolveEmail(orgId: number, email: string, firstName: string, lastName: string, companyName?: string, role?: string) {
  const normEmail = email.toLowerCase().trim();

  // 1. Check existing contact
  const [contact] = await db.select({ id: contactsTable.id })
    .from(contactsTable)
    .where(and(ilike(contactsTable.email, normEmail), eq(contactsTable.orgId, orgId)))
    .limit(1);
  if (contact) return { contactId: contact.id, leadId: null };

  // 2. Check existing lead
  const [lead] = await db.select({ id: leadsTable.id })
    .from(leadsTable)
    .where(and(ilike(leadsTable.email, normEmail), eq(leadsTable.orgId, orgId)))
    .limit(1);
  if (lead) return { contactId: null, leadId: lead.id };

  // 3. Create new contact
  const accountId = await resolveAccount(orgId, companyName);
  const [newContact] = await db.insert(contactsTable).values({
    orgId,
    firstName,
    lastName,
    email: normEmail,
    title: role ?? null,
    accountId: accountId ?? null,
  } as typeof contactsTable.$inferInsert).returning({ id: contactsTable.id });

  return { contactId: newContact?.id ?? null, leadId: null };
}

/* ── GET /campaigns/:id/members ─────────────────────── */
router.get("/campaigns/:id/members", async (req, res) => {
  const user = getUser(req);
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const campaignId = parseInt(req.params.id);
    const { search, status, page = "1", limit = "100" } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(500, parseInt(limit) || 100);
    const offset = (pageNum - 1) * limitNum;

    const conditions: ReturnType<typeof eq>[] = [eq(campaignMembersTable.campaignId, campaignId), eq(campaignMembersTable.orgId, req.orgId!)];
    if (status) conditions.push(eq(campaignMembersTable.status, status));

    let whereClause = and(...conditions);
    if (search) {
      const s = `%${search}%`;
      whereClause = and(
        ...conditions,
        or(
          ilike(campaignMembersTable.firstName, s),
          ilike(campaignMembersTable.lastName, s),
          ilike(campaignMembersTable.email, s),
          ilike(campaignMembersTable.companyName, s),
          ilike(campaignMembersTable.role, s),
        )!,
      );
    }

    const [members, countResult, statsResult] = await Promise.all([
      db.select().from(campaignMembersTable)
        .where(whereClause)
        .limit(limitNum).offset(offset)
        .orderBy(sql`${campaignMembersTable.createdAt} desc`),
      db.select({ count: sql<number>`count(*)` }).from(campaignMembersTable).where(whereClause),
      db.select({
        status: campaignMembersTable.status,
        count: sql<number>`count(*)`,
      }).from(campaignMembersTable)
        .where(and(eq(campaignMembersTable.campaignId, campaignId), eq(campaignMembersTable.orgId, req.orgId!)))
        .groupBy(campaignMembersTable.status),
    ]);

    const statMap: Record<string, number> = {};
    for (const s of statsResult) statMap[s.status] = Number(s.count);

    res.json({
      data: members,
      total: Number(countResult[0]?.count ?? 0),
      page: pageNum,
      limit: limitNum,
      stats: {
        total: Number(countResult[0]?.count ?? 0),
        pending: statMap["pending"] ?? 0,
        sent: statMap["sent"] ?? 0,
        opened: statMap["opened"] ?? 0,
        clicked: statMap["clicked"] ?? 0,
        bounced: statMap["bounced"] ?? 0,
        unsubscribed: statMap["unsubscribed"] ?? 0,
      },
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── POST /campaigns/:id/members ────────────────────── */
// Add a single member (manual form, existing contact, existing lead)
router.post("/campaigns/:id/members", async (req, res) => {
  const user = getUser(req);
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const campaignId = parseInt(req.params.id);
    const { firstName, lastName, email, companyName, role, contactId, leadId } = req.body as {
      firstName?: string; lastName?: string; email?: string; companyName?: string;
      role?: string; contactId?: number; leadId?: number;
    };

    // If adding by existing contactId
    if (contactId) {
      const [c] = await db.select().from(contactsTable).where(and(eq(contactsTable.id, contactId), eq(contactsTable.orgId, req.orgId!))).limit(1);
      if (!c) { res.status(404).json({ error: "Contact not found" }); return; }
      const member = await db.insert(campaignMembersTable).values({
        orgId: req.orgId!,
        campaignId,
        contactId: c.id,
        firstName: c.firstName,
        lastName: c.lastName,
        email: (c.email ?? "").toLowerCase(),
        companyName: companyName ?? null,
        role: c.title ?? role ?? null,
        source: "contact_search",
        addedBy: user.id,
      }).onConflictDoUpdate({
        target: [campaignMembersTable.campaignId, campaignMembersTable.email],
        set: { contactId: c.id, updatedAt: new Date() },
      }).returning();
      res.status(201).json(member[0]);
      return;
    }

    // If adding by existing leadId
    if (leadId) {
      const [l] = await db.select().from(leadsTable).where(and(eq(leadsTable.id, leadId), eq(leadsTable.orgId, req.orgId!))).limit(1);
      if (!l) { res.status(404).json({ error: "Lead not found" }); return; }
      const member = await db.insert(campaignMembersTable).values({
        orgId: req.orgId!,
        campaignId,
        leadId: l.id,
        firstName: l.firstName,
        lastName: l.lastName,
        email: (l.email ?? "").toLowerCase(),
        companyName: l.company ?? companyName ?? null,
        role: l.title ?? role ?? null,
        source: "lead_search",
        addedBy: user.id,
      }).onConflictDoUpdate({
        target: [campaignMembersTable.campaignId, campaignMembersTable.email],
        set: { leadId: l.id, updatedAt: new Date() },
      }).returning();
      res.status(201).json(member[0]);
      return;
    }

    // Manual add
    if (!firstName || !lastName || !email) {
      res.status(400).json({ error: "firstName, lastName, and email are required" });
      return;
    }

    const { contactId: resolvedContactId, leadId: resolvedLeadId } =
      await resolveEmail(req.orgId!, email, firstName, lastName, companyName, role);

    const member = await db.insert(campaignMembersTable).values({
      orgId: req.orgId!,
      campaignId,
      contactId: resolvedContactId,
      leadId: resolvedLeadId,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.toLowerCase().trim(),
      companyName: companyName?.trim() ?? null,
      role: role?.trim() ?? null,
      source: "manual",
      addedBy: user.id,
    }).onConflictDoUpdate({
      target: [campaignMembersTable.campaignId, campaignMembersTable.email],
      set: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        companyName: companyName?.trim() ?? null,
        role: role?.trim() ?? null,
        updatedAt: new Date(),
      },
    }).returning();

    res.status(201).json(member[0]);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── POST /campaigns/:id/members/import ─────────────── */
// Bulk CSV import — receives JSON body: { csv: string } or { rows: [...] }
router.post("/campaigns/:id/members/import", async (req, res) => {
  const user = getUser(req);
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const campaignId = parseInt(req.params.id);
    let rows: Record<string, string>[] = [];

    if (req.body.csv) {
      rows = parseCSV(req.body.csv as string).map(normaliseHeader);
    } else if (Array.isArray(req.body.rows)) {
      rows = (req.body.rows as Record<string, string>[]).map(normaliseHeader);
    }

    if (!rows.length) { res.status(400).json({ error: "No valid rows found in CSV" }); return; }

    const results = { imported: 0, skipped: 0, errors: [] as string[] };

    for (const row of rows) {
      const { firstName, lastName, email, companyName, role } = row;
      if (!firstName || !lastName || !email) {
        results.skipped++;
        results.errors.push(`Skipped row — missing required field: ${JSON.stringify(row)}`);
        continue;
      }
      try {
        const { contactId, leadId } = await resolveEmail(req.orgId!, email, firstName, lastName, companyName, role);
        await db.insert(campaignMembersTable).values({
          orgId: req.orgId!,
          campaignId,
          contactId,
          leadId,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.toLowerCase().trim(),
          companyName: companyName?.trim() ?? null,
          role: role?.trim() ?? null,
          source: "csv_import",
          addedBy: user.id,
        }).onConflictDoUpdate({
          target: [campaignMembersTable.campaignId, campaignMembersTable.email],
          set: {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            companyName: companyName?.trim() ?? null,
            role: role?.trim() ?? null,
            contactId,
            leadId,
            source: "csv_import",
            updatedAt: new Date(),
          },
        });
        results.imported++;
      } catch (rowErr) {
        results.skipped++;
        results.errors.push(`Error processing ${email}: ${rowErr instanceof Error ? rowErr.message : String(rowErr)}`);
      }
    }

    res.json({ ...results, total: rows.length });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── DELETE /campaigns/:id/members/:memberId ─────────── */
router.delete("/campaigns/:id/members/:memberId", async (req, res) => {
  const user = getUser(req);
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const memberId = parseInt(req.params.memberId);
    await db.delete(campaignMembersTable).where(and(eq(campaignMembersTable.id, memberId), eq(campaignMembersTable.orgId, req.orgId!)));
    res.json({ success: true, id: memberId });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── GET /campaigns/contacts-search ─────────────────── */
/* Scoped under /campaigns/ to avoid conflict with /contacts/:id  */
router.get("/campaigns/contacts-search", async (req, res) => {
  const user = getUser(req);
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const { q = "" } = req.query as Record<string, string>;
    const s = `%${q}%`;
    const contacts = await db.select({
      id: contactsTable.id,
      firstName: contactsTable.firstName,
      lastName: contactsTable.lastName,
      email: contactsTable.email,
      title: contactsTable.title,
    }).from(contactsTable)
      .where(and(
        eq(contactsTable.orgId, req.orgId!),
        q ? or(
          ilike(contactsTable.firstName, s),
          ilike(contactsTable.lastName, s),
          ilike(contactsTable.email, s),
        )! : sql`1=1`,
      ))
      .limit(20)
      .orderBy(contactsTable.firstName);
    res.json(contacts);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── GET /campaigns/leads-search ─────────────────────── */
router.get("/campaigns/leads-search", async (req, res) => {
  const user = getUser(req);
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const { q = "" } = req.query as Record<string, string>;
    const s = `%${q}%`;
    const leads = await db.select({
      id: leadsTable.id,
      firstName: leadsTable.firstName,
      lastName: leadsTable.lastName,
      email: leadsTable.email,
      company: leadsTable.company,
      title: leadsTable.title,
    }).from(leadsTable)
      .where(and(
        eq(leadsTable.orgId, req.orgId!),
        q ? or(
          ilike(leadsTable.firstName, s),
          ilike(leadsTable.lastName, s),
          ilike(leadsTable.email, s),
          ilike(leadsTable.company, s),
        )! : sql`1=1`,
      ))
      .limit(20)
      .orderBy(leadsTable.firstName);
    res.json(leads);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
