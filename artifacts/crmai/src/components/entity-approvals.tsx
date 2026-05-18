import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/auth";
import {
  ShieldCheck, CheckCircle2, XCircle, Clock, MessageSquare, Send,
  ChevronDown, ChevronRight, Ban, AlertCircle,
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
}

const STATUS_STYLE: Record<ApprovalRequest["status"], { label: string; bg: string; icon: typeof CheckCircle2 }> = {
  open:      { label: "Open",      bg: "border-amber-500/40 text-amber-700 bg-amber-500/10",       icon: Clock },
  approved:  { label: "Approved",  bg: "border-emerald-500/40 text-emerald-700 bg-emerald-500/10", icon: CheckCircle2 },
  rejected:  { label: "Rejected",  bg: "border-red-500/40 text-red-700 bg-red-500/10",             icon: XCircle },
  cancelled: { label: "Cancelled", bg: "border-border text-muted-foreground bg-muted/30",          icon: Ban },
};

const EVENT_LABEL: Record<string, string> = {
  submitted: "Submitted for approval",
  approved: "Approved",
  rejected: "Rejected",
  cancelled: "Cancelled",
  commented: "Commented",
};

function fmtDateTime(iso: string | null) {
  if (!iso) return "—";
  try { return format(new Date(iso), "MMM d, yyyy 'at' h:mm a"); } catch { return iso; }
}

