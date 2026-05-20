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
