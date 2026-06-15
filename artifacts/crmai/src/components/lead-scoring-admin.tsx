import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Star, Target, Building2, Users, DollarSign, Trash2, Plus,
  RefreshCw, ChevronDown, ChevronUp, Zap, Phone, Mail,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface LeadScoringRule {
  id: number;
  ruleType: string;
  key: string;
  label: string;
  description: string | null;
  points: number;
  params: { min?: number; max?: number } | null;
  isActive: boolean;
  sortOrder: number;
}

interface LeadScoreMilestone {
  id: number;
  label: string;
  minScore: number;
  maxScore: number;
  color: string;
  sortOrder: number;
}

const RULE_TYPE_META: Record<string, {
  label: string;
  description: string;
  color: string;
  icon: React.ElementType;
}> = {
  activity: {
    label: "Activity Rules",
    description: "Points awarded when specific activities are logged and completed for a lead",
    color: "text-blue-600 bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800",
    icon: Phone,
  },
  field: {
    label: "Profile / Field Rules",
    description: "Points awarded when specific lead information is provided",
    color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800",
    icon: Building2,
  },
  qualification: {
    label: "Qualification Rules",
    description: "Points awarded for qualification signals like seniority level and lead source",
    color: "text-purple-600 bg-purple-50 dark:bg-purple-950/50 border-purple-200 dark:border-purple-800",
    icon: Star,
  },
  company_size: {
    label: "Company Size Rules",
    description: "Points awarded based on employee count ranges — only the matching range is awarded",
    color: "text-amber-600 bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800",
    icon: Users,
  },
  revenue: {
    label: "Revenue Rules",
    description: "Points awarded based on annual revenue ranges — only the matching range is awarded",
    color: "text-rose-600 bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800",
    icon: DollarSign,
  },
};

const MILESTONE_COLORS: Record<string, string> = {
  blue:   "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800",
  yellow: "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-950/60 dark:text-yellow-300 dark:border-yellow-800",
  orange: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800",
  green:  "bg-green-100 text-green-700 border-green-200 dark:bg-green-950/60 dark:text-green-300 dark:border-green-800",
  red:    "bg-red-100 text-red-700 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800",
  purple: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800",
  gray:   "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700",
};

const isc = "h-8 px-2 rounded border border-border bg-muted text-sm text-foreground outline-none focus:ring-1 focus:ring-primary/50 w-full";

