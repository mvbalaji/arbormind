import React, { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AISummary } from "@/components/ai-summary";
import {
  ArrowLeft, Megaphone, DollarSign, Calendar, TrendingUp, Target,
  Users, Pencil, Play, Pause, CheckCircle2, BarChart2, Clock,
  Mail, Globe, Layers,
} from "lucide-react";
import { format, formatDistanceToNow, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

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
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  planning: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  active: "text-green-400 bg-green-500/10 border-green-500/20",
  paused: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  completed: "text-gray-400 bg-gray-500/10 border-gray-500/20",
  cancelled: "text-red-400 bg-red-500/10 border-red-500/20",
};

const TYPE_ICON: Record<string, React.ElementType> = {
  email: Mail,
  social: Globe,
  webinar: Users,
  event: Calendar,
  content: Layers,
  ppc: BarChart2,
  other: Megaphone,
};

const MOCK_METRICS = [
  { label: "Impressions", value: "12,400", trend: "+18%" },
  { label: "Clicks", value: "1,240", trend: "+12%" },
  { label: "CTR", value: "10%", trend: "+2.4pp" },
  { label: "Leads Generated", value: "84", trend: "+24%" },
  { label: "MQLs", value: "32", trend: "+8%" },
  { label: "Conversions", value: "12", trend: "+3%" },
];

