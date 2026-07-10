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
import { useToast } from "@/hooks/use-toast";
import { Play, CheckCircle, Download, AlertCircle, Eye, Calculator, MessageSquare, XCircle } from "lucide-react";
import { format } from "date-fns";

const API = "/api";

type FiscalPeriod = { id: number; name: string };
type Cycle = { id: number; name: string; status: string };
type Run = {
  id: number; fiscal_period_id: number; cycle_id: number; status: string;
  total_payout: number; period_name: string; approved_by_name: string | null;
  run_at: string; updated_at: string;
};
type PayoutLine = {
  id: number; user_id: number; user_name: string; email: string;
  quota: number; actual: number; attainment_pct: number;
  gross_payout: number; adjustment: number | null; net_payout: number;
  breakdown: string | null; exception_note: string | null;
};
type RunDetail = Run & { lines: PayoutLine[] };

const STATUS_COLOR: Record<string, string> = {
  draft: "secondary", review: "outline", approved: "default", locked: "default",
};

function fmt(n: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(n);
}

export default function StimsCalcRuns() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [runDialogOpen, setRunDialogOpen] = useState(false);
  const [detailRun, setDetailRun] = useState<RunDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [adjustLine, setAdjustLine] = useState<PayoutLine | null>(null);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [attainmentInputs, setAttainmentInputs] = useState<Record<number, string>>({});

  const [selectedPeriodId, setSelectedPeriodId] = useState("");
  const [selectedCycleId, setSelectedCycleId] = useState("");

  const { data: periods = [] } = useQuery<FiscalPeriod[]>({
    queryKey: ["stims-fiscal-periods"],
    queryFn: () => fetch(`${API}/stims/fiscal-periods`).then(r => r.json()),
  });

  const { data: cycles = [] } = useQuery<Cycle[]>({
    queryKey: ["stims-target-cycles"],
    queryFn: () => fetch(`${API}/stims/target-cycles`).then(r => r.json()),
  });

  const { data: runs = [], isLoading } = useQuery<Run[]>({
    queryKey: ["stims-calc-runs"],
    queryFn: () => fetch(`${API}/stims/calc-runs`).then(r => r.json()),
  });

  const { data: perf = [] } = useQuery<Array<{ user_id: number; user_name: string; actual: number }>>({
    queryKey: ["stims-perf-attain", selectedPeriodId, selectedCycleId],
    queryFn: () => fetch(`${API}/stims/performance-summary?fiscal_period_id=${selectedPeriodId}&cycle_id=${selectedCycleId}`).then(r => r.json()),
    enabled: !!(selectedPeriodId && selectedCycleId),
  });

  const createRunMut = useMutation({
    mutationFn: async (data: { fiscal_period_id: string; cycle_id: string; attainments: Record<number, number> }) => {
      // First save attainment values
      for (const [uid, amt] of Object.entries(data.attainments)) {
        if (amt > 0) {
          await fetch(`${API}/stims/attainment`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: parseInt(uid), fiscal_period_id: parseInt(data.fiscal_period_id), actual_amount: amt }),
          });
        }
      }
      // Then run calculation
      return fetch(`${API}/stims/calc-runs`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fiscal_period_id: parseInt(data.fiscal_period_id), cycle_id: parseInt(data.cycle_id) }),
      }).then(r => r.json());
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["stims-calc-runs"] });
      setRunDialogOpen(false);
      toast({
        title: "Calculation run complete",
        description: `Total payout: ${fmt(data.total_payout)} · ${data.lines_created} reps · ${data.exceptions?.length ?? 0} exceptions`,
      });
    },
  });

  const updateRunMut = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      fetch(`${API}/stims/calc-runs/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stims-calc-runs"] });
      if (detailRun) {
        loadDetail(detailRun.id);
      }
      toast({ title: "Run status updated" });
    },
  });

  const adjustMut = useMutation({
    mutationFn: ({ id, adjustment, reason }: { id: number; adjustment: number; reason: string }) =>
      fetch(`${API}/stims/payout-lines/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adjustment, adjustment_reason: reason }),
      }).then(r => r.json()),
    onSuccess: () => {
      if (detailRun) loadDetail(detailRun.id);
      setAdjustLine(null);
      toast({ title: "Adjustment saved" });
    },
  });

  async function loadDetail(runId: number) {
    const data = await fetch(`${API}/stims/calc-runs/${runId}`).then(r => r.json());
    setDetailRun(data);
    setDetailOpen(true);
  }

  const exceptions = detailRun?.lines.filter(l => l.exception_note) ?? [];
  const normal = detailRun?.lines.filter(l => !l.exception_note) ?? [];
  const totalNet = detailRun?.lines.reduce((s, l) => s + Number(l.net_payout), 0) ?? 0;

  const nextStatus: Record<string, string> = { draft: "review", review: "approved", approved: "locked" };
  const nextLabel: Record<string, string> = { draft: "Send for Review", review: "Approve Payout", approved: "Lock & Export" };

  return (
    <Layout>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Calculator className="h-6 w-6 text-primary" /> Calculation Runs
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Run the incentive engine, review payouts, and approve for disbursement
            </p>
          </div>
          <Button onClick={() => setRunDialogOpen(true)}>
            <Play className="h-4 w-4 mr-1" /> New Calculation Run
          </Button>
        </div>

        {/* Runs list */}
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Run</TableHead>
                <TableHead>Period</TableHead>
                <TableHead className="text-right">Total Payout</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Run At</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">Loading…</TableCell></TableRow>
              ) : runs.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">No runs yet</TableCell></TableRow>
              ) : runs.map(run => (
                <TableRow key={run.id}>
                  <TableCell className="font-medium">Run #{run.id}</TableCell>
                  <TableCell>{run.period_name ?? `Period ${run.fiscal_period_id}`}</TableCell>
                  <TableCell className="text-right font-mono font-semibold">{fmt(Number(run.total_payout))}</TableCell>
                  <TableCell><Badge variant={STATUS_COLOR[run.status] as any}>{run.status}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {run.run_at ? format(new Date(run.run_at), "dd MMM yyyy HH:mm") : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => loadDetail(run.id)}>
                        <Eye className="h-3.5 w-3.5 mr-1" /> View
                      </Button>
                      {nextStatus[run.status] && (
                        <Button size="sm" onClick={() => updateRunMut.mutate({ id: run.id, status: nextStatus[run.status] })}>
                          {nextLabel[run.status]}
                        </Button>
                      )}
                      {run.status === "approved" || run.status === "locked" ? (
                        <Button size="sm" variant="outline" asChild>
                          <a href={`${API}/stims/calc-runs/${run.id}/export`} download>
                            <Download className="h-3.5 w-3.5 mr-1" /> CSV
                          </a>
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        {/* New Run dialog */}
        <Dialog open={runDialogOpen} onOpenChange={setRunDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle>New Calculation Run</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Target Cycle</Label>
                  <Select value={selectedCycleId} onValueChange={setSelectedCycleId}>
                    <SelectTrigger><SelectValue placeholder="Select cycle" /></SelectTrigger>
                    <SelectContent>
                      {cycles.filter(c => c.status === "published").map(c => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Fiscal Period</Label>
                  <Select value={selectedPeriodId} onValueChange={setSelectedPeriodId}>
                    <SelectTrigger><SelectValue placeholder="Select period" /></SelectTrigger>
                    <SelectContent>
                      {periods.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Attainment entry */}
              {perf.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Enter Actual Sales (leave blank to use existing attainment records)</p>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Rep</TableHead>
                        <TableHead className="text-right">Existing Actual</TableHead>
                        <TableHead className="text-right">Override</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {perf.map(r => (
                        <TableRow key={r.user_id}>
                          <TableCell className="text-sm">{r.user_name}</TableCell>
                          <TableCell className="text-right text-sm font-mono">{fmt(Number(r.actual))}</TableCell>
                          <TableCell className="text-right">
                            <Input className="w-32 text-right h-7 text-sm" type="number"
                              placeholder="override"
                              value={attainmentInputs[r.user_id] ?? ""}
                              onChange={e => setAttainmentInputs(prev => ({ ...prev, [r.user_id]: e.target.value }))} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRunDialogOpen(false)}>Cancel</Button>
              <Button
                disabled={!selectedPeriodId || !selectedCycleId || createRunMut.isPending}
                onClick={() => createRunMut.mutate({
                  fiscal_period_id: selectedPeriodId,
                  cycle_id: selectedCycleId,
                  attainments: Object.fromEntries(
                    Object.entries(attainmentInputs)
                      .filter(([, v]) => v)
                      .map(([k, v]) => [parseInt(k), parseFloat(v)])
                  ),
                })}>
                {createRunMut.isPending ? "Running…" : "Run Calculation"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Run detail dialog */}
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>Run #{detailRun?.id} — {detailRun?.period_name}</span>
                <Badge variant={STATUS_COLOR[detailRun?.status ?? ""] as any}>{detailRun?.status}</Badge>
              </DialogTitle>
            </DialogHeader>
            {detailRun && (
              <div className="space-y-4">
                {/* Summary */}
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="bg-muted/50 rounded p-3">
                    <p className="text-muted-foreground">Total Net Payout</p>
                    <p className="font-bold text-xl">{fmt(totalNet)}</p>
                  </div>
                  <div className="bg-muted/50 rounded p-3">
                    <p className="text-muted-foreground">Reps Paid</p>
                    <p className="font-bold text-xl">{normal.length}</p>
                  </div>
                  <div className="bg-muted/50 rounded p-3">
                    <p className="text-muted-foreground">Exceptions</p>
                    <p className="font-bold text-xl text-yellow-600">{exceptions.length}</p>
                  </div>
                </div>

                {/* Exceptions */}
                {exceptions.length > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 space-y-1">
                    <p className="text-sm font-medium text-yellow-800 flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" /> Exceptions ({exceptions.length})
                    </p>
                    {exceptions.map(l => (
                      <p key={l.id} className="text-xs text-yellow-700">• {l.user_name}: {l.exception_note}</p>
                    ))}
                  </div>
                )}

                {/* Payout lines table */}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rep</TableHead>
                      <TableHead className="text-right">Quota</TableHead>
                      <TableHead className="text-right">Actual</TableHead>
                      <TableHead className="text-right">Att%</TableHead>
                      <TableHead className="text-right">Gross</TableHead>
                      <TableHead className="text-right">Adj</TableHead>
                      <TableHead className="text-right">Net</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {normal.map(l => (
                      <TableRow key={l.id}>
                        <TableCell>
                          <p className="text-sm font-medium">{l.user_name}</p>
                          <p className="text-xs text-muted-foreground">{l.breakdown?.slice(0, 60)}</p>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">{fmt(Number(l.quota))}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{fmt(Number(l.actual))}</TableCell>
                        <TableCell className="text-right">
                          <span className={`text-sm font-semibold ${Number(l.attainment_pct) >= 100 ? "text-green-600" : Number(l.attainment_pct) >= 70 ? "text-yellow-600" : "text-red-500"}`}>
                            {Number(l.attainment_pct).toFixed(1)}%
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">{fmt(Number(l.gross_payout))}</TableCell>
                        <TableCell className="text-right font-mono text-sm text-muted-foreground">
                          {l.adjustment ? fmt(Number(l.adjustment)) : "—"}
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold">{fmt(Number(l.net_payout))}</TableCell>
                        <TableCell>
                          {detailRun.status === "review" && (
                            <Button size="icon" variant="ghost" className="h-7 w-7"
                              onClick={() => { setAdjustLine(l); setAdjustAmount(""); setAdjustReason(""); }}>
                              <MessageSquare className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  {nextStatus[detailRun.status] && (
                    <Button onClick={() => updateRunMut.mutate({ id: detailRun.id, status: nextStatus[detailRun.status] })}>
                      <CheckCircle className="h-4 w-4 mr-1" /> {nextLabel[detailRun.status]}
                    </Button>
                  )}
                  {(detailRun.status === "approved" || detailRun.status === "locked") && (
                    <Button variant="outline" asChild>
                      <a href={`${API}/stims/calc-runs/${detailRun.id}/export`} download>
                        <Download className="h-4 w-4 mr-1" /> Export CSV
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Adjust dialog */}
        <Dialog open={!!adjustLine} onOpenChange={v => !v && setAdjustLine(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Adjust Payout — {adjustLine?.user_name}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                Gross: {fmt(Number(adjustLine?.gross_payout))} · Current net: {fmt(Number(adjustLine?.net_payout))}
              </div>
              <div className="space-y-1">
                <Label>Adjustment Amount (positive = increase, negative = decrease)</Label>
                <Input type="number" value={adjustAmount} onChange={e => setAdjustAmount(e.target.value)} placeholder="e.g. -500" />
              </div>
              <div className="space-y-1">
                <Label>Reason (required)</Label>
                <Input value={adjustReason} onChange={e => setAdjustReason(e.target.value)} placeholder="Pro-ration for partial period" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAdjustLine(null)}>Cancel</Button>
              <Button disabled={!adjustAmount || !adjustReason || adjustMut.isPending}
                onClick={() => adjustMut.mutate({ id: adjustLine!.id, adjustment: parseFloat(adjustAmount), reason: adjustReason })}>
                Save Adjustment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
