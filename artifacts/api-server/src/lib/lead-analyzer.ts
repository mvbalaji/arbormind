import { db } from "@workspace/db";
import { leadsTable, leadInsightsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { computeLeadScore } from "./lead-scoring";

interface LeadForAnalysis {
  id: number;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  company: string | null;
  title: string | null;
  industry: string | null;
  description: string | null;
  source: string | null;
  employees: number | null;
  annualRevenue: string | number | null;
  status: string;
  score: number | null;
}

export interface LeadInsightResult {
  companySize: string;
  industrySegment: string;
  productSummary: string;
  recentNews: string;
  hiringTrend: "growing" | "stable" | "declining" | "unknown";
  techStack: string;
  socialPresence: "strong" | "moderate" | "minimal" | "unknown";
  sentiment: "positive" | "neutral" | "negative";
  growthIndicators: string[];
  buyingIntentSignals: string[];
  aiScoreBoost: number;
  buyerClassification: "high_potential" | "medium_potential" | "low_potential";
  confidence: "high" | "medium" | "low";
  analysisSummary: string;
  // Leadership
  ceoName: string;
  ceoTitle: string;
  ceoLinkedin: string;
  // Market intelligence
  headquarters: string;
  foundedYear: string;
  estimatedMarketValue: string;
  fundingStage: string;
  keyCompetitors: string[];
  recentAchievements: string[];
  // Company social media
  linkedinUrl: string;
  twitterHandle: string;
  facebookUrl: string;
  instagramHandle: string;
  youtubeUrl: string;
  blogUrl: string;
  // Best contact
  bestContactName: string;
  bestContactTitle: string;
  bestContactEmail: string;
  emailPattern: string;
}

/* ============================================================
 * Website Scraper — extracts real social/blog links from HTML
 * ============================================================ */

interface ScrapedData {
  linkedinUrl: string | null;
  twitterUrl: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
  youtubeUrl: string | null;
  blogUrl: string | null;
  rawText: string;
}

function extractFirstMatch(html: string, patterns: RegExp[]): string | null {
  for (const p of patterns) {
    const m = html.match(p);
    if (m?.[1]) return m[1];
  }
  return null;
}

function normalizeUrl(url: string, baseOrigin: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("//")) return `https:${url}`;
  if (url.startsWith("/")) return `${baseOrigin}${url}`;
  return url;
}

async function scrapeCompanyWebsite(websiteUrl: string): Promise<ScrapedData> {
  const empty: ScrapedData = { linkedinUrl: null, twitterUrl: null, facebookUrl: null, instagramUrl: null, youtubeUrl: null, blogUrl: null, rawText: "" };
  try {
    let url = websiteUrl.trim();
    if (!url.startsWith("http://") && !url.startsWith("https://")) url = `https://${url}`;
    const parsed = new URL(url);
    const origin = parsed.origin;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; ArborMindBot/1.0; +https://arbormind.in)",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
    }).finally(() => clearTimeout(timeout));

    if (!res.ok) return empty;

    const html = await res.text();
    const lower = html.toLowerCase();

    // Extract href values containing social domains
    const hrefPattern = /href=["']([^"']*?linkedin\.com\/company\/[^"']*?)["']/gi;
    const twitterPattern = /href=["']([^"']*?(?:twitter\.com|x\.com)\/(?!intent|share|home)[a-zA-Z0-9_]{1,50}\/??)["']/gi;
    const fbPattern = /href=["']([^"']*?facebook\.com\/(?!sharer|share|login|dialog)[a-zA-Z0-9.]{1,100}\/??)["']/gi;
    const igPattern = /href=["']([^"']*?instagram\.com\/[a-zA-Z0-9_.]{1,100}\/??)["']/gi;
    const ytPattern = /href=["']([^"']*?(?:youtube\.com\/(?:c\/|channel\/|@|user\/)[^"'/?]*|youtube\.com\/@[^"'/?]*))/gi;

    const linkedinMatch = hrefPattern.exec(html);
    const twitterMatch = twitterPattern.exec(html);
    const fbMatch = fbPattern.exec(html);
    const igMatch = igPattern.exec(html);
    const ytMatch = ytPattern.exec(html);

    // Blog URL — look for common patterns in hrefs
    const blogPatterns = [
      /href=["']([^"']*?\/blog\/??)["']/i,
      /href=["']([^"']*?\/news\/??)["']/i,
      /href=["']([^"']*?\/resources\/??)["']/i,
      /href=["']([^"']*?\/journal\/??)["']/i,
      /href=["']([^"']*?\/insights\/??)["']/i,
      /href=["']([^"']*?\/articles\/??)["']/i,
    ];
    const blogRaw = extractFirstMatch(html, blogPatterns);
    const blogUrl = blogRaw ? normalizeUrl(blogRaw, origin) : null;

    // Strip HTML tags for a plain text excerpt (first 3000 chars of body text)
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    const bodyHtml = bodyMatch?.[1] ?? html;
    const rawText = bodyHtml
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 3000);

    return {
      linkedinUrl: linkedinMatch?.[1] ? normalizeUrl(linkedinMatch[1], origin) : null,
      twitterUrl: twitterMatch?.[1] ? normalizeUrl(twitterMatch[1], origin) : null,
      facebookUrl: fbMatch?.[1] ? normalizeUrl(fbMatch[1], origin) : null,
      instagramUrl: igMatch?.[1] ? normalizeUrl(igMatch[1], origin) : null,
      youtubeUrl: ytMatch?.[1] ? normalizeUrl(ytMatch[1], origin) : null,
      blogUrl,
      rawText,
    };
  } catch {
    return empty;
  }
}

