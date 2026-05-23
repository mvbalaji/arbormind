import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, Plus, Trash2, Pencil, Loader2 } from "lucide-react";

type Entity = "opportunity" | "quote";

interface ApprovalRole { id: number; name: string; level: number; description: string | null }
interface ApprovalConfig { id: number; entity: string; multiLevel: boolean; enabled: boolean }
interface ApprovalCriterion {
  id: number; entity: string; name: string; field: string;
  operator: "gt" | "gte" | "lt" | "lte" | "eq" | "neq" | "contains";
  threshold: number | null; thresholdText: string | null;
  level: number; roleId: number | null; active: boolean;
}

const ENTITY_TABS: Array<{ id: Entity; label: string; description: string }> = [
  { id: "opportunity", label: "Opportunity discounts", description: "Rules that trigger approval when an opportunity is discounted." },
  { id: "quote", label: "Quote discounts", description: "Rules that trigger approval when a quote is discounted." },
];

const FIELD_OPTIONS: Record<Entity, Array<{ value: string; label: string; hint: string }>> = {
  opportunity: [
    { value: "discountPercent", label: "Discount %", hint: "% off the opportunity total" },
    { value: "amount", label: "Opportunity amount (£)", hint: "Total deal value" },
    { value: "probability", label: "Probability (%)", hint: "Forecasted win probability" },
  ],
  quote: [
    { value: "discountPercent", label: "Discount %", hint: "% off the quote subtotal" },
    { value: "total", label: "Quote total (£)", hint: "Final quote value after discount" },
    { value: "marginPercent", label: "Margin %", hint: "Gross margin after discount" },
  ],
};

const OPERATORS: Array<{ value: ApprovalCriterion["operator"]; label: string }> = [
  { value: "gt", label: "is greater than (>)" },
  { value: "gte", label: "is at least (≥)" },
  { value: "lt", label: "is less than (<)" },
  { value: "lte", label: "is at most (≤)" },
  { value: "eq", label: "equals (=)" },
  { value: "neq", label: "does not equal (≠)" },
];

interface ApproverStep { level: number; roleId: number | null }

interface EditState {
  /** Original ids being replaced (when editing) — deleted on save. */
  replacingIds: number[];
  name: string;
  field: string;
  operator: ApprovalCriterion["operator"];
  threshold: string;
  active: boolean;
  steps: ApproverStep[];
}

const emptyEdit = (_entity: Entity): EditState => ({
  replacingIds: [],
  name: "Discount > 10% needs Sales Manager",
  field: "discountPercent",
  operator: "gt",
  threshold: "10",
  active: true,
  steps: [{ level: 1, roleId: null }],
});

/** A logical rule = one or more criteria rows sharing the same name+field+operator+threshold. */
interface GroupedRule {
  signature: string;
  ids: number[];
  name: string;
  field: string;
  operator: ApprovalCriterion["operator"];
  threshold: number | null;
  thresholdText: string | null;
  active: boolean;
  steps: Array<{ level: number; roleId: number | null }>;
}

function ruleSignature(c: Pick<ApprovalCriterion, "name" | "field" | "operator" | "threshold" | "thresholdText">) {
  return [c.name, c.field, c.operator, c.threshold ?? "", c.thresholdText ?? ""].join("|");
}

function groupCriteria(rows: ApprovalCriterion[]): GroupedRule[] {
  const map = new Map<string, GroupedRule>();
  for (const c of rows) {
    const sig = ruleSignature(c);
    let g = map.get(sig);
    if (!g) {
      g = {
        signature: sig, ids: [], name: c.name, field: c.field, operator: c.operator,
        threshold: c.threshold, thresholdText: c.thresholdText, active: c.active, steps: [],
      };
      map.set(sig, g);
    }
    g.ids.push(c.id);
    g.steps.push({ level: c.level, roleId: c.roleId });
    if (!c.active) g.active = false; // rule is "active" only if all steps active
  }
  for (const g of map.values()) g.steps.sort((a, b) => a.level - b.level);
  return [...map.values()].sort((a, b) => (a.steps[0]?.level ?? 0) - (b.steps[0]?.level ?? 0) || a.name.localeCompare(b.name));
}

