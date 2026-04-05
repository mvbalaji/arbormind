import React, { useState } from "react";
import {
  useListLeads, useCreateLead, useUpdateLead, useDeleteLead,
  useConvertLead, useListUsers, getListLeadsQueryKey, CreateLeadInputStatus,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
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
import { Search, Plus, ArrowRightLeft, MoreHorizontal, Pencil, Trash2, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  contacted: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  qualified: "bg-green-500/10 text-green-400 border-green-500/20",
  unqualified: "bg-red-500/10 text-red-400 border-red-500/20",
  converted: "bg-gray-500/10 text-gray-400 border-gray-500/20",
};

interface LeadFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  source: string;
  status: string;
  assignedTo: string;
  score: string;
}

const defaultFormData: LeadFormData = {
  firstName: "", lastName: "", email: "", phone: "", company: "",
  source: "", status: "new", assignedTo: "", score: "",
};

export default function Leads() {
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<{ id: number } & LeadFormData | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [convertingId, setConvertingId] = useState<{ id: number; name: string } | null>(null);
  const { data, isLoading } = useListLeads({ search, limit: 50 });

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-white tracking-tight">Leads</h1>
            <p className="text-muted-foreground mt-1 text-sm">Track and convert potential prospects.</p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
              <Input
                placeholder="Search leads..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-card border-white/10"
              />
            </div>
            <Button
              onClick={() => setIsCreateOpen(true)}
              className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20"
            >
              <Plus className="w-4 h-4 mr-2" /> Add Lead
            </Button>
          </div>
        </div>

        <Card className="glass-panel border-white/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-black/20 border-b border-white/5">
                <tr>
                  <th className="px-6 py-4 font-medium">Lead</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Company</th>
                  <th className="px-6 py-4 font-medium text-center">Score</th>
                  <th className="px-6 py-4 font-medium">Assigned To</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {isLoading ? (
                  <tr><td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">Loading...</td></tr>
                ) : data?.data?.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">No leads found.</td></tr>
                ) : (
                  data?.data?.map((lead) => (
                    <tr key={lead.id} className="hover:bg-white/5 transition-colors group">
                      <td className="px-6 py-4">
                        <Link href={`/leads/${lead.id}`}>
                          <div className="font-medium text-white hover:text-primary transition-colors cursor-pointer flex items-center gap-1.5">
                            {lead.firstName} {lead.lastName}
                            <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity" />
                          </div>
                        </Link>
                        <div className="text-xs text-muted-foreground">{lead.email ?? lead.phone ?? "No contact info"}</div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="outline" className={`capitalize ${STATUS_COLORS[lead.status] ?? ""}`}>
                          {lead.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">{lead.company ?? "-"}</td>
                      <td className="px-6 py-4 text-center">
                        {lead.score != null ? (
                          <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full border font-bold text-xs ${
                            lead.score >= 80 ? "border-green-500/50 text-green-400 bg-green-500/10" :
                            lead.score >= 50 ? "border-yellow-500/50 text-yellow-400 bg-yellow-500/10" :
                            "border-red-500/50 text-red-400 bg-red-500/10"
                          }`}>
                            {lead.score}
                          </div>
                        ) : "-"}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">{lead.assignedToName ?? "Unassigned"}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!lead.isConverted && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-primary/50 text-primary hover:bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => setConvertingId({ id: lead.id, name: `${lead.firstName} ${lead.lastName}` })}
                            >
                              <ArrowRightLeft className="w-3 h-3 mr-1" /> Convert
                            </Button>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-card border-white/10 text-white">
                              <DropdownMenuItem
                                onClick={() => setEditingLead({
                                  id: lead.id,
                                  firstName: lead.firstName,
                                  lastName: lead.lastName,
                                  email: lead.email ?? "",
                                  phone: lead.phone ?? "",
                                  company: lead.company ?? "",
                                  source: lead.source ?? "",
                                  status: lead.status,
                                  assignedTo: (lead.assignedTo?.toString()) ?? "",
                                  score: (lead.score?.toString()) ?? "",
                                })}
                                className="cursor-pointer hover:bg-white/10"
                              >
                                <Pencil className="w-4 h-4 mr-2" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-white/10" />
                              <DropdownMenuItem
                                onClick={() => setDeletingId(lead.id)}
                                className="cursor-pointer text-destructive hover:bg-destructive/10 focus:text-destructive"
                              >
                                <Trash2 className="w-4 h-4 mr-2" /> Delete
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
        </Card>
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
      <AlertDialog open={deletingId !== null} onOpenChange={(o) => { if (!o) setDeletingId(null); }}>
        <AlertDialogContent className="bg-card border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lead?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 text-white hover:bg-white/10">Cancel</AlertDialogCancel>
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

  const selectClass = "w-full bg-black/20 border border-white/10 rounded-md px-3 py-2 text-white text-sm";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-white/10 text-white sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {mode === "create" ? "Create Lead" : "Edit Lead"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>First Name *</Label>
              <Input required className="bg-black/20 border-white/10" value={formData.firstName} onChange={f("firstName")} />
            </div>
            <div className="space-y-2">
              <Label>Last Name *</Label>
              <Input required className="bg-black/20 border-white/10" value={formData.lastName} onChange={f("lastName")} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" className="bg-black/20 border-white/10" value={formData.email} onChange={f("email")} />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input className="bg-black/20 border-white/10" value={formData.phone} onChange={f("phone")} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Company</Label>
            <Input className="bg-black/20 border-white/10" value={formData.company} onChange={f("company")} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Source</Label>
              <select className={selectClass} value={formData.source} onChange={f("source")}>
                <option value="">Select source</option>
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
              <Label>Status</Label>
              <select className={selectClass} value={formData.status} onChange={f("status")}>
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="qualified">Qualified</option>
                <option value="unqualified">Unqualified</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Assign To Rep</Label>
              <select className={selectClass} value={formData.assignedTo} onChange={f("assignedTo")}>
                <option value="">Unassigned</option>
                {usersData?.data?.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Lead Score (0–100)</Label>
              <Input
                type="number" min="0" max="100"
                className="bg-black/20 border-white/10"
                value={formData.score}
                onChange={f("score")}
                placeholder="Auto-calculated"
              />
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="border-white/10">Cancel</Button>
            <Button type="submit" disabled={isPending} className="bg-primary hover:bg-primary/90 text-white">
              {isPending ? "Saving..." : mode === "create" ? "Create Lead" : "Save Changes"}
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
  lead?: { id: number; name: string };
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const mutation = useConvertLead();

  const handleConvert = () => {
    if (!lead) return;
    mutation.mutate({
      id: lead.id,
      data: {
        createContact: true,
        createAccount: true,
        createOpportunity: true,
        opportunityName: `${lead.name} Deal`,
        opportunityAmount: 0,
      },
    }, {
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
      <DialogContent className="bg-card border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Convert Lead</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <p className="text-muted-foreground text-sm">Converting <strong className="text-white">{lead?.name}</strong> will automatically create:</p>
          <ul className="list-disc pl-5 text-sm space-y-2 text-muted-foreground">
            <li>A new <span className="text-white">Contact</span> record</li>
            <li>A new <span className="text-white">Account</span> record</li>
            <li>A new <span className="text-white">Opportunity</span> in Prospecting stage</li>
          </ul>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-white/10">Cancel</Button>
          <Button onClick={handleConvert} disabled={mutation.isPending} className="bg-accent hover:bg-accent/90">
            {mutation.isPending ? "Converting..." : "Confirm Conversion"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
