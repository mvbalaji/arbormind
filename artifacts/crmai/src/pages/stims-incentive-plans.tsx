import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit2, Play, Users, TrendingUp, DollarSign, MoreHorizontal, CheckCircle } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const API = "/api";
const MEASURES = ["Revenue", "Gross Margin", "Units", "New Logos", "ARR", "Deals Won"];
const FREQUENCIES = ["monthly", "quarterly", "annual"];
const CURRENCIES = ["GBP", "USD", "EUR", "INR"];

type Tier = { id?: number; from_pct: number; to_pct: number | null; rate_pct: number; label: string };
type Plan = {
  id: number; name: string; version: number; status: string;
  effective_start: string; effective_end: string; currency: string;
  base_variable_split: number; ote_amount: number; payout_frequency: string;
  threshold_pct: number; cap_pct: number | null; measure: string; notes: string | null;
  tiers: Tier[]; assignment_count: number; created_at: string;
};
type User = { id: number; name: string; email: string };

const STATUS_COLOR: Record<string, string> = {
  draft: "secondary", active: "default", archived: "outline",
};

function fmt(n: number, currency = "GBP") {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
}

const DEFAULT_TIERS: Tier[] = [
  { from_pct: 0, to_pct: 70, rate_pct: 0, label: "Below Threshold" },
  { from_pct: 70, to_pct: 100, rate_pct: 80, label: "Threshold Band" },
  { from_pct: 100, to_pct: 120, rate_pct: 100, label: "On Target" },
  { from_pct: 120, to_pct: null, rate_pct: 150, label: "Accelerator" },
];

