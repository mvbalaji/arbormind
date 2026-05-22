import React, { useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AISummary } from "@/components/ai-summary";
import {
  ArrowLeft, Megaphone, DollarSign, Calendar, TrendingUp, Target,
  Users, Pencil, Play, Pause, CheckCircle2, BarChart2, Clock,
  Mail, Globe, Layers, Copy, Trash2, Image, FileText, MousePointerClick,
  UserCheck, MapPin, Smartphone, Laptop, Monitor, Tag, Flag,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
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
  targetAudience: string | null;
  channels: string | null;
  teamMembers: string | null;
  goals: string | null;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  planning: "text-blue-600 bg-blue-500/10 border-blue-200",
  active: "text-green-600 bg-green-500/10 border-green-200",
  paused: "text-yellow-600 bg-yellow-500/10 border-yellow-200",
  completed: "text-gray-400 bg-gray-500/10 border-gray-200",
  cancelled: "text-red-600 bg-red-500/10 border-red-200",
};

const TYPE_ICON: Record<string, React.ElementType> = {
  email: Mail, social: Globe, webinar: Users, event: Calendar,
  content: Layers, ppc: BarChart2, other: Megaphone,
};

const CHANNEL_ICONS: Record<string, React.ElementType> = {
  email: Mail, linkedin: Globe, twitter: Globe, facebook: Globe,
  instagram: Smartphone, google: Laptop, website: Monitor, events: MapPin,
};

const DEFAULT_CHANNELS: Record<string, string[]> = {
  email: ["Email", "Newsletter"],
  social: ["LinkedIn", "Twitter", "Facebook", "Instagram"],
  webinar: ["Email", "LinkedIn", "Website"],
  event: ["Email", "LinkedIn", "Events"],
  content: ["Website", "LinkedIn", "Email"],
  ppc: ["Google Ads", "LinkedIn Ads", "Facebook Ads"],
  other: ["Email", "Website"],
};

const MOCK_METRICS = [
  { label: "Impressions", value: "12,400", trend: "+18%", icon: Monitor },
  { label: "Clicks", value: "1,240", trend: "+12%", icon: MousePointerClick },
  { label: "CTR", value: "10%", trend: "+2.4pp", icon: TrendingUp },
  { label: "Leads Generated", value: "84", trend: "+24%", icon: Users },
  { label: "MQLs", value: "32", trend: "+8%", icon: UserCheck },
  { label: "Conversions", value: "12", trend: "+3%", icon: Target },
  { label: "CPC", value: "£4.20", trend: "-8%", icon: DollarSign },
  { label: "Engagement Rate", value: "6.8%", trend: "+1.2pp", icon: BarChart2 },
];

const MOCK_CREATIVES = [
  { name: "Hero Banner - Q2 2025", type: "image", size: "1200×628", status: "active" },
  { name: "Email Template - Outreach", type: "email", size: "600×auto", status: "active" },
  { name: "Social Ad Copy - LinkedIn", type: "text", size: "—", status: "active" },
  { name: "Landing Page Copy", type: "text", size: "—", status: "draft" },
  { name: "Promo Video (30s)", type: "video", size: "1920×1080", status: "review" },
];

const CREATIVE_ICONS: Record<string, React.ElementType> = {
  image: Image, email: Mail, text: FileText, video: BarChart2,
};

type Tab = "overview" | "performance" | "audience" | "creatives" | "team";

