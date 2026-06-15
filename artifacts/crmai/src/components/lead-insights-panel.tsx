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
  MapPin, Calendar, DollarSign, Trophy, User, ExternalLink,
  Swords, Twitter, Youtube, Facebook, Instagram, Linkedin,
  Mail, Search, Copy, Check,
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
  // Leadership
  ceoName: string | null;
  ceoTitle: string | null;
  ceoLinkedin: string | null;
  // Market intelligence
  headquarters: string | null;
  foundedYear: string | null;
  estimatedMarketValue: string | null;
  fundingStage: string | null;
  keyCompetitors: string[] | null;
  recentAchievements: string[] | null;
  // Social media
  linkedinUrl: string | null;
  twitterHandle: string | null;
  facebookUrl: string | null;
  instagramHandle: string | null;
  youtubeUrl: string | null;
  // Best contact
  bestContactName: string | null;
  bestContactTitle: string | null;
  bestContactEmail: string | null;
  emailPattern: string | null;
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

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
      {children}
    </div>
  );
}

function InfoChip({ icon: Icon, label, value, href }: {
  icon: React.ElementType;
  label: string;
  value: string;
  href?: string;
}) {
  return (
    <div className="flex items-start gap-2 p-2 rounded-lg bg-muted/30 border border-border">
      <Icon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
      <div className="min-w-0">
        <div className="text-[10px] text-muted-foreground">{label}</div>
        {href && href !== "Unknown" ? (
          <a href={href} target="_blank" rel="noopener noreferrer"
            className="text-xs font-medium text-blue-500 hover:underline flex items-center gap-0.5 truncate">
            {value}
            <ExternalLink className="w-2.5 h-2.5 flex-shrink-0" />
          </a>
        ) : (
          <div className="text-xs font-medium text-foreground truncate">{value}</div>
        )}
      </div>
    </div>
  );
}

interface HunterEmail {
  value: string;
  first_name: string;
  last_name: string;
  position: string;
  confidence: number;
  linkedin_url?: string;
}

interface HunterResult {
  domain: string;
  organization: string | null;
  pattern: string | null;
  emails: HunterEmail[];
}