/* ============================================================
 * Prompt builder — injects scraped data as ground truth
 * ============================================================ */

function buildAnalysisPrompt(lead: LeadForAnalysis, scraped: ScrapedData): string {
  const domain = lead.email?.includes("@") ? lead.email.split("@")[1] : null;
  const websiteDomain = lead.website ? lead.website.replace(/^https?:\/\//, "").split("/")[0] : null;
  const effectiveDomain = websiteDomain ?? domain;

  const scrapedSection: string[] = [];
  if (
    scraped.linkedinUrl || scraped.twitterUrl || scraped.facebookUrl ||
    scraped.instagramUrl || scraped.youtubeUrl || scraped.blogUrl || scraped.rawText
  ) {
    scrapedSection.push("", "SCRAPED WEBSITE DATA (GROUND TRUTH — use these values directly, do not guess or replace):");
    if (scraped.linkedinUrl) scrapedSection.push(`  LinkedIn URL (confirmed): ${scraped.linkedinUrl}`);
    if (scraped.twitterUrl) scrapedSection.push(`  Twitter/X URL (confirmed): ${scraped.twitterUrl}`);
    if (scraped.facebookUrl) scrapedSection.push(`  Facebook URL (confirmed): ${scraped.facebookUrl}`);
    if (scraped.instagramUrl) scrapedSection.push(`  Instagram URL (confirmed): ${scraped.instagramUrl}`);
    if (scraped.youtubeUrl) scrapedSection.push(`  YouTube URL (confirmed): ${scraped.youtubeUrl}`);
    if (scraped.blogUrl) scrapedSection.push(`  Blog/News URL (confirmed): ${scraped.blogUrl}`);
    if (scraped.rawText) scrapedSection.push(`  Website content excerpt:\n  ${scraped.rawText}`);
  }

  const lines: string[] = [
    "You are a senior B2B sales intelligence analyst with access to public knowledge about companies worldwide.",
    "Analyse the following lead. Where SCRAPED WEBSITE DATA is provided below, use those values directly as ground truth — do NOT override them with guesses.",
    "For fields not covered by scraped data, use your training knowledge. Be specific — use real data, not generic placeholders.",
    "",
    "LEAD DATA:",
    `Name: ${lead.firstName} ${lead.lastName}`,
    lead.title ? `Title: ${lead.title}` : "",
    lead.company ? `Company: ${lead.company}` : "",
    effectiveDomain ? `Company domain: ${effectiveDomain}` : "",
    lead.website ? `Website: ${lead.website}` : "",
    lead.industry ? `Industry: ${lead.industry}` : "",
    lead.employees ? `Employees (self-reported): ${lead.employees}` : "",
    lead.annualRevenue ? `Annual revenue (self-reported): $${Number(lead.annualRevenue).toLocaleString()}` : "",
    lead.description ? `Notes: ${lead.description}` : "",
    lead.source ? `Lead source: ${lead.source}` : "",
    ...scrapedSection,
    "",
    "Return ONLY valid JSON (no markdown, no commentary) with this exact schema:",
    `{
  "companySize": "string — e.g. 'SMB (11-50)', 'Mid-market (51-500)', 'Enterprise (500+)', 'Solo/freelancer', 'Unknown'",
  "industrySegment": "string — specific sub-industry or market niche",
  "productSummary": "string — concise description of what the company sells or does (2-3 sentences using real knowledge where available)",
  "recentNews": "string — notable recent news, events, or public signals about this company (funding, expansion, product launch, awards, etc.). Use 'No recent public signals' if unknown.",
  "hiringTrend": "growing | stable | declining | unknown",
  "techStack": "string — known or inferred technology stack, tools, or platforms used",
  "socialPresence": "strong | moderate | minimal | unknown",
  "sentiment": "positive | neutral | negative",
  "growthIndicators": ["2-4 specific, factual growth signals about this company"],
  "buyingIntentSignals": ["2-4 specific buying intent signals based on their profile and context"],
  "aiScoreBoost": "integer 0-40 — additional score based on company fit and potential (0=low, 40=very high)",
  "buyerClassification": "high_potential | medium_potential | low_potential",
  "confidence": "high | medium | low",
  "analysisSummary": "3-4 sentence executive summary covering the lead's potential, company context, and recommended next action",
  "ceoName": "string — full name of the CEO, MD, or Founder. Use 'Unknown' only if truly not findable.",
  "ceoTitle": "string — their exact title e.g. 'CEO & Co-Founder', 'Managing Director', 'Founder & CEO'",
  "ceoLinkedin": "string — LinkedIn profile URL if known (e.g. 'https://linkedin.com/in/username'), else 'Unknown'",
  "headquarters": "string — city and country e.g. 'Bangalore, India' or 'San Francisco, USA'. 'Unknown' if not findable.",
  "foundedYear": "string — year the company was founded e.g. '2015'. 'Unknown' if not findable.",
  "estimatedMarketValue": "string — estimated valuation, market cap, or revenue range e.g. '$50M–$100M ARR', 'Series B (~$120M valuation)', 'Publicly traded (BSE: XXXX)', '$2B market cap'. Use 'Unknown' if not findable.",
  "fundingStage": "string — e.g. 'Bootstrapped', 'Seed', 'Series A', 'Series B', 'Series C+', 'Publicly listed', 'Private equity-backed', 'Unknown'",
  "keyCompetitors": ["2-4 known direct competitors by name"],
  "recentAchievements": ["2-4 notable recent milestones, awards, partnerships, or product launches"],
  "linkedinUrl": "string — company LinkedIn page URL. Use SCRAPED value if provided, else your best knowledge. 'Unknown' if not findable.",
  "twitterHandle": "string — company Twitter/X handle with @ e.g. '@stripe'. Derive from scraped URL if provided. 'Unknown' if not findable.",
  "facebookUrl": "string — company Facebook page URL. Use SCRAPED value if provided. 'Unknown' if not findable.",
  "instagramHandle": "string — company Instagram handle with @ e.g. '@stripe'. Derive from scraped URL if provided. 'Unknown' if not findable.",
  "youtubeUrl": "string — company YouTube channel URL. Use SCRAPED value if provided. 'Unknown' if not findable.",
  "blogUrl": "string — company blog or news page URL. Use SCRAPED value if provided, else infer e.g. 'https://stripe.com/blog'. 'Unknown' if not findable.",
  "bestContactName": "string — full name of the best person to contact for a B2B sale (not necessarily CEO — prefer VP Sales, Head of Procurement, CTO, or relevant decision-maker). 'Unknown' if not findable.",
  "bestContactTitle": "string — their exact title e.g. 'VP of Sales', 'Chief Procurement Officer', 'Head of Engineering'. 'Unknown' if not findable.",
  "bestContactEmail": "string — inferred likely email using company domain and name (e.g. 'john.smith@stripe.com'). Format: apply the most common pattern for this company. If pattern unknown, use firstname.lastname@domain. 'Unknown' if domain unavailable.",
  "emailPattern": "string — the company's email pattern e.g. '{first}.{last}@domain.com', '{first}@domain.com', '{first}{last}@domain.com'. 'Unknown' if not inferrable."
}`,
    "",
    "IMPORTANT GUIDANCE:",
    "- SCRAPED WEBSITE DATA fields are ground truth — copy them verbatim into the JSON output, do NOT change or guess them.",
    "- If the company is well-known (e.g. Infosys, Zoho, Salesforce, Stripe), use your training knowledge to provide accurate details for non-scraped fields.",
    "- For CEO/leadership: search your knowledge — many company founders and executives are publicly documented.",
    "- For market value: use funding rounds, ARR estimates, or public market cap if known.",
    "- For headquarters: use the company's known registered address or primary office.",
    "- For twitterHandle/instagramHandle: extract the @handle from the scraped URL if present (e.g. 'https://twitter.com/stripe' → '@stripe').",
    "- For bestContactName/Title: identify the most relevant B2B decision-maker (not always CEO). For tech, prefer CTO/VP Engineering. For procurement, prefer CPO/VP Ops. For general, prefer VP Sales or COO.",
    "- For bestContactEmail: apply the company's known email pattern to the contact's name and domain. If you know the company uses 'first@domain.com', use that. Default to 'firstname.lastname@domain.com'.",
    "- NEVER leave a field as empty string — use 'Unknown' as fallback.",
    "- Buyer classification guidance:",
    "  · high_potential: senior decision-maker at growing company, clear fit, aiScoreBoost 25-40",
    "  · medium_potential: some signals or unclear fit, aiScoreBoost 10-24",
    "  · low_potential: weak signals, poor fit, or very limited company info, aiScoreBoost 0-9",
  ].filter(Boolean);

  return lines.join("\n");
}

/* ============================================================
 * Main export — orchestrates scrape → AI → DB upsert
 * ============================================================ */

export async function analyzeLeadWithAI(leadId: number): Promise<{ insights: LeadInsightResult; newScore: number }> {
  const [lead] = await db.select().from(leadsTable).where(eq(leadsTable.id, leadId));
  if (!lead) throw new Error("Lead not found");

  const { openai } = await import("@workspace/integrations-openai-ai-server");

  // Scrape the company website first (if available)
  const websiteUrl = lead.website ?? null;
  const scraped: ScrapedData = websiteUrl
    ? await scrapeCompanyWebsite(websiteUrl)
    : { linkedinUrl: null, twitterUrl: null, facebookUrl: null, instagramUrl: null, youtubeUrl: null, blogUrl: null, rawText: "" };

  const prompt = buildAnalysisPrompt(lead as LeadForAnalysis, scraped);

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.2,
    max_tokens: 1800,
    response_format: { type: "json_object" },
  });

  const rawText = completion.choices[0]?.message?.content ?? "{}";
  let parsed: Partial<LeadInsightResult>;
  try {
    parsed = JSON.parse(rawText) as Partial<LeadInsightResult>;
  } catch {
    parsed = {};
  }

  // For social fields: if the AI didn't use scraped values, override with scraped values (ground truth)
  const finalLinkedinUrl = scraped.linkedinUrl ?? parsed.linkedinUrl ?? "Unknown";
  const finalFacebookUrl = scraped.facebookUrl ?? parsed.facebookUrl ?? "Unknown";
  const finalYoutubeUrl = scraped.youtubeUrl ?? parsed.youtubeUrl ?? "Unknown";
  const finalBlogUrl = scraped.blogUrl ?? parsed.blogUrl ?? "Unknown";

  // For handle-based fields, derive from scraped URL if available
  const finalTwitterHandle = (() => {
    if (scraped.twitterUrl) {
      const m = scraped.twitterUrl.match(/(?:twitter\.com|x\.com)\/(@?[a-zA-Z0-9_]+)/);
      if (m?.[1]) return m[1].startsWith("@") ? m[1] : `@${m[1]}`;
    }
    return parsed.twitterHandle ?? "Unknown";
  })();
  const finalInstagramHandle = (() => {
    if (scraped.instagramUrl) {
      const m = scraped.instagramUrl.match(/instagram\.com\/([a-zA-Z0-9_.]+)/);
      if (m?.[1]) return `@${m[1]}`;
    }
    return parsed.instagramHandle ?? "Unknown";
  })();

  const insights: LeadInsightResult = {
    companySize: parsed.companySize ?? "Unknown",
    industrySegment: parsed.industrySegment ?? lead.industry ?? "Unknown",
    productSummary: parsed.productSummary ?? "",
    recentNews: parsed.recentNews ?? "No recent public signals",
    hiringTrend: parsed.hiringTrend ?? "unknown",
    techStack: parsed.techStack ?? "Unknown",
    socialPresence: parsed.socialPresence ?? "unknown",
    sentiment: parsed.sentiment ?? "neutral",
    growthIndicators: Array.isArray(parsed.growthIndicators) ? parsed.growthIndicators : [],
    buyingIntentSignals: Array.isArray(parsed.buyingIntentSignals) ? parsed.buyingIntentSignals : [],
    aiScoreBoost: Math.max(0, Math.min(40, Number(parsed.aiScoreBoost) || 0)),
    buyerClassification: parsed.buyerClassification ?? "medium_potential",
    confidence: parsed.confidence ?? "low",
    analysisSummary: parsed.analysisSummary ?? "",
    ceoName: parsed.ceoName ?? "Unknown",
    ceoTitle: parsed.ceoTitle ?? "Unknown",
    ceoLinkedin: parsed.ceoLinkedin ?? "Unknown",
    headquarters: parsed.headquarters ?? "Unknown",
    foundedYear: parsed.foundedYear ?? "Unknown",
    estimatedMarketValue: parsed.estimatedMarketValue ?? "Unknown",
    fundingStage: parsed.fundingStage ?? "Unknown",
    keyCompetitors: Array.isArray(parsed.keyCompetitors) ? parsed.keyCompetitors : [],
    recentAchievements: Array.isArray(parsed.recentAchievements) ? parsed.recentAchievements : [],
    linkedinUrl: finalLinkedinUrl,
    twitterHandle: finalTwitterHandle,
    facebookUrl: finalFacebookUrl,
    instagramHandle: finalInstagramHandle,
    youtubeUrl: finalYoutubeUrl,
    blogUrl: finalBlogUrl,
    bestContactName: parsed.bestContactName ?? "Unknown",
    bestContactTitle: parsed.bestContactTitle ?? "Unknown",
    bestContactEmail: parsed.bestContactEmail ?? "Unknown",
    emailPattern: parsed.emailPattern ?? "Unknown",
  };

  const ruleScore = computeLeadScore({
    email: lead.email,
    phone: lead.phone,
    company: lead.company,
    title: lead.title,
    industry: lead.industry,
    description: lead.description,
    source: lead.source,
    status: lead.status,
    employees: lead.employees,
    annualRevenue: lead.annualRevenue,
  }).total;

  let newScore: number;
  if (lead.status === "converted") {
    newScore = 100;
  } else if (lead.status === "unqualified") {
    newScore = Math.min(30, ruleScore);
  } else {
    newScore = Math.min(100, Math.max(0, ruleScore + insights.aiScoreBoost));
  }

  const upsertValues = {
    leadId,
    companySize: insights.companySize,
    industrySegment: insights.industrySegment,
    productSummary: insights.productSummary,
    recentNews: insights.recentNews,
    hiringTrend: insights.hiringTrend,
    techStack: insights.techStack,
    socialPresence: insights.socialPresence,
    sentiment: insights.sentiment,
    growthIndicators: insights.growthIndicators,
    buyingIntentSignals: insights.buyingIntentSignals,
    aiScoreBoost: insights.aiScoreBoost,
    buyerClassification: insights.buyerClassification,
    confidence: insights.confidence,
    rawInsights: parsed as Record<string, unknown>,
    analysisSummary: insights.analysisSummary,
    ceoName: insights.ceoName,
    ceoTitle: insights.ceoTitle,
    ceoLinkedin: insights.ceoLinkedin,
    headquarters: insights.headquarters,
    foundedYear: insights.foundedYear,
    estimatedMarketValue: insights.estimatedMarketValue,
    fundingStage: insights.fundingStage,
    keyCompetitors: insights.keyCompetitors,
    recentAchievements: insights.recentAchievements,
    linkedinUrl: insights.linkedinUrl,
    twitterHandle: insights.twitterHandle,
    facebookUrl: insights.facebookUrl,
    instagramHandle: insights.instagramHandle,
    youtubeUrl: insights.youtubeUrl,
    blogUrl: insights.blogUrl,
    bestContactName: insights.bestContactName,
    bestContactTitle: insights.bestContactTitle,
    bestContactEmail: insights.bestContactEmail,
    emailPattern: insights.emailPattern,
  };

  await db.insert(leadInsightsTable).values(upsertValues).onConflictDoUpdate({
    target: leadInsightsTable.leadId,
    set: { ...upsertValues, createdAt: new Date() },
  });

  await db.update(leadsTable).set({
    score: newScore,
    buyerClassification: insights.buyerClassification,
    insightsGeneratedAt: new Date(),
    updatedAt: new Date(),
  }).where(eq(leadsTable.id, leadId));

  return { insights, newScore };
}
