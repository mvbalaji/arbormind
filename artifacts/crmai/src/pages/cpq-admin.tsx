import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/auth";
import {
  Settings2, ShieldOff,
  TrendingUp, ShieldCheck, Users, Plus, Trash2, Save, History,
  ChevronDown, ChevronUp, Pencil, X, ArrowUpDown, ArrowUp, ArrowDown, Search, FilterX,
  GitBranch, GripVertical, ToggleLeft, ToggleRight, CopyPlus, RefreshCw,
} from "lucide-react";

// ── Guided Selling Types ──────────────────────────────────────────────────────
interface GuidedOption { id: string; label: string; icon: string; hint: string; }
interface GuidedStep {
  id: string; label: string; question: string; hint: string;
  type: "single" | "multi"; options: GuidedOption[];
}
interface GuidedFlow { id: string; name: string; icon: string; description: string; steps: GuidedStep[]; }
interface GuidedSellingConfig { flows: GuidedFlow[]; }

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 40);
}

interface VolumeTier { min: number; max: number | null; disc: number }
interface ApprovalThreshold { pct: number; approver: string }
interface PartnerTier { tier: string; disc: number }
interface AuditEntry {
  id: number;
  setting_key: string;
  old_value: string | null;
  new_value: string;
  changed_by_name: string;
  changed_at: string;
}

const APPROVER_COLORS = [
  { bar: "bg-blue-400" }, { bar: "bg-yellow-400" },
  { bar: "bg-orange-400" }, { bar: "bg-red-500" }, { bar: "bg-purple-500" },
];

const SETTING_LABELS: Record<string, string> = {
  cpq_enabled: "CPQ Module Toggle",
  cpq_volume_tiers: "Volume Pricing Tiers",
  cpq_approval_thresholds: "Approval Escalation Ladder",
  cpq_partner_tiers: "Partner Pricing Tiers",
  cpq_guided_selling: "Guided Selling Flow",
};

const PRICING_KEYS = new Set(["cpq_enabled", "cpq_volume_tiers", "cpq_approval_thresholds", "cpq_partner_tiers"]);
const GUIDED_KEYS = new Set(["cpq_guided_selling"]);

const DEFAULT_AUDIT_VALUES: Record<string, any[]> = {
  cpq_volume_tiers: [
    { min: 1, max: 10, disc: 0 }, { min: 11, max: 25, disc: 5 },
    { min: 26, max: 50, disc: 10 }, { min: 51, max: 100, disc: 15 },
    { min: 101, max: null, disc: 20 },
  ],
  cpq_approval_thresholds: [
    { pct: 10, approver: "Team Lead" }, { pct: 20, approver: "Manager" },
    { pct: 30, approver: "Director" }, { pct: 40, approver: "VP" },
  ],
  cpq_partner_tiers: [
    { tier: "Registered", disc: 5 }, { tier: "Silver", disc: 10 },
    { tier: "Gold", disc: 15 }, { tier: "Platinum", disc: 25 },
  ],
};

interface AuditRow {
  id: string;
  date: string;
  rawDate: string;
  user: string;
  section: string;
  action: string;
}

function buildAction(key: string, o: any, n: any, idx: number): string | null {
  if (key === "cpq_volume_tiers") {
    if (!o && n) return `Added volume tier ${idx + 1}: Qty ${n.min}–${n.max ?? "∞"} at ${n.disc}% discount`;
    if (o && !n) return `Removed volume tier ${idx + 1}: Qty ${o.min}–${o.max ?? "∞"} (was ${o.disc}% discount)`;
    if (o.disc !== n.disc) return `Changed Tier ${idx + 1} (Qty ${n.min}–${n.max ?? "∞"}) discount from ${o.disc}% to ${n.disc}%`;
    if (o.min !== n.min || o.max !== n.max) return `Changed Tier ${idx + 1} quantity range from ${o.min}–${o.max ?? "∞"} to ${n.min}–${n.max ?? "∞"}`;
  } else if (key === "cpq_approval_thresholds") {
    if (!o && n) return `Added approval level ${idx + 1}: discounts >${n.pct}% require ${n.approver} approval`;
    if (o && !n) return `Removed approval level ${idx + 1}: was ${o.approver} for discounts >${o.pct}%`;
    if (o.pct !== n.pct && o.approver !== n.approver) return `Changed Level ${idx + 1} from >${o.pct}% (${o.approver}) to >${n.pct}% (${n.approver})`;
    if (o.pct !== n.pct) return `Changed Level ${idx + 1} (${o.approver}) threshold from >${o.pct}% to >${n.pct}%`;
    if (o.approver !== n.approver) return `Changed Level ${idx + 1} (>${o.pct}%) approver from "${o.approver}" to "${n.approver}"`;
  } else if (key === "cpq_partner_tiers") {
    if (!o && n) return `Added partner tier "${n.tier}" with ${n.disc}% discount`;
    if (o && !n) return `Removed partner tier "${o.tier}" (was ${o.disc}% discount)`;
    if (o.tier !== n.tier && o.disc !== n.disc) return `Changed partner tier from "${o.tier}" (${o.disc}%) to "${n.tier}" (${n.disc}%)`;
    if (o.disc !== n.disc) return `Changed ${o.tier} partner discount from ${o.disc}% to ${n.disc}%`;
    if (o.tier !== n.tier) return `Renamed partner tier from "${o.tier}" to "${n.tier}"`;
  }
  return null;
}

