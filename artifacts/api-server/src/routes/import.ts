import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  leadsTable, contactsTable, accountsTable,
  opportunitiesTable, campaignsTable,
} from "@workspace/db";

const router: IRouter = Router();

function str(v: unknown): string | undefined {
  if (v == null) return undefined;
  const s = String(v).trim();
  return s || undefined;
}
function num(v: unknown): string | undefined {
  if (v == null) return undefined;
  const n = Number(v);
  return isNaN(n) ? undefined : String(n);
}
function int(v: unknown): number | undefined {
  if (v == null) return undefined;
  const n = parseInt(String(v));
  return isNaN(n) ? undefined : n;
}
function dt(v: unknown): Date | undefined {
  if (v == null) return undefined;
  const d = new Date(String(v));
  return isNaN(d.getTime()) ? undefined : d;
}

function normalizeKey(key: string, raw: Record<string, unknown>): unknown {
  return raw[key] ?? raw[key.toLowerCase()] ?? raw[key.replace(/([A-Z])/g, "_$1").toLowerCase()] ?? raw[key.replace(/([A-Z])/g, " $1").toLowerCase().trim()];
}

function buildLead(r: Record<string, unknown>) {
  const firstName = str(normalizeKey("firstName", r)) ?? str(r["first_name"]) ?? str(r["First Name"]);
  const lastName = str(normalizeKey("lastName", r)) ?? str(r["last_name"]) ?? str(r["Last Name"]);
  if (!firstName || !lastName) return null;
  return {
    firstName, lastName,
    email: str(normalizeKey("email", r)) ?? str(r["Email"]),
    phone: str(normalizeKey("phone", r)) ?? str(r["Phone"]),
    company: str(normalizeKey("company", r)) ?? str(r["Company"]),
    title: str(normalizeKey("title", r)) ?? str(r["Title"]),
    status: str(normalizeKey("status", r)) ?? "new",
    source: str(normalizeKey("source", r)) ?? str(r["Source"]),
    industry: str(normalizeKey("industry", r)) ?? str(r["Industry"]),
    description: str(normalizeKey("description", r)) ?? str(r["Description"]),
    score: int(normalizeKey("score", r)),
    employees: int(normalizeKey("employees", r)),
    annualRevenue: num(normalizeKey("annualRevenue", r)) ?? num(r["annual_revenue"]) ?? num(r["Annual Revenue"]),
    isConverted: false,
  };
}

function buildContact(r: Record<string, unknown>) {
  const firstName = str(normalizeKey("firstName", r)) ?? str(r["first_name"]) ?? str(r["First Name"]);
  const lastName = str(normalizeKey("lastName", r)) ?? str(r["last_name"]) ?? str(r["Last Name"]);
  if (!firstName || !lastName) return null;
  return {
    firstName, lastName,
    email: str(normalizeKey("email", r)) ?? str(r["Email"]),
    phone: str(normalizeKey("phone", r)) ?? str(r["Phone"]),
    mobile: str(normalizeKey("mobile", r)),
    title: str(normalizeKey("title", r)) ?? str(r["Title"]),
    department: str(normalizeKey("department", r)) ?? str(r["Department"]),
    leadSource: str(normalizeKey("leadSource", r)) ?? str(r["lead_source"]) ?? str(r["Source"]),
    address: str(normalizeKey("address", r)) ?? str(r["Address"]),
    city: str(normalizeKey("city", r)) ?? str(r["City"]),
    country: str(normalizeKey("country", r)) ?? str(r["Country"]),
    description: str(normalizeKey("description", r)) ?? str(r["Description"]),
  };
}

function buildAccount(r: Record<string, unknown>) {
  const name = str(normalizeKey("name", r)) ?? str(r["Name"]) ?? str(r["Company"]) ?? str(r["Account Name"]);
  if (!name) return null;
  return {
    name,
    industry: str(normalizeKey("industry", r)) ?? str(r["Industry"]),
    website: str(normalizeKey("website", r)) ?? str(r["Website"]),
    phone: str(normalizeKey("phone", r)) ?? str(r["Phone"]),
    email: str(normalizeKey("email", r)) ?? str(r["Email"]),
    address: str(normalizeKey("address", r)) ?? str(r["Address"]),
    city: str(normalizeKey("city", r)) ?? str(r["City"]),
    country: str(normalizeKey("country", r)) ?? str(r["Country"]),
    employees: int(normalizeKey("employees", r)) ?? int(r["Employees"]),
    annualRevenue: num(normalizeKey("annualRevenue", r)) ?? num(r["annual_revenue"]) ?? num(r["Annual Revenue"]),
    description: str(normalizeKey("description", r)) ?? str(r["Description"]),
  };
}

function buildOpportunity(r: Record<string, unknown>) {
  const name = str(normalizeKey("name", r)) ?? str(r["Name"]) ?? str(r["Opportunity Name"]);
  if (!name) return null;
  return {
    name,
    stage: str(normalizeKey("stage", r)) ?? str(r["Stage"]) ?? "prospecting",
    amount: num(normalizeKey("amount", r)) ?? num(r["Amount"]),
    probability: int(normalizeKey("probability", r)) ?? int(r["Probability"]),
    closeDate: dt(normalizeKey("closeDate", r)) ?? dt(r["close_date"]) ?? dt(r["Close Date"]),
    description: str(normalizeKey("description", r)) ?? str(r["Description"]),
    leadSource: str(normalizeKey("leadSource", r)) ?? str(r["lead_source"]) ?? str(r["Lead Source"]),
    nextStep: str(normalizeKey("nextStep", r)) ?? str(r["next_step"]) ?? str(r["Next Step"]),
    forecastCategory: str(normalizeKey("forecastCategory", r)) ?? str(r["forecast_category"]) ?? str(r["Forecast Category"]),
  };
}

