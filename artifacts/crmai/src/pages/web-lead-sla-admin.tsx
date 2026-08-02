import React, { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Pencil, Trash2, Clock, AlertCircle,
  ToggleLeft, ToggleRight, Upload, Download,
  Search, Filter, FileSpreadsheet, X, CheckCircle2,
} from "lucide-react";

const REGIONS = ["Global", "India", "United Kingdom"];

const REGION_BADGE: Record<string, string> = {
  Global:           "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  India:            "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  "United Kingdom": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
};

interface SlaTask {
  id: number;
  region: string;
  task_name: string;
  sla_hours: number;
  description: string | null;
  is_active: boolean;
  sort_order: number;
}

const EMPTY_FORM = { region: "Global", taskName: "", slaHours: "24", description: "", isActive: true, sortOrder: "0" };

function slaLabel(hours: number) {
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 24) return `${hours}h`;
  if (hours % 24 === 0) return `${hours / 24}d`;
  return `${hours}h`;
}

const TASK_KEYWORDS = [
  ["initial", "outreach"],
  ["email", "introductory", "intro"],
  ["qualification", "qualify"],
  ["demo", "discovery", "meeting"],
  ["proposal", "follow"],
];
const TASK_COLS = ["Initial Call", "Email", "Qualification", "Demo", "Proposal"];

function findTask(list: SlaTask[], kws: string[]) {
  return list.filter((t) => t.is_active).sort((a, b) => a.sort_order - b.sort_order || a.id - b.id)
    .find((t) => kws.some((k) => t.task_name.toLowerCase().includes(k)));
}

