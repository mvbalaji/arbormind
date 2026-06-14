import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import {
  Brain, TrendingUp, TrendingDown, Minus, RefreshCw, Sparkles,
  Building2, Globe, Users, Smile, Frown, Meh, Zap, Target,
  ChevronRight, AlertTriangle, CheckCircle2, ArrowRightLeft,
} from "lucide-react";

interface LeadInsights {
  id: number;
  leadId: number;
  companySize: string | null;
  industrySegment: string | null;
  productSummary: string | null;
  recentNews: string | null;
  hiringTrend: string | null;
  techStack: string | null;
  socialPresence: string | null;
  sentiment: string | null;
  growthIndicators: string[] | null;
  buyingIntentSignals: string[] | null;
  aiScoreBoost: number;
  buyerClassification: string;
  confidence: string;
  analysisSummary: string | null;
  createdAt: string;
}

interface LeadInsightsPanelProps {
  leadId: number;
  currentScore: number | null;
  buyerClassification: string | null;
  insightsGeneratedAt: string | null;
  onConvertClick?: () => void;
  isConverted?: boolean;
}

const BUYER_CLASS_META = {
  high_potential: {
    label: "High Potential Buyer",
    color: "bg-green-50 text-green-700 border-green-300 dark:bg-green-950/50 dark:text-green-300 dark:border-green-700",
    dot: "bg-green-500",
    icon: TrendingUp,
  },
  medium_potential: {
    label: "Medium Potential Buyer",
    color: "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-700",
    dot: "bg-amber-500",
    icon: Minus,
  },
  low_potential: {
    label: "Low Potential Buyer",
    color: "bg-gray-50 text-gray-600 border-gray-300 dark:bg-gray-900 dark:text-gray-400 dark:border-gray-700",
    dot: "bg-gray-400",
    icon: TrendingDown,
  },
};

const SCORE_META = (score: number) => {
  if (score >= 70) return { label: "Hot Lead", color: "text-red-600", bar: "bg-red-500", bg: "bg-red-50 dark:bg-red-950/40" };
  if (score >= 40) return { label: "Warm Lead", color: "text-amber-600", bar: "bg-amber-500", bg: "bg-amber-50 dark:bg-amber-950/40" };
  return { label: "Cold Lead", color: "text-blue-600", bar: "bg-blue-400", bg: "bg-blue-50 dark:bg-blue-950/40" };
};

function HiringTrendIcon({ trend }: { trend: string | null }) {
  if (trend === "growing") return <TrendingUp className="w-3.5 h-3.5 text-green-500" />;
  if (trend === "declining") return <TrendingDown className="w-3.5 h-3.5 text-red-500" />;
  return <Minus className="w-3.5 h-3.5 text-muted-foreground" />;
}

function SentimentIcon({ sentiment }: { sentiment: string | null }) {
  if (sentiment === "positive") return <Smile className="w-3.5 h-3.5 text-green-500" />;
  if (sentiment === "negative") return <Frown className="w-3.5 h-3.5 text-red-500" />;
  return <Meh className="w-3.5 h-3.5 text-muted-foreground" />;
}

