import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useCurrency } from "@/context/currency";
import { useCpqEnabled } from "@/context/cpq-feature";
import { useAuth } from "@/context/auth";
import {
  TrendingUp, Lock, ShieldCheck, Users, Calculator,
  Pencil, Save, X, Plus, Trash2,
} from "lucide-react";

const APPROVER_COLORS = [
  { color: "bg-blue-100 text-blue-700", bar: "bg-blue-400" },
  { color: "bg-yellow-100 text-yellow-700", bar: "bg-yellow-400" },
  { color: "bg-orange-100 text-orange-700", bar: "bg-orange-400" },
  { color: "bg-red-100 text-red-700", bar: "bg-red-500" },
  { color: "bg-purple-100 text-purple-700", bar: "bg-purple-500" },
];

const PARTNER_COLORS = [
  "bg-gray-100 text-gray-700",
  "bg-slate-100 text-slate-600",
  "bg-yellow-100 text-yellow-700",
  "bg-purple-100 text-purple-700",
  "bg-cyan-100 text-cyan-700",
];

interface VolumeTier { min: number; max: number | null; disc: number }
interface ApprovalThreshold { pct: number; approver: string }
interface PartnerTier { tier: string; disc: number }

export default function CpqPricing() {
  const [, navigate] = useLocation();
  const { format: fmtMoney } = useCurrency();
  const { cpqEnabled, isLoading: cpqLoading } = useCpqEnabled();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  const queryClient = useQueryClient();

  const { data: pricingConfig, isLoading: configLoading } = useQuery({
    queryKey: ["cpq-pricing-settings"],
    queryFn: () => fetch("/api/settings/cpq/pricing", { credentials: "include" }).then((r) => r.json()),
  });

  // Edit state — null means not in edit mode
  const [editVT, setEditVT] = useState<VolumeTier[] | null>(null);
  const [editAT, setEditAT] = useState<ApprovalThreshold[] | null>(null);
  const [editPT, setEditPT] = useState<PartnerTier[] | null>(null);

  const serverVT: VolumeTier[] = pricingConfig?.volumeTiers ?? [];
  const serverAT: ApprovalThreshold[] = pricingConfig?.approvalThresholds ?? [];
  const serverPT: PartnerTier[] = pricingConfig?.partnerTiers ?? [];

  const displayVT = editVT ?? serverVT;
  const displayAT = editAT ?? serverAT;
  const displayPT = editPT ?? serverPT;

  const editing = editVT !== null || editAT !== null || editPT !== null;

  const saveMutation = useMutation({
    mutationFn: () =>
      fetch("/api/settings/cpq/pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ volumeTiers: displayVT, approvalThresholds: displayAT, partnerTiers: displayPT }),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cpq-pricing-settings"] });
      setEditVT(null); setEditAT(null); setEditPT(null);
    },
  });

  const discard = () => { setEditVT(null); setEditAT(null); setEditPT(null); };
  const startEdit = () => {
    setEditVT(JSON.parse(JSON.stringify(serverVT)));
    setEditAT(JSON.parse(JSON.stringify(serverAT)));
    setEditPT(JSON.parse(JSON.stringify(serverPT)));
  };

  // Volume tier helpers
  const updateVT = (idx: number, field: keyof VolumeTier, val: string) =>
    setEditVT((prev) => (prev ?? []).map((t, i) =>
      i === idx ? { ...t, [field]: field === "min" || field === "disc" ? Number(val) : val === "" ? null : Number(val) } : t
    ));
  const addVT = () => setEditVT([...(editVT ?? serverVT), { min: 0, max: null, disc: 0 }]);
  const removeVT = (idx: number) => setEditVT((editVT ?? serverVT).filter((_, i) => i !== idx));

  // Approval threshold helpers
  const updateAT = (idx: number, field: keyof ApprovalThreshold, val: string) =>
    setEditAT((prev) => (prev ?? []).map((t, i) =>
      i === idx ? { ...t, [field]: field === "pct" ? Number(val) : val } : t
    ));
  const addAT = () => setEditAT([...(editAT ?? serverAT), { pct: 0, approver: "Approver" }]);
  const removeAT = (idx: number) => setEditAT((editAT ?? serverAT).filter((_, i) => i !== idx));

  // Partner tier helpers
  const updatePT = (idx: number, field: keyof PartnerTier, val: string) =>
    setEditPT((prev) => (prev ?? []).map((t, i) =>
      i === idx ? { ...t, [field]: field === "disc" ? Number(val) : val } : t
    ));
  const addPT = () => setEditPT([...(editPT ?? serverPT), { tier: "New Tier", disc: 0 }]);
  const removePT = (idx: number) => setEditPT((editPT ?? serverPT).filter((_, i) => i !== idx));

  // Margin calculator state
  const [listPrice, setListPrice] = useState("10000");
  const [costPrice, setCostPrice] = useState("6000");
  const [discountPct, setDiscountPct] = useState("10");

  if (!cpqLoading && !cpqEnabled) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
            <Lock className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold">CPQ Module Not Enabled</h2>
          <p className="text-muted-foreground text-sm text-center max-w-sm">
            The Configure-Price-Quote module is not enabled for your account. Contact your administrator to enable CPQ.
          </p>
          <Button variant="outline" onClick={() => navigate("/quotes")}>Go to Standard Quoting</Button>
        </div>
      </Layout>
    );
  }

  const list = parseFloat(listPrice) || 0;
  const cost = parseFloat(costPrice) || 0;
  const disc = parseFloat(discountPct) || 0;
  const netPrice = list * (1 - disc / 100);
  const grossMarginAmt = netPrice - cost;
  const marginPct = netPrice > 0 ? (grossMarginAmt / netPrice) * 100 : 0;
  const markupPct = cost > 0 ? ((netPrice - cost) / cost) * 100 : 0;

  const volDisc = displayVT.length > 1 ? (displayVT[1]?.disc ?? 0) : 5;
  const partnerDisc = displayPT.length > 1 ? (displayPT[1]?.disc ?? 0) : 10;
  const wfAfterVolume = list * (1 - volDisc / 100);
  const wfAfterPartner = wfAfterVolume * (1 - partnerDisc / 100);
  const wfAfterApproved = wfAfterPartner * (1 - disc / 100);
  const maxDisc = displayVT.reduce((m, t) => Math.max(m, t.disc), 1);

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Pricing Rules</h1>
              <p className="text-sm text-muted-foreground">Tiered pricing, approval thresholds, partner discounts, and margin tools.</p>
            </div>
          </div>

          {isAdmin && !editing && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={startEdit}>
              <Pencil className="w-3.5 h-3.5" /> Edit Rules
            </Button>
          )}
          {isAdmin && editing && (
            <div className="flex gap-2">
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 gap-1.5" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
                <Save className="w-3.5 h-3.5" /> {saveMutation.isPending ? "Saving…" : "Save Changes"}
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={discard}>
                <X className="w-3.5 h-3.5" /> Discard
              </Button>
            </div>
          )}
        </div>

        {editing && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-2.5 text-sm text-amber-800 flex items-center gap-2">
            <Pencil className="w-3.5 h-3.5 shrink-0" />
            You are editing pricing rules. Changes apply org-wide when saved.
          </div>
        )}

        {configLoading ? (
          <p className="text-sm text-muted-foreground">Loading pricing rules…</p>
        ) : (
          <>
            {/* Volume Pricing Tiers */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-orange-500" />
                  Volume Pricing Tiers
                </CardTitle>
              </CardHeader>
              <CardContent>
                {editing ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 text-xs text-muted-foreground font-medium px-1">
                      <span>Min Qty</span><span>Max Qty (blank = ∞)</span><span>Discount %</span><span />
                    </div>
                    {displayVT.map((t, idx) => (
                      <div key={idx} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center">
                        <Input type="number" min={0} value={t.min} onChange={(e) => updateVT(idx, "min", e.target.value)} className="h-8 text-sm" />
                        <Input type="number" min={0} value={t.max ?? ""} placeholder="∞" onChange={(e) => updateVT(idx, "max", e.target.value)} className="h-8 text-sm" />
                        <Input type="number" min={0} max={100} value={t.disc} onChange={(e) => updateVT(idx, "disc", e.target.value)} className="h-8 text-sm" />
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeVT(idx)}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" className="gap-1.5 mt-1" onClick={addVT}><Plus className="w-3.5 h-3.5" /> Add Tier</Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-muted-foreground text-xs uppercase tracking-wide">
                          <th className="text-left pb-2">Quantity Range</th>
                          <th className="text-right pb-2">Discount</th>
                          <th className="text-right pb-2">Visual</th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayVT.map((t, idx) => (
                          <tr key={idx} className="border-b border-border last:border-0">
                            <td className="py-2.5 font-medium">
                              {t.max === null || t.max === 0 ? `${t.min}+` : `${t.min} – ${t.max}`}
                            </td>
                            <td className="py-2.5 text-right">
                              <Badge className={t.disc === 0 ? "bg-muted text-muted-foreground" : "bg-green-100 text-green-700"}>{t.disc}%</Badge>
                            </td>
                            <td className="py-2.5 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <div className="h-2 rounded-full bg-muted w-32 overflow-hidden">
                                  <div className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full" style={{ width: `${(t.disc / maxDisc) * 100}%` }} />
                                </div>
                                <span className="text-xs text-muted-foreground w-8 text-right">{t.disc}%</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Approval Escalation Ladder */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-500" />
                  Approval Escalation Ladder
                </CardTitle>
              </CardHeader>
              <CardContent>
                {editing ? (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground mb-2">When discount exceeds the threshold %, the specified approver is required.</p>
                    <div className="grid grid-cols-[1fr_2fr_auto] gap-2 text-xs text-muted-foreground font-medium px-1">
                      <span>Discount % threshold</span><span>Approver role</span><span />
                    </div>
                    {displayAT.map((t, idx) => {
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
                    <Button variant="outline" size="sm" className="gap-1.5 mt-1" onClick={addAT}><Plus className="w-3.5 h-3.5" /> Add Level</Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {displayAT.map((a, idx) => {
                      const c = APPROVER_COLORS[idx % APPROVER_COLORS.length];
                      return (
                        <div key={idx} className="border border-border rounded-lg p-4 flex flex-col items-center text-center gap-2">
                          <div className={`w-8 h-8 rounded-full ${c.bar} flex items-center justify-center text-white font-bold text-sm`}>{idx + 1}</div>
                          <p className="text-lg font-bold">&gt;{a.pct}%</p>
                          <Badge className={`text-xs ${c.color}`}>{a.approver}</Badge>
                          <p className="text-xs text-muted-foreground">approval required</p>
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
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-500" />
                  Partner Pricing Tiers
                </CardTitle>
              </CardHeader>
              <CardContent>
                {editing ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-[2fr_1fr_auto] gap-2 text-xs text-muted-foreground font-medium px-1">
                      <span>Tier name</span><span>Discount %</span><span />
                    </div>
                    {displayPT.map((p, idx) => (
                      <div key={idx} className="grid grid-cols-[2fr_1fr_auto] gap-2 items-center">
                        <Input value={p.tier} onChange={(e) => updatePT(idx, "tier", e.target.value)} className="h-8 text-sm" placeholder="Tier name" />
                        <Input type="number" min={0} max={100} value={p.disc} onChange={(e) => updatePT(idx, "disc", e.target.value)} className="h-8 text-sm" />
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removePT(idx)}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" className="gap-1.5 mt-1" onClick={addPT}><Plus className="w-3.5 h-3.5" /> Add Partner Tier</Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {displayPT.map((p, idx) => (
                      <div key={idx} className="border border-border rounded-lg p-4 text-center">
                        <Badge className={`${PARTNER_COLORS[idx % PARTNER_COLORS.length]} text-xs mb-2`}>{p.tier}</Badge>
                        <p className="text-2xl font-bold">{p.disc}%</p>
                        <p className="text-xs text-muted-foreground mt-0.5">discount multiplier</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* Margin Calculator + Price Waterfall */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Calculator className="w-4 h-4 text-emerald-500" />
                Margin Calculator
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">List Price</label>
                  <Input value={listPrice} onChange={(e) => setListPrice(e.target.value)} placeholder="10000" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Cost Price</label>
                  <Input value={costPrice} onChange={(e) => setCostPrice(e.target.value)} placeholder="6000" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Discount %</label>
                  <Input value={discountPct} onChange={(e) => setDiscountPct(e.target.value)} placeholder="10" />
                </div>
              </div>
              <div className="border-t border-border pt-4 space-y-2.5">
                {[
                  { label: "Net Price", value: fmtMoney(netPrice), bold: true },
                  { label: "Gross Margin", value: fmtMoney(grossMarginAmt), color: grossMarginAmt >= 0 ? "text-green-700" : "text-red-600" },
                  { label: "Margin %", value: `${marginPct.toFixed(1)}%`, color: marginPct >= 20 ? "text-green-700" : marginPct >= 0 ? "text-yellow-700" : "text-red-600" },
                  { label: "Markup %", value: `${markupPct.toFixed(1)}%` },
                ].map((row) => (
                  <div key={row.label} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className={`font-semibold ${(row as any).color ?? ""} ${(row as any).bold ? "text-base" : ""}`}>{row.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Price Waterfall</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-4">
                Based on list price of {fmtMoney(list)} with example discounts (vol {volDisc}%, partner {partnerDisc}%, approved {disc}%).
              </p>
              <div className="space-y-3">
                {[
                  { label: "List Price", value: list, color: "bg-blue-500" },
                  { label: `After Volume Disc (${volDisc}%)`, value: wfAfterVolume, color: "bg-blue-400" },
                  { label: `After Partner Disc (${partnerDisc}%)`, value: wfAfterPartner, color: "bg-indigo-400" },
                  { label: `After Approved Disc (${disc}%)`, value: wfAfterApproved, color: "bg-emerald-500" },
                ].map((step) => (
                  <div key={step.label}>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>{step.label}</span>
                      <span className="font-medium text-foreground">{fmtMoney(step.value)}</span>
                    </div>
                    <div className="h-5 bg-muted rounded overflow-hidden">
                      <div className={`h-full ${step.color} rounded transition-all duration-500`}
                        style={{ width: `${list > 0 ? (step.value / list) * 100 : 0}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
