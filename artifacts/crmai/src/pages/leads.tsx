import React, { useState } from "react";
import {
  useListLeads, useCreateLead, useUpdateLead, useDeleteLead,
  useConvertLead, useListUsers, getListLeadsQueryKey, CreateLeadInputStatus,
  useListAccounts, useListContacts, type ConvertLeadInput,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/auth";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import {
  Search, Plus, ArrowRightLeft, MoreHorizontal, Pencil, Trash2, ExternalLink,
  ChevronDown, Filter, Mail, UserCheck, Upload, ListFilter,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { EmailCompose } from "@/components/email-compose";

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-50 text-blue-700 border-blue-200",
  contacted: "bg-purple-50 text-purple-700 border-purple-200",
  qualified: "bg-green-50 text-green-700 border-green-200",
  unqualified: "bg-red-50 text-red-700 border-red-200",
  converted: "bg-gray-100 text-gray-600 border-gray-200",
};

const SCORE_COLORS = (score: number) =>
  score >= 80 ? "bg-green-100 text-green-700 border-green-200" :
  score >= 50 ? "bg-yellow-100 text-yellow-700 border-yellow-200" :
  "bg-red-100 text-red-700 border-red-200";

const VIEW_OPTIONS = [
  { label: "All Open Leads", value: "" },
  { label: "My Leads", value: "my" },
  { label: "Recently Viewed", value: "recent" },
  { label: "Converted Leads", value: "converted" },
];

interface LeadFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  title: string;
  source: string;
  status: string;
  assignedTo: string;
  score: string;
  industry: string;
  employees: string;
  annualRevenue: string;
  description: string;
}

const defaultFormData: LeadFormData = {
  firstName: "", lastName: "", email: "", phone: "", company: "", title: "",
  source: "", status: "new", assignedTo: "", score: "",
  industry: "", employees: "", annualRevenue: "", description: "",
};