export function LeadInsightsPanel({
  leadId, currentScore, buyerClassification, insightsGeneratedAt, onConvertClick, isConverted,
}: LeadInsightsPanelProps) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [analyzing, setAnalyzing] = useState(false);

  const score = currentScore ?? 0;
  const scoreMeta = SCORE_META(score);
  const classMeta = BUYER_CLASS_META[buyerClassification as keyof typeof BUYER_CLASS_META];

  const { data: insightsData, isLoading: insightsLoading } = useQuery<{ insights: LeadInsights | null }>({
    queryKey: ["lead-insights", leadId],
    queryFn: async () => {
      const r = await fetch(`/api/leads/${leadId}/insights`, { credentials: "include" });
      return r.json() as Promise<{ insights: LeadInsights | null }>;
    },
    enabled: !!leadId,
  });

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/leads/${leadId}/analyze`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({})) as { error?: string };
        throw new Error(e.error ?? "Analysis failed");
      }
      return r.json();
    },
    onMutate: () => setAnalyzing(true),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["lead-insights", leadId] });
      void qc.invalidateQueries({ queryKey: ["lead", String(leadId)] });
      toast({ title: "AI Analysis complete", description: "Customer insights have been updated." });
    },
    onError: (err: Error) => {
      toast({ title: "Analysis failed", description: err.message, variant: "destructive" });
    },
    onSettled: () => setAnalyzing(false),
  });

  const insights = insightsData?.insights ?? null;
  const hasInsights = !!insights;
  const isHotLead = score >= 70 && !isConverted;

  return (
    <div className="bg-card border border-border rounded-md shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-muted/30 border-b border-border">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold text-foreground uppercase tracking-wide">
            AI Customer Insights
          </span>
          {hasInsights && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/30 text-primary">
              <Sparkles className="w-2.5 h-2.5 mr-0.5" />
              AI Enhanced
            </Badge>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-6 text-xs gap-1 px-2"
          onClick={() => analyzeMutation.mutate()}
          disabled={analyzing}
        >
          {analyzing ? (
            <RefreshCw className="w-3 h-3 animate-spin" />
          ) : (
            <Brain className="w-3 h-3" />
          )}
          {analyzing ? "Analysing…" : hasInsights ? "Re-analyse" : "Analyse with AI"}
        </Button>
      </div>

      <div className="p-4 space-y-4">
        {/* Score + Classification Row */}
        <div className="grid grid-cols-2 gap-3">
          {/* Lead Score */}
          <div className={cn("rounded-xl p-3 border border-border", scoreMeta.bg)}>
            <div className="text-xs text-muted-foreground mb-1.5 font-medium">Lead Score</div>
            <div className="flex items-baseline gap-1.5 mb-2">
              <span className={cn("text-2xl font-bold", scoreMeta.color)}>{score}</span>
              <span className="text-xs text-muted-foreground">/100</span>
              <span className={cn("ml-auto text-xs font-semibold px-2 py-0.5 rounded-full", scoreMeta.color, scoreMeta.bg, "border border-current/20")}>
                {scoreMeta.label}
              </span>
            </div>
            <div className="h-1.5 bg-border/50 rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all duration-500", scoreMeta.bar)}
                style={{ width: `${score}%` }}
              />
            </div>
            {hasInsights && insights.aiScoreBoost > 0 && (
              <div className="mt-1.5 text-[10px] text-muted-foreground flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5 text-primary" />
                +{insights.aiScoreBoost} pts from AI analysis
              </div>
            )}
          </div>

          {/* Buyer Classification */}
          <div className="rounded-xl p-3 border border-border bg-muted/20">
            <div className="text-xs text-muted-foreground mb-1.5 font-medium">Buyer Classification</div>
            {classMeta ? (
              <div className={cn("inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs font-semibold", classMeta.color)}>
                <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", classMeta.dot)} />
                {classMeta.label}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground italic">Run AI analysis to classify</div>
            )}
            {hasInsights && (
              <div className="mt-1.5 text-[10px] text-muted-foreground">
                Confidence: <span className="capitalize font-medium">{insights.confidence}</span>
              </div>
            )}
          </div>
        </div>

        {/* Hot Lead Convert Banner */}
        {isHotLead && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30 border border-red-200 dark:border-red-800">
            <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/50 flex items-center justify-center flex-shrink-0">
              <Zap className="w-4 h-4 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-red-700 dark:text-red-300">High-value lead detected</div>
              <div className="text-[10px] text-red-600/80 dark:text-red-400/80">Score ≥ 70 — recommend converting to Opportunity</div>
            </div>
            {onConvertClick && (
              <Button
                size="sm"
                className="h-7 text-xs gap-1 bg-red-600 hover:bg-red-700 text-white flex-shrink-0"
                onClick={onConvertClick}
              >
                <ArrowRightLeft className="w-3 h-3" />
                Convert
              </Button>
            )}
          </div>
        )}

        {/* Insights Loading */}
        {insightsLoading && (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-8 bg-muted/40 rounded-lg animate-pulse" style={{ animationDelay: `${i * 0.1}s` }} />
            ))}
          </div>
        )}

        {/* No Insights Yet */}
        {!insightsLoading && !hasInsights && (
          <div className="py-6 text-center">
            <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
              <Brain className="w-6 h-6 text-muted-foreground/50" />
            </div>
            <p className="text-sm font-medium text-muted-foreground mb-1">No AI insights yet</p>
            <p className="text-xs text-muted-foreground/70">
              Click "Analyse with AI" to automatically extract company insights and improve the lead score.
            </p>
          </div>
        )}

        {/* Insights Content */}
        {hasInsights && insights && (
          <div className="space-y-3">
            {/* Analysis Summary */}
            {insights.analysisSummary && (
              <div className="p-3 rounded-xl bg-primary/5 border border-primary/20">
                <div className="flex items-start gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-foreground leading-relaxed">{insights.analysisSummary}</p>
                </div>
              </div>
            )}

            {/* Company Profile */}
            <div>
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Company Profile
              </div>
              <div className="grid grid-cols-2 gap-2">
                {insights.companySize && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border">
                    <Building2 className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    <div>
                      <div className="text-[10px] text-muted-foreground">Size</div>
                      <div className="text-xs font-medium text-foreground">{insights.companySize}</div>
                    </div>
                  </div>
                )}
                {insights.industrySegment && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border">
                    <Target className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    <div>
                      <div className="text-[10px] text-muted-foreground">Segment</div>
                      <div className="text-xs font-medium text-foreground truncate">{insights.industrySegment}</div>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border">
                  <HiringTrendIcon trend={insights.hiringTrend} />
                  <div>
                    <div className="text-[10px] text-muted-foreground">Hiring Trend</div>
                    <div className="text-xs font-medium text-foreground capitalize">{insights.hiringTrend ?? "Unknown"}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border">
                  <SentimentIcon sentiment={insights.sentiment} />
                  <div>
                    <div className="text-[10px] text-muted-foreground">Sentiment</div>
                    <div className="text-xs font-medium text-foreground capitalize">{insights.sentiment ?? "Neutral"}</div>
                  </div>
                </div>
                {insights.socialPresence && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border">
                    <Globe className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    <div>
                      <div className="text-[10px] text-muted-foreground">Social Presence</div>
                      <div className="text-xs font-medium text-foreground capitalize">{insights.socialPresence}</div>
                    </div>
                  </div>
                )}
                {insights.techStack && insights.techStack !== "Unknown" && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border">
                    <Zap className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    <div>
                      <div className="text-[10px] text-muted-foreground">Tech Stack</div>
                      <div className="text-xs font-medium text-foreground truncate">{insights.techStack}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Product Summary */}
            {insights.productSummary && (
              <div>
                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  What They Do
                </div>
                <p className="text-xs text-foreground leading-relaxed bg-muted/30 rounded-lg p-2.5 border border-border">
                  {insights.productSummary}
                </p>
              </div>
            )}

            {/* Recent News */}
            {insights.recentNews && insights.recentNews !== "No public signals detected" && (
              <div>
                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Recent Signals
                </div>
                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/30 border border-border">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-foreground leading-relaxed">{insights.recentNews}</p>
                </div>
              </div>
            )}

            {/* Growth Indicators */}
            {insights.growthIndicators && insights.growthIndicators.length > 0 && (
              <div>
                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Growth Indicators
                </div>
                <ul className="space-y-1">
                  {insights.growthIndicators.map((gi, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs text-foreground">
                      <CheckCircle2 className="w-3 h-3 text-green-500 flex-shrink-0" />
                      {gi}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Buying Intent Signals */}
            {insights.buyingIntentSignals && insights.buyingIntentSignals.length > 0 && (
              <div>
                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Buying Intent Signals
                </div>
                <ul className="space-y-1">
                  {insights.buyingIntentSignals.map((sig, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs text-foreground">
                      <ChevronRight className="w-3 h-3 text-primary flex-shrink-0" />
                      {sig}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Footer timestamp */}
            <div className="pt-1 border-t border-border text-[10px] text-muted-foreground flex items-center gap-1">
              <Brain className="w-2.5 h-2.5" />
              Last analysed {formatDistanceToNow(new Date(insights.createdAt), { addSuffix: true })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