export default function StimsIncentivePlans() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editPlan, setEditPlan] = useState<Plan | null>(null);
  const [simulateOpen, setSimulateOpen] = useState(false);
  const [simulatePlan, setSimulatePlan] = useState<Plan | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignPlan, setAssignPlan] = useState<Plan | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Simulator state
  const [simAttainment, setSimAttainment] = useState("100");
  const [simQuota, setSimQuota] = useState("500000");
  const [simResult, setSimResult] = useState<{ payout: number; breakdown: string; attainment_pct?: number } | null>(null);
  const [simRunning, setSimRunning] = useState(false);

  // Builder form
  const [form, setForm] = useState({
    name: "", effective_start: "", effective_end: "", currency: "GBP",
    base_variable_split: "30", ote_amount: "", payout_frequency: "quarterly",
    threshold_pct: "70", cap_pct: "", measure: "Revenue", notes: "",
  });
  const [tiers, setTiers] = useState<Tier[]>(DEFAULT_TIERS);

  const { data: plans = [], isLoading } = useQuery<Plan[]>({
    queryKey: ["stims-incentive-plans"],
    queryFn: () => fetch(`${API}/stims/incentive-plans`).then(r => r.json()),
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["users-list"],
    queryFn: () => fetch(`${API}/users`).then(r => r.json()).then(d => d.data ?? d),
  });

  const createMut = useMutation({
    mutationFn: (data: any) =>
      fetch(`${API}/stims/incentive-plans`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stims-incentive-plans"] });
      setBuilderOpen(false);
      resetForm();
      toast({ title: "Incentive plan created" });
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      fetch(`${API}/stims/incentive-plans/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stims-incentive-plans"] });
      setBuilderOpen(false);
      setEditPlan(null);
      toast({ title: "Plan updated" });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => fetch(`${API}/stims/incentive-plans/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stims-incentive-plans"] });
      toast({ title: "Plan deleted" });
    },
  });

  const assignMut = useMutation({
    mutationFn: ({ planId, userIds }: { planId: number; userIds: number[] }) =>
      fetch(`${API}/stims/incentive-plans/${planId}/assign`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_ids: userIds, effective_start: new Date().toISOString().split("T")[0] }),
      }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stims-incentive-plans"] });
      setAssignOpen(false);
      toast({ title: "Users assigned to plan" });
    },
  });

  function resetForm() {
    setForm({ name: "", effective_start: "", effective_end: "", currency: "GBP",
      base_variable_split: "30", ote_amount: "", payout_frequency: "quarterly",
      threshold_pct: "70", cap_pct: "", measure: "Revenue", notes: "" });
    setTiers(DEFAULT_TIERS);
  }

  function openEdit(plan: Plan) {
    setEditPlan(plan);
    setForm({
      name: plan.name, effective_start: plan.effective_start?.split("T")[0] ?? "",
      effective_end: plan.effective_end?.split("T")[0] ?? "",
      currency: plan.currency, base_variable_split: String(plan.base_variable_split),
      ote_amount: String(plan.ote_amount), payout_frequency: plan.payout_frequency,
      threshold_pct: String(plan.threshold_pct), cap_pct: plan.cap_pct ? String(plan.cap_pct) : "",
      measure: plan.measure, notes: plan.notes ?? "",
    });
    setTiers(plan.tiers ?? DEFAULT_TIERS);
    setBuilderOpen(true);
  }

  function handleSave() {
    const payload = {
      ...form,
      base_variable_split: parseFloat(form.base_variable_split),
      ote_amount: parseFloat(form.ote_amount),
      threshold_pct: parseFloat(form.threshold_pct),
      cap_pct: form.cap_pct ? parseFloat(form.cap_pct) : null,
      tiers,
    };
    if (editPlan) {
      updateMut.mutate({ id: editPlan.id, data: payload });
    } else {
      createMut.mutate(payload);
    }
  }

  async function runSimulation() {
    if (!simulatePlan) return;
    setSimRunning(true);
    try {
      const r = await fetch(`${API}/stims/incentive-plans/${simulatePlan.id}/simulate`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attainment_pct: parseFloat(simAttainment), quota: parseFloat(simQuota) }),
      });
      const data = await r.json();
      setSimResult(data);
    } finally {
      setSimRunning(false);
    }
  }

  function updateTier(idx: number, field: keyof Tier, value: string) {
    setTiers(ts => ts.map((t, i) => i === idx ? { ...t, [field]: field === "label" ? value : (value === "" ? null : parseFloat(value)) } : t));
  }

  function addTier() {
    const last = tiers[tiers.length - 1];
    setTiers(ts => [...ts, { from_pct: last?.to_pct ?? 100, to_pct: null, rate_pct: 150, label: "New Tier" }]);
  }

  const [selectedUsers, setSelectedUsers] = useState<Set<number>>(new Set());

  return (
    <Layout>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-primary" /> Incentive Plans
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Design threshold-based bonus schemes with tiered accelerators
            </p>
          </div>
          <Button onClick={() => { resetForm(); setEditPlan(null); setBuilderOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" /> New Plan
          </Button>
        </div>

        {/* Plans grid */}
        <div className="grid gap-4">
          {isLoading ? (
            <Card className="p-10 text-center text-muted-foreground">Loading plans…</Card>
          ) : plans.length === 0 ? (
            <Card className="p-10 text-center text-muted-foreground">
              <TrendingUp className="h-10 w-10 mx-auto mb-3 opacity-30" />
              No incentive plans yet — create one to define payout curves
            </Card>
          ) : plans.map(plan => (
            <Card key={plan.id} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="font-semibold">{plan.name}</h3>
                    <Badge variant={STATUS_COLOR[plan.status] as any}>{plan.status}</Badge>
                    <span className="text-xs text-muted-foreground">v{plan.version}</span>
                    <span className="text-xs text-muted-foreground">
                      {plan.effective_start?.split("T")[0]} – {plan.effective_end?.split("T")[0] ?? "open-ended"}
                    </span>
                  </div>
                  <div className="flex gap-6 text-sm text-muted-foreground flex-wrap">
                    <span><DollarSign className="h-3.5 w-3.5 inline mr-0.5" />OTE: {fmt(Number(plan.ote_amount), plan.currency)}</span>
                    <span>Threshold: {plan.threshold_pct}%</span>
                    <span>Cap: {plan.cap_pct ? `${plan.cap_pct}%` : "None"}</span>
                    <span>Frequency: {plan.payout_frequency}</span>
                    <span>Measure: {plan.measure}</span>
                    <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{Number(plan.assignment_count)} reps</span>
                  </div>
                  {/* Tier summary pills */}
                  {plan.tiers?.length > 0 && (
                    <div className="flex gap-2 flex-wrap pt-1">
                      {plan.tiers.map((t, i) => (
                        <span key={i} className="text-xs px-2 py-0.5 bg-muted rounded-full">
                          {t.label || `${t.from_pct}%`}: {t.rate_pct}%
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEdit(plan)}>
                      <Edit2 className="h-4 w-4 mr-2" /> Edit Plan
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setSimulatePlan(plan); setSimResult(null); setSimulateOpen(true); }}>
                      <Play className="h-4 w-4 mr-2" /> Simulate
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setAssignPlan(plan); setSelectedUsers(new Set()); setAssignOpen(true); }}>
                      <Users className="h-4 w-4 mr-2" /> Assign Users
                    </DropdownMenuItem>
                    {plan.status === "draft" && (
                      <DropdownMenuItem onClick={() => updateMut.mutate({ id: plan.id, data: { ...plan, tiers: plan.tiers, status: "active" } })}>
                        <CheckCircle className="h-4 w-4 mr-2" /> Publish (Activate)
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(plan.id)}>
                      <Trash2 className="h-4 w-4 mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </Card>
          ))}
        </div>

        {/* Plan Builder dialog */}
        <Dialog open={builderOpen} onOpenChange={v => { if (!v) { setBuilderOpen(false); setEditPlan(null); } }}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editPlan ? "Edit Incentive Plan" : "New Incentive Plan"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-5">
              {/* Basic fields */}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1">
                  <Label>Plan Name</Label>
                  <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="FY2025 Sales Hunter Plan" />
                </div>
                <div className="space-y-1">
                  <Label>Effective From</Label>
                  <Input type="date" value={form.effective_start} onChange={e => setForm(f => ({ ...f, effective_start: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Effective To</Label>
                  <Input type="date" value={form.effective_end} onChange={e => setForm(f => ({ ...f, effective_end: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>OTE Amount (variable pay at 100%)</Label>
                  <Input type="number" value={form.ote_amount} onChange={e => setForm(f => ({ ...f, ote_amount: e.target.value }))} placeholder="20000" />
                </div>
                <div className="space-y-1">
                  <Label>Currency</Label>
                  <Select value={form.currency} onValueChange={v => setForm(f => ({ ...f, currency: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Base:Variable Split (variable %)</Label>
                  <Input type="number" min={0} max={100} value={form.base_variable_split}
                    onChange={e => setForm(f => ({ ...f, base_variable_split: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Payout Frequency</Label>
                  <Select value={form.payout_frequency} onValueChange={v => setForm(f => ({ ...f, payout_frequency: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{FREQUENCIES.map(f => <SelectItem key={f} value={f} className="capitalize">{f}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Threshold (minimum attainment for any payout)</Label>
                  <div className="flex items-center gap-1">
                    <Input type="number" min={0} max={100} value={form.threshold_pct}
                      onChange={e => setForm(f => ({ ...f, threshold_pct: e.target.value }))} />
                    <span className="text-muted-foreground text-sm">%</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Cap (max attainment for payout, blank = no cap)</Label>
                  <div className="flex items-center gap-1">
                    <Input type="number" value={form.cap_pct} onChange={e => setForm(f => ({ ...f, cap_pct: e.target.value }))} placeholder="—" />
                    <span className="text-muted-foreground text-sm">%</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Measure</Label>
                  <Select value={form.measure} onValueChange={v => setForm(f => ({ ...f, measure: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{MEASURES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-1">
                  <Label>Notes</Label>
                  <Textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                </div>
              </div>

              {/* Tier editor */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm">Payout Tiers</h4>
                  <Button size="sm" variant="outline" onClick={addTier}><Plus className="h-3.5 w-3.5 mr-1" />Add Tier</Button>
                </div>
                <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                  Rate % of OTE paid when attainment falls in this band. 0% = no payout. Use &gt;100% for accelerators.
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Label</TableHead>
                      <TableHead className="text-right">From %</TableHead>
                      <TableHead className="text-right">To % (blank=∞)</TableHead>
                      <TableHead className="text-right">Rate %</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tiers.map((t, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <Input className="h-7 text-xs" value={t.label} onChange={e => updateTier(idx, "label", e.target.value)} />
                        </TableCell>
                        <TableCell>
                          <Input className="h-7 text-xs text-right" type="number" value={t.from_pct}
                            onChange={e => updateTier(idx, "from_pct", e.target.value)} />
                        </TableCell>
                        <TableCell>
                          <Input className="h-7 text-xs text-right" type="number" value={t.to_pct ?? ""}
                            placeholder="∞" onChange={e => updateTier(idx, "to_pct", e.target.value)} />
                        </TableCell>
                        <TableCell>
                          <Input className="h-7 text-xs text-right" type="number" value={t.rate_pct}
                            onChange={e => updateTier(idx, "rate_pct", e.target.value)} />
                        </TableCell>
                        <TableCell>
                          <Button size="icon" variant="ghost" className="h-7 w-7"
                            onClick={() => setTiers(ts => ts.filter((_, i) => i !== idx))}>
                            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setBuilderOpen(false); setEditPlan(null); }}>Cancel</Button>
              <Button onClick={handleSave} disabled={!form.name || !form.ote_amount || createMut.isPending || updateMut.isPending}>
                {(createMut.isPending || updateMut.isPending) ? "Saving…" : editPlan ? "Update Plan" : "Create Plan"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Simulator dialog */}
        <Dialog open={simulateOpen} onOpenChange={setSimulateOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Plan Simulator — {simulatePlan?.name}</DialogTitle></DialogHeader>
            {simulatePlan && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Attainment %</Label>
                    <Input type="number" value={simAttainment} onChange={e => setSimAttainment(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Quota Amount</Label>
                    <Input type="number" value={simQuota} onChange={e => setSimQuota(e.target.value)} />
                  </div>
                </div>
                <Button onClick={runSimulation} disabled={simRunning} className="w-full">
                  {simRunning ? "Calculating…" : "Calculate Payout"}
                </Button>
                {simResult && (
                  <div className="bg-muted rounded-lg p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Attainment</span>
                      <span className="font-semibold">{simResult.attainment_pct?.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Payout</span>
                      <span className="font-bold text-lg text-green-600">
                        {fmt(Number(simResult.payout), simulatePlan.currency)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground border-t pt-2">{simResult.breakdown}</p>
                  </div>
                )}
                {/* Tier reference */}
                <div className="text-xs space-y-1">
                  <p className="font-medium text-muted-foreground">Tier reference</p>
                  {simulatePlan.tiers?.map((t, i) => (
                    <div key={i} className="flex justify-between">
                      <span>{t.label || `${t.from_pct}%–${t.to_pct ?? "∞"}%`}</span>
                      <span>{t.rate_pct}% of OTE</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Assign users dialog */}
        <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
          <DialogContent className="max-w-lg max-h-[70vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Assign Users — {assignPlan?.name}</DialogTitle></DialogHeader>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Select users to link to this incentive plan.</p>
              <div className="divide-y border rounded-lg overflow-hidden">
                {users.map(u => (
                  <label key={u.id} className="flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer">
                    <input type="checkbox" checked={selectedUsers.has(u.id)}
                      onChange={e => setSelectedUsers(prev => {
                        const next = new Set(prev);
                        e.target.checked ? next.add(u.id) : next.delete(u.id);
                        return next;
                      })} />
                    <div>
                      <p className="text-sm font-medium">{u.name}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAssignOpen(false)}>Cancel</Button>
              <Button onClick={() => assignMut.mutate({ planId: assignPlan!.id, userIds: Array.from(selectedUsers) })}
                disabled={selectedUsers.size === 0 || assignMut.isPending}>
                Assign {selectedUsers.size} User{selectedUsers.size !== 1 ? "s" : ""}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete confirm */}
        <AlertDialog open={deleteId !== null} onOpenChange={v => !v && setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Incentive Plan?</AlertDialogTitle>
              <AlertDialogDescription>Tier definitions and assignments will also be removed.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction className="bg-destructive text-destructive-foreground"
                onClick={() => { deleteMut.mutate(deleteId!); setDeleteId(null); }}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}
