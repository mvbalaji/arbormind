import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Layout } from "@/components/layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/context/auth";
import {
  ShieldCheck, CheckCircle2, XCircle, ChevronDown, MoreHorizontal, Building2, Briefcase, FileText, ShoppingCart,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type Scope = "mine" | "team" | "all";
type Entity = "account" | "opportunity" | "quote" | "order";

interface AuditEvent {
  id: number;
  event: string;
  actorUserId: number | null;
  actorName: string | null;
  comment: string | null;
  createdAt: string;
}
interface ApprovalRequest {
  id: number;
  entity: Entity;
  entityId: number;
  status: "open" | "approved" | "rejected" | "cancelled";
  level: number;
  roleId: number | null;
  roleName: string | null;
  requestedBy: number | null;
  requestedByName: string | null;
  requestedAt: string;
  decidedBy: number | null;
  decidedByName: string | null;
  decidedAt: string | null;
  comment: string | null;
  events: AuditEvent[];
}

const SCOPE_LABEL: Record<Scope, string> = {
  mine: "My Approvals",
  all: "All Approvals",
  team: "My Team's Approvals",
};

const ENTITY_META: Record<Entity, { label: string; icon: React.ComponentType<{ className?: string }>; path: string }> = {
  account: { label: "Account", icon: Building2, path: "/accounts" },
  opportunity: { label: "Opportunity", icon: Briefcase, path: "/opportunities" },
  quote: { label: "Quote", icon: FileText, path: "/quotes" },
  order: { label: "Order", icon: ShoppingCart, path: "/orders" },
};

const STATUS_TONE: Record<ApprovalRequest["status"], string> = {
  open:      "text-amber-700 dark:text-amber-300",
  approved:  "text-emerald-700 dark:text-emerald-300",
  rejected:  "text-red-700 dark:text-red-300",
  cancelled: "text-muted-foreground",
};

function fmtDateTime(iso: string | null) {
  if (!iso) return "—";
  try { return format(new Date(iso), "M/d/yyyy, h:mm a"); } catch { return iso; }
}

export default function ApprovalsList() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [scope, setScope] = useState<Scope>("mine");
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "closed">("all");
  const [actionState, setActionState] = useState<{ id: number; mode: "approve" | "reject" } | null>(null);
  const [actionComment, setActionComment] = useState("");

  const query = useQuery<{ data: ApprovalRequest[] }>({
    queryKey: ["approval-requests-list", scope, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ scope });
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/approvals/requests?${params.toString()}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load approval requests");
      return res.json();
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["approval-requests-list"] });

  const decisionMutation = useMutation({
    mutationFn: async (args: { id: number; decision: "approved" | "rejected"; comment: string }) => {
      const res = await fetch(`/api/approvals/requests/${args.id}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ decision: args.decision, comment: args.comment || null }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      return res.json();
    },
    onSuccess: () => { setActionState(null); setActionComment(""); invalidate(); },
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/approvals/requests/${id}/cancel`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include", body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error("Failed to cancel");
      return res.json();
    },
    onSuccess: () => invalidate(),
  });

  const rows = query.data?.data ?? [];

  const counts = useMemo(() => {
    const c = { open: 0, approved: 0, rejected: 0, cancelled: 0 };
    for (const r of rows) c[r.status] += 1;
    return c;
  }, [rows]);

  const isAdmin = user?.role === "admin";
  const canApprove = user?.role === "admin" || user?.role === "manager";
  const canDecide = (r: ApprovalRequest) => r.status === "open" && canApprove;
  const canCancel = (r: ApprovalRequest) => r.status === "open" && (user?.id === r.requestedBy || isAdmin);

  return (
    <Layout>
      <div className="flex flex-col gap-4 max-w-[1600px] mx-auto">
        {/* Header */}
        <Card className="border-border p-4 flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-500/15 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-display font-semibold text-foreground text-lg">Approvals</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {rows.length} record{rows.length === 1 ? "" : "s"} · {counts.open} open · {counts.approved} approved · {counts.rejected} rejected
            </div>
          </div>
        </Card>

        {/* Toolbar */}
        <Card className="border-border p-3 flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-lg border border-border bg-muted/30 p-0.5">
            {(["mine", "all", "team"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setScope(s)}
                className={cn(
                  "px-3 h-8 text-xs font-medium rounded-md transition-colors",
                  scope === s
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {SCOPE_LABEL[s]}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Status</span>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
              <SelectTrigger className="h-8 w-32 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="open">Open only</SelectItem>
                <SelectItem value="closed">Closed only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="ml-auto text-xs text-muted-foreground">
            Viewing as <span className="text-foreground font-medium">{user?.name ?? "—"}</span>
            {isAdmin && <span className="ml-1.5 px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-700 text-[10px] font-semibold uppercase tracking-wide">Admin</span>}
          </div>
        </Card>

        {/* Action drawer */}
        {actionState && (
          <Card className="border-border p-4 flex flex-col gap-3 bg-muted/10">
            <div className="text-sm font-semibold text-foreground">
              {actionState.mode === "approve" ? `Approve request #${actionState.id}` : `Reject request #${actionState.id}`}
            </div>
            <Textarea
              value={actionComment}
              onChange={(e) => setActionComment(e.target.value)}
              placeholder="Optional comment…"
              className="text-sm min-h-[60px] bg-card"
              rows={2}
            />
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => { setActionState(null); setActionComment(""); }}>
                Cancel
              </Button>
              <Button size="sm"
                className={actionState.mode === "approve" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"}
                disabled={decisionMutation.isPending}
                onClick={() => decisionMutation.mutate({
                  id: actionState.id,
                  decision: actionState.mode === "approve" ? "approved" : "rejected",
                  comment: actionComment,
                })}>
                Confirm {actionState.mode === "approve" ? "Approve" : "Reject"}
              </Button>
            </div>
          </Card>
        )}

        {/* Table */}
        <Card className="border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="w-10 text-center">#</TableHead>
                <TableHead className="w-44">Record</TableHead>
                <TableHead>Step / Role</TableHead>
                <TableHead className="w-44">
                  <span className="inline-flex items-center gap-1">Requested <ChevronDown className="w-3 h-3" /></span>
                </TableHead>
                <TableHead className="w-28">Status</TableHead>
                <TableHead className="w-40">Submitted By</TableHead>
                <TableHead className="w-40">Approved By</TableHead>
                <TableHead className="w-44">Approved Date</TableHead>
                <TableHead>Comment</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.isLoading ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-sm text-muted-foreground py-8">Loading…</TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-sm text-muted-foreground py-10">
                    No approval requests in <span className="font-semibold text-foreground">{SCOPE_LABEL[scope]}</span>.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r, i) => {
                  const meta = ENTITY_META[r.entity];
                  const Icon = meta.icon;
                  return (
                    <TableRow key={r.id} className="align-top">
                      <TableCell className="text-center text-muted-foreground tabular-nums">{i + 1}</TableCell>
                      <TableCell>
                        <Link href={`${meta.path}/${r.entityId}`}>
                          <span className="inline-flex items-center gap-1.5 text-primary hover:underline cursor-pointer">
                            <Icon className="w-3.5 h-3.5" />
                            {meta.label} #{r.entityId}
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-foreground">{r.roleName ?? "Approval Team"}</div>
                        <div className="text-xs text-muted-foreground">Level {r.level} · Request #{r.id}</div>
                      </TableCell>
                      <TableCell className="text-foreground tabular-nums">{fmtDateTime(r.requestedAt)}</TableCell>
                      <TableCell className={cn("font-medium capitalize", STATUS_TONE[r.status])}>{r.status}</TableCell>
                      <TableCell className="text-foreground">{r.requestedByName ?? "—"}</TableCell>
                      <TableCell className="text-foreground">
                        {r.status === "approved"
                          ? (r.decidedByName ?? <span className="text-muted-foreground">—</span>)
                          : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-foreground tabular-nums">
                        {r.status === "approved" && r.decidedAt
                          ? fmtDateTime(r.decidedAt)
                          : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-foreground whitespace-pre-wrap max-w-md">
                        {r.comment || <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        {(canDecide(r) || canCancel(r)) && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="icon" variant="ghost" className="h-7 w-7">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {canDecide(r) && (
                                <>
                                  <DropdownMenuItem onClick={() => { setActionState({ id: r.id, mode: "approve" }); setActionComment(""); }}>
                                    <CheckCircle2 className="w-3.5 h-3.5 mr-2 text-emerald-600" /> Approve
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => { setActionState({ id: r.id, mode: "reject" }); setActionComment(""); }}>
                                    <XCircle className="w-3.5 h-3.5 mr-2 text-red-600" /> Reject
                                  </DropdownMenuItem>
                                </>
                              )}
                              {canCancel(r) && (
                                <DropdownMenuItem
                                  onClick={() => cancelMutation.mutate(r.id)}
                                  disabled={cancelMutation.isPending}>
                                  Cancel Request
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </Layout>
  );
}
