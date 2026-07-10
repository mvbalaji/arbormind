import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth";
import {
  Plus, Pencil, Trash2, ChevronDown, ChevronUp, ShieldCheck,
  AlertTriangle, Filter, Zap, CheckCircle2, GripVertical, X,
} from "lucide-react";

interface Condition {
  field: string;
  operator: string;
  value: string;
}

interface Action {
  type: string;
  target?: string;
  value?: string;
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

const RULE_TYPES = [
  { value: "Validation", label: "Validation", icon: ShieldCheck, color: "text-red-600 bg-red-50 border-red-200 dark:bg-red-950/50 dark:border-red-800" },
  { value: "Selection", label: "Auto-Select", icon: Zap, color: "text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-950/50 dark:border-blue-800" },
  { value: "Alert", label: "Alert", icon: AlertTriangle, color: "text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950/50 dark:border-amber-800" },
  { value: "Filter", label: "Filter", icon: Filter, color: "text-purple-600 bg-purple-50 border-purple-200 dark:bg-purple-950/50 dark:border-purple-800" },
  { value: "Discount", label: "Discount", icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/50 dark:border-emerald-800" },
];

const SCOPE_OPTIONS = ["Product", "Quote", "Opportunity", "Bundle", "Order"];
const CONDITIONS_MET = ["All", "Any"];

const CONDITION_FIELDS: Record<string, string[]> = {
  Product: ["product.category", "product.unitPrice", "product.quantity", "product.family", "product.isActive"],
  Quote: ["quote.subtotal", "quote.discount", "quote.total", "quote.status", "quote.itemCount"],
  Opportunity: ["opportunity.amount", "opportunity.stage", "opportunity.probability", "opportunity.discount"],
  Bundle: ["bundle.size", "bundle.total"],
  Order: ["order.total", "order.status"],
};

const OPERATORS = ["equals", "not equals", "greater than", "less than", "greater than or equal", "less than or equal", "contains", "starts with", "is empty", "is not empty"];

const ACTION_TYPES: Record<string, string[]> = {
  Validation: ["block", "warn"],
  Selection: ["set_field", "add_product", "remove_product"],
  Alert: ["show_message", "notify_owner"],
  Filter: ["hide_product", "show_only"],
  Discount: ["apply_discount_percent", "apply_discount_amount", "set_max_discount", "cap_discount"],
};

const DISCOUNT_FIELDS = ["quote.discount", "opportunity.discount", "item.discount"];

function ConditionRow({ cond, onChange, onRemove, scope }: {
  cond: Condition; onChange: (c: Condition) => void; onRemove: () => void; scope: string;
}) {
  const fields = CONDITION_FIELDS[scope] ?? CONDITION_FIELDS.Product;
  return (
    <div className="flex gap-2 items-center">
      <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      <Select value={cond.field} onValueChange={v => onChange({ ...cond, field: v })}>
        <SelectTrigger className="w-48 h-8 text-xs">
          <SelectValue placeholder="Field" />
        </SelectTrigger>
        <SelectContent>
          {fields.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={cond.operator} onValueChange={v => onChange({ ...cond, operator: v })}>
        <SelectTrigger className="w-44 h-8 text-xs">
          <SelectValue placeholder="Operator" />
        </SelectTrigger>
        <SelectContent>
          {OPERATORS.map(op => <SelectItem key={op} value={op}>{op}</SelectItem>)}
        </SelectContent>
      </Select>
      <Input
        className="h-8 text-xs flex-1"
        placeholder="Value"
        value={cond.value}
        onChange={e => onChange({ ...cond, value: e.target.value })}
      />
      <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={onRemove}>
        <X className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}

function ActionRow({ action, onChange, onRemove, ruleType }: {
  action: Action; onChange: (a: Action) => void; onRemove: () => void; ruleType: string;
}) {
  const types = ACTION_TYPES[ruleType] ?? ACTION_TYPES.Validation;
  return (
    <div className="flex gap-2 items-center">
      <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      <Select value={action.type} onValueChange={v => onChange({ ...action, type: v })}>
        <SelectTrigger className="w-52 h-8 text-xs">
          <SelectValue placeholder="Action type" />
        </SelectTrigger>
        <SelectContent>
          {types.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}
        </SelectContent>
      </Select>
      {(action.type === "apply_discount_percent" || action.type === "apply_discount_amount" || action.type === "set_max_discount" || action.type === "cap_discount") && (
        <>
          <Select value={action.target ?? ""} onValueChange={v => onChange({ ...action, target: v })}>
            <SelectTrigger className="w-44 h-8 text-xs">
              <SelectValue placeholder="Apply to" />
            </SelectTrigger>
            <SelectContent>
              {DISCOUNT_FIELDS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input className="h-8 text-xs w-28" placeholder="Value (%)" value={action.value ?? ""} onChange={e => onChange({ ...action, value: e.target.value })} />
        </>
      )}
      {(action.type === "set_field") && (
        <>
          <Input className="h-8 text-xs w-36" placeholder="Field name" value={action.target ?? ""} onChange={e => onChange({ ...action, target: e.target.value })} />
          <Input className="h-8 text-xs flex-1" placeholder="Value" value={action.value ?? ""} onChange={e => onChange({ ...action, value: e.target.value })} />
        </>
      )}
      {(action.type === "show_message" || action.type === "block" || action.type === "warn") && (
        <Input className="h-8 text-xs flex-1" placeholder="Message to show" value={action.message ?? ""} onChange={e => onChange({ ...action, message: e.target.value })} />
      )}
      {(action.type === "add_product" || action.type === "remove_product" || action.type === "hide_product" || action.type === "show_only") && (
        <Input className="h-8 text-xs flex-1" placeholder="Product code or ID" value={action.target ?? ""} onChange={e => onChange({ ...action, target: e.target.value })} />
      )}
      <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={onRemove}>
        <X className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}

interface RuleFormState {
  name: string;
  type: string;
  scope: string;
  conditionsMet: string;
  conditions: Condition[];
  actions: Action[];
  errorMessage: string;
  active: boolean;
  sortOrder: number;
}

const EMPTY_FORM: RuleFormState = {
  name: "", type: "Discount", scope: "Quote", conditionsMet: "All",
  conditions: [], actions: [], errorMessage: "", active: true, sortOrder: 0,
};

function RuleDialog({ open, onOpenChange, existing, onSaved }: {
  open: boolean; onOpenChange: (v: boolean) => void; existing: ProductRule | null; onSaved: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState<RuleFormState>(EMPTY_FORM);

  React.useEffect(() => {
    if (open) {
      if (existing) {
        let conds: Condition[] = [];
        let acts: Action[] = [];
        try { conds = JSON.parse(existing.conditions); } catch { conds = []; }
        try { acts = JSON.parse(existing.actions); } catch { acts = []; }
        setForm({
          name: existing.name, type: existing.type, scope: existing.scope,
          conditionsMet: existing.conditionsMet, conditions: conds, actions: acts,
          errorMessage: existing.errorMessage ?? "", active: existing.active,
          sortOrder: existing.sortOrder,
        });
      } else {
        setForm(EMPTY_FORM);
      }
    }
  }, [open, existing]);

  const set = (k: keyof RuleFormState, v: unknown) => setForm(prev => ({ ...prev, [k]: v }));

  const addCondition = () => set("conditions", [...form.conditions, { field: "", operator: "equals", value: "" }]);
  const updateCondition = (i: number, c: Condition) =>
    set("conditions", form.conditions.map((x, idx) => idx === i ? c : x));
  const removeCondition = (i: number) =>
    set("conditions", form.conditions.filter((_, idx) => idx !== i));

  const addAction = () => set("actions", [...form.actions, { type: ACTION_TYPES[form.type]?.[0] ?? "block" }]);
  const updateAction = (i: number, a: Action) =>
    set("actions", form.actions.map((x, idx) => idx === i ? a : x));
  const removeAction = (i: number) =>
    set("actions", form.actions.filter((_, idx) => idx !== i));

  const handleSubmit = async () => {
    if (!form.name.trim()) { toast({ title: "Name is required", variant: "destructive" }); return; }
    const payload = {
      name: form.name.trim(), type: form.type, scope: form.scope,
      conditionsMet: form.conditionsMet, conditions: form.conditions,
      actions: form.actions, errorMessage: form.errorMessage || null,
      active: form.active, sortOrder: form.sortOrder,
    };
    const url = existing ? `/api/admin/product-rules/${existing.id}` : "/api/admin/product-rules";
    const method = existing ? "PUT" : "POST";
    const r = await fetch(url, { method, credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (!r.ok) {
      const e = await r.json().catch(() => ({})) as { error?: string };
      toast({ title: "Save failed", description: e.error ?? "Unknown error", variant: "destructive" });
      return;
    }
    toast({ title: existing ? "Rule updated" : "Rule created" });
    onSaved();
    onOpenChange(false);
  };

  const typeInfo = RULE_TYPES.find(t => t.value === form.type);
  const TypeIcon = typeInfo?.icon ?? ShieldCheck;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TypeIcon className="w-5 h-5" />
            {existing ? "Edit Rule" : "New Product Rule"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1">
              <Label>Rule Name *</Label>
              <Input value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Max 20% discount on Software" />
            </div>
            <div className="space-y-1">
              <Label>Rule Type</Label>
              <Select value={form.type} onValueChange={v => { set("type", v); set("actions", []); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RULE_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>
                      <span className="flex items-center gap-2"><t.icon className="w-3.5 h-3.5" />{t.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Applies To (Scope)</Label>
              <Select value={form.scope} onValueChange={v => set("scope", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SCOPE_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Sort Order</Label>
              <Input type="number" value={form.sortOrder} onChange={e => set("sortOrder", parseInt(e.target.value) || 0)} className="w-32" />
            </div>
            <div className="space-y-1 flex items-center gap-3 pt-5">
              <Switch checked={form.active} onCheckedChange={v => set("active", v)} />
              <Label>Active</Label>
            </div>
          </div>

          {/* Conditions */}
          <div className="space-y-3 p-4 rounded-lg border border-border bg-muted/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Label className="text-sm font-semibold">Conditions</Label>
                <Select value={form.conditionsMet} onValueChange={v => set("conditionsMet", v)}>
                  <SelectTrigger className="h-7 text-xs w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONDITIONS_MET.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
                <span className="text-xs text-muted-foreground">conditions must be met</span>
              </div>
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={addCondition}>
                <Plus className="w-3 h-3" />Add Condition
              </Button>
            </div>
            {form.conditions.length === 0 ? (
              <p className="text-xs text-muted-foreground italic text-center py-2">No conditions — rule always applies</p>
            ) : (
              <div className="space-y-2">
                {form.conditions.map((c, i) => (
                  <ConditionRow key={i} cond={c} scope={form.scope} onChange={u => updateCondition(i, u)} onRemove={() => removeCondition(i)} />
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="space-y-3 p-4 rounded-lg border border-border bg-muted/20">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Actions</Label>
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={addAction}>
                <Plus className="w-3 h-3" />Add Action
              </Button>
            </div>
            {form.actions.length === 0 ? (
              <p className="text-xs text-muted-foreground italic text-center py-2">No actions defined</p>
            ) : (
              <div className="space-y-2">
                {form.actions.map((a, i) => (
                  <ActionRow key={i} action={a} ruleType={form.type} onChange={u => updateAction(i, u)} onRemove={() => removeAction(i)} />
                ))}
              </div>
            )}
          </div>

          {/* Error message for Validation rules */}
          {(form.type === "Validation" || form.type === "Alert") && (
            <div className="space-y-1">
              <Label>Error / Alert Message</Label>
              <Input value={form.errorMessage} onChange={e => set("errorMessage", e.target.value)} placeholder="Message shown to user when rule triggers" />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit}>{existing ? "Save Changes" : "Create Rule"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RuleCard({ rule, onEdit, onDelete, onToggle }: {
  rule: ProductRule; onEdit: () => void; onDelete: () => void; onToggle: (v: boolean) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const typeInfo = RULE_TYPES.find(t => t.value === rule.type);
  const TypeIcon = typeInfo?.icon ?? ShieldCheck;

  let conditions: Condition[] = [];
  let actions: Action[] = [];
  try { conditions = JSON.parse(rule.conditions); } catch { conditions = []; }
  try { actions = JSON.parse(rule.actions); } catch { actions = []; }

  return (
    <Card className={`glass-panel transition-all duration-150 ${rule.active ? "" : "opacity-60"}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center border flex-shrink-0 ${typeInfo?.color}`}>
            <TypeIcon className="w-4.5 h-4.5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium text-sm text-foreground truncate">{rule.name}</p>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  <Badge variant="outline" className={`text-xs border ${typeInfo?.color}`}>{rule.type}</Badge>
                  <Badge variant="outline" className="text-xs">Scope: {rule.scope}</Badge>
                  <Badge variant="outline" className="text-xs">
                    {conditions.length} condition{conditions.length !== 1 ? "s" : ""}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {actions.length} action{actions.length !== 1 ? "s" : ""}
                  </Badge>
                  {!rule.active && <Badge variant="outline" className="text-xs text-muted-foreground">Inactive</Badge>}
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <Switch checked={rule.active} onCheckedChange={onToggle} />
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={onDelete}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setExpanded(e => !e)}>
                  {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </Button>
              </div>
            </div>

            {expanded && (
              <div className="mt-3 space-y-3 pt-3 border-t border-border/50">
                {conditions.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1.5">
                      IF {rule.conditionsMet === "All" ? "ALL" : "ANY"} of these conditions:
                    </p>
                    <div className="space-y-1">
                      {conditions.map((c, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-xs">
                          <span className="w-4 text-muted-foreground">{i + 1}.</span>
                          <code className="px-1.5 py-0.5 rounded bg-muted text-foreground font-mono">{c.field}</code>
                          <span className="text-muted-foreground">{c.operator}</span>
                          <code className="px-1.5 py-0.5 rounded bg-muted text-foreground font-mono">{c.value || "—"}</code>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {actions.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1.5">THEN:</p>
                    <div className="space-y-1">
                      {actions.map((a, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-xs">
                          <span className="w-4 text-muted-foreground">{i + 1}.</span>
                          <code className="px-1.5 py-0.5 rounded bg-muted text-foreground font-mono">{a.type.replace(/_/g, " ")}</code>
                          {a.target && <span className="text-muted-foreground">→ <code className="font-mono">{a.target}</code></span>}
                          {a.value && <span className="text-muted-foreground">= <strong>{a.value}</strong></span>}
                          {a.message && <span className="text-muted-foreground italic">"{a.message}"</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {rule.errorMessage && (
                  <div className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded px-2 py-1 border border-amber-200 dark:border-amber-800">
                    Message: "{rule.errorMessage}"
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ProductRulesAdmin() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<ProductRule | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [filterType, setFilterType] = useState<string>("all");

  const isAdmin = user?.role === "admin" || user?.role === "super_admin";

  const { data, isLoading } = useQuery<{ rules: ProductRule[] }>({
    queryKey: ["product-rules"],
    queryFn: async () => {
      const r = await fetch("/api/admin/product-rules", { credentials: "include" });
      if (!r.ok) throw new Error("Failed to load rules");
      return r.json();
    },
  });

  const rules = data?.rules ?? [];
  const filtered = filterType === "all" ? rules : rules.filter(r => r.type === filterType);

  const invalidate = () => void qc.invalidateQueries({ queryKey: ["product-rules"] });

  const toggleRule = async (rule: ProductRule, active: boolean) => {
    const r = await fetch(`/api/admin/product-rules/${rule.id}`, {
      method: "PUT", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    });
    if (!r.ok) { toast({ title: "Update failed", variant: "destructive" }); return; }
    toast({ title: active ? "Rule activated" : "Rule deactivated" });
    invalidate();
  };

  const deleteRule = async () => {
    if (!deletingId) return;
    const r = await fetch(`/api/admin/product-rules/${deletingId}`, { method: "DELETE", credentials: "include" });
    if (!r.ok) { toast({ title: "Delete failed", variant: "destructive" }); return; }
    toast({ title: "Rule deleted" });
    setDeletingId(null);
    invalidate();
  };

  if (!isAdmin) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          Admin access required.
        </div>
      </Layout>
    );
  }

  const typeCount = (type: string) => rules.filter(r => r.type === type).length;

  return (
    <Layout>
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Product Rules</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Configure validation, discount, selection, and alert rules applied to products, quotes, and opportunities.
            </p>
          </div>
          <Button className="gap-2 flex-shrink-0" onClick={() => { setEditingRule(null); setDialogOpen(true); }}>
            <Plus className="w-4 h-4" />New Rule
          </Button>
        </div>

        {/* Type filter pills */}
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm" variant={filterType === "all" ? "default" : "outline"}
            className="h-7 text-xs gap-1.5" onClick={() => setFilterType("all")}
          >
            All <Badge variant="secondary" className="text-xs ml-0.5">{rules.length}</Badge>
          </Button>
          {RULE_TYPES.map(t => (
            <Button
              key={t.value} size="sm"
              variant={filterType === t.value ? "default" : "outline"}
              className="h-7 text-xs gap-1.5"
              onClick={() => setFilterType(t.value)}
            >
              <t.icon className="w-3 h-3" />{t.label}
              {typeCount(t.value) > 0 && (
                <Badge variant="secondary" className="text-xs ml-0.5">{typeCount(t.value)}</Badge>
              )}
            </Button>
          ))}
        </div>

        {/* Rule type summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {RULE_TYPES.map(t => {
            const count = typeCount(t.value);
            const activeCount = rules.filter(r => r.type === t.value && r.active).length;
            return (
              <Card key={t.value} className={`glass-panel cursor-pointer border ${filterType === t.value ? "ring-2 ring-primary" : ""}`} onClick={() => setFilterType(t.value === filterType ? "all" : t.value)}>
                <CardContent className="p-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center border mb-2 ${t.color}`}>
                    <t.icon className="w-4 h-4" />
                  </div>
                  <p className="text-xs font-medium text-foreground">{t.label}</p>
                  <p className="text-lg font-bold text-foreground">{count}</p>
                  <p className="text-xs text-muted-foreground">{activeCount} active</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Rules list */}
        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map(i => <div key={i} className="h-20 rounded-xl bg-muted/30 animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="glass-panel">
            <CardContent className="py-16 text-center">
              <Filter className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="text-sm text-muted-foreground">
                {filterType === "all" ? "No product rules yet." : `No ${filterType} rules.`}
              </p>
              <Button className="mt-4 gap-2" onClick={() => { setEditingRule(null); setDialogOpen(true); }}>
                <Plus className="w-4 h-4" />Create First Rule
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map(rule => (
              <RuleCard
                key={rule.id}
                rule={rule}
                onEdit={() => { setEditingRule(rule); setDialogOpen(true); }}
                onDelete={() => setDeletingId(rule.id)}
                onToggle={(v) => void toggleRule(rule, v)}
              />
            ))}
          </div>
        )}
      </div>

      <RuleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        existing={editingRule}
        onSaved={invalidate}
      />

      <AlertDialog open={deletingId !== null} onOpenChange={open => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Rule</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the rule. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteRule} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
