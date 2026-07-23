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
} from "lucide-react";

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
};

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

export default function CpqAdmin() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const isAdmin = user?.role === "admin" || user?.role === "super_admin";

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

  // Audit log
  const [auditExpanded, setAuditExpanded] = useState(true);
  const { data: auditData } = useQuery({
    queryKey: ["cpq-audit"],
    queryFn: () => fetch("/api/settings/cpq/audit", { credentials: "include" }).then((r) => r.json()),
  });
  const allAuditRows = flattenAudit(auditData?.entries ?? []);

  // Filter state
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterUser, setFilterUser] = useState("");
  const [filterSection, setFilterSection] = useState("");
  const [filterField, setFilterField] = useState("");

  // Sort state
  type SortKey = "date" | "user" | "section" | "action";
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const uniqueUsers = Array.from(new Set(allAuditRows.map((r) => r.user)));
  const uniqueSections = Array.from(new Set(allAuditRows.map((r) => r.section)));

  const fieldKeywords = Array.from(new Set(
    allAuditRows.flatMap((r) => {
      const names: string[] = [];
      const tierM = r.action.match(/Tier\s+\d+/gi);
      if (tierM) names.push(...tierM.map((s) => s.trim()));
      const levelM = r.action.match(/Level\s+\d+/gi);
      if (levelM) names.push(...levelM.map((s) => s.trim()));
      const quotedM = r.action.match(/"([^"]+)"/g);
      if (quotedM) names.push(...quotedM.map((s) => s.replace(/"/g, "")));
      return names;
    })
  )).sort();

  const auditRows = allAuditRows
    .filter((r) => {
      if (filterDateFrom && r.rawDate.slice(0, 10) < filterDateFrom) return false;
      if (filterDateTo && r.rawDate.slice(0, 10) > filterDateTo) return false;
      if (filterUser && r.user !== filterUser) return false;
      if (filterSection && r.section !== filterSection) return false;
      if (filterField && !r.action.toLowerCase().includes(filterField.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      const av = sortKey === "date" ? a.rawDate : a[sortKey];
      const bv = sortKey === "date" ? b.rawDate : b[sortKey];
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });

  const hasFilters = !!filterDateFrom || !!filterDateTo || !!filterUser || !!filterSection || !!filterField;
  const clearFilters = () => { setFilterDateFrom(""); setFilterDateTo(""); setFilterUser(""); setFilterSection(""); setFilterField(""); };

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
            <p className="text-sm text-muted-foreground">Configure pricing rules. All changes are audited. Use App Management to enable/disable the CPQ module.</p>
          </div>
        </div>

        {/* Summary card — full width */}
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

        <h2 className="text-base font-semibold">Pricing Rules Configuration</h2>

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

        {/* Change History */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3 cursor-pointer select-none" onClick={() => setAuditExpanded((v) => !v)}>
            <CardTitle className="text-sm flex items-center justify-between">
              <span className="flex items-center gap-2">
                <History className="w-4 h-4 text-muted-foreground" />
                Change History
                <Badge className="bg-muted text-muted-foreground text-xs">
                  {auditRows.length}{hasFilters && ` of ${allAuditRows.length}`}
                </Badge>
              </span>
              {auditExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </CardTitle>
          </CardHeader>
          {auditExpanded && (
            <CardContent className="p-0">
              {allAuditRows.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8 px-4">
                  No changes recorded yet. Changes made to pricing rules will appear here.
                </p>
              ) : (
                <>
                  {/* Filter bar */}
                  <div className="border-b border-border bg-muted/20 px-4 py-3 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="text-xs text-muted-foreground font-medium">Date from</span>
                      <input
                        type="date"
                        value={filterDateFrom}
                        onChange={(e) => setFilterDateFrom(e.target.value)}
                        className="h-7 text-xs px-2 rounded border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <span className="text-xs text-muted-foreground font-medium">to</span>
                      <input
                        type="date"
                        value={filterDateTo}
                        onChange={(e) => setFilterDateTo(e.target.value)}
                        min={filterDateFrom || undefined}
                        className="h-7 text-xs px-2 rounded border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <select
                        value={filterUser}
                        onChange={(e) => setFilterUser(e.target.value)}
                        className="h-7 text-xs px-2 rounded border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="">All users</option>
                        {uniqueUsers.map((u) => <option key={u} value={u}>{u}</option>)}
                      </select>
                      <select
                        value={filterSection}
                        onChange={(e) => setFilterSection(e.target.value)}
                        className="h-7 text-xs px-2 rounded border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="">All sections</option>
                        {uniqueSections.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <select
                        value={filterField}
                        onChange={(e) => setFilterField(e.target.value)}
                        className="h-7 text-xs px-2 rounded border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="">All fields</option>
                        {fieldKeywords.map((k) => <option key={k} value={k}>{k}</option>)}
                      </select>
                      {hasFilters && (
                        <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-muted-foreground ml-auto" onClick={clearFilters}>
                          <FilterX className="w-3.5 h-3.5" /> Clear all
                        </Button>
                      )}
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

                  {auditRows.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No records match the current filters.</p>
                  ) : (
                    <div className="max-h-80 overflow-y-auto">
                    <table className="w-full text-sm table-fixed">
                      <colgroup>
                        <col style={{ width: "148px" }} />
                        <col style={{ width: "112px" }} />
                        <col />
                        <col style={{ width: "160px" }} />
                      </colgroup>
                      <thead>
                        <tr className="border-b-2 border-border bg-muted/50">
                          {(["date", "user", "action", "section"] as const).map((col) => {
                            const labels: Record<string, string> = { date: "Date", user: "User", action: "Action", section: "Section" };
                            const active = sortKey === col;
                            return (
                              <th
                                key={col}
                                className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3 cursor-pointer select-none hover:text-foreground transition-colors sticky top-0 bg-muted/50 z-10"
                                onClick={() => handleSort(col)}
                              >
                                <span className="flex items-center gap-1">
                                  {labels[col]}
                                  {active
                                    ? sortDir === "asc"
                                      ? <ArrowUp className="w-3 h-3" />
                                      : <ArrowDown className="w-3 h-3" />
                                    : <ArrowUpDown className="w-3 h-3 opacity-30" />}
                                </span>
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {auditRows.map((row, i) => (
                          <tr key={row.id} className={`border-b border-border last:border-0 hover:bg-muted/30 transition-colors ${i % 2 === 0 ? "" : "bg-muted/10"}`}>
                            <td className="px-4 py-3 text-xs text-muted-foreground align-top">{row.date}</td>
                            <td className="px-4 py-3 text-sm font-medium text-foreground align-top truncate">{row.user}</td>
                            <td className="px-4 py-3 text-sm text-foreground align-top">{row.action}</td>
                            <td className="px-4 py-3 align-top">
                              <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium break-words">{row.section}</span>
                            </td>
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
      </div>
    </Layout>
  );
}