export default function CampaignDetail() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditOpen, setIsEditOpen] = useState(false);

  const { data: campaign, isLoading } = useQuery<Campaign>({
    queryKey: ["campaign", id],
    queryFn: async () => {
      const res = await fetch(`/api/campaigns/${id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Campaign not found");
      return res.json() as Promise<Campaign>;
    },
    enabled: !!id,
  });

  const statusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const res = await fetch(`/api/campaigns/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Campaign status updated" });
      queryClient.invalidateQueries({ queryKey: ["campaign", id] });
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    },
    onError: () => toast({ title: "Error", description: "Could not update status.", variant: "destructive" }),
  });

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

  if (!campaign) {
    return (
      <Layout>
        <div className="text-center py-20 text-muted-foreground">Campaign not found.</div>
      </Layout>
    );
  }

  const TypeIcon = TYPE_ICON[campaign.type] ?? Megaphone;
  const roi = campaign.budget && campaign.expectedRevenue
    ? ((campaign.expectedRevenue - campaign.budget) / campaign.budget * 100).toFixed(0)
    : null;

  const daysRemaining = campaign.endDate
    ? differenceInDays(new Date(campaign.endDate), new Date())
    : null;

  const progress = campaign.startDate && campaign.endDate
    ? Math.min(100, Math.max(0, (differenceInDays(new Date(), new Date(campaign.startDate)) /
        differenceInDays(new Date(campaign.endDate), new Date(campaign.startDate))) * 100))
    : null;

  const spendProgress = campaign.budget && campaign.actualCost
    ? Math.min(100, (campaign.actualCost / campaign.budget) * 100)
    : null;

  return (
    <Layout>
      <div className="flex flex-col gap-5 max-w-5xl mx-auto">
        {/* Back */}
        <div>
          <Link href="/campaigns">
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground mb-3 hover:text-white">
              <ArrowLeft className="w-4 h-4" /> Back to Campaigns
            </Button>
          </Link>

          {/* Header Card */}
          <Card className="glass-panel border-white/5">
            <CardContent className="p-5">
              <div className="flex flex-col sm:flex-row items-start gap-5">
                {/* Icon */}
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500/30 to-rose-500/30 border border-white/10 flex items-center justify-center shrink-0">
                  <TypeIcon className="w-7 h-7 text-orange-400" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h1 className="text-2xl font-bold text-white">{campaign.name}</h1>
                      <p className="text-muted-foreground text-sm mt-0.5 capitalize">{campaign.type} Campaign</p>
                    </div>
                    <Badge variant="outline" className={cn("capitalize shrink-0 text-sm", STATUS_COLORS[campaign.status] ?? "")}>
                      {campaign.status}
                    </Badge>
                  </div>

                  {/* Date Range */}
                  {(campaign.startDate || campaign.endDate) && (
                    <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      {campaign.startDate ? format(new Date(campaign.startDate), "MMM d, yyyy") : "TBD"}
                      {" → "}
                      {campaign.endDate ? format(new Date(campaign.endDate), "MMM d, yyyy") : "TBD"}
                      {daysRemaining != null && (
                        <span className={cn("ml-2 text-xs font-medium", daysRemaining < 7 ? "text-rose-400" : daysRemaining < 30 ? "text-yellow-400" : "text-muted-foreground")}>
                          {daysRemaining > 0 ? `${daysRemaining}d remaining` : "Ended"}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2 mt-4">
                    {campaign.status === "planning" && (
                      <Button size="sm" className="gap-1.5 bg-green-600 hover:bg-green-700 text-white" onClick={() => statusMutation.mutate("active")}>
                        <Play className="w-3.5 h-3.5" /> Launch Campaign
                      </Button>
                    )}
                    {campaign.status === "active" && (
                      <Button size="sm" variant="outline" className="gap-1.5 border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10" onClick={() => statusMutation.mutate("paused")}>
                        <Pause className="w-3.5 h-3.5" /> Pause
                      </Button>
                    )}
                    {campaign.status === "paused" && (
                      <Button size="sm" className="gap-1.5 bg-green-600 hover:bg-green-700 text-white" onClick={() => statusMutation.mutate("active")}>
                        <Play className="w-3.5 h-3.5" /> Resume
                      </Button>
                    )}
                    {["active", "paused"].includes(campaign.status) && (
                      <Button size="sm" variant="outline" className="gap-1.5 border-white/10 text-muted-foreground hover:text-white" onClick={() => statusMutation.mutate("completed")}>
                        <CheckCircle2 className="w-3.5 h-3.5" /> Mark Complete
                      </Button>
                    )}
                    <Button size="sm" variant="outline" className="gap-1.5 border-white/10" onClick={() => setIsEditOpen(true)}>
                      <Pencil className="w-3.5 h-3.5" /> Edit
                    </Button>
                  </div>
                </div>
              </div>

              {/* Timeline Progress */}
              {progress != null && (
                <div className="mt-5 pt-5 border-t border-white/5">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                    <span>Campaign Progress</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-2">
                    <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* AI Summary */}
        <AISummary entityType="campaign" entityData={campaign as unknown as Record<string, unknown>} />

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="glass-panel border-white/5 p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1"><DollarSign className="w-3 h-3" /> Budget</p>
            <p className="text-xl font-bold text-white">{campaign.budget ? `$${campaign.budget.toLocaleString()}` : "—"}</p>
            {spendProgress != null && (
              <div className="mt-2">
                <div className="w-full bg-white/5 rounded-full h-1">
                  <div className={cn("h-1 rounded-full", spendProgress > 90 ? "bg-rose-400" : "bg-emerald-400")} style={{ width: `${spendProgress}%` }} />
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{spendProgress.toFixed(0)}% spent</p>
              </div>
            )}
          </Card>

          <Card className="glass-panel border-white/5 p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Expected Revenue</p>
            <p className="text-xl font-bold text-white">{campaign.expectedRevenue ? `$${campaign.expectedRevenue.toLocaleString()}` : "—"}</p>
          </Card>

          <Card className="glass-panel border-white/5 p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1"><Target className="w-3 h-3" /> ROI (Projected)</p>
            <p className={cn("text-xl font-bold", roi && parseInt(roi) > 0 ? "text-emerald-400" : roi && parseInt(roi) < 0 ? "text-rose-400" : "text-white")}>
              {roi ? `${roi}%` : "—"}
            </p>
          </Card>

          <Card className="glass-panel border-white/5 p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1"><Clock className="w-3 h-3" /> Actual Cost</p>
            <p className="text-xl font-bold text-white">{campaign.actualCost ? `$${campaign.actualCost.toLocaleString()}` : "—"}</p>
          </Card>
        </div>

        {/* Performance Metrics */}
        <Card className="glass-panel border-white/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display font-semibold flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-primary" /> Performance Metrics
              <span className="text-xs font-normal text-muted-foreground ml-1">(Simulated)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {MOCK_METRICS.map((m) => (
                <div key={m.label} className="p-3 rounded-xl bg-white/5 border border-white/5">
                  <p className="text-xs text-muted-foreground mb-1">{m.label}</p>
                  <div className="flex items-end gap-2">
                    <p className="text-xl font-bold text-white">{m.value}</p>
                    <p className="text-xs text-emerald-400 pb-0.5">{m.trend}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Description */}
        {campaign.description && (
          <Card className="glass-panel border-white/5 p-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Campaign Description</p>
            <p className="text-sm text-muted-foreground leading-relaxed">{campaign.description}</p>
          </Card>
        )}

        {/* Edit Dialog */}
        <CampaignEditDialog open={isEditOpen} onOpenChange={setIsEditOpen} campaign={campaign}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ["campaign", id] })} />
      </div>
    </Layout>
  );
}

function CampaignEditDialog({ open, onOpenChange, campaign, onSaved }: {
  open: boolean; onOpenChange: (v: boolean) => void; campaign: Campaign; onSaved: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: campaign.name,
    type: campaign.type,
    status: campaign.status,
    startDate: campaign.startDate?.slice(0, 10) ?? "",
    endDate: campaign.endDate?.slice(0, 10) ?? "",
    budget: campaign.budget?.toString() ?? "",
    actualCost: campaign.actualCost?.toString() ?? "",
    expectedRevenue: campaign.expectedRevenue?.toString() ?? "",
    description: campaign.description ?? "",
  });

  React.useEffect(() => {
    if (open) setForm({
      name: campaign.name, type: campaign.type, status: campaign.status,
      startDate: campaign.startDate?.slice(0, 10) ?? "", endDate: campaign.endDate?.slice(0, 10) ?? "",
      budget: campaign.budget?.toString() ?? "", actualCost: campaign.actualCost?.toString() ?? "",
      expectedRevenue: campaign.expectedRevenue?.toString() ?? "", description: campaign.description ?? "",
    });
  }, [open, campaign]);

  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await fetch(`/api/campaigns/${campaign.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...data,
          budget: data.budget ? parseFloat(data.budget) : null,
          actualCost: data.actualCost ? parseFloat(data.actualCost) : null,
          expectedRevenue: data.expectedRevenue ? parseFloat(data.expectedRevenue) : null,
          startDate: data.startDate || null,
          endDate: data.endDate || null,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Campaign updated" });
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      onSaved();
      onOpenChange(false);
    },
    onError: () => toast({ title: "Error", description: "Could not save.", variant: "destructive" }),
  });

  const f = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm({ ...form, [field]: e.target.value });
  const sc = "w-full h-9 px-3 rounded-md bg-black/20 border border-white/10 text-white text-sm";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-white/10 text-white sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Edit Campaign</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(form); }} className="space-y-4 py-2">
          <div className="space-y-1.5"><Label className="text-xs">Campaign Name</Label>
            <Input required className="bg-black/20 border-white/10 h-9" value={form.name} onChange={f("name")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-xs">Type</Label>
              <select className={sc} value={form.type} onChange={f("type")}>
                {["email","social","webinar","event","content","ppc","other"].map(t => <option key={t} value={t} className="bg-card capitalize">{t}</option>)}
              </select>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Status</Label>
              <select className={sc} value={form.status} onChange={f("status")}>
                {["planning","active","paused","completed","cancelled"].map(s => <option key={s} value={s} className="bg-card capitalize">{s}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-xs">Start Date</Label><Input type="date" className="bg-black/20 border-white/10 h-9" value={form.startDate} onChange={f("startDate")} /></div>
            <div className="space-y-1.5"><Label className="text-xs">End Date</Label><Input type="date" className="bg-black/20 border-white/10 h-9" value={form.endDate} onChange={f("endDate")} /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5"><Label className="text-xs">Budget ($)</Label><Input type="number" className="bg-black/20 border-white/10 h-9" value={form.budget} onChange={f("budget")} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Actual Cost ($)</Label><Input type="number" className="bg-black/20 border-white/10 h-9" value={form.actualCost} onChange={f("actualCost")} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Expected Rev. ($)</Label><Input type="number" className="bg-black/20 border-white/10 h-9" value={form.expectedRevenue} onChange={f("expectedRevenue")} /></div>
          </div>
          <div className="space-y-1.5"><Label className="text-xs">Description</Label>
            <textarea className="w-full px-3 py-2 rounded-md bg-black/20 border border-white/10 text-white text-sm min-h-[80px] resize-none" value={form.description} onChange={f("description")} />
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="border-white/10">Cancel</Button>
            <Button type="submit" disabled={mutation.isPending} className="bg-primary hover:bg-primary/90 text-white">
              {mutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
