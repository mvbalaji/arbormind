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
}

function buildAnalysisPrompt(lead: LeadForAnalysis): string {
  const domain = lead.email?.includes("@") ? lead.email.split("@")[1] : null;
  const lines: string[] = [
    "You are a B2B sales intelligence analyst. Analyse the following lead and return a JSON object with customer insights.",
    "",
    "LEAD DATA:",
    `Name: ${lead.firstName} ${lead.lastName}`,
    lead.title ? `Title: ${lead.title}` : "",
    lead.company ? `Company: ${lead.company}` : "",
    domain ? `Company domain (email): ${domain}` : "",
    lead.industry ? `Industry: ${lead.industry}` : "",
    lead.employees ? `Employees (self-reported): ${lead.employees}` : "",
    lead.annualRevenue ? `Annual revenue (self-reported): $${Number(lead.annualRevenue).toLocaleString()}` : "",
    lead.description ? `Description / notes: ${lead.description}` : "",
    lead.source ? `Lead source: ${lead.source}` : "",
    "",
    "Return ONLY valid JSON with this exact schema (no markdown, no commentary):",
    `{
  "companySize": "string — e.g. 'SMB (11-50)', 'Mid-market (51-500)', 'Enterprise (500+)', 'Solo/freelancer', 'Unknown'",
  "industrySegment": "string — specific sub-industry or market segment",
  "productSummary": "string — what the company likely sells or does (1-2 sentences)",
  "recentNews": "string — plausible recent news based on domain/industry (or 'No public signals detected')",
  "hiringTrend": "growing | stable | declining | unknown",
  "techStack": "string — likely tech stack or tools used (or 'Unknown')",
  "socialPresence": "strong | moderate | minimal | unknown",
  "sentiment": "positive | neutral | negative",
  "growthIndicators": ["array", "of", "2-4", "specific", "growth", "signals"],
  "buyingIntentSignals": ["array", "of", "2-4", "specific", "buying", "intent", "signals"],
  "aiScoreBoost": "integer 0-40 — additional score points based on AI analysis (0=low potential, 40=very high)",
  "buyerClassification": "high_potential | medium_potential | low_potential",
  "confidence": "high | medium | low",
  "analysisSummary": "2-3 sentence executive summary of the lead's potential"
}`,
    "",
    "Classification guidance:",
    "- high_potential: Clear buying signals, senior decision-maker, growing company, industry fit, aiScoreBoost 25-40",
    "- medium_potential: Some signals, unclear intent or fit, aiScoreBoost 10-24",
    "- low_potential: Weak signals, poor fit, or very limited info, aiScoreBoost 0-9",
  ].filter(Boolean);

  return lines.join("\n");
}

export async function analyzeLeadWithAI(leadId: number): Promise<{ insights: LeadInsightResult; newScore: number }> {
  // Fetch lead
  const [lead] = await db.select().from(leadsTable).where(eq(leadsTable.id, leadId));
  if (!lead) throw new Error("Lead not found");

  // Dynamic import of OpenAI client
  const { openai } = await import("@workspace/integrations-openai-ai-server");

  const prompt = buildAnalysisPrompt(lead);

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
    max_tokens: 800,
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
    recentNews: parsed.recentNews ?? "No public signals detected",
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
  };

  // Compute new blended score: rule-based + AI boost
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

  // If status forces a score, respect it; otherwise blend
  let newScore: number;
  if (lead.status === "converted") {
    newScore = 100;
  } else if (lead.status === "unqualified") {
    newScore = Math.min(30, ruleScore);
  } else {
    // Rule score is out of 100, AI boost is up to 40 extra points
    // We scale: new total = min(100, ruleScore + aiScoreBoost)
    newScore = Math.min(100, Math.max(0, ruleScore + insights.aiScoreBoost));
  }

  // Upsert insights
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
      createdAt: new Date(),
    },
  });

  // Update lead score + classification + timestamp
  await db.update(leadsTable).set({
    score: newScore,
    buyerClassification: insights.buyerClassification,
    insightsGeneratedAt: new Date(),
    updatedAt: new Date(),
  }).where(eq(leadsTable.id, leadId));

  return { insights, newScore };
}
