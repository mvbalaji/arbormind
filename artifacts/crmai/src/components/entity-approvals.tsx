import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/auth";
import {
  ShieldCheck, CheckCircle2, XCircle, Send, ChevronDown, AlertCircle, MoreHorizontal,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

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

interface EntityApprovalsProps {
  entity: Entity;
  record: Record<string, unknown>;
  isAdmin?: boolean;
  onDecision?: () => void;
}

interface Row {
  key: string;
  requestId: number;
  stepName: string;
  date: string;
  status: string;
  statusTone: "submitted" | "approved" | "rejected" | "noresponse" | "cancelled" | "commented";
  assignedTo: string;
  actualApprover: string;
  approvedDate: string | null;
  comment: string;
  isRequest: boolean;
}

const STATUS_TONE: Record<Row["statusTone"], string> = {
  submitted:  "text-blue-700 dark:text-blue-300",
  approved:   "text-emerald-700 dark:text-emerald-300",
  rejected:   "text-red-700 dark:text-red-300",
  noresponse: "text-muted-foreground",
  cancelled:  "text-muted-foreground",
  commented:  "text-foreground",
};

function fmtDateTime(iso: string | null) {
  if (!iso) return "—";
  try { return format(new Date(iso), "M/d/yyyy, h:mm a"); } catch { return iso; }
}

function buildRows(requests: ApprovalRequest[]): Row[] {
  const rows: Row[] = [];
  for (const r of requests) {
    const assigned = r.roleName ?? "—";
    const approvedEvent = r.events.find((e) => e.event === "approved");
    const approverName = r.status === "approved" ? (r.decidedByName ?? approvedEvent?.actorName ?? null) : null;
    const approvedAt = r.status === "approved" ? (r.decidedAt ?? approvedEvent?.createdAt ?? null) : null;

    rows.push({
      key: `r-${r.id}-submit`,
      requestId: r.id,
      stepName: "Approval Request Submitted",
      date: r.requestedAt,
      status: "Submitted",
      statusTone: "submitted",
      assignedTo: assigned,
      actualApprover: approverName ?? "—",
      approvedDate: approvedAt,
      comment: r.comment ?? "",
      isRequest: true,
    });

    for (const ev of r.events) {
      if (ev.event === "submitted") continue;
      let stepName = "Approval Step";
      let status = "—";
      let tone: Row["statusTone"] = "commented";
      if (ev.event === "approved") {
        stepName = "Approval Team";
        status = "Approved";
        tone = "approved";
      } else if (ev.event === "rejected") {
        stepName = "Approval Team";
        status = "Rejected";
        tone = "rejected";
      } else if (ev.event === "cancelled") {
        stepName = "Approval Request";
        status = "Cancelled";
        tone = "cancelled";
      } else if (ev.event === "commented") {
        stepName = "Comment Added";
        status = "Commented";
        tone = "commented";
      }
      rows.push({
        key: `e-${ev.id}`,
        requestId: r.id,
        stepName,
        date: ev.createdAt,
        status,
        statusTone: tone,
        assignedTo: assigned,
        actualApprover: ev.event === "approved" ? (ev.actorName ?? "—") : "—",
        approvedDate: ev.event === "approved" ? ev.createdAt : null,
        comment: ev.comment ?? "",
        isRequest: false,
      });
    }

    if (r.status === "open" && r.events.filter((e) => e.event !== "submitted" && e.event !== "commented").length === 0) {
      rows.push({
        key: `r-${r.id}-pending`,
        requestId: r.id,
        stepName: "Approval Team",
        date: r.requestedAt,
        status: "No Response",
        statusTone: "noresponse",
        assignedTo: assigned,
        actualApprover: "—",
        approvedDate: null,
        comment: "",
        isRequest: false,
      });
    }
  }
  rows.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  return rows;
}

export function EntityApprovals({ entity, record, isAdmin, onDecision }: EntityApprovalsProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const entityId = Number(record.id);
  const validId = Number.isFinite(entityId) && entityId > 0;

  const [submitComment, setSubmitComment] = useState("");
  const [showSubmit, setShowSubmit] = useState(false);
  const [actionState, setActionState] = useState<{ id: number; mode: "approve" | "reject" | "comment" } | null>(null);
  const [actionComment, setActionComment] = useState("");

  const requestsQuery = useQuery<{ data: ApprovalRequest[] }>({
    queryKey: ["approval-requests", entity, entityId],
    queryFn: async () => {
      const res = await fetch(`/api/approvals/requests?entity=${entity}&entityId=${entityId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load approval requests");
      return res.json();
    },
    enabled: validId,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["approval-requests", entity, entityId] });

  // After a decision, also refetch the parent entity so status/stage updates immediately
  const invalidateEntity = () => {
    const entityPath = `/api/${entity}s/${entityId}`;
    void queryClient.invalidateQueries({ queryKey: [entityPath] });
    void queryClient.invalidateQueries({ queryKey: [`${entity}-stage-history`, entityId] });
    onDecision?.();
  };

  const submitMutation = useMutation({
    mutationFn: async (comment: string) => {
      const res = await fetch(`/api/approvals/requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ entity, entityId, comment: comment || null }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to submit");
      return res.json();
    },
    onSuccess: () => { setSubmitComment(""); setShowSubmit(false); invalidate(); },
  });

  const decisionMutation = useMutation({
    mutationFn: async (args: { id: number; decision: "approved" | "rejected"; comment: string }) => {
      const res = await fetch(`/api/approvals/requests/${args.id}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ decision: args.decision, comment: args.comment || null }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to record decision");
      return res.json();
    },
    onSuccess: () => { setActionState(null); setActionComment(""); invalidate(); invalidateEntity(); },
  });

  const commentMutation = useMutation({
    mutationFn: async (args: { id: number; comment: string }) => {
      const res = await fetch(`/api/approvals/requests/${args.id}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ comment: args.comment }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to add comment");
      return res.json();
    },
    onSuccess: () => { setActionState(null); setActionComment(""); invalidate(); },
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/approvals/requests/${id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to cancel");
      return res.json();
    },
    onSuccess: () => invalidate(),
  });

  const requests = requestsQuery.data?.data ?? [];
  const openCount = requests.filter((r) => r.status === "open").length;
  const rows = useMemo(() => buildRows(requests), [requests]);
  const requestById = useMemo(() => {
    const m = new Map<number, ApprovalRequest>();
    for (const r of requests) m.set(r.id, r);
    return m;
  }, [requests]);

  if (!validId) {
    return (
      <Card className="border-border p-6">
        <div className="text-sm text-muted-foreground">Approvals are not available for this record.</div>
      </Card>
    );
  }

  const canManage = (r: ApprovalRequest) => r.status === "open" && (isAdmin || user?.role === "admin" || user?.role === "manager");
  const canCancel = (r: ApprovalRequest) => r.status === "open" && (user?.id === r.requestedBy || isAdmin);
  const canComment = (r: ApprovalRequest) => r.status === "open" && !!user;

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <Card className="border-border p-4 flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-indigo-500/15 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-4 h-4 text-indigo-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-display font-semibold text-foreground">Approval History</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {rows.length} item{rows.length === 1 ? "" : "s"} · {openCount} open request{openCount === 1 ? "" : "s"}
          </div>
        </div>
        {!showSubmit && (
          <Button size="sm" className="gap-1.5" onClick={() => setShowSubmit(true)}>
            <Send className="w-3.5 h-3.5" /> Submit for Approval
          </Button>
        )}
      </Card>

      {showSubmit && (
        <Card className="border-border p-4 flex flex-col gap-3 bg-muted/10">
          <div className="text-sm font-semibold text-foreground">New approval request</div>
          <Textarea
            value={submitComment}
            onChange={(e) => setSubmitComment(e.target.value)}
            placeholder="Optional message to approvers…"
            className="text-sm min-h-[70px] bg-card"
            rows={3}
          />
          {submitMutation.error && (
            <div className="text-xs text-red-600 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" /> {(submitMutation.error as Error).message}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => { setShowSubmit(false); setSubmitComment(""); }}>
              Cancel
            </Button>
            <Button size="sm" onClick={() => submitMutation.mutate(submitComment)} disabled={submitMutation.isPending}>
              <Send className="w-3.5 h-3.5 mr-1.5" /> Submit
            </Button>
          </div>
        </Card>
      )}

      {/* Action drawer */}
      {actionState && (
        <Card className="border-border p-4 flex flex-col gap-3 bg-muted/10">
          <div className="text-sm font-semibold text-foreground">
            {actionState.mode === "approve"
              ? `Approve request #${actionState.id}`
              : actionState.mode === "reject"
                ? `Reject request #${actionState.id}`
                : `Add comment to request #${actionState.id}`}
          </div>
          <Textarea
            value={actionComment}
            onChange={(e) => setActionComment(e.target.value)}
            placeholder={
              actionState.mode === "comment"
                ? "Type your comment…"
                : actionState.mode === "reject"
                  ? "Reason for rejection (required)…"
                  : "Optional comment…"
            }
            className="text-sm min-h-[60px] bg-card"
            rows={2}
          />
          {actionState.mode === "reject" && !actionComment.trim() && (
            <div className="text-xs text-red-600 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" /> A comment is required to reject this request.
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => { setActionState(null); setActionComment(""); }}>
              Cancel
            </Button>
            {actionState.mode === "comment" ? (
              <Button size="sm"
                disabled={!actionComment.trim() || commentMutation.isPending}
                onClick={() => commentMutation.mutate({ id: actionState.id, comment: actionComment })}>
                Save Comment
              </Button>
            ) : (
              <Button size="sm"
                className={actionState.mode === "approve" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"}
                disabled={decisionMutation.isPending || (actionState.mode === "reject" && !actionComment.trim())}
                onClick={() => decisionMutation.mutate({
                  id: actionState.id,
                  decision: actionState.mode === "approve" ? "approved" : "rejected",
                  comment: actionComment,
                })}>
                Confirm {actionState.mode === "approve" ? "Approve" : "Reject"}
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Table */}
      <Card className="border-2 border-blue-700 dark:border-blue-800 overflow-hidden shadow-sm">
        <div className="overflow-auto max-h-[calc(100vh-320px)]">
        <Table>
          <TableHeader>
            <TableRow className="sticky top-0 z-10 bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800 border-b border-blue-800 hover:bg-blue-700 [&_th]:text-white [&_th]:uppercase [&_th]:tracking-wide [&_th]:font-semibold [&_th]:text-xs">
              <TableHead className="w-10 text-center">#</TableHead>
              <TableHead>Step Name</TableHead>
              <TableHead className="w-44">
                <span className="inline-flex items-center gap-1">Date <ChevronDown className="w-3 h-3" /></span>
              </TableHead>
              <TableHead className="w-32">Status</TableHead>
              <TableHead className="w-44">Assigned To</TableHead>
              <TableHead className="w-44">Approved By</TableHead>
              <TableHead className="w-44">Approved Date</TableHead>
              <TableHead>Comments</TableHead>
              <TableHead className="w-44 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requestsQuery.isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-sm text-muted-foreground py-8">Loading…</TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-sm text-muted-foreground py-10">
                  No approval history yet. Click <span className="font-semibold text-foreground">Submit for Approval</span> to start a request.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, i) => {
                const req = requestById.get(row.requestId);
                const showActions = req && (canManage(req) || canCancel(req) || canComment(req)) && row.isRequest;
                return (
                  <TableRow key={row.key} className="align-top">
                    <TableCell className="text-center text-muted-foreground tabular-nums">{i + 1}</TableCell>
                    <TableCell>
                      <span className="text-primary hover:underline cursor-default font-medium">{row.stepName}</span>
                      <span className="text-xs text-muted-foreground ml-2">#{row.requestId}</span>
                    </TableCell>
                    <TableCell className="text-foreground tabular-nums">{fmtDateTime(row.date)}</TableCell>
                    <TableCell className={cn("font-medium", STATUS_TONE[row.statusTone])}>{row.status}</TableCell>
                    <TableCell className="text-foreground">{row.assignedTo}</TableCell>
                    <TableCell className="text-primary">{row.actualApprover}</TableCell>
                    <TableCell className="text-foreground tabular-nums">
                      {row.approvedDate ? fmtDateTime(row.approvedDate) : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-foreground whitespace-pre-wrap">{row.comment || <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell className="text-right">
                      {showActions && req && (
                        <div className="inline-flex items-center rounded-md border border-border bg-card overflow-hidden">
                          {canManage(req) ? (
                            <>
                              <button
                                type="button"
                                onClick={() => { setActionState({ id: req.id, mode: "approve" }); setActionComment(""); }}
                                disabled={decisionMutation.isPending}
                                className="px-3 h-8 text-xs font-medium text-primary hover:bg-primary/5 border-r border-border disabled:opacity-50">
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => { setActionState({ id: req.id, mode: "reject" }); setActionComment(""); }}
                                disabled={decisionMutation.isPending}
                                className="px-3 h-8 text-xs font-medium text-primary hover:bg-primary/5 border-r border-border disabled:opacity-50">
                                Reject
                              </button>
                            </>
                          ) : null}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="px-2 h-8 text-primary hover:bg-primary/5 inline-flex items-center justify-center"
                                aria-label="More actions">
                                <ChevronDown className="w-3.5 h-3.5" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {canManage(req) && (
                                <>
                                  <DropdownMenuItem onClick={() => { setActionState({ id: req.id, mode: "approve" }); setActionComment(""); }}>
                                    <CheckCircle2 className="w-3.5 h-3.5 mr-2 text-emerald-600" /> Approve
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => { setActionState({ id: req.id, mode: "reject" }); setActionComment(""); }}>
                                    <XCircle className="w-3.5 h-3.5 mr-2 text-red-600" /> Reject
                                  </DropdownMenuItem>
                                </>
                              )}
                              {canComment(req) && (
                                <DropdownMenuItem onClick={() => { setActionState({ id: req.id, mode: "comment" }); setActionComment(""); }}>
                                  Add Comment
                                </DropdownMenuItem>
                              )}
                              {canCancel(req) && (
                                <DropdownMenuItem
                                  onClick={() => cancelMutation.mutate(req.id)}
                                  disabled={cancelMutation.isPending}>
                                  Cancel Request
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        </div>
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