export default function CampaignDetail() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("overview");

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
      toast({ title: "Status updated" });
      queryClient.invalidateQueries({ queryKey: ["campaign", id] });
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    },
    onError: () => toast({ title: "Error", description: "Could not update status.", variant: "destructive" }),
  });

  const duplicateMutation = useMutation({
    mutationFn: async () => {
      if (!campaign) throw new Error("No campaign");
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: `Copy of ${campaign.name}`,
          type: campaign.type,
          status: "planning",
          budget: campaign.budget,
          expectedRevenue: campaign.expectedRevenue,
          description: campaign.description,
          targetAudience: campaign.targetAudience,
          channels: campaign.channels,
          goals: campaign.goals,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: (newCampaign) => {
      toast({ title: "Campaign duplicated" });
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      navigate(`/campaigns/${newCampaign.id}`);
    },
    onError: () => toast({ title: "Error", description: "Could not duplicate.", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/campaigns/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Campaign deleted" });
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      navigate("/campaigns");
    },
    onError: () => toast({ title: "Error", description: "Could not delete.", variant: "destructive" }),
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
    ? Math.min(100, (campaign.actualCost / campaign.budget) * 100) : null;

  const channels = campaign.channels
    ? campaign.channels.split(",").map(c => c.trim()).filter(Boolean)
    : DEFAULT_CHANNELS[campaign.type] ?? ["Email", "Website"];

  const teamList = campaign.teamMembers
    ? campaign.teamMembers.split(",").map(t => t.trim()).filter(Boolean)
    : [];

  const TABS: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "performance", label: "Performance" },
    { id: "audience", label: "Audience & Targeting" },
    { id: "creatives", label: "Creatives / Assets" },
    { id: "team", label: "Campaign Team" },
  ];

  return (
    <Layout>
      <div className="flex flex-col gap-5 max-w-5xl mx-auto">
        {/* Back */}
        <div>
          <Link href="/campaigns">
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground mb-3 hover:text-foreground">
              <ArrowLeft className="w-4 h-4" /> Back to Campaigns
            </Button>
          </Link>

          {/* Header Card */}
          <Card className="glass-panel border-border">
            <CardContent className="p-5">
              <div className="flex flex-col sm:flex-row items-start gap-5">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500/30 to-rose-500/30 border border-border flex items-center justify-center shrink-0">
                  <TypeIcon className="w-7 h-7 text-orange-600" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h1 className="text-2xl font-bold text-foreground">{campaign.name}</h1>
                      <p className="text-muted-foreground text-sm mt-0.5 capitalize">{campaign.type} Campaign</p>
                      {campaign.goals && (
                        <p className="text-xs text-primary/80 mt-1 flex items-center gap-1">
                          <Flag className="w-3 h-3" /> {campaign.goals}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline" className={cn("capitalize shrink-0 text-sm", STATUS_COLORS[campaign.status] ?? "")}>
                      {campaign.status}
                    </Badge>
                  </div>

                  {(campaign.startDate || campaign.endDate) && (
                    <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      {campaign.startDate ? format(new Date(campaign.startDate), "MMM d, yyyy") : "TBD"}
                      {" → "}
                      {campaign.endDate ? format(new Date(campaign.endDate), "MMM d, yyyy") : "TBD"}
                      {daysRemaining != null && (
                        <span className={cn("ml-2 text-xs font-medium", daysRemaining < 7 ? "text-rose-600" : daysRemaining < 30 ? "text-yellow-600" : "text-muted-foreground")}>
                          {daysRemaining > 0 ? `${daysRemaining}d remaining` : "Ended"}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-2 mt-4">
                    {campaign.status === "planning" && (
                      <Button size="sm" className="gap-1.5 bg-green-600 hover:bg-green-700 text-foreground" onClick={() => statusMutation.mutate("active")}>
                        <Play className="w-3.5 h-3.5" /> Launch Campaign
                      </Button>
                    )}
                    {campaign.status === "active" && (
                      <Button size="sm" variant="outline" className="gap-1.5 border-yellow-500/50 text-yellow-600 hover:bg-yellow-500/10" onClick={() => statusMutation.mutate("paused")}>
                        <Pause className="w-3.5 h-3.5" /> Pause
                      </Button>
                    )}
                    {campaign.status === "paused" && (
                      <Button size="sm" className="gap-1.5 bg-green-600 hover:bg-green-700 text-foreground" onClick={() => statusMutation.mutate("active")}>
                        <Play className="w-3.5 h-3.5" /> Resume
                      </Button>
                    )}
                    {["active", "paused"].includes(campaign.status) && (
                      <Button size="sm" variant="outline" className="gap-1.5 border-border text-muted-foreground hover:text-foreground" onClick={() => statusMutation.mutate("completed")}>
                        <CheckCircle2 className="w-3.5 h-3.5" /> Mark Complete
                      </Button>
                    )}
                    <Button size="sm" variant="outline" className="gap-1.5 border-border" onClick={() => setIsEditOpen(true)}>
                      <Pencil className="w-3.5 h-3.5" /> Edit
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1.5 border-border text-muted-foreground hover:text-foreground" onClick={() => duplicateMutation.mutate()} disabled={duplicateMutation.isPending}>
                      <Copy className="w-3.5 h-3.5" /> Duplicate
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1.5 border-red-500/30 text-red-600 hover:bg-red-500/10" onClick={() => setIsDeleteOpen(true)}>
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </Button>
                  </div>
                </div>
              </div>

              {/* Timeline Progress */}
              {progress != null && (
                <div className="mt-5 pt-5 border-t border-border">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                    <span>Campaign Timeline Progress</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="w-full bg-muted/50 rounded-full h-2">
                    <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="glass-panel border-border p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1"><DollarSign className="w-3 h-3" /> Budget</p>
            <p className="text-xl font-bold text-foreground">{campaign.budget ? `£${campaign.budget.toLocaleString()}` : "—"}</p>
            {spendProgress != null && (
              <div className="mt-2">
                <div className="w-full bg-muted/50 rounded-full h-1">
                  <div className={cn("h-1 rounded-full", spendProgress > 90 ? "bg-rose-400" : "bg-emerald-400")} style={{ width: `${spendProgress}%` }} />
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{spendProgress.toFixed(0)}% spent</p>
              </div>
            )}
          </Card>
          <Card className="glass-panel border-border p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Expected Revenue</p>
            <p className="text-xl font-bold text-foreground">{campaign.expectedRevenue ? `£${campaign.expectedRevenue.toLocaleString()}` : "—"}</p>
          </Card>
          <Card className="glass-panel border-border p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1"><Target className="w-3 h-3" /> ROI (Projected)</p>
            <p className={cn("text-xl font-bold", roi && parseInt(roi) > 0 ? "text-emerald-600" : roi && parseInt(roi) < 0 ? "text-rose-600" : "text-foreground")}>
              {roi ? `${roi}%` : "—"}
            </p>
          </Card>
          <Card className="glass-panel border-border p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1"><Clock className="w-3 h-3" /> Actual Cost</p>
            <p className="text-xl font-bold text-foreground">{campaign.actualCost ? `£${campaign.actualCost.toLocaleString()}` : "—"}</p>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex gap-0.5 border-b border-border overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap",
                activeTab === tab.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="flex flex-col gap-4">
            <AISummary entityType="campaign" entityData={campaign as unknown as Record<string, unknown>} />

            {/* Campaign Summary */}
            <Card className="glass-panel border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Tag className="w-4 h-4 text-primary" /> Campaign Information / Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                  {[
                    { label: "Campaign Name", value: campaign.name },
                    { label: "Type", value: campaign.type, capitalize: true },
                    { label: "Status", value: campaign.status, capitalize: true },
                    { label: "Duration", value: campaign.startDate && campaign.endDate ? `${format(new Date(campaign.startDate), "MMM d")} → ${format(new Date(campaign.endDate), "MMM d, yyyy")}` : "Not set" },
                    { label: "Goals", value: campaign.goals ?? "Not specified" },
                    { label: "Created", value: format(new Date(campaign.createdAt), "MMM d, yyyy") },
                  ].map(({ label, value, capitalize }) => (
                    <div key={label}>
                      <dt className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">{label}</dt>
                      <dd className={cn("text-sm text-foreground", capitalize && "capitalize")}>{value}</dd>
                    </div>
                  ))}
                </dl>
                {campaign.description && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <dt className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Description</dt>
                    <dd className="text-sm text-muted-foreground leading-relaxed">{campaign.description}</dd>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Performance Tab */}
        {activeTab === "performance" && (
          <Card className="glass-panel border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-primary" /> Performance Metrics
                <span className="text-xs font-normal text-muted-foreground ml-1">(Simulated)</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {MOCK_METRICS.map((m) => {
                  const MIcon = m.icon;
                  return (
                    <div key={m.label} className="p-3 rounded-xl bg-muted/50 border border-border">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <MIcon className="w-3.5 h-3.5 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">{m.label}</p>
                      </div>
                      <div className="flex items-end gap-2">
                        <p className="text-xl font-bold text-foreground">{m.value}</p>
                        <p className={cn("text-xs pb-0.5", m.trend.startsWith("+") ? "text-emerald-600" : "text-rose-600")}>{m.trend}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Mini Bar Charts */}
              <div className="mt-6 pt-5 border-t border-border">
                <p className="text-sm font-medium text-muted-foreground mb-4">Weekly Trend — Leads Generated</p>
                <div className="flex items-end gap-2 h-24">
                  {[12, 18, 14, 22, 19, 28, 24].map((v, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full bg-primary/80 rounded-t-sm" style={{ height: `${(v / 28) * 80}px` }} />
                      <span className="text-xs text-muted-foreground">{["M","T","W","T","F","S","S"][i]}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Audience & Targeting Tab */}
        {activeTab === "audience" && (
          <div className="flex flex-col gap-4">
            <Card className="glass-panel border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" /> Audience & Targeting
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Target Segment */}
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Target Audience Segment</p>
                  <p className="text-sm text-foreground leading-relaxed">
                    {campaign.targetAudience ?? "B2B decision-makers in SaaS / Technology companies with 50–500 employees. Primarily VPs and Directors of Sales and Revenue Operations."}
                  </p>
                </div>

                {/* Demographics */}
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">Demographic Profile</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: "Industry", value: "SaaS / Tech" },
                      { label: "Company Size", value: "50–500 employees" },
                      { label: "Job Level", value: "VP / Director" },
                      { label: "Region", value: "North America" },
                    ].map((d) => (
                      <div key={d.label} className="p-3 rounded-xl bg-muted/50 border border-border">
                        <p className="text-xs text-muted-foreground mb-1">{d.label}</p>
                        <p className="text-sm font-medium text-foreground">{d.value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Channels */}
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">Channels Being Used</p>
                  <div className="flex flex-wrap gap-2">
                    {channels.map((ch) => {
                      const CIcon = CHANNEL_ICONS[ch.toLowerCase()] ?? Globe;
                      return (
                        <div key={ch} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-full">
                          <CIcon className="w-3.5 h-3.5 text-primary" />
                          <span className="text-sm text-primary font-medium">{ch}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Audience Size Estimate */}
                <div className="pt-4 border-t border-border">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">Estimated Reach</p>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "Addressable Audience", value: "42,500" },
                      { label: "Active Subscribers", value: "18,200" },
                      { label: "Lookalike Size", value: "95,000" },
                    ].map((r) => (
                      <div key={r.label} className="p-3 rounded-xl bg-muted/50 border border-border text-center">
                        <p className="text-xs text-muted-foreground mb-1">{r.label}</p>
                        <p className="text-xl font-bold text-foreground">{r.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Creatives / Assets Tab */}
        {activeTab === "creatives" && (
          <Card className="glass-panel border-border">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Image className="w-4 h-4 text-primary" /> Creatives / Assets
                </CardTitle>
                <Button size="sm" variant="outline" className="border-border text-xs gap-1.5">
                  <Layers className="w-3.5 h-3.5" /> Upload Asset
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {MOCK_CREATIVES.map((asset, i) => {
                  const AIcon = CREATIVE_ICONS[asset.type] ?? FileText;
                  return (
                    <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-muted/50 border border-border hover:bg-white/8 transition-colors group">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                        <AIcon className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{asset.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{asset.type} · {asset.size}</p>
                      </div>
                      <Badge variant="outline" className={cn("text-xs capitalize", {
                        "text-green-600 border-green-500/30": asset.status === "active",
                        "text-yellow-600 border-yellow-500/30": asset.status === "review",
                        "text-muted-foreground border-border": asset.status === "draft",
                      })}>
                        {asset.status}
                      </Badge>
                      <Button size="sm" variant="ghost" className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity h-7 px-2">
                        View
                      </Button>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wide">Document Templates</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {["Proposal Template", "Quote Template", "Follow-up Email", "NDA Template", "Campaign Brief"].map((doc) => (
                    <button key={doc} className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50 border border-border hover:border-primary/30 hover:bg-primary/5 transition-all text-left">
                      <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="text-xs text-muted-foreground hover:text-foreground transition-colors">{doc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Campaign Team Tab */}
        {activeTab === "team" && (
          <Card className="glass-panel border-border">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" /> Campaign Team
                </CardTitle>
                <Button size="sm" variant="outline" className="border-border text-xs gap-1.5">
                  <UserCheck className="w-3.5 h-3.5" /> Add Member
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {teamList.length === 0 ? (
                <div className="py-8 text-center">
                  <Users className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground text-sm">No team members assigned yet.</p>
                  <p className="text-xs text-muted-foreground mt-1">Edit the campaign to add team members.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {teamList.map((member, i) => {
                    const initials = member.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
                    return (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border">
                        <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-sm font-semibold text-primary">
                          {initials}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground">{member}</p>
                          <p className="text-xs text-muted-foreground">Campaign Team Member</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="mt-5 pt-5 border-t border-border">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">Responsibilities</p>
                <div className="space-y-2">
                  {[
                    { role: "Campaign Manager", desc: "Overall strategy and execution" },
                    { role: "Content Writer", desc: "Ad copy, emails, landing pages" },
                    { role: "Design Lead", desc: "Visual assets and branding" },
                    { role: "Analytics Lead", desc: "Tracking, reporting, optimisation" },
                  ].map((r) => (
                    <div key={r.role} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50 border border-border">
                      <p className="text-sm font-medium text-foreground">{r.role}</p>
                      <p className="text-xs text-muted-foreground">{r.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Edit Dialog */}
        <CampaignEditDialog
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
          campaign={campaign}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ["campaign", id] })}
        />

        {/* Delete Confirm */}
        <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <AlertDialogContent className="bg-card border-border text-foreground">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Campaign</AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground">
                This will permanently delete <strong className="text-foreground">{campaign.name}</strong>. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-border text-foreground hover:bg-muted/50">Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-foreground hover:bg-destructive/90"
                onClick={() => deleteMutation.mutate()}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
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
    goals: campaign.goals ?? "",
    targetAudience: campaign.targetAudience ?? "",
    channels: campaign.channels ?? "",
    teamMembers: campaign.teamMembers ?? "",
  });

  React.useEffect(() => {
    if (open) setForm({
      name: campaign.name, type: campaign.type, status: campaign.status,
      startDate: campaign.startDate?.slice(0, 10) ?? "", endDate: campaign.endDate?.slice(0, 10) ?? "",
      budget: campaign.budget?.toString() ?? "", actualCost: campaign.actualCost?.toString() ?? "",
      expectedRevenue: campaign.expectedRevenue?.toString() ?? "", description: campaign.description ?? "",
      goals: campaign.goals ?? "", targetAudience: campaign.targetAudience ?? "",
      channels: campaign.channels ?? "", teamMembers: campaign.teamMembers ?? "",
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

  const f = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [field]: e.target.value });
  const sc = "w-full h-9 px-3 rounded-md bg-muted border border-border text-foreground text-sm";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border text-foreground sm:max-w-[620px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Edit Campaign</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(form); }} className="space-y-4 py-2">
          {/* Basic Info */}
          <div className="space-y-1.5">
            <Label className="text-xs">Campaign Name *</Label>
            <Input required className="bg-muted border-border h-9" value={form.name} onChange={f("name")} />
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
            <div className="space-y-1.5"><Label className="text-xs">Start Date</Label><Input type="date" className="bg-muted border-border h-9" value={form.startDate} onChange={f("startDate")} /></div>
            <div className="space-y-1.5"><Label className="text-xs">End Date</Label><Input type="date" className="bg-muted border-border h-9" value={form.endDate} onChange={f("endDate")} /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5"><Label className="text-xs">Budget ($)</Label><Input type="number" className="bg-muted border-border h-9" value={form.budget} onChange={f("budget")} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Actual Cost ($)</Label><Input type="number" className="bg-muted border-border h-9" value={form.actualCost} onChange={f("actualCost")} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Expected Rev. ($)</Label><Input type="number" className="bg-muted border-border h-9" value={form.expectedRevenue} onChange={f("expectedRevenue")} /></div>
          </div>

          {/* Goals */}
          <div className="space-y-1.5"><Label className="text-xs">Campaign Goals</Label>
            <Input className="bg-muted border-border h-9" placeholder="e.g. Generate 50 MQLs, increase brand awareness" value={form.goals} onChange={f("goals")} />
          </div>

          {/* Description */}
          <div className="space-y-1.5"><Label className="text-xs">Description</Label>
            <textarea className="w-full px-3 py-2 rounded-md bg-muted border border-border text-foreground text-sm min-h-[70px] resize-none" value={form.description} onChange={f("description")} />
          </div>

          {/* Audience */}
          <div className="space-y-1.5"><Label className="text-xs">Target Audience</Label>
            <textarea className="w-full px-3 py-2 rounded-md bg-muted border border-border text-foreground text-sm min-h-[60px] resize-none"
              placeholder="e.g. B2B decision-makers in SaaS companies, 50-500 employees" value={form.targetAudience} onChange={f("targetAudience")} />
          </div>

          {/* Channels */}
          <div className="space-y-1.5"><Label className="text-xs">Channels (comma-separated)</Label>
            <Input className="bg-muted border-border h-9" placeholder="e.g. Email, LinkedIn, Google Ads" value={form.channels} onChange={f("channels")} />
          </div>

          {/* Team Members */}
          <div className="space-y-1.5"><Label className="text-xs">Campaign Team (comma-separated names)</Label>
            <Input className="bg-muted border-border h-9" placeholder="e.g. Sarah Johnson, Mike Chen, Lisa Park" value={form.teamMembers} onChange={f("teamMembers")} />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="border-border">Cancel</Button>
            <Button type="submit" disabled={mutation.isPending} className="bg-primary hover:bg-primary/90 text-foreground">
              {mutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
