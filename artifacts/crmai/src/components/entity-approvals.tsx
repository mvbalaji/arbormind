import React, { useMemo } from "react";
import { Link } from "wouter";
import {
  useListApprovalRoles,
  useListApprovalConfigs,
  useListApprovalCriteria,
} from "@workspace/api-client-react";
import type { ApprovalRole, ApprovalCriterion } from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck, ShieldOff, CheckCircle2, AlertCircle, ArrowRight, Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Entity = "account" | "opportunity" | "quote" | "order";

const OPERATOR_LABEL: Record<string, string> = {
  gt: ">", gte: "≥", lt: "<", lte: "≤", eq: "=", neq: "≠", contains: "contains",
};

const FIELD_LABELS: Record<string, string> = {
  creditScore: "Credit Score",
  annualRevenue: "Annual Revenue",
  industry: "Industry",
  discountPct: "Discount %",
  amount: "Deal Value",
  probability: "Probability %",
  stage: "Stage",
  marginPct: "Margin %",
  paymentTermsDays: "Payment Terms (days)",
  total: "Total",
  orderValue: "Order Value",
  deliverySlaDays: "Delivery SLA (days)",
  region: "Region",
};

function compare(actual: unknown, op: string, threshold: number | null | undefined, thresholdText: string | null | undefined): { triggered: boolean; evaluable: boolean } {
  if (actual === undefined || actual === null || actual === "") return { triggered: false, evaluable: false };
  switch (op) {
    case "gt":  return { evaluable: typeof actual === "number" && threshold != null, triggered: typeof actual === "number" && threshold != null && actual >  threshold };
    case "gte": return { evaluable: typeof actual === "number" && threshold != null, triggered: typeof actual === "number" && threshold != null && actual >= threshold };
    case "lt":  return { evaluable: typeof actual === "number" && threshold != null, triggered: typeof actual === "number" && threshold != null && actual <  threshold };
    case "lte": return { evaluable: typeof actual === "number" && threshold != null, triggered: typeof actual === "number" && threshold != null && actual <= threshold };
    case "eq":  {
      if (threshold != null && typeof actual === "number") return { evaluable: true, triggered: actual === threshold };
      if (thresholdText != null) return { evaluable: true, triggered: String(actual).toLowerCase() === thresholdText.toLowerCase() };
      return { evaluable: false, triggered: false };
    }
    case "neq": {
      if (threshold != null && typeof actual === "number") return { evaluable: true, triggered: actual !== threshold };
      if (thresholdText != null) return { evaluable: true, triggered: String(actual).toLowerCase() !== thresholdText.toLowerCase() };
      return { evaluable: false, triggered: false };
    }
    case "contains":
      return { evaluable: thresholdText != null, triggered: thresholdText != null && String(actual).toLowerCase().includes(thresholdText.toLowerCase()) };
    default: return { evaluable: false, triggered: false };
  }
}

interface EntityApprovalsProps {
  entity: Entity;
  record: Record<string, unknown>;
  isAdmin?: boolean;
}

