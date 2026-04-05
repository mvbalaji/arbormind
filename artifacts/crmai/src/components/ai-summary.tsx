import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Zap, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface AISummaryProps {
  entityType: "lead" | "contact" | "account" | "opportunity" | "campaign";
  entityData: Record<string, unknown>;
  isLoading?: boolean;
}

function generateSummary(entityType: AISummaryProps["entityType"], data: Record<string, unknown>): { summary: string; bullets: string[] } {
  if (entityType === "lead") {
    const name = `${data.firstName ?? ""} ${data.lastName ?? ""}`.trim() || "This lead";
    const score = data.score as number | null;
    const status = data.status as string ?? "new";
    const company = data.company as string | null;
    const source = data.source as string | null;
    const scoreText = score != null ? (score >= 70 ? "high-potential" : score >= 40 ? "moderate-potential" : "low-priority") : "unscored";
    return {
      summary: `${name} is a ${scoreText} lead${company ? ` from ${company}` : ""} currently in the "${status}" stage${source ? ` captured via ${source}` : ""}. ${score && score >= 70 ? "Recommend immediate outreach given the high lead score." : score && score >= 40 ? "Schedule a qualification call to assess fit." : "Consider nurturing via email campaign before direct outreach."}`,
      bullets: [
        score != null ? `Lead score: ${score}/100 — ${score >= 70 ? "Prioritize now" : score >= 40 ? "Warm prospect" : "Needs nurturing"}` : "Score not yet calculated",
        status === "new" ? "Action: First contact not yet made — reach out within 24h for best conversion rate" :
        status === "contacted" ? "Action: Follow up on initial contact and qualify budget/authority/need" :
        status === "qualified" ? "Action: Move to proposal stage — prospect has demonstrated intent" :
        status === "converted" ? "Converted to opportunity — track deal progress in pipeline" :
        "Review qualification criteria before further investment",
        company ? `Company (${company}) may have additional contacts worth engaging` : "No company association — consider identifying their employer",
        source ? `Sourced from ${source} — use channel-specific follow-up messaging` : "Source unknown — ask during initial outreach for attribution",
      ],
    };
  }

  if (entityType === "contact") {
    const name = `${data.firstName ?? ""} ${data.lastName ?? ""}`.trim() || "This contact";
    const title = data.title as string | null;
    const account = data.accountName as string | null;
    return {
      summary: `${name}${title ? ` (${title})` : ""}${account ? ` at ${account}` : ""} is an active contact in your CRM. ${title?.toLowerCase().includes("ceo") || title?.toLowerCase().includes("director") || title?.toLowerCase().includes("vp") ? "As a senior decision-maker, they should be engaged at the executive level." : "Coordinate with their account team to ensure consistent messaging."}`,
      bullets: [
        title ? `Role: ${title} — ${title.toLowerCase().includes("ceo") || title.toLowerCase().includes("director") ? "Decision maker — engage directly on strategic value" : "Influencer — align with their technical/business needs"}` : "Title not captured — clarify role during next interaction",
        account ? `Account: ${account} — review account health before any outreach` : "Not linked to an account — consider adding company association",
        "Review recent activities to understand engagement history before next contact",
        "Check open opportunities tied to this contact for cross-sell context",
      ],
    };
  }

  if (entityType === "account") {
    const name = data.name as string ?? "This account";
    const industry = data.industry as string | null;
    const revenue = data.annualRevenue as number | null;
    const employees = data.employees as number | null;
    const contactCount = data.contactCount as number ?? 0;
    const dealCount = data.dealCount as number ?? 0;
    return {
      summary: `${name}${industry ? ` operates in the ${industry} industry` : ""}${revenue ? ` with $${(revenue / 1000000).toFixed(1)}M in annual revenue` : ""}. ${dealCount > 0 ? `There are ${dealCount} active opportunities worth tracking.` : "No open opportunities — consider initiating a new conversation."} ${contactCount > 1 ? `Multiple contacts (${contactCount}) — map the buying committee to accelerate decisions.` : ""}`,
      bullets: [
        revenue ? `Revenue tier: $${(revenue / 1000000).toFixed(1)}M — ${revenue > 50000000 ? "Enterprise — assign dedicated AE" : revenue > 5000000 ? "Mid-market — standard sales process" : "SMB — consider high-velocity approach"}` : "Revenue data not captured — ask during discovery",
        employees ? `Company size: ${employees} employees — ${employees > 1000 ? "Enterprise processes, longer sales cycles" : employees > 100 ? "Mid-size, department-level buying" : "Smaller team, founder-led decisions likely"}` : "Employee count unknown",
        dealCount > 0 ? `${dealCount} open deal(s) — review pipeline health and stage distribution` : "No open deals — initiate outreach to explore new opportunities",
        contactCount > 0 ? `${contactCount} contact(s) on record — ensure coverage across functions (Econ buyer, Champion, Technical)` : "No contacts mapped — add key stakeholders",
      ],
    };
  }

  if (entityType === "opportunity") {
    const name = data.name as string ?? "This opportunity";
    const stage = data.stage as string ?? "prospecting";
    const amount = data.amount as number | null;
    const probability = data.probability as number | null;
    const closeDate = data.closeDate as string | null;
    const daysToClose = closeDate ? Math.ceil((new Date(closeDate).getTime() - Date.now()) / 86400000) : null;
    return {
      summary: `${name} is currently in the "${stage.replace("_", " ")}" stage${amount ? ` with a deal value of $${amount.toLocaleString()}` : ""}${probability != null ? ` and ${probability}% win probability` : ""}. ${daysToClose != null ? daysToClose > 0 ? `${daysToClose} days until target close.` : "This deal is past its close date — requires immediate action." : ""} ${stage === "negotiation" ? "Deal is in final stages — focus on removing blockers and driving to signature." : stage === "proposal" ? "Proposal sent — follow up within 48h to address questions and maintain momentum." : stage === "qualification" ? "Qualification stage — confirm budget, authority, need, and timeline (BANT)." : "Early stage — focus on discovery and establishing value."}`,
      bullets: [
        amount ? `Deal value: $${amount.toLocaleString()} — ${amount > 100000 ? "Strategic deal, involve leadership" : amount > 10000 ? "Mid-value — standard approval path" : "Transactional — optimize for speed"}` : "Amount not set — quantify value during next call",
        probability != null ? `Win probability: ${probability}% — ${probability >= 70 ? "High confidence, prepare contract" : probability >= 40 ? "Competitive situation, differentiate strongly" : "Low confidence — re-qualify or reassign"}` : "Probability not assessed",
        daysToClose != null ? daysToClose > 30 ? "Close date is over a month away — maintain weekly touchpoints" : daysToClose > 0 ? `Closing in ${daysToClose} days — escalate if missing milestones` : "Past close date — get updated commitment or reassess" : "No close date set — agree on timeline with prospect",
        "Review related activities for last contact date — deals go cold after 2+ weeks of silence",
      ],
    };
  }

  if (entityType === "campaign") {
    const name = data.name as string ?? "This campaign";
    const type = data.type as string ?? "";
    const status = data.status as string ?? "planning";
    const budget = data.budget as number | null;
    const expectedRevenue = data.expectedRevenue as number | null;
    const roi = budget && expectedRevenue ? ((expectedRevenue - budget) / budget * 100).toFixed(0) : null;
    return {
      summary: `${name} is a ${type} campaign currently in "${status}" status${budget ? ` with a budget of $${budget.toLocaleString()}` : ""}${expectedRevenue ? ` targeting $${expectedRevenue.toLocaleString()} in revenue` : ""}. ${roi ? `Projected ROI: ${roi}%.` : ""} ${status === "active" ? "Campaign is live — monitor engagement metrics and adjust targeting as needed." : status === "planning" ? "Campaign in planning — finalize targeting, messaging, and launch timeline." : status === "completed" ? "Campaign complete — analyze results and extract learnings for future campaigns." : ""}`,
      bullets: [
        budget ? `Budget: $${budget.toLocaleString()} — track spend rate weekly to avoid overrun` : "Budget not set — define before launch",
        expectedRevenue ? `Revenue target: $${expectedRevenue.toLocaleString()}${roi ? ` (${roi}% projected ROI)` : ""}` : "Revenue target not defined — set KPIs before launch",
        status === "active" ? "Monitor click-through rates, lead capture, and pipeline generated from this campaign" : "Define success metrics (leads, MQLs, pipeline) to measure campaign effectiveness",
        "Associate generated leads back to this campaign for accurate attribution reporting",
      ],
    };
  }

  return { summary: "AI summary not available.", bullets: [] };
}

export function AISummary({ entityType, entityData, isLoading }: AISummaryProps) {
  const [expanded, setExpanded] = useState(false);

  if (isLoading) {
    return (
      <Card className="glass-panel border-primary/20 bg-primary/5">
        <CardContent className="p-4 space-y-2">
          <Skeleton className="h-4 w-24 bg-muted" />
          <Skeleton className="h-3 w-full bg-muted" />
          <Skeleton className="h-3 w-4/5 bg-muted" />
        </CardContent>
      </Card>
    );
  }

  const { summary, bullets } = generateSummary(entityType, entityData);

  return (
    <Card className="glass-panel border-primary/20 bg-primary/5">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-primary">AI Summary</span>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-muted-foreground hover:text-white transition-colors"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">{summary}</p>
        {expanded && bullets.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {bullets.map((b, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-primary/60 mt-1.5 shrink-0" />
                {b}
              </li>
            ))}
          </ul>
        )}
        {!expanded && (
          <button onClick={() => setExpanded(true)} className="text-xs text-primary/70 hover:text-primary mt-1.5 transition-colors">
            Show recommendations ↓
          </button>
        )}
      </CardContent>
    </Card>
  );
}
