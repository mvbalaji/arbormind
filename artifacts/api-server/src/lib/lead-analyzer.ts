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
}

function buildAnalysisPrompt(lead: LeadForAnalysis): string {
  const domain = lead.email?.includes("@") ? lead.email.split("@")[1] : null;
  const websiteDomain = lead.website ? lead.website.replace(/^https?:\/\//, "").split("/")[0] : null;
  const effectiveDomain = websiteDomain ?? domain;

  const lines: string[] = [
    "You are a senior B2B sales intelligence analyst with access to public knowledge about companies worldwide.",
    "Analyse the following lead using your knowledge of the company, its leadership, market position, and public signals.",
    "Be specific — use real data you know about the company rather than generic placeholders.",
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
  "recentAchievements": ["2-4 notable recent milestones, awards, partnerships, or product launches"]
}`,
    "",
    "IMPORTANT GUIDANCE:",
    "- If the company is well-known (e.g. Infosys, Zoho, Salesforce, Stripe), use your training knowledge to provide accurate details.",
    "- For CEO/leadership: search your knowledge — many company founders and executives are publicly documented.",
    "- For market value: use funding rounds, ARR estimates, or public market cap if known.",
    "- For headquarters: use the company's known registered address or primary office.",
    "- NEVER leave a field as empty string — use 'Unknown' as fallback.",
    "- Buyer classification guidance:",
    "  · high_potential: senior decision-maker at growing company, clear fit, aiScoreBoost 25-40",
    "  · medium_potential: some signals or unclear fit, aiScoreBoost 10-24",
    "  · low_potential: weak signals, poor fit, or very limited company info, aiScoreBoost 0-9",
  ].filter(Boolean);

  return lines.join("\n");
}

export async function analyzeLeadWithAI(leadId: number): Promise<{ insights: LeadInsightResult; newScore: number }> {
  const [lead] = await db.select().from(leadsTable).where(eq(leadsTable.id, leadId));
  if (!lead) throw new Error("Lead not found");

  const { openai } = await import("@workspace/integrations-openai-ai-server");

  const prompt = buildAnalysisPrompt(lead as LeadForAnalysis);

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.2,
    max_tokens: 1400,
    response_format: { type: "json_object" },
  });

  const rawText = completion.choices[0]?.message?.content ?? "{}";
  let parsed: Partial<LeadInsightResult>;
  try {
    parsed = JSON.parse(rawText) as Partial<LeadInsightResult>;
  } catch {
    parsed = {};
  }

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

  await db.insert(leadInsightsTable).values({
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
  }).onConflictDoUpdate({
    target: leadInsightsTable.leadId,
    set: {
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
      createdAt: new Date(),
    },
  });

  await db.update(leadsTable).set({
    score: newScore,
    buyerClassification: insights.buyerClassification,
    insightsGeneratedAt: new Date(),
    updatedAt: new Date(),
  }).where(eq(leadsTable.id, leadId));

  return { insights, newScore };
}
