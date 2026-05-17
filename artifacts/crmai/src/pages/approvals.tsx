import React, { useMemo, useState } from "react";
import {
  useListApprovalRoles,
  useCreateApprovalRole,
  useDeleteApprovalRole,
  useListApprovalConfigs,
  useUpdateApprovalConfig,
  useListApprovalCriteria,
  useCreateApprovalCriterion,
  useUpdateApprovalCriterion,
  useDeleteApprovalCriterion,
  getListApprovalRolesQueryKey,
  getListApprovalConfigsQueryKey,
  getListApprovalCriteriaQueryKey,
} from "@workspace/api-client-react";
import type {
  ApprovalRole,
  ApprovalCriterion,
  CreateApprovalCriterionInputOperator,
  CreateApprovalCriterionInputEntity,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Building2, Briefcase, FileText, ShoppingCart, Plus, Pencil, Trash2,
  ShieldCheck, ArrowRight, Layers, Users2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type Entity = "account" | "opportunity" | "quote" | "order";
type Operator = "gt" | "gte" | "lt" | "lte" | "eq" | "neq" | "contains";

const ENTITY_META: Record<Entity, { label: string; icon: React.ComponentType<{ className?: string }>; color: string; fields: { id: string; label: string; numeric: boolean }[] }> = {
  account: {
    label: "Account",
    icon: Building2,
    color: "text-blue-600 bg-blue-500/10",
    fields: [
      { id: "creditScore", label: "Credit Score", numeric: true },
      { id: "annualRevenue", label: "Annual Revenue (£)", numeric: true },
      { id: "industry", label: "Industry", numeric: false },
    ],
  },
  opportunity: {
    label: "Opportunity",
    icon: Briefcase,
    color: "text-emerald-600 bg-emerald-500/10",
    fields: [
      { id: "discountPct", label: "Discount %", numeric: true },
      { id: "amount", label: "Deal Value (£)", numeric: true },
      { id: "probability", label: "Probability %", numeric: true },
      { id: "stage", label: "Stage", numeric: false },
    ],
  },
  quote: {
    label: "Quote",
    icon: FileText,
    color: "text-purple-600 bg-purple-500/10",
    fields: [
      { id: "marginPct", label: "Margin %", numeric: true },
      { id: "paymentTermsDays", label: "Payment Terms (days)", numeric: true },
      { id: "total", label: "Total Price (£)", numeric: true },
    ],
  },
  order: {
    label: "Order",
    icon: ShoppingCart,
    color: "text-orange-600 bg-orange-500/10",
    fields: [
      { id: "orderValue", label: "Order Value (£)", numeric: true },
      { id: "deliverySlaDays", label: "Delivery SLA (days)", numeric: true },
      { id: "region", label: "Region", numeric: false },
    ],
  },
};

const ENTITIES: Entity[] = ["account", "opportunity", "quote", "order"];

const OPERATOR_LABEL: Record<Operator, string> = {
  gt: ">", gte: "≥", lt: "<", lte: "≤", eq: "=", neq: "≠", contains: "contains",
};

interface CriterionForm {
  id?: number;
  name: string;
  field: string;
  operator: Operator;
  threshold: string;
  thresholdText: string;
  level: number;
  roleId: number | null;
  active: boolean;
}

const emptyForm = (): CriterionForm => ({
  name: "", field: "", operator: "gt", threshold: "", thresholdText: "",
  level: 1, roleId: null, active: true,
});

export default function Approvals() {
  const [tab, setTab] = useState<Entity>("account");
  const [rolesOpen, setRolesOpen] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();

  const rolesQuery = useListApprovalRoles();
  const configsQuery = useListApprovalConfigs();
  const criteriaQuery = useListApprovalCriteria({ entity: tab });

  const updateConfigMutation = useUpdateApprovalConfig();
  const createCriterionMutation = useCreateApprovalCriterion();
  const updateCriterionMutation = useUpdateApprovalCriterion();
  const deleteCriterionMutation = useDeleteApprovalCriterion();
  const createRoleMutation = useCreateApprovalRole();
  const deleteRoleMutation = useDeleteApprovalRole();

  const roles: ApprovalRole[] = rolesQuery.data?.data ?? [];
  const config = configsQuery.data?.data?.find((c) => c.entity === tab);
  const criteria: ApprovalCriterion[] = criteriaQuery.data?.data ?? [];

  const rolesById = useMemo(() => {
    const m = new Map<number, ApprovalRole>();
    roles.forEach((r) => m.set(r.id, r));
    return m;
  }, [roles]);

  const [criterionForm, setCriterionForm] = useState<CriterionForm | null>(null);
  const [deletingCriterionId, setDeletingCriterionId] = useState<number | null>(null);

  const openCreate = () => setCriterionForm(emptyForm());
  const openEdit = (c: ApprovalCriterion) =>
    setCriterionForm({
      id: c.id,
      name: c.name,
      field: c.field,
      operator: (c.operator as Operator) ?? "gt",
      threshold: c.threshold == null ? "" : String(c.threshold),
      thresholdText: c.thresholdText ?? "",
      level: c.level,
      roleId: c.roleId ?? null,
      active: c.active,
    });

  const refreshAll = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: getListApprovalCriteriaQueryKey({ entity: tab }) }),
      qc.invalidateQueries({ queryKey: getListApprovalConfigsQueryKey() }),
    ]);
  };

  const saveCriterion = async () => {
    if (!criterionForm) return;
    const fieldMeta = ENTITY_META[tab].fields.find((f) => f.id === criterionForm.field);
    if (!criterionForm.name.trim() || !criterionForm.field) {
      toast({ title: "Missing fields", description: "Name and field are required.", variant: "destructive" });
      return;
    }
    const payload = {
      entity: tab as CreateApprovalCriterionInputEntity,
      name: criterionForm.name.trim(),
      field: criterionForm.field,
      operator: criterionForm.operator as CreateApprovalCriterionInputOperator,
      threshold: fieldMeta?.numeric && criterionForm.threshold !== "" ? Number(criterionForm.threshold) : null,
      thresholdText: !fieldMeta?.numeric && criterionForm.thresholdText ? criterionForm.thresholdText : null,
      level: criterionForm.level,
      roleId: criterionForm.roleId,
      active: criterionForm.active,
    };
    try {
      if (criterionForm.id) {
        await updateCriterionMutation.mutateAsync({ id: criterionForm.id, data: payload });
        toast({ title: "Criterion updated" });
      } else {
        await createCriterionMutation.mutateAsync({ data: payload });
        toast({ title: "Criterion created" });
      }
      setCriterionForm(null);
      await refreshAll();
    } catch {
      toast({ title: "Error", description: "Could not save criterion.", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (deletingCriterionId == null) return;
    try {
      await deleteCriterionMutation.mutateAsync({ id: deletingCriterionId });
      toast({ title: "Criterion deleted" });
      await refreshAll();
    } catch {
      toast({ title: "Error", description: "Could not delete.", variant: "destructive" });
    } finally {
      setDeletingCriterionId(null);
    }
  };

  const toggleMultiLevel = async (next: boolean) => {
    try {
      await updateConfigMutation.mutateAsync({ entity: tab, data: { multiLevel: next } });
      await qc.invalidateQueries({ queryKey: getListApprovalConfigsQueryKey() });
    } catch {
      toast({ title: "Error", description: "Could not update configuration.", variant: "destructive" });
    }
  };

  const toggleEnabled = async (next: boolean) => {
    try {
      await updateConfigMutation.mutateAsync({ entity: tab, data: { enabled: next } });
      await qc.invalidateQueries({ queryKey: getListApprovalConfigsQueryKey() });
    } catch {
      toast({ title: "Error", description: "Could not update configuration.", variant: "destructive" });
    }
  };

  const multiLevel = config?.multiLevel ?? false;
  const enabled = config?.enabled ?? true;
  const maxLevel = useMemo(() => {
    return criteria.reduce((m, c) => Math.max(m, c.level), 1);
  }, [criteria]);

  const groupedByLevel = useMemo(() => {
    const groups: Record<number, ApprovalCriterion[]> = {};
    for (const c of criteria) {
      (groups[c.level] ||= []).push(c);
    }
    return groups;
  }, [criteria]);

  const currentFieldMeta = criterionForm
    ? ENTITY_META[tab].fields.find((f) => f.id === criterionForm.field)
    : null;

  return (
    <Layout>
      <div className="flex flex-col gap-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-full bg-indigo-500/15 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold text-foreground tracking-tight">Approval Framework</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Configure criteria-based approval workflows for Accounts, Opportunities, Quotes, and Orders.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setRolesOpen(true)}>
              <Users2 className="w-4 h-4 mr-2" /> Manage Roles
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={(v) => setTab(v as Entity)} className="w-full">
          <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full sm:w-auto">
            {ENTITIES.map((e) => {
              const M = ENTITY_META[e];
              return (
                <TabsTrigger key={e} value={e} className="gap-2">
                  <M.icon className="w-3.5 h-3.5" />
                  <span>{M.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {ENTITIES.map((e) => (
            <TabsContent key={e} value={e} className="mt-4 space-y-4">
              {/* Config card */}
              <Card className="p-4 border-border">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    {(() => { const Icon = ENTITY_META[e].icon; return (
                      <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", ENTITY_META[e].color)}>
                        <Icon className="w-4 h-4" />
                      </div>
                    ); })()}
                    <div>
                      <div className="font-display text-base font-semibold text-foreground">
                        {ENTITY_META[e].label}_Approval_Config
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {criteria.length} {criteria.length === 1 ? "criterion" : "criteria"} configured
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="flex items-center justify-between rounded-lg border border-border p-3 bg-card">
                      <div>
                        <Label className="text-sm font-medium">Approvals enabled</Label>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          When off, no approval is required for {ENTITY_META[e].label.toLowerCase()}s.
                        </p>
                      </div>
                      <Switch checked={enabled} onCheckedChange={toggleEnabled} aria-label="Toggle approvals enabled" />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-border p-3 bg-card">
                      <div>
                        <Label className="text-sm font-medium">Multi-level approval</Label>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {multiLevel
                            ? `Approvals escalate from Level 1 to Level ${Math.max(maxLevel, 1)}.`
                            : "Single approver per criterion — no escalation."}
                        </p>
                      </div>
                      <Switch checked={multiLevel} onCheckedChange={toggleMultiLevel} aria-label="Toggle multi-level approval" />
                    </div>
                  </div>

                  {multiLevel && criteria.length > 0 && (
                    <div className="rounded-lg border border-dashed border-border p-3 bg-muted/30">
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1">
                        <Layers className="w-3 h-3" /> Approval Hierarchy
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {Array.from({ length: maxLevel }, (_, i) => i + 1).map((lvl, idx) => {
                          const items = groupedByLevel[lvl] ?? [];
                          const roleNames = Array.from(new Set(items.map((c) => rolesById.get(c.roleId ?? -1)?.name).filter(Boolean) as string[]));
                          return (
                            <React.Fragment key={lvl}>
                              <div className="px-2.5 py-1 rounded-md bg-card border border-border text-xs">
                                <div className="font-semibold text-foreground">Level {lvl}</div>
                                <div className="text-muted-foreground">{roleNames.join(", ") || "—"}</div>
                              </div>
                              {idx < maxLevel - 1 && <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />}
                            </React.Fragment>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </Card>

              {/* Criteria card */}
              <Card className="border-border overflow-hidden p-0">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/20">
                  <div>
                    <div className="text-sm font-semibold text-foreground">Criteria</div>
                    <div className="text-xs text-muted-foreground">Conditions that trigger approval routing.</div>
                  </div>
                  <Button size="sm" onClick={openCreate}>
                    <Plus className="w-4 h-4 mr-1.5" /> Add Criterion
                  </Button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-card border-b border-border">
                      <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="text-left px-3 py-2 font-semibold">Name</th>
                        <th className="text-left px-3 py-2 font-semibold">Condition</th>
                        <th className="text-left px-3 py-2 font-semibold">Level</th>
                        <th className="text-left px-3 py-2 font-semibold">Approver Role</th>
                        <th className="text-left px-3 py-2 font-semibold">Status</th>
                        <th className="text-right px-3 py-2 font-semibold w-24">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-card">
                      {criteriaQuery.isLoading ? (
                        <tr><td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">Loading...</td></tr>
                      ) : criteria.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-3 py-10 text-center text-muted-foreground">
                            No criteria yet. Click <span className="font-medium">Add Criterion</span> to define one.
                          </td>
                        </tr>
                      ) : criteria.map((c) => {
                        const fieldMeta = ENTITY_META[e].fields.find((f) => f.id === c.field);
                        const valueLabel = c.threshold != null
                          ? c.threshold.toLocaleString()
                          : c.thresholdText ?? "—";
                        const role = c.roleId != null ? rolesById.get(c.roleId) : null;
                        return (
                          <tr key={c.id} className="hover:bg-muted/40 transition-colors">
                            <td className="px-3 py-2 font-medium text-foreground">{c.name}</td>
                            <td className="px-3 py-2 text-muted-foreground">
                              <span className="font-mono text-xs">
                                {fieldMeta?.label ?? c.field}{" "}
                                <span className="text-foreground">{OPERATOR_LABEL[c.operator as Operator] ?? c.operator}</span>{" "}
                                {valueLabel}
                              </span>
                            </td>
                            <td className="px-3 py-2">
                              <Badge variant="outline" className="font-mono">L{c.level}</Badge>
                            </td>
                            <td className="px-3 py-2 text-foreground">
                              {role ? (
                                <span className="inline-flex items-center gap-1">
                                  <span>{role.name}</span>
                                  <span className="text-xs text-muted-foreground">(L{role.level})</span>
                                </span>
                              ) : <span className="text-muted-foreground">Unassigned</span>}
                            </td>
                            <td className="px-3 py-2">
                              <Badge variant="outline" className={c.active ? "border-emerald-500/40 text-emerald-700 bg-emerald-500/10" : "border-border text-muted-foreground"}>
                                {c.active ? "Active" : "Inactive"}
                              </Badge>
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex items-center justify-end gap-1">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(c)} aria-label={`Edit ${c.name}`}>
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeletingCriterionId(c.id)} aria-label={`Delete ${c.name}`}>
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* Criterion Dialog */}
      <Dialog open={criterionForm !== null} onOpenChange={(o) => { if (!o) setCriterionForm(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{criterionForm?.id ? "Edit Criterion" : "New Criterion"}</DialogTitle>
          </DialogHeader>
          {criterionForm && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <Label htmlFor="cName">Name</Label>
                <Input id="cName" value={criterionForm.name} onChange={(e) => setCriterionForm({ ...criterionForm, name: e.target.value })} placeholder="e.g. High Value Deals" />
              </div>
              <div>
                <Label htmlFor="cField">Field</Label>
                <Select value={criterionForm.field} onValueChange={(v) => setCriterionForm({ ...criterionForm, field: v })}>
                  <SelectTrigger id="cField"><SelectValue placeholder="Select field" /></SelectTrigger>
                  <SelectContent>
                    {ENTITY_META[tab].fields.map((f) => (
                      <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="cOp">Operator</Label>
                <Select value={criterionForm.operator} onValueChange={(v) => setCriterionForm({ ...criterionForm, operator: v as Operator })}>
                  <SelectTrigger id="cOp"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {currentFieldMeta?.numeric === false ? (
                      <>
                        <SelectItem value="eq">Equals</SelectItem>
                        <SelectItem value="neq">Not equal</SelectItem>
                        <SelectItem value="contains">Contains</SelectItem>
                      </>
                    ) : (
                      <>
                        <SelectItem value="gt">Greater than</SelectItem>
                        <SelectItem value="gte">Greater or equal</SelectItem>
                        <SelectItem value="lt">Less than</SelectItem>
                        <SelectItem value="lte">Less or equal</SelectItem>
                        <SelectItem value="eq">Equals</SelectItem>
                        <SelectItem value="neq">Not equal</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="cThreshold">Threshold</Label>
                {currentFieldMeta?.numeric === false ? (
                  <Input id="cThreshold" value={criterionForm.thresholdText} onChange={(e) => setCriterionForm({ ...criterionForm, thresholdText: e.target.value })} placeholder="Text value" />
                ) : (
                  <Input id="cThreshold" type="number" value={criterionForm.threshold} onChange={(e) => setCriterionForm({ ...criterionForm, threshold: e.target.value })} placeholder="0" />
                )}
              </div>
              <div>
                <Label htmlFor="cLevel">Approval Level</Label>
                <Select value={String(criterionForm.level)} onValueChange={(v) => setCriterionForm({ ...criterionForm, level: Number(v) })}>
                  <SelectTrigger id="cLevel"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((lvl) => (
                      <SelectItem key={lvl} value={String(lvl)}>Level {lvl}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="cRole">Approver Role</Label>
                <Select
                  value={criterionForm.roleId == null ? "none" : String(criterionForm.roleId)}
                  onValueChange={(v) => setCriterionForm({ ...criterionForm, roleId: v === "none" ? null : Number(v) })}
                >
                  <SelectTrigger id="cRole"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {roles.map((r) => (
                      <SelectItem key={r.id} value={String(r.id)}>{r.name} (L{r.level})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2 flex items-center justify-between rounded-md border border-border px-3 py-2 bg-muted/30">
                <Label htmlFor="cActive">Active</Label>
                <Switch id="cActive" checked={criterionForm.active} onCheckedChange={(v) => setCriterionForm({ ...criterionForm, active: v })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCriterionForm(null)}>Cancel</Button>
            <Button onClick={saveCriterion} disabled={createCriterionMutation.isPending || updateCriterionMutation.isPending}>
              {criterionForm?.id ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Roles Dialog */}
      <RolesDialog
        open={rolesOpen}
        onOpenChange={setRolesOpen}
        roles={roles}
        onCreate={async (data) => {
          try {
            await createRoleMutation.mutateAsync({ data });
            await qc.invalidateQueries({ queryKey: getListApprovalRolesQueryKey() });
            toast({ title: "Role added" });
          } catch {
            toast({ title: "Error", description: "Could not add role.", variant: "destructive" });
          }
        }}
        onDelete={async (id) => {
          try {
            await deleteRoleMutation.mutateAsync({ id });
            await qc.invalidateQueries({ queryKey: getListApprovalRolesQueryKey() });
            toast({ title: "Role deleted" });
          } catch {
            toast({ title: "Error", description: "Could not delete role.", variant: "destructive" });
          }
        }}
      />

      <AlertDialog open={deletingCriterionId !== null} onOpenChange={(o) => { if (!o) setDeletingCriterionId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete criterion?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}

interface RolesDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  roles: ApprovalRole[];
  onCreate: (data: { name: string; level: number; description: string | null }) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

function RolesDialog({ open, onOpenChange, roles, onCreate, onDelete }: RolesDialogProps) {
  const [name, setName] = useState("");
  const [level, setLevel] = useState(1);
  const [description, setDescription] = useState("");

  const handleAdd = async () => {
    if (!name.trim()) return;
    await onCreate({ name: name.trim(), level, description: description.trim() || null });
    setName(""); setLevel(1); setDescription("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Approval Roles</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="rounded-md border border-border max-h-64 overflow-y-auto divide-y divide-border">
            {roles.length === 0 ? (
              <div className="px-3 py-4 text-sm text-muted-foreground text-center">No roles yet.</div>
            ) : roles.map((r) => (
              <div key={r.id} className="flex items-center justify-between px-3 py-2">
                <div>
                  <div className="text-sm font-medium text-foreground">{r.name}</div>
                  <div className="text-xs text-muted-foreground">Level {r.level}{r.description ? ` • ${r.description}` : ""}</div>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(r.id)} aria-label={`Delete ${r.name}`}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            <div className="sm:col-span-2">
              <Label htmlFor="rName">Role name</Label>
              <Input id="rName" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sales_VP" />
            </div>
            <div>
              <Label htmlFor="rLevel">Level</Label>
              <Select value={String(level)} onValueChange={(v) => setLevel(Number(v))}>
                <SelectTrigger id="rLevel"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((lvl) => (
                    <SelectItem key={lvl} value={String(lvl)}>Level {lvl}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="rDesc">Description</Label>
              <Input id="rDesc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button onClick={handleAdd} disabled={!name.trim()}>
            <Plus className="w-4 h-4 mr-1.5" /> Add Role
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
