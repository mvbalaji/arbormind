import React, { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, AlertTriangle, CheckCircle, Filter, MousePointerClick, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

const RULE_TYPES = ["Validation", "Selection", "Alert", "Filter"] as const;
const SCOPES = ["Product", "Quote", "Bundle"] as const;
const CONDITIONS_MET = ["All", "Any", "Custom"] as const;

const FIELD_OPTIONS = [
  "Product Family", "Product Code", "Unit Price", "Quantity Unit of Measure",
  "Is Active", "Description", "Product Name",
];
const OPERATOR_OPTIONS = ["equals", "not equals", "contains", "starts with", "greater than", "less than", "is blank", "is not blank"];
const ACTION_TYPES_BY_RULE: Record<string, string[]> = {
  Validation: ["Show Error Message", "Block Save"],
  Selection: ["Add Product", "Remove Product", "Require Product", "Hide Product"],
  Alert: ["Show Warning", "Show Info Message"],
  Filter: ["Filter Products", "Show Products", "Hide Products"],
};

interface Condition {
  field: string;
  operator: string;
  value: string;
}

interface Action {
  type: string;
  targetProduct?: string;
  message?: string;
}

interface ProductRule {
  id: number;
  name: string;
  type: string;
  scope: string;
  conditionsMet: string;
  conditions: string;
  actions: string;
  errorMessage: string | null;
  active: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

const TYPE_ICON: Record<string, React.ReactNode> = {
  Validation: <ShieldAlert className="w-3.5 h-3.5" />,
  Selection: <MousePointerClick className="w-3.5 h-3.5" />,
  Alert: <AlertTriangle className="w-3.5 h-3.5" />,
  Filter: <Filter className="w-3.5 h-3.5" />,
};
const TYPE_COLOR: Record<string, string> = {
  Validation: "bg-red-100 text-red-700 border-red-200",
  Selection: "bg-blue-100 text-blue-700 border-blue-200",
  Alert: "bg-yellow-100 text-yellow-700 border-yellow-200",
  Filter: "bg-purple-100 text-purple-700 border-purple-200",
};

function parseJson<T>(raw: string, fallback: T): T {
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

const emptyRule = () => ({
  name: "",
  type: "Validation",
  scope: "Product",
  conditionsMet: "All",
  conditions: [{ field: "Product Family", operator: "equals", value: "" }] as Condition[],
  actions: [{ type: "Show Error Message", message: "" }] as Action[],
  errorMessage: "",
  active: true,
  sortOrder: 0,
});

export function ProductRulesAdmin() {
  const { toast } = useToast();
  const [rules, setRules] = useState<ProductRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyRule());
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/product-rules");
      const data = await r.json();
      setRules(data.rules ?? []);
    } catch {
      toast({ title: "Failed to load product rules", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { void load(); }, [load]);

  function openNew() {
    setEditingId(null);
    setForm(emptyRule());
    setDialogOpen(true);
  }

  function openEdit(rule: ProductRule) {
    setEditingId(rule.id);
    setForm({
      name: rule.name,
      type: rule.type,
      scope: rule.scope,
      conditionsMet: rule.conditionsMet,
      conditions: parseJson<Condition[]>(rule.conditions, []),
      actions: parseJson<Action[]>(rule.actions, []),
      errorMessage: rule.errorMessage ?? "",
      active: rule.active,
      sortOrder: rule.sortOrder,
    });
    setDialogOpen(true);
  }

  async function save() {
    if (!form.name.trim()) { toast({ title: "Name is required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const body = {
        ...form,
        conditions: form.conditions,
        actions: form.actions,
      };
      const url = editingId ? `/api/admin/product-rules/${editingId}` : "/api/admin/product-rules";
      const method = editingId ? "PUT" : "POST";
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!r.ok) { const e = await r.json(); throw new Error(e.error ?? "Save failed"); }
      toast({ title: editingId ? "Rule updated" : "Rule created" });
      setDialogOpen(false);
      void load();
    } catch (e: unknown) {
      toast({ title: (e as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function deleteRule(id: number) {
    try {
      await fetch(`/api/admin/product-rules/${id}`, { method: "DELETE" });
      toast({ title: "Rule deleted" });
      void load();
    } catch {
      toast({ title: "Delete failed", variant: "destructive" });
    } finally {
      setDeleteId(null);
    }
  }

  async function toggleActive(rule: ProductRule) {
    try {
      await fetch(`/api/admin/product-rules/${rule.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !rule.active }),
      });
      void load();
    } catch {
      toast({ title: "Update failed", variant: "destructive" });
    }
  }

  // ── Condition helpers ────────────────────────────────────────────────────
  function addCondition() {
    setForm(f => ({ ...f, conditions: [...(f.conditions as Condition[]), { field: "Product Family", operator: "equals", value: "" }] }));
  }
  function updateCondition(i: number, patch: Partial<Condition>) {
    setForm(f => { const c = [...(f.conditions as Condition[])]; c[i] = { ...c[i], ...patch }; return { ...f, conditions: c }; });
  }
  function removeCondition(i: number) {
    setForm(f => { const c = [...(f.conditions as Condition[])]; c.splice(i, 1); return { ...f, conditions: c }; });
  }

  // ── Action helpers ────────────────────────────────────────────────────────
  function addAction() {
    const defaultType = (ACTION_TYPES_BY_RULE[form.type] ?? ["Show Error Message"])[0];
    setForm(f => ({ ...f, actions: [...(f.actions as Action[]), { type: defaultType, message: "" }] }));
  }
  function updateAction(i: number, patch: Partial<Action>) {
    setForm(f => { const a = [...(f.actions as Action[])]; a[i] = { ...a[i], ...patch }; return { ...f, actions: a }; });
  }
  function removeAction(i: number) {
    setForm(f => { const a = [...(f.actions as Action[])]; a.splice(i, 1); return { ...f, actions: a }; });
  }

  const conditions = form.conditions as Condition[];
  const actions = form.actions as Action[];
  const actionOptions = ACTION_TYPES_BY_RULE[form.type] ?? ["Show Error Message"];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">Product Rules</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Define configuration, validation, selection, and alert rules for products — similar to Salesforce CPQ Product Rules.
          </p>
        </div>
        <Button size="sm" onClick={openNew} className="gap-1.5">
          <Plus className="w-4 h-4" /> New Rule
        </Button>
      </div>

      {/* Rule type legend */}
      <div className="flex flex-wrap gap-2">
        {RULE_TYPES.map(t => (
          <span key={t} className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded border font-medium ${TYPE_COLOR[t]}`}>
            {TYPE_ICON[t]} {t}
          </span>
        ))}
      </div>

      {/* Rules table */}
      <Card className="glass-panel border-border overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Loading…</div>
        ) : rules.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground text-sm">
            <ShieldAlert className="w-8 h-8 mx-auto mb-3 opacity-30" />
            No product rules defined yet.<br />Click <strong>New Rule</strong> to create one.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left py-2.5 px-4 font-medium text-muted-foreground">Rule Name</th>
                <th className="text-left py-2.5 px-3 font-medium text-muted-foreground">Type</th>
                <th className="text-left py-2.5 px-3 font-medium text-muted-foreground">Scope</th>
                <th className="text-left py-2.5 px-3 font-medium text-muted-foreground">Conditions</th>
                <th className="text-left py-2.5 px-3 font-medium text-muted-foreground">Actions</th>
                <th className="text-center py-2.5 px-3 font-medium text-muted-foreground">Active</th>
                <th className="py-2.5 px-4" />
              </tr>
            </thead>
            <tbody>
              {rules.map(rule => {
                const conds = parseJson<Condition[]>(rule.conditions, []);
                const acts = parseJson<Action[]>(rule.actions, []);
                const expanded = expandedId === rule.id;
                return (
                  <React.Fragment key={rule.id}>
                    <tr className={`border-b border-border hover:bg-muted/20 transition-colors ${!rule.active ? "opacity-50" : ""}`}>
                      <td className="py-3 px-4 font-medium text-foreground">
                        <button className="flex items-center gap-1 hover:underline text-left" onClick={() => setExpandedId(expanded ? null : rule.id)}>
                          {expanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                          {rule.name}
                        </button>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded border font-medium ${TYPE_COLOR[rule.type] ?? ""}`}>
                          {TYPE_ICON[rule.type]} {rule.type}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-muted-foreground">{rule.scope}</td>
                      <td className="py-3 px-3 text-muted-foreground">{conds.length} condition{conds.length !== 1 ? "s" : ""}</td>
                      <td className="py-3 px-3 text-muted-foreground">{acts.length} action{acts.length !== 1 ? "s" : ""}</td>
                      <td className="py-3 px-3 text-center">
                        <Switch checked={rule.active} onCheckedChange={() => toggleActive(rule)} />
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1 justify-end">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(rule)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteId(rule.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                    {expanded && (
                      <tr className="border-b border-border bg-muted/10">
                        <td colSpan={7} className="px-8 py-3">
                          <div className="grid grid-cols-2 gap-6 text-xs">
                            <div>
                              <p className="font-semibold text-foreground mb-1.5">Conditions ({rule.conditionsMet} match)</p>
                              {conds.length === 0 ? <p className="text-muted-foreground">None</p> : (
                                <ul className="space-y-1">
                                  {conds.map((c, i) => (
                                    <li key={i} className="text-muted-foreground">
                                      <span className="font-medium text-foreground">{c.field}</span> {c.operator} <span className="font-medium text-foreground">{c.value || "—"}</span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                            <div>
                              <p className="font-semibold text-foreground mb-1.5">Actions</p>
                              {acts.length === 0 ? <p className="text-muted-foreground">None</p> : (
                                <ul className="space-y-1">
                                  {acts.map((a, i) => (
                                    <li key={i} className="text-muted-foreground">
                                      <span className="font-medium text-foreground">{a.type}</span>
                                      {a.message ? ` — "${a.message}"` : ""}
                                      {a.targetProduct ? ` → ${a.targetProduct}` : ""}
                                    </li>
                                  ))}
                                </ul>
                              )}
                              {rule.errorMessage && (
                                <p className="mt-1.5 text-muted-foreground"><span className="font-medium text-foreground">Error:</span> {rule.errorMessage}</p>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Product Rule" : "New Product Rule"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Basic info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label>Rule Name <span className="text-destructive">*</span></Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Hardware requires Installation" />
              </div>
              <div className="space-y-1.5">
                <Label>Rule Type</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v, actions: [{ type: (ACTION_TYPES_BY_RULE[v] ?? ["Show Error Message"])[0], message: "" }] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{RULE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {form.type === "Validation" && "Blocks save when conditions are met and shows an error."}
                  {form.type === "Selection" && "Auto-adds, removes, or requires products when conditions are met."}
                  {form.type === "Alert" && "Shows a warning or info message without blocking."}
                  {form.type === "Filter" && "Controls which products appear in the product selector."}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>Scope</Label>
                <Select value={form.scope} onValueChange={v => setForm(f => ({ ...f, scope: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SCOPES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            {/* Conditions */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Conditions</Label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Conditions met:</span>
                  <Select value={form.conditionsMet} onValueChange={v => setForm(f => ({ ...f, conditionsMet: v }))}>
                    <SelectTrigger className="h-7 w-20 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{CONDITIONS_MET.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2 border border-border rounded-md p-3 bg-muted/10">
                {conditions.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">No conditions — rule always applies.</p>}
                {conditions.map((c, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Select value={c.field} onValueChange={v => updateCondition(i, { field: v })}>
                      <SelectTrigger className="h-8 text-xs flex-1"><SelectValue /></SelectTrigger>
                      <SelectContent>{FIELD_OPTIONS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                    </Select>
                    <Select value={c.operator} onValueChange={v => updateCondition(i, { operator: v })}>
                      <SelectTrigger className="h-8 text-xs w-36"><SelectValue /></SelectTrigger>
                      <SelectContent>{OPERATOR_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                    </Select>
                    {!["is blank", "is not blank"].includes(c.operator) && (
                      <Input className="h-8 text-xs flex-1" value={c.value} onChange={e => updateCondition(i, { value: e.target.value })} placeholder="Value" />
                    )}
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive shrink-0" onClick={() => removeCondition(i)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={addCondition}>
                  <Plus className="w-3 h-3" /> Add Condition
                </Button>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <Label>Actions</Label>
              <div className="space-y-2 border border-border rounded-md p-3 bg-muted/10">
                {actions.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">No actions defined.</p>}
                {actions.map((a, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <Select value={a.type} onValueChange={v => updateAction(i, { type: v })}>
                      <SelectTrigger className="h-8 text-xs w-48 shrink-0"><SelectValue /></SelectTrigger>
                      <SelectContent>{actionOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                    </Select>
                    {(a.type.includes("Message") || a.type.includes("Warning") || a.type.includes("Error") || a.type.includes("Info")) && (
                      <Input className="h-8 text-xs flex-1" value={a.message ?? ""} onChange={e => updateAction(i, { message: e.target.value })} placeholder="Message text…" />
                    )}
                    {(a.type.includes("Product")) && (
                      <Input className="h-8 text-xs flex-1" value={a.targetProduct ?? ""} onChange={e => updateAction(i, { targetProduct: e.target.value })} placeholder="Product name or code…" />
                    )}
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive shrink-0" onClick={() => removeAction(i)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={addAction}>
                  <Plus className="w-3 h-3" /> Add Action
                </Button>
              </div>
            </div>

            {/* Error message for Validation rules */}
            {form.type === "Validation" && (
              <div className="space-y-1.5">
                <Label>Error Message</Label>
                <Input value={form.errorMessage} onChange={e => setForm(f => ({ ...f, errorMessage: e.target.value }))} placeholder="Message shown to user when validation fails…" />
              </div>
            )}

            {/* Active + Sort Order */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch checked={form.active} onCheckedChange={v => setForm(f => ({ ...f, active: v }))} id="rule-active" />
                <Label htmlFor="rule-active">Active</Label>
              </div>
              <div className="flex items-center gap-2">
                <Label>Sort Order</Label>
                <Input type="number" className="h-8 w-20 text-xs" value={form.sortOrder} onChange={e => setForm(f => ({ ...f, sortOrder: Number(e.target.value) }))} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Saving…" : editingId ? "Save Changes" : "Create Rule"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product Rule?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteRule(deleteId!)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
