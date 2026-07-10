import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Plus, Target, Trash2, Users, CheckCircle, MoreHorizontal, Settings2 } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const API = "/api";
const METRICS = ["Revenue", "Units", "Gross Margin", "New Logos", "ARR", "Deals Won"];
const METHODS = ["equal", "historical-weighted", "manual"];
const CURRENCIES = ["GBP", "USD", "EUR", "INR"];

type FiscalPeriod = { id: number; name: string; period_type: string; start_date: string; end_date: string };
type Cycle = {
  id: number; name: string; fiscal_period_id: number; period_name: string;
  metric: string; total_target: number; allocation_method: string; scope: string;
  currency: string; growth_pct: number; status: string; created_by_name: string;
  created_at: string;
};
type User = { id: number; name: string; email: string; role: string };
type Quota = {
  id: number; cycle_id: number; user_id: number; user_name: string; user_email: string;
  quota_amount: number; ramp_pct: number; is_new_hire: boolean; approved: boolean;
};

const STATUS_COLOR: Record<string, string> = {
  draft: "secondary", submitted: "outline", approved: "default", published: "default",
};

function fmt(n: number, currency = "GBP") {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
}

export default function StimsTargetCycles() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedCycle, setSelectedCycle] = useState<Cycle | null>(null);
  const [allocationCycle, setAllocationCycle] = useState<Cycle | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Form state
  const [form, setForm] = useState({
    name: "", fiscal_period_id: "", metric: "Revenue", total_target: "",
    allocation_method: "equal", scope: "All", currency: "GBP", growth_pct: "0",
  });

  const { data: periods = [] } = useQuery<FiscalPeriod[]>({
    queryKey: ["stims-fiscal-periods"],
    queryFn: () => fetch(`${API}/stims/fiscal-periods`).then(r => r.json()),
  });

  const { data: cycles = [], isLoading } = useQuery<Cycle[]>({
    queryKey: ["stims-target-cycles"],
    queryFn: () => fetch(`${API}/stims/target-cycles`).then(r => r.json()),
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["users-list"],
    queryFn: () => fetch(`${API}/users`).then(r => r.json()).then(d => d.data ?? d),
  });

  const { data: quotas = [], refetch: refetchQuotas } = useQuery<Quota[]>({
    queryKey: ["stims-quotas", allocationCycle?.id],
    queryFn: () => fetch(`${API}/stims/target-cycles/${allocationCycle!.id}/quotas`).then(r => r.json()),
    enabled: !!allocationCycle,
  });

  const createMut = useMutation({
    mutationFn: (data: typeof form) =>
      fetch(`${API}/stims/target-cycles`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, total_target: parseFloat(data.total_target), growth_pct: parseFloat(data.growth_pct) }),
      }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stims-target-cycles"] });
      setCreateOpen(false);
      toast({ title: "Target cycle created" });
    },
  });

  const updateStatusMut = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      fetch(`${API}/stims/target-cycles/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["stims-target-cycles"] }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => fetch(`${API}/stims/target-cycles/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stims-target-cycles"] });
      toast({ title: "Cycle deleted" });
    },
  });

  const distributeMut = useMutation({
    mutationFn: ({ cycleId, userIds }: { cycleId: number; userIds: number[] }) =>
      fetch(`${API}/stims/target-cycles/${cycleId}/distribute`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_ids: userIds, allocation_method: allocationCycle?.allocation_method }),
      }).then(r => r.json()),
    onSuccess: () => {
      refetchQuotas();
      toast({ title: "Quotas distributed equally" });
    },
  });

  const saveQuotaMut = useMutation({
    mutationFn: ({ cycleId, userId, amount, ramp }: { cycleId: number; userId: number; amount: number; ramp: number }) =>
      fetch(`${API}/stims/target-cycles/${cycleId}/quotas`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, quota_amount: amount, ramp_pct: ramp }),
      }).then(r => r.json()),
    onSuccess: () => refetchQuotas(),
  });

  const nextStatus: Record<string, string> = { draft: "submitted", submitted: "approved", approved: "published" };
  const nextLabel: Record<string, string> = { draft: "Submit", submitted: "Approve", approved: "Publish" };

  const salesReps = users.filter(u => u.role === "sales_rep" || u.role === "user" || !u.role);
  const allocatedIds = new Set(quotas.map(q => q.user_id));
  const totalAllocated = quotas.reduce((s, q) => s + Number(q.quota_amount), 0);
  const variance = allocationCycle ? (Number(allocationCycle.total_target) - totalAllocated) : 0;

  return (
    <Layout>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Target className="h-6 w-6 text-primary" /> Target Cycles
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Create and manage sales quota cycles with per-rep allocation
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> New Cycle
          </Button>
        </div>

        {/* Cycles list */}
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cycle Name</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Metric</TableHead>
                <TableHead className="text-right">Total Target</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">Loading…</TableCell></TableRow>
              ) : cycles.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">No target cycles yet</TableCell></TableRow>
              ) : cycles.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>{c.period_name ?? "—"}</TableCell>
                  <TableCell>{c.metric}</TableCell>
                  <TableCell className="text-right font-mono">{fmt(Number(c.total_target), c.currency)}</TableCell>
                  <TableCell className="capitalize">{c.allocation_method}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_COLOR[c.status] as any}>{c.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setAllocationCycle(c)}>
                          <Users className="h-4 w-4 mr-2" /> Allocate Quotas
                        </DropdownMenuItem>
                        {nextStatus[c.status] && (
                          <DropdownMenuItem onClick={() => updateStatusMut.mutate({ id: c.id, status: nextStatus[c.status] })}>
                            <CheckCircle className="h-4 w-4 mr-2" /> {nextLabel[c.status]}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(c.id)}>
                          <Trash2 className="h-4 w-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        {/* Create dialog */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>New Target Cycle</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Cycle Name</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="FY2025 Q1 Revenue" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Fiscal Period</Label>
                  <Select value={form.fiscal_period_id} onValueChange={v => setForm(f => ({ ...f, fiscal_period_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select period" /></SelectTrigger>
                    <SelectContent>
                      {periods.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Metric</Label>
                  <Select value={form.metric} onValueChange={v => setForm(f => ({ ...f, metric: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{METRICS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Total Target</Label>
                  <Input type="number" value={form.total_target} onChange={e => setForm(f => ({ ...f, total_target: e.target.value }))} placeholder="1000000" />
                </div>
                <div className="space-y-1">
                  <Label>Currency</Label>
                  <Select value={form.currency} onValueChange={v => setForm(f => ({ ...f, currency: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Allocation Method</Label>
                  <Select value={form.allocation_method} onValueChange={v => setForm(f => ({ ...f, allocation_method: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{METHODS.map(m => <SelectItem key={m} value={m} className="capitalize">{m}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Growth % vs Prior Year</Label>
                  <Input type="number" value={form.growth_pct} onChange={e => setForm(f => ({ ...f, growth_pct: e.target.value }))} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button onClick={() => createMut.mutate(form)} disabled={!form.name || !form.total_target || createMut.isPending}>
                {createMut.isPending ? "Creating…" : "Create Cycle"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Allocation dialog */}
        <Dialog open={!!allocationCycle} onOpenChange={v => !v && setAllocationCycle(null)}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" /> Quota Allocation — {allocationCycle?.name}
              </DialogTitle>
            </DialogHeader>
            {allocationCycle && (
              <div className="space-y-4">
                {/* Variance banner */}
                <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${Math.abs(variance) < 1 ? "bg-green-50 text-green-700 border border-green-200" : "bg-yellow-50 text-yellow-700 border border-yellow-200"}`}>
                  {Math.abs(variance) < 1
                    ? <CheckCircle className="h-4 w-4" />
                    : <Settings2 className="h-4 w-4" />}
                  Total target: {fmt(Number(allocationCycle.total_target), allocationCycle.currency)} |
                  Allocated: {fmt(totalAllocated, allocationCycle.currency)} |
                  Variance: {fmt(Math.abs(variance), allocationCycle.currency)} {variance > 0 ? "unallocated" : variance < 0 ? "over-allocated" : "✓ balanced"}
                </div>

                {/* Quick distribute */}
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() =>
                    distributeMut.mutate({ cycleId: allocationCycle.id, userIds: salesReps.map(u => u.id) })
                  } disabled={distributeMut.isPending}>
                    Distribute Equally to All Reps
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {salesReps.length} reps · {fmt(Number(allocationCycle.total_target) / salesReps.length, allocationCycle.currency)} each
                  </span>
                </div>

                {/* Per-rep table */}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rep</TableHead>
                      <TableHead className="text-right">Quota</TableHead>
                      <TableHead className="text-right">Ramp %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salesReps.map(u => {
                      const q = quotas.find(qt => qt.user_id === u.id);
                      return (
                        <QuotaRow key={u.id} user={u} quota={q} cycleId={allocationCycle.id}
                          currency={allocationCycle.currency} onSave={saveQuotaMut.mutate} />
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
            <DialogFooter>
              <Button onClick={() => setAllocationCycle(null)}>Done</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete confirm */}
        <AlertDialog open={deleteId !== null} onOpenChange={v => !v && setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Target Cycle?</AlertDialogTitle>
              <AlertDialogDescription>This will also remove all associated quota allocations.</AlertDialogDescription>
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

function QuotaRow({ user, quota, cycleId, currency, onSave }: {
  user: { id: number; name: string; email: string };
  quota?: Quota;
  cycleId: number;
  currency: string;
  onSave: (d: { cycleId: number; userId: number; amount: number; ramp: number }) => void;
}) {
  const [amount, setAmount] = useState(quota ? String(quota.quota_amount) : "");
  const [ramp, setRamp] = useState(quota ? String(quota.ramp_pct) : "100");

  return (
    <TableRow>
      <TableCell>
        <p className="font-medium text-sm">{user.name}</p>
        <p className="text-xs text-muted-foreground">{user.email}</p>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1">
          <Input className="w-32 text-right h-8 text-sm" type="number" value={amount}
            onChange={e => setAmount(e.target.value)}
            onBlur={() => amount && onSave({ cycleId, userId: user.id, amount: parseFloat(amount), ramp: parseFloat(ramp) || 100 })}
          />
        </div>
      </TableCell>
      <TableCell className="text-right">
        <Input className="w-20 text-right h-8 text-sm" type="number" value={ramp} min={0} max={100}
          onChange={e => setRamp(e.target.value)}
          onBlur={() => amount && onSave({ cycleId, userId: user.id, amount: parseFloat(amount) || 0, ramp: parseFloat(ramp) || 100 })}
        />
      </TableCell>
    </TableRow>
  );
}