export function WebLeadSlaAdminInline() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState("");
  const [regionFilter, setRegionFilter] = useState("All");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SlaTask | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [importDialog, setImportDialog] = useState(false);
  const [importMode, setImportMode] = useState<"append" | "replace">("append");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<{ inserted: number; errors: string[] } | null>(null);

  const { data: tasks = [], isLoading } = useQuery<SlaTask[]>({
    queryKey: ["web-lead-sla"],
    queryFn: () => fetch("/api/admin/web-lead-sla").then((r) => r.json()),
  });

  // Filtered list for the table
  const filtered = tasks.filter((t) => {
    if (regionFilter !== "All" && t.region !== regionFilter) return false;
    if (search && !t.task_name.toLowerCase().includes(search.toLowerCase()) &&
        !t.region.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }).sort((a, b) => {
    const ri = REGIONS.indexOf(a.region) - REGIONS.indexOf(b.region);
    if (ri !== 0) return ri;
    return a.sort_order - b.sort_order || a.id - b.id;
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof form & { id?: number }) => {
      const url = data.id ? `/api/admin/web-lead-sla/${data.id}` : "/api/admin/web-lead-sla";
      const res = await fetch(url, {
        method: data.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ region: data.region, taskName: data.taskName, slaHours: Number(data.slaHours), description: data.description || null, isActive: data.isActive, sortOrder: Number(data.sortOrder) }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Save failed");
      return res.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["web-lead-sla"] }); setDialogOpen(false); toast({ title: editing ? "Task updated" : "Task created" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => fetch(`/api/admin/web-lead-sla/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["web-lead-sla"] }); setDeleteId(null); toast({ title: "Task deleted" }); },
  });

  const toggleMutation = useMutation({
    mutationFn: (task: SlaTask) => fetch(`/api/admin/web-lead-sla/${task.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !task.is_active }),
    }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["web-lead-sla"] }),
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!importFile) throw new Error("No file");
      const fd = new FormData();
      fd.append("file", importFile);
      const res = await fetch(`/api/admin/web-lead-sla/import?mode=${importMode}`, { method: "POST", body: fd });
      if (!res.ok) throw new Error((await res.json()).error ?? "Import failed");
      return res.json();
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["web-lead-sla"] });
      setImportResult({ inserted: data.inserted, errors: data.errors ?? [] });
    },
    onError: (e: Error) => toast({ title: "Import failed", description: e.message, variant: "destructive" }),
  });

  function openCreate() { setEditing(null); setForm({ ...EMPTY_FORM, region: regionFilter !== "All" ? regionFilter : "Global" }); setDialogOpen(true); }
  function openEdit(t: SlaTask) { setEditing(t); setForm({ region: t.region, taskName: t.task_name, slaHours: String(t.sla_hours), description: t.description ?? "", isActive: t.is_active, sortOrder: String(t.sort_order) }); setDialogOpen(true); }
  const setF = (k: keyof typeof form) => (v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  const regionCounts = REGIONS.reduce<Record<string, number>>((acc, r) => { acc[r] = tasks.filter((t) => t.region === r).length; return acc; }, {});

  return (
    <div className="space-y-4 mt-2">

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tasks…" className="pl-8 h-8 text-sm" />
          {search && <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>}
        </div>

        {/* Region filter */}
        <div className="flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-muted-foreground" />
          <div className="flex gap-1">
            {["All", ...REGIONS].map((r) => (
              <button key={r} onClick={() => setRegionFilter(r)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors border ${
                  regionFilter === r
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                }`}>
                {r} {r !== "All" && <span className="opacity-60 ml-0.5">({regionCounts[r] ?? 0})</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {/* Import */}
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => { setImportFile(null); setImportResult(null); setImportDialog(true); }}>
            <Upload className="w-3.5 h-3.5" /> Import Excel
          </Button>
          {/* Template download */}
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" asChild>
            <a href="/api/admin/web-lead-sla/template" download>
              <Download className="w-3.5 h-3.5" /> Template
            </a>
          </Button>
          {/* Add task */}
          <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={openCreate}>
            <Plus className="w-3.5 h-3.5" /> Add Task
          </Button>
        </div>
      </div>

      {/* Main data table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-8">#</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Task Name</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-36">Region</th>
                <th className="text-center px-4 py-2.5 font-medium text-muted-foreground w-24">SLA</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden lg:table-cell">Description</th>
                <th className="text-center px-4 py-2.5 font-medium text-muted-foreground w-20">Status</th>
                <th className="text-center px-4 py-2.5 font-medium text-muted-foreground w-28">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="text-center py-12 text-muted-foreground text-sm">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <Clock className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">
                      {search || regionFilter !== "All" ? "No tasks match your filter" : "No SLA tasks configured yet"}
                    </p>
                    {!search && regionFilter === "All" && (
                      <Button variant="outline" size="sm" className="mt-3 gap-1.5" onClick={openCreate}>
                        <Plus className="w-3.5 h-3.5" /> Add first task
                      </Button>
                    )}
                  </td>
                </tr>
              ) : (
                filtered.map((task, idx) => (
                  <tr key={task.id} className={`border-b last:border-0 hover:bg-muted/20 transition-colors ${!task.is_active ? "opacity-50" : ""}`}>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{idx + 1}</td>
                    <td className="px-4 py-3 font-medium">{task.task_name}</td>
                    <td className="px-4 py-3">
                      <Badge className={`${REGION_BADGE[task.region]} border-0 text-xs`}>{task.region}</Badge>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400">
                        <Clock className="w-3.5 h-3.5" />{slaLabel(Number(task.sla_hours))}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs hidden lg:table-cell max-w-xs truncate" title={task.description ?? ""}>
                      {task.description ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => toggleMutation.mutate(task)} title={task.is_active ? "Active — click to deactivate" : "Inactive — click to activate"}
                        className="inline-flex items-center gap-1 text-xs font-medium">
                        {task.is_active
                          ? <><ToggleRight className="w-5 h-5 text-green-500" /><span className="text-green-600 hidden xl:inline">Active</span></>
                          : <><ToggleLeft className="w-5 h-5 text-muted-foreground" /><span className="text-muted-foreground hidden xl:inline">Off</span></>}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => openEdit(task)}><Pencil className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="w-7 h-7 text-destructive hover:text-destructive" onClick={() => setDeleteId(task.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div className="px-4 py-2 border-t bg-muted/10 text-xs text-muted-foreground">
            {filtered.length} task{filtered.length !== 1 ? "s" : ""}{search || regionFilter !== "All" ? " (filtered)" : ""}
          </div>
        )}
      </Card>

      {/* Add / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Edit SLA Task" : "Add SLA Task"}</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate({ ...form, id: editing?.id }); }} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Region *</Label>
                <Select value={form.region} onValueChange={setF("region")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{REGIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>SLA (hours) *</Label>
                <Input type="number" min="0.25" step="0.25" value={form.slaHours}
                  onChange={(e) => setF("slaHours")(e.target.value)} required />
                {form.slaHours && <p className="text-xs text-muted-foreground">= {slaLabel(Number(form.slaHours))} after submission</p>}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Task name *</Label>
              <Input value={form.taskName} onChange={(e) => setF("taskName")(e.target.value)} required placeholder="e.g. Initial outreach call" />
            </div>
            <div className="space-y-1.5">
              <Label>Description / instructions</Label>
              <Textarea value={form.description} onChange={(e) => setF("description")(e.target.value)} rows={3} placeholder="Guidance for the sales rep…" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Sort order</Label>
                <Input type="number" min="0" step="10" value={form.sortOrder} onChange={(e) => setF("sortOrder")(e.target.value)} />
                <p className="text-xs text-muted-foreground">Lower = appears first</p>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.isActive ? "active" : "inactive"} onValueChange={(v) => setF("isActive")(v === "active")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saveMutation.isPending}>{saveMutation.isPending ? "Saving…" : editing ? "Save changes" : "Create task"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete SLA task?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This task will no longer be created for incoming web leads.</p>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" disabled={deleteMutation.isPending}
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}>
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import dialog */}
      <Dialog open={importDialog} onOpenChange={(o) => { if (!o) { setImportDialog(false); setImportFile(null); setImportResult(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><FileSpreadsheet className="w-5 h-5 text-green-600" /> Import from Excel / CSV</DialogTitle>
          </DialogHeader>

          {importResult ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm text-green-800 dark:text-green-300">{importResult.inserted} task{importResult.inserted !== 1 ? "s" : ""} imported successfully</p>
                  {importResult.errors.length > 0 && (
                    <div className="mt-2 text-xs text-amber-700 dark:text-amber-400 space-y-1">
                      <p className="font-medium">{importResult.errors.length} row{importResult.errors.length !== 1 ? "s" : ""} skipped:</p>
                      {importResult.errors.map((e, i) => <p key={i}>• {e}</p>)}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => { setImportResult(null); setImportFile(null); }}>Import another</Button>
                <Button onClick={() => setImportDialog(false)}>Done</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 mt-2">
              <div className="flex items-start gap-3 p-3.5 rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30 text-xs">
                <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-blue-800 dark:text-blue-300 space-y-1">
                  <p>Upload an <strong>.xlsx</strong> or <strong>.csv</strong> file. Required columns: <strong>Region</strong>, <strong>Task Name</strong>, <strong>SLA Hours</strong>.</p>
                  <p>Optional: Description, Sort Order, Active (Yes/No).</p>
                  <a href="/api/admin/web-lead-sla/template" download className="inline-flex items-center gap-1 text-blue-700 dark:text-blue-400 underline font-medium hover:no-underline">
                    <Download className="w-3 h-3" /> Download template
                  </a>
                </div>
              </div>

              {/* File picker */}
              <div
                className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/20 transition-colors"
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setImportFile(f); }}
              >
                <FileSpreadsheet className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
                {importFile ? (
                  <div>
                    <p className="font-medium text-sm">{importFile.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">{(importFile.size / 1024).toFixed(1)} KB</p>
                    <button className="text-xs text-destructive mt-2 hover:underline" onClick={(e) => { e.stopPropagation(); setImportFile(null); }}>Remove</button>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-medium">Drop file here or click to browse</p>
                    <p className="text-xs text-muted-foreground mt-1">.xlsx or .csv, max 5MB</p>
                  </div>
                )}
                <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) setImportFile(f); }} />
              </div>

              {/* Import mode */}
              <div className="space-y-1.5">
                <Label>Import mode</Label>
                <Select value={importMode} onValueChange={(v) => setImportMode(v as "append" | "replace")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="append">Append — add to existing tasks</SelectItem>
                    <SelectItem value="replace">Replace — delete all existing, then import</SelectItem>
                  </SelectContent>
                </Select>
                {importMode === "replace" && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> All current SLA tasks will be deleted before import
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setImportDialog(false)}>Cancel</Button>
                <Button disabled={!importFile || importMutation.isPending} onClick={() => importMutation.mutate()} className="gap-2">
                  <Upload className="w-4 h-4" />
                  {importMutation.isPending ? "Importing…" : "Import"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Full-page version */
export default function WebLeadSlaAdmin() {
  return (
    <Layout>
      <div className="p-6 max-w-6xl mx-auto">
        <div className="mb-4">
          <h1 className="text-2xl font-bold">Web Lead SLA Configuration</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Configure follow-up tasks and SLA deadlines auto-created when a web form lead is submitted.
          </p>
        </div>
        <WebLeadSlaAdminInline />
      </div>
    </Layout>
  );
}
