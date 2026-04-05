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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AISummary } from "@/components/ai-summary";
import { EmailCompose } from "@/components/email-compose";
import {
  ArrowLeft, Mail, Phone, Building2, User, Calendar, Activity,
  CheckCircle2, Clock, ArrowRightLeft, Pencil, MapPin, DollarSign,
  Globe, Users, Briefcase, Star, Target, Send, ChevronDown, ChevronUp,
  TrendingUp,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
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

const PIPELINE_STAGES = [
  { key: "new", label: "New" },
  { key: "contacted", label: "Contacted" },
  { key: "qualified", label: "Qualified (Nurturing)" },
  { key: "unqualified", label: "Unqualified" },
  { key: "converted", label: "Converted" },
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
  note: Activity,
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

  const { data: activitiesData } = useQuery<{ data: LeadActivity[] }>({
    queryKey: ["lead-activities", id, lead?.convertedContactId],
    queryFn: async () => {
      const params = new URLSearchParams({ page: "1", limit: "20" });
      if (lead?.convertedContactId) params.set("contactId", String(lead.convertedContactId));
      const res = await fetch(`/api/activities?${params}`, { credentials: "include" });
      return res.json() as Promise<{ data: LeadActivity[] }>;
    },
    enabled: !!id,
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
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5 text-purple-600 border-purple-200 hover:bg-purple-50" onClick={() => setIsConvertOpen(true)}>
                  <ArrowRightLeft className="w-3.5 h-3.5" /> Convert
                </Button>
              )}
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={() => setIsEditOpen(true)}>
                <Pencil className="w-3.5 h-3.5" /> Edit
              </Button>
            </div>
          </div>

          {/* Pipeline Status Bar */}
          {!lead.isConverted && (
            <div className="px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-0 flex-1">
                {PIPELINE_STAGES.map((stage, i) => {
                  const isCompleted = i < currentStageIdx;
                  const isCurrent = stage.key === lead.status;
                  const isLast = i === PIPELINE_STAGES.length - 1;
                  return (
                    <React.Fragment key={stage.key}>
                      <button
                        onClick={() => handleStatusChange(stage.key)}
                        className={cn(
                          "flex-1 flex flex-col items-center gap-1 py-1.5 px-2 rounded transition-all text-center group relative",
                          isCurrent ? "bg-primary/5 border border-primary/20" : "hover:bg-muted/50"
                        )}
                        title={`Set status to ${stage.label}`}
                      >
                        <div className={cn(
                          "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all",
                          isCurrent ? "border-primary bg-primary" :
                          isCompleted ? "border-primary/50 bg-primary/20" :
                          "border-border bg-background"
                        )}>
                          {(isCurrent || isCompleted) && (
                            <div className={cn("w-1.5 h-1.5 rounded-full", isCurrent ? "bg-white" : "bg-primary/60")} />
                          )}
                        </div>
                        <span className={cn(
                          "text-[10px] font-medium leading-tight",
                          isCurrent ? "text-primary" :
                          isCompleted ? "text-primary/60" :
                          "text-muted-foreground"
                        )}>
                          {stage.label}
                        </span>
                      </button>
                      {!isLast && (
                        <div className={cn("h-0.5 w-4 flex-shrink-0", isCompleted ? "bg-primary/30" : "bg-border")} />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
              {currentStageIdx < PIPELINE_STAGES.length - 1 && (
                <Button
                  size="sm"
                  className="ml-4 h-7 text-xs bg-primary hover:bg-primary/90 text-white flex-shrink-0"
                  onClick={handleMarkComplete}
                  disabled={updateMutation.isPending}
                >
                  Mark Status as Complete
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
              <FieldRow label="Assigned To" value={lead.assignedToName ?? "Unassigned"} icon={User} />
              <FieldRow label="Created" value={format(new Date(lead.createdAt), "MMM d, yyyy")} icon={Calendar} />
              <FieldRow label="Last Updated" value={formatDistanceToNow(new Date(lead.updatedAt), { addSuffix: true })} icon={Clock} />
            </CollapsibleSection>
          </div>

          {/* Right column — AI Summary + Activities */}
          <div className="lg:col-span-2 flex flex-col gap-3">
            {/* AI Summary */}
            <AISummary entityType="lead" entityData={lead as unknown as Record<string, unknown>} />

            {/* Activity Feed */}
            <div className="bg-card border border-border rounded-md shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground uppercase tracking-wide">Activity</span>
                <Button size="sm" variant="ghost" className="h-6 text-xs text-primary hover:bg-primary/5 gap-1" onClick={() => setIsEmailOpen(true)}>
                  <Send className="w-3 h-3" /> New Email
                </Button>
              </div>
              <div className="divide-y divide-border">
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

  React.useEffect(() => {
    if (open) setForm({
      ...lead,
      assignedTo: lead.assignedTo?.toString() ?? "",
      score: lead.score?.toString() ?? "",
      annualRevenue: lead.annualRevenue?.toString() ?? "",
      employees: lead.employees?.toString() ?? "",
    });
  }, [open, lead]);

  const f = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm({ ...form, [field]: e.target.value });

  const sc = "w-full h-9 px-3 rounded-md bg-card border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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
              <Label className="text-xs font-medium">First Name</Label>
              <Input required className="h-9 text-sm" value={form.firstName} onChange={f("firstName")} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Last Name</Label>
              <Input required className="h-9 text-sm" value={form.lastName} onChange={f("lastName")} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Email</Label>
              <Input type="email" className="h-9 text-sm" value={form.email ?? ""} onChange={f("email")} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Phone</Label>
              <Input className="h-9 text-sm" value={form.phone ?? ""} onChange={f("phone")} />
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
