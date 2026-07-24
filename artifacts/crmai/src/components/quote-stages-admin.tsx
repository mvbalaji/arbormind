import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Trash2, Pencil, GripVertical, ChevronUp, ChevronDown,
  ToggleRight, ToggleLeft, ShieldAlert, Check,
} from "lucide-react";

interface Stage {
  id: number;
  stage_id: string;
  label: string;
  description: string;
  position: number;
  is_active: boolean;
  is_system: boolean;
}

async function apiFetch(url: string, opts?: RequestInit) {
  const r = await fetch(url, { credentials: "include", ...opts });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export function QuoteStagesAdmin() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [editStage, setEditStage] = useState<Stage | null>(null);
  const [form, setForm] = useState({ stageId: "", label: "", description: "" });

  const { data, isLoading } = useQuery<{ data: Stage[] }>({
    queryKey: ["quote-stage-config"],
    queryFn: () => apiFetch("/api/admin/quote-stages"),
  });

  const stages = (data?.data ?? []).slice().sort((a, b) => a.position - b.position);

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["quote-stage-config"] });
    void qc.invalidateQueries({ queryKey: ["quote-stages-public"] });
  };

  const addMutation = useMutation({
    mutationFn: (body: object) => apiFetch("/api/admin/quote-stages", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    }),
    onSuccess: () => { toast({ title: "Stage added" }); setAddOpen(false); setForm({ stageId: "", label: "", description: "" }); invalidate(); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...body }: { id: number } & Record<string, unknown>) =>
      apiFetch(`/api/admin/quote-stages/${id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      }),
    onSuccess: () => { toast({ title: "Stage updated" }); setEditStage(null); invalidate(); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/admin/quote-stages/${id}`, { method: "DELETE" }),
    onSuccess: () => { toast({ title: "Stage deleted" }); invalidate(); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const reorderMutation = useMutation({
    mutationFn: (order: number[]) => apiFetch("/api/admin/quote-stages/reorder", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ order }),
    }),
    onSuccess: invalidate,
  });

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= stages.length) return;
    const newOrder = stages.map(s => s.id);
    [newOrder[index], newOrder[target]] = [newOrder[target], newOrder[index]];
    reorderMutation.mutate(newOrder);
  };

  const openAdd = () => { setForm({ stageId: "", label: "", description: "" }); setAddOpen(true); };
  const openEdit = (s: Stage) => { setEditStage(s); setForm({ stageId: s.stage_id, label: s.label, description: s.description }); };

  const labelToId = (label: string) => label.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Quote Stages</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Define the stages a quote moves through. System stages cannot be deleted — only custom stages can be removed.
          </p>
        </div>
        <Button size="sm" onClick={openAdd} className="gap-1.5 shrink-0">
          <Plus className="w-3.5 h-3.5" /> Add Stage
        </Button>
      </div>

      {/* Pipeline preview */}
      <Card className="border-border px-4 py-3">
        <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Pipeline Preview</p>
        <div className="flex flex-wrap items-center gap-1 text-xs">
          {stages.filter(s => s.is_active).map((s, i, arr) => (
            <React.Fragment key={s.stage_id}>
              <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground font-medium">{s.label}</span>
              {i < arr.length - 1 && <span className="text-muted-foreground/40">›</span>}
            </React.Fragment>
          ))}
        </div>
      </Card>

      {/* Stage list */}
      {isLoading ? (
        <div className="text-sm text-muted-foreground py-8 text-center">Loading stages…</div>
      ) : (
        <div className="flex flex-col gap-2">
          {stages.map((s, i) => (
            <Card key={s.id} className={`border-border px-4 py-3 flex items-center gap-3 ${!s.is_active ? "opacity-50" : ""}`}>
              {/* Reorder */}
              <div className="flex flex-col gap-0.5 shrink-0">
                <button onClick={() => move(i, -1)} disabled={i === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-20">
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => move(i, 1)} disabled={i === stages.length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-20">
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>
              <GripVertical className="w-4 h-4 text-muted-foreground/40 shrink-0" />

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-foreground">{s.label}</span>
                  <code className="text-[11px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{s.stage_id}</code>
                  {s.is_system && (
                    <Badge variant="outline" className="text-[10px] border-blue-300 text-blue-600 bg-blue-50 dark:bg-blue-950">system</Badge>
                  )}
                  {!s.is_active && (
                    <Badge variant="outline" className="text-[10px] text-muted-foreground">disabled</Badge>
                  )}
                </div>
                {s.description && (
                  <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => updateMutation.mutate({ id: s.id, isActive: !s.is_active })}
                  title={s.is_active ? "Disable" : "Enable"}
                  className="p-1 text-muted-foreground hover:text-foreground"
                >
                  {s.is_active
                    ? <ToggleRight className="w-4 h-4 text-emerald-500" />
                    : <ToggleLeft className="w-4 h-4" />}
                </button>
                <button onClick={() => openEdit(s)} className="p-1 text-muted-foreground hover:text-foreground">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                {s.is_system ? (
                  <span title="System stages cannot be deleted" className="p-1 text-muted-foreground/30">
                    <ShieldAlert className="w-3.5 h-3.5" />
                  </span>
                ) : (
                  <button
                    onClick={() => { if (confirm(`Delete stage "${s.label}"?`)) deleteMutation.mutate(s.id); }}
                    className="p-1 text-muted-foreground hover:text-red-500"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={addOpen || !!editStage} onOpenChange={v => { if (!v) { setAddOpen(false); setEditStage(null); } }}>
        <DialogContent className="bg-card border-border text-foreground max-w-md">
          <DialogHeader>
            <DialogTitle>{editStage ? "Edit Stage" : "Add Stage"}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 mt-2">
            {!editStage && (
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold">Stage Label *</Label>
                <Input
                  placeholder="e.g. Legal Review"
                  value={form.label}
                  onChange={e => setForm(f => ({ ...f, label: e.target.value, stageId: labelToId(e.target.value) }))}
                />
                {form.label && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Check className="w-3 h-3 text-emerald-500" />
                    Stage ID: <code className="bg-muted px-1 rounded">{labelToId(form.label)}</code>
                  </p>
                )}
              </div>
            )}
            {editStage && (
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold">Label *</Label>
                <Input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} />
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-semibold">Description</Label>
              <Input
                placeholder="Short description of this stage"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="flex gap-2 justify-end pt-1 border-t border-border mt-1">
              <Button variant="outline" size="sm" onClick={() => { setAddOpen(false); setEditStage(null); }}>Cancel</Button>
              <Button
                size="sm"
                disabled={!form.label.trim() || addMutation.isPending || updateMutation.isPending}
                onClick={() => {
                  if (editStage) {
                    updateMutation.mutate({ id: editStage.id, label: form.label, description: form.description });
                  } else {
                    addMutation.mutate({ stageId: form.stageId, label: form.label, description: form.description });
                  }
                }}
              >
                {addMutation.isPending || updateMutation.isPending ? "Saving…" : editStage ? "Save Changes" : "Add Stage"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