export function LeadScoringAdmin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"rules" | "milestones">("rules");
  const [editingPoints, setEditingPoints] = useState<Record<number, string>>({});
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(Object.keys(RULE_TYPE_META)));
  const [editingMilestone, setEditingMilestone] = useState<number | null>(null);
  const [milestoneForm, setMilestoneForm] = useState<Partial<LeadScoreMilestone>>({});
  const [addOpen, setAddOpen] = useState(false);
  const [addRuleType, setAddRuleType] = useState("activity");
  const [addKey, setAddKey] = useState("");
  const [addLabel, setAddLabel] = useState("");
  const [addPoints, setAddPoints] = useState("5");
  const [addDescription, setAddDescription] = useState("");

  const { data: rulesData, isLoading: loadingRules } = useQuery<{ rules: LeadScoringRule[] }>({
    queryKey: ["lead-scoring-rules"],
    queryFn: async () => {
      const r = await fetch("/api/admin/lead-scoring/rules", { credentials: "include" });
      if (!r.ok) throw new Error("Failed to load rules");
      return r.json();
    },
  });

  const { data: milestonesData, isLoading: loadingMilestones } = useQuery<{ milestones: LeadScoreMilestone[] }>({
    queryKey: ["lead-scoring-milestones"],
    queryFn: async () => {
      const r = await fetch("/api/admin/lead-scoring/milestones", { credentials: "include" });
      if (!r.ok) throw new Error("Failed to load milestones");
      return r.json();
    },
  });

  const rules = rulesData?.rules ?? [];
  const milestones = milestonesData?.milestones ?? [];

  const updateRule = useMutation({
    mutationFn: async ({ id, ...body }: Partial<LeadScoringRule> & { id: number }) => {
      const r = await fetch(`/api/admin/lead-scoring/rules/${id}`, {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error("Failed");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lead-scoring-rules"] }),
    onError: () => toast({ title: "Error", description: "Could not update rule", variant: "destructive" }),
  });

  const deleteRule = useMutation({
    mutationFn: async (id: number) => {
      const r = await fetch(`/api/admin/lead-scoring/rules/${id}`, { method: "DELETE", credentials: "include" });
      if (!r.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-scoring-rules"] });
      toast({ title: "Rule deleted" });
    },
    onError: () => toast({ title: "Error", description: "Could not delete rule", variant: "destructive" }),
  });

  const createRule = useMutation({
    mutationFn: async (body: { ruleType: string; key: string; label: string; points: number; description: string | null }) => {
      const r = await fetch("/api/admin/lead-scoring/rules", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({})) as { error?: string };
        throw new Error(e.error ?? "Failed");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-scoring-rules"] });
      toast({ title: "Rule added" });
      setAddOpen(false);
      setAddKey(""); setAddLabel(""); setAddPoints("5"); setAddDescription("");
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMilestone = useMutation({
    mutationFn: async ({ id, ...body }: Partial<LeadScoreMilestone> & { id: number }) => {
      const r = await fetch(`/api/admin/lead-scoring/milestones/${id}`, {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-scoring-milestones"] });
      toast({ title: "Milestone saved" });
      setEditingMilestone(null);
      setMilestoneForm({});
    },
    onError: () => toast({ title: "Error", description: "Could not update milestone", variant: "destructive" }),
  });

  const recalculateAll = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/admin/lead-scoring/recalculate", { method: "POST", credentials: "include" });
      if (!r.ok) throw new Error("Failed");
      return r.json() as Promise<{ updated: number }>;
    },
    onSuccess: (d) => toast({ title: "Recalculation complete", description: `Updated ${d.updated} lead scores based on current rules.` }),
    onError: () => toast({ title: "Error", description: "Recalculation failed", variant: "destructive" }),
  });

  const savePoints = (rule: LeadScoringRule) => {
    const val = editingPoints[rule.id];
    if (val === undefined) return;
    const pts = parseInt(val);
    if (!isNaN(pts) && pts >= 0) updateRule.mutate({ id: rule.id, points: pts });
    setEditingPoints(p => { const n = { ...p }; delete n[rule.id]; return n; });
  };

  const toggleSection = (type: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type); else next.add(type);
      return next;
    });
  };

  const totalActive = rules.filter(r => r.isActive).length;
  const maxPossible = rules.filter(r => r.isActive).reduce((s, r) => s + r.points, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Star className="w-6 h-6 text-primary" />
          <div>
            <h2 className="text-lg font-semibold text-foreground">Lead Scoring Configuration</h2>
            <p className="text-sm text-muted-foreground">
              Define rules that automatically calculate lead scores from 0–100. Scores update when leads are edited or activities are completed.
            </p>
          </div>
        </div>
        <Button
          size="sm" variant="outline" className="gap-1.5 border-border"
          onClick={() => recalculateAll.mutate()} disabled={recalculateAll.isPending}
        >
          <RefreshCw className={cn("w-3.5 h-3.5", recalculateAll.isPending && "animate-spin")} />
          {recalculateAll.isPending ? "Recalculating…" : "Recalculate All Leads"}
        </Button>
      </div>

      {/* Summary pills */}
      <div className="flex gap-3 flex-wrap">
        <div className="px-3 py-1.5 rounded-lg bg-muted/50 border border-border text-sm">
          <span className="text-muted-foreground">Active rules: </span>
          <span className="font-semibold text-foreground">{totalActive}</span>
        </div>
        <div className="px-3 py-1.5 rounded-lg bg-muted/50 border border-border text-sm">
          <span className="text-muted-foreground">Max possible points: </span>
          <span className="font-semibold text-foreground">{maxPossible} → capped at 100</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted/50 rounded-xl w-fit border border-border">
        {([
          { id: "rules", label: "Scoring Rules" },
          { id: "milestones", label: "Milestones & Tiers" },
        ] as const).map(tab => (
          <button
            key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
              activeTab === tab.id ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Rules Tab ─────────────────────────────────────────────────────── */}
      {activeTab === "rules" && (
        <div className="space-y-4">
          {loadingRules ? (
            <div className="py-12 text-center text-muted-foreground text-sm">Loading scoring rules…</div>
          ) : (
            Object.entries(RULE_TYPE_META).map(([type, meta]) => {
              const typeRules = rules.filter(r => r.ruleType === type).sort((a, b) => a.sortOrder - b.sortOrder);
              const isExpanded = expandedSections.has(type);
              const Icon = meta.icon;
              const activeCount = typeRules.filter(r => r.isActive).length;

              return (
                <Card key={type} className="glass-panel border-border">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <button onClick={() => toggleSection(type)} className="flex items-center gap-3 flex-1 text-left min-w-0">
                        <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center border shrink-0", meta.color)}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground">{meta.label}</p>
                          <p className="text-xs text-muted-foreground truncate">{meta.description}</p>
                        </div>
                        <div className="shrink-0 ml-1">
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                        </div>
                      </button>
                      <Badge variant="outline" className="ml-3 shrink-0 text-xs">
                        {activeCount}/{typeRules.length} active
                      </Badge>
                    </div>
                  </CardHeader>

                  {isExpanded && (
                    <CardContent className="pt-0">
                      {typeRules.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">No rules for this category yet.</p>
                      ) : (
                        <div className="border border-border rounded-lg overflow-hidden">
                          <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs text-muted-foreground font-medium bg-muted/40 border-b border-border">
                            <div className="col-span-4">Rule / Signal</div>
                            <div className="col-span-5">Description</div>
                            <div className="col-span-1 text-center">Pts</div>
                            <div className="col-span-1 text-center">On</div>
                            <div className="col-span-1"></div>
                          </div>
                          {typeRules.map((rule, idx) => (
                            <div key={rule.id} className={cn(
                              "grid grid-cols-12 gap-2 px-3 py-2.5 items-center transition-colors",
                              idx < typeRules.length - 1 && "border-b border-border/50",
                              rule.isActive ? "bg-background hover:bg-muted/30" : "bg-muted/20 opacity-60"
                            )}>
                              <div className="col-span-4 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">{rule.label}</p>
                                <p className="text-[11px] text-muted-foreground font-mono truncate">{rule.key}</p>
                              </div>
                              <div className="col-span-5">
                                <p className="text-xs text-muted-foreground leading-relaxed">{rule.description ?? "—"}</p>
                                {rule.params && (
                                  <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                                    Range: {rule.params.min?.toLocaleString()} – {rule.params.max?.toLocaleString()}
                                  </p>
                                )}
                              </div>
                              <div className="col-span-1 flex justify-center">
                                <input
                                  type="number" min="0" max="100"
                                  value={editingPoints[rule.id] ?? rule.points}
                                  onChange={e => setEditingPoints(p => ({ ...p, [rule.id]: e.target.value }))}
                                  onBlur={() => savePoints(rule)}
                                  onKeyDown={e => { if (e.key === "Enter") savePoints(rule); }}
                                  className="w-12 h-7 text-center text-sm font-bold border border-border rounded bg-muted text-foreground focus:ring-1 focus:ring-primary/50 outline-none"
                                />
                              </div>
                              <div className="col-span-1 flex justify-center">
                                <Switch
                                  checked={rule.isActive}
                                  onCheckedChange={val => updateRule.mutate({ id: rule.id, isActive: val })}
                                />
                              </div>
                              <div className="col-span-1 flex justify-center">
                                <button
                                  onClick={() => { if (window.confirm(`Delete rule "${rule.label}"?`)) deleteRule.mutate(rule.id); }}
                                  className="p-1 rounded text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                                  title="Delete rule"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="mt-3 pt-3 border-t border-border">
                        <button
                          onClick={() => { setAddRuleType(type); setAddOpen(true); }}
                          className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add {meta.label.replace("Rules", "Rule")}
                        </button>
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })
          )}

          <div className="p-4 rounded-xl bg-muted/30 border border-border text-xs text-muted-foreground space-y-1.5">
            <p className="font-medium text-foreground flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-primary" /> How scoring works</p>
            <p>• Points from all matching active rules are summed and automatically <strong>capped at 100</strong>.</p>
            <p>• <strong>Converted</strong> leads always receive a score of 100 regardless of rules.</p>
            <p>• <strong>Unqualified</strong> leads are capped at 30 points regardless of rules.</p>
            <p>• For Company Size and Revenue rules, only the first matching range earns points — keep ranges non-overlapping.</p>
            <p>• Activity rules check for at least one completed activity of that type. Scores recalculate automatically when activities are completed.</p>
            <p>• Click <strong>Recalculate All Leads</strong> after changing point values to apply the new rules to existing leads immediately.</p>
          </div>
        </div>
      )}

      {/* ── Milestones Tab ─────────────────────────────────────────────────── */}
      {activeTab === "milestones" && (
        <div className="space-y-4">
          {loadingMilestones ? (
            <div className="py-12 text-center text-muted-foreground text-sm">Loading milestones…</div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Milestones are score tier labels displayed on lead detail pages. Adjust the thresholds to match your sales qualification process.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[...milestones].sort((a, b) => a.sortOrder - b.sortOrder).map(m => {
                  const isEditing = editingMilestone === m.id;
                  const colorCls = MILESTONE_COLORS[m.color] ?? MILESTONE_COLORS.gray;
                  return (
                    <Card key={m.id} className="glass-panel border-border">
                      <CardContent className="pt-4">
                        {isEditing ? (
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                              <div className="flex flex-col gap-1">
                                <label className="text-xs text-muted-foreground">Label</label>
                                <input className={isc}
                                  value={milestoneForm.label ?? m.label}
                                  onChange={e => setMilestoneForm(f => ({ ...f, label: e.target.value }))} />
                              </div>
                              <div className="flex flex-col gap-1">
                                <label className="text-xs text-muted-foreground">Color</label>
                                <select className={isc}
                                  value={milestoneForm.color ?? m.color}
                                  onChange={e => setMilestoneForm(f => ({ ...f, color: e.target.value }))}>
                                  {Object.keys(MILESTONE_COLORS).map(c => (
                                    <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="flex flex-col gap-1">
                                <label className="text-xs text-muted-foreground">Min Score</label>
                                <input type="number" min="0" max="100" className={isc}
                                  value={milestoneForm.minScore ?? m.minScore}
                                  onChange={e => setMilestoneForm(f => ({ ...f, minScore: parseInt(e.target.value) }))} />
                              </div>
                              <div className="flex flex-col gap-1">
                                <label className="text-xs text-muted-foreground">Max Score</label>
                                <input type="number" min="0" max="100" className={isc}
                                  value={milestoneForm.maxScore ?? m.maxScore}
                                  onChange={e => setMilestoneForm(f => ({ ...f, maxScore: parseInt(e.target.value) }))} />
                              </div>
                            </div>
                            <div className="flex gap-2 pt-1">
                              <button
                                onClick={() => updateMilestone.mutate({ id: m.id, ...milestoneForm })}
                                disabled={updateMilestone.isPending}
                                className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                              >
                                {updateMilestone.isPending ? "Saving…" : "Save Changes"}
                              </button>
                              <button
                                onClick={() => { setEditingMilestone(null); setMilestoneForm({}); }}
                                className="px-3 py-1.5 rounded-md bg-muted border border-border text-foreground text-xs hover:bg-muted/70 transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Badge className={cn("text-sm font-semibold px-3 py-1 border", colorCls)}>
                                {m.label}
                              </Badge>
                              <div>
                                <p className="text-sm font-medium text-foreground">{m.minScore}–{m.maxScore} points</p>
                                <p className="text-xs text-muted-foreground">Score range for this tier</p>
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                setEditingMilestone(m.id);
                                setMilestoneForm({ label: m.label, minScore: m.minScore, maxScore: m.maxScore, color: m.color });
                              }}
                              className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded border border-transparent hover:border-border hover:bg-muted/50 transition-all"
                            >
                              Edit
                            </button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              <div className="p-4 rounded-xl bg-muted/30 border border-border text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">Tips</p>
                <p>• Milestone ranges should cover 0–100 without gaps or overlaps (e.g. 0–25, 26–50, 51–75, 76–100).</p>
                <p>• The milestone label is shown as a colored badge on the lead detail page next to the score bar.</p>
                <p>• After editing thresholds, click <strong>Recalculate All Leads</strong> on the Rules tab to refresh all milestone badges.</p>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Add Rule Dialog ─────────────────────────────────────────────────── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-primary" /> Add Scoring Rule
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Rule Type</label>
              <select className="h-9 px-3 rounded-md border border-border bg-muted text-sm text-foreground outline-none"
                value={addRuleType} onChange={e => setAddRuleType(e.target.value)}>
                {Object.entries(RULE_TYPE_META).map(([type, meta]) => (
                  <option key={type} value={type}>{meta.label}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Rule Key <span className="text-red-400">*</span></label>
              <input
                className="h-9 px-3 rounded-md border border-border bg-muted text-sm text-foreground outline-none focus:ring-1 focus:ring-primary/50"
                placeholder="e.g. linkedin_message_sent"
                value={addKey}
                onChange={e => setAddKey(e.target.value.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""))}
              />
              <p className="text-[11px] text-muted-foreground">Unique identifier — lowercase letters, numbers, underscores only</p>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Label <span className="text-red-400">*</span></label>
              <input
                className="h-9 px-3 rounded-md border border-border bg-muted text-sm text-foreground outline-none focus:ring-1 focus:ring-primary/50"
                placeholder="e.g. LinkedIn Message Sent"
                value={addLabel} onChange={e => setAddLabel(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Points <span className="text-red-400">*</span></label>
              <input
                type="number" min="0" max="100"
                className="h-9 px-3 rounded-md border border-border bg-muted text-sm text-foreground outline-none focus:ring-1 focus:ring-primary/50"
                value={addPoints} onChange={e => setAddPoints(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Description (optional)</label>
              <textarea
                className="px-3 py-2 rounded-md border border-border bg-muted text-sm text-foreground outline-none focus:ring-1 focus:ring-primary/50 resize-none"
                rows={2} value={addDescription} onChange={e => setAddDescription(e.target.value)}
                placeholder="When is this rule triggered?"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button
              disabled={!addKey.trim() || !addLabel.trim() || createRule.isPending}
              onClick={() => createRule.mutate({
                ruleType: addRuleType, key: addKey, label: addLabel,
                points: parseInt(addPoints) || 0, description: addDescription || null,
              })}
            >
              {createRule.isPending ? "Adding…" : "Add Rule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
