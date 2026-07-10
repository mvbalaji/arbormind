import React, { useEffect, useMemo, useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Building2, Briefcase, FileText, ShoppingCart, Plus, Pencil, Trash2,
  ShieldCheck, ArrowRight, Users2, Eye, Download, Save, Copy, X, ChevronRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

type Entity = "account" | "opportunity" | "quote" | "order";
type Operator = "gt" | "gte" | "lt" | "lte" | "eq" | "neq" | "contains";

const ENTITY_META: Record<Entity, { label: string; icon: React.ComponentType<{ className?: string }>; fields: { id: string; label: string; numeric: boolean }[] }> = {
  account: {
    label: "Account",
    icon: Building2,
    fields: [
      { id: "creditScore", label: "Credit Score", numeric: true },
      { id: "annualRevenue", label: "Annual Revenue (£)", numeric: true },
      { id: "industry", label: "Industry", numeric: false },
    ],
  },
  opportunity: {
    label: "Opportunity",
    icon: Briefcase,
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
    fields: [
      { id: "marginPct", label: "Margin %", numeric: true },
      { id: "paymentTermsDays", label: "Payment Terms (days)", numeric: true },
      { id: "total", label: "Total Price (£)", numeric: true },
    ],
  },
  order: {
    label: "Order",
    icon: ShoppingCart,
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

interface ThresholdSettings {
  dynamicThresholds: boolean;
  autoApproveBelow: boolean;
  escalateSlaBreached: boolean;
  defaultSource: "system" | "manual" | "ai";
  overrideAllowed: "yes" | "no";
}

const DEFAULT_SETTINGS: ThresholdSettings = {
  dynamicThresholds: true,
  autoApproveBelow: false,
  escalateSlaBreached: false,
  defaultSource: "system",
  overrideAllowed: "yes",
};

function loadSettings(entity: Entity): ThresholdSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(`approval-settings-${entity}`);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(entity: Entity, s: ThresholdSettings) {
  try {
    localStorage.setItem(`approval-settings-${entity}`, JSON.stringify(s));
  } catch {
    // ignore
  }
}

export default function Approvals() {
  const [entity, setEntity] = useState<Entity>("opportunity");
  const [rolesOpen, setRolesOpen] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();

  const rolesQuery = useListApprovalRoles();
  const configsQuery = useListApprovalConfigs();
  const criteriaQuery = useListApprovalCriteria({ entity });

  const updateConfigMutation = useUpdateApprovalConfig();
  const createCriterionMutation = useCreateApprovalCriterion();
  const updateCriterionMutation = useUpdateApprovalCriterion();
  const deleteCriterionMutation = useDeleteApprovalCriterion();
  const createRoleMutation = useCreateApprovalRole();
  const deleteRoleMutation = useDeleteApprovalRole();

  const roles: ApprovalRole[] = rolesQuery.data?.data ?? [];
  const config = configsQuery.data?.data?.find((c) => c.entity === entity);
  const criteria: ApprovalCriterion[] = criteriaQuery.data?.data ?? [];

  const rolesById = useMemo(() => {
    const m = new Map<number, ApprovalRole>();
    roles.forEach((r) => m.set(r.id, r));
    return m;
  }, [roles]);

  const [criterionForm, setCriterionForm] = useState<CriterionForm | null>(null);
  const [deletingCriterionId, setDeletingCriterionId] = useState<number | null>(null);
  const [settings, setSettings] = useState<ThresholdSettings>(() => loadSettings("opportunity"));
  const [cloneOpen, setCloneOpen] = useState(false);
  const [diagramOpen, setDiagramOpen] = useState(false);
  const [cloneTarget, setCloneTarget] = useState<Entity>("account");
  const [cloning, setCloning] = useState(false);

  useEffect(() => {
    setSettings(loadSettings(entity));
  }, [entity]);

  const updateSetting = <K extends keyof ThresholdSettings>(key: K, value: ThresholdSettings[K]) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    saveSettings(entity, next);
  };

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
      qc.invalidateQueries({ queryKey: getListApprovalCriteriaQueryKey({ entity }) }),
      qc.invalidateQueries({ queryKey: getListApprovalConfigsQueryKey() }),
    ]);
  };

  const saveCriterion = async () => {
    if (!criterionForm) return;
    const fieldMeta = ENTITY_META[entity].fields.find((f) => f.id === criterionForm.field);
    if (!criterionForm.name.trim() || !criterionForm.field) {
      toast({ title: "Missing fields", description: "Name and field are required.", variant: "destructive" });
      return;
    }
    const payload = {
      entity: entity as CreateApprovalCriterionInputEntity,
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
      await updateConfigMutation.mutateAsync({ entity, data: { multiLevel: next } });
      await qc.invalidateQueries({ queryKey: getListApprovalConfigsQueryKey() });
    } catch {
      toast({ title: "Error", description: "Could not update configuration.", variant: "destructive" });
    }
  };

  const toggleEnabled = async (next: boolean) => {
    try {
      await updateConfigMutation.mutateAsync({ entity, data: { enabled: next } });
      await qc.invalidateQueries({ queryKey: getListApprovalConfigsQueryKey() });
    } catch {
      toast({ title: "Error", description: "Could not update configuration.", variant: "destructive" });
    }
  };

  const multiLevel = config?.multiLevel ?? false;
  const enabled = config?.enabled ?? true;

  // Group criteria by name to build the role mapping matrix
  const criteriaByName = useMemo(() => {
    const m = new Map<string, ApprovalCriterion[]>();
    for (const c of criteria) {
      const arr = m.get(c.name) ?? [];
      arr.push(c);
      m.set(c.name, arr);
    }
    return m;
  }, [criteria]);

  // For the criteria configuration table: one row per unique name (use lowest-level entry as canonical)
  const canonicalCriteria = useMemo(() => {
    const out: { canonical: ApprovalCriterion; levels: ApprovalCriterion[] }[] = [];
    for (const [, levels] of criteriaByName) {
      const sorted = [...levels].sort((a, b) => a.level - b.level);
      out.push({ canonical: sorted[0], levels: sorted });
    }
    return out;
  }, [criteriaByName]);

  // Build example flow for workflow preview
  const exampleFlow = useMemo(() => {
    const first = canonicalCriteria[0];
    if (!first) return null;
    const c = first.canonical;
    const op = OPERATOR_LABEL[c.operator as Operator] ?? c.operator;
    const val = c.threshold != null ? c.threshold.toLocaleString() : c.thresholdText ?? "—";
    const fieldMeta = ENTITY_META[entity].fields.find((f) => f.id === c.field);
    const roleNames = first.levels.map((l) => rolesById.get(l.roleId ?? -1)?.name).filter(Boolean) as string[];
    return {
      label: `${fieldMeta?.label ?? c.field} ${op} ${val}`,
      roles: roleNames.length > 0 ? roleNames : ["Approver"],
    };
  }, [canonicalCriteria, rolesById, entity]);

  const currentFieldMeta = criterionForm
    ? ENTITY_META[entity].fields.find((f) => f.id === criterionForm.field)
    : null;

  const lastUpdated = config?.updatedAt ? new Date(config.updatedAt) : new Date();
  const EntityIcon = ENTITY_META[entity].icon;

  // Inline-edit a role at a given (criterionName, level) cell
  const setRoleAt = async (
    canonical: ApprovalCriterion,
    levels: ApprovalCriterion[],
    level: number,
    nextRoleId: number | null,
  ) => {
    try {
      const existing = levels.find((l) => l.level === level);
      if (existing) {
        // Existing row at this level
        if (nextRoleId == null && level > 1) {
          // Clearing a non-L1 row: remove the criterion entirely
          await deleteCriterionMutation.mutateAsync({ id: existing.id });
        } else {
          await updateCriterionMutation.mutateAsync({
            id: existing.id,
            data: {
              entity: entity as CreateApprovalCriterionInputEntity,
              name: existing.name,
              field: existing.field,
              operator: existing.operator as CreateApprovalCriterionInputOperator,
              threshold: existing.threshold ?? null,
              thresholdText: existing.thresholdText ?? null,
              level: existing.level,
              roleId: nextRoleId,
              active: existing.active,
            },
          });
        }
      } else if (nextRoleId != null) {
        // No row at this level yet — create a new criterion mirroring the canonical
        await createCriterionMutation.mutateAsync({
          data: {
            entity: entity as CreateApprovalCriterionInputEntity,
            name: canonical.name,
            field: canonical.field,
            operator: canonical.operator as CreateApprovalCriterionInputOperator,
            threshold: canonical.threshold ?? null,
            thresholdText: canonical.thresholdText ?? null,
            level,
            roleId: nextRoleId,
            active: canonical.active,
          },
        });
        // Auto-enable multi-level when adding L2/L3 roles
        if (level > 1 && !multiLevel) {
          await updateConfigMutation.mutateAsync({ entity, data: { multiLevel: true } });
          await qc.invalidateQueries({ queryKey: getListApprovalConfigsQueryKey() });
        }
      }
      await refreshAll();
    } catch {
      toast({ title: "Error", description: "Could not update role mapping.", variant: "destructive" });
    }
  };

  const handleClone = async () => {
    if (cloneTarget === entity) {
      toast({ title: "Pick a different entity", description: "Choose an entity other than the current one.", variant: "destructive" });
      return;
    }
    if (criteria.length === 0) {
      toast({ title: "Nothing to clone", description: "Add at least one criterion first.", variant: "destructive" });
      return;
    }
    setCloning(true);
    try {
      const targetFields = ENTITY_META[cloneTarget].fields;
      let cloned = 0;
      for (const c of criteria) {
        const targetField =
          targetFields.find((f) => f.id === c.field)?.id
          ?? targetFields.find((f) => f.numeric === (c.threshold != null))?.id
          ?? targetFields[0]?.id
          ?? c.field;
        await createCriterionMutation.mutateAsync({
          data: {
            entity: cloneTarget as CreateApprovalCriterionInputEntity,
            name: c.name,
            field: targetField,
            operator: c.operator as CreateApprovalCriterionInputOperator,
            threshold: c.threshold ?? null,
            thresholdText: c.thresholdText ?? null,
            level: c.level,
            roleId: c.roleId ?? null,
            active: c.active,
          },
        });
        cloned += 1;
      }
      // Mirror multi-level setting
      if (multiLevel) {
        await updateConfigMutation.mutateAsync({ entity: cloneTarget, data: { multiLevel: true } });
      }
      saveSettings(cloneTarget, settings);
      await Promise.all([
        qc.invalidateQueries({ queryKey: getListApprovalCriteriaQueryKey({ entity: cloneTarget }) }),
        qc.invalidateQueries({ queryKey: getListApprovalConfigsQueryKey() }),
      ]);
      toast({
        title: "Configuration cloned",
        description: `Copied ${cloned} criteria to ${ENTITY_META[cloneTarget].label}. Review field mappings on that entity.`,
      });
      setCloneOpen(false);
      setEntity(cloneTarget);
    } catch {
      toast({ title: "Error", description: "Could not clone configuration.", variant: "destructive" });
    } finally {
      setCloning(false);
    }
  };

  const handleExport = () => {
    const data = {
      entity,
      enabled,
      multiLevel,
      settings,
      criteria: criteria.map((c) => ({
        name: c.name, field: c.field, operator: c.operator,
        threshold: c.threshold, thresholdText: c.thresholdText,
        level: c.level, roleId: c.roleId,
        roleName: c.roleId != null ? rolesById.get(c.roleId)?.name : null,
        active: c.active,
      })),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `approval-config-${entity}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Layout>
      <div className="flex flex-col gap-4">
        {/* Blue gradient header */}
        <div className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-4 flex items-center justify-between text-white shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-8 rounded-lg bg-white/15 flex items-center justify-center backdrop-blur-sm">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-display font-bold tracking-tight">Approval Configuration</h1>
              <p className="text-xs text-white/80">Manage criteria, role mapping, and routing rules per entity.</p>
            </div>
          </div>
          <Button variant="ghost" className="text-white hover:bg-white/10" onClick={() => setRolesOpen(true)}>
            <Users2 className="w-4 h-4 mr-2" /> Manage Roles
          </Button>
        </div>

        {/* Entity selector + metadata bar */}
        <Card className="border-border px-2 py-1">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Entity:</span>
              <Select value={entity} onValueChange={(v) => setEntity(v as Entity)}>
                <SelectTrigger className="w-44 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ENTITIES.map((e) => {
                    const M = ENTITY_META[e];
                    return (
                      <SelectItem key={e} value={e}>
                        <span className="inline-flex items-center gap-2">
                          <M.icon className="w-3.5 h-3.5" /> {M.label}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="text-muted-foreground"><span className="font-medium text-foreground">Version:</span> v1.1</div>
            <div className="text-muted-foreground"><span className="font-medium text-foreground">Views:</span> {canonicalCriteria.length}</div>
            <div className="text-muted-foreground">
              <span className="font-medium text-foreground">Last Updated:</span>{" "}
              {format(lastUpdated, "MMM d, yyyy")}
            </div>
            <div className="ml-auto flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Label htmlFor="enabled-toggle" className="text-xs text-muted-foreground cursor-pointer">Enabled</Label>
                <Switch id="enabled-toggle" checked={enabled} onCheckedChange={toggleEnabled} />
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="multi-toggle" className="text-xs text-muted-foreground cursor-pointer">Multi-level</Label>
                <Switch id="multi-toggle" checked={multiLevel} onCheckedChange={toggleMultiLevel} />
              </div>
            </div>
          </div>
        </Card>

        {/* Two-column body */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* LEFT: Criteria Configuration + Role Mapping */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            {/* Criteria Configuration card */}
            <Card className="border-border overflow-hidden p-0">
              <div className="px-2 py-1 border-b border-border bg-muted/30">
                <div className="font-display font-semibold text-foreground">Criteria Configuration</div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-card border-b border-border">
                    <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="text-left px-3 py-1 font-semibold">Criteria Name</th>
                      <th className="text-left px-3 py-1 font-semibold">Field / Attribute</th>
                      <th className="text-left px-3 py-1 font-semibold">Operator</th>
                      <th className="text-left px-3 py-1 font-semibold">Threshold</th>
                      <th className="text-left px-3 py-1 font-semibold">Approval Type</th>
                      <th className="text-right px-3 py-1 font-semibold w-20">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-card">
                    {criteriaQuery.isLoading ? (
                      <tr><td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">Loading…</td></tr>
                    ) : canonicalCriteria.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-3 py-10 text-center text-muted-foreground">
                          No criteria yet. Click <span className="font-medium">Add Criteria</span> to define one.
                        </td>
                      </tr>
                    ) : canonicalCriteria.map(({ canonical: c, levels }) => {
                      const fieldMeta = ENTITY_META[entity].fields.find((f) => f.id === c.field);
                      const valueLabel = c.threshold != null
                        ? c.threshold.toLocaleString()
                        : c.thresholdText ?? "—";
                      const isMulti = levels.length > 1;
                      return (
                        <tr key={c.id} className="hover:bg-muted/40 transition-colors">
                          <td className="px-3 py-1 font-medium text-foreground">{c.name}</td>
                          <td className="px-3 py-1 text-muted-foreground">{fieldMeta?.label ?? c.field}</td>
                          <td className="px-3 py-1 font-mono text-xs text-foreground">{OPERATOR_LABEL[c.operator as Operator] ?? c.operator}</td>
                          <td className="px-3 py-1 font-mono text-xs text-foreground">{valueLabel}</td>
                          <td className="px-3 py-1">
                            {isMulti ? (
                              <Badge variant="outline" className="border-indigo-500/40 text-indigo-700 bg-indigo-500/10 text-xs">
                                Multi-Level
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="border-border text-muted-foreground text-xs">
                                Single
                              </Badge>
                            )}
                          </td>
                          <td className="px-3 py-1">
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
              <div className="px-2 py-1 border-t border-border bg-card">
                <Button size="sm" onClick={openCreate} className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Plus className="w-4 h-4 mr-1.5" /> Add Criteria
                </Button>
              </div>
            </Card>

            {/* Approval Role Mapping card */}
            <Card className="border-border overflow-hidden p-0">
              <div className="px-2 py-1 border-b border-border bg-muted/30">
                <div className="font-display font-semibold text-foreground">Approval Role Mapping</div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-card border-b border-border">
                    <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="text-left px-3 py-1 font-semibold">Criteria Name</th>
                      <th className="text-left px-3 py-1 font-semibold">Level 1 Role</th>
                      <th className="text-left px-3 py-1 font-semibold">Level 2 Role</th>
                      <th className="text-left px-3 py-1 font-semibold">Level 3 Role</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-card">
                    {canonicalCriteria.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">
                          Add a criterion to map approval roles.
                        </td>
                      </tr>
                    ) : canonicalCriteria.map(({ canonical: c, levels }) => {
                      const roleIdAt = (lvl: number) => {
                        const match = levels.find((l) => l.level === lvl);
                        return match?.roleId ?? null;
                      };
                      const renderRoleCell = (lvl: number) => {
                        const current = roleIdAt(lvl);
                        return (
                          <Select
                            value={current == null ? "none" : String(current)}
                            onValueChange={(v) => setRoleAt(c, levels, lvl, v === "none" ? null : Number(v))}
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue placeholder="—" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">—</SelectItem>
                              {roles.map((r) => (
                                <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        );
                      };
                      return (
                        <tr key={c.id} className="hover:bg-muted/40 transition-colors">
                          <td className="px-3 py-1 font-medium text-foreground">{c.name}</td>
                          <td className="px-2 py-1.5 w-44">{renderRoleCell(1)}</td>
                          <td className="px-2 py-1.5 w-44">{renderRoleCell(2)}</td>
                          <td className="px-2 py-1.5 w-44">{renderRoleCell(3)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* RIGHT: Workflow Preview + Threshold Settings */}
          <div className="flex flex-col gap-4">
            {/* Workflow Preview */}
            <Card className="border-border p-4">
              <div className="font-display font-semibold text-foreground mb-3">Workflow Preview</div>
              <div className="rounded-lg border border-border bg-muted/20 p-3 text-sm space-y-2">
                <div className="flex items-center gap-1.5 text-foreground">
                  <EntityIcon className="w-3.5 h-3.5 text-blue-600" />
                  <span className="font-medium">{ENTITY_META[entity].label}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Criteria Evaluation</span>
                </div>
                <div className="flex items-center gap-1.5 text-foreground">
                  <Users2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="font-medium">Role Assignment</span>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Approval Process</span>
                </div>
                <div className="flex items-center gap-1.5 text-foreground">
                  <FileText className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="font-medium">Audit Trail</span>
                </div>
              </div>

              {exampleFlow && (
                <div className="mt-3 rounded-lg border border-dashed border-border p-3 text-xs">
                  <div className="text-muted-foreground mb-1.5">Example:</div>
                  <div className="font-mono text-foreground mb-2">{exampleFlow.label}</div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {exampleFlow.roles.map((r, idx) => (
                      <React.Fragment key={`${r}-${idx}`}>
                        <span className="px-2 py-0.5 rounded bg-card border border-border text-xs">{r}</span>
                        {idx < exampleFlow.roles.length - 1 && <ArrowRight className="w-3 h-3 text-muted-foreground" />}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2 mt-3">
                <Button size="sm" variant="outline" className="flex-1 min-w-0" onClick={() => setDiagramOpen(true)}>
                  <Eye className="w-3.5 h-3.5 mr-1.5" /> View Workflow Diagram
                </Button>
                <Button size="sm" variant="outline" className="flex-1 min-w-0" onClick={handleExport}>
                  <Download className="w-3.5 h-3.5 mr-1.5" /> Export Configuration
                </Button>
              </div>
            </Card>

            {/* Threshold Settings */}
            <Card className="border-border p-4">
              <div className="font-display font-semibold text-foreground mb-3">Threshold Settings</div>
              <div className="space-y-2.5 text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={settings.dynamicThresholds} onCheckedChange={(v) => updateSetting("dynamicThresholds", Boolean(v))} />
                  <span className="text-foreground">Enable Dynamic Thresholds</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={settings.autoApproveBelow} onCheckedChange={(v) => updateSetting("autoApproveBelow", Boolean(v))} />
                  <span className="text-foreground">Auto-Approve Below Threshold</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={settings.escalateSlaBreached} onCheckedChange={(v) => updateSetting("escalateSlaBreached", Boolean(v))} />
                  <span className="text-foreground">Escalate if SLA &gt; 24 hours</span>
                </label>
              </div>
              <div className="mt-4 space-y-2.5">
                <div className="flex items-center justify-between gap-3">
                  <Label className="text-sm text-muted-foreground">Default Threshold Source:</Label>
                  <Select value={settings.defaultSource} onValueChange={(v) => updateSetting("defaultSource", v as ThresholdSettings["defaultSource"])}>
                    <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="system">System Config</SelectItem>
                      <SelectItem value="manual">Manual</SelectItem>
                      <SelectItem value="ai">AI Suggested</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <Label className="text-sm text-muted-foreground">Override Allowed:</Label>
                  <Select value={settings.overrideAllowed} onValueChange={(v) => updateSetting("overrideAllowed", v as ThresholdSettings["overrideAllowed"])}>
                    <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Bottom action bar */}
        <Card className="border-border p-3 flex flex-wrap items-center gap-2">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => { saveSettings(entity, settings); toast({ title: "Configuration saved", description: `${ENTITY_META[entity].label} approval settings updated.` }); }}>
            <Save className="w-4 h-4 mr-2" /> Save Configuration
          </Button>
          <Button variant="outline" onClick={() => { setCloneTarget(ENTITIES.find((e) => e !== entity) ?? "account"); setCloneOpen(true); }}>
            <Copy className="w-4 h-4 mr-2" /> Clone for Another Entity
          </Button>
          <Button variant="ghost" className="text-muted-foreground" onClick={() => { setSettings(loadSettings(entity)); toast({ title: "Changes discarded" }); }}>
            <X className="w-4 h-4 mr-2" /> Cancel
          </Button>
        </Card>
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
                <Input id="cName" value={criterionForm.name} onChange={(e) => setCriterionForm({ ...criterionForm, name: e.target.value })} placeholder="e.g. High Discount" />
              </div>
              <div>
                <Label htmlFor="cField">Field</Label>
                <Select value={criterionForm.field} onValueChange={(v) => setCriterionForm({ ...criterionForm, field: v })}>
                  <SelectTrigger id="cField"><SelectValue placeholder="Select field" /></SelectTrigger>
                  <SelectContent>
                    {ENTITY_META[entity].fields.map((f) => (
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
              <div className="sm:col-span-2 flex items-center justify-between rounded-md border border-border px-3 py-1 bg-muted/30">
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

      {/* Clone dialog */}
      <Dialog open={cloneOpen} onOpenChange={setCloneOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Clone configuration</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              Copy all {criteria.length} criteria from <span className="font-medium text-foreground">{ENTITY_META[entity].label}</span> to another entity.
              Field mappings are auto-matched where possible — review them on the target.
            </p>
            <div>
              <Label htmlFor="cloneTarget">Target entity</Label>
              <Select value={cloneTarget} onValueChange={(v) => setCloneTarget(v as Entity)}>
                <SelectTrigger id="cloneTarget"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ENTITIES.filter((e) => e !== entity).map((e) => {
                    const M = ENTITY_META[e];
                    return (
                      <SelectItem key={e} value={e}>
                        <span className="inline-flex items-center gap-2"><M.icon className="w-3.5 h-3.5" /> {M.label}</span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloneOpen(false)} disabled={cloning}>Cancel</Button>
            <Button onClick={handleClone} disabled={cloning} className="bg-blue-600 hover:bg-blue-700 text-white">
              {cloning ? "Cloning…" : "Clone Configuration"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Workflow diagram dialog */}
      <Dialog open={diagramOpen} onOpenChange={setDiagramOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Workflow Diagram — {ENTITY_META[entity].label}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* High-level pipeline */}
            <div className="flex flex-wrap items-center gap-2">
              {[
                { icon: EntityIcon, label: ENTITY_META[entity].label, color: "bg-blue-500/10 text-blue-700 border-blue-500/30" },
                { icon: ShieldCheck, label: "Criteria Evaluation", color: "bg-amber-500/10 text-amber-700 border-amber-500/30" },
                { icon: Users2, label: "Role Assignment", color: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30" },
                { icon: FileText, label: "Approval Process", color: "bg-indigo-500/10 text-indigo-700 border-indigo-500/30" },
                { icon: FileText, label: "Audit Trail", color: "bg-purple-500/10 text-purple-700 border-purple-500/30" },
              ].map((step, idx, arr) => {
                const Icon = step.icon;
                return (
                  <React.Fragment key={step.label}>
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-lg border ${step.color}`}>
                      <Icon className="w-4 h-4" />
                      <span className="text-sm font-medium">{step.label}</span>
                    </div>
                    {idx < arr.length - 1 && <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />}
                  </React.Fragment>
                );
              })}
            </div>

            {/* Criterion-by-criterion flow */}
            <div className="rounded-lg border border-border p-4 bg-muted/20">
              <div className="text-xs uppercase tracking-wide text-muted-foreground mb-3 font-semibold">Configured Approval Chains</div>
              {canonicalCriteria.length === 0 ? (
                <div className="text-sm text-muted-foreground py-4 text-center">No criteria configured yet.</div>
              ) : (
                <div className="space-y-3">
                  {canonicalCriteria.map(({ canonical: c, levels }) => {
                    const fieldMeta = ENTITY_META[entity].fields.find((f) => f.id === c.field);
                    const op = OPERATOR_LABEL[c.operator as Operator] ?? c.operator;
                    const val = c.threshold != null ? c.threshold.toLocaleString() : c.thresholdText ?? "—";
                    const chain = [...levels].sort((a, b) => a.level - b.level);
                    return (
                      <div key={c.id} className="bg-card rounded-md border border-border p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-medium text-sm text-foreground">{c.name}</div>
                          <div className="font-mono text-xs text-muted-foreground">
                            {fieldMeta?.label ?? c.field} {op} {val}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2 py-1 rounded-md bg-amber-500/10 text-amber-700 border border-amber-500/30 text-xs">Trigger</span>
                          {chain.map((lvl, i) => {
                            const role = lvl.roleId != null ? rolesById.get(lvl.roleId) : null;
                            return (
                              <React.Fragment key={lvl.id}>
                                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                                <span className="px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-700 border border-emerald-500/30 text-xs">
                                  L{lvl.level}: {role?.name ?? "Unassigned"}
                                </span>
                                {i === chain.length - 1 && (
                                  <>
                                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                                    <span className="px-2 py-1 rounded-md bg-indigo-500/10 text-indigo-700 border border-indigo-500/30 text-xs">Approved</span>
                                  </>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="text-xs text-muted-foreground">
              {enabled
                ? `Approvals are enabled. ${multiLevel ? "Multi-level escalation is on — approvers act in sequence L1 → L2 → L3." : "Single-level mode — one approver per criterion."}`
                : "Approvals are currently disabled for this entity. Toggle 'Enabled' to activate routing."}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDiagramOpen(false)}>Close</Button>
            <Button onClick={handleExport} className="bg-blue-600 hover:bg-blue-700 text-white">
              <Download className="w-4 h-4 mr-2" /> Export Configuration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              <div key={r.id} className="flex items-center justify-between px-3 py-1">
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
