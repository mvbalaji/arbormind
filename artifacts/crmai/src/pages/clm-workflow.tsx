import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Zap, Edit2, Trash2, ToggleLeft, ToggleRight, GripVertical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const API = "/api";

const TRIGGER_EVENTS = [
  "contract.created",
  "contract.submitted_for_approval",
  "contract.approved",
  "contract.rejected",
  "contract.activated",
  "contract.expiring_soon",
  "contract.expired",
  "contract.terminated",
  "contract.renewal_due",
  "review.assigned",
  "review.completed",
  "redline.received",
  "signer.completed",
  "all_signers.completed",
];

const ACTION_TYPES = [
  "send_email",
  "assign_reviewer",
  "create_task",
  "update_status",
  "notify_owner",
  "notify_account_team",
  "trigger_approval",
  "set_field",
];

type WorkflowRule = {
  id: number;
  name: string;
  trigger_event: string;
  conditions: string;
  actions: string;
  active: boolean;
  sort_order: number;
  created_at: string;
};

function parseJson(s: string): unknown[] {
  try { return JSON.parse(s) ?? []; } catch { return []; }
}

function RuleForm({ initial, onSave, onClose }: { initial?: WorkflowRule; onSave: (d: Partial<WorkflowRule>) => Promise<void>; onClose: () => void }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [triggerEvent, setTriggerEvent] = useState(initial?.trigger_event ?? TRIGGER_EVENTS[0]);
  const [conditions, setConditions] = useState(
    initial?.conditions ? JSON.stringify(parseJson(initial.conditions), null, 2) : '[\n  {"field": "contract_type", "operator": "equals", "value": "MSA"}\n]'
  );
  const [actions, setActions] = useState(
    initial?.actions ? JSON.stringify(parseJson(initial.actions), null, 2) : '[\n  {"type": "send_email", "to": "owner", "template": "contract_approved"}\n]'
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        name,
        trigger_event: triggerEvent,
        conditions: conditions as unknown as string,
        actions: actions as unknown as string,
      });
      onClose();
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Rule Name *</Label>
          <Input className="bg-muted border-border mt-1" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Notify Legal on MSA Submission" />
        </div>
        <div>
          <Label>Trigger Event *</Label>
          <select className="w-full h-10 px-3 rounded-md bg-muted border border-border text-foreground text-sm mt-1"
            value={triggerEvent} onChange={(e) => setTriggerEvent(e.target.value)}>
            {TRIGGER_EVENTS.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
      </div>
      <div>
        <Label>Conditions (JSON array)</Label>
        <textarea className="w-full h-28 px-3 py-2 rounded-md bg-muted border border-border text-foreground text-xs mt-1 font-mono resize-y"
          value={conditions} onChange={(e) => setConditions(e.target.value)} />
        <p className="text-xs text-muted-foreground mt-1">
          Each condition: <code className="bg-muted px-1 rounded">{`{"field":"...", "operator":"equals|gt|lt|contains", "value":"..."}`}</code>
        </p>
      </div>
      <div>
        <Label>Actions (JSON array)</Label>
        <div className="text-xs text-muted-foreground mb-1 flex flex-wrap gap-1">
          {ACTION_TYPES.map((a) => (
            <span key={a} className="bg-muted border border-border px-1.5 py-0.5 rounded font-mono">{a}</span>
          ))}
        </div>
        <textarea className="w-full h-28 px-3 py-2 rounded-md bg-muted border border-border text-foreground text-xs mt-1 font-mono resize-y"
          value={actions} onChange={(e) => setActions(e.target.value)} />
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose} className="border-border">Cancel</Button>
        <Button onClick={handleSave} disabled={saving || !name} className="bg-primary hover:bg-primary/90 text-foreground">
          {saving ? "Saving..." : initial ? "Update Rule" : "Create Rule"}
        </Button>
      </DialogFooter>
    </div>
  );
}