function flattenAudit(entries: AuditEntry[]): AuditRow[] {
  const rows: AuditRow[] = [];
  for (const entry of entries) {
    const section = SETTING_LABELS[entry.setting_key] ?? entry.setting_key;
    const user = entry.changed_by_name ?? "System";
    const date = fmtDate(entry.changed_at);
    const rawDate = entry.changed_at;

    if (entry.setting_key === "cpq_enabled") {
      const from = entry.old_value === "true" ? "Enabled" : "Disabled";
      const to = entry.new_value === "true" ? "Enabled" : "Disabled";
      rows.push({ id: `${entry.id}-0`, date, rawDate, user, section, action: `Changed CPQ module status from ${from} to ${to}` });
      continue;
    }

    if (entry.setting_key === "cpq_guided_selling") {
      try {
        const oldFlows = entry.old_value ? (JSON.parse(entry.old_value)?.flows?.length ?? 0) : 0;
        const newFlows = JSON.parse(entry.new_value)?.flows?.length ?? 0;
        const msg = !entry.old_value
          ? `Initial guided selling configuration saved (${newFlows} flow${newFlows !== 1 ? "s" : ""})`
          : oldFlows !== newFlows
          ? `Updated guided selling flows: ${oldFlows} → ${newFlows} flow${newFlows !== 1 ? "s" : ""}`
          : "Updated guided selling flow configuration";
        rows.push({ id: `${entry.id}-0`, date, rawDate, user, section, action: msg });
      } catch {
        rows.push({ id: `${entry.id}-0`, date, rawDate, user, section, action: "Updated guided selling configuration" });
      }
      continue;
    }

    try {
      const oldArr: any[] = entry.old_value
        ? JSON.parse(entry.old_value)
        : (DEFAULT_AUDIT_VALUES[entry.setting_key] ?? []);
      const newArr: any[] = JSON.parse(entry.new_value);
      const maxLen = Math.max(oldArr.length, newArr.length);
      let pushed = false;

      for (let i = 0; i < maxLen; i++) {
        const action = buildAction(entry.setting_key, oldArr[i], newArr[i], i);
        if (action) {
          rows.push({ id: `${entry.id}-${i}`, date, rawDate, user, section, action });
          pushed = true;
        }
      }
      if (!pushed) {
        rows.push({ id: `${entry.id}-nc`, date, rawDate, user, section, action: "Saved with no field changes" });
      }
    } catch {
      rows.push({ id: `${entry.id}-err`, date, rawDate, user, section, action: "Settings updated" });
    }
  }
  return rows;
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch { return iso; }
}

function SectionActions({ dirty, saving, onAdd, onEdit, onSave, onDiscard }: {
  dirty: boolean; saving: boolean; onAdd: () => void; onEdit: () => void; onSave: () => void; onDiscard: () => void;
}) {
  if (!dirty) {
    return (
      <div className="flex gap-2">
        <Button size="sm" variant="outline" className="h-7 gap-1" onClick={onAdd}>
          <Plus className="w-3 h-3" />Add
        </Button>
        <Button size="sm" variant="outline" className="h-7 gap-1" onClick={onEdit}>
          <Pencil className="w-3 h-3" />Edit
        </Button>
      </div>
    );
  }
  return (
    <div className="flex gap-2">
      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 h-7 gap-1" disabled={saving} onClick={onSave}>
        <Save className="w-3 h-3" />{saving ? "Saving…" : "Save"}
      </Button>
      <Button size="sm" variant="outline" className="h-7 gap-1" onClick={onDiscard}>
        <X className="w-3 h-3" />Discard
      </Button>
    </div>
  );
}

type SortKey = "date" | "user" | "section" | "action";

