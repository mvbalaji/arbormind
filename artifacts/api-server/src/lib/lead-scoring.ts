import { db } from "@workspace/db";
import { leadsTable, activitiesTable, leadScoringRulesTable, leadScoreMilestonesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

// ── Legacy sync API (kept for backward compat — used by leads.ts middleware) ─

export interface LeadScoreInput {
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  title?: string | null;
  industry?: string | null;
  description?: string | null;
  source?: string | null;
  status?: string | null;
  employees?: number | null;
  annualRevenue?: number | string | null;
}

export interface LeadScoreBreakdown {
  contact: number;
  qualification: number;
  companySize: number;
  revenue: number;
  source: number;
  modifier: string | null;
  total: number;
}

const FREE_EMAIL_DOMAINS = new Set([
  "gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "live.com",
  "aol.com", "icloud.com", "proton.me", "protonmail.com", "mail.com",
  "yandex.com", "gmx.com", "zoho.com",
]);

const SENIOR_TITLE_RE = /\b(ceo|cto|cfo|coo|cio|cmo|chief|president|founder|co-?founder|owner|partner|vp|vice president|director|head of)\b/i;
const MANAGER_TITLE_RE = /\b(manager|lead|principal|senior)\b/i;

function scoreContact(l: LeadScoreInput): number {
  let s = 0;
  if (l.email && l.email.trim()) s += 10;
  if (l.phone && l.phone.trim()) s += 5;
  if (l.company && l.company.trim()) s += 10;
  return s;
}

function scoreQualification(l: LeadScoreInput): number {
  let s = 0;
  const email = (l.email ?? "").trim().toLowerCase();
  if (email.includes("@")) {
    const domain = email.split("@")[1] ?? "";
    if (domain && !FREE_EMAIL_DOMAINS.has(domain)) s += 10;
  }
  const title = (l.title ?? "").trim();
  if (title) {
    if (SENIOR_TITLE_RE.test(title)) s += 15;
    else if (MANAGER_TITLE_RE.test(title)) s += 8;
    else s += 3;
  }
  if (l.industry && l.industry.trim()) s += 5;
  if (l.description && l.description.trim().length >= 20) s += 5;
  return s;
}

function scoreCompanySize(employees: number | null | undefined): number {
  if (employees == null || employees <= 0) return 0;
  if (employees <= 10) return 4;
  if (employees <= 50) return 8;
  if (employees <= 200) return 12;
  if (employees <= 1000) return 16;
  return 20;
}

function scoreRevenue(rev: number | string | null | undefined): number {
  if (rev == null) return 0;
  const n = typeof rev === "string" ? Number(rev) : rev;
  if (!Number.isFinite(n) || n <= 0) return 0;
  if (n < 100_000) return 2;
  if (n < 1_000_000) return 4;
  if (n < 10_000_000) return 7;
  return 10;
}

function scoreSource(source: string | null | undefined): number {
  const s = (source ?? "").trim().toLowerCase();
  if (!s) return 0;
  if (/(referral|partner)/.test(s)) return 10;
  if (/(website|inbound|demo|organic|seo)/.test(s)) return 8;
  if (/(event|webinar|conference|trade.?show)/.test(s)) return 6;
  if (/(ad|advert|paid|cold|outbound|outreach)/.test(s)) return 3;
  return 2;
}

export function computeLeadScore(lead: LeadScoreInput): LeadScoreBreakdown {
  const contact = scoreContact(lead);
  const qualification = scoreQualification(lead);
  const companySize = scoreCompanySize(lead.employees ?? null);
  const revenue = scoreRevenue(lead.annualRevenue ?? null);
  const source = scoreSource(lead.source ?? null);

  let total = contact + qualification + companySize + revenue + source;
  let modifier: string | null = null;

  const status = (lead.status ?? "").toLowerCase();
  if (status === "converted") {
    total = 100;
    modifier = "converted:forced-100";
  } else if (status === "unqualified" && total > 30) {
    total = 30;
    modifier = "unqualified:capped-30";
  }

  total = Math.max(0, Math.min(100, Math.round(total)));
  return { contact, qualification, companySize, revenue, source, modifier, total };
}

// ── DB-driven scoring (reads configurable rules from lead_scoring_rules table) ─

export interface ScoredRule {
  ruleId: number;
  ruleType: string;
  key: string;
  label: string;
  maxPoints: number;
  earned: boolean;
  earnedPoints: number;
  activityCount?: number;
}

export interface ScoreBreakdownResult {
  score: number;
  rules: ScoredRule[];
  milestone: { id: number; label: string; minScore: number; maxScore: number; color: string } | null;
  breakdown: { activity: number; field: number; qualification: number; companySize: number; revenue: number; total: number };
}

const CLEVEL_RE = /\b(ceo|cto|cfo|coo|cio|cmo|chief|president|founder|co-?founder|owner)\b/i;
const VP_RE = /\b(vp|vice president)\b/i;
const DIRECTOR_RE = /\b(director|head of)\b/i;
const MANAGER_RE_DB = /\b(manager|lead|principal|senior)\b/i;

const ACTIVITY_KEY_MAP: Record<string, string> = {
  call_completed: "call",
  email_sent: "email",
  meeting_held: "meeting",
  demo_completed: "demo",
  task_completed: "task",
  note_added: "note",
};

type LeadRecord = {
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  title?: string | null;
  industry?: string | null;
  description?: string | null;
  source?: string | null;
  employees?: number | null;
  annualRevenue?: string | number | null;
  status?: string | null;
};

type ActivityRecord = { type: string; status: string };

function matchRule(
  rule: { ruleType: string; key: string; points: number; params: unknown },
  lead: LeadRecord,
  activities: ActivityRecord[],
): { earned: boolean; earnedPoints: number; activityCount?: number } {
  const p = rule.params as { min?: number; max?: number } | null;

  switch (rule.ruleType) {
    case "field": {
      const fieldMap: Record<string, unknown> = {
        has_email: lead.email, has_phone: lead.phone, has_company: lead.company,
        has_title: lead.title, has_industry: lead.industry, has_description: lead.description,
        has_annual_revenue: lead.annualRevenue, has_employees: lead.employees,
      };
      const val = fieldMap[rule.key];
      const earned = val != null && String(val).trim().length > 0;
      return { earned, earnedPoints: earned ? rule.points : 0 };
    }

    case "activity": {
      const actType = ACTIVITY_KEY_MAP[rule.key];
      if (!actType) return { earned: false, earnedPoints: 0 };
      const count = activities.filter(a => a.type === actType && (a.status === "completed" || actType === "note")).length;
      return { earned: count > 0, earnedPoints: count > 0 ? rule.points : 0, activityCount: count };
    }

    case "qualification": {
      const email = (lead.email ?? "").toLowerCase().trim();
      const title = (lead.title ?? "").trim();
      const source = (lead.source ?? "").toLowerCase().trim();
      if (rule.key === "business_email") {
        const domain = email.includes("@") ? (email.split("@")[1] ?? "") : "";
        const earned = !!domain && !FREE_EMAIL_DOMAINS.has(domain);
        return { earned, earnedPoints: earned ? rule.points : 0 };
      }
      if (rule.key === "seniority_clevel") {
        const e = CLEVEL_RE.test(title);
        return { earned: e, earnedPoints: e ? rule.points : 0 };
      }
      if (rule.key === "seniority_vp") {
        const e = VP_RE.test(title) && !CLEVEL_RE.test(title);
        return { earned: e, earnedPoints: e ? rule.points : 0 };
      }
      if (rule.key === "seniority_director") {
        const e = DIRECTOR_RE.test(title) && !CLEVEL_RE.test(title) && !VP_RE.test(title);
        return { earned: e, earnedPoints: e ? rule.points : 0 };
      }
      if (rule.key === "seniority_manager") {
        const e = MANAGER_RE_DB.test(title) && !CLEVEL_RE.test(title) && !VP_RE.test(title) && !DIRECTOR_RE.test(title);
        return { earned: e, earnedPoints: e ? rule.points : 0 };
      }
      if (rule.key === "source_referral") {
        const e = /(referral|partner)/.test(source);
        return { earned: e, earnedPoints: e ? rule.points : 0 };
      }
      if (rule.key === "source_inbound") {
        const e = /(website|inbound|organic|seo|web)/.test(source);
        return { earned: e, earnedPoints: e ? rule.points : 0 };
      }
      if (rule.key === "source_event") {
        const e = /(event|webinar|conference|trade)/.test(source);
        return { earned: e, earnedPoints: e ? rule.points : 0 };
      }
      if (rule.key === "source_paid") {
        const e = /(paid|cold|outbound|outreach|email|ad)/.test(source);
        return { earned: e, earnedPoints: e ? rule.points : 0 };
      }
      return { earned: false, earnedPoints: 0 };
    }

    case "company_size": {
      const emp = lead.employees;
      if (emp == null || emp <= 0) return { earned: false, earnedPoints: 0 };
      const min = p?.min ?? 0;
      const max = p?.max ?? Infinity;
      const earned = emp >= min && emp <= max;
      return { earned, earnedPoints: earned ? rule.points : 0 };
    }

    case "revenue": {
      const rawRev = lead.annualRevenue;
      if (rawRev == null) return { earned: false, earnedPoints: 0 };
      const rev = typeof rawRev === "string" ? Number(rawRev) : rawRev;
      if (!Number.isFinite(rev) || rev <= 0) return { earned: false, earnedPoints: 0 };
      const min = p?.min ?? 0;
      const max = p?.max ?? Infinity;
      const earned = rev >= min && rev <= max;
      return { earned, earnedPoints: earned ? rule.points : 0 };
    }

    default:
      return { earned: false, earnedPoints: 0 };
  }
}

export async function computeLeadScoreFromRules(leadId: number): Promise<ScoreBreakdownResult> {
  const [lead] = await db.select().from(leadsTable).where(eq(leadsTable.id, leadId));
  if (!lead) throw new Error("Lead not found");

  const activities = await db
    .select({ type: activitiesTable.type, status: activitiesTable.status })
    .from(activitiesTable)
    .where(eq(activitiesTable.leadId, leadId));

  const rules = await db
    .select()
    .from(leadScoringRulesTable)
    .where(eq(leadScoringRulesTable.isActive, true))
    .orderBy(leadScoringRulesTable.sortOrder);

  const scoredRules: ScoredRule[] = rules.map(rule => {
    const { earned, earnedPoints, activityCount } = matchRule(rule, lead, activities);
    return {
      ruleId: rule.id, ruleType: rule.ruleType, key: rule.key, label: rule.label,
      maxPoints: rule.points, earned, earnedPoints,
      ...(activityCount != null ? { activityCount } : {}),
    };
  });

  const sum = (type: string) => scoredRules.filter(r => r.ruleType === type).reduce((s, r) => s + r.earnedPoints, 0);
  const breakdown = {
    activity: sum("activity"),
    field: sum("field"),
    qualification: sum("qualification"),
    companySize: sum("company_size"),
    revenue: sum("revenue"),
    total: 0,
  };

  let score = breakdown.activity + breakdown.field + breakdown.qualification + breakdown.companySize + breakdown.revenue;
  const status = (lead.status ?? "").toLowerCase();
  if (status === "converted") score = 100;
  else if (status === "unqualified" && score > 30) score = 30;
  score = Math.max(0, Math.min(100, Math.round(score)));
  breakdown.total = score;

  const milestones = await db.select().from(leadScoreMilestonesTable).orderBy(leadScoreMilestonesTable.sortOrder);
  const milestone = milestones.find(m => score >= m.minScore && score <= m.maxScore) ?? null;

  return { score, rules: scoredRules, milestone, breakdown };
}

export async function recalculateLeadScore(leadId: number): Promise<number> {
  try {
    const [anyRule] = await db.select({ id: leadScoringRulesTable.id }).from(leadScoringRulesTable).limit(1);
    if (!anyRule) return 0;
    const { score } = await computeLeadScoreFromRules(leadId);
    await db.update(leadsTable).set({ score, updatedAt: new Date() }).where(eq(leadsTable.id, leadId));
    return score;
  } catch {
    return 0;
  }
}

export async function seedDefaultScoringRules(): Promise<void> {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS lead_scoring_rules (
        id SERIAL PRIMARY KEY,
        rule_type TEXT NOT NULL,
        key TEXT NOT NULL UNIQUE,
        label TEXT NOT NULL,
        description TEXT,
        points INTEGER NOT NULL DEFAULT 0,
        params JSONB,
        is_active BOOLEAN NOT NULL DEFAULT true,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS lead_score_milestones (
        id SERIAL PRIMARY KEY,
        label TEXT NOT NULL,
        min_score INTEGER NOT NULL,
        max_score INTEGER NOT NULL,
        color TEXT NOT NULL DEFAULT 'gray',
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    const [existing] = await db.select({ id: leadScoringRulesTable.id }).from(leadScoringRulesTable).limit(1);
    if (!existing) {
      await db.insert(leadScoringRulesTable).values([
        { ruleType: "activity", key: "call_completed",   label: "Completed Phone Call",       description: "A phone call was logged and completed",             points: 10, sortOrder: 10 },
        { ruleType: "activity", key: "email_sent",       label: "Email Activity Logged",       description: "An email was sent or received",                     points: 5,  sortOrder: 11 },
        { ruleType: "activity", key: "meeting_held",     label: "Meeting Completed",           description: "A meeting was held with the lead",                  points: 15, sortOrder: 12 },
        { ruleType: "activity", key: "demo_completed",   label: "Product Demo Completed",      description: "A product demo was delivered to the lead",          points: 20, sortOrder: 13 },
        { ruleType: "activity", key: "task_completed",   label: "Task Completed",              description: "A follow-up task was completed",                    points: 3,  sortOrder: 14 },
        { ruleType: "activity", key: "note_added",       label: "Note Added to Lead",          description: "A note was logged for this lead",                   points: 2,  sortOrder: 15 },
        { ruleType: "field",    key: "has_email",        label: "Email Address Provided",      description: "Lead has an email address on file",                 points: 10, sortOrder: 20 },
        { ruleType: "field",    key: "has_phone",        label: "Phone Number Provided",       description: "Lead has a phone number on file",                   points: 5,  sortOrder: 21 },
        { ruleType: "field",    key: "has_company",      label: "Company Name Provided",       description: "Lead has a company name on file",                   points: 10, sortOrder: 22 },
        { ruleType: "field",    key: "has_title",        label: "Job Title Provided",          description: "Lead has a job title on file",                      points: 5,  sortOrder: 23 },
        { ruleType: "field",    key: "has_industry",     label: "Industry Specified",          description: "Lead's industry is known",                          points: 5,  sortOrder: 24 },
        { ruleType: "field",    key: "has_description",  label: "Lead Description Added",      description: "A description or notes are present",                points: 3,  sortOrder: 25 },
        { ruleType: "field",    key: "has_annual_revenue", label: "Annual Revenue Known",      description: "Lead's annual revenue is on file",                  points: 5,  sortOrder: 26 },
        { ruleType: "field",    key: "has_employees",    label: "Employee Count Known",        description: "Lead's employee count is on file",                  points: 2,  sortOrder: 27 },
        { ruleType: "qualification", key: "business_email",     label: "Business Email Domain",       description: "Email is not from a free provider (Gmail, Yahoo, etc.)", points: 10, sortOrder: 30 },
        { ruleType: "qualification", key: "seniority_clevel",   label: "C-Level Executive",           description: "Title matches CEO, CTO, CFO, President, Founder, etc.", points: 15, sortOrder: 31 },
        { ruleType: "qualification", key: "seniority_vp",       label: "VP / Vice President",         description: "Title matches VP or Vice President",                      points: 12, sortOrder: 32 },
        { ruleType: "qualification", key: "seniority_director", label: "Director / Head of",          description: "Title matches Director or Head of",                       points: 10, sortOrder: 33 },
        { ruleType: "qualification", key: "seniority_manager",  label: "Manager / Senior / Lead",     description: "Title matches Manager, Senior, or Lead",                  points: 8,  sortOrder: 34 },
        { ruleType: "qualification", key: "source_referral",    label: "Referral or Partner Source",  description: "Lead came from a referral or partner channel",            points: 10, sortOrder: 35 },
        { ruleType: "qualification", key: "source_inbound",     label: "Inbound / Website Source",    description: "Lead came inbound via website, SEO, or organic traffic",  points: 8,  sortOrder: 36 },
        { ruleType: "qualification", key: "source_event",       label: "Event / Conference Source",   description: "Lead was met at a conference, webinar, or event",         points: 6,  sortOrder: 37 },
        { ruleType: "qualification", key: "source_paid",        label: "Paid / Outbound Source",      description: "Lead came via paid ads or cold outreach",                 points: 3,  sortOrder: 38 },
        { ruleType: "company_size", key: "employees_1_10",      label: "1–10 Employees",      description: "Small startup or micro-business",  points: 4,  params: { min: 1,      max: 10      }, sortOrder: 40 },
        { ruleType: "company_size", key: "employees_11_50",     label: "11–50 Employees",     description: "Small business",                   points: 8,  params: { min: 11,     max: 50      }, sortOrder: 41 },
        { ruleType: "company_size", key: "employees_51_200",    label: "51–200 Employees",    description: "Mid-market company",               points: 12, params: { min: 51,     max: 200     }, sortOrder: 42 },
        { ruleType: "company_size", key: "employees_201_1000",  label: "201–1,000 Employees", description: "Growing enterprise",               points: 16, params: { min: 201,    max: 1000    }, sortOrder: 43 },
        { ruleType: "company_size", key: "employees_1001_plus", label: "1,001+ Employees",    description: "Large enterprise",                 points: 20, params: { min: 1001,   max: 9999999 }, sortOrder: 44 },
        { ruleType: "revenue", key: "revenue_under_100k",  label: "Revenue < $100K",    description: "Annual revenue under $100,000", points: 2,  params: { min: 1,         max: 99999   }, sortOrder: 50 },
        { ruleType: "revenue", key: "revenue_100k_1m",     label: "Revenue $100K–$1M",  description: "Annual revenue $100K to $1M",   points: 4,  params: { min: 100000,    max: 999999  }, sortOrder: 51 },
        { ruleType: "revenue", key: "revenue_1m_10m",      label: "Revenue $1M–$10M",   description: "Annual revenue $1M to $10M",    points: 7,  params: { min: 1000000,   max: 9999999 }, sortOrder: 52 },
        { ruleType: "revenue", key: "revenue_10m_plus",    label: "Revenue > $10M",     description: "Annual revenue over $10M",      points: 10, params: { min: 10000000,  max: 999999999 }, sortOrder: 53 },
      ]);
    }

    const [existingMilestone] = await db.select({ id: leadScoreMilestonesTable.id }).from(leadScoreMilestonesTable).limit(1);
    if (!existingMilestone) {
      await db.insert(leadScoreMilestonesTable).values([
        { label: "Cold",      minScore: 0,  maxScore: 25,  color: "blue",   sortOrder: 0 },
        { label: "Warm",      minScore: 26, maxScore: 50,  color: "yellow", sortOrder: 1 },
        { label: "Hot",       minScore: 51, maxScore: 75,  color: "orange", sortOrder: 2 },
        { label: "Qualified", minScore: 76, maxScore: 100, color: "green",  sortOrder: 3 },
      ]);
    }
  } catch (err) {
    console.error("[LeadScoring] Seed error:", err);
  }
}