export default function Leads() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [activeView, setActiveView] = useState(VIEW_OPTIONS[0]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<{ id: number } & LeadFormData | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [convertingId, setConvertingId] = useState<{ id: number; name: string; company?: string | null } | null>(null);
  const [emailOpen, setEmailOpen] = useState(false);
  const { data, isLoading } = useListLeads({ search, limit: 200 });

  const allLeads = data?.data ?? [];

  const leads = allLeads.filter((lead) => {
    if (statusFilter && lead.status !== statusFilter) return false;
    if (activeView.value === "converted") return lead.isConverted;
    if (activeView.value === "my") return lead.assignedTo === user?.id;
    if (activeView.value === "recent") return true;
    return !lead.isConverted;
  });

  const total = leads.length;

  return (
    <Layout>
      <div className="flex flex-col gap-0">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-foreground">Leads</h1>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors border-b border-primary/40 pb-0.5">
                  {activeView.label}
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-52">
                {VIEW_OPTIONS.map((v) => (
                  <DropdownMenuItem
                    key={v.value}
                    onClick={() => setActiveView(v)}
                    className={`cursor-pointer text-sm ${activeView.value === v.value ? "text-primary font-medium" : ""}`}
                  >
                    {v.label}
                    {v.value === "" && <span className="ml-auto text-xs text-muted-foreground">Pinned</span>}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs gap-1.5"
              onClick={() => setEmailOpen(true)}
            >
              <Mail className="w-3.5 h-3.5" /> Send Email
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs gap-1.5"
            >
              <UserCheck className="w-3.5 h-3.5" /> Change Owner
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5 bg-primary hover:bg-primary/90 text-white shadow-sm"
              onClick={() => setIsCreateOpen(true)}
            >
              <Plus className="w-3.5 h-3.5" /> New
            </Button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2 mb-2">
          <div className="relative flex-shrink-0">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-muted-foreground" />
            <Input
              placeholder="Search leads..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs w-60 bg-card border-border"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                <ListFilter className="w-3.5 h-3.5" />
                {statusFilter ? statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1) : "Status"}
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuItem onClick={() => setStatusFilter("")} className="text-sm cursor-pointer">
                All Statuses
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {["new", "contacted", "qualified", "unqualified"].map((s) => (
                <DropdownMenuItem
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`text-sm cursor-pointer capitalize ${statusFilter === s ? "text-primary font-medium" : ""}`}
                >
                  {s}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="flex-1" />
          <span className="text-xs text-muted-foreground">{total} item{total !== 1 ? "s" : ""}</span>
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-md overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Name</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Company</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Phone</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Email</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Lead Status</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground">Score</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Created Date</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Owner</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground text-sm">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                        Loading leads...
                      </div>
                    </td>
                  </tr>
                ) : leads.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center">
                      <div className="text-muted-foreground text-sm mb-3">No leads found.</div>
                      <Button size="sm" onClick={() => setIsCreateOpen(true)} className="bg-primary hover:bg-primary/90 text-white">
                        <Plus className="w-3.5 h-3.5 mr-1.5" /> Create your first lead
                      </Button>
                    </td>
                  </tr>
                ) : (
                  leads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-muted/30 transition-colors group">
                      <td className="px-4 py-2.5">
                        <Link href={`/leads/${lead.id}`}>
                          <div className="font-medium text-primary hover:text-primary/80 cursor-pointer flex items-center gap-1">
                            {lead.firstName} {lead.lastName}
                            <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity" />
                          </div>
                        </Link>
                        {lead.isConverted && (
                          <span className="text-xs text-muted-foreground italic">Converted</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-sm text-foreground">{lead.company ?? <span className="text-muted-foreground">—</span>}</td>
                      <td className="px-4 py-2.5 text-sm text-foreground">{lead.phone ?? <span className="text-muted-foreground">—</span>}</td>
                      <td className="px-4 py-2.5 text-sm text-foreground">{lead.email ?? <span className="text-muted-foreground">—</span>}</td>
                      <td className="px-4 py-2.5">
                        <Badge variant="outline" className={`text-xs capitalize font-medium border ${STATUS_COLORS[lead.status] ?? ""}`}>
                          {lead.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {lead.score != null ? (
                          <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full border text-xs font-bold ${SCORE_COLORS(lead.score)}`}>
                            {lead.score}
                          </span>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">
                        {lead.createdAt ? format(new Date(lead.createdAt), "MMM d, yyyy") : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">
                        {lead.assignedToName ?? <span className="italic">Unassigned</span>}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!lead.isConverted && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs text-primary hover:bg-primary/5"
                              onClick={() => setConvertingId({ id: lead.id, name: `${lead.firstName} ${lead.lastName}`, company: lead.company })}
                            >
                              <ArrowRightLeft className="w-3 h-3 mr-1" /> Convert
                            </Button>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                                <MoreHorizontal className="w-3.5 h-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuItem
                                onClick={() => setEditingLead({
                                  id: lead.id,
                                  firstName: lead.firstName,
                                  lastName: lead.lastName,
                                  email: lead.email ?? "",
                                  phone: lead.phone ?? "",
                                  company: lead.company ?? "",
                                  title: lead.title ?? "",
                                  source: lead.source ?? "",
                                  status: lead.status,
                                  assignedTo: (lead.assignedTo?.toString()) ?? "",
                                  score: (lead.score?.toString()) ?? "",
                                  industry: lead.industry ?? "",
                                  employees: (lead.employees ?? "").toString(),
                                  annualRevenue: (lead.annualRevenue ?? "").toString(),
                                  description: lead.description ?? "",
                                })}
                                className="cursor-pointer text-sm"
                              >
                                <Pencil className="w-3.5 h-3.5 mr-2 text-muted-foreground" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setDeletingId(lead.id)}
                                className="cursor-pointer text-sm text-destructive focus:text-destructive"
                              >
                                <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          {leads.length > 0 && (
            <div className="px-4 py-2 border-t border-border bg-muted/20 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{total} record{total !== 1 ? "s" : ""}</span>
              <span className="text-xs text-muted-foreground">Showing all {total} leads</span>
            </div>
          )}
        </div>
      </div>

      <LeadFormDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} mode="create" />
      <LeadFormDialog
        open={!!editingLead}
        onOpenChange={(o) => { if (!o) setEditingLead(null); }}
        mode="edit"
        initialData={editingLead ?? undefined}
      />
      <ConvertLeadDialog
        open={!!convertingId}
        onOpenChange={(o) => { if (!o) setConvertingId(null); }}
        lead={convertingId ?? undefined}
      />
      <EmailCompose
        open={emailOpen}
        onOpenChange={setEmailOpen}
        defaultSubject="Reaching out from arbormind.in"
      />
      <AlertDialog open={deletingId !== null} onOpenChange={(o) => { if (!o) setDeletingId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lead?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <DeleteLeadAction id={deletingId} onDone={() => setDeletingId(null)} />
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}

function DeleteLeadAction({ id, onDone }: { id: number | null; onDone: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const deleteMutation = useDeleteLead();

  return (
    <AlertDialogAction
      onClick={() => {
        if (id === null) return;
        deleteMutation.mutate({ id }, {
          onSuccess: () => {
            toast({ title: "Lead deleted" });
            queryClient.invalidateQueries({ queryKey: getListLeadsQueryKey() });
            onDone();
          },
          onError: () => toast({ title: "Error", description: "Failed to delete lead.", variant: "destructive" }),
        });
      }}
      className="bg-destructive hover:bg-destructive/90 text-white"
    >
      Delete
    </AlertDialogAction>
  );
}

function LeadFormDialog({
  open, onOpenChange, mode, initialData,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  initialData?: { id: number } & LeadFormData;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createMutation = useCreateLead();
  const updateMutation = useUpdateLead();
  const { data: usersData } = useListUsers({ limit: 50 });
  const [formData, setFormData] = useState<LeadFormData>(initialData ?? defaultFormData);

  React.useEffect(() => {
    if (open) setFormData(initialData ?? defaultFormData);
  }, [open, initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      status: formData.status as CreateLeadInputStatus,
      assignedTo: formData.assignedTo ? parseInt(formData.assignedTo) : undefined,
      score: formData.score ? parseInt(formData.score) : undefined,
      employees: formData.employees ? parseInt(formData.employees) : undefined,
      annualRevenue: formData.annualRevenue ? parseFloat(formData.annualRevenue.replace(/[^0-9.]/g, "")) : undefined,
      title: formData.title || undefined,
      industry: formData.industry || undefined,
      description: formData.description || undefined,
    };
    const invalidate = () => queryClient.invalidateQueries({ queryKey: getListLeadsQueryKey() });
    if (mode === "create") {
      createMutation.mutate({ data: payload }, {
        onSuccess: () => { toast({ title: "Lead created" }); invalidate(); onOpenChange(false); },
        onError: () => toast({ title: "Error", description: "Failed to create lead.", variant: "destructive" }),
      });
    } else if (initialData) {
      updateMutation.mutate({ id: initialData.id, data: payload }, {
        onSuccess: () => { toast({ title: "Lead updated" }); invalidate(); onOpenChange(false); },
        onError: () => toast({ title: "Error", description: "Failed to update lead.", variant: "destructive" }),
      });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;
  const f = (field: keyof LeadFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setFormData({ ...formData, [field]: e.target.value });

  const selectClass = "w-full bg-card border border-border rounded-md px-3 py-2 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b border-border pb-3">
          <DialogTitle className="text-base font-semibold">
            {mode === "create" ? "New Lead" : "Edit Lead"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-3">
          {/* About section */}
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/40 -mx-6 px-6 py-2 border-y border-border">
            About
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium">Lead Status</Label>
            <select className={selectClass} value={formData.status} onChange={f("status")}>
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="qualified">Qualified</option>
              <option value="unqualified">Unqualified</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs font-medium">First Name *</Label>
              <Input required value={formData.firstName} onChange={f("firstName")} className="h-9 text-sm" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">Last Name *</Label>
              <Input required value={formData.lastName} onChange={f("lastName")} className="h-9 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs font-medium">Company</Label>
              <Input value={formData.company} onChange={f("company")} className="h-9 text-sm" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">Title</Label>
              <Input value={formData.title} onChange={f("title")} placeholder="e.g. VP of Sales" className="h-9 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs font-medium">Industry</Label>
              <select className={selectClass} value={formData.industry} onChange={f("industry")}>
                <option value="">—None—</option>
                <option value="technology">Technology</option>
                <option value="finance">Finance</option>
                <option value="healthcare">Healthcare</option>
                <option value="manufacturing">Manufacturing</option>
                <option value="retail">Retail</option>
                <option value="education">Education</option>
                <option value="consulting">Consulting</option>
                <option value="real_estate">Real Estate</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">Employees</Label>
              <Input type="number" min="0" value={formData.employees} onChange={f("employees")} placeholder="e.g. 50" className="h-9 text-sm" />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium">Annual Revenue</Label>
            <Input value={formData.annualRevenue} onChange={f("annualRevenue")} placeholder="e.g. $1M" className="h-9 text-sm" />
          </div>

          {/* Contact section */}
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/40 -mx-6 px-6 py-2 border-y border-border mt-4">
            Contact Information
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs font-medium">Email</Label>
              <Input type="email" value={formData.email} onChange={f("email")} className="h-9 text-sm" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">Phone</Label>
              <Input value={formData.phone} onChange={f("phone")} className="h-9 text-sm" />
            </div>
          </div>

          {/* Lead Details section */}
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/40 -mx-6 px-6 py-2 border-y border-border mt-4">
            Lead Details
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs font-medium">Source</Label>
              <select className={selectClass} value={formData.source} onChange={f("source")}>
                <option value="">—None—</option>
                <option value="website">Website</option>
                <option value="referral">Referral</option>
                <option value="linkedin">LinkedIn</option>
                <option value="email_campaign">Email Campaign</option>
                <option value="trade_show">Trade Show</option>
                <option value="cold_call">Cold Call</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">Lead Score (0–100)</Label>
              <Input
                type="number" min="0" max="100"
                value={formData.score}
                onChange={f("score")}
                placeholder="Auto-calculated"
                className="h-9 text-sm"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium">Assign To Rep</Label>
            <select className={selectClass} value={formData.assignedTo} onChange={f("assignedTo")}>
              <option value="">—Unassigned—</option>
              {usersData?.data?.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>

          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/40 -mx-6 px-6 py-2 border-y border-border mt-4">
            Description
          </div>
          <div className="space-y-2">
            <textarea
              className="w-full bg-card border border-border rounded-md px-3 py-2 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 min-h-[80px] resize-y"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Additional notes about this lead..."
              rows={3}
            />
          </div>

          <DialogFooter className="pt-3 border-t border-border gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" size="sm" disabled={isPending} className="bg-primary hover:bg-primary/90 text-white">
              {isPending ? "Saving..." : mode === "create" ? "Save" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ConvertLeadDialog({
  open, onOpenChange, lead,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead?: { id: number; name: string; company?: string | null };
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const mutation = useConvertLead();
  const [accountMode, setAccountMode] = useState<"new" | "existing">("new");
  const [contactMode, setContactMode] = useState<"new" | "existing">("new");
  const [existingAccountId, setExistingAccountId] = useState("");
  const [existingContactId, setExistingContactId] = useState("");
  const [oppName, setOppName] = useState("");
  const [createOpp, setCreateOpp] = useState(true);

  const { data: accountsData } = useListAccounts({ limit: 100 });
  const { data: contactsData } = useListContacts({ limit: 100 });
  const accounts = accountsData?.data ?? [];
  const contacts = contactsData?.data ?? [];

  React.useEffect(() => {
    if (open && lead) {
      setAccountMode("new");
      setContactMode("new");
      setExistingAccountId("");
      setExistingContactId("");
      setOppName(`${lead.name} Deal`);
      setCreateOpp(true);
    }
  }, [open, lead]);

  interface AccountOption { id: number; name: string }
  interface ContactOption { id: number; firstName: string; lastName: string }
  const typedAccounts: AccountOption[] = accounts as AccountOption[];
  const typedContacts: ContactOption[] = contacts as ContactOption[];

  const handleConvert = () => {
    if (!lead) return;
    const data: ConvertLeadInput = {
      createOpportunity: createOpp,
      opportunityName: oppName || `${lead.name} Deal`,
      opportunityAmount: 0,
      createAccount: accountMode === "existing" ? false : true,
      createContact: contactMode === "existing" ? false : true,
      existingAccountId: accountMode === "existing" && existingAccountId ? parseInt(existingAccountId) : undefined,
      existingContactId: contactMode === "existing" && existingContactId ? parseInt(existingContactId) : undefined,
    };

    mutation.mutate({ id: lead.id, data }, {
      onSuccess: () => {
        toast({ title: "Lead Converted!", description: "Created Contact, Account, and Opportunity." });
        queryClient.invalidateQueries({ queryKey: getListLeadsQueryKey() });
        onOpenChange(false);
      },
      onError: () => toast({ title: "Error", description: "Failed to convert lead.", variant: "destructive" }),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="border-b border-border pb-3">
          <DialogTitle className="text-base font-semibold">Convert Lead</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Converting <strong className="text-foreground">{lead?.name}</strong>
          </p>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Account</Label>
            <div className="flex gap-2 mb-2">
              <Button type="button" size="sm" variant={accountMode === "new" ? "default" : "outline"} className="text-xs h-7 flex-1" onClick={() => setAccountMode("new")}>Create New</Button>
              <Button type="button" size="sm" variant={accountMode === "existing" ? "default" : "outline"} className="text-xs h-7 flex-1" onClick={() => setAccountMode("existing")}>Use Existing</Button>
            </div>
            {accountMode === "existing" && (
              <select className="w-full h-9 px-3 rounded-md bg-card border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" value={existingAccountId} onChange={(e) => setExistingAccountId(e.target.value)}>
                <option value="">Select an account...</option>
                {typedAccounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contact</Label>
            <div className="flex gap-2 mb-2">
              <Button type="button" size="sm" variant={contactMode === "new" ? "default" : "outline"} className="text-xs h-7 flex-1" onClick={() => setContactMode("new")}>Create New</Button>
              <Button type="button" size="sm" variant={contactMode === "existing" ? "default" : "outline"} className="text-xs h-7 flex-1" onClick={() => setContactMode("existing")}>Use Existing</Button>
            </div>
            {contactMode === "existing" && (
              <select className="w-full h-9 px-3 rounded-md bg-card border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" value={existingContactId} onChange={(e) => setExistingContactId(e.target.value)}>
                <option value="">Select a contact...</option>
                {typedContacts.map((c) => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
              </select>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <input type="checkbox" id="createOppList" checked={createOpp} onChange={(e) => setCreateOpp(e.target.checked)} className="rounded border-border" />
              <Label htmlFor="createOppList" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground cursor-pointer">Create Opportunity</Label>
            </div>
            {createOpp && (
              <Input placeholder="Opportunity name" className="h-9 text-sm" value={oppName} onChange={(e) => setOppName(e.target.value)} />
            )}
          </div>

          <div className="p-3 rounded-md bg-amber-50 border border-amber-200">
            <p className="text-xs text-amber-700">The lead will be marked as <strong>converted</strong> and linked to the selected records.</p>
          </div>
        </div>
        <DialogFooter className="border-t border-border pt-3 gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" onClick={handleConvert} disabled={mutation.isPending || (accountMode === "existing" && !existingAccountId) || (contactMode === "existing" && !existingContactId)} className="bg-primary hover:bg-primary/90 text-white">
            {mutation.isPending ? "Converting..." : "Convert Lead"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