export default function ClmWorkflow() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [editRule, setEditRule] = useState<WorkflowRule | null>(null);

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ["clm-workflow-rules"],
    queryFn: () => fetch(`${API}/clm/workflow-rules`).then((r) => r.json()) as Promise<WorkflowRule[]>,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["clm-workflow-rules"] });

  const createMut = useMutation({
    mutationFn: (data: Partial<WorkflowRule>) =>
      fetch(`${API}/clm/workflow-rules`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then((r) => r.json()),
    onSuccess: () => { refresh(); toast({ title: "Workflow rule created" }); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<WorkflowRule> }) =>
      fetch(`${API}/clm/workflow-rules/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then((r) => r.json()),
    onSuccess: () => { refresh(); toast({ title: "Workflow rule updated" }); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => fetch(`${API}/clm/workflow-rules/${id}`, { method: "DELETE" }),
    onSuccess: () => { refresh(); toast({ title: "Workflow rule deleted" }); },
  });

  return (
    <Layout>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Workflow Engine</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Configure automated CLM workflow rules (UC-018)</p>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="bg-primary hover:bg-primary/90 text-foreground gap-1.5">
            <Plus className="w-4 h-4" /> New Rule
          </Button>
        </div>

        <Card className="glass-panel border-border p-4 mb-4 text-sm text-muted-foreground bg-blue-500/5 border-blue-500/20">
          <strong className="text-foreground">How it works:</strong> Each rule fires when its trigger event occurs. All conditions must match. Actions execute in order. Rules run in sort-order sequence.
        </Card>

        {isLoading ? (
          <div className="flex gap-1.5 py-16 justify-center">
            {[0, 1, 2].map((i) => <div key={i} className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
          </div>
        ) : rules.length === 0 ? (
          <Card className="glass-panel border-border p-12 text-center">
            <Zap className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No workflow rules yet. Add your first rule to automate CLM tasks.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {rules.map((rule, idx) => {
              const conditions = parseJson(rule.conditions);
              const actions = parseJson(rule.actions);
              return (
                <Card key={rule.id} className="glass-panel border-border p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex items-center gap-1 text-muted-foreground mt-0.5">
                      <GripVertical className="w-4 h-4" />
                      <span className="text-xs w-4 text-center">{idx + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-foreground">{rule.name}</span>
                        <Badge variant="outline" className="text-[10px] font-mono">{rule.trigger_event}</Badge>
                        {!rule.active && <Badge variant="outline" className="text-[10px] text-muted-foreground">Inactive</Badge>}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
                        <span>
                          <span className="text-foreground font-medium">{conditions.length}</span> condition{conditions.length !== 1 ? "s" : ""}
                        </span>
                        <span>
                          <span className="text-foreground font-medium">{actions.length}</span> action{actions.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                      {actions.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {(actions as { type?: string }[]).map((a, ai) => (
                            <span key={ai} className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded font-mono">
                              {a.type ?? "action"}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => updateMut.mutate({ id: rule.id, data: { active: !rule.active } })} className="text-muted-foreground hover:text-primary p-1">
                        {rule.active ? <ToggleRight className="w-5 h-5 text-green-500" /> : <ToggleLeft className="w-5 h-5" />}
                      </button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditRule(rule)}>
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-600" onClick={() => deleteMut.mutate(rule.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-card border-border max-w-2xl">
          <DialogHeader><DialogTitle>Create Workflow Rule</DialogTitle></DialogHeader>
          <RuleForm onSave={(d) => createMut.mutateAsync(d)} onClose={() => setCreateOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editRule} onOpenChange={(v) => { if (!v) setEditRule(null); }}>
        <DialogContent className="bg-card border-border max-w-2xl">
          <DialogHeader><DialogTitle>Edit Workflow Rule</DialogTitle></DialogHeader>
          {editRule && (
            <RuleForm
              initial={editRule}
              onSave={(d) => updateMut.mutateAsync({ id: editRule.id, data: d })}
              onClose={() => setEditRule(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

