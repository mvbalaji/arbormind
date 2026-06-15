import React, { useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useUpdateLead, useConvertLead, getListLeadsQueryKey, useListUsers, useListAccounts, useListContacts, useCreateActivity, useUpdateActivity, type ConvertLeadInput } from "@workspace/api-client-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/context/auth";
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
import { AINextActions } from "@/components/ai-next-actions";
import { EmailCompose } from "@/components/email-compose";
import { EmailViewer } from "@/components/email-viewer";
import { StagePipeline } from "@/components/stage-pipeline";
import {
  ArrowLeft, Mail, Phone, Building2, User, Calendar, Activity,
  CheckCircle2, Clock, ArrowRightLeft, Pencil, MapPin, DollarSign,
  Globe, Users, Briefcase, Star, Target, Send, ChevronDown, ChevronUp, ChevronRight,
  TrendingUp, ThumbsUp, ThumbsDown, MessageSquare, Plus, XCircle, CheckSquare, Save, X,
} from "lucide-react";
import { LeadInsightsPanel } from "@/components/lead-insights-panel";
import { format, formatDistanceToNow, differenceInDays } from "date-fns";
import { useCurrency } from "@/context/currency";
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
  buyerClassification: string | null;
  insightsGeneratedAt: string | null;
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
  completedAt?: string | null;
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

const ADVANCE_STAGES = [
  { key: "new", label: "New" },
  { key: "contacted", label: "Contacted" },
  { key: "qualified", label: "Qualified" },
  { key: "converted", label: "Converted" },
];

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

