import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Plus, MoreHorizontal, Pencil, Trash2, Megaphone, TrendingUp, DollarSign, Calendar, ExternalLink } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Campaign {
  id: number;
  name: string;
  type: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  budget: number | null;
  actualCost: number | null;
  expectedRevenue: number | null;
  description: string | null;
  goals: string | null;
  targetAudience: string | null;
  channels: string | null;
  teamMembers: string | null;
  createdAt: string;
}

interface CampaignFormData {
  name: string;
  type: string;
  status: string;
  startDate: string;
  endDate: string;
  budget: string;
  expectedRevenue: string;
  description: string;
  goals: string;
  targetAudience: string;
  channels: string;
  teamMembers: string;
}

const defaultForm: CampaignFormData = {
  name: "", type: "email", status: "planning", startDate: "", endDate: "",
  budget: "", expectedRevenue: "", description: "", goals: "",
  targetAudience: "", channels: "", teamMembers: "",
};

const STATUS_COLORS: Record<string, string> = {
  planning: "bg-blue-50 text-blue-700 border-blue-200",
  active: "bg-green-50 text-green-700 border-green-200",
  paused: "bg-yellow-50 text-yellow-700 border-yellow-200",
  completed: "bg-gray-100 text-gray-600 border-gray-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
};

const TYPE_LABELS: Record<string, string> = {
  email: "Email", webinar: "Webinar", social: "Social Media",
  event: "Event", paid_ads: "Paid Ads", content: "Content", other: "Other",
};

async function fetchCampaigns(search: string) {
  const params = new URLSearchParams({ limit: "50" });
  if (search) params.set("search", search);
  const res = await fetch(`/api/campaigns?${params}`);
  if (!res.ok) throw new Error("Failed to fetch campaigns");
  return res.json();
}