function buildCampaign(r: Record<string, unknown>) {
  const name = str(normalizeKey("name", r)) ?? str(r["Name"]) ?? str(r["Campaign Name"]);
  if (!name) return null;
  return {
    name,
    type: str(normalizeKey("type", r)) ?? str(r["Type"]) ?? "other",
    status: str(normalizeKey("status", r)) ?? str(r["Status"]) ?? "planning",
    startDate: dt(normalizeKey("startDate", r)) ?? dt(r["start_date"]) ?? dt(r["Start Date"]),
    endDate: dt(normalizeKey("endDate", r)) ?? dt(r["end_date"]) ?? dt(r["End Date"]),
    budget: num(normalizeKey("budget", r)) ?? num(r["Budget"]),
    actualCost: num(normalizeKey("actualCost", r)) ?? num(r["actual_cost"]) ?? num(r["Actual Cost"]),
    expectedRevenue: num(normalizeKey("expectedRevenue", r)) ?? num(r["expected_revenue"]) ?? num(r["Expected Revenue"]),
    description: str(normalizeKey("description", r)) ?? str(r["Description"]),
    goals: str(normalizeKey("goals", r)) ?? str(r["Goals"]),
    targetAudience: str(normalizeKey("targetAudience", r)) ?? str(r["target_audience"]) ?? str(r["Target Audience"]),
    channels: str(normalizeKey("channels", r)) ?? str(r["Channels"]),
    teamMembers: str(normalizeKey("teamMembers", r)) ?? str(r["team_members"]) ?? str(r["Team Members"]),
  };
}

router.post("/import/:entity", async (req, res) => {
  const entity = req.params.entity;
  const { records } = req.body as { records: Record<string, unknown>[] };

  if (!Array.isArray(records) || records.length === 0) {
    res.status(400).json({ error: "No records provided" });
    return;
  }

  const skipped: number[] = [];
  let inserted = 0;

  try {
    const BATCH = 100;

    const orgId = req.orgId as number;

    if (entity === "leads") {
      const valid = records.map((r, i) => { const v = buildLead(r); if (!v) skipped.push(i + 1); return v; }).filter(Boolean) as ReturnType<typeof buildLead>[];
      if (!valid.length) { res.status(400).json({ error: "No valid leads", skipped }); return; }
      for (let i = 0; i < valid.length; i += BATCH) await db.insert(leadsTable).values(valid.slice(i, i + BATCH).map((v) => ({ ...v!, orgId })));
      inserted = valid.length;

    } else if (entity === "contacts") {
      const valid = records.map((r, i) => { const v = buildContact(r); if (!v) skipped.push(i + 1); return v; }).filter(Boolean) as ReturnType<typeof buildContact>[];
      if (!valid.length) { res.status(400).json({ error: "No valid contacts", skipped }); return; }
      for (let i = 0; i < valid.length; i += BATCH) await db.insert(contactsTable).values(valid.slice(i, i + BATCH).map((v) => ({ ...v!, orgId })));
      inserted = valid.length;

    } else if (entity === "accounts") {
      const valid = records.map((r, i) => { const v = buildAccount(r); if (!v) skipped.push(i + 1); return v; }).filter(Boolean) as ReturnType<typeof buildAccount>[];
      if (!valid.length) { res.status(400).json({ error: "No valid accounts", skipped }); return; }
      for (let i = 0; i < valid.length; i += BATCH) await db.insert(accountsTable).values(valid.slice(i, i + BATCH).map((v) => ({ ...v!, orgId })));
      inserted = valid.length;

    } else if (entity === "opportunities") {
      const valid = records.map((r, i) => { const v = buildOpportunity(r); if (!v) skipped.push(i + 1); return v; }).filter(Boolean) as ReturnType<typeof buildOpportunity>[];
      if (!valid.length) { res.status(400).json({ error: "No valid opportunities", skipped }); return; }
      for (let i = 0; i < valid.length; i += BATCH) await db.insert(opportunitiesTable).values(valid.slice(i, i + BATCH).map((v) => ({ ...v!, orgId })));
      inserted = valid.length;

    } else if (entity === "campaigns") {
      const valid = records.map((r, i) => { const v = buildCampaign(r); if (!v) skipped.push(i + 1); return v; }).filter(Boolean) as ReturnType<typeof buildCampaign>[];
      if (!valid.length) { res.status(400).json({ error: "No valid campaigns", skipped }); return; }
      for (let i = 0; i < valid.length; i += BATCH) await db.insert(campaignsTable).values(valid.slice(i, i + BATCH).map((v) => ({ ...v!, orgId })));
      inserted = valid.length;

    } else {
      res.status(400).json({ error: `Unknown entity: ${entity}. Use: leads, contacts, accounts, opportunities, campaigns` });
      return;
    }

    res.json({ success: true, inserted, skipped: skipped.length, skippedRows: skipped });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Database error during import", detail: String(err) });
  }
});

export default router;