export function LeadInsightsPanel({
  leadId, currentScore, buyerClassification, insightsGeneratedAt, onConvertClick, isConverted,
}: LeadInsightsPanelProps) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [analyzing, setAnalyzing] = useState(false);
  const [hunterResult, setHunterResult] = useState<HunterResult | null>(null);
  const [hunterLooking, setHunterLooking] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

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

  const handleHunterLookup = async () => {
    setHunterLooking(true);
    setHunterResult(null);
    try {
      const r = await fetch(`/api/leads/${leadId}/hunter`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      const data = await r.json() as HunterResult & { error?: string };
      if (!r.ok) throw new Error(data.error ?? "Lookup failed");
      setHunterResult(data);
      if (data.emails.length === 0) {
        toast({ title: "No contacts found", description: `Hunter.io found no email addresses for ${data.domain}.` });
      } else {
        toast({ title: `Found ${data.emails.length} contact${data.emails.length > 1 ? "s" : ""}`, description: `Real verified emails from Hunter.io for ${data.domain}.` });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Hunter.io lookup failed";
      if (msg.includes("HUNTER_API_KEY")) {
        toast({ title: "Hunter.io not configured", description: "Add your HUNTER_API_KEY to environment secrets to enable real email lookup.", variant: "destructive" });
      } else {
        toast({ title: "Lookup failed", description: msg, variant: "destructive" });
      }
    } finally {
      setHunterLooking(false);
    }
  };

  const copyEmail = (email: string) => {
    void navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

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
            {[0, 1, 2, 3].map((i) => (
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
              Click "Analyse with AI" to extract company insights, leadership details, market value, and buying intent signals.
            </p>
          </div>
        )}

        {/* Insights Content */}
        {hasInsights && insights && (
          <div className="space-y-4">

            {/* Analysis Summary */}
            {insights.analysisSummary && (
              <div className="p-3 rounded-xl bg-primary/5 border border-primary/20">
                <div className="flex items-start gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-foreground leading-relaxed">{insights.analysisSummary}</p>
                </div>
              </div>
            )}

            {/* Leadership */}
            {(insights.ceoName && insights.ceoName !== "Unknown") && (
              <div>
                <SectionLabel>Leadership</SectionLabel>
                <div className="p-3 rounded-xl border border-border bg-muted/20 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-foreground">{insights.ceoName}</div>
                    {insights.ceoTitle && insights.ceoTitle !== "Unknown" && (
                      <div className="text-xs text-muted-foreground">{insights.ceoTitle}</div>
                    )}
                    {insights.ceoLinkedin && insights.ceoLinkedin !== "Unknown" && (
                      <a
                        href={insights.ceoLinkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 mt-1 text-[10px] text-blue-500 hover:underline"
                      >
                        <Globe className="w-2.5 h-2.5" />
                        LinkedIn Profile
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Best Contact to Reach */}
            {insights.bestContactName && insights.bestContactName !== "Unknown" && (
              <div>
                <SectionLabel>Best Contact to Reach</SectionLabel>
                <div className="p-3 rounded-xl border border-border bg-muted/20 space-y-2.5">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center flex-shrink-0">
                      <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-foreground">{insights.bestContactName}</div>
                      {insights.bestContactTitle && insights.bestContactTitle !== "Unknown" && (
                        <div className="text-xs text-muted-foreground">{insights.bestContactTitle}</div>
                      )}
                    </div>
                  </div>

                  {insights.bestContactEmail && insights.bestContactEmail !== "Unknown" && (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-background border border-border">
                      <Mail className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] text-muted-foreground mb-0.5">AI-inferred email</div>
                        <div className="text-xs font-mono text-foreground truncate">{insights.bestContactEmail}</div>
                      </div>
                      <button
                        onClick={() => copyEmail(insights.bestContactEmail!)}
                        className="flex-shrink-0 p-1 rounded hover:bg-muted transition-colors"
                        title="Copy email"
                      >
                        {copiedEmail === insights.bestContactEmail
                          ? <Check className="w-3.5 h-3.5 text-green-500" />
                          : <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                        }
                      </button>
                    </div>
                  )}

                  {insights.emailPattern && insights.emailPattern !== "Unknown" && (
                    <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <span className="font-medium">Email pattern:</span>
                      <code className="bg-muted px-1 py-0.5 rounded">{insights.emailPattern}</code>
                    </div>
                  )}

                  <div className="pt-1 border-t border-border">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-[10px] text-muted-foreground font-medium">Verified contacts via Hunter.io</div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 text-xs gap-1 px-2"
                        onClick={() => { void handleHunterLookup(); }}
                        disabled={hunterLooking}
                      >
                        {hunterLooking
                          ? <RefreshCw className="w-3 h-3 animate-spin" />
                          : <Search className="w-3 h-3" />
                        }
                        {hunterLooking ? "Looking up…" : "Lookup Real Emails"}
                      </Button>
                    </div>

                    {hunterResult && (
                      <div className="space-y-1.5">
                        {hunterResult.pattern && (
                          <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <span className="font-medium">Confirmed pattern:</span>
                            <code className="bg-muted px-1 py-0.5 rounded">{hunterResult.pattern}</code>
                          </div>
                        )}
                        {hunterResult.emails.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic">No public contacts found for this domain.</p>
                        ) : (
                          hunterResult.emails.map((em, i) => (
                            <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
                              <Mail className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-semibold text-foreground truncate">
                                  {em.first_name} {em.last_name}
                                  {em.position && <span className="font-normal text-muted-foreground ml-1">· {em.position}</span>}
                                </div>
                                <div className="text-xs font-mono text-emerald-700 dark:text-emerald-400 truncate">{em.value}</div>
                                <div className="text-[10px] text-muted-foreground">{em.confidence}% confidence</div>
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                {em.linkedin_url && (
                                  <a href={em.linkedin_url} target="_blank" rel="noopener noreferrer"
                                    className="p-1 rounded hover:bg-muted transition-colors">
                                    <Linkedin className="w-3 h-3 text-[#0077B5]" />
                                  </a>
                                )}
                                <button
                                  onClick={() => copyEmail(em.value)}
                                  className="p-1 rounded hover:bg-muted transition-colors"
                                  title="Copy email"
                                >
                                  {copiedEmail === em.value
                                    ? <Check className="w-3 h-3 text-green-500" />
                                    : <Copy className="w-3 h-3 text-muted-foreground" />
                                  }
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Company Social Media */}
            {(insights.linkedinUrl || insights.twitterHandle || insights.facebookUrl || insights.instagramHandle || insights.youtubeUrl) &&
              [insights.linkedinUrl, insights.twitterHandle, insights.facebookUrl, insights.instagramHandle, insights.youtubeUrl].some(v => v && v !== "Unknown") && (
              <div>
                <SectionLabel>Company Social Media</SectionLabel>
                <div className="flex flex-wrap gap-2">
                  {insights.linkedinUrl && insights.linkedinUrl !== "Unknown" && (
                    <a href={insights.linkedinUrl} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0077B5]/10 border border-[#0077B5]/30 text-[#0077B5] dark:text-blue-400 text-xs font-medium hover:bg-[#0077B5]/20 transition-colors">
                      <Linkedin className="w-3.5 h-3.5" />
                      LinkedIn
                    </a>
                  )}
                  {insights.twitterHandle && insights.twitterHandle !== "Unknown" && (
                    <a href={`https://x.com/${insights.twitterHandle.replace("@", "")}`} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/5 border border-black/20 text-foreground dark:bg-white/5 dark:border-white/20 text-xs font-medium hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
                      <Twitter className="w-3.5 h-3.5" />
                      {insights.twitterHandle}
                    </a>
                  )}
                  {insights.instagramHandle && insights.instagramHandle !== "Unknown" && (
                    <a href={`https://instagram.com/${insights.instagramHandle.replace("@", "")}`} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-pink-50 border border-pink-200 text-pink-600 dark:bg-pink-950/20 dark:border-pink-800 dark:text-pink-400 text-xs font-medium hover:bg-pink-100 dark:hover:bg-pink-950/40 transition-colors">
                      <Instagram className="w-3.5 h-3.5" />
                      {insights.instagramHandle}
                    </a>
                  )}
                  {insights.facebookUrl && insights.facebookUrl !== "Unknown" && (
                    <a href={insights.facebookUrl} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1877F2]/10 border border-[#1877F2]/30 text-[#1877F2] dark:text-blue-400 text-xs font-medium hover:bg-[#1877F2]/20 transition-colors">
                      <Facebook className="w-3.5 h-3.5" />
                      Facebook
                    </a>
                  )}
                  {insights.youtubeUrl && insights.youtubeUrl !== "Unknown" && (
                    <a href={insights.youtubeUrl} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 border border-red-200 text-red-600 dark:bg-red-950/20 dark:border-red-800 dark:text-red-400 text-xs font-medium hover:bg-red-100 dark:hover:bg-red-950/40 transition-colors">
                      <Youtube className="w-3.5 h-3.5" />
                      YouTube
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Market Intelligence */}
            <div>
              <SectionLabel>Market Intelligence</SectionLabel>
              <div className="grid grid-cols-2 gap-2">
                {insights.estimatedMarketValue && insights.estimatedMarketValue !== "Unknown" && (
                  <InfoChip icon={DollarSign} label="Market Value / Valuation" value={insights.estimatedMarketValue} />
                )}
                {insights.fundingStage && insights.fundingStage !== "Unknown" && (
                  <InfoChip icon={TrendingUp} label="Funding Stage" value={insights.fundingStage} />
                )}
                {insights.headquarters && insights.headquarters !== "Unknown" && (
                  <InfoChip icon={MapPin} label="Headquarters" value={insights.headquarters} />
                )}
                {insights.foundedYear && insights.foundedYear !== "Unknown" && (
                  <InfoChip icon={Calendar} label="Founded" value={insights.foundedYear} />
                )}
              </div>
            </div>

            {/* Company Profile */}
            <div>
              <SectionLabel>Company Profile</SectionLabel>
              <div className="grid grid-cols-2 gap-2">
                {insights.companySize && (
                  <InfoChip icon={Building2} label="Size" value={insights.companySize} />
                )}
                {insights.industrySegment && (
                  <InfoChip icon={Target} label="Segment" value={insights.industrySegment} />
                )}
                <InfoChip icon={TrendingUp} label="Hiring Trend" value={insights.hiringTrend ? insights.hiringTrend.charAt(0).toUpperCase() + insights.hiringTrend.slice(1) : "Unknown"} />
                <InfoChip icon={Smile} label="Sentiment" value={insights.sentiment ? insights.sentiment.charAt(0).toUpperCase() + insights.sentiment.slice(1) : "Neutral"} />
                {insights.socialPresence && (
                  <InfoChip icon={Globe} label="Social Presence" value={insights.socialPresence.charAt(0).toUpperCase() + insights.socialPresence.slice(1)} />
                )}
                {insights.techStack && insights.techStack !== "Unknown" && (
                  <InfoChip icon={Zap} label="Tech Stack" value={insights.techStack} />
                )}
              </div>
            </div>

            {/* What They Do */}
            {insights.productSummary && (
              <div>
                <SectionLabel>What They Do</SectionLabel>
                <p className="text-xs text-foreground leading-relaxed bg-muted/30 rounded-lg p-2.5 border border-border">
                  {insights.productSummary}
                </p>
              </div>
            )}

            {/* Recent News / Signals */}
            {insights.recentNews && insights.recentNews !== "No recent public signals" && insights.recentNews !== "No public signals detected" && (
              <div>
                <SectionLabel>Recent Signals</SectionLabel>
                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-foreground leading-relaxed">{insights.recentNews}</p>
                </div>
              </div>
            )}

            {/* Recent Achievements */}
            {insights.recentAchievements && insights.recentAchievements.length > 0 && (
              <div>
                <SectionLabel>Recent Achievements</SectionLabel>
                <ul className="space-y-1">
                  {insights.recentAchievements.map((a, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-foreground">
                      <Trophy className="w-3 h-3 text-amber-500 flex-shrink-0 mt-0.5" />
                      {a}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Key Competitors */}
            {insights.keyCompetitors && insights.keyCompetitors.length > 0 && (
              <div>
                <SectionLabel>Key Competitors</SectionLabel>
                <div className="flex flex-wrap gap-1.5">
                  {insights.keyCompetitors.map((c, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted border border-border text-xs text-muted-foreground">
                      <Swords className="w-2.5 h-2.5" />
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Growth Indicators */}
            {insights.growthIndicators && insights.growthIndicators.length > 0 && (
              <div>
                <SectionLabel>Growth Indicators</SectionLabel>
                <ul className="space-y-1">
                  {insights.growthIndicators.map((gi, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-foreground">
                      <CheckCircle2 className="w-3 h-3 text-green-500 flex-shrink-0 mt-0.5" />
                      {gi}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Buying Intent Signals */}
            {insights.buyingIntentSignals && insights.buyingIntentSignals.length > 0 && (
              <div>
                <SectionLabel>Buying Intent Signals</SectionLabel>
                <ul className="space-y-1">
                  {insights.buyingIntentSignals.map((sig, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-foreground">
                      <ChevronRight className="w-3 h-3 text-primary flex-shrink-0 mt-0.5" />
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
