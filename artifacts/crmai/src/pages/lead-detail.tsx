import React, { useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useUpdateLead, useConvertLead, getListLeadsQueryKey, useListUsers } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AISummary } from "@/components/ai-summary";
import { EmailCompose } from "@/components/email-compose";
import {
  ArrowLeft, Mail, Phone, Building2, User, Calendar, Activity,
  CheckCircle2, Clock, ArrowRightLeft, Pencil, MapPin, DollarSign,
  Globe, Users, Briefcase, Star, Target, Send, ChevronDown, ChevronUp,
  TrendingUp, ThumbsUp, ThumbsDown, MessageSquare, Plus, XCircle, CheckSquare,
} from "lucide-react";
import { format, formatDistanceToNow, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface LeadDetail {
  id: number;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  title: string | null;
  status: string;
  source: string | null;
  score: number | null;
  industry: string | null;
  employees: number | null;
  annualRevenue: number | null;
  description: string | null;
  assignedTo: number | null;
  assignedToName: string | null;
  isConverted: boolean;
  convertedContactId: number | null;
  convertedAccountId: number | null;
  convertedOpportunityId: number | null;
  createdAt: string;
  updatedAt: string;
}

interface LeadActivity {
  id: number;
  type: string;
  subject: string;
  status: string;
  dueDate: string | null;
  createdAt: string;
}

interface ConvertedContact {
  id: number;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  title: string | null;
}

interface ConvertedAccount {
  id: number;
  name: string;
  industry: string | null;
  phone: string | null;
  city: string | null;
  country: string | null;
}

const PIPELINE_STAGES = [
  { key: "new", label: "New" },
  { key: "contacted", label: "Contacted" },
  { key: "qualified", label: "Qualified" },
  { key: "unqualified", label: "Unqualified" },
  { key: "converted", label: "Converted" },
];

const REJECT_REASONS = [
  "Budget constraints",
  "Not a good fit",
  "Competitor selected",
  "Timing not right",
  "No response",
  "Duplicate lead",
  "Other",
];

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-50 text-blue-700 border-blue-200",
  contacted: "bg-purple-50 text-purple-700 border-purple-200",
  qualified: "bg-green-50 text-green-700 border-green-200",
  unqualified: "bg-red-50 text-red-700 border-red-200",
  converted: "bg-gray-100 text-gray-600 border-gray-200",
};

const ACTIVITY_ICONS: Record<string, React.ElementType> = {
  call: Phone,
  email: Mail,
  meeting: Users,
  task: CheckCircle2,
  note: MessageSquare,
  demo: Briefcase,
};

function FieldRow({ label, value, icon: Icon }: { label: string; value?: string | null; icon?: React.ElementType }) {
  if (!value) return null;
  return (
    <div className="py-2 flex items-start gap-3 border-b border-border/50 last:border-0">
      {Icon && <Icon className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />}
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground mb-0.5">{label}</div>
        <div className="text-sm text-foreground font-medium">{value}</div>
      </div>
    </div>
  );
}

function CollapsibleSection({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-card border border-border rounded-md overflow-hidden shadow-sm">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors border-b border-border"
      >
        <span className="text-xs font-semibold text-foreground uppercase tracking-wide">{title}</span>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
      </button>
      {open && <div className="px-4 py-2">{children}</div>}
    </div>
  );
}