function ChangeHistoryCard({ allRows, emptyMessage = "No changes recorded yet." }: { allRows: AuditRow[]; emptyMessage?: string }) {
  const [expanded, setExpanded] = useState(true);
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterUser, setFilterUser] = useState("");
  const [filterSection, setFilterSection] = useState("");
  const [filterField, setFilterField] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  }

  const uniqueUsers = Array.from(new Set(allRows.map(r => r.user)));
  const uniqueSections = Array.from(new Set(allRows.map(r => r.section)));
  const fieldKeywords = Array.from(new Set(allRows.flatMap(r => {
    const names: string[] = [];
    const m1 = r.action.match(/Tier\s+\d+/gi); if (m1) names.push(...m1.map(s => s.trim()));
    const m2 = r.action.match(/Level\s+\d+/gi); if (m2) names.push(...m2.map(s => s.trim()));
    const m3 = r.action.match(/"([^"]+)"/g); if (m3) names.push(...m3.map(s => s.replace(/"/g, "")));
    return names;
  }))).sort();

  const rows = allRows.filter(r => {
    if (filterDateFrom && r.rawDate.slice(0, 10) < filterDateFrom) return false;
    if (filterDateTo && r.rawDate.slice(0, 10) > filterDateTo) return false;
    if (filterUser && r.user !== filterUser) return false;
    if (filterSection && r.section !== filterSection) return false;
    if (filterField && !r.action.toLowerCase().includes(filterField.toLowerCase())) return false;
    return true;
  }).sort((a, b) => {
    const av = sortKey === "date" ? a.rawDate : a[sortKey];
    const bv = sortKey === "date" ? b.rawDate : b[sortKey];
    return (sortDir === "asc" ? 1 : -1) * (av < bv ? -1 : av > bv ? 1 : 0);
  });

  const hasFilters = !!filterDateFrom || !!filterDateTo || !!filterUser || !!filterSection || !!filterField;
  const clearFilters = () => { setFilterDateFrom(""); setFilterDateTo(""); setFilterUser(""); setFilterSection(""); setFilterField(""); };

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3 cursor-pointer select-none" onClick={() => setExpanded(v => !v)}>
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <History className="w-4 h-4 text-muted-foreground" />Change History
            <Badge className="bg-muted text-muted-foreground text-xs">{rows.length}{hasFilters && ` of ${allRows.length}`}</Badge>
          </span>
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </CardTitle>
      </CardHeader>
      {expanded && (
        <CardContent className="p-0">
          {allRows.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8 px-4">{emptyMessage}</p>
          ) : (
            <>
              <div className="border-b border-border bg-muted/20 px-4 py-3 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="text-xs text-muted-foreground font-medium">Date from</span>
                  <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className="h-7 text-xs px-2 rounded border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                  <span className="text-xs text-muted-foreground font-medium">to</span>
                  <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} min={filterDateFrom || undefined} className="h-7 text-xs px-2 rounded border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                  <select value={filterUser} onChange={e => setFilterUser(e.target.value)} className="h-7 text-xs px-2 rounded border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                    <option value="">All users</option>
                    {uniqueUsers.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                  <select value={filterSection} onChange={e => setFilterSection(e.target.value)} className="h-7 text-xs px-2 rounded border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                    <option value="">All sections</option>
                    {uniqueSections.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <select value={filterField} onChange={e => setFilterField(e.target.value)} className="h-7 text-xs px-2 rounded border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                    <option value="">All fields</option>
                    {fieldKeywords.map(k => <option key={k} value={k}>{k}</option>)}
                  </select>
                  {hasFilters && <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-muted-foreground ml-auto" onClick={clearFilters}><FilterX className="w-3.5 h-3.5" /> Clear all</Button>}
                </div>
                {hasFilters && (
                  <div className="flex flex-wrap gap-1.5">
                    {filterDateFrom && <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">From: {filterDateFrom}<button onClick={() => setFilterDateFrom("")} className="hover:opacity-70">×</button></span>}
                    {filterDateTo && <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">To: {filterDateTo}<button onClick={() => setFilterDateTo("")} className="hover:opacity-70">×</button></span>}
                    {filterUser && <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">User: {filterUser}<button onClick={() => setFilterUser("")} className="hover:opacity-70">×</button></span>}
                    {filterSection && <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">Section: {filterSection}<button onClick={() => setFilterSection("")} className="hover:opacity-70">×</button></span>}
                    {filterField && <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">Field: {filterField}<button onClick={() => setFilterField("")} className="hover:opacity-70">×</button></span>}
                  </div>
                )}
              </div>
              {rows.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No records match the current filters.</p>
              ) : (
                <div className="max-h-80 overflow-y-auto">
                  <table className="w-full text-sm table-fixed">
                    <colgroup><col style={{ width: "148px" }} /><col style={{ width: "112px" }} /><col /><col style={{ width: "160px" }} /></colgroup>
                    <thead>
                      <tr className="border-b-2 border-border bg-muted/50">
                        {(["date", "user", "action", "section"] as const).map(col => {
                          const labels: Record<string, string> = { date: "Date", user: "User", action: "Action", section: "Section" };
                          return (
                            <th key={col} className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3 cursor-pointer select-none hover:text-foreground transition-colors sticky top-0 bg-muted/50 z-10" onClick={() => handleSort(col)}>
                              <span className="flex items-center gap-1">
                                {labels[col]}
                                {sortKey === col ? sortDir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" /> : <ArrowUpDown className="w-3 h-3 opacity-30" />}
                              </span>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, i) => (
                        <tr key={row.id} className={`border-b border-border last:border-0 hover:bg-muted/30 transition-colors ${i % 2 === 0 ? "" : "bg-muted/10"}`}>
                          <td className="px-4 py-3 text-xs text-muted-foreground align-top">{row.date}</td>
                          <td className="px-4 py-3 text-sm font-medium text-foreground align-top truncate">{row.user}</td>
                          <td className="px-4 py-3 text-sm text-foreground align-top">{row.action}</td>
                          <td className="px-4 py-3 align-top"><span className="inline-block text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium break-words">{row.section}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export default function CpqAdmin() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  const [activeAdminTab, setActiveAdminTab] = useState<"pricing" | "guided">("pricing");

  // Pricing config
  const { data: pricingData, isLoading: pricingLoading } = useQuery({
    queryKey: ["cpq-pricing-settings"],
    queryFn: () => fetch("/api/settings/cpq/pricing", { credentials: "include" }).then((r) => r.json()),
  });

  // Per-section edit state: null = read-only display, non-null = editing
  const [volumeTiers, setVolumeTiers] = useState<VolumeTier[] | null>(null);
  const [approvalThresholds, setApprovalThresholds] = useState<ApprovalThreshold[] | null>(null);
  const [partnerTiers, setPartnerTiers] = useState<PartnerTier[] | null>(null);

  const serverVT: VolumeTier[] = pricingData?.volumeTiers ?? [];
  const serverAT: ApprovalThreshold[] = pricingData?.approvalThresholds ?? [];
  const serverPT: PartnerTier[] = pricingData?.partnerTiers ?? [];

  const effectiveVT = volumeTiers ?? serverVT;
  const effectiveAT = approvalThresholds ?? serverAT;
  const effectivePT = partnerTiers ?? serverPT;

  function savePricing(payload: object, onDone: () => void) {
    return fetch("/api/settings/cpq/pricing", {
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify(payload),
    }).then((r) => r.json()).then(() => {
      queryClient.invalidateQueries({ queryKey: ["cpq-pricing-settings"] });
      queryClient.invalidateQueries({ queryKey: ["cpq-audit"] });
      onDone();
    });
  }

  const [savingVT, setSavingVT] = useState(false);
  const [savingAT, setSavingAT] = useState(false);
  const [savingPT, setSavingPT] = useState(false);

  // Volume tier helpers
  const updateVT = (idx: number, field: keyof VolumeTier, val: string) =>
    setVolumeTiers(effectiveVT.map((t, i) =>
      i === idx ? { ...t, [field]: field === "disc" || field === "min" ? Number(val) : val === "" ? null : Number(val) } : t
    ));
  const addVT = () => setVolumeTiers([...effectiveVT, { min: 0, max: null, disc: 0 }]);
  const removeVT = (idx: number) => setVolumeTiers(effectiveVT.filter((_, i) => i !== idx));

  // Approval threshold helpers
  const updateAT = (idx: number, field: keyof ApprovalThreshold, val: string) =>
    setApprovalThresholds(effectiveAT.map((t, i) =>
      i === idx ? { ...t, [field]: field === "pct" ? Number(val) : val } : t
    ));
  const addAT = () => setApprovalThresholds([...effectiveAT, { pct: 0, approver: "Approver" }]);
  const removeAT = (idx: number) => setApprovalThresholds(effectiveAT.filter((_, i) => i !== idx));

  // Partner tier helpers
  const updatePT = (idx: number, field: keyof PartnerTier, val: string) =>
    setPartnerTiers(effectivePT.map((t, i) =>
      i === idx ? { ...t, [field]: field === "disc" ? Number(val) : val } : t
    ));
  const addPT = () => setPartnerTiers([...effectivePT, { tier: "New Tier", disc: 0 }]);
  const removePT = (idx: number) => setPartnerTiers(effectivePT.filter((_, i) => i !== idx));

  // ── Guided Selling Flow ──────────────────────────────────────────────────────
  const { data: gsConfig } = useQuery<GuidedSellingConfig>({
    queryKey: ["cpq-guided-selling-config"],
    queryFn: () => fetch("/api/settings/cpq/guided-selling", { credentials: "include" }).then(r => r.json()),
  });

  const [gsEdit, setGsEdit] = useState<GuidedSellingConfig | null>(null);
  const [activeFlowIdx, setActiveFlowIdx] = useState<number>(0);
  const [gsSaving, setGsSaving] = useState(false);
  const [gsExpandedStep, setGsExpandedStep] = useState<number | null>(0);

  const viewFlows: GuidedFlow[] = gsConfig?.flows ?? [];
  const activeFlow: GuidedFlow | null = gsEdit ? (gsEdit.flows[activeFlowIdx] ?? null) : null;

  function saveGs() {
    if (!gsEdit) return;
    setGsSaving(true);
    fetch("/api/settings/cpq/guided-selling", {
      method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify(gsEdit),
    }).then(() => {
      queryClient.invalidateQueries({ queryKey: ["cpq-guided-selling-config"] });
      queryClient.invalidateQueries({ queryKey: ["cpq-audit"] });
      setGsEdit(null);
      setGsSaving(false);
    }).catch(() => setGsSaving(false));
  }

  function startEditFlow(idx: number) {
    const copy: GuidedSellingConfig = JSON.parse(JSON.stringify(gsConfig ?? { flows: [] }));
    setGsEdit(copy);
    setActiveFlowIdx(idx);
    setGsExpandedStep(0);
  }
  function discardGs() { setGsEdit(null); }

  function addNewFlow() {
    const copy: GuidedSellingConfig = JSON.parse(JSON.stringify(gsConfig ?? { flows: [] }));
    const newFlow: GuidedFlow = { id: `flow_${Date.now()}`, name: "New Industry Flow", icon: "📋", description: "", steps: [] };
    copy.flows.push(newFlow);
    setGsEdit(copy);
    setActiveFlowIdx(copy.flows.length - 1);
    setGsExpandedStep(null);
  }

  function removeFlow(idx: number) {
    if (!gsEdit) return;
    const flows = gsEdit.flows.filter((_, i) => i !== idx);
    setGsEdit({ ...gsEdit, flows });
    if (activeFlowIdx >= flows.length) setActiveFlowIdx(Math.max(0, flows.length - 1));
  }

  function updateActiveFlow(field: keyof GuidedFlow, val: string) {
    if (!gsEdit) return;
    const flows = gsEdit.flows.map((f, i) => i === activeFlowIdx ? { ...f, [field]: val } : f);
    setGsEdit({ ...gsEdit, flows });
  }

  function updateFlowSteps(updater: (steps: GuidedStep[]) => GuidedStep[]) {
    if (!gsEdit) return;
    const flows = gsEdit.flows.map((f, i) => i === activeFlowIdx ? { ...f, steps: updater(f.steps) } : f);
    setGsEdit({ ...gsEdit, flows });
  }

  function moveStep(idx: number, dir: -1 | 1) {
    updateFlowSteps(steps => {
      const s = [...steps];
      const to = idx + dir;
      if (to < 0 || to >= s.length) return s;
      [s[idx], s[to]] = [s[to], s[idx]];
      setGsExpandedStep(to);
      return s;
    });
  }

  function addStep() {
    updateFlowSteps(steps => {
      const newStep: GuidedStep = { id: `step_${Date.now()}`, label: "New Step", question: "Question?", hint: "", type: "single", options: [] };
      setGsExpandedStep(steps.length);
      return [...steps, newStep];
    });
  }

  function removeStep(idx: number) {
    updateFlowSteps(steps => { setGsExpandedStep(null); return steps.filter((_, i) => i !== idx); });
  }

  function updateStep(idx: number, field: keyof GuidedStep, val: any) {
    updateFlowSteps(steps => steps.map((s, i) => i === idx ? { ...s, [field]: val } : s));
  }

  function addOption(stepIdx: number) {
    updateFlowSteps(steps => steps.map((s, i) => {
      if (i !== stepIdx) return s;
      return { ...s, options: [...s.options, { id: `opt_${Date.now()}`, label: "New Option", icon: "📌", hint: "" }] };
    }));
  }

  function updateOption(stepIdx: number, optIdx: number, field: keyof GuidedOption, val: string) {
    updateFlowSteps(steps => steps.map((s, si) => {
      if (si !== stepIdx) return s;
      const options = s.options.map((o, oi) => oi === optIdx ? { ...o, [field]: val, ...(field === "label" ? { id: slugify(val) || o.id } : {}) } : o);
      return { ...s, options };
    }));
  }

  function removeOption(stepIdx: number, optIdx: number) {
    updateFlowSteps(steps => steps.map((s, si) =>
      si !== stepIdx ? s : { ...s, options: s.options.filter((_, oi) => oi !== optIdx) }
    ));
  }

  function moveOption(stepIdx: number, optIdx: number, dir: -1 | 1) {
    updateFlowSteps(steps => steps.map((s, si) => {
      if (si !== stepIdx) return s;
      const options = [...s.options];
      const to = optIdx + dir;
      if (to < 0 || to >= options.length) return s;
      [options[optIdx], options[to]] = [options[to], options[optIdx]];
      return { ...s, options };
    }));
  }

  // ── Audit log
  const { data: auditData } = useQuery({
    queryKey: ["cpq-audit"],
    queryFn: () => fetch("/api/settings/cpq/audit", { credentials: "include" }).then((r) => r.json()),
  });
  const allAuditRows = flattenAudit(auditData?.entries ?? []);
  const SECTION_TO_KEY: Record<string, string> = Object.fromEntries(Object.entries(SETTING_LABELS).map(([k, v]) => [v, k]));
  const pricingAuditRows = allAuditRows.filter(r => PRICING_KEYS.has(SECTION_TO_KEY[r.section] ?? ""));
  const guidedAuditRows = allAuditRows.filter(r => GUIDED_KEYS.has(SECTION_TO_KEY[r.section] ?? ""));

  if (!isAdmin) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
            <ShieldOff className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold">Access Denied</h2>
          <p className="text-muted-foreground text-sm text-center max-w-sm">Only administrators can manage CPQ settings.</p>
          <Button variant="outline" onClick={() => navigate("/")}>Go to Dashboard</Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-gray-600 to-gray-700 flex items-center justify-center">
            <Settings2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">CPQ Administration</h1>
            <p className="text-sm text-muted-foreground">Configure pricing rules and guided selling flows. All changes are audited.</p>
          </div>
        </div>

        {/* Sub-tabs */}
        <div className="border-b border-border flex gap-0">
          {([
            { key: "pricing", label: "Pricing Rules Configuration", icon: <TrendingUp className="w-3.5 h-3.5" /> },
            { key: "guided",  label: "Guided Selling Flow",          icon: <GitBranch className="w-3.5 h-3.5" /> },
          ] as const).map(tab => (
            <button key={tab.key} onClick={() => setActiveAdminTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeAdminTab === tab.key
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground"
              }`}>
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>

        {/* ── PRICING TAB ── */}
        {activeAdminTab === "pricing" && (<>

        {/* Summary card */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><Settings2 className="w-4 h-4 text-muted-foreground" />CPQ Configuration Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-muted-foreground">Volume tiers</span>
                <span className="font-semibold">{effectiveVT.length} tiers</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-muted-foreground">Max volume discount</span>
                <span className="font-semibold">{Math.max(0, ...effectiveVT.map((t) => t.disc))}%</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-muted-foreground">Approval levels</span>
                <span className="font-semibold">{effectiveAT.length} levels</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-muted-foreground">Lowest approval threshold</span>
                <span className="font-semibold">{effectiveAT.length ? `>${Math.min(...effectiveAT.map((t) => t.pct))}%` : "—"}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-muted-foreground">Partner tiers</span>
                <span className="font-semibold">{effectivePT.length} tiers</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-muted-foreground">Max partner discount</span>
                <span className="font-semibold">{Math.max(0, ...effectivePT.map((t) => t.disc))}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {pricingLoading ? <p className="text-sm text-muted-foreground">Loading pricing settings…</p> : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Volume Pricing Tiers */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-orange-500" />Volume Pricing Tiers
                  </CardTitle>
                  <SectionActions
                    dirty={volumeTiers !== null}
                    saving={savingVT}
                    onAdd={() => { const base = JSON.parse(JSON.stringify(serverVT)); setVolumeTiers([...base, { min: 0, max: null, disc: 0 }]); }}
                    onEdit={() => setVolumeTiers(JSON.parse(JSON.stringify(serverVT)))}
                    onSave={() => { setSavingVT(true); savePricing({ volumeTiers: effectiveVT }, () => { setSavingVT(false); setVolumeTiers(null); }); }}
                    onDiscard={() => setVolumeTiers(null)}
                  />
                </div>
              </CardHeader>
              <CardContent>
                {volumeTiers === null ? (
                  /* Read-only view */
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-xs text-muted-foreground">
                        <th className="text-left pb-2 font-medium">Qty Range</th>
                        <th className="text-right pb-2 font-medium">Discount %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {serverVT.map((t, idx) => (
                        <tr key={idx} className="border-b border-border last:border-0">
                          <td className="py-2 text-foreground">{t.min}–{t.max ?? "∞"}</td>
                          <td className="py-2 text-right font-medium">{t.disc}%</td>
                        </tr>
                      ))}
                      {serverVT.length === 0 && <tr><td colSpan={2} className="py-4 text-center text-muted-foreground text-xs">No tiers configured</td></tr>}
                    </tbody>
                  </table>
                ) : (
                  /* Edit view */
                  <div className="space-y-2">
                    <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 text-xs text-muted-foreground font-medium px-1">
                      <span>Min</span><span>Max</span><span>Disc %</span><span />
                    </div>
                    {effectiveVT.map((t, idx) => (
                      <div key={idx} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center">
                        <Input type="number" min={0} value={t.min} onChange={(e) => updateVT(idx, "min", e.target.value)} className="h-8 text-sm" />
                        <Input type="number" min={0} value={t.max ?? ""} placeholder="∞" onChange={(e) => updateVT(idx, "max", e.target.value)} className="h-8 text-sm" />
                        <Input type="number" min={0} max={100} value={t.disc} onChange={(e) => updateVT(idx, "disc", e.target.value)} className="h-8 text-sm" />
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeVT(idx)}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Approval Escalation Ladder */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-blue-500" />Approval Escalation Ladder
                  </CardTitle>
                  <SectionActions
                    dirty={approvalThresholds !== null}
                    saving={savingAT}
                    onAdd={() => { const base = JSON.parse(JSON.stringify(serverAT)); setApprovalThresholds([...base, { pct: 0, approver: "Approver" }]); }}
                    onEdit={() => setApprovalThresholds(JSON.parse(JSON.stringify(serverAT)))}
                    onSave={() => { setSavingAT(true); savePricing({ approvalThresholds: effectiveAT }, () => { setSavingAT(false); setApprovalThresholds(null); }); }}
                    onDiscard={() => setApprovalThresholds(null)}
                  />
                </div>
              </CardHeader>
              <CardContent>
                {approvalThresholds === null ? (
                  /* Read-only view */
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground mb-2">Discount exceeds threshold → approver sign-off required.</p>
                    {serverAT.map((t, idx) => {
                      const c = APPROVER_COLORS[idx % APPROVER_COLORS.length];
                      return (
                        <div key={idx} className="flex items-center gap-3 py-1.5 border-b border-border last:border-0">
                          <div className={`w-7 h-7 rounded-full ${c.bar} flex items-center justify-center text-white text-xs font-bold shrink-0`}>{idx + 1}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{t.approver}</p>
                            <p className="text-xs text-muted-foreground">Discount &gt;{t.pct}%</p>
                          </div>
                        </div>
                      );
                    })}
                    {serverAT.length === 0 && <p className="text-center text-muted-foreground text-xs py-4">No approval levels configured</p>}
                  </div>
                ) : (
                  /* Edit view */
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground mb-1">Discount exceeds threshold → approver sign-off required.</p>
                    <div className="grid grid-cols-[1fr_2fr_auto] gap-2 text-xs text-muted-foreground font-medium px-1">
                      <span>Disc %</span><span>Approver role</span><span />
                    </div>
                    {effectiveAT.map((t, idx) => {
                      const c = APPROVER_COLORS[idx % APPROVER_COLORS.length];
                      return (
                        <div key={idx} className="grid grid-cols-[1fr_2fr_auto] gap-2 items-center">
                          <div className="flex items-center gap-1.5">
                            <div className={`w-6 h-6 rounded-full ${c.bar} flex items-center justify-center text-white text-xs font-bold shrink-0`}>{idx + 1}</div>
                            <Input type="number" min={0} max={100} value={t.pct} onChange={(e) => updateAT(idx, "pct", e.target.value)} className="h-8 text-sm" />
                          </div>
                          <Input value={t.approver} onChange={(e) => updateAT(idx, "approver", e.target.value)} className="h-8 text-sm" placeholder="Role name" />
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeAT(idx)}><Trash2 className="w-3.5 h-3.5" /></Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Partner Pricing Tiers */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Users className="w-4 h-4 text-purple-500" />Partner Pricing Tiers
                  </CardTitle>
                  <SectionActions
                    dirty={partnerTiers !== null}
                    saving={savingPT}
                    onAdd={() => { const base = JSON.parse(JSON.stringify(serverPT)); setPartnerTiers([...base, { tier: "New Tier", disc: 0 }]); }}
                    onEdit={() => setPartnerTiers(JSON.parse(JSON.stringify(serverPT)))}
                    onSave={() => { setSavingPT(true); savePricing({ partnerTiers: effectivePT }, () => { setSavingPT(false); setPartnerTiers(null); }); }}
                    onDiscard={() => setPartnerTiers(null)}
                  />
                </div>
              </CardHeader>
              <CardContent>
                {partnerTiers === null ? (
                  /* Read-only view */
                  <div className="space-y-2">
                    {serverPT.map((p, idx) => (
                      <div key={idx} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                        <span className="text-sm font-medium">{p.tier}</span>
                        <Badge className="bg-purple-100 text-purple-700 text-xs">{p.disc}% discount</Badge>
                      </div>
                    ))}
                    {serverPT.length === 0 && <p className="text-center text-muted-foreground text-xs py-4">No partner tiers configured</p>}
                  </div>
                ) : (
                  /* Edit view */
                  <div className="space-y-2">
                    <div className="grid grid-cols-[2fr_1fr_auto] gap-2 text-xs text-muted-foreground font-medium px-1">
                      <span>Tier name</span><span>Discount %</span><span />
                    </div>
                    {effectivePT.map((p, idx) => (
                      <div key={idx} className="grid grid-cols-[2fr_1fr_auto] gap-2 items-center">
                        <Input value={p.tier} onChange={(e) => updatePT(idx, "tier", e.target.value)} className="h-8 text-sm" placeholder="Tier name" />
                        <Input type="number" min={0} max={100} value={p.disc} onChange={(e) => updatePT(idx, "disc", e.target.value)} className="h-8 text-sm" />
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removePT(idx)}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Pricing tab audit trail */}
        <ChangeHistoryCard allRows={pricingAuditRows} emptyMessage="No pricing changes recorded yet." />

        </>)}

        {/* ── GUIDED SELLING TAB ── */}
        {activeAdminTab === "guided" && (<>

        {/* Guided Selling Flows */}
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Guided Selling Flows</h2>
          {gsEdit ? (
            <div className="flex gap-2">
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 h-7 gap-1" disabled={gsSaving} onClick={saveGs}>
                <Save className="w-3 h-3" />{gsSaving ? "Saving…" : "Save All Flows"}
              </Button>
              <Button size="sm" variant="outline" className="h-7 gap-1" onClick={discardGs}>
                <X className="w-3 h-3" />Discard
              </Button>
            </div>
          ) : (
            <a href="/cpq/guided-selling" target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="outline" className="h-7 gap-1">
                <GitBranch className="w-3 h-3" />Preview Wizard
              </Button>
            </a>
          )}
        </div>

        {/* Flow Cards (view mode) */}
        {!gsEdit && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {viewFlows.map((flow, idx) => (
              <Card key={flow.id} className="shadow-sm">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl shrink-0">{flow.icon || "📋"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{flow.name}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{flow.description || "—"}</p>
                      <p className="text-[11px] text-muted-foreground mt-1">{flow.steps.length} step{flow.steps.length !== 1 ? "s" : ""}</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="w-full mt-3 h-7 gap-1" onClick={() => startEditFlow(idx)}>
                    <Pencil className="w-3 h-3" />Edit Flow
                  </Button>
                </CardContent>
              </Card>
            ))}
            <Card className="shadow-sm border-dashed">
              <CardContent className="pt-4 pb-4 flex flex-col items-center justify-center h-full min-h-[110px]">
                <Button size="sm" variant="outline" className="gap-1.5" onClick={addNewFlow}>
                  <Plus className="w-3.5 h-3.5" />Add New Flow
                </Button>
                <p className="text-[11px] text-muted-foreground mt-2 text-center">Add a new industry-specific guided selling flow</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step Editor (edit mode) */}
        {gsEdit && activeFlow && (
          <Card className="shadow-sm">
            <CardContent className="pt-5 pb-5">
              {/* Flow tabs */}
              <div className="flex gap-2 mb-5 pb-5 border-b border-border flex-wrap">
                {gsEdit.flows.map((f, idx) => (
                  <button key={f.id} onClick={() => { setActiveFlowIdx(idx); setGsExpandedStep(0); }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium transition-all ${
                      idx === activeFlowIdx ? "border-blue-500 bg-blue-50 text-blue-700" : "border-border text-muted-foreground hover:border-blue-300"
                    }`}>
                    {f.icon} {f.name}
                  </button>
                ))}
              </div>

              {/* Flow meta fields */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5 pb-5 border-b border-border">
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium mb-1">Icon (emoji)</p>
                  <Input value={activeFlow.icon} onChange={e => updateActiveFlow("icon", e.target.value)} className="h-8 text-sm text-center" placeholder="🏭" />
                </div>
                <div className="sm:col-span-1">
                  <p className="text-[11px] text-muted-foreground font-medium mb-1">Flow ID</p>
                  <Input value={activeFlow.id} onChange={e => updateActiveFlow("id", e.target.value)} className="h-8 text-xs font-mono" />
                </div>
                <div className="col-span-2">
                  <p className="text-[11px] text-muted-foreground font-medium mb-1">Flow Name</p>
                  <Input value={activeFlow.name} onChange={e => updateActiveFlow("name", e.target.value)} className="h-8 text-sm" placeholder="e.g. Steel Manufacturing" />
                </div>
                <div className="col-span-2 sm:col-span-4">
                  <p className="text-[11px] text-muted-foreground font-medium mb-1">Description</p>
                  <Input value={activeFlow.description} onChange={e => updateActiveFlow("description", e.target.value)} className="h-8 text-sm" placeholder="Short description shown in wizard header" />
                </div>
              </div>

              {/* Steps list */}
              <div className="space-y-3">
                {activeFlow.steps.length === 0 && (
                  <div className="py-6 text-center text-muted-foreground text-sm">No steps yet — click <strong>Add Step</strong> below.</div>
                )}
                {activeFlow.steps.map((step, si) => {
                  const expanded = gsExpandedStep === si;
                  return (
                    <div key={step.id} className="border border-blue-200 bg-blue-50/30 rounded-lg transition-all">
                      <div className="flex items-center gap-2 px-3 py-2.5 cursor-pointer select-none"
                        onClick={() => setGsExpandedStep(expanded ? null : si)}>
                        <div className="flex flex-col gap-0.5 shrink-0">
                          <button className="hover:text-foreground text-muted-foreground disabled:opacity-30" disabled={si === 0}
                            onClick={e => { e.stopPropagation(); moveStep(si, -1); }}>
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button className="hover:text-foreground text-muted-foreground disabled:opacity-30" disabled={si === activeFlow.steps.length - 1}
                            onClick={e => { e.stopPropagation(); moveStep(si, 1); }}>
                            <ArrowDown className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0">{si + 1}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{step.label}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{step.question}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge className={`text-[10px] px-1.5 ${step.type === "multi" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
                            {step.type === "multi" ? "Multi-select" : "Single"}
                          </Badge>
                          <span className="text-[11px] text-muted-foreground">{step.options.length} options</span>
                          <button className="text-destructive hover:opacity-70 p-1" onClick={e => { e.stopPropagation(); removeStep(si); }}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                        </div>
                      </div>

                      {expanded && (
                        <div className="border-t border-border px-4 py-4 space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <p className="text-[11px] text-muted-foreground font-medium mb-1">Step Label</p>
                              <Input value={step.label} onChange={e => updateStep(si, "label", e.target.value)} className="h-8 text-sm" />
                            </div>
                            <div>
                              <p className="text-[11px] text-muted-foreground font-medium mb-1">Step ID <span className="text-muted-foreground/60 font-mono">(scoring key)</span></p>
                              <Input value={step.id} onChange={e => updateStep(si, "id", e.target.value)} className="h-8 text-sm font-mono" />
                            </div>
                            <div className="sm:col-span-2">
                              <p className="text-[11px] text-muted-foreground font-medium mb-1">Question heading</p>
                              <Input value={step.question} onChange={e => updateStep(si, "question", e.target.value)} className="h-8 text-sm" />
                            </div>
                            <div className="sm:col-span-2">
                              <p className="text-[11px] text-muted-foreground font-medium mb-1">Hint / sub-text</p>
                              <Input value={step.hint} onChange={e => updateStep(si, "hint", e.target.value)} className="h-8 text-sm" />
                            </div>
                            <div>
                              <p className="text-[11px] text-muted-foreground font-medium mb-1">Selection type</p>
                              <div className="flex gap-2">
                                {(["single", "multi"] as const).map(t => (
                                  <button key={t} onClick={() => updateStep(si, "type", t)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium transition-all ${step.type === t ? "border-blue-500 bg-blue-50 text-blue-700" : "border-border text-muted-foreground hover:border-blue-300"}`}>
                                    {t === "single" ? <ToggleLeft className="w-3.5 h-3.5" /> : <ToggleRight className="w-3.5 h-3.5" />}
                                    {t === "single" ? "Single choice" : "Multi-select"}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wide">Options</p>
                              <Button size="sm" variant="outline" className="h-6 gap-1 text-[11px]" onClick={() => addOption(si)}>
                                <Plus className="w-3 h-3" />Add option
                              </Button>
                            </div>
                            <div className="space-y-2">
                              {step.options.map((opt, oi) => (
                                <div key={oi} className="grid grid-cols-[24px_48px_1fr_2fr_auto] gap-2 items-center bg-background border border-border rounded-md px-2 py-1.5">
                                  <div className="flex flex-col gap-0.5">
                                    <button className="hover:text-foreground text-muted-foreground disabled:opacity-30 text-[10px]" disabled={oi === 0} onClick={() => moveOption(si, oi, -1)}>▲</button>
                                    <button className="hover:text-foreground text-muted-foreground disabled:opacity-30 text-[10px]" disabled={oi === step.options.length - 1} onClick={() => moveOption(si, oi, 1)}>▼</button>
                                  </div>
                                  <Input value={opt.icon} onChange={e => updateOption(si, oi, "icon", e.target.value)} className="h-7 text-sm text-center px-1" placeholder="🔧" />
                                  <Input value={opt.label} onChange={e => updateOption(si, oi, "label", e.target.value)} className="h-7 text-xs" placeholder="Option label" />
                                  <Input value={opt.hint} onChange={e => updateOption(si, oi, "hint", e.target.value)} className="h-7 text-xs" placeholder="Hint / description" />
                                  <button className="text-destructive hover:opacity-70" onClick={() => removeOption(si, oi)}>
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}
                              {step.options.length === 0 && (
                                <p className="text-xs text-muted-foreground py-2 text-center">No options yet — click "Add option"</p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                <Button size="sm" variant="outline" className="w-full h-8 gap-1.5 border-dashed text-muted-foreground" onClick={addStep}>
                  <Plus className="w-3.5 h-3.5" />Add Step
                </Button>
              </div>

              <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <RefreshCw className="w-3 h-3" />
                  <span>Factory defaults are restored when no config is stored in the database.</span>
                </div>
                <button className="text-xs text-destructive hover:opacity-70 flex items-center gap-1"
                  onClick={() => removeFlow(activeFlowIdx)}>
                  <Trash2 className="w-3 h-3" />Delete this flow
                </button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Guided selling tab audit trail */}
        <ChangeHistoryCard allRows={guidedAuditRows} emptyMessage="No guided selling changes recorded yet." />

        </>)}

      </div>
    </Layout>
  );
}
