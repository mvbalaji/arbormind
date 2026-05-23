import React, { useEffect, useState, useCallback } from "react";
import DOMPurify from "dompurify";
import {
  Mail, RefreshCw, CheckCircle2, Clock, User, Calendar,
  Inbox, ExternalLink, Tag, AlertCircle, Info, Webhook,
} from "lucide-react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/auth";
import { useToast } from "@/hooks/use-toast";
import { format, formatDistanceToNow } from "date-fns";

interface SupportEmail {
  id: number;
  fromEmail: string;
  fromName: string;
  subject: string;
  message: string;
  bodyHtml?: string | null;
  status: string;
  isKnownCustomer: string;
  relatedLeadId?: number;
  relatedOpportunityId?: number;
  notes?: string;
  createdAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  new:      { label: "New",     color: "bg-blue-500/20 text-blue-600 border-blue-200",   icon: <Inbox className="w-3 h-3" /> },
  replied:  { label: "Replied", color: "bg-green-500/20 text-green-600 border-green-200", icon: <CheckCircle2 className="w-3 h-3" /> },
  assigned: { label: "Assigned", color: "bg-purple-500/20 text-purple-600 border-purple-200", icon: <User className="w-3 h-3" /> },
  pending:  { label: "Pending",  color: "bg-yellow-500/20 text-yellow-600 border-yellow-200", icon: <Clock className="w-3 h-3" /> },
};

