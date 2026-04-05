import React, { useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useUpdateLead, useConvertLead, getListLeadsQueryKey, useListUsers } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Globe, Users, Briefcase, Star, TrendingUp, Target, Send,
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

const STATUS_STEPS = ["new", "contacted", "qualified", "converted"];
const STATUS_COLORS: Record<string, string> = {
  new: "border-blue-500/30 bg-blue-500/10 text-blue-400",
  contacted: "border-purple-500/30 bg-purple-500/10 text-purple-400",
  qualified: "border-green-500/30 bg-green-500/10 text-green-400",
  unqualified: "border-red-500/30 bg-red-500/10 text-red-400",
  converted: "border-gray-500/30 bg-gray-500/10 text-gray-400",
};

const ACTIVITY_ICONS: Record<string, React.ElementType> = {
  call: Phone,
  email: Mail,
  meeting: Users,
  task: CheckCircle2,
  note: Activity,
  demo: Briefcase,
};

type Tab = "overview" | "activities" | "details";

export default function LeadDetail() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
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
    queryKey: ["lead-activities", id],
    queryFn: async () => {
      const res = await fetch(`/api/activities?page=1&limit=50`, { credentials: "include" });
      const json = await res.json() as { data: LeadActivity[] };
      return json;
    },
    enabled: !!id,
  });

  const updateMutation = useUpdateLead();
  const convertMutation = useConvertLead();

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
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

  const initials = `${lead.firstName[0] ?? ""}${lead.lastName[0] ?? ""}`.toUpperCase();
  const statusStepIdx = STATUS_STEPS.indexOf(lead.status);
  const fullName = `${lead.firstName} ${lead.lastName}`;

  const handleStatusChange = (newStatus: string) => {
    updateMutation.mutate({ id: lead.id, data: { ...lead, status: newStatus as "new" | "contacted" | "qualified" | "unqualified" | "converted" } }, {
      onSuccess: () => {
        toast({ title: "Status updated" });
        queryClient.invalidateQueries({ queryKey: ["lead", id] });
        queryClient.invalidateQueries({ queryKey: getListLeadsQueryKey() });
      },
    });
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

  const TABS: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "activities", label: `Activities (${activitiesData?.data?.length ?? 0})` },
    { id: "details", label: "Details" },
  ];

  return (
    <Layout>
      <div className="flex flex-col gap-5 max-w-5xl mx-auto">
        {/* Back */}
        <div>
          <Link href="/leads">
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground mb-3 hover:text-white">
              <ArrowLeft className="w-4 h-4" /> Back to Leads
            </Button>
          </Link>

          {/* Header Card */}
          <Card className="glass-panel border-white/5">
            <CardContent className="p-5">
              <div className="flex flex-col sm:flex-row items-start gap-5">
                {/* Avatar + Score */}
                <div className="flex flex-col items-center gap-2 shrink-0">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-primary/20">
                    {initials}
                  </div>
                  {lead.score != null && (
                    <div className={cn("flex flex-col items-center px-3 py-1.5 rounded-lg border text-xs font-bold",
                      lead.score >= 70 ? "border-green-500/30 bg-green-500/10 text-green-400" :
                      lead.score >= 40 ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-400" :
                      "border-red-500/30 bg-red-500/10 text-red-400"
                    )}>
                      <Star className="w-3 h-3 mb-0.5" />
                      <span>{lead.score}/100</span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-start gap-3 justify-between">
                    <div>
                      <h1 className="text-2xl font-bold text-white">{fullName}</h1>
                      {lead.title && <p className="text-muted-foreground mt-0.5 text-sm">{lead.title}{lead.company ? ` · ${lead.company}` : ""}</p>}
                    </div>
                    <Badge variant="outline" className={cn("capitalize shrink-0", STATUS_COLORS[lead.status] ?? "")}>
                      {lead.status}
                    </Badge>
                  </div>

                  {/* Contact row */}
                  <div className="flex flex-wrap gap-3 mt-3">
                    {lead.email && (
                      <a href={`mailto:${lead.email}`} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
                        <Mail className="w-3.5 h-3.5" /> {lead.email}
                      </a>
                    )}
                    {lead.phone && (
                      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Phone className="w-3.5 h-3.5" /> {lead.phone}
                      </span>
                    )}
                    {lead.company && (
                      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Building2 className="w-3.5 h-3.5" /> {lead.company}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 mt-4">
                    {lead.email && (
                      <Button size="sm" className="gap-1.5 bg-primary hover:bg-primary/90 text-white" onClick={() => setIsEmailOpen(true)}>
                        <Send className="w-3.5 h-3.5" /> Send Email
                      </Button>
                    )}
                    {!lead.isConverted && (
                      <Button size="sm" variant="outline" className="gap-1.5 border-accent/50 text-accent hover:bg-accent/10" onClick={() => setIsConvertOpen(true)}>
                        <ArrowRightLeft className="w-3.5 h-3.5" /> Convert Lead
                      </Button>
                    )}
                    <Button size="sm" variant="outline" className="gap-1.5 border-white/10" onClick={() => setIsEditOpen(true)}>
                      <Pencil className="w-3.5 h-3.5" /> Edit
                    </Button>
                  </div>
                </div>
              </div>

              {/* Stage Progress */}
              {!lead.isConverted && lead.status !== "unqualified" && (
                <div className="mt-5 pt-5 border-t border-white/5">
                  <div className="text-xs text-muted-foreground mb-2">Lead Lifecycle</div>
                  <div className="flex items-center gap-0">
                    {STATUS_STEPS.map((step, i) => {
                      const isCompleted = i < statusStepIdx;
                      const isCurrent = step === lead.status;
                      return (
                        <React.Fragment key={step}>
                          <button
                            onClick={() => handleStatusChange(step)}
                            className={cn(
                              "flex-1 py-1.5 text-xs font-medium transition-all rounded",
                              isCurrent ? "bg-primary text-white" :
                              isCompleted ? "bg-primary/20 text-primary/70" :
                              "bg-white/5 text-muted-foreground/50 hover:bg-white/10"
                            )}
                          >
                            {step === "new" ? "New" : step === "contacted" ? "Contacted" : step === "qualified" ? "Qualified" : "Converted"}
                          </button>
                          {i < STATUS_STEPS.length - 1 && (
                            <div className={cn("h-0.5 w-3", isCompleted ? "bg-primary/40" : "bg-white/5")} />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              )}

              {lead.isConverted && (
                <div className="mt-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                  <div className="text-sm text-green-400">
                    Lead converted ·&nbsp;
                    {lead.convertedOpportunityId && (
                      <Link href={`/opportunities/${lead.convertedOpportunityId}`}>
                        <span className="underline underline-offset-2 cursor-pointer">View Opportunity →</span>
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* AI Summary */}
        <AISummary entityType="lead" entityData={lead as unknown as Record<string, unknown>} />

        {/* Tabs */}
        <div className="flex gap-1 border-b border-white/5">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px",
                activeTab === tab.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-white"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="glass-panel border-white/5 p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Lead Score</p>
              <div className="flex items-end gap-2">
                <span className={cn("text-3xl font-bold", lead.score && lead.score >= 70 ? "text-green-400" : lead.score && lead.score >= 40 ? "text-yellow-400" : "text-rose-400")}>
                  {lead.score ?? "—"}
                </span>
                {lead.score != null && <span className="text-muted-foreground text-sm pb-1">/100</span>}
              </div>
              {lead.score != null && (
                <div className="mt-2 w-full bg-white/5 rounded-full h-1.5">
                  <div className={cn("h-1.5 rounded-full", lead.score >= 70 ? "bg-green-400" : lead.score >= 40 ? "bg-yellow-400" : "bg-rose-400")} style={{ width: `${lead.score}%` }} />
                </div>
              )}
            </Card>

            {lead.annualRevenue && (
              <Card className="glass-panel border-white/5 p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1"><DollarSign className="w-3 h-3" /> Annual Revenue</p>
                <p className="text-xl font-bold text-white">${lead.annualRevenue.toLocaleString()}</p>
              </Card>
            )}

            {lead.employees && (
              <Card className="glass-panel border-white/5 p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1"><Users className="w-3 h-3" /> Employees</p>
                <p className="text-xl font-bold text-white">{lead.employees.toLocaleString()}</p>
              </Card>
            )}

            <Card className="glass-panel border-white/5 p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1"><Target className="w-3 h-3" /> Source</p>
              <p className="text-sm text-white capitalize">{lead.source?.replace("_", " ") ?? "—"}</p>
            </Card>

            <Card className="glass-panel border-white/5 p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1"><User className="w-3 h-3" /> Assigned To</p>
              <p className="text-sm text-white">{lead.assignedToName ?? "Unassigned"}</p>
            </Card>

            <Card className="glass-panel border-white/5 p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" /> Created</p>
              <p className="text-sm text-white">{format(new Date(lead.createdAt), "MMM d, yyyy")}</p>
              <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true })}</p>
            </Card>
          </div>
        )}

        {/* Activities Tab */}
        {activeTab === "activities" && (
          <div className="flex flex-col gap-3">
            {!activitiesData?.data?.length ? (
              <div className="text-center py-12 text-muted-foreground">
                <Activity className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>No activities yet.</p>
                <Button size="sm" variant="outline" className="mt-3 border-white/10" onClick={() => setIsEmailOpen(true)}>
                  <Send className="w-3.5 h-3.5 mr-1.5" /> Send First Email
                </Button>
              </div>
            ) : (
              activitiesData.data.slice(0, 20).map((act) => {
                const Icon = ACTIVITY_ICONS[act.type] ?? Activity;
                return (
                  <Card key={act.id} className="glass-panel border-white/5 p-4 flex items-start gap-4">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-white text-sm">{act.subject}</span>
                        <Badge variant="outline" className={cn("capitalize text-xs", act.status === "completed" ? "border-green-500/30 text-green-400" : "border-blue-500/30 text-blue-400")}>
                          {act.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-muted-foreground capitalize">{act.type}</span>
                        {act.dueDate && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {format(new Date(act.dueDate), "MMM d, h:mm a")}
                          </span>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        )}

        {/* Details Tab */}
        {activeTab === "details" && (
          <Card className="glass-panel border-white/5 p-6">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
              {[
                { label: "First Name", value: lead.firstName },
                { label: "Last Name", value: lead.lastName },
                { label: "Email", value: lead.email },
                { label: "Phone", value: lead.phone },
                { label: "Company", value: lead.company },
                { label: "Title", value: lead.title },
                { label: "Industry", value: lead.industry },
                { label: "Employees", value: lead.employees?.toLocaleString() },
                { label: "Annual Revenue", value: lead.annualRevenue ? `$${lead.annualRevenue.toLocaleString()}` : null },
                { label: "Source", value: lead.source?.replace("_", " ") },
                { label: "Status", value: lead.status },
                { label: "Score", value: lead.score?.toString() },
                { label: "Assigned To", value: lead.assignedToName },
                { label: "Created", value: format(new Date(lead.createdAt), "MMM d, yyyy h:mm a") },
                { label: "Updated", value: format(new Date(lead.updatedAt), "MMM d, yyyy h:mm a") },
              ].map(({ label, value }) =>
                value ? (
                  <div key={label}>
                    <dt className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">{label}</dt>
                    <dd className="text-sm text-white capitalize">{value}</dd>
                  </div>
                ) : null
              )}
            </dl>
            {lead.description && (
              <div className="mt-6 pt-6 border-t border-white/5">
                <dt className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Notes / Description</dt>
                <dd className="text-sm text-muted-foreground leading-relaxed">{lead.description}</dd>
              </div>
            )}
          </Card>
        )}
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
        <DialogContent className="bg-card border-white/10 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-accent" /> Convert Lead
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-muted-foreground text-sm">
              Converting <strong className="text-white">{fullName}</strong> will automatically create:
            </p>
            <div className="space-y-2">
              {[
                { icon: User, label: "Contact record", desc: `${lead.firstName} ${lead.lastName}` },
                lead.company ? { icon: Building2, label: "Account record", desc: lead.company } : null,
                { icon: Briefcase, label: "Opportunity", desc: `${fullName} Deal — Prospecting stage` },
              ].filter(Boolean).map((item, i) => {
                const ItemIcon = item!.icon;
                return (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <ItemIcon className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{item!.label}</p>
                      <p className="text-xs text-muted-foreground">{item!.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConvertOpen(false)} className="border-white/10">Cancel</Button>
            <Button onClick={handleConvert} disabled={convertMutation.isPending} className="bg-accent hover:bg-accent/90 gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              {convertMutation.isPending ? "Converting..." : "Convert Now"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <LeadEditDialog open={isEditOpen} onOpenChange={setIsEditOpen} lead={lead} onSaved={() => queryClient.invalidateQueries({ queryKey: ["lead", id] })} />
    </Layout>
  );
}

function LeadEditDialog({ open, onOpenChange, lead, onSaved }: {
  open: boolean; onOpenChange: (v: boolean) => void; lead: LeadDetail; onSaved: () => void;
}) {
  const { toast } = useToast();
  const { data: usersData } = useListUsers({ limit: 50 });
  const updateMutation = useUpdateLead();
  const [form, setForm] = useState({ ...lead, assignedTo: lead.assignedTo?.toString() ?? "", score: lead.score?.toString() ?? "", annualRevenue: lead.annualRevenue?.toString() ?? "", employees: lead.employees?.toString() ?? "" });

  React.useEffect(() => {
    if (open) setForm({ ...lead, assignedTo: lead.assignedTo?.toString() ?? "", score: lead.score?.toString() ?? "", annualRevenue: lead.annualRevenue?.toString() ?? "", employees: lead.employees?.toString() ?? "" });
  }, [open, lead]);

  const f = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [field]: e.target.value });
  const sc = "w-full h-9 px-3 rounded-md bg-black/20 border border-white/10 text-white text-sm";

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
      <DialogContent className="bg-card border-white/10 text-white sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Edit Lead</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-xs">First Name</Label><Input required className="bg-black/20 border-white/10 h-9" value={form.firstName} onChange={f("firstName")} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Last Name</Label><Input required className="bg-black/20 border-white/10 h-9" value={form.lastName} onChange={f("lastName")} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-xs">Email</Label><Input type="email" className="bg-black/20 border-white/10 h-9" value={form.email ?? ""} onChange={f("email")} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Phone</Label><Input className="bg-black/20 border-white/10 h-9" value={form.phone ?? ""} onChange={f("phone")} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-xs">Company</Label><Input className="bg-black/20 border-white/10 h-9" value={form.company ?? ""} onChange={f("company")} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Title</Label><Input className="bg-black/20 border-white/10 h-9" value={form.title ?? ""} onChange={f("title")} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-xs">Status</Label>
              <select className={sc} value={form.status} onChange={f("status")}>
                {["new","contacted","qualified","unqualified"].map(s => <option key={s} value={s} className="bg-card capitalize">{s}</option>)}
              </select>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Source</Label>
              <select className={sc} value={form.source ?? ""} onChange={f("source")}>
                <option value="">—</option>
                {["website","referral","linkedin","email_campaign","trade_show","cold_call","other"].map(s => <option key={s} value={s} className="bg-card">{s.replace("_"," ")}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-xs">Score (0–100)</Label><Input type="number" min="0" max="100" className="bg-black/20 border-white/10 h-9" value={form.score} onChange={f("score")} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Assigned To</Label>
              <select className={sc} value={form.assignedTo} onChange={f("assignedTo")}>
                <option value="">Unassigned</option>
                {usersData?.data?.map(u => <option key={u.id} value={u.id} className="bg-card">{u.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-xs">Industry</Label><Input className="bg-black/20 border-white/10 h-9" value={form.industry ?? ""} onChange={f("industry")} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Employees</Label><Input type="number" className="bg-black/20 border-white/10 h-9" value={form.employees} onChange={f("employees")} /></div>
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="border-white/10">Cancel</Button>
            <Button type="submit" disabled={updateMutation.isPending} className="bg-primary hover:bg-primary/90 text-white">
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