function CollapsibleSection({ title, children, defaultOpen = true, onEdit, isEditing }: {
  title: string; children: React.ReactNode; defaultOpen?: boolean;
  onEdit?: () => void; isEditing?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-card border border-border rounded-md overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-2 py-1 bg-muted/30 border-b border-border">
        <button
          onClick={() => setOpen(!open)}
          className="flex-1 flex items-center justify-between text-left hover:opacity-80 transition-opacity"
        >
          <span className="text-xs font-semibold text-foreground uppercase tracking-wide">{title}</span>
          {open ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
        </button>
        {onEdit && !isEditing && (
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="ml-2 p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Edit section"
          >
            <Pencil className="w-3 h-3" />
          </button>
        )}
      </div>
      {open && <div className="px-3 py-1">{children}</div>}
    </div>
  );
}

export default function LeadDetail() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [, navigate] = useLocation();
  const { format: fmtMoney } = useCurrency();
  const [isConvertOpen, setIsConvertOpen] = useState(false);
  type LeadEditSection = "contact" | "details";
  const [editingSection, setEditingSection] = useState<LeadEditSection | null>(null);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editCompany, setEditCompany] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editSource, setEditSource] = useState("");
  const [editScore, setEditScore] = useState("");
  const [editAssignedTo, setEditAssignedTo] = useState("");
  const [editIndustry, setEditIndustry] = useState("");
  const [editEmployees, setEditEmployees] = useState("");
  const [editAnnualRevenue, setEditAnnualRevenue] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [isEmailOpen, setIsEmailOpen] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerActivityId, setViewerActivityId] = useState<number | null>(null);
  const [collapsedThreads, setCollapsedThreads] = useState<Set<number>>(new Set());
  const [relatedTab, setRelatedTab] = useState<"activities" | "actions" | "contacts" | "accounts">("activities");
  const [newActionTitle, setNewActionTitle] = useState("");
  const [newActionDue, setNewActionDue] = useState("");
  const createActivity = useCreateActivity();
  const updateActivity = useUpdateActivity();
  const { user: currentUser } = useAuth();
  const [showAcceptReject, setShowAcceptReject] = useState(false);
  const [acceptRejectMode, setAcceptRejectMode] = useState<"accept" | "reject" | null>(null);
  const [rejectReason, setRejectReason] = useState(REJECT_REASONS[0]);
  const [acceptRejectNote, setAcceptRejectNote] = useState("");
  const [newNote, setNewNote] = useState("");
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [activityType, setActivityType] = useState<string>("note");
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
    queryKey: ["lead-activities", id],
    queryFn: async () => {
      const params = new URLSearchParams({ page: "1", limit: "50", leadId: String(id) });
      const res = await fetch(`/api/activities?${params}`, { credentials: "include" });
      return res.json() as Promise<{ data: LeadActivity[] }>;
    },
    enabled: !!id,
    // Poll every 20s so open-tracking pixel hits (recipient opening the email)
    // and inbound sync writes surface in the timeline without the user having to
    // manually reload. Also refetch when the tab regains focus so coming back to
    // the page after checking email shows the latest opens immediately.
    refetchInterval: 20_000,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const { data: scoreBreakdown } = useQuery<{
    score: number;
    milestone: { id: number; label: string; color: string; minScore: number; maxScore: number } | null;
    rules: { ruleId: number; ruleType: string; label: string; earned: boolean; earnedPoints: number }[];
    breakdown: { activity: number; field: number; qualification: number; companySize: number; revenue: number; total: number };
  } | null>({
    queryKey: ["lead-score-breakdown", id],
    queryFn: async () => {
      const res = await fetch(`/api/leads/${id}/score-breakdown`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!id,
  });

  const { data: linkedContactsData } = useQuery<{ data: ConvertedContact[] }>({
    queryKey: ["lead-contacts", lead?.id],
    queryFn: async () => {
      const res = await fetch(`/api/leads/${lead!.id}/contacts`, { credentials: "include" });
      return res.json() as Promise<{ data: ConvertedContact[] }>;
    },
    enabled: !!lead?.isConverted,
  });
  const linkedContacts = linkedContactsData?.data ?? [];

  const { data: convertedContactData } = useQuery<ConvertedContact>({
    queryKey: ["contact", lead?.convertedContactId],
    queryFn: async () => {
      const res = await fetch(`/api/contacts/${lead!.convertedContactId}`, { credentials: "include" });
      return res.json() as Promise<ConvertedContact>;
    },
    enabled: !!lead?.convertedContactId && linkedContacts.length === 0,
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
  const { data: usersForEdit } = useListUsers({ limit: 50 });

  const startEdit = (section: LeadEditSection) => {
    if (!lead) return;
    if (section === "contact") {
      setEditFirstName(lead.firstName);
      setEditLastName(lead.lastName);
      setEditEmail(lead.email ?? "");
      setEditPhone(lead.phone ?? "");
      setEditCompany(lead.company ?? "");
      setEditTitle(lead.title ?? "");
    } else {
      setEditSource(lead.source ?? "");
      setEditScore(lead.score?.toString() ?? "");
      setEditAssignedTo(lead.assignedTo?.toString() ?? "");
      setEditIndustry(lead.industry ?? "");
      setEditEmployees(lead.employees?.toString() ?? "");
      setEditAnnualRevenue(lead.annualRevenue?.toString() ?? "");
      setEditDescription(lead.description ?? "");
    }
    setEditingSection(section);
  };

  const cancelEdit = () => setEditingSection(null);

  const handleSaveSection = async () => {
    if (!lead || !editingSection) return;
    const data = {
      firstName: editingSection === "contact" ? editFirstName : lead.firstName,
      lastName: editingSection === "contact" ? editLastName : lead.lastName,
      email: editingSection === "contact" ? (editEmail || undefined) : (lead.email ?? undefined),
      phone: editingSection === "contact" ? (editPhone || undefined) : (lead.phone ?? undefined),
      company: editingSection === "contact" ? (editCompany || undefined) : (lead.company ?? undefined),
      title: editingSection === "contact" ? (editTitle || undefined) : (lead.title ?? undefined),
      status: lead.status as "new" | "contacted" | "qualified" | "unqualified" | "converted",
      source: editingSection === "details" ? (editSource as "website" | "referral" | "linkedin" | "email_campaign" | "trade_show" | "cold_call" | "other" | undefined || undefined) : (lead.source as "website" | "referral" | "linkedin" | "email_campaign" | "trade_show" | "cold_call" | "other" | undefined ?? undefined),
      score: editingSection === "details" ? (editScore ? parseInt(editScore) : undefined) : (lead.score ?? undefined),
      assignedTo: editingSection === "details" ? (editAssignedTo ? parseInt(editAssignedTo) : undefined) : (lead.assignedTo ?? undefined),
      industry: editingSection === "details" ? (editIndustry || undefined) : (lead.industry ?? undefined),
      employees: editingSection === "details" ? (editEmployees ? parseInt(editEmployees) : undefined) : (lead.employees ?? undefined),
      annualRevenue: editingSection === "details" ? (editAnnualRevenue ? Number(editAnnualRevenue) : undefined) : (lead.annualRevenue ?? undefined),
      description: editingSection === "details" ? (editDescription || undefined) : (lead.description ?? undefined),
    };
    try {
      await updateMutation.mutateAsync({ id: lead.id, data });
      toast({ title: "Saved" });
      setEditingSection(null);
      queryClient.invalidateQueries({ queryKey: ["lead", id] });
      queryClient.invalidateQueries({ queryKey: getListLeadsQueryKey() });
    } catch {
      toast({ title: "Error", description: "Failed to save.", variant: "destructive" });
    }
  };

  const inputCls = "w-full h-9 px-3 rounded-md bg-card border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";

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
  const activities = activitiesData?.data ?? [];
  const daysSinceCreated = differenceInDays(new Date(), new Date(lead.createdAt));

  const handleStatusChange = (newStatus: string) => {
    updateMutation.mutate({
      id: lead.id,
      data: {
        firstName: lead.firstName,
        lastName: lead.lastName,
        email: lead.email,
        phone: lead.phone,
        company: lead.company,
        title: lead.title,
        source: lead.source,
        score: lead.score,
        industry: lead.industry,
        description: lead.description,
        employees: lead.employees,
        annualRevenue: lead.annualRevenue,
        assignedTo: lead.assignedTo,
        status: newStatus as "new" | "contacted" | "qualified" | "unqualified" | "converted",
      },
    }, {
      onSuccess: () => {
        toast({ title: "Status updated" });
        queryClient.invalidateQueries({ queryKey: ["lead", id] });
        queryClient.invalidateQueries({ queryKey: getListLeadsQueryKey() });
      },
    });
  };

  const advanceStageIdx = ADVANCE_STAGES.findIndex((s) => s.key === lead.status);
  const handleMarkComplete = () => {
    if (advanceStageIdx >= 0 && advanceStageIdx < ADVANCE_STAGES.length - 1) {
      const nextStage = ADVANCE_STAGES[advanceStageIdx + 1];
      if (nextStage.key === "converted") {
        setIsConvertOpen(true);
      } else {
        handleStatusChange(nextStage.key);
      }
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
          description: noteText.trim(),
          leadId: lead.id,
          contactId: lead.convertedContactId ?? undefined,
          accountId: lead.convertedAccountId ?? undefined,
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

  const handleAddActivity = async () => {
    if (!newNote.trim()) return;
    setIsAddingNote(true);
    const typeLabels: Record<string, string> = { note: "Note", call: "Call", meeting: "Meeting", task: "Task", email: "Email" };
    try {
      await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          type: activityType,
          subject: newNote.trim().substring(0, 80),
          status: activityType === "note" ? "completed" : "planned",
          description: newNote.trim(),
          leadId: lead.id,
          contactId: lead.convertedContactId ?? undefined,
          accountId: lead.convertedAccountId ?? undefined,
        }),
      });
      toast({ title: `${typeLabels[activityType] ?? "Activity"} logged` });
      setNewNote("");
      setActivityType("note");
      void refetchActivities();
    } catch {
      toast({ title: "Error", description: "Could not log activity.", variant: "destructive" });
    } finally {
      setIsAddingNote(false);
    }
  };

  const handleConvertSubmit = (convertData: ConvertLeadInput) => {
    convertMutation.mutate({
      id: lead.id,
      data: convertData,
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
              <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold flex-shrink-0">
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
                  className={cn("text-xs text-primary-foreground", acceptRejectMode === "accept" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700")}
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
          {!lead.isConverted && (() => {
            const baseStages = [
              { id: "new", label: "New" },
              { id: "contacted", label: "Contacted" },
              { id: "qualified", label: "Qualified" },
            ];
            const stages = lead.status === "unqualified"
              ? [...baseStages, { id: "unqualified", label: "Unqualified" }]
              : [...baseStages, { id: "converted", label: "Converted" }];
            const currentTone = lead.status === "unqualified" ? "red" as const : "blue" as const;
            const stageDate = (stageId: string): Date | null =>
              stageId === "new" && lead.createdAt ? new Date(lead.createdAt) : null;
            const canAdvance = advanceStageIdx >= 0 && advanceStageIdx < ADVANCE_STAGES.length - 1;
            const isQualified = lead.status === "qualified";
            const advance = canAdvance
              ? {
                  label: isQualified ? "Convert Lead" : "Advance Stage",
                  icon: isQualified ? ArrowRightLeft : ChevronRight,
                  onClick: handleMarkComplete,
                  disabled: updateMutation.isPending,
                  tone: (isQualified ? "emerald" : "blue") as "blue" | "emerald",
                }
              : null;
            return (
              <div className="px-5 py-3">
                <StagePipeline
                  ariaLabel="Lead pipeline stage"
                  stages={stages.map((s) => ({ ...s, enteredAt: stageDate(s.id) }))}
                  currentId={lead.status}
                  currentTone={currentTone}
                  advance={advance}
                />
              </div>
            );
          })()}

          {lead.isConverted && (
            <div className="px-5 py-4 border-t border-green-100 bg-green-50">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                <span className="text-sm font-medium text-green-700">Lead converted — linked records:</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {linkedContacts.length > 0 ? linkedContacts.map((contact) => (
                  <Link key={contact.id} href={`/contacts/${contact.id}`}>
                    <div className="flex items-center gap-2.5 p-2.5 rounded-md bg-white border border-green-200 hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer group">
                      <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <User className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-primary group-hover:underline transition-colors">{contact.firstName} {contact.lastName}</div>
                        <div className="text-xs text-muted-foreground">View contact →</div>
                      </div>
                    </div>
                  </Link>
                )) : lead.convertedContactId && (
                  <Link href={`/contacts/${lead.convertedContactId}`}>
                    <div className="flex items-center gap-2.5 p-2.5 rounded-md bg-white border border-green-200 hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer group">
                      <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <User className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-primary group-hover:underline transition-colors">Contact</div>
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
                        <div className="text-xs font-semibold text-primary group-hover:underline transition-colors">Account</div>
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
                        <div className="text-xs font-semibold text-primary group-hover:underline transition-colors">Opportunity</div>
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
            {/* Contact Information */}
            <CollapsibleSection
              title="Contact Information"
              onEdit={() => startEdit("contact")}
              isEditing={editingSection === "contact"}
            >
              {editingSection === "contact" ? (
                <div className="py-3 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">First Name *</label>
                      <input className={inputCls} value={editFirstName} onChange={(e) => setEditFirstName(e.target.value)} required />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Last Name *</label>
                      <input className={inputCls} value={editLastName} onChange={(e) => setEditLastName(e.target.value)} required />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Email</label>
                    <input className={inputCls} type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder="user@example.com" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Phone</label>
                    <input className={inputCls} value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="+91 9876543210" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Company</label>
                      <input className={inputCls} value={editCompany} onChange={(e) => setEditCompany(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Title</label>
                      <input className={inputCls} value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" className="h-8 gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => void handleSaveSection()} disabled={updateMutation.isPending || !editFirstName || !editLastName}>
                      <Save className="w-3.5 h-3.5" /> {updateMutation.isPending ? "Saving…" : "Save"}
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={cancelEdit}>
                      <X className="w-3.5 h-3.5" /> Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <FieldRow label="Email" value={lead.email} icon={Mail} />
                  <FieldRow label="Phone" value={lead.phone} icon={Phone} />
                  <FieldRow label="Company" value={lead.company} icon={Building2} />
                  <FieldRow label="Title" value={lead.title} icon={User} />
                  {!lead.email && !lead.phone && !lead.company && !lead.title && (
                    <p className="text-xs text-muted-foreground py-2">No contact details yet.</p>
                  )}
                </>
              )}
            </CollapsibleSection>

            {/* Lead Details */}
            <CollapsibleSection
              title="Lead Details"
              onEdit={() => startEdit("details")}
              isEditing={editingSection === "details"}
            >
              {editingSection === "details" ? (
                <div className="py-3 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Source</label>
                      <select className={inputCls} value={editSource} onChange={(e) => setEditSource(e.target.value)}>
                        <option value="">—</option>
                        {["website", "referral", "linkedin", "email_campaign", "trade_show", "cold_call", "other"].map((s) => (
                          <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Industry</label>
                      <input className={inputCls} value={editIndustry} onChange={(e) => setEditIndustry(e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Employees</label>
                      <input className={inputCls} type="number" value={editEmployees} onChange={(e) => setEditEmployees(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Annual Revenue</label>
                      <input className={inputCls} type="number" value={editAnnualRevenue} onChange={(e) => setEditAnnualRevenue(e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Score (0–100)</label>
                      <input className={inputCls} type="number" min="0" max="100" value={editScore} onChange={(e) => setEditScore(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Assigned To</label>
                      <select className={inputCls} value={editAssignedTo} onChange={(e) => setEditAssignedTo(e.target.value)}>
                        <option value="">Unassigned</option>
                        {usersForEdit?.data?.map((u) => (
                          <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Description</label>
                    <textarea
                      className={cn(inputCls, "h-20 py-2 resize-none")}
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" className="h-8 gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => void handleSaveSection()} disabled={updateMutation.isPending}>
                      <Save className="w-3.5 h-3.5" /> {updateMutation.isPending ? "Saving…" : "Save"}
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={cancelEdit}>
                      <X className="w-3.5 h-3.5" /> Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <FieldRow label="Lead Source" value={lead.source?.replace(/_/g, " ")} icon={Target} />
                  <FieldRow label="Industry" value={lead.industry} icon={Building2} />
                  <FieldRow label="Employees" value={lead.employees?.toLocaleString()} icon={Users} />
                  <FieldRow label="Annual Revenue" value={lead.annualRevenue ? fmtMoney(lead.annualRevenue) : null} icon={DollarSign} />
                  {lead.score != null && (
                    <div className="py-2 border-b border-border/50 last:border-0">
                      <div className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1.5">
                        <Star className="w-3 h-3" /> Lead Score
                      </div>
                      {/* Score bar */}
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                          <div
                            className={cn("h-full rounded-full transition-all",
                              lead.score >= 76 ? "bg-green-500" : lead.score >= 51 ? "bg-orange-500" : lead.score >= 26 ? "bg-yellow-500" : "bg-blue-400"
                            )}
                            style={{ width: `${lead.score}%` }}
                          />
                        </div>
                        <span className={cn(
                          "text-sm font-bold tabular-nums",
                          lead.score >= 76 ? "text-green-600" : lead.score >= 51 ? "text-orange-600" : lead.score >= 26 ? "text-yellow-600" : "text-blue-500"
                        )}>
                          {lead.score}
                        </span>
                      </div>
                      {/* Milestone badge */}
                      {scoreBreakdown?.milestone && (() => {
                        const milestoneColorMap: Record<string, string> = {
                          blue:   "bg-blue-50 text-blue-700 border-blue-200",
                          yellow: "bg-yellow-50 text-yellow-700 border-yellow-200",
                          orange: "bg-orange-50 text-orange-700 border-orange-200",
                          green:  "bg-green-50 text-green-700 border-green-200",
                          red:    "bg-red-50 text-red-700 border-red-200",
                          purple: "bg-purple-50 text-purple-700 border-purple-200",
                          gray:   "bg-gray-50 text-gray-600 border-gray-200",
                        };
                        const cls = milestoneColorMap[scoreBreakdown.milestone.color] ?? milestoneColorMap.gray;
                        return (
                          <span className={cn("inline-block text-xs px-2 py-0.5 rounded-full border font-medium mb-1.5", cls)}>
                            {scoreBreakdown.milestone.label}
                          </span>
                        );
                      })()}
                      {/* Score breakdown by category */}
                      {scoreBreakdown?.breakdown && (
                        <div className="grid grid-cols-2 gap-1">
                          {[
                            { label: "Activities", val: scoreBreakdown.breakdown.activity },
                            { label: "Profile",    val: scoreBreakdown.breakdown.field },
                            { label: "Signals",    val: scoreBreakdown.breakdown.qualification },
                            { label: "Company/Rev", val: (scoreBreakdown.breakdown.companySize ?? 0) + (scoreBreakdown.breakdown.revenue ?? 0) },
                          ].filter(x => x.val > 0).map(x => (
                            <div key={x.label} className="flex items-center justify-between px-2 py-0.5 rounded bg-muted/50 text-xs">
                              <span className="text-muted-foreground">{x.label}</span>
                              <span className="font-semibold text-foreground">+{x.val}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {lead.description && (
                    <div className="py-2">
                      <div className="text-xs text-muted-foreground mb-1">Description</div>
                      <p className="text-sm text-foreground leading-relaxed">{lead.description}</p>
                    </div>
                  )}
                </>
              )}
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

          {/* Right column — AI Insights + Summary */}
          <div className="lg:col-span-2 flex flex-col gap-3">
            <LeadInsightsPanel
              leadId={lead.id}
              currentScore={lead.score}
              buyerClassification={lead.buyerClassification}
              insightsGeneratedAt={lead.insightsGeneratedAt}
              onConvertClick={!lead.isConverted ? () => setIsConvertOpen(true) : undefined}
              isConverted={lead.isConverted}
            />
            <AISummary entityType="lead" entityData={lead as unknown as Record<string, unknown>} />
            <AINextActions entityType="lead" entityId={lead.id} />
          </div>
        </div>

        {/* Related Tabs — top level, full width */}
        <div className="bg-card border border-border rounded-md shadow-sm overflow-hidden">
          {/* Tab headers */}
          <div className="flex border-b border-border bg-muted/30">
            {[
              { key: "activities", label: "Activities", count: activities.length },
              { key: "actions", label: "Actions", count: activities.filter((a) => a.type === "task").length },
              { key: "contacts", label: "Contacts", count: linkedContacts.length || (lead.convertedContactId ? 1 : 0) },
              { key: "accounts", label: "Accounts", count: lead.convertedAccountId ? 1 : 0 },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setRelatedTab(tab.key as "activities" | "actions" | "contacts" | "accounts")}
                className={cn(
                  "px-3 py-1 text-xs font-semibold uppercase tracking-wide transition-colors flex items-center gap-1.5",
                  relatedTab === tab.key
                    ? "text-primary border-b-2 border-primary bg-card"
                    : "bg-sky-100 text-sky-700 hover:bg-sky-200"
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
              <div className="px-2 py-1 border-b border-border bg-muted/10">
                <div className="flex gap-2 mb-2 flex-wrap">
                  {[
                    { key: "note", label: "Note", icon: MessageSquare },
                    { key: "call", label: "Call", icon: Phone },
                    { key: "meeting", label: "Meeting", icon: Users },
                    { key: "task", label: "Task", icon: CheckSquare },
                    { key: "email", label: "Email", icon: Mail },
                  ].map(({ key, label, icon: BtnIcon }) => (
                    <button
                      key={key}
                      onClick={() => {
                        if (key === "email") { setIsEmailOpen(true); return; }
                        setActivityType(key);
                      }}
                      className={cn(
                        "flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                        activityType === key
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted/50 text-muted-foreground hover:bg-muted"
                      )}
                    >
                      <BtnIcon className="w-3 h-3" /> {label}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Textarea
                    placeholder={activityType === "note" ? "Add a note or comment..." : `Log a ${activityType}...`}
                    className="h-8 text-sm resize-none flex-1 min-h-[36px]"
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void handleAddActivity(); } }}
                  />
                  <Button size="sm" className="h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => void handleAddActivity()} disabled={isAddingNote || !newNote.trim()}>
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
              <div className="divide-y divide-border max-h-80 overflow-y-auto">
                {activities.length === 0 ? (
                  <div className="px-4 py-10 text-center">
                    <Activity className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">
                      No activities yet. Log a note, call, or meeting above.
                    </p>
                    <Button size="sm" variant="outline" className="mt-3 text-xs" onClick={() => setIsEmailOpen(true)}>
                      <Mail className="w-3.5 h-3.5 mr-1.5" /> Log an email
                    </Button>
                  </div>
                ) : (
                  (() => {
                    // Build a thread tree so replies render nested under their parent
                    // outbound email instead of as flat sibling rows. Match by
                    // normalised subject — strip "Reply:"/"Email:" prefixes added by
                    // the inbound processor and any "Re:"/"Fwd:" etc. from the wire,
                    // then pick the most recent prior email activity that matches.
                    const normSubject = (s: string) =>
                      s
                        .replace(/^(Reply|Email):\s*/i, "")
                        .replace(/^((re|fwd?|aw|sv|tr)\s*:\s*)+/i, "")
                        .trim()
                        .toLowerCase();
                    const emailActs = activities
                      .filter((x) => x.type === "email")
                      .slice()
                      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
                    const parentOf = new Map<number, number>();
                    // Match each reply to the most recent prior NON-reply email
                    // with the same normalised subject. Constraining the parent
                    // to a non-reply guarantees every reply in a chain
                    // (O1 → R1 → R2 …) anchors on the same outbound root, so
                    // siblings render together and none get dropped.
                    for (let i = 0; i < emailActs.length; i++) {
                      const cur = emailActs[i];
                      if (!/^Reply:/i.test(cur.subject)) continue;
                      const target = normSubject(cur.subject);
                      for (let j = i - 1; j >= 0; j--) {
                        const cand = emailActs[j];
                        if (/^Reply:/i.test(cand.subject)) continue;
                        if (normSubject(cand.subject) === target) {
                          parentOf.set(cur.id, cand.id);
                          break;
                        }
                      }
                    }
                    const childrenOf = new Map<number, typeof emailActs>();
                    parentOf.forEach((parentId, childId) => {
                      const child = emailActs.find((x) => x.id === childId);
                      if (!child) return;
                      const arr = childrenOf.get(parentId) ?? [];
                      arr.push(child);
                      childrenOf.set(parentId, arr);
                    });

                    // Render newest-first so a freshly sent email shows at the
                    // TOP of the timeline (not buried below older threads).
                    // For each parent we still render its children right after
                    // it so threads stay grouped — children inherit the parent
                    // thread's position regardless of their own timestamps.
                    const visible = [...activities]
                      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      .slice(0, 15);
                    const visibleIds = new Set(visible.map((v) => v.id));
                    const flat: { act: typeof visible[number]; depth: number; childCount: number }[] = [];
                    for (const act of visible) {
                      const parentId = parentOf.get(act.id);
                      if (parentId != null && visibleIds.has(parentId)) continue;
                      const kids = childrenOf.get(act.id) ?? [];
                      flat.push({ act, depth: 0, childCount: kids.length });
                      if (!collapsedThreads.has(act.id)) {
                        // Render children newest-first under each parent too,
                        // so the most recent reply sits closest to the parent
                        // row and older replies trail below it.
                        const orderedKids = [...kids].sort(
                          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
                        );
                        for (const k of orderedKids) flat.push({ act: k, depth: 1, childCount: 0 });
                      }
                    }

                    return flat.map(({ act, depth, childCount }) => {
                    const Icon = ACTIVITY_ICONS[act.type] ?? Activity;
                    const isEmail = act.type === "email";
                    const isReply = depth > 0;
                    // Inbound emails are stamped with "Reply:" or "Email:" subject
                    // prefixes by the inbound processor (see api-server email-sync).
                    const isInbound = isEmail && /^(Reply|Email):/i.test(act.subject);
                    const hasThread = isEmail && childCount > 0;
                    const isCollapsed = collapsedThreads.has(act.id);
                    const onActivityClick = isEmail
                      ? () => { setViewerActivityId(act.id); setViewerOpen(true); }
                      : undefined;
                    const toggleThread = (e: React.MouseEvent | React.KeyboardEvent) => {
                      e.stopPropagation();
                      setCollapsedThreads((prev) => {
                        const next = new Set(prev);
                        if (next.has(act.id)) next.delete(act.id);
                        else next.add(act.id);
                        return next;
                      });
                    };
                    const a = act as typeof act & {
                      emailOpenCount?: number | null;
                      emailLastOpenedAt?: string | null;
                      emailLastUserAgent?: string | null;
                    };
                    const opens = a.emailOpenCount ?? 0;
                    const ua = a.emailLastUserAgent ?? "";
                    // Gmail prefetches the tracking pixel ONCE and caches it forever, so the
                    // counter cannot grow past 1 for Gmail recipients regardless of how many
                    // times the message is reopened. Surface this honestly in the tooltip.
                    const isGmailProxy = /GoogleImageProxy|ggpht\.com/i.test(ua);
                    const opensTitle = isGmailProxy
                      ? `Recipient uses Gmail, which prefetches the open-tracking pixel once and caches it. Real open count is at least ${opens} — Gmail does not report subsequent opens.${a.emailLastOpenedAt ? ` First opened ${format(new Date(a.emailLastOpenedAt), "MMM d, HH:mm")}.` : ""}`
                      : a.emailLastOpenedAt
                        ? `Last opened ${format(new Date(a.emailLastOpenedAt), "MMM d, HH:mm")}`
                        : "";
                    const badgeLabel = isEmail && (act.status === "completed" || act.status === "sent")
                      ? (isInbound ? "Received" : "Sent")
                      : act.status;
                    return (
                      <div
                        key={act.id}
                        className={cn(
                          "px-2 py-1 flex items-start gap-3 hover:bg-muted/20 transition-colors",
                          isEmail && "cursor-pointer hover:bg-primary/5",
                          isReply && "ml-7 border-l-2 border-primary/30 pl-3 bg-muted/10",
                        )}
                        onClick={onActivityClick}
                        role={isEmail ? "button" : undefined}
                        tabIndex={isEmail ? 0 : undefined}
                        onKeyDown={isEmail ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onActivityClick?.(); } } : undefined}
                        title={isEmail ? "Click to read full email" : undefined}
                      >
                        {hasThread ? (
                          <button
                            type="button"
                            onClick={toggleThread}
                            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleThread(e); } }}
                            className="w-4 h-7 flex items-center justify-center flex-shrink-0 mt-0.5 text-muted-foreground hover:text-foreground"
                            aria-label={isCollapsed ? `Show ${childCount} repl${childCount === 1 ? "y" : "ies"}` : "Hide replies"}
                            title={isCollapsed ? `Show ${childCount} repl${childCount === 1 ? "y" : "ies"}` : "Hide replies"}
                          >
                            {isCollapsed
                              ? <ChevronRight className="w-3.5 h-3.5" />
                              : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        ) : (
                          <div className="w-4 flex-shrink-0" aria-hidden />
                        )}
                        <div className={cn(
                          "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                          isReply ? "bg-blue-100 text-blue-700" : "bg-primary/10 text-primary",
                        )}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-sm font-medium text-foreground flex items-center gap-1.5">
                              {isReply && (
                                <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200 px-1.5 py-0">
                                  Reply
                                </Badge>
                              )}
                              <span className="truncate">{act.subject}</span>
                            </span>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {isEmail && opens > 0 && (
                                <Badge
                                  variant="outline"
                                  className="text-xs bg-blue-50 text-blue-700 border-blue-200"
                                  title={opensTitle}
                                >
                                  Opened {opens}{isGmailProxy ? "+" : ""}×
                                </Badge>
                              )}
                              {isEmail && opens === 0 && (act.status === "completed" || act.status === "sent") && (
                                <Badge variant="outline" className="text-xs bg-slate-50 text-slate-600 border-slate-200">
                                  Not yet opened
                                </Badge>
                              )}
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-xs capitalize",
                                  isEmail
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : act.status === "completed"
                                    ? "bg-green-50 text-green-700 border-green-200"
                                    : "bg-blue-50 text-blue-700 border-blue-200"
                                )}
                              >
                                {badgeLabel}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-muted-foreground capitalize">{act.type}</span>
                            {act.dueDate && (
                              <span className="text-xs text-muted-foreground">
                                · {format(new Date(act.dueDate), "MMM d")}
                              </span>
                            )}
                            {isEmail && act.completedAt && (
                              <span className="text-xs text-muted-foreground">
                                · sent {format(new Date(act.completedAt), "MMM d, HH:mm")}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                    });
                  })()
                )}
              </div>
            </div>
          )}

          {/* Actions tab — task-type activities only. Auto-populated by the
              backend (paired tasks from outbound/inbound emails) plus manual
              entries added inline below. */}
          {relatedTab === "actions" && (
            <div>
              {/* Quick-add row. Title required; due date optional (defaults to
                  +1 day so the task lands in tomorrow's queue, matching the
                  inbound-email behaviour). Assigned to the lead owner. */}
              <div className="px-3 py-2 border-b border-border bg-muted/10 flex items-center gap-2">
                <Input
                  value={newActionTitle}
                  onChange={(e) => setNewActionTitle(e.target.value)}
                  placeholder="Add a new action item…"
                  className="h-8 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newActionTitle.trim() && !createActivity.isPending) {
                      e.preventDefault();
                      const due = newActionDue
                        ? new Date(newActionDue)
                        : new Date(Date.now() + 24 * 60 * 60 * 1000);
                      createActivity.mutate(
                        {
                          data: {
                            type: "task",
                            subject: newActionTitle.trim(),
                            status: "pending",
                            dueDate: due.toISOString() as unknown as Date,
                            leadId: lead.id,
                            assignedTo: lead.assignedTo ?? currentUser?.id ?? undefined,
                          } as unknown as Parameters<typeof createActivity.mutate>[0]["data"],
                        },
                        {
                          onSuccess: () => {
                            setNewActionTitle("");
                            setNewActionDue("");
                            queryClient.invalidateQueries({ queryKey: ["lead-activities", id] });
                          },
                        },
                      );
                    }
                  }}
                />
                <Input
                  type="date"
                  value={newActionDue}
                  onChange={(e) => setNewActionDue(e.target.value)}
                  className="h-8 text-sm w-36"
                  title="Due date (optional)"
                />
                <Button
                  size="sm"
                  disabled={!newActionTitle.trim() || createActivity.isPending}
                  onClick={() => {
                    const due = newActionDue
                      ? new Date(newActionDue)
                      : new Date(Date.now() + 24 * 60 * 60 * 1000);
                    createActivity.mutate(
                      {
                        data: {
                          type: "task",
                          subject: newActionTitle.trim(),
                          status: "pending",
                          dueDate: due.toISOString() as unknown as Date,
                          leadId: lead.id,
                          assignedTo: lead.assignedTo ?? currentUser?.id ?? undefined,
                        } as unknown as Parameters<typeof createActivity.mutate>[0]["data"],
                      },
                      {
                        onSuccess: () => {
                          setNewActionTitle("");
                          setNewActionDue("");
                          queryClient.invalidateQueries({ queryKey: ["lead-activities", id] });
                        },
                      },
                    );
                  }}
                  className="h-8 text-xs"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add
                </Button>
              </div>

              {/* Task list */}
              {(() => {
                const tasks = activities.filter((a) => a.type === "task");
                if (tasks.length === 0) {
                  return (
                    <div className="text-center py-8 px-4">
                      <CheckSquare className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
                      <p className="text-sm text-muted-foreground">
                        No action items yet. Add one above, or send/receive an email — a task will be created automatically.
                      </p>
                    </div>
                  );
                }
                // Open tasks first (by due date asc), completed tasks at the bottom (most recent first).
                const open = tasks.filter((t) => t.status !== "completed").sort((a, b) => {
                  const da = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
                  const dbt = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
                  return da - dbt;
                });
                const done = tasks.filter((t) => t.status === "completed").sort((a, b) => {
                  const ca = a.completedAt ? new Date(a.completedAt).getTime() : 0;
                  const cb = b.completedAt ? new Date(b.completedAt).getTime() : 0;
                  return cb - ca;
                });
                const ordered = [...open, ...done];
                const now = Date.now();
                return (
                  <div className="divide-y divide-border">
                    {ordered.map((t) => {
                      const isDone = t.status === "completed";
                      const overdue = !isDone && t.dueDate && new Date(t.dueDate).getTime() < now;
                      const toggle = () => {
                        updateActivity.mutate(
                          {
                            id: t.id,
                            data: isDone
                              ? ({ status: "pending", completedAt: null } as unknown as Parameters<typeof updateActivity.mutate>[0]["data"])
                              : ({ status: "completed", completedAt: new Date().toISOString() } as unknown as Parameters<typeof updateActivity.mutate>[0]["data"]),
                          },
                          { onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lead-activities", id] }) },
                        );
                      };
                      return (
                        <div key={t.id} className="flex items-start gap-3 px-3 py-2 hover:bg-muted/10">
                          <Checkbox checked={isDone} onCheckedChange={toggle} className="mt-1" aria-label={isDone ? "Mark as pending" : "Mark as completed"} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <span className={cn("text-sm font-medium", isDone ? "line-through text-muted-foreground" : "text-foreground")}>
                                {t.subject}
                              </span>
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[10px] capitalize flex-shrink-0",
                                  isDone
                                    ? "bg-green-50 text-green-700 border-green-200"
                                    : overdue
                                      ? "bg-red-50 text-red-700 border-red-200"
                                      : "bg-blue-50 text-blue-700 border-blue-200",
                                )}
                              >
                                {isDone ? "Done" : overdue ? "Overdue" : "Open"}
                              </Badge>
                            </div>
                            {(t as { description?: string | null }).description && (
                              <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                {(t as { description?: string | null }).description}
                              </div>
                            )}
                            <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                              {t.dueDate && (
                                <span className="inline-flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  Due {format(new Date(t.dueDate), "MMM d")}
                                </span>
                              )}
                              {(t as { assignedToName?: string | null }).assignedToName && (
                                <span className="inline-flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  {(t as { assignedToName?: string | null }).assignedToName}
                                </span>
                              )}
                              {isDone && t.completedAt && (
                                <span>Completed {format(new Date(t.completedAt), "MMM d, HH:mm")}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Contacts tab */}
          {relatedTab === "contacts" && (
            <div className="p-4">
              {linkedContacts.length > 0 ? (
                <div className="space-y-2">
                  {linkedContacts.map((contact) => (
                    <Link key={contact.id} href={`/contacts/${contact.id}`}>
                      <div className="flex items-center gap-3 p-3 rounded-md border border-border hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer group">
                        <div className="w-10 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold flex-shrink-0">
                          {contact.firstName?.[0] ?? ""}{contact.lastName?.[0] ?? ""}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-primary group-hover:underline transition-colors">
                            {contact.firstName} {contact.lastName}
                          </div>
                          {contact.title && <div className="text-xs text-muted-foreground">{contact.title}</div>}
                          {contact.email && (
                            <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Mail className="w-3 h-3" /> {contact.email}
                            </div>
                          )}
                        </div>
                        <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">Linked</Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : lead.convertedContactId && convertedContactData ? (
                <Link href={`/contacts/${lead.convertedContactId}`}>
                  <div className="flex items-center gap-3 p-3 rounded-md border border-border hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer group">
                    <div className="w-10 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold flex-shrink-0">
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
                    <div className="w-10 h-8 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
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

      {/* Email Viewer */}
      <EmailViewer
        activityId={viewerActivityId}
        open={viewerOpen}
        onOpenChange={(o) => { setViewerOpen(o); if (!o) setViewerActivityId(null); }}
      />

      {/* Convert Dialog */}
      <ConvertLeadDialog
        open={isConvertOpen}
        onOpenChange={setIsConvertOpen}
        lead={lead}
        isPending={convertMutation.isPending}
        onConvert={handleConvertSubmit}
      />

    </Layout>
  );
}

function ConvertLeadDialog({ open, onOpenChange, lead, isPending, onConvert }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  lead: LeadDetail;
  isPending: boolean;
  onConvert: (data: ConvertLeadInput) => void;
}) {
  const [accountMode, setAccountMode] = useState<"new" | "existing">("new");
  const [contactMode, setContactMode] = useState<"new" | "existing">("new");
  const [existingAccountId, setExistingAccountId] = useState<string>("");
  const [selectedContactIds, setSelectedContactIds] = useState<number[]>([]);
  const [oppName, setOppName] = useState("");
  const [createOpp, setCreateOpp] = useState(true);
  const [accountSearch, setAccountSearch] = useState("");
  const [contactSearch, setContactSearch] = useState("");

  const { data: accountsData } = useListAccounts({ limit: 100 });
  const { data: contactsData } = useListContacts({ limit: 100 });

  const fullName = `${lead.firstName} ${lead.lastName}`;

  React.useEffect(() => {
    if (open) {
      setAccountMode("new");
      setContactMode("new");
      setExistingAccountId("");
      setSelectedContactIds([]);
      setAccountSearch("");
      setContactSearch("");
      setOppName(`${fullName} Deal`);
      setCreateOpp(true);
    }
  }, [open, fullName]);

  const toggleContactId = (id: number) => {
    setSelectedContactIds((prev) =>
      prev.includes(id) ? prev.filter((cid) => cid !== id) : [...prev, id]
    );
  };

  const handleSubmit = () => {
    const data: ConvertLeadInput = {
      createOpportunity: createOpp,
      opportunityName: oppName || `${fullName} Deal`,
      opportunityAmount: 0,
      createAccount: accountMode === "existing" ? false : !!lead.company,
      createContact: contactMode === "existing" ? false : true,
      existingAccountId: accountMode === "existing" && existingAccountId ? parseInt(existingAccountId) : undefined,
      existingContactIds: contactMode === "existing" && selectedContactIds.length > 0 ? selectedContactIds : undefined,
    };

    onConvert(data);
  };

  interface AccountOption { id: number; name: string }
  interface ContactOption { id: number; firstName: string; lastName: string }
  const accounts: AccountOption[] = (accountsData?.data ?? []) as AccountOption[];
  const contacts: ContactOption[] = (contactsData?.data ?? []) as ContactOption[];
  const filteredAccounts = accountSearch
    ? accounts.filter((a) => a.name.toLowerCase().includes(accountSearch.toLowerCase()))
    : accounts;
  const filteredContacts = contactSearch
    ? contacts.filter((c) => `${c.firstName} ${c.lastName}`.toLowerCase().includes(contactSearch.toLowerCase()))
    : contacts;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="border-b border-border pb-3">
          <DialogTitle className="text-base font-semibold flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-primary" /> Convert Lead
          </DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Converting <strong className="text-foreground">{fullName}</strong>
          </p>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Account</Label>
            <div className="flex gap-2 mb-2">
              <Button
                type="button" size="sm" variant={accountMode === "new" ? "default" : "outline"}
                className="text-xs h-7 flex-1"
                onClick={() => setAccountMode("new")}
              >
                Create New
              </Button>
              <Button
                type="button" size="sm" variant={accountMode === "existing" ? "default" : "outline"}
                className="text-xs h-7 flex-1"
                onClick={() => setAccountMode("existing")}
              >
                Use Existing
              </Button>
            </div>
            {accountMode === "new" ? (
              <div className="flex items-center gap-2.5 p-2.5 rounded-md border border-border bg-muted/30">
                <Building2 className="w-4 h-4 text-primary flex-shrink-0" />
                <span className="text-sm text-foreground">{lead.company || "No company name"}</span>
              </div>
            ) : (
              <div className="space-y-1">
                <Input
                  placeholder="Search accounts..."
                  className="h-8 text-sm"
                  value={accountSearch}
                  onChange={(e) => { setAccountSearch(e.target.value); setExistingAccountId(""); }}
                />
                <div className="max-h-32 overflow-y-auto border border-border rounded-md bg-card">
                  {filteredAccounts.length === 0 ? (
                    <div className="px-3 py-1 text-xs text-muted-foreground">No accounts found</div>
                  ) : filteredAccounts.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      className={`w-full text-left px-3 py-1 text-sm hover:bg-primary/10 transition-colors ${
                        existingAccountId === String(a.id) ? "bg-primary/15 text-primary font-medium" : "text-foreground"
                      }`}
                      onClick={() => { setExistingAccountId(String(a.id)); setAccountSearch(a.name); }}
                    >
                      {a.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contact</Label>
            <div className="flex gap-2 mb-2">
              <Button
                type="button" size="sm" variant={contactMode === "new" ? "default" : "outline"}
                className="text-xs h-7 flex-1"
                onClick={() => setContactMode("new")}
              >
                Create New
              </Button>
              <Button
                type="button" size="sm" variant={contactMode === "existing" ? "default" : "outline"}
                className="text-xs h-7 flex-1"
                onClick={() => setContactMode("existing")}
              >
                Use Existing
              </Button>
            </div>
            {contactMode === "new" ? (
              <div className="flex items-center gap-2.5 p-2.5 rounded-md border border-border bg-muted/30">
                <User className="w-4 h-4 text-primary flex-shrink-0" />
                <span className="text-sm text-foreground">{fullName}</span>
              </div>
            ) : (
              <div className="space-y-1">
                <Input
                  placeholder="Search contacts..."
                  className="h-8 text-sm"
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                />
                {selectedContactIds.length > 0 && (
                  <p className="text-xs text-muted-foreground">{selectedContactIds.length} contact(s) selected</p>
                )}
                <div className="max-h-32 overflow-y-auto border border-border rounded-md bg-card">
                  {filteredContacts.length === 0 ? (
                    <div className="px-3 py-1 text-xs text-muted-foreground">No contacts found</div>
                  ) : filteredContacts.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className={`w-full text-left px-3 py-1 text-sm hover:bg-primary/10 transition-colors flex items-center gap-2 ${
                        selectedContactIds.includes(c.id) ? "bg-primary/15 text-primary font-medium" : "text-foreground"
                      }`}
                      onClick={() => toggleContactId(c.id)}
                    >
                      <input
                        type="checkbox"
                        checked={selectedContactIds.includes(c.id)}
                        readOnly
                        className="rounded border-border pointer-events-none"
                      />
                      {c.firstName} {c.lastName}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="createOpp"
                checked={createOpp}
                onChange={(e) => setCreateOpp(e.target.checked)}
                className="rounded border-border"
              />
              <Label htmlFor="createOpp" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground cursor-pointer">
                Create Opportunity
              </Label>
            </div>
            {createOpp && (
              <Input
                placeholder="Opportunity name"
                className="h-8 text-sm"
                value={oppName}
                onChange={(e) => setOppName(e.target.value)}
              />
            )}
          </div>

          <div className="p-3 rounded-md bg-amber-50 border border-amber-200">
            <p className="text-xs text-amber-700">
              The lead will be marked as <strong>converted</strong> and linked to the selected records.
            </p>
          </div>
        </div>
        <DialogFooter className="border-t border-border pt-3 gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={isPending || (accountMode === "existing" && !existingAccountId) || (contactMode === "existing" && selectedContactIds.length === 0)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {isPending ? "Converting..." : "Convert Lead"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