export default function Support() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [emails, setEmails] = useState<SupportEmail[]>([]);
  const [selected, setSelected] = useState<SupportEmail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const fetchEmails = useCallback(async (opts: { sync?: boolean; showRefreshing?: boolean; silent?: boolean } = {}) => {
    const { sync = false, showRefreshing = false, silent = false } = opts;
    if (showRefreshing) setRefreshing(true);
    else if (!silent) setLoading(true);
    try {
      if (sync) {
        try {
          await fetch("/api/admin/email-sync", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: "{}",
          });
        } catch {
          /* ignore sync errors — still try to load DB rows */
        }
      }
      const res = await fetch("/api/emails", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setEmails(data.emails ?? []);
      } else if (!silent) {
        toast({ title: "Could not load inbox", variant: "destructive" });
      }
    } catch {
      if (!silent) toast({ title: "Network error", variant: "destructive" });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  // Initial load — also runs a sync so the user sees the latest
  useEffect(() => {
    if (!isLoading && user && user.role === "admin") {
      fetchEmails({ sync: true });
    }
  }, [isLoading, user, fetchEmails]);

  // Auto-refresh every 30 seconds (silent — no spinners, no toasts)
  useEffect(() => {
    if (isLoading || !user || user.role !== "admin") return;
    const id = setInterval(() => {
      fetchEmails({ sync: true, silent: true });
    }, 30_000);
    return () => clearInterval(id);
  }, [isLoading, user, fetchEmails]);

  const updateStatus = async (id: number, status: string) => {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/emails/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const { email: updated } = await res.json();
        setEmails(prev => prev.map(e => e.id === id ? updated : e));
        if (selected?.id === id) setSelected(updated);
        toast({ title: `Marked as ${status}` });
      }
    } finally {
      setUpdatingId(null);
    }
  };

  if (isLoading) return <Layout><div className="p-8 text-center text-muted-foreground">Loading…</div></Layout>;

  if (!user || user.role !== "admin") {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
            <p className="text-red-600 font-medium">Admin access required</p>
            <p className="text-muted-foreground text-sm mt-1">Contact your administrator to access the support inbox.</p>
          </div>
        </div>
      </Layout>
    );
  }

  const newCount = emails.filter(e => e.status === "new").length;

  return (
    <Layout>
      <div className="flex flex-col h-[calc(100vh-8rem)] gap-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 shrink-0">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground tracking-tight flex items-center gap-3">
              <Mail className="w-7 h-7 text-primary" />
              Support Inbox
              {newCount > 0 && (
                <span className="text-sm font-semibold bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                  {newCount} new
                </span>
              )}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Emails sent to <span className="text-foreground font-medium">support@arbormind.in</span>
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-border gap-2"
            onClick={() => fetchEmails({ sync: true, showRefreshing: true })}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Setup Banner (shown when inbox is empty) */}
        {!loading && emails.length === 0 && (
          <div className="mb-4 p-4 rounded-xl border border-blue-200 bg-blue-500/5 flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="flex-1 text-sm">
              <p className="text-foreground font-medium mb-1">Connect your support inbox</p>
              <p className="text-muted-foreground mb-3">
                Forward emails from <strong className="text-foreground">support@arbormind.in</strong> to the webhook below, or use email routing (Cloudflare, Google Workspace, etc.) to POST incoming emails to the endpoint.
              </p>
              <div className="flex items-center gap-2 p-2 bg-muted rounded-lg font-mono text-xs text-green-600 border border-border">
                <Webhook className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate">POST {window.location.origin.replace("80", "8080")}/api/emails</span>
              </div>
              <p className="text-muted-foreground text-xs mt-2">
                Accepts JSON: <code className="text-green-600">&#123; fromEmail, fromName, subject, message &#125;</code>
              </p>
            </div>
          </div>
        )}

        {/* Main split panel */}
        <div className="flex flex-1 overflow-hidden rounded-2xl border border-border bg-card/30">
          {/* Email list */}
          <div className="w-[340px] shrink-0 flex flex-col border-r border-border overflow-hidden">
            <div className="px-2 py-1 border-b border-border bg-muted">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {emails.length} ticket{emails.length !== 1 ? "s" : ""}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {loading ? (
                <div className="p-6 text-center text-muted-foreground text-sm">Loading inbox…</div>
              ) : emails.length === 0 ? (
                <div className="p-8 text-center">
                  <Inbox className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
                  <p className="text-muted-foreground text-sm">No emails yet</p>
                </div>
              ) : (
                emails.map((email) => {
                  const statusCfg = STATUS_CONFIG[email.status] ?? STATUS_CONFIG.new;
                  const isSelected = selected?.id === email.id;
                  return (
                    <button
                      key={email.id}
                      onClick={() => setSelected(email)}
                      className={`w-full px-4 py-4 border-b border-border text-left transition-all hover:bg-muted/50 group ${isSelected ? "bg-primary/10 border-l-2 border-l-primary" : "border-l-2 border-l-transparent"}`}
                    >
                      {/* From */}
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="min-w-0 flex-1">
                          <p className={`font-semibold text-sm truncate ${isSelected ? "text-foreground" : "text-foreground/90"}`}>
                            {email.fromName || email.fromEmail}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">{email.fromEmail}</p>
                        </div>
                        <div className="shrink-0 flex items-center gap-1.5 mt-0.5">
                          {email.status === "new" && (
                            <span className="w-2 h-2 rounded-full bg-primary" />
                          )}
                          <span className={`text-xs px-1.5 py-0.5 rounded-full border flex items-center gap-1 ${statusCfg.color}`}>
                            {statusCfg.icon}
                          </span>
                        </div>
                      </div>

                      {/* Subject */}
                      <p className="text-sm text-foreground/80 truncate mb-1.5 font-medium">{email.subject}</p>

                      {/* Meta */}
                      <div className="flex items-center justify-between">
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                          email.isKnownCustomer === "true"
                            ? "bg-green-50 text-green-700"
                            : "bg-blue-50 text-blue-700"
                        }`}>
                          {email.isKnownCustomer === "true" ? "Known customer" : "New contact"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(email.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Email detail */}
          {selected ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Detail header */}
              <div className="px-8 py-5 border-b border-border bg-muted/30 shrink-0">
                <h2 className="text-xl font-bold text-foreground mb-3 leading-tight">{selected.subject}</h2>

                <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">
                      <span className="text-foreground">{selected.fromName}</span>
                      {selected.fromName && " "}
                      <span className="text-muted-foreground">&lt;{selected.fromEmail}&gt;</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Tag className="w-3.5 h-3.5 shrink-0" />
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${
                      selected.isKnownCustomer === "true"
                        ? "bg-green-50 text-green-700 border-green-200"
                        : "bg-blue-50 text-blue-700 border-blue-200"
                    }`}>
                      {selected.isKnownCustomer === "true" ? "Known customer" : "New contact"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-foreground">{format(new Date(selected.createdAt), "MMM d, yyyy 'at' h:mm a")}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-foreground capitalize">{STATUS_CONFIG[selected.status]?.label ?? selected.status}</span>
                  </div>
                </div>
              </div>

              {/* Message body */}
              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                <div className="max-w-3xl">
                  {selected.bodyHtml ? (
                    <div
                      className="email-html bg-card rounded-xl border border-border p-6 text-sm leading-relaxed text-foreground/90 overflow-x-auto"
                      dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(selected.bodyHtml, {
                          USE_PROFILES: { html: true },
                          FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form"],
                          FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "style"],
                        }),
                      }}
                    />
                  ) : (
                    <div className="bg-muted rounded-xl border border-border p-6 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                      {selected.message}
                    </div>
                  )}

                  {/* Auto-created records */}
                  {(selected.relatedLeadId || selected.relatedOpportunityId) && (
                    <div className="mt-6 p-4 rounded-xl border border-primary/20 bg-primary/5">
                      <p className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600" /> Auto-created records
                      </p>
                      <div className="space-y-1.5 text-sm">
                        {selected.relatedLeadId && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <User className="w-3.5 h-3.5 text-blue-600" />
                            Lead #{selected.relatedLeadId} created — awaiting sales team assignment
                          </div>
                        )}
                        {selected.relatedOpportunityId && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <ExternalLink className="w-3.5 h-3.5 text-green-600" />
                            Opportunity #{selected.relatedOpportunityId} created — awaiting sales team assignment
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {selected.notes && (
                    <div className="mt-4 p-3 rounded-lg bg-muted/50 border border-border text-xs text-muted-foreground">
                      Note: {selected.notes}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions footer */}
              <div className="px-8 py-4 border-t border-border bg-muted/30 shrink-0 flex items-center gap-3">
                {selected.status !== "replied" && (
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-foreground"
                    onClick={() => updateStatus(selected.id, "replied")}
                    disabled={updatingId === selected.id}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                    Mark Replied
                  </Button>
                )}
                {selected.status !== "assigned" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-border"
                    onClick={() => updateStatus(selected.id, "assigned")}
                    disabled={updatingId === selected.id}
                  >
                    <User className="w-3.5 h-3.5 mr-1.5" />
                    Assign Rep
                  </Button>
                )}
                {selected.status !== "pending" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-border"
                    onClick={() => updateStatus(selected.id, "pending")}
                    disabled={updatingId === selected.id}
                  >
                    <Clock className="w-3.5 h-3.5 mr-1.5" />
                    Pending
                  </Button>
                )}
                <span className="text-xs text-muted-foreground ml-auto">
                  Received {format(new Date(selected.createdAt), "PPp")}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Mail className="w-14 h-14 mx-auto mb-4 opacity-20" />
                <p className="font-medium">Select a ticket to read</p>
                <p className="text-sm mt-1 opacity-60">{emails.length} ticket{emails.length !== 1 ? "s" : ""} in inbox</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