export function EntityApprovals({ entity, record, isAdmin }: EntityApprovalsProps) {
  const rolesQuery = useListApprovalRoles();
  const configsQuery = useListApprovalConfigs();
  const criteriaQuery = useListApprovalCriteria({ entity });

  const roles: ApprovalRole[] = rolesQuery.data?.data ?? [];
  const criteria: ApprovalCriterion[] = criteriaQuery.data?.data ?? [];
  const config = configsQuery.data?.data?.find((c) => c.entity === entity);

  const rolesById = useMemo(() => {
    const m = new Map<number, ApprovalRole>();
    roles.forEach((r) => m.set(r.id, r));
    return m;
  }, [roles]);

  const activeCriteria = criteria.filter((c) => c.active);

  const evaluations = activeCriteria.map((c) => {
    const actual = record[c.field];
    const { triggered, evaluable } = compare(actual, c.operator, c.threshold ?? null, c.thresholdText ?? null);
    return { criterion: c, actual, triggered, evaluable };
  });

  const triggered = evaluations.filter((e) => e.triggered);
  const maxLevel = triggered.reduce((m, e) => Math.max(m, e.criterion.level), 0);

  const approvalChain = useMemo(() => {
    if (!config?.multiLevel) {
      // single level: use the highest-level triggered criterion's role
      const top = [...triggered].sort((a, b) => b.criterion.level - a.criterion.level)[0];
      if (!top) return [];
      const role = top.criterion.roleId != null ? rolesById.get(top.criterion.roleId) : null;
      return role ? [{ level: top.criterion.level, role }] : [];
    }
    // multi-level: build cumulative chain from 1..maxLevel using triggered roles per level
    const chain: { level: number; role: ApprovalRole }[] = [];
    for (let lvl = 1; lvl <= maxLevel; lvl++) {
      const items = triggered.filter((e) => e.criterion.level === lvl);
      const seen = new Set<number>();
      for (const it of items) {
        if (it.criterion.roleId != null && !seen.has(it.criterion.roleId)) {
          const r = rolesById.get(it.criterion.roleId);
          if (r) { chain.push({ level: lvl, role: r }); seen.add(it.criterion.roleId); }
        }
      }
    }
    return chain;
  }, [config, triggered, rolesById, maxLevel]);

  const formatValue = (v: unknown) => {
    if (v == null || v === "") return "—";
    if (typeof v === "number") return v.toLocaleString();
    return String(v);
  };

  if (criteriaQuery.isLoading || configsQuery.isLoading) {
    return (
      <Card className="border-border p-6">
        <div className="text-sm text-muted-foreground">Loading approval rules…</div>
      </Card>
    );
  }

  if (config && !config.enabled) {
    return (
      <Card className="border-border p-6">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
            <ShieldOff className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <div className="font-display font-semibold text-foreground">Approvals are disabled</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              No approval is required for {entity}s. {isAdmin && (
                <Link href="/admin/approvals" className="text-primary hover:underline">Configure</Link>
              )}
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Status banner */}
      <Card className={cn(
        "border-border p-4 flex items-start gap-3",
        triggered.length === 0
          ? "bg-emerald-500/5 border-emerald-500/30"
          : "bg-amber-500/5 border-amber-500/30",
      )}>
        <div className={cn(
          "w-9 h-9 rounded-full flex items-center justify-center shrink-0",
          triggered.length === 0 ? "bg-emerald-500/15" : "bg-amber-500/15",
        )}>
          {triggered.length === 0
            ? <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            : <AlertCircle className="w-4 h-4 text-amber-600" />}
        </div>
        <div className="flex-1">
          <div className="font-display font-semibold text-foreground">
            {triggered.length === 0
              ? "No approval required"
              : `Approval required — ${approvalChain.length || 1} ${approvalChain.length === 1 ? "approver" : "approvers"}`}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {triggered.length === 0
              ? "All active criteria pass. This record can proceed without escalation."
              : config?.multiLevel
                ? `Escalates through Level 1 → Level ${maxLevel}.`
                : "Single-level approval routing."}
          </div>
        </div>
        {isAdmin && (
          <Link href="/admin/approvals">
            <Button variant="ghost" size="sm" className="gap-1.5">
              <Settings className="w-3.5 h-3.5" /> Configure
            </Button>
          </Link>
        )}
      </Card>

      {/* Approval chain */}
      {approvalChain.length > 0 && (
        <Card className="border-border p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            Approval Chain
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {approvalChain.map((step, idx) => (
              <React.Fragment key={`${step.level}-${step.role.id}`}>
                <div className="px-3 py-1.5 rounded-md bg-card border border-border text-xs">
                  <div className="font-semibold text-foreground">{step.role.name}</div>
                  <div className="text-muted-foreground">Level {step.level}</div>
                </div>
                {idx < approvalChain.length - 1 && <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />}
              </React.Fragment>
            ))}
          </div>
        </Card>
      )}

      {/* Criteria evaluation */}
      <Card className="border-border overflow-hidden p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/20">
          <div>
            <div className="text-sm font-semibold text-foreground">Criteria Evaluation</div>
            <div className="text-xs text-muted-foreground">
              {activeCriteria.length} active {activeCriteria.length === 1 ? "criterion" : "criteria"} for {entity}s
            </div>
          </div>
        </div>
        {activeCriteria.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-muted-foreground">
            No active criteria configured. {isAdmin && (
              <Link href="/admin/approvals" className="text-primary hover:underline">Define some →</Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-card border-b border-border">
                <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="text-left px-3 py-2 font-semibold">Criterion</th>
                  <th className="text-left px-3 py-2 font-semibold">Condition</th>
                  <th className="text-left px-3 py-2 font-semibold">Record Value</th>
                  <th className="text-left px-3 py-2 font-semibold">Level / Approver</th>
                  <th className="text-left px-3 py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {evaluations.map(({ criterion: c, actual, triggered: isT, evaluable }) => {
                  const role = c.roleId != null ? rolesById.get(c.roleId) : null;
                  return (
                    <tr key={c.id} className="hover:bg-muted/40 transition-colors">
                      <td className="px-3 py-2 font-medium text-foreground">{c.name}</td>
                      <td className="px-3 py-2 text-muted-foreground font-mono text-xs">
                        {FIELD_LABELS[c.field] ?? c.field}{" "}
                        <span className="text-foreground">{OPERATOR_LABEL[c.operator] ?? c.operator}</span>{" "}
                        {c.threshold != null ? c.threshold.toLocaleString() : c.thresholdText ?? "—"}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-foreground">{formatValue(actual)}</td>
                      <td className="px-3 py-2 text-foreground">
                        <Badge variant="outline" className="font-mono mr-1.5">L{c.level}</Badge>
                        {role ? <span className="text-xs text-muted-foreground">{role.name}</span> : <span className="text-xs text-muted-foreground">Unassigned</span>}
                      </td>
                      <td className="px-3 py-2">
                        {!evaluable ? (
                          <Badge variant="outline" className="border-border text-muted-foreground text-xs">
                            Not evaluable
                          </Badge>
                        ) : isT ? (
                          <Badge variant="outline" className="border-amber-500/40 text-amber-700 bg-amber-500/10 text-xs">
                            Triggers approval
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-emerald-500/40 text-emerald-700 bg-emerald-500/10 text-xs">
                            Passes
                          </Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

export function EntityApprovalsCardHeader() {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="w-8 h-8 rounded-full bg-indigo-500/15 flex items-center justify-center">
        <ShieldCheck className="w-4 h-4 text-indigo-600" />
      </div>
      <div>
        <div className="font-display font-semibold text-foreground">Approvals</div>
      </div>
    </div>
  );
}
