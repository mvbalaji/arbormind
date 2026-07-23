import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import {
  Plus, Trash2, Lock, Unlock, Settings, Calendar, GitFork, DollarSign, AlertCircle,
} from "lucide-react";

const API = "/api";
const PERIOD_TYPES = ["monthly", "quarterly", "annual", "custom"];

type FiscalPeriod = {
  id: number; name: string; fiscal_year: number; period_type: string;
  start_date: string; end_date: string; is_locked: boolean;
};
type RampTemplate = { id: number; name: string; months_schedule: string };
type Dispute = {
  id: number; user_name: string; description: string; status: string;
  resolution: string | null; gross_payout: number; net_payout: number; created_at: string;
};
type Attainment = {
  id: number; user_id: number; user_name: string; email: string;
  actual_amount: number; fiscal_period_id: number; source: string; updated_at: string;
};

const defaultPeriodForm = {
  name: "", fiscal_year: new Date().getFullYear().toString(),
  period_type: "monthly", start_date: "", end_date: "",
};

export default function StimsAdmin() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [periodOpen, setPeriodOpen] = useState(false);
  const [rampOpen, setRampOpen] = useState(false);
  const [attainOpen, setAttainOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<{ type: string; id: number } | null>(null);
  const [periodForm, setPeriodForm] = useState(defaultPeriodForm);
  const [rampName, setRampName] = useState("");
  const [rampSchedule, setRampSchedule] = useState("25,50,75,100");
  const [attainForm, setAttainForm] = useState({ user_id: "", fiscal_period_id: "", actual_amount: "", source: "manual" });
  const [resolveDispute, setResolveDispute] = useState<Dispute | null>(null);
  const [resolution, setResolution] = useState("");
  const [selectedPeriodId, setSelectedPeriodId] = useState("");

  const { data: periods = [], isLoading: periodsLoading } = useQuery<FiscalPeriod[]>({
    queryKey: ["stims-fiscal-periods"],
    queryFn: () => fetch(`${API}/stims/fiscal-periods`).then(r => r.json()),
  });

  const { data: rampTemplates = [] } = useQuery<RampTemplate[]>({
    queryKey: ["stims-ramp-templates"],
    queryFn: () => fetch(`${API}/stims/ramp-templates`).then(r => r.json()),
  });

  const { data: disputes = [] } = useQuery<Dispute[]>({
    queryKey: ["stims-disputes"],
    queryFn: () => fetch(`${API}/stims/disputes`).then(r => r.json()),
  });

  const { data: attainments = [] } = useQuery<Attainment[]>({
    queryKey: ["stims-attainment", selectedPeriodId],
    queryFn: () => fetch(`${API}/stims/attainment?period_id=${selectedPeriodId}`).then(r => r.json()).then(d => Array.isArray(d) ? d : (d?.data ?? [])),
  });

  const { data: users = [] } = useQuery<Array<{ id: number; name: string; email: string }>>({
    queryKey: ["users-list"],
    queryFn: () => fetch(`${API}/users`).then(r => r.json()).then(d => d.data ?? d),
  });

  const createPeriodMut = useMutation({
    mutationFn: (data: typeof periodForm) =>
      fetch(`${API}/stims/fiscal-periods`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, fiscal_year: parseInt(data.fiscal_year) }),
      }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stims-fiscal-periods"] });
      setPeriodOpen(false);
      setPeriodForm(defaultPeriodForm);
      toast({ title: "Fiscal period created" });
    },
  });

  const toggleLockMut = useMutation({
    mutationFn: ({ id, period }: { id: number; period: FiscalPeriod }) =>
      fetch(`${API}/stims/fiscal-periods/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...period, is_locked: !period.is_locked }),
      }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["stims-fiscal-periods"] }),
  });

  const deletePeriodMut = useMutation({
    mutationFn: (id: number) => fetch(`${API}/stims/fiscal-periods/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["stims-fiscal-periods"] }),
  });

  const createRampMut = useMutation({
    mutationFn: () => {
      const months = rampSchedule.split(",").map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
      return fetch(`${API}/stims/ramp-templates`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: rampName, months_schedule: months }),
      }).then(r => r.json());
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stims-ramp-templates"] });
      setRampOpen(false);
      setRampName(""); setRampSchedule("25,50,75,100");
      toast({ title: "Ramp template saved" });
    },
  });

  const deleteRampMut = useMutation({
    mutationFn: (id: number) => fetch(`${API}/stims/ramp-templates/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["stims-ramp-templates"] }),
  });

  const saveAttainMut = useMutation({
    mutationFn: () =>
      fetch(`${API}/stims/attainment`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: parseInt(attainForm.user_id),
          fiscal_period_id: parseInt(attainForm.fiscal_period_id),
          actual_amount: parseFloat(attainForm.actual_amount),
          source: attainForm.source,
        }),
      }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stims-attainment"] });
      setAttainOpen(false);
      setAttainForm({ user_id: "", fiscal_period_id: "", actual_amount: "", source: "manual" });
      toast({ title: "Attainment recorded" });
    },
  });

  const resolveDisputeMut = useMutation({
    mutationFn: ({ id, resolution }: { id: number; resolution: string }) =>
      fetch(`${API}/stims/disputes/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "resolved", resolution }),
      }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stims-disputes"] });
      setResolveDispute(null);
      toast({ title: "Dispute resolved" });
    },
  });

  const openDisputes = disputes.filter(d => d.status === "open");

  return (
    <Layout>
      <div className="space-y-4 max-w-6xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6 text-primary" /> STIMS Administration
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configure fiscal calendar, ramp templates, attainment data, and resolve disputes
          </p>
        </div>

        <Tabs defaultValue="fiscal">
          <TabsList>
            <TabsTrigger value="fiscal"><Calendar className="h-4 w-4 mr-1.5" />Fiscal Calendar</TabsTrigger>
            <TabsTrigger value="ramp"><GitFork className="h-4 w-4 mr-1.5" />Ramp Templates</TabsTrigger>
            <TabsTrigger value="attainment"><DollarSign className="h-4 w-4 mr-1.5" />Attainment</TabsTrigger>
            <TabsTrigger value="disputes" className="relative">
              <AlertCircle className="h-4 w-4 mr-1.5" />Disputes
              {openDisputes.length > 0 && (
                <span className="ml-1 bg-destructive text-destructive-foreground text-xs rounded-full h-4 w-4 flex items-center justify-center">
                  {openDisputes.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Fiscal Calendar */}
          <TabsContent value="fiscal" className="space-y-3">
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setPeriodOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> Add Period
              </Button>
            </div>
            <Card className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period Name</TableHead>
                    <TableHead>Year</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Start</TableHead>
                    <TableHead>End</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {periodsLoading ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
                  ) : periods.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No fiscal periods configured</TableCell></TableRow>
                  ) : periods.map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>{p.fiscal_year}</TableCell>
                      <TableCell className="capitalize">{p.period_type}</TableCell>
                      <TableCell className="text-sm">{p.start_date?.split("T")[0]}</TableCell>
                      <TableCell className="text-sm">{p.end_date?.split("T")[0]}</TableCell>
                      <TableCell>
                        {p.is_locked
                          ? <Badge variant="destructive" className="text-xs">Locked</Badge>
                          : <Badge variant="secondary" className="text-xs">Open</Badge>}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7"
                            onClick={() => toggleLockMut.mutate({ id: p.id, period: p })}>
                            {p.is_locked ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7"
                            onClick={() => setDeleteId({ type: "period", id: p.id })}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* Ramp Templates */}
          <TabsContent value="ramp" className="space-y-3">
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setRampOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> New Template
              </Button>
            </div>
            <div className="text-sm text-muted-foreground bg-muted/50 rounded p-3">
              Ramp templates define monthly quota percentages for new hires. E.g. "25,50,75,100" means month 1=25%, month 2=50%, etc.
            </div>
            <Card className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Template Name</TableHead>
                    <TableHead>Monthly Schedule (%)</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rampTemplates.length === 0 ? (
                    <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">No ramp templates</TableCell></TableRow>
                  ) : rampTemplates.map(t => {
                    let schedule: number[] = [];
                    try { schedule = JSON.parse(t.months_schedule); } catch { }
                    return (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium">{t.name}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {schedule.map((pct, i) => (
                              <span key={i} className="text-xs px-1.5 py-0.5 bg-muted rounded">M{i + 1}: {pct}%</span>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button size="icon" variant="ghost" className="h-7 w-7"
                            onClick={() => setDeleteId({ type: "ramp", id: t.id })}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* Attainment */}
          <TabsContent value="attainment" className="space-y-3">
            <div className="flex items-center gap-3">
              <Select value={selectedPeriodId} onValueChange={setSelectedPeriodId}>
                <SelectTrigger className="w-52"><SelectValue placeholder="Filter by period" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All periods</SelectItem>
                  {periods.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button size="sm" onClick={() => setAttainOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> Record Attainment
              </Button>
            </div>
            <Card className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rep</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead className="text-right">Actual Amount</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attainments.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No attainment records</TableCell></TableRow>
                  ) : attainments.map(a => (
                    <TableRow key={a.id}>
                      <TableCell>
                        <p className="text-sm font-medium">{a.user_name}</p>
                        <p className="text-xs text-muted-foreground">{a.email}</p>
                      </TableCell>
                      <TableCell className="text-sm">{periods.find(p => p.id === a.fiscal_period_id)?.name ?? `Period ${a.fiscal_period_id}`}</TableCell>
                      <TableCell className="text-right font-mono font-semibold">
                        {new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(Number(a.actual_amount))}
                      </TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{a.source}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {a.updated_at ? format(new Date(a.updated_at), "dd MMM yyyy") : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* Disputes */}
          <TabsContent value="disputes" className="space-y-3">
            <Card className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rep</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Payout</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Raised</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {disputes.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No disputes</TableCell></TableRow>
                  ) : disputes.map(d => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium text-sm">{d.user_name}</TableCell>
                      <TableCell className="text-sm max-w-xs">
                        <p className="truncate">{d.description}</p>
                        {d.resolution && <p className="text-xs text-green-600 mt-0.5">Resolution: {d.resolution}</p>}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(Number(d.net_payout))}
                      </TableCell>
                      <TableCell>
                        <Badge variant={d.status === "open" ? "destructive" : "default"}>{d.status}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {d.created_at ? format(new Date(d.created_at), "dd MMM yyyy") : "—"}
                      </TableCell>
                      <TableCell>
                        {d.status === "open" && (
                          <Button size="sm" variant="outline" onClick={() => { setResolveDispute(d); setResolution(""); }}>
                            Resolve
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Fiscal period dialog */}
        <Dialog open={periodOpen} onOpenChange={setPeriodOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Add Fiscal Period</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Period Name</Label>
                <Input value={periodForm.name} onChange={e => setPeriodForm(f => ({ ...f, name: e.target.value }))} placeholder="Q1 FY2025" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Fiscal Year</Label>
                  <Input type="number" value={periodForm.fiscal_year} onChange={e => setPeriodForm(f => ({ ...f, fiscal_year: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Period Type</Label>
                  <Select value={periodForm.period_type} onValueChange={v => setPeriodForm(f => ({ ...f, period_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PERIOD_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Start Date</Label>
                  <Input type="date" value={periodForm.start_date} onChange={e => setPeriodForm(f => ({ ...f, start_date: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>End Date</Label>
                  <Input type="date" value={periodForm.end_date} onChange={e => setPeriodForm(f => ({ ...f, end_date: e.target.value }))} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPeriodOpen(false)}>Cancel</Button>
              <Button onClick={() => createPeriodMut.mutate(periodForm)}
                disabled={!periodForm.name || !periodForm.start_date || createPeriodMut.isPending}>
                Save Period
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Ramp template dialog */}
        <Dialog open={rampOpen} onOpenChange={setRampOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>New Ramp Template</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Template Name</Label>
                <Input value={rampName} onChange={e => setRampName(e.target.value)} placeholder="Standard 4-month ramp" />
              </div>
              <div className="space-y-1">
                <Label>Monthly % (comma-separated)</Label>
                <Input value={rampSchedule} onChange={e => setRampSchedule(e.target.value)} placeholder="25,50,75,100" />
                <p className="text-xs text-muted-foreground">Month 1 to Month N as % of full quota</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRampOpen(false)}>Cancel</Button>
              <Button onClick={() => createRampMut.mutate()} disabled={!rampName || createRampMut.isPending}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Attainment entry dialog */}
        <Dialog open={attainOpen} onOpenChange={setAttainOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Record Attainment</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Rep</Label>
                <Select value={attainForm.user_id} onValueChange={v => setAttainForm(f => ({ ...f, user_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select rep" /></SelectTrigger>
                  <SelectContent>{users.map(u => <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Fiscal Period</Label>
                <Select value={attainForm.fiscal_period_id} onValueChange={v => setAttainForm(f => ({ ...f, fiscal_period_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select period" /></SelectTrigger>
                  <SelectContent>{periods.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Actual Amount</Label>
                <Input type="number" value={attainForm.actual_amount}
                  onChange={e => setAttainForm(f => ({ ...f, actual_amount: e.target.value }))} placeholder="450000" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAttainOpen(false)}>Cancel</Button>
              <Button onClick={() => saveAttainMut.mutate()}
                disabled={!attainForm.user_id || !attainForm.fiscal_period_id || !attainForm.actual_amount || saveAttainMut.isPending}>
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Resolve dispute dialog */}
        <Dialog open={!!resolveDispute} onOpenChange={v => !v && setResolveDispute(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Resolve Dispute — {resolveDispute?.user_name}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="bg-muted/50 rounded p-3 text-sm">{resolveDispute?.description}</div>
              <div className="space-y-1">
                <Label>Resolution / Explanation</Label>
                <Input value={resolution} onChange={e => setResolution(e.target.value)} placeholder="Reviewed and confirmed correct. No change required." />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setResolveDispute(null)}>Cancel</Button>
              <Button disabled={!resolution || resolveDisputeMut.isPending}
                onClick={() => resolveDisputeMut.mutate({ id: resolveDispute!.id, resolution })}>
                Mark Resolved
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Generic delete confirm */}
        <AlertDialog open={!!deleteId} onOpenChange={v => !v && setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this record?</AlertDialogTitle>
              <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => {
                if (deleteId?.type === "period") deletePeriodMut.mutate(deleteId.id);
                if (deleteId?.type === "ramp") deleteRampMut.mutate(deleteId.id);
                setDeleteId(null);
              }}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}