export default function LeadDetail() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [, navigate] = useLocation();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isConvertOpen, setIsConvertOpen] = useState(false);
  const [isEmailOpen, setIsEmailOpen] = useState(false);
  const [relatedTab, setRelatedTab] = useState<"activities" | "contacts" | "accounts">("activities");
  const [showAcceptReject, setShowAcceptReject] = useState(false);
  const [acceptRejectMode, setAcceptRejectMode] = useState<"accept" | "reject" | null>(null);
  const [rejectReason, setRejectReason] = useState(REJECT_REASONS[0]);
  const [acceptRejectNote, setAcceptRejectNote] = useState("");
  const [newNote, setNewNote] = useState("");
  const [isAddingNote, setIsAddingNote] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: lead, isLoading } = useQuery<LeadDetail>({
    queryKey: ["lead", id],
    queryFn: async () => {
      const res = await fetch(`/api/leads/${id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Lead not found");
      return res.json() as Promise<LeadDetail>;
    },
    enabled: !!id,
  });

  const { data: activitiesData, refetch: refetchActivities } = useQuery<{ data: LeadActivity[] }>({
    queryKey: ["lead-activities", id, lead?.convertedContactId],
    queryFn: async () => {
      const params = new URLSearchParams({ page: "1", limit: "20" });
      if (lead?.convertedContactId) params.set("contactId", String(lead.convertedContactId));
      const res = await fetch(`/api/activities?${params}`, { credentials: "include" });
      return res.json() as Promise<{ data: LeadActivity[] }>;
    },
    enabled: !!id,
  });

  const { data: convertedContactData } = useQuery<ConvertedContact>({
    queryKey: ["contact", lead?.convertedContactId],
    queryFn: async () => {
      const res = await fetch(`/api/contacts/${lead!.convertedContactId}`, { credentials: "include" });
      return res.json() as Promise<ConvertedContact>;
    },
    enabled: !!lead?.convertedContactId,
  });

  const { data: convertedAccountData } = useQuery<ConvertedAccount>({
    queryKey: ["account", lead?.convertedAccountId],
    queryFn: async () => {
      const res = await fetch(`/api/accounts/${lead!.convertedAccountId}`, { credentials: "include" });
      return res.json() as Promise<ConvertedAccount>;
    },
    enabled: !!lead?.convertedAccountId,
  });

  const updateMutation = useUpdateLead();
  const convertMutation = useConvertLead();

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-48">
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  if (!lead) {
    return (
      <Layout>
        <div className="text-center py-20 text-muted-foreground">Lead not found.</div>
      </Layout>
    );
  }

  const fullName = `${lead.firstName} ${lead.lastName}`;
  const initials = `${lead.firstName[0] ?? ""}${lead.lastName[0] ?? ""}`.toUpperCase();
  const currentStageIdx = PIPELINE_STAGES.findIndex((s) => s.key === lead.status);
  const activities = activitiesData?.data ?? [];
  const daysSinceUpdate = differenceInDays(new Date(), new Date(lead.updatedAt));
  const daysSinceCreated = differenceInDays(new Date(), new Date(lead.createdAt));

  const handleStatusChange = (newStatus: string) => {
    updateMutation.mutate({
      id: lead.id,
      data: { ...lead, status: newStatus as "new" | "contacted" | "qualified" | "unqualified" | "converted" },
    }, {
      onSuccess: () => {
        toast({ title: "Status updated" });
        queryClient.invalidateQueries({ queryKey: ["lead", id] });
        queryClient.invalidateQueries({ queryKey: getListLeadsQueryKey() });
      },
    });
  };

  const handleMarkComplete = () => {
    const nextIdx = Math.min(currentStageIdx + 1, PIPELINE_STAGES.length - 1);
    const nextStage = PIPELINE_STAGES[nextIdx];
    if (nextStage && nextStage.key !== lead.status) {
      handleStatusChange(nextStage.key);
    }
  };

  const handleAcceptReject = async () => {
    if (!acceptRejectMode) return;
    const isAccept = acceptRejectMode === "accept";
    const newStatus = isAccept ? "qualified" : "unqualified";
    const noteText = isAccept
      ? `Lead accepted. ${acceptRejectNote}`
      : `Lead rejected. Reason: ${rejectReason}. ${acceptRejectNote}`;

    try {
      await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          type: "note",
          subject: isAccept ? "Lead Accepted" : `Lead Rejected — ${rejectReason}`,
          status: "completed",
          notes: noteText.trim(),
          contactId: lead.convertedContactId ?? undefined,
        }),
      });

      handleStatusChange(newStatus);
      toast({ title: isAccept ? "Lead accepted" : "Lead rejected", description: noteText.trim() });
      setShowAcceptReject(false);
      setAcceptRejectMode(null);
      setAcceptRejectNote("");
      void refetchActivities();
    } catch {
      toast({ title: "Error", description: "Could not save.", variant: "destructive" });
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setIsAddingNote(true);
    try {
      await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          type: "note",
          subject: newNote.trim().substring(0, 80),
          status: "completed",
          notes: newNote.trim(),
          contactId: lead.convertedContactId ?? undefined,
        }),
      });
      toast({ title: "Note added" });
      setNewNote("");
      void refetchActivities();
    } catch {
      toast({ title: "Error", description: "Could not add note.", variant: "destructive" });
    } finally {
      setIsAddingNote(false);
    }
  };

  const handleConvert = () => {
    convertMutation.mutate({
      id: lead.id,
      data: { createContact: true, createAccount: !!lead.company, createOpportunity: true, opportunityName: `${fullName} Deal`, opportunityAmount: 0 },
    }, {
      onSuccess: (result) => {
        toast({ title: "Lead Converted!", description: "Created Contact, Account and Opportunity." });
        queryClient.invalidateQueries({ queryKey: ["lead", id] });
        queryClient.invalidateQueries({ queryKey: getListLeadsQueryKey() });
        setIsConvertOpen(false);
        if (result?.opportunityId) navigate(`/opportunities/${result.opportunityId}`);
      },
      onError: () => toast({ title: "Error", description: "Could not convert lead.", variant: "destructive" }),
    });
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
          <Link href="/leads" className="hover:text-primary transition-colors">Leads</Link>
          <span>›</span>
          <span className="text-foreground font-medium">{fullName}</span>
        </div>

        {/* Header Card */}
        <div className="bg-card border border-border rounded-md shadow-sm mb-4">
          {/* Name + actions row */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                {initials}
              </div>
              <div>
                <h1 className="text-base font-semibold text-foreground leading-tight">{fullName}</h1>
                {lead.title || lead.company ? (
                  <div className="text-xs text-muted-foreground">
                    {[lead.title, lead.company].filter(Boolean).join(" · ")}
                  </div>
                ) : null}
              </div>
              <Badge variant="outline" className={cn("ml-2 text-xs capitalize border", STATUS_COLORS[lead.status] ?? "")}>
                {lead.status}
              </Badge>
              {lead.isConverted && (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                  Converted
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2">
              {lead.email && (
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={() => setIsEmailOpen(true)}>
                  <Mail className="w-3.5 h-3.5" /> Email
                </Button>
              )}
              {!lead.isConverted && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1.5 text-green-600 border-green-200 hover:bg-green-50"
                    onClick={() => { setAcceptRejectMode("accept"); setShowAcceptReject(true); }}
                  >
                    <ThumbsUp className="w-3.5 h-3.5" /> Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1.5 text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => { setAcceptRejectMode("reject"); setShowAcceptReject(true); }}
                  >
                    <ThumbsDown className="w-3.5 h-3.5" /> Reject
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5 text-purple-600 border-purple-200 hover:bg-purple-50" onClick={() => setIsConvertOpen(true)}>
                    <ArrowRightLeft className="w-3.5 h-3.5" /> Convert
                  </Button>
                </>
              )}
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={() => setIsEditOpen(true)}>
                <Pencil className="w-3.5 h-3.5" /> Edit
              </Button>
            </div>
          </div>

          {/* Accept / Reject panel */}
          {showAcceptReject && acceptRejectMode && (
            <div className={cn(
              "px-5 py-4 border-b",
              acceptRejectMode === "accept" ? "bg-green-50 border-green-100" : "bg-red-50 border-red-100"
            )}>
              <div className="flex items-center gap-2 mb-3">
                {acceptRejectMode === "accept"
                  ? <ThumbsUp className="w-4 h-4 text-green-600" />
                  : <ThumbsDown className="w-4 h-4 text-red-600" />}
                <span className={cn("text-sm font-semibold", acceptRejectMode === "accept" ? "text-green-700" : "text-red-700")}>
                  {acceptRejectMode === "accept" ? "Accept this lead" : "Reject this lead"}
                </span>
              </div>
              {acceptRejectMode === "reject" && (
                <div className="mb-3">
                  <Label className="text-xs font-medium text-red-700 mb-1.5 block">Reason for rejection *</Label>
                  <select
                    className="w-full h-9 px-3 rounded-md bg-white border border-red-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-200"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                  >
                    {REJECT_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              )}
              <div className="mb-3">
                <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Additional notes (optional)</Label>
                <Textarea
                  placeholder="Add context or notes..."
                  className="h-16 text-sm resize-none bg-white"
                  value={acceptRejectNote}
                  onChange={(e) => setAcceptRejectNote(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className={cn("text-xs text-white", acceptRejectMode === "accept" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700")}
                  onClick={() => void handleAcceptReject()}
                  disabled={updateMutation.isPending}
                >
                  {acceptRejectMode === "accept" ? "Confirm Accept" : "Confirm Reject"}
                </Button>
                <Button size="sm" variant="outline" className="text-xs" onClick={() => { setShowAcceptReject(false); setAcceptRejectMode(null); }}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Chevron Pipeline Status Bar */}
          {!lead.isConverted && (
            <div className="px-5 py-3 flex items-center gap-3">
              <div className="flex items-stretch flex-1 min-w-0 overflow-x-auto">
                {PIPELINE_STAGES.filter((s) => s.key !== "converted").map((stage, i, arr) => {
                  const isCompleted = i < currentStageIdx;
                  const isCurrent = stage.key === lead.status;
                  const isFirst = i === 0;
                  const isLast = i === arr.length - 1;
                  return (
                    <button
                      key={stage.key}
                      onClick={() => handleStatusChange(stage.key)}
                      title={`Set to ${stage.label}`}
                      className={cn(
                        "flex-1 min-w-[80px] flex flex-col items-center justify-center py-2 px-4 text-center transition-all relative select-none",
                        "border-y border-r first:border-l",
                        isFirst ? "rounded-l-sm" : "",
                        isLast ? "rounded-r-sm" : "",
                        isCurrent
                          ? "bg-primary border-primary text-white z-10"
                          : isCompleted
                          ? "bg-primary/10 border-primary/30 text-primary hover:bg-primary/20"
                          : "bg-muted/30 border-border text-muted-foreground hover:bg-muted/60"
                      )}
                      style={{
                        clipPath: isFirst
                          ? "polygon(0 0, calc(100% - 10px) 0, 100% 50%, calc(100% - 10px) 100%, 0 100%)"
                          : isLast
                          ? "polygon(0 0, 100% 0, 100% 100%, 0 100%, 10px 50%)"
                          : "polygon(0 0, calc(100% - 10px) 0, 100% 50%, calc(100% - 10px) 100%, 0 100%, 10px 50%)",
                        marginLeft: i > 0 ? "-1px" : "0",
                      }}
                    >
                      <span className="text-[10px] font-semibold leading-tight">{stage.label}</span>
                      {isCurrent && (
                        <span className="text-[9px] opacity-80 mt-0.5">
                          {daysSinceUpdate === 0 ? "Today" : `${daysSinceUpdate}d`}
                        </span>
                      )}
                      {isCompleted && (
                        <CheckCircle2 className="w-3 h-3 mt-0.5 opacity-60" />
                      )}
                    </button>
                  );
                })}
              </div>
              {currentStageIdx < PIPELINE_STAGES.length - 2 && (
                <Button
                  size="sm"
                  className="ml-2 h-8 text-xs bg-primary hover:bg-primary/90 text-white flex-shrink-0"
                  onClick={handleMarkComplete}
                  disabled={updateMutation.isPending}
                >
                  Advance Stage →
                </Button>
              )}
            </div>
          )}

          {lead.isConverted && (
            <div className="px-5 py-4 border-t border-green-100 bg-green-50">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                <span className="text-sm font-medium text-green-700">Lead converted — linked records:</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {lead.convertedContactId && (
                  <Link href={`/contacts/${lead.convertedContactId}`}>
                    <div className="flex items-center gap-2.5 p-2.5 rounded-md bg-white border border-green-200 hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer group">
                      <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <User className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">Contact</div>
                        <div className="text-xs text-muted-foreground">View record →</div>
                      </div>
                    </div>
                  </Link>
                )}
                {lead.convertedAccountId && (
                  <Link href={`/accounts/${lead.convertedAccountId}`}>
                    <div className="flex items-center gap-2.5 p-2.5 rounded-md bg-white border border-green-200 hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer group">
                      <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">Account</div>
                        <div className="text-xs text-muted-foreground">View record →</div>
                      </div>
                    </div>
                  </Link>
                )}
                {lead.convertedOpportunityId && (
                  <Link href={`/opportunities/${lead.convertedOpportunityId}`}>
                    <div className="flex items-center gap-2.5 p-2.5 rounded-md bg-white border border-green-200 hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer group">
                      <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Briefcase className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">Opportunity</div>
                        <div className="text-xs text-muted-foreground">View record →</div>
                      </div>
                    </div>
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left column — Details */}
          <div className="lg:col-span-1 flex flex-col gap-3">
            {/* About */}
            <CollapsibleSection title="About">
              <FieldRow label="Lead Source" value={lead.source?.replace(/_/g, " ")} icon={Target} />
              <FieldRow label="Industry" value={lead.industry} icon={Building2} />
              <FieldRow label="Employees" value={lead.employees?.toLocaleString()} icon={Users} />
              <FieldRow label="Annual Revenue" value={lead.annualRevenue ? `$${lead.annualRevenue.toLocaleString()}` : null} icon={DollarSign} />
              {lead.score != null && (
                <div className="py-2 border-b border-border/50 last:border-0">
                  <div className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1.5">
                    <Star className="w-3 h-3" /> Lead Score
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full", lead.score >= 70 ? "bg-green-500" : lead.score >= 40 ? "bg-yellow-500" : "bg-red-500")}
                        style={{ width: `${lead.score}%` }}
                      />
                    </div>
                    <span className={cn(
                      "text-sm font-bold",
                      lead.score >= 70 ? "text-green-600" : lead.score >= 40 ? "text-yellow-600" : "text-red-600"
                    )}>
                      {lead.score}
                    </span>
                  </div>
                </div>
              )}
              {lead.description && (
                <div className="py-2">
                  <div className="text-xs text-muted-foreground mb-1">Description</div>
                  <p className="text-sm text-foreground leading-relaxed">{lead.description}</p>
                </div>
              )}
            </CollapsibleSection>

            {/* Get in Touch */}
            <CollapsibleSection title="Get in Touch">
              <FieldRow label="Email" value={lead.email} icon={Mail} />
              <FieldRow label="Phone" value={lead.phone} icon={Phone} />
              <FieldRow label="Company" value={lead.company} icon={Building2} />
              <FieldRow label="Title" value={lead.title} icon={User} />
            </CollapsibleSection>

            {/* Record Info */}
            <CollapsibleSection title="Record Information" defaultOpen={false}>
              <FieldRow label="Assigned To / Owner" value={lead.assignedToName ?? "Unassigned"} icon={User} />
              <FieldRow label="Created By" value={lead.assignedToName ?? "System"} icon={User} />
              <FieldRow label="Created" value={format(new Date(lead.createdAt), "MMM d, yyyy")} icon={Calendar} />
              <FieldRow label="Days in CRM" value={`${daysSinceCreated} day${daysSinceCreated !== 1 ? "s" : ""}`} icon={Clock} />
              <FieldRow label="Last Updated" value={formatDistanceToNow(new Date(lead.updatedAt), { addSuffix: true })} icon={Clock} />
            </CollapsibleSection>
          </div>

          {/* Right column — AI Summary + Related Tabs */}
          <div className="lg:col-span-2 flex flex-col gap-3">
            {/* AI Summary */}
            <AISummary entityType="lead" entityData={lead as unknown as Record<string, unknown>} />

            {/* Related List Tabs */}
            <div className="bg-card border border-border rounded-md shadow-sm overflow-hidden">
              {/* Tab headers */}
              <div className="flex border-b border-border bg-muted/30">
                {[
                  { key: "activities", label: "Activities", count: activities.length },
                  { key: "contacts", label: "Contacts", count: lead.convertedContactId ? 1 : 0 },
                  { key: "accounts", label: "Accounts", count: lead.convertedAccountId ? 1 : 0 },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setRelatedTab(tab.key as "activities" | "contacts" | "accounts")}
                    className={cn(
                      "px-4 py-2.5 text-xs font-semibold uppercase tracking-wide transition-colors flex items-center gap-1.5",
                      relatedTab === tab.key
                        ? "text-primary border-b-2 border-primary bg-card"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {tab.label}
                    {tab.count > 0 && (
                      <span className="bg-primary/10 text-primary text-[10px] px-1.5 py-0.5 rounded-full font-bold">{tab.count}</span>
                    )}
                  </button>
                ))}
                <div className="flex-1" />
                {relatedTab === "activities" && (
                  <Button size="sm" variant="ghost" className="h-8 m-1 text-xs text-primary hover:bg-primary/5 gap-1" onClick={() => setIsEmailOpen(true)}>
                    <Send className="w-3 h-3" /> New Email
                  </Button>
                )}
              </div>

              {/* Activities tab */}
              {relatedTab === "activities" && (
                <div>
                  {/* Add note inline */}
                  <div className="px-4 py-3 border-b border-border bg-muted/10">
                    <div className="flex gap-2">
                      <Textarea
                        placeholder="Add a note or comment..."
                        className="h-10 text-sm resize-none flex-1 min-h-[36px]"
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void handleAddNote(); } }}
                      />
                      <Button size="sm" className="h-10 text-xs bg-primary text-white hover:bg-primary/90" onClick={() => void handleAddNote()} disabled={isAddingNote || !newNote.trim()}>
                        <Plus className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="divide-y divide-border max-h-80 overflow-y-auto">
                    {activities.length === 0 ? (
                      <div className="px-4 py-10 text-center">
                        <Activity className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
                        <p className="text-sm text-muted-foreground">No activities yet.</p>
                        <Button size="sm" variant="outline" className="mt-3 text-xs" onClick={() => setIsEmailOpen(true)}>
                          <Mail className="w-3.5 h-3.5 mr-1.5" /> Log an email
                        </Button>
                      </div>
                    ) : (
                      activities.slice(0, 15).map((act) => {
                        const Icon = ACTIVITY_ICONS[act.type] ?? Activity;
                        return (
                          <div key={act.id} className="px-4 py-3 flex items-start gap-3 hover:bg-muted/20 transition-colors">
                            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <Icon className="w-3.5 h-3.5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <span className="text-sm font-medium text-foreground">{act.subject}</span>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-xs capitalize flex-shrink-0",
                                    act.status === "completed"
                                      ? "bg-green-50 text-green-700 border-green-200"
                                      : "bg-blue-50 text-blue-700 border-blue-200"
                                  )}
                                >
                                  {act.status}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs text-muted-foreground capitalize">{act.type}</span>
                                {act.dueDate && (
                                  <span className="text-xs text-muted-foreground">
                                    · {format(new Date(act.dueDate), "MMM d")}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Contacts tab */}
              {relatedTab === "contacts" && (
                <div className="p-4">
                  {lead.convertedContactId && convertedContactData ? (
                    <Link href={`/contacts/${lead.convertedContactId}`}>
                      <div className="flex items-center gap-3 p-3 rounded-md border border-border hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer group">
                        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                          {convertedContactData.firstName?.[0] ?? ""}{convertedContactData.lastName?.[0] ?? ""}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                            {convertedContactData.firstName} {convertedContactData.lastName}
                          </div>
                          {convertedContactData.title && <div className="text-xs text-muted-foreground">{convertedContactData.title}</div>}
                          {convertedContactData.email && (
                            <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Mail className="w-3 h-3" /> {convertedContactData.email}
                            </div>
                          )}
                        </div>
                        <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">Converted</Badge>
                      </div>
                    </Link>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <User className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">No contact linked yet.</p>
                      <p className="text-xs mt-1">Convert this lead to create a contact record.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Accounts tab */}
              {relatedTab === "accounts" && (
                <div className="p-4">
                  {lead.convertedAccountId && convertedAccountData ? (
                    <Link href={`/accounts/${lead.convertedAccountId}`}>
                      <div className="flex items-center gap-3 p-3 rounded-md border border-border hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer group">
                        <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                            {convertedAccountData.name}
                          </div>
                          {convertedAccountData.industry && <div className="text-xs text-muted-foreground">{convertedAccountData.industry}</div>}
                          {convertedAccountData.city && (
                            <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3" /> {convertedAccountData.city}{convertedAccountData.country ? `, ${convertedAccountData.country}` : ""}
                            </div>
                          )}
                        </div>
                        <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">Converted</Badge>
                      </div>
                    </Link>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Building2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">No account linked yet.</p>
                      <p className="text-xs mt-1">Convert this lead to create an account record.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Email Compose */}
      <EmailCompose
        open={isEmailOpen}
        onOpenChange={setIsEmailOpen}
        defaultTo={lead.email ?? ""}
        defaultSubject={`Following up — ${fullName}`}
        recipientName={lead.firstName}
        leadId={lead.id}
        contactId={lead.convertedContactId ?? undefined}
        onSent={() => void refetchActivities()}
      />

      {/* Convert Dialog */}
      <Dialog open={isConvertOpen} onOpenChange={setIsConvertOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="border-b border-border pb-3">
            <DialogTitle className="text-base font-semibold flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-primary" /> Convert Lead
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              Converting <strong className="text-foreground">{fullName}</strong> will create:
            </p>
            <div className="space-y-2">
              {[
                { icon: User, label: "Contact record", desc: fullName },
                lead.company ? { icon: Building2, label: "Account record", desc: lead.company } : null,
                { icon: Briefcase, label: "Opportunity", desc: `${fullName} Deal` },
              ].filter(Boolean).map((item, i) => {
                const ItemIcon = item!.icon;
                return (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-md border border-border bg-muted/30">
                    <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
                      <ItemIcon className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{item!.label}</p>
                      <p className="text-xs text-muted-foreground">{item!.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="p-3 rounded-md bg-amber-50 border border-amber-200">
              <p className="text-xs text-amber-700">
                <strong>Validation:</strong> Make sure the lead has a name and company before converting to ensure Account and Contact records are complete.
              </p>
            </div>
          </div>
          <DialogFooter className="border-t border-border pt-3 gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsConvertOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleConvert} disabled={convertMutation.isPending} className="bg-primary hover:bg-primary/90 text-white">
              {convertMutation.isPending ? "Converting..." : "Convert Lead"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <LeadEditDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        lead={lead}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ["lead", id] })}
      />
    </Layout>
  );
}

function LeadEditDialog({ open, onOpenChange, lead, onSaved }: {
  open: boolean; onOpenChange: (v: boolean) => void; lead: LeadDetail; onSaved: () => void;
}) {
  const { toast } = useToast();
  const { data: usersData } = useListUsers({ limit: 50 });
  const updateMutation = useUpdateLead();
  const [form, setForm] = useState({
    ...lead,
    assignedTo: lead.assignedTo?.toString() ?? "",
    score: lead.score?.toString() ?? "",
    annualRevenue: lead.annualRevenue?.toString() ?? "",
    employees: lead.employees?.toString() ?? "",
  });

  const [emailError, setEmailError] = useState("");
  const [phoneError, setPhoneError] = useState("");

  React.useEffect(() => {
    if (open) {
      setForm({
        ...lead,
        assignedTo: lead.assignedTo?.toString() ?? "",
        score: lead.score?.toString() ?? "",
        annualRevenue: lead.annualRevenue?.toString() ?? "",
        employees: lead.employees?.toString() ?? "",
      });
      setEmailError("");
      setPhoneError("");
    }
  }, [open, lead]);

  const validateEmail = (val: string) => {
    if (!val) return "";
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(val) ? "" : "Enter a valid email address";
  };

  const validatePhone = (val: string) => {
    if (!val) return "";
    const cleaned = val.replace(/\s/g, "");
    const re = /^\+?[0-9]{7,15}$/;
    return re.test(cleaned) ? "" : "Enter a valid phone number (e.g. +91 9876543210)";
  };

  const f = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const v = e.target.value;
    setForm({ ...form, [field]: v });
    if (field === "email") setEmailError(validateEmail(v));
    if (field === "phone") setPhoneError(validatePhone(v));
  };

  const sc = "w-full h-9 px-3 rounded-md bg-card border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ee = validateEmail(form.email ?? "");
    const pe = validatePhone(form.phone ?? "");
    if (ee || pe) { setEmailError(ee); setPhoneError(pe); return; }
    updateMutation.mutate({
      id: lead.id,
      data: {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email ?? undefined,
        phone: form.phone ?? undefined,
        company: form.company ?? undefined,
        title: form.title ?? undefined,
        status: form.status as "new" | "contacted" | "qualified" | "unqualified" | "converted",
        source: form.source ?? undefined,
        score: form.score ? parseInt(form.score) : undefined,
        assignedTo: form.assignedTo ? parseInt(form.assignedTo) : undefined,
        industry: form.industry ?? undefined,
        description: form.description ?? undefined,
        employees: form.employees ? parseInt(form.employees) : undefined,
        annualRevenue: form.annualRevenue ? form.annualRevenue : undefined,
      },
    }, {
      onSuccess: () => { toast({ title: "Lead updated" }); onSaved(); onOpenChange(false); },
      onError: () => toast({ title: "Error", description: "Failed to update.", variant: "destructive" }),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b border-border pb-3">
          <DialogTitle className="text-base font-semibold">Edit Lead</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 py-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">First Name *</Label>
              <Input required className="h-9 text-sm" value={form.firstName} onChange={f("firstName")} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Last Name *</Label>
              <Input required className="h-9 text-sm" value={form.lastName} onChange={f("lastName")} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Email</Label>
              <Input
                type="text"
                className={cn("h-9 text-sm", emailError ? "border-destructive focus:ring-destructive/30" : "")}
                value={form.email ?? ""}
                onChange={f("email")}
                placeholder="user@example.com"
              />
              {emailError && <p className="text-xs text-destructive">{emailError}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Phone</Label>
              <Input
                className={cn("h-9 text-sm", phoneError ? "border-destructive focus:ring-destructive/30" : "")}
                value={form.phone ?? ""}
                onChange={f("phone")}
                placeholder="+91 9876543210"
              />
              {phoneError && <p className="text-xs text-destructive">{phoneError}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Company</Label>
              <Input className="h-9 text-sm" value={form.company ?? ""} onChange={f("company")} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Title</Label>
              <Input className="h-9 text-sm" value={form.title ?? ""} onChange={f("title")} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Status</Label>
              <select className={sc} value={form.status} onChange={f("status")}>
                {["new", "contacted", "qualified", "unqualified"].map((s) => (
                  <option key={s} value={s} className="capitalize">{s}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Source</Label>
              <select className={sc} value={form.source ?? ""} onChange={f("source")}>
                <option value="">—</option>
                {["website", "referral", "linkedin", "email_campaign", "trade_show", "cold_call", "other"].map((s) => (
                  <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Score (0–100)</Label>
              <Input type="number" min="0" max="100" className="h-9 text-sm" value={form.score} onChange={f("score")} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Assigned To</Label>
              <select className={sc} value={form.assignedTo} onChange={f("assignedTo")}>
                <option value="">Unassigned</option>
                {usersData?.data?.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Industry</Label>
              <Input className="h-9 text-sm" value={form.industry ?? ""} onChange={f("industry")} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Employees</Label>
              <Input type="number" className="h-9 text-sm" value={form.employees} onChange={f("employees")} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Description</Label>
            <textarea className={cn(sc, "h-20 py-2 resize-none")} value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <DialogFooter className="pt-3 border-t border-border gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" size="sm" disabled={updateMutation.isPending} className="bg-primary hover:bg-primary/90 text-white">
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