export function EntityApprovals({ entity, record, isAdmin }: EntityApprovalsProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const entityId = Number(record.id);
  const validId = Number.isFinite(entityId) && entityId > 0;

  const [submitComment, setSubmitComment] = useState("");
  const [showSubmit, setShowSubmit] = useState(false);
  const [actionState, setActionState] = useState<{ id: number; mode: "approve" | "reject" | "comment" } | null>(null);
  const [actionComment, setActionComment] = useState("");
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

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
    onSuccess: () => {
      setSubmitComment("");
      setShowSubmit(false);
      invalidate();
    },
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
    onSuccess: () => {
      setActionState(null);
      setActionComment("");
      invalidate();
    },
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
    onSuccess: () => {
      setActionState(null);
      setActionComment("");
      invalidate();
    },
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
  const openRequests = requests.filter((r) => r.status === "open");
  const closedRequests = requests.filter((r) => r.status !== "open");

  const toggleExpanded = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  if (!validId) {
    return (
      <Card className="border-border p-6">
        <div className="text-sm text-muted-foreground">Approvals are not available for this record.</div>
      </Card>
    );
  }

  const renderCard = (r: ApprovalRequest) => {
    const style = STATUS_STYLE[r.status];
    const StatusIcon = style.icon;
    const isExpanded = expanded.has(r.id);
    const canDecide = r.status === "open" && (isAdmin || user?.role === "admin");
    const canCancel = r.status === "open" && (user?.id === r.requestedBy || isAdmin);
    const isActing = actionState?.id === r.id;

    return (
      <Card key={r.id} className="border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0", style.bg)}>
              <StatusIcon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-foreground">Request #{r.id}</span>
                <Badge variant="outline" className={cn("text-xs", style.bg)}>{style.label}</Badge>
                <Badge variant="outline" className="text-xs font-mono">L{r.level}</Badge>
                {r.roleName && <span className="text-xs text-muted-foreground">{r.roleName}</span>}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Submitted by <span className="text-foreground">{r.requestedByName ?? "—"}</span> · {fmtDateTime(r.requestedAt)}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {canDecide && !isActing && (
              <>
                <Button size="sm" variant="outline" className="h-7 text-xs border-emerald-500/40 text-emerald-700 hover:bg-emerald-500/10"
                  onClick={() => { setActionState({ id: r.id, mode: "approve" }); setActionComment(""); }}>
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Approve
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs border-red-500/40 text-red-700 hover:bg-red-500/10"
                  onClick={() => { setActionState({ id: r.id, mode: "reject" }); setActionComment(""); }}>
                  <XCircle className="w-3 h-3 mr-1" /> Reject
                </Button>
              </>
            )}
            {r.status === "open" && !isActing && (
              <Button size="sm" variant="ghost" className="h-7 text-xs"
                onClick={() => { setActionState({ id: r.id, mode: "comment" }); setActionComment(""); }}>
                <MessageSquare className="w-3 h-3 mr-1" /> Comment
              </Button>
            )}
            {canCancel && !isActing && (
              <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground"
                onClick={() => cancelMutation.mutate(r.id)}
                disabled={cancelMutation.isPending}>
                <Ban className="w-3 h-3 mr-1" /> Cancel
              </Button>
            )}
            <Button size="sm" variant="ghost" className="h-7 text-xs px-2"
              onClick={() => toggleExpanded(r.id)} aria-label={isExpanded ? "Collapse audit trail" : "Expand audit trail"}>
              {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </Button>
          </div>
        </div>

        {/* Action input */}
        {isActing && (
          <div className="px-4 py-3 border-b border-border bg-muted/20 flex flex-col gap-2">
            <div className="text-xs font-semibold text-foreground">
              {actionState.mode === "approve" ? "Approve this request" : actionState.mode === "reject" ? "Reject this request" : "Add a comment"}
            </div>
            <Textarea
              value={actionComment}
              onChange={(e) => setActionComment(e.target.value)}
              placeholder={actionState.mode === "comment" ? "Type your comment…" : "Optional comment…"}
              className="text-sm min-h-[60px] bg-card"
              rows={2}
            />
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" className="h-7 text-xs"
                onClick={() => { setActionState(null); setActionComment(""); }}>
                Cancel
              </Button>
              {actionState.mode === "comment" ? (
                <Button size="sm" className="h-7 text-xs"
                  disabled={!actionComment.trim() || commentMutation.isPending}
                  onClick={() => commentMutation.mutate({ id: r.id, comment: actionComment })}>
                  Save Comment
                </Button>
              ) : (
                <Button size="sm" className={cn("h-7 text-xs",
                  actionState.mode === "approve" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700")}
                  disabled={decisionMutation.isPending}
                  onClick={() => decisionMutation.mutate({
                    id: r.id,
                    decision: actionState.mode === "approve" ? "approved" : "rejected",
                    comment: actionComment,
                  })}>
                  Confirm {actionState.mode === "approve" ? "Approve" : "Reject"}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Audit trail */}
        {isExpanded && (
          <div className="px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Audit Trail</div>
            {r.events.length === 0 ? (
              <div className="text-xs text-muted-foreground italic">No events.</div>
            ) : (
              <ol className="relative border-l border-border ml-2 space-y-3">
                {r.events.map((ev) => (
                  <li key={ev.id} className="ml-4">
                    <div className="absolute -left-1.5 w-3 h-3 rounded-full bg-card border-2 border-primary mt-1" />
                    <div className="text-xs">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-foreground">{EVENT_LABEL[ev.event] ?? ev.event}</span>
                        <span className="text-muted-foreground">by {ev.actorName ?? "—"}</span>
                        <span className="text-muted-foreground">· {fmtDateTime(ev.createdAt)}</span>
                      </div>
                      {ev.comment && (
                        <div className="mt-1 px-2 py-1.5 rounded bg-muted/40 text-foreground whitespace-pre-wrap">{ev.comment}</div>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            )}
            {r.status !== "open" && r.decidedAt && (
              <div className="mt-3 pt-3 border-t border-border text-xs text-muted-foreground">
                Decided by <span className="text-foreground">{r.decidedByName ?? "—"}</span> · {fmtDateTime(r.decidedAt)}
              </div>
            )}
          </div>
        )}
      </Card>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header + submit */}
      <Card className="border-border p-4 flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-indigo-500/15 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-4 h-4 text-indigo-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-display font-semibold text-foreground">Approvals</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {openRequests.length} open · {closedRequests.length} closed
          </div>
        </div>
        {!showSubmit ? (
          <Button size="sm" className="gap-1.5" onClick={() => setShowSubmit(true)}>
            <Send className="w-3.5 h-3.5" /> Submit for Approval
          </Button>
        ) : null}
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

      {/* Open requests */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Clock className="w-3.5 h-3.5 text-amber-600" />
          <h3 className="text-sm font-semibold text-foreground">Open ({openRequests.length})</h3>
        </div>
        {requestsQuery.isLoading ? (
          <Card className="border-border p-4 text-sm text-muted-foreground">Loading…</Card>
        ) : openRequests.length === 0 ? (
          <Card className="border-border p-4 text-sm text-muted-foreground">No open approval requests.</Card>
        ) : (
          <div className="flex flex-col gap-3">{openRequests.map(renderCard)}</div>
        )}
      </div>

      {/* Closed requests */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <h3 className="text-sm font-semibold text-foreground">Closed ({closedRequests.length})</h3>
        </div>
        {closedRequests.length === 0 ? (
          <Card className="border-border p-4 text-sm text-muted-foreground">No closed approval requests yet.</Card>
        ) : (
          <div className="flex flex-col gap-3">{closedRequests.map(renderCard)}</div>
        )}
      </div>
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
