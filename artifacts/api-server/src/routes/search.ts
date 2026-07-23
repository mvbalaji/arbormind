import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  leadsTable, opportunitiesTable, accountsTable, contactsTable, campaignsTable,
} from "@workspace/db";
import { and, eq, ilike, or, sql } from "drizzle-orm";
import { userHasScreenAccess } from "../lib/access-control";

const router: IRouter = Router();

router.get("/search", async (req, res) => {
  const u = (req.user || (req.session as any)?.user) as { role?: string } | undefined;
  if (!u?.role || req.orgId == null) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const orgId = req.orgId;
  const q = String(req.query.q ?? "").trim();
  if (q.length < 2) {
    res.json({ q, results: [] });
    return;
  }
  const like = `%${q}%`;
  const limit = 5;

  try {
    const [canLeads, canOpps, canAccounts, canContacts, canCampaigns] = await Promise.all([
      userHasScreenAccess(u.role, "leads", "view", orgId),
      userHasScreenAccess(u.role, "opportunities", "view", orgId),
      userHasScreenAccess(u.role, "accounts", "view", orgId),
      userHasScreenAccess(u.role, "contacts", "view", orgId),
      userHasScreenAccess(u.role, "campaigns", "view", orgId),
    ]);

    const leadsP = canLeads
      ? db.select({
          id: leadsTable.id, firstName: leadsTable.firstName, lastName: leadsTable.lastName,
          email: leadsTable.email, company: leadsTable.company, status: leadsTable.status,
        }).from(leadsTable).where(and(eq(leadsTable.orgId, orgId), or(
          ilike(leadsTable.firstName, like),
          ilike(leadsTable.lastName, like),
          ilike(leadsTable.email, like),
          ilike(leadsTable.company, like),
          sql`${leadsTable.firstName} || ' ' || ${leadsTable.lastName} ILIKE ${like}`,
        ))).limit(limit)
      : Promise.resolve([] as Array<{ id: number; firstName: string; lastName: string; email: string | null; company: string | null; status: string }>);

    const oppsP = canOpps
      ? db.select({
          id: opportunitiesTable.id, name: opportunitiesTable.name,
          stage: opportunitiesTable.stage, amount: opportunitiesTable.amount,
        }).from(opportunitiesTable).where(and(eq(opportunitiesTable.orgId, orgId), or(
          ilike(opportunitiesTable.name, like),
          ilike(opportunitiesTable.nextStep, like),
        ))).limit(limit)
      : Promise.resolve([] as Array<{ id: number; name: string; stage: string; amount: string | null }>);

    const accountsP = canAccounts
      ? db.select({
          id: accountsTable.id, name: accountsTable.name,
          industry: accountsTable.industry, website: accountsTable.website,
        }).from(accountsTable).where(and(eq(accountsTable.orgId, orgId), or(
          ilike(accountsTable.name, like),
          ilike(accountsTable.email, like),
          ilike(accountsTable.website, like),
        ))).limit(limit)
      : Promise.resolve([] as Array<{ id: number; name: string; industry: string | null; website: string | null }>);

    const contactsP = canContacts
      ? db.select({
          id: contactsTable.id, firstName: contactsTable.firstName, lastName: contactsTable.lastName,
          email: contactsTable.email, title: contactsTable.title,
        }).from(contactsTable).where(and(eq(contactsTable.orgId, orgId), or(
          ilike(contactsTable.firstName, like),
          ilike(contactsTable.lastName, like),
          ilike(contactsTable.email, like),
          sql`${contactsTable.firstName} || ' ' || ${contactsTable.lastName} ILIKE ${like}`,
        ))).limit(limit)
      : Promise.resolve([] as Array<{ id: number; firstName: string; lastName: string; email: string | null; title: string | null }>);

    const campaignsP = canCampaigns
      ? db.select({
          id: campaignsTable.id, name: campaignsTable.name,
          status: campaignsTable.status, type: campaignsTable.type,
        }).from(campaignsTable).where(and(eq(campaignsTable.orgId, orgId), ilike(campaignsTable.name, like))).limit(limit)
      : Promise.resolve([] as Array<{ id: number; name: string; status: string; type: string | null }>);

    const [leads, opps, accounts, contacts, campaigns] = await Promise.all([
      leadsP, oppsP, accountsP, contactsP, campaignsP,
    ]);

    const results = [
      ...leads.map(l => ({
        type: "lead" as const, id: l.id,
        title: `${l.firstName} ${l.lastName}`,
        subtitle: [l.company, l.email].filter(Boolean).join(" · ") || null,
        meta: l.status, href: `/leads/${l.id}`,
      })),
      ...opps.map(o => ({
        type: "opportunity" as const, id: o.id,
        title: o.name,
        subtitle: o.amount != null ? `£${Number(o.amount).toLocaleString()}` : null,
        meta: o.stage, href: `/opportunities/${o.id}`,
      })),
      ...accounts.map(a => ({
        type: "account" as const, id: a.id,
        title: a.name,
        subtitle: [a.industry, a.website].filter(Boolean).join(" · ") || null,
        meta: null, href: `/accounts/${a.id}`,
      })),
      ...contacts.map(c => ({
        type: "contact" as const, id: c.id,
        title: `${c.firstName} ${c.lastName}`,
        subtitle: [c.title, c.email].filter(Boolean).join(" · ") || null,
        meta: null, href: `/contacts/${c.id}`,
      })),
      ...campaigns.map(c => ({
        type: "campaign" as const, id: c.id,
        title: c.name,
        subtitle: c.type,
        meta: c.status, href: `/campaigns/${c.id}`,
      })),
    ];

    res.json({ q, results });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Search failed" });
  }
});

export default router;