export function ApprovalConfigInline() {
  const { toast } = useToast();
  const [entity, setEntity] = useState<Entity>("opportunity");
  const [roles, setRoles] = useState<ApprovalRole[]>([]);
  const [configs, setConfigs] = useState<ApprovalConfig[]>([]);
  const [criteria, setCriteria] = useState<ApprovalCriterion[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<EditState>(emptyEdit("opportunity"));
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const config = configs.find(c => c.entity === entity);
  const entityRules = groupCriteria(criteria.filter(c => c.entity === entity));

  const reload = async () => {
    setLoading(true);
    try {
      const [rolesR, configsR, criteriaR] = await Promise.all([
        fetch("/api/approvals/roles", { credentials: "include" }),
        fetch("/api/approvals/configs", { credentials: "include" }),
        fetch("/api/approvals/criteria", { credentials: "include" }),
      ]);
      const rolesJ = await rolesR.json();
      const configsJ = await configsR.json();
      const criteriaJ = await criteriaR.json();
      setRoles(rolesJ.data ?? []);
      setConfigs(configsJ.data ?? []);
      setCriteria(criteriaJ.data ?? []);
    } catch (err) {
      toast({ title: "Failed to load approval config", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void reload(); }, []);

  const setConfigField = async (patch: Partial<Pick<ApprovalConfig, "enabled" | "multiLevel">>) => {
    if (!config) return;
    const next = { ...config, ...patch };
    setConfigs(cs => cs.map(c => c.entity === entity ? next : c));
    try {
      const res = await fetch(`/api/approvals/configs/${entity}`, {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error(await res.text());
    } catch {
      toast({ title: "Could not update settings", variant: "destructive" });
      void reload();
    }
  };

  const openCreate = () => { setEditing(emptyEdit(entity)); setEditOpen(true); };
  const openEdit = (r: GroupedRule) => {
    setEditing({
      replacingIds: r.ids,
      name: r.name,
      field: r.field,
      operator: r.operator,
      threshold: r.threshold != null ? String(r.threshold) : (r.thresholdText ?? ""),
      active: r.active,
      steps: r.steps.length > 0 ? r.steps.map(s => ({ ...s })) : [{ level: 1, roleId: null }],
    });
    setEditOpen(true);
  };

  const save = async () => {
    if (!editing.name.trim()) { toast({ title: "Name is required", variant: "destructive" }); return; }
    if (editing.threshold === "" || Number.isNaN(Number(editing.threshold))) {
      toast({ title: "Threshold must be a number", variant: "destructive" }); return;
    }
    if (editing.steps.length === 0) {
      toast({ title: "Add at least one approver step", variant: "destructive" }); return;
    }
    const levels = editing.steps.map(s => s.level);
    if (new Set(levels).size !== levels.length) {
      toast({ title: "Each approver step must have a unique level", variant: "destructive" }); return;
    }
    setSaving(true);
    try {
      // Delete the prior rows (when editing), then insert one row per step.
      await Promise.all(editing.replacingIds.map(id =>
        fetch(`/api/approvals/criteria/${id}`, { method: "DELETE", credentials: "include" })
      ));
      const sortedSteps = [...editing.steps].sort((a, b) => a.level - b.level);
      for (const step of sortedSteps) {
        const body = {
          entity,
          name: editing.name.trim(),
          field: editing.field,
          operator: editing.operator,
          threshold: Number(editing.threshold),
          level: step.level,
          roleId: step.roleId,
          active: editing.active,
        };
        const res = await fetch("/api/approvals/criteria", {
          method: "POST", credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error(await res.text());
      }
      toast({ title: editing.replacingIds.length === 0 ? "Rule added" : "Rule updated" });
      setEditOpen(false);
      void reload();
    } catch {
      toast({ title: "Save failed", variant: "destructive" });
      void reload();
    } finally {
      setSaving(false);
    }
  };

  const remove = async (ids: number[]) => {
    setDeletingId(ids[0] ?? null);
    try {
      await Promise.all(ids.map(id =>
        fetch(`/api/approvals/criteria/${id}`, { method: "DELETE", credentials: "include" })
      ));
      setCriteria(cs => cs.filter(c => !ids.includes(c.id)));
      toast({ title: "Rule deleted" });
    } catch {
      toast({ title: "Delete failed", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  const addStep = () => setEditing(s => {
    const nextLevel = (s.steps.length === 0 ? 1 : Math.max(...s.steps.map(x => x.level)) + 1);
    return { ...s, steps: [...s.steps, { level: nextLevel, roleId: null }] };
  });
  const removeStep = (idx: number) => setEditing(s => ({ ...s, steps: s.steps.filter((_, i) => i !== idx) }));
  const setStep = (idx: number, patch: Partial<ApproverStep>) => setEditing(s => ({
    ...s,
    steps: s.steps.map((st, i) => i === idx ? { ...st, ...patch } : st),
  }));

  const fieldLabel = (f: string) =>
    FIELD_OPTIONS[entity].find(o => o.value === f)?.label ?? f;
  const operatorLabel = (op: string) =>
    OPERATORS.find(o => o.value === op)?.label ?? op;
  const roleName = (id: number | null) =>
    id == null ? <span className="text-muted-foreground italic">Any approver</span>
      : roles.find(r => r.id === id)?.name ?? `Role #${id}`;

  return (
    <Card className="glass-panel border-border">
      <div className="p-6 border-b border-border flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10"><ShieldCheck className="w-5 h-5 text-primary" /></div>
          <div>
            <h2 className="font-semibold text-foreground">Approval configuration</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Define when opportunity and quote discounts must be approved, and who approves them.
            </p>
          </div>
        </div>
      </div>

      {/* Entity selector */}
      <div className="px-6 pt-4">
        <div className="inline-flex items-center gap-1 rounded-lg bg-muted/70 border border-border p-1">
          {ENTITY_TABS.map(t => {
            const isActive = entity === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setEntity(t.id)}
                className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all ${
                  isActive
                    ? "bg-primary text-white font-semibold shadow-md ring-1 ring-primary/40"
                    : "text-muted-foreground hover:text-foreground hover:bg-background"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {ENTITY_TABS.find(t => t.id === entity)?.description}
        </p>
      </div>

      {/* Per-entity settings */}
      <div className="p-6 grid sm:grid-cols-2 gap-4 border-b border-border">
        <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border bg-muted/30">
          <div>
            <div className="text-sm font-medium">Require approval for {entity === "opportunity" ? "opportunities" : "quotes"}</div>
            <p className="text-xs text-muted-foreground mt-0.5">When off, no rules will trigger.</p>
          </div>
          <Switch checked={config?.enabled ?? true} onCheckedChange={(v) => setConfigField({ enabled: v })} />
        </div>
        <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border bg-muted/30">
          <div>
            <div className="text-sm font-medium">Multi-level approval</div>
            <p className="text-xs text-muted-foreground mt-0.5">Escalate through every matched level (e.g. Sales Manager → Sales Director → VP).</p>
          </div>
          <Switch checked={config?.multiLevel ?? false} onCheckedChange={(v) => setConfigField({ multiLevel: v })} />
        </div>
      </div>

      {/* Rules table */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Approval rules</h3>
          <Button size="sm" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-1" /> Add rule
          </Button>
        </div>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground text-sm flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </div>
        ) : entityRules.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground border border-dashed border-border rounded-lg">
            No rules defined yet. Click <strong>Add rule</strong> to set a discount threshold and approver.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                <tr className="divide-x divide-border">
                  <th className="px-4 py-3 text-left font-medium">Rule</th>
                  <th className="px-4 py-3 text-left font-medium">Condition</th>
                  <th className="px-4 py-3 text-left font-medium">Approver chain</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium w-24"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {entityRules.map(r => (
                  <tr key={r.signature} className="hover:bg-muted/30 align-top">
                    <td className="px-4 py-3 font-medium text-foreground">{r.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <span className="font-medium text-foreground">{fieldLabel(r.field)}</span>{" "}
                      {operatorLabel(r.operator)}{" "}
                      <span className="font-medium text-foreground">{r.threshold ?? r.thresholdText ?? "—"}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        {r.steps.map((s, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm">
                            <Badge variant="outline" className="shrink-0">L{s.level}</Badge>
                            <span>{roleName(s.roleId)}</span>
                            {i < r.steps.length - 1 && <span className="text-muted-foreground">→</span>}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${r.active ? "text-green-600" : "text-muted-foreground"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${r.active ? "bg-green-500" : "bg-gray-400"}`} />
                        {r.active ? "Active" : "Disabled"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(r)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600 hover:text-red-700"
                          disabled={deletingId === r.ids[0]} onClick={() => remove(r.ids)}>
                          {deletingId === r.ids[0] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing.replacingIds.length === 0 ? "Add approval rule" : "Edit approval rule"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Rule name</label>
              <Input value={editing.name} onChange={(e) => setEditing(s => ({ ...s, name: e.target.value }))}
                placeholder="e.g. Discount > 10% needs Sales Manager" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Field</label>
                <Select value={editing.field} onValueChange={(v) => setEditing(s => ({ ...s, field: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FIELD_OPTIONS[entity].map(f => (
                      <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {FIELD_OPTIONS[entity].find(f => f.value === editing.field)?.hint}
                </p>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Operator</label>
                <Select value={editing.operator} onValueChange={(v) => setEditing(s => ({ ...s, operator: v as EditState["operator"] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {OPERATORS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Threshold</label>
              <Input type="number" value={editing.threshold}
                onChange={(e) => setEditing(s => ({ ...s, threshold: e.target.value }))}
                placeholder="e.g. 10" />
            </div>

            <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Approver chain</div>
                  <p className="text-xs text-muted-foreground">
                    Add one or more approvers. When this rule matches, each step must approve in order (lowest level first).
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={addStep}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add step
                </Button>
              </div>

              <div className="space-y-2">
                {editing.steps.map((step, idx) => (
                  <div key={idx} className="flex items-end gap-2 p-2 rounded-md bg-background border border-border">
                    <div className="w-20 shrink-0">
                      <label className="text-[10px] font-medium text-muted-foreground">Level</label>
                      <Input type="number" min={1} value={step.level}
                        onChange={(e) => setStep(idx, { level: Math.max(1, Number(e.target.value) || 1) })} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <label className="text-[10px] font-medium text-muted-foreground">Approver role</label>
                      <Select value={step.roleId == null ? "any" : String(step.roleId)}
                        onValueChange={(v) => setStep(idx, { roleId: v === "any" ? null : Number(v) })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="any">Any approver (managers + admins)</SelectItem>
                          {roles.map(r => (
                            <SelectItem key={r.id} value={String(r.id)}>
                              {r.name} <span className="text-muted-foreground">· L{r.level}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button size="icon" variant="ghost" className="h-9 w-9 text-red-600 hover:text-red-700 shrink-0"
                      disabled={editing.steps.length <= 1} onClick={() => removeStep(idx)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
              {editing.steps.length > 1 && (
                <p className="text-[11px] text-muted-foreground">
                  Tip: lower level numbers approve first. The request escalates step-by-step until all approve.
                </p>
              )}
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
              <div>
                <div className="text-sm font-medium">Active</div>
                <p className="text-xs text-muted-foreground">Inactive rules are ignored when evaluating approvals.</p>
              </div>
              <Switch checked={editing.active} onCheckedChange={(v) => setEditing(s => ({ ...s, active: v }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editing.replacingIds.length === 0 ? "Add rule" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