async function createCampaign(data: Partial<CampaignFormData>) {
  const res = await fetch("/api/campaigns", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create campaign");
  return res.json();
}

async function updateCampaign(id: number, data: Partial<CampaignFormData>) {
  const res = await fetch(`/api/campaigns/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update campaign");
  return res.json();
}

async function deleteCampaign(id: number) {
  const res = await fetch(`/api/campaigns/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete campaign");
  return res.json();
}

export default function Campaigns() {
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["campaigns", search],
    queryFn: () => fetchCampaigns(search),
  });

  const createMutation = useMutation({
    mutationFn: createCampaign,
    onSuccess: () => {
      toast({ title: "Campaign created" });
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      setIsCreateOpen(false);
    },
    onError: () => toast({ title: "Error", description: "Failed to create campaign.", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CampaignFormData> }) => updateCampaign(id, data),
    onSuccess: () => {
      toast({ title: "Campaign updated" });
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      setEditingCampaign(null);
    },
    onError: () => toast({ title: "Error", description: "Failed to update campaign.", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCampaign,
    onSuccess: () => {
      toast({ title: "Campaign deleted" });
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      setDeletingId(null);
    },
    onError: () => toast({ title: "Error", description: "Failed to delete campaign.", variant: "destructive" }),
  });

  const campaigns: Campaign[] = data?.data ?? [];

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground tracking-tight">Campaigns</h1>
            <p className="text-muted-foreground mt-1 text-sm">Manage marketing campaigns and track ROI.</p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
              <Input
                placeholder="Search campaigns..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-card border-border"
              />
            </div>
            <Button
              onClick={() => setIsCreateOpen(true)}
              className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20"
            >
              <Plus className="w-4 h-4 mr-2" /> New Campaign
            </Button>
          </div>
        </div>

        {!isLoading && campaigns.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="glass-panel border-border p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                <Megaphone className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Campaigns</p>
                <p className="text-2xl font-bold text-foreground">{data?.total ?? 0}</p>
              </div>
            </Card>
            <Card className="glass-panel border-border p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Active</p>
                <p className="text-2xl font-bold text-foreground">
                  {campaigns.filter(c => c.status === "active").length}
                </p>
              </div>
            </Card>
            <Card className="glass-panel border-border p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center shrink-0">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Expected Revenue</p>
                <p className="text-2xl font-bold text-foreground">
                  ${campaigns.reduce((s, c) => s + (c.expectedRevenue ?? 0), 0).toLocaleString()}
                </p>
              </div>
            </Card>
          </div>
        )}

        <Card className="glass-panel border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted border-b border-border">
                <tr>
                  <th className="px-6 py-4 font-medium">Campaign</th>
                  <th className="px-6 py-4 font-medium">Type</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Dates</th>
                  <th className="px-6 py-4 font-medium text-right">Budget / Rev.</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr><td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                    <div className="space-y-3">
                      {[0,1,2].map(i => <Skeleton key={i} className="h-10 w-full" />)}
                    </div>
                  </td></tr>
                ) : campaigns.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Megaphone className="w-12 h-12 text-muted-foreground/30" />
                      <p className="text-muted-foreground">No campaigns yet. Create your first campaign.</p>
                    </div>
                  </td></tr>
                ) : (
                  campaigns.map((campaign) => (
                    <tr key={campaign.id} className="hover:bg-muted/50 transition-colors group">
                      <td className="px-6 py-4">
                        <Link href={`/campaigns/${campaign.id}`}>
                          <div className="font-medium text-foreground hover:text-primary transition-colors cursor-pointer flex items-center gap-1.5">
                            {campaign.name}
                            <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity" />
                          </div>
                        </Link>
                        {campaign.description && (
                          <div className="text-xs text-muted-foreground mt-0.5 truncate max-w-[260px]">{campaign.description}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">{TYPE_LABELS[campaign.type] ?? campaign.type}</td>
                      <td className="px-6 py-4">
                        <Badge variant="outline" className={`capitalize ${STATUS_COLORS[campaign.status] ?? ""}`}>
                          {campaign.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground text-xs">
                        {campaign.startDate && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(campaign.startDate), "MMM d")}
                            {campaign.endDate && ` → ${format(new Date(campaign.endDate), "MMM d, yyyy")}`}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="text-xs text-muted-foreground">
                          {campaign.budget != null && <div>Budget: ${campaign.budget.toLocaleString()}</div>}
                          {campaign.expectedRevenue != null && (
                            <div className="text-chart-3">Rev: ${campaign.expectedRevenue.toLocaleString()}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-card border-border text-foreground">
                            <DropdownMenuItem onClick={() => setEditingCampaign(campaign)} className="cursor-pointer hover:bg-muted">
                              <Pencil className="w-4 h-4 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-muted" />
                            <DropdownMenuItem onClick={() => setDeletingId(campaign.id)} className="cursor-pointer text-destructive hover:bg-destructive/10 focus:text-destructive">
                              <Trash2 className="w-4 h-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <CampaignFormDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        mode="create"
        onSubmit={(data) => createMutation.mutate(data)}
        isPending={createMutation.isPending}
      />

      {editingCampaign && (
        <CampaignFormDialog
          open={!!editingCampaign}
          onOpenChange={(o) => { if (!o) setEditingCampaign(null); }}
          mode="edit"
          initialData={editingCampaign}
          onSubmit={(data) => updateMutation.mutate({ id: editingCampaign.id, data })}
          isPending={updateMutation.isPending}
        />
      )}

      <AlertDialog open={deletingId !== null} onOpenChange={(o) => { if (!o) setDeletingId(null); }}>
        <AlertDialogContent className="bg-card border-border text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Campaign?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border text-foreground hover:bg-muted">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (deletingId !== null) deleteMutation.mutate(deletingId); }}
              className="bg-destructive hover:bg-destructive/90 text-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}

function CampaignFormDialog({
  open, onOpenChange, mode, initialData, onSubmit, isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  initialData?: Campaign;
  onSubmit: (data: Partial<CampaignFormData>) => void;
  isPending: boolean;
}) {
  const buildForm = (d?: Campaign): CampaignFormData => d ? {
    name: d.name, type: d.type, status: d.status,
    startDate: d.startDate ? d.startDate.slice(0, 10) : "",
    endDate: d.endDate ? d.endDate.slice(0, 10) : "",
    budget: d.budget != null ? String(d.budget) : "",
    expectedRevenue: d.expectedRevenue != null ? String(d.expectedRevenue) : "",
    description: d.description ?? "",
    goals: d.goals ?? "",
    targetAudience: d.targetAudience ?? "",
    channels: d.channels ?? "",
    teamMembers: d.teamMembers ?? "",
  } : defaultForm;

  const [form, setForm] = useState<CampaignFormData>(() => buildForm(initialData));

  React.useEffect(() => {
    if (open) setForm(buildForm(initialData));
  }, [open]);

  const f = (field: keyof CampaignFormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm({ ...form, [field]: e.target.value });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...form,
      startDate: form.startDate || undefined,
      endDate: form.endDate || undefined,
      budget: form.budget ? Number(form.budget) : undefined,
      expectedRevenue: form.expectedRevenue ? Number(form.expectedRevenue) : undefined,
    } as Partial<CampaignFormData>;
    onSubmit(payload);
  };

  const selectClass = "w-full bg-muted border border-border rounded-md px-3 py-2 text-white text-sm";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border text-white sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {mode === "create" ? "New Campaign" : "Edit Campaign"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Campaign Name *</Label>
            <Input required className="bg-muted border-border" value={form.name} onChange={f("name")} placeholder="e.g. Q2 Email Blast" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <select className={selectClass} value={form.type} onChange={f("type")}>
                <option value="email">Email</option>
                <option value="webinar">Webinar</option>
                <option value="social">Social Media</option>
                <option value="event">Event</option>
                <option value="paid_ads">Paid Ads</option>
                <option value="content">Content</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <select className={selectClass} value={form.status} onChange={f("status")}>
                <option value="planning">Planning</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input type="date" className="bg-muted border-border" value={form.startDate} onChange={f("startDate")} />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input type="date" className="bg-muted border-border" value={form.endDate} onChange={f("endDate")} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Budget ($)</Label>
              <Input type="number" min="0" className="bg-muted border-border" value={form.budget} onChange={f("budget")} placeholder="0" />
            </div>
            <div className="space-y-2">
              <Label>Expected Revenue ($)</Label>
              <Input type="number" min="0" className="bg-muted border-border" value={form.expectedRevenue} onChange={f("expectedRevenue")} placeholder="0" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Campaign Goals</Label>
            <Input className="bg-muted border-border" value={form.goals} onChange={f("goals")} placeholder="e.g. Generate 50 MQLs, 10% pipeline contribution" />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <textarea
              className="w-full bg-muted border border-border rounded-md px-3 py-2 text-white text-sm resize-none h-20"
              value={form.description}
              onChange={f("description")}
              placeholder="Campaign objective and notes..."
            />
          </div>
          <div className="space-y-2">
            <Label>Target Audience</Label>
            <textarea
              className="w-full bg-muted border border-border rounded-md px-3 py-2 text-white text-sm resize-none h-16"
              value={form.targetAudience}
              onChange={f("targetAudience")}
              placeholder="e.g. B2B decision-makers, VP Sales, 50-500 employee companies"
            />
          </div>
          <div className="space-y-2">
            <Label>Channels (comma-separated)</Label>
            <Input className="bg-muted border-border" value={form.channels} onChange={f("channels")} placeholder="e.g. Email, LinkedIn, Google Ads" />
          </div>
          <div className="space-y-2">
            <Label>Campaign Team (comma-separated names)</Label>
            <Input className="bg-muted border-border" value={form.teamMembers} onChange={f("teamMembers")} placeholder="e.g. Sarah Johnson, Mike Chen, Lisa Park" />
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="border-border">Cancel</Button>
            <Button type="submit" disabled={isPending} className="bg-primary hover:bg-primary/90 text-foreground">
              {isPending ? "Saving..." : mode === "create" ? "Create Campaign" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
