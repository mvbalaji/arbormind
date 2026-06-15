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
  Radio, Link2, Webhook, Flame, Activity, Send, MessageSquare,
  Upload, UserPlus, Search, XCircle, Filter, Download, RefreshCw,
  Database, ChevronDown, AlertTriangle, Plus, Trash,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { useCurrency } from "@/context/currency";
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
  launchedAt: string | null;
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
  { label: "CPC", base: 4.2, value: "", trend: "-8%", icon: DollarSign },
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

type Tab = "overview" | "performance" | "audience" | "creatives" | "team" | "tracking" | "members";

export default function CampaignDetail() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { format: fmtMoney } = useCurrency();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isLaunchOpen, setIsLaunchOpen] = useState(false);
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

  const launchMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/campaigns/${id}/launch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "Failed to launch");
      }
      return res.json() as Promise<{
        campaign: Campaign;
        launchedAt: string;
        notifiedCount: number;
        emailResults: Array<{ name: string; email: string; status: string }>;
        smtpConfigured: boolean;
      }>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["campaign", id] });
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      setIsLaunchOpen(false);
      const notifMsg = data.smtpConfigured
        ? data.notifiedCount > 0 ? `${data.notifiedCount} team member${data.notifiedCount !== 1 ? "s" : ""} notified by email.` : "No team members found to notify."
        : "SMTP not configured — team not emailed.";
      toast({ title: "🚀 Campaign is live!", description: notifMsg });
    },
    onError: (err) => toast({ title: "Launch failed", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" }),
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

  // Engagement tracking data — fetched lazily when Tracking tab is visible
  const engStatsQuery = useQuery({
    queryKey: ["campaign-engagements", "stats", id],
    queryFn: async () => {
      const r = await fetch(`/api/campaign-engagements/stats?campaignId=${id}`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed");
      return r.json() as Promise<{
        totals: { totalEvents: number; totalScore: number; identifiedLeads: number; uniquePlatforms: number };
        byPlatform: Array<{ platform: string; count: number; totalScore: number }>;
        byCategory: Array<{ category: string; count: number }>;
        byEventType: Array<{ eventType: string; count: number; totalScore: number }>;
        dailyTrend: Array<{ day: string; count: number; score: number }>;
      }>;
    },
    enabled: !!id && activeTab === "tracking",
  });

  const engListQuery = useQuery({
    queryKey: ["campaign-engagements", "list", id],
    queryFn: async () => {
      const r = await fetch(`/api/campaign-engagements?campaignId=${id}&limit=30`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed");
      return r.json() as Promise<{
        data: Array<{
          id: number; platform: string; eventType: string; engagementScore: number;
          interestCategory: string; platformUserName: string | null; platformUserEmail: string | null;
          leadId: number | null; occurredAt: string; utmSource: string | null; utmCampaign: string | null;
        }>;
      }>;
    },
    enabled: !!id && activeTab === "tracking",
  });

  // ── Members tab state ────────────────────────────────
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isImportCSVOpen, setIsImportCSVOpen] = useState(false);
  const [isAddContactOpen, setIsAddContactOpen] = useState(false);
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [memberStatusFilter, setMemberStatusFilter] = useState("");

  interface CampaignMemberRow {
    id: number; campaignId: number; contactId: number | null; leadId: number | null;
    firstName: string; lastName: string; email: string; companyName: string | null;
    role: string | null; status: string; source: string;
    sentAt: string | null; openedAt: string | null; clickedAt: string | null;
    bouncedAt: string | null; unsubscribedAt: string | null; createdAt: string;
  }
  interface MembersResponse {
    data: CampaignMemberRow[];
    total: number;
    stats: { total: number; pending: number; sent: number; opened: number; clicked: number; bounced: number; unsubscribed: number };
  }

  const membersQuery = useQuery<MembersResponse>({
    queryKey: ["campaign-members", id, memberSearch, memberStatusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (memberSearch) params.set("search", memberSearch);
      if (memberStatusFilter) params.set("status", memberStatusFilter);
      const r = await fetch(`/api/campaigns/${id}/members?${params}`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed to load members");
      return r.json() as Promise<MembersResponse>;
    },
    enabled: !!id && activeTab === "members",
  });

  const addMemberMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const r = await fetch(`/api/campaigns/${id}/members`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include", body: JSON.stringify(payload),
      });
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error((e as { error?: string }).error ?? "Failed"); }
      return r.json();
    },
    onSuccess: () => {
      toast({ title: "Member added" });
      queryClient.invalidateQueries({ queryKey: ["campaign-members", id] });
      setIsAddMemberOpen(false);
      setIsAddContactOpen(false);
      setIsAddLeadOpen(false);
    },
    onError: (e) => toast({ title: "Error", description: e instanceof Error ? e.message : "Could not add member", variant: "destructive" }),
  });

  const importMembersMutation = useMutation({
    mutationFn: async (csv: string) => {
      const r = await fetch(`/api/campaigns/${id}/members/import`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include", body: JSON.stringify({ csv }),
      });
      if (!r.ok) throw new Error("Import failed");
      return r.json() as Promise<{ imported: number; skipped: number; errors: string[] }>;
    },
    onSuccess: (data) => {
      toast({ title: `Imported ${data.imported} member${data.imported !== 1 ? "s" : ""}`, description: data.skipped ? `${data.skipped} rows skipped` : undefined });
      queryClient.invalidateQueries({ queryKey: ["campaign-members", id] });
      setIsImportCSVOpen(false);
    },
    onError: (e) => toast({ title: "Import failed", description: e instanceof Error ? e.message : "Unknown error", variant: "destructive" }),
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: number) => {
      const r = await fetch(`/api/campaigns/${id}/members/${memberId}`, { method: "DELETE", credentials: "include" });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => {
      toast({ title: "Member removed" });
      queryClient.invalidateQueries({ queryKey: ["campaign-members", id] });
    },
    onError: () => toast({ title: "Error", description: "Could not remove member", variant: "destructive" }),
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
    { id: "tracking", label: "📡 Tracking & Channels" },
    { id: "members", label: "👥 Members" },
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
                      <Button size="sm" className="gap-1.5 bg-green-600 hover:bg-green-700 text-foreground" onClick={() => setIsLaunchOpen(true)}>
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
            <p className="text-xl font-bold text-foreground">{campaign.budget ? fmtMoney(campaign.budget) : "—"}</p>
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
            <p className="text-xl font-bold text-foreground">{campaign.expectedRevenue ? fmtMoney(campaign.expectedRevenue) : "—"}</p>
          </Card>
          <Card className="glass-panel border-border p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1"><Target className="w-3 h-3" /> ROI (Projected)</p>
            <p className={cn("text-xl font-bold", roi && parseInt(roi) > 0 ? "text-emerald-600" : roi && parseInt(roi) < 0 ? "text-rose-600" : "text-foreground")}>
              {roi ? `${roi}%` : "—"}
            </p>
          </Card>
          <Card className="glass-panel border-border p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1"><Clock className="w-3 h-3" /> Actual Cost</p>
            <p className="text-xl font-bold text-foreground">{campaign.actualCost ? fmtMoney(campaign.actualCost) : "—"}</p>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex gap-0.5 border-b border-border overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-3 py-1 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap",
                activeTab === tab.id ? "border-primary text-primary" : "border-transparent bg-sky-100 text-sky-700 hover:bg-sky-200"
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
                        <p className="text-xl font-bold text-foreground">{"base" in m ? fmtMoney(m.base) : m.value}</p>
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
                        <div key={ch} className="flex items-center gap-1.5 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full">
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
                      <div className="w-10 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
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
                  <Users className="w-10 h-8 mx-auto text-muted-foreground/30 mb-3" />
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

        {/* Tracking & Channels Tab */}
        {activeTab === "tracking" && (() => {
          const campaignSlug = campaign.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
          const baseUrl = "https://arbormind.in";
          const apiOrigin = window.location.origin;

          const PLATFORMS = [
            { id: "linkedin",  label: "LinkedIn",  color: "bg-blue-600", medium: "social",
              webhook: `${apiOrigin}/api/webhooks/linkedin`,
              steps: ["Go to LinkedIn Campaign Manager → Settings → Webhooks.", "Add this URL as your webhook endpoint.", "Select events: Share, Comment, Reaction, Lead Gen Form Submit.", "Save and verify — LinkedIn sends a challenge GET request automatically."] },
            { id: "instagram", label: "Instagram", color: "bg-pink-600", medium: "social",
              webhook: `${apiOrigin}/api/webhooks/meta`,
              steps: ["Open Meta Business Suite → Settings → Webhooks → Instagram.", "Add this URL. Verify token: arbormind_meta_verify.", "Subscribe to: messages, story_insights, comments, mentions.", "Use Meta Lead Ads to capture form fills automatically."] },
            { id: "facebook",  label: "Facebook",  color: "bg-sky-600",  medium: "paid_social",
              webhook: `${apiOrigin}/api/webhooks/meta`,
              steps: ["Open Meta for Developers → your App → Webhooks → Page.", "Add this URL. Verify token: arbormind_meta_verify.", "Subscribe to: messages, feed, leadgen.", "For Lead Ads: subscribe to leadgen field — instant notifications on form fills."] },
            { id: "telegram",  label: "Telegram",  color: "bg-cyan-500", medium: "messaging",
              webhook: `${apiOrigin}/api/webhooks/telegram`,
              steps: ["Create a bot via @BotFather and get the bot token.", `Call: https://api.telegram.org/bot<TOKEN>/setWebhook?url=${encodeURIComponent(apiOrigin + "/api/webhooks/telegram")}`, "Every message sent to your bot is now captured as an engagement.", "No secret token needed — Telegram uses the URL for security."] },
            { id: "whatsapp",  label: "WhatsApp",  color: "bg-green-600", medium: "messaging",
              webhook: `${apiOrigin}/api/webhooks/whatsapp`,
              steps: ["Open Meta for Developers → your App → WhatsApp → Configuration.", "Add this URL as Webhook URL. Verify token: arbormind_wa_verify.", "Subscribe to: messages.", "Every inbound WhatsApp message to your business number is captured."] },
          ];

          const copyToClipboard = (text: string) => {
            navigator.clipboard.writeText(text).then(() => toast({ title: "Copied to clipboard" }));
          };

          const stats = engStatsQuery.data;
          const events = engListQuery.data?.data ?? [];

          const CATEGORY_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
            hot:  { label: "Hot Prospect",  color: "text-rose-600 bg-rose-500/10 border-rose-200",   icon: Flame },
            warm: { label: "Warm Engager",  color: "text-amber-600 bg-amber-500/10 border-amber-200", icon: Activity },
            cold: { label: "Cold Viewer",   color: "text-sky-600 bg-sky-500/10 border-sky-200",       icon: Radio },
          };

          const EVENT_ICONS: Record<string, React.ElementType> = {
            message: MessageSquare, form_submit: Send, link_click: Link2, comment: MessageSquare,
            share: Activity, reaction: Activity, view: Radio, ad_impression: Radio,
            button_click: MousePointerClick, page_view: Globe, story_view: Radio, profile_visit: Users,
          };

          const PLATFORM_DOT: Record<string, string> = {
            linkedin: "bg-blue-500", instagram: "bg-pink-500", facebook: "bg-sky-500",
            telegram: "bg-cyan-500", whatsapp: "bg-green-500", website: "bg-purple-500",
          };

          return (
            <div className="flex flex-col gap-5">

              {/* ── Engagement KPIs ── */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Total Events", value: stats?.totals.totalEvents ?? 0, icon: Activity, color: "text-purple-600 bg-purple-500/10" },
                  { label: "Engagement Score", value: stats?.totals.totalScore ?? 0, icon: Flame, color: "text-rose-600 bg-rose-500/10" },
                  { label: "Identified Leads", value: stats?.totals.identifiedLeads ?? 0, icon: Users, color: "text-emerald-600 bg-emerald-500/10" },
                  { label: "Active Channels", value: stats?.totals.uniquePlatforms ?? 0, icon: Radio, color: "text-sky-600 bg-sky-500/10" },
                ].map((kpi) => {
                  const KIcon = kpi.icon;
                  return (
                    <Card key={kpi.label} className="glass-panel border-border p-4">
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mb-2", kpi.color)}>
                        <KIcon className="w-4 h-4" />
                      </div>
                      <p className="text-2xl font-bold text-foreground">{engStatsQuery.isLoading ? "…" : kpi.value.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{kpi.label}</p>
                    </Card>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

                {/* ── Channel Breakdown ── */}
                <Card className="glass-panel border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <BarChart2 className="w-4 h-4 text-primary" /> Engagement by Channel
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {engStatsQuery.isLoading ? (
                      <div className="space-y-2">{Array.from({length: 4}).map((_,i) => <div key={i} className="h-8 bg-muted/50 rounded animate-pulse" />)}</div>
                    ) : (stats?.byPlatform ?? []).length === 0 ? (
                      <p className="text-xs text-muted-foreground py-4 text-center">No engagement events captured yet.</p>
                    ) : (
                      <div className="space-y-3">
                        {(stats?.byPlatform ?? []).map((p) => {
                          const max = Math.max(...(stats?.byPlatform ?? []).map(x => x.count), 1);
                          return (
                            <div key={p.platform}>
                              <div className="flex justify-between text-xs mb-1">
                                <span className="capitalize font-medium text-foreground">{p.platform}</span>
                                <span className="text-muted-foreground">{p.count} events · score {p.totalScore}</span>
                              </div>
                              <div className="w-full bg-muted/50 rounded-full h-2">
                                <div
                                  className={cn("h-2 rounded-full", PLATFORM_DOT[p.platform]?.replace("bg-", "bg-") ?? "bg-primary")}
                                  style={{ width: `${(p.count / max) * 100}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* ── Interest Distribution ── */}
                <Card className="glass-panel border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Flame className="w-4 h-4 text-primary" /> Interest Classification
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {(["hot", "warm", "cold"] as const).map((cat) => {
                        const cfg = CATEGORY_CONFIG[cat];
                        const CIcon = cfg.icon;
                        const found = stats?.byCategory.find(c => c.category === cat);
                        const count = found?.count ?? 0;
                        const total = stats?.totals.totalEvents ?? 1;
                        return (
                          <div key={cat} className={cn("flex items-center gap-3 p-3 rounded-xl border text-sm", cfg.color)}>
                            <CIcon className="w-4 h-4 shrink-0" />
                            <div className="flex-1">
                              <div className="font-medium">{cfg.label}</div>
                              <div className="text-xs opacity-70">{count} {count === 1 ? "event" : "events"} · score threshold: {cat === "hot" ? "≥15" : cat === "warm" ? "5–14" : "1–4"}</div>
                            </div>
                            <div className="font-bold text-lg">{engStatsQuery.isLoading ? "…" : count}</div>
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-xs text-muted-foreground mt-4 leading-relaxed">
                      Interest scores are calculated from engagement type: message (15), form submit (20), link click (5), reaction (4), comment (8), view (2).
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* ── UTM Link Generator ── */}
              <Card className="glass-panel border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Link2 className="w-4 h-4 text-primary" /> Campaign Tracking Links (UTM)
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    Use these links in your posts, ads, and bio. Every click is automatically attributed to this campaign and captured in the CRM.
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {PLATFORMS.map((p) => {
                      const link = `${baseUrl}/?utm_source=${p.id}&utm_medium=${p.medium}&utm_campaign=${campaignSlug}&utm_content=post`;
                      return (
                        <div key={p.id} className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50 border border-border">
                          <div className={cn("w-2 h-2 rounded-full shrink-0", p.color)} />
                          <span className="text-xs font-medium text-foreground w-20 shrink-0">{p.label}</span>
                          <code className="flex-1 text-xs text-muted-foreground font-mono truncate">{link}</code>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 shrink-0" onClick={() => copyToClipboard(link)} title="Copy link">
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-3 p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs text-muted-foreground">
                    <strong className="text-foreground">How it works:</strong> When someone clicks your campaign link, the UTM parameters are captured by the website pixel and stored against the visit. The CRM shows you which campaign, platform, and ad content drove each website visit.
                  </div>
                </CardContent>
              </Card>

              {/* ── Webhook Configuration ── */}
              <Card className="glass-panel border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Webhook className="w-4 h-4 text-primary" /> Webhook Endpoints
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    Configure these webhook URLs in each platform to capture direct interactions (messages, reactions, lead form fills) — even when users don't visit your website.
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {PLATFORMS.map((p) => (
                      <div key={p.id} className="rounded-xl border border-border overflow-hidden">
                        <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border-b border-border">
                          <div className={cn("w-2 h-2 rounded-full", p.color)} />
                          <span className="text-sm font-semibold text-foreground">{p.label}</span>
                        </div>
                        <div className="p-3 space-y-2">
                          <div className="flex items-center gap-2">
                            <code className="flex-1 text-xs font-mono text-muted-foreground bg-muted/50 px-2 py-1.5 rounded truncate">{p.webhook}</code>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 shrink-0" onClick={() => copyToClipboard(p.webhook)} title="Copy URL">
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          <ol className="space-y-1">
                            {p.steps.map((step, si) => (
                              <li key={si} className="flex gap-2 text-xs text-muted-foreground">
                                <span className="text-primary font-medium shrink-0">{si + 1}.</span>
                                <span>{step}</span>
                              </li>
                            ))}
                          </ol>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 p-3 rounded-lg bg-amber-500/5 border border-amber-200/50 text-xs text-muted-foreground">
                    <strong className="text-foreground">Privacy note:</strong> Platform webhooks only deliver identifiable signals when the user takes an action (sends a message, fills a form, clicks a link). Anonymous post views and ad impressions are not identified — they appear as aggregated counts only.
                  </div>
                </CardContent>
              </Card>

              {/* ── Live Engagement Feed ── */}
              <Card className="glass-panel border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Activity className="w-4 h-4 text-primary" /> Recent Engagement Events
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {engListQuery.isLoading ? (
                    <div className="space-y-2">{Array.from({length:5}).map((_,i) => <div key={i} className="h-10 bg-muted/50 rounded animate-pulse"/>)}</div>
                  ) : events.length === 0 ? (
                    <div className="py-10 text-center text-muted-foreground">
                      <Radio className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No engagement events captured yet.</p>
                      <p className="text-xs mt-1">Set up your webhook endpoints and UTM links above to start tracking.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {events.map((ev) => {
                        const cfg = CATEGORY_CONFIG[ev.interestCategory] ?? CATEGORY_CONFIG.cold;
                        const CIcon = cfg.icon;
                        const EIcon = EVENT_ICONS[ev.eventType] ?? Activity;
                        const dot = PLATFORM_DOT[ev.platform] ?? "bg-muted-foreground";
                        const identity = ev.platformUserName ?? ev.platformUserEmail ?? (ev.leadId ? `Lead #${ev.leadId}` : "Anonymous");
                        return (
                          <div key={ev.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/40 border border-border hover:bg-muted/60 transition-colors">
                            <div className={cn("w-2 h-2 rounded-full shrink-0", dot)} title={ev.platform} />
                            <EIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <div className="flex-1 min-w-0">
                              <span className="text-xs font-medium text-foreground capitalize">{ev.eventType.replace(/_/g, " ")}</span>
                              <span className="text-xs text-muted-foreground ml-2 capitalize">{ev.platform}</span>
                              {identity !== "Anonymous" && <span className="text-xs text-muted-foreground ml-2">· {identity}</span>}
                            </div>
                            <span className={cn("inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium shrink-0", cfg.color)}>
                              <CIcon className="w-3 h-3" />
                              {cfg.label.split(" ")[0]}
                            </span>
                            <span className="text-xs text-muted-foreground shrink-0 tabular-nums w-24 text-right">
                              {format(new Date(ev.occurredAt), "d MMM, HH:mm")}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

            </div>
          );
        })()}

        {/* ── Members tab ─────────────────────────────────── */}
        {activeTab === "members" && (() => {
          const members = membersQuery.data?.data ?? [];
          const stats = membersQuery.data?.stats ?? { total: 0, pending: 0, sent: 0, opened: 0, clicked: 0, bounced: 0, unsubscribed: 0 };

          const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
            pending:     { label: "Pending",     color: "text-amber-400",  bg: "bg-amber-400/10" },
            sent:        { label: "Sent",         color: "text-blue-400",   bg: "bg-blue-400/10" },
            opened:      { label: "Opened",       color: "text-emerald-400",bg: "bg-emerald-400/10" },
            clicked:     { label: "Clicked",      color: "text-violet-400", bg: "bg-violet-400/10" },
            bounced:     { label: "Bounced",      color: "text-red-400",    bg: "bg-red-400/10" },
            unsubscribed:{ label: "Unsubscribed", color: "text-zinc-400",   bg: "bg-zinc-400/10" },
          };

          const sourceLabel: Record<string, string> = {
            manual: "Manual", csv_import: "CSV", contact_search: "Contact", lead_search: "Lead",
          };

          // Segmentation summaries
          const byCompany = Object.entries(
            members.reduce<Record<string, number>>((acc, m) => {
              const k = m.companyName || "—";
              acc[k] = (acc[k] ?? 0) + 1;
              return acc;
            }, {})
          ).sort((a, b) => b[1] - a[1]).slice(0, 8);

          const byRole = Object.entries(
            members.reduce<Record<string, number>>((acc, m) => {
              const k = m.role || "—";
              acc[k] = (acc[k] ?? 0) + 1;
              return acc;
            }, {})
          ).sort((a, b) => b[1] - a[1]).slice(0, 8);

          const statCards = [
            { label: "Total", value: stats.total, color: "text-foreground",   dot: "bg-foreground/40" },
            { label: "Pending",  value: stats.pending,  color: "text-amber-400",  dot: "bg-amber-400" },
            { label: "Sent",     value: stats.sent,     color: "text-blue-400",   dot: "bg-blue-400" },
            { label: "Opened",   value: stats.opened,   color: "text-emerald-400",dot: "bg-emerald-400" },
            { label: "Clicked",  value: stats.clicked,  color: "text-violet-400", dot: "bg-violet-400" },
            { label: "Bounced",  value: stats.bounced,  color: "text-red-400",    dot: "bg-red-400" },
            { label: "Unsub.",   value: stats.unsubscribed, color: "text-zinc-400", dot: "bg-zinc-400" },
          ];

          return (
            <div className="flex flex-col gap-5">
              {/* Stats row */}
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                {statCards.map(s => (
                  <Card key={s.label} className="bg-card/60 border-border/60 p-3 flex flex-col items-center gap-0.5">
                    <div className={`text-2xl font-bold tabular-nums ${s.color}`}>{s.value}</div>
                    <div className="flex items-center gap-1">
                      <div className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                      <span className="text-[11px] text-muted-foreground">{s.label}</span>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Action bar */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setIsAddMemberOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  <UserPlus className="w-3.5 h-3.5" /> Add Manually
                </button>
                <button
                  onClick={() => setIsAddContactOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-muted border border-border text-foreground text-sm hover:bg-muted/70 transition-colors"
                >
                  <Users className="w-3.5 h-3.5" /> Add from Contacts
                </button>
                <button
                  onClick={() => setIsAddLeadOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-muted border border-border text-foreground text-sm hover:bg-muted/70 transition-colors"
                >
                  <Target className="w-3.5 h-3.5" /> Add from Leads
                </button>
                <button
                  onClick={() => setIsImportCSVOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-muted border border-border text-foreground text-sm hover:bg-muted/70 transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" /> Import CSV
                </button>
                <div className="ml-auto flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      value={memberSearch}
                      onChange={e => setMemberSearch(e.target.value)}
                      placeholder="Search members…"
                      className="pl-8 pr-3 py-1.5 rounded-md bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary/50 w-48"
                    />
                  </div>
                  <select
                    value={memberStatusFilter}
                    onChange={e => setMemberStatusFilter(e.target.value)}
                    className="px-2 py-1.5 rounded-md bg-muted border border-border text-sm text-foreground outline-none"
                  >
                    <option value="">All Statuses</option>
                    {Object.entries(statusConfig).map(([v, c]) => (
                      <option key={v} value={v}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Segmentation */}
              {members.length > 0 && (
                <Card className="bg-card/60 border-border/60">
                  <CardContent className="p-4 flex flex-col gap-3">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Segmentation</div>
                    <div className="flex flex-wrap gap-4">
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[11px] text-muted-foreground font-medium">By Company</span>
                        <div className="flex flex-wrap gap-1">
                          {byCompany.map(([name, count]) => (
                            <span key={name} className="px-2 py-0.5 rounded-full bg-muted border border-border/60 text-xs text-foreground">
                              {name} <span className="text-muted-foreground">({count})</span>
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[11px] text-muted-foreground font-medium">By Role</span>
                        <div className="flex flex-wrap gap-1">
                          {byRole.map(([name, count]) => (
                            <span key={name} className="px-2 py-0.5 rounded-full bg-muted border border-border/60 text-xs text-foreground">
                              {name} <span className="text-muted-foreground">({count})</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Members table */}
              <Card className="bg-card/60 border-border/60">
                <CardContent className="p-0">
                  {membersQuery.isLoading ? (
                    <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">Loading members…</div>
                  ) : members.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                        <Users className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="font-medium text-foreground">No members yet</div>
                        <div className="text-sm text-muted-foreground mt-0.5">Add contacts, leads, or import a CSV to populate your campaign audience</div>
                      </div>
                      <div className="flex gap-2 mt-1">
                        <button onClick={() => setIsAddMemberOpen(true)} className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">+ Add Manually</button>
                        <button onClick={() => setIsImportCSVOpen(true)} className="px-3 py-1.5 rounded-md bg-muted border border-border text-sm text-foreground hover:bg-muted/70">Import CSV</button>
                      </div>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border/60 bg-muted/30">
                            <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Name</th>
                            <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Email</th>
                            <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Company</th>
                            <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Role</th>
                            <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Source</th>
                            <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                            <th className="px-4 py-2.5" />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/40">
                          {members.map(m => {
                            const initials = `${m.firstName[0] ?? ""}${m.lastName[0] ?? ""}`.toUpperCase();
                            const sc = statusConfig[m.status] ?? { label: m.status, color: "text-muted-foreground", bg: "bg-muted" };
                            return (
                              <tr key={m.id} className="hover:bg-muted/20 transition-colors">
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                                      <span className="text-[10px] font-bold text-primary">{initials}</span>
                                    </div>
                                    <span className="font-medium text-foreground">{m.firstName} {m.lastName}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{m.email}</td>
                                <td className="px-4 py-3 text-muted-foreground">{m.companyName || <span className="text-muted-foreground/50">—</span>}</td>
                                <td className="px-4 py-3 text-muted-foreground">{m.role || <span className="text-muted-foreground/50">—</span>}</td>
                                <td className="px-4 py-3">
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted border border-border/60 text-muted-foreground">
                                    {sourceLabel[m.source] ?? m.source}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${sc.color} ${sc.bg}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${sc.color.replace("text-", "bg-")}`} />
                                    {sc.label}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <button
                                    onClick={() => removeMemberMutation.mutate(m.id)}
                                    disabled={removeMemberMutation.isPending}
                                    className="p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
                                    title="Remove member"
                                  >
                                    <Trash className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      <div className="px-4 py-2.5 border-t border-border/40 text-xs text-muted-foreground">
                        {stats.total} member{stats.total !== 1 ? "s" : ""} total
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Dialogs */}
              <AddMemberManuallyDialog
                open={isAddMemberOpen}
                onOpenChange={setIsAddMemberOpen}
                onAdd={(payload) => addMemberMutation.mutate(payload)}
                isPending={addMemberMutation.isPending}
              />
              <AddFromContactsDialog
                open={isAddContactOpen}
                onOpenChange={setIsAddContactOpen}
                onAdd={(contactId) => addMemberMutation.mutate({ contactId })}
                isPending={addMemberMutation.isPending}
              />
              <AddFromLeadsDialog
                open={isAddLeadOpen}
                onOpenChange={setIsAddLeadOpen}
                onAdd={(leadId) => addMemberMutation.mutate({ leadId })}
                isPending={addMemberMutation.isPending}
              />
              <ImportCSVDialog
                open={isImportCSVOpen}
                onOpenChange={setIsImportCSVOpen}
                onImport={(csv) => importMembersMutation.mutate(csv)}
                isPending={importMembersMutation.isPending}
              />
            </div>
          );
        })()}

        {/* Launch Dialog */}
        <LaunchCampaignDialog
          open={isLaunchOpen}
          onOpenChange={setIsLaunchOpen}
          campaign={campaign}
          onConfirm={() => launchMutation.mutate()}
          isPending={launchMutation.isPending}
        />

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
  const isLocked = ["active", "completed"].includes(campaign.status);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border text-foreground sm:max-w-[620px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Edit Campaign</DialogTitle>
        </DialogHeader>

        {isLocked && (
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-amber-500/8 border border-amber-200/50 text-xs text-amber-700 mb-1">
            <Flag className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span><strong>Campaign is {campaign.status}.</strong> Core fields (type, budget, dates, channels) are locked. You can still edit goals, description, audience, and team.</span>
          </div>
        )}

        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(form); }} className="space-y-4 py-2">
          {/* Basic Info */}
          <div className="space-y-1.5">
            <Label className="text-xs">Campaign Name *</Label>
            <Input required className="bg-muted border-border h-9" value={form.name} onChange={f("name")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-xs">Type {isLocked && <span className="text-amber-600 ml-1">🔒</span>}</Label>
              <select className={cn(sc, isLocked && "opacity-50 cursor-not-allowed")} value={form.type} onChange={f("type")} disabled={isLocked}>
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
            <div className="space-y-1.5"><Label className="text-xs">Start Date {isLocked && <span className="text-amber-600 ml-1">🔒</span>}</Label><Input type="date" className="bg-muted border-border h-9 disabled:opacity-50 disabled:cursor-not-allowed" value={form.startDate} onChange={f("startDate")} disabled={isLocked} /></div>
            <div className="space-y-1.5"><Label className="text-xs">End Date</Label><Input type="date" className="bg-muted border-border h-9" value={form.endDate} onChange={f("endDate")} /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5"><Label className="text-xs">Budget (£) {isLocked && <span className="text-amber-600 ml-1">🔒</span>}</Label><Input type="number" className="bg-muted border-border h-9 disabled:opacity-50 disabled:cursor-not-allowed" value={form.budget} onChange={f("budget")} disabled={isLocked} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Actual Cost (£)</Label><Input type="number" className="bg-muted border-border h-9" value={form.actualCost} onChange={f("actualCost")} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Expected Rev. (£)</Label><Input type="number" className="bg-muted border-border h-9" value={form.expectedRevenue} onChange={f("expectedRevenue")} /></div>
          </div>

          {/* Goals */}
          <div className="space-y-1.5"><Label className="text-xs">Campaign Goals</Label>
            <Input className="bg-muted border-border h-9" placeholder="e.g. Generate 50 MQLs, increase brand awareness" value={form.goals} onChange={f("goals")} />
          </div>

          {/* Description */}
          <div className="space-y-1.5"><Label className="text-xs">Description</Label>
            <textarea className="w-full px-3 py-1 rounded-md bg-muted border border-border text-foreground text-sm min-h-[70px] resize-none" value={form.description} onChange={f("description")} />
          </div>

          {/* Audience */}
          <div className="space-y-1.5"><Label className="text-xs">Target Audience</Label>
            <textarea className="w-full px-3 py-1 rounded-md bg-muted border border-border text-foreground text-sm min-h-[60px] resize-none"
              placeholder="e.g. B2B decision-makers in SaaS companies, 50-500 employees" value={form.targetAudience} onChange={f("targetAudience")} />
          </div>

          {/* Channels */}
          <div className="space-y-1.5"><Label className="text-xs">Channels (comma-separated) {isLocked && <span className="text-amber-600 ml-1">🔒</span>}</Label>
            <Input className="bg-muted border-border h-9 disabled:opacity-50 disabled:cursor-not-allowed" placeholder="e.g. Email, LinkedIn, Google Ads" value={form.channels} onChange={f("channels")} disabled={isLocked} />
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

/* ============================================================
 * LaunchCampaignDialog — pre-flight checklist + confirm launch
 * ========================================================== */
function LaunchCampaignDialog({
  open, onOpenChange, campaign, onConfirm, isPending,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  campaign: Campaign;
  onConfirm: () => void;
  isPending: boolean;
}) {
  const teamList = (campaign.teamMembers ?? "")
    .split(",").map((n) => n.trim()).filter(Boolean);
  const channels = (campaign.channels ?? "")
    .split(",").map((c) => c.trim()).filter(Boolean);

  const checks: Array<{ label: string; ok: boolean; warn?: string }> = [
    { label: "Campaign name set", ok: !!campaign.name },
    { label: "Campaign type defined", ok: !!campaign.type },
    { label: "Budget configured", ok: !!campaign.budget, warn: "No budget set — campaign may overspend without a limit." },
    { label: "Start date set", ok: !!campaign.startDate, warn: "No start date — tracking reports won't have a baseline." },
    { label: "Channels specified", ok: channels.length > 0, warn: "No channels defined — add them in Edit before launching." },
    { label: "Goals defined", ok: !!campaign.goals, warn: "No goals set — success will be hard to measure." },
    { label: "Team members assigned", ok: teamList.length > 0, warn: "No team assigned — notifications won't go out to anyone." },
  ];

  const allOk = checks.every((c) => c.ok);
  const warnings = checks.filter((c) => !c.ok && c.warn);

  const fmtDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border text-foreground sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <Play className="w-5 h-5 text-green-500" /> Launch Campaign
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">

          {/* Campaign Summary */}
          <div className="rounded-xl bg-muted/50 border border-border p-4 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Campaign Summary</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {[
                ["Name", campaign.name],
                ["Type", campaign.type.charAt(0).toUpperCase() + campaign.type.slice(1)],
                ["Budget", campaign.budget ? `£${Number(campaign.budget).toLocaleString()}` : "Not set"],
                ["Start Date", fmtDate(campaign.startDate)],
                ["End Date", fmtDate(campaign.endDate)],
                ["Channels", channels.length > 0 ? channels.join(", ") : "—"],
              ].map(([k, v]) => (
                <div key={k}>
                  <p className="text-xs text-muted-foreground">{k}</p>
                  <p className="font-medium text-foreground truncate">{v}</p>
                </div>
              ))}
            </div>
            {campaign.goals && (
              <div>
                <p className="text-xs text-muted-foreground">Goals</p>
                <p className="text-sm text-foreground">{campaign.goals}</p>
              </div>
            )}
          </div>

          {/* Pre-flight Checklist */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Pre-flight Checklist</p>
            <div className="space-y-1.5">
              {checks.map((c) => (
                <div key={c.label} className={cn(
                  "flex items-start gap-2 px-3 py-2 rounded-lg text-sm",
                  c.ok ? "bg-green-500/5 border border-green-200/40" : "bg-amber-500/5 border border-amber-200/50",
                )}>
                  {c.ok
                    ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                    : <Flag className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />}
                  <div>
                    <span className={c.ok ? "text-foreground" : "text-amber-700 font-medium"}>{c.label}</span>
                    {!c.ok && c.warn && <p className="text-xs text-muted-foreground mt-0.5">{c.warn}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Team notification */}
          <div className={cn(
            "rounded-xl p-3 border text-sm",
            teamList.length > 0
              ? "bg-blue-500/5 border-blue-200/40"
              : "bg-muted/50 border-border",
          )}>
            <div className="flex items-center gap-2 font-medium text-foreground mb-1">
              <Mail className="w-4 h-4 text-blue-500" />
              Team Notifications
            </div>
            {teamList.length > 0 ? (
              <>
                <p className="text-xs text-muted-foreground mb-2">
                  The following team members will receive a launch notification email:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {teamList.map((m) => (
                    <span key={m} className="inline-flex items-center gap-1 text-xs bg-blue-500/10 border border-blue-200/40 text-blue-700 px-2 py-0.5 rounded-full">
                      <Users className="w-3 h-3" />{m}
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">No team members assigned — no emails will be sent.</p>
            )}
          </div>

          {/* Webhook reminder */}
          <div className="rounded-xl p-3 border border-amber-200/40 bg-amber-500/5 text-xs text-muted-foreground">
            <div className="flex items-center gap-2 font-medium text-amber-700 mb-1">
              <Webhook className="w-3.5 h-3.5" /> Webhook Setup
            </div>
            Once live, go to the <strong className="text-foreground">📡 Tracking &amp; Channels</strong> tab to copy your webhook URLs and configure each platform. Engagements won't be tracked until webhooks are connected.
          </div>

          {/* Lock notice */}
          <div className="text-xs text-muted-foreground flex items-start gap-2 px-2">
            <Flag className="w-3.5 h-3.5 shrink-0 mt-0.5 text-muted-foreground" />
            After launch, core fields (type, budget, start date, channels) will be locked in the Edit dialog to protect data integrity.
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-border" disabled={isPending}>
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isPending}
            className="bg-green-600 hover:bg-green-700 text-white gap-2"
          >
            {isPending ? (
              <><span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full" /> Launching…</>
            ) : (
              <><Play className="w-3.5 h-3.5" /> {warnings.length > 0 ? "Launch Anyway" : "Launch Campaign"}</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ══════════════════════════════════════════════════════════
   CAMPAIGN MEMBERS DIALOGS
══════════════════════════════════════════════════════════ */

function AddMemberManuallyDialog({ open, onOpenChange, onAdd, isPending }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  onAdd: (payload: Record<string, unknown>) => void;
  isPending: boolean;
}) {
  const [form, setForm] = React.useState({ firstName: "", lastName: "", email: "", companyName: "", role: "" });
  React.useEffect(() => { if (open) setForm({ firstName: "", lastName: "", email: "", companyName: "", role: "" }); }, [open]);

  const inp = "w-full h-9 px-3 rounded-md bg-muted border border-border text-foreground text-sm outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground";
  const valid = form.firstName.trim() && form.lastName.trim() && form.email.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border text-foreground sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="font-display text-lg">Add Member Manually</DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            Enter contact details. If the email already exists in your CRM, it will be linked automatically.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">First Name <span className="text-red-400">*</span></label>
              <input className={inp} placeholder="Jane" value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Last Name <span className="text-red-400">*</span></label>
              <input className={inp} placeholder="Smith" value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Email ID <span className="text-red-400">*</span></label>
            <input className={inp} type="email" placeholder="jane@company.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Company Name</label>
            <input className={inp} placeholder="Acme Corp" value={form.companyName} onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Role / Designation</label>
            <input className={inp} placeholder="VP of Sales" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} />
          </div>
          <div className="text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2 flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
            If this email doesn't exist in Contacts or Leads, a new Contact record will be created automatically.
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-border" disabled={isPending}>Cancel</Button>
          <Button onClick={() => valid && onAdd(form)} disabled={!valid || isPending} className="gap-2">
            {isPending ? <><span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full" /> Adding…</> : <><Plus className="w-3.5 h-3.5" /> Add Member</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddFromContactsDialog({ open, onOpenChange, onAdd, isPending }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  onAdd: (contactId: number) => void;
  isPending: boolean;
}) {
  const [search, setSearch] = React.useState("");
  const [selected, setSelected] = React.useState<number | null>(null);
  React.useEffect(() => { if (open) { setSearch(""); setSelected(null); } }, [open]);

  const { data: contacts = [], isLoading } = useQuery<Array<{ id: number; firstName: string; lastName: string; email: string | null; title: string | null }>>({
    queryKey: ["contacts-quick", search],
    queryFn: async () => {
      const r = await fetch(`/api/contacts/search-quick?q=${encodeURIComponent(search)}`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border text-foreground sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="font-display text-lg">Add from Contacts</DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">Search your existing contacts and select one to add.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              className="w-full pl-8 pr-3 h-9 rounded-md bg-muted border border-border text-foreground text-sm outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground"
              placeholder="Search by name or email…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="max-h-64 overflow-y-auto flex flex-col divide-y divide-border/40 rounded-md border border-border/60">
            {isLoading ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
            ) : contacts.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">No contacts found</div>
            ) : contacts.map(c => (
              <button
                key={c.id}
                onClick={() => setSelected(c.id)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/50 transition-colors text-sm",
                  selected === c.id && "bg-primary/10 border-l-2 border-primary"
                )}
              >
                <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-bold text-primary">{(c.firstName[0] ?? "") + (c.lastName[0] ?? "")}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-foreground truncate">{c.firstName} {c.lastName}</div>
                  <div className="text-xs text-muted-foreground truncate">{c.email ?? "—"}{c.title ? ` · ${c.title}` : ""}</div>
                </div>
                {selected === c.id && <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />}
              </button>
            ))}
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-border" disabled={isPending}>Cancel</Button>
          <Button onClick={() => selected !== null && onAdd(selected)} disabled={selected === null || isPending} className="gap-2">
            {isPending ? <><span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full" /> Adding…</> : <><UserPlus className="w-3.5 h-3.5" /> Add Contact</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddFromLeadsDialog({ open, onOpenChange, onAdd, isPending }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  onAdd: (leadId: number) => void;
  isPending: boolean;
}) {
  const [search, setSearch] = React.useState("");
  const [selected, setSelected] = React.useState<number | null>(null);
  React.useEffect(() => { if (open) { setSearch(""); setSelected(null); } }, [open]);

  const { data: leads = [], isLoading } = useQuery<Array<{ id: number; firstName: string; lastName: string; email: string | null; company: string | null; title: string | null }>>({
    queryKey: ["leads-quick", search],
    queryFn: async () => {
      const r = await fetch(`/api/leads/search-quick?q=${encodeURIComponent(search)}`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border text-foreground sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="font-display text-lg">Add from Leads</DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">Search your existing leads and select one to add.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              className="w-full pl-8 pr-3 h-9 rounded-md bg-muted border border-border text-foreground text-sm outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground"
              placeholder="Search by name, email, or company…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="max-h-64 overflow-y-auto flex flex-col divide-y divide-border/40 rounded-md border border-border/60">
            {isLoading ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
            ) : leads.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">No leads found</div>
            ) : leads.map(l => (
              <button
                key={l.id}
                onClick={() => setSelected(l.id)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/50 transition-colors text-sm",
                  selected === l.id && "bg-primary/10 border-l-2 border-primary"
                )}
              >
                <div className="w-7 h-7 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-bold text-amber-500">{(l.firstName[0] ?? "") + (l.lastName[0] ?? "")}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-foreground truncate">{l.firstName} {l.lastName}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {l.email ?? "—"}{l.company ? ` · ${l.company}` : ""}{l.title ? ` · ${l.title}` : ""}
                  </div>
                </div>
                {selected === l.id && <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />}
              </button>
            ))}
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-border" disabled={isPending}>Cancel</Button>
          <Button onClick={() => selected !== null && onAdd(selected)} disabled={selected === null || isPending} className="gap-2">
            {isPending ? <><span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full" /> Adding…</> : <><UserPlus className="w-3.5 h-3.5" /> Add Lead</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ImportCSVDialog({ open, onOpenChange, onImport, isPending }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  onImport: (csv: string) => void;
  isPending: boolean;
}) {
  const [csvText, setCsvText] = React.useState("");
  const [fileName, setFileName] = React.useState("");
  const [preview, setPreview] = React.useState<string[][]>([]);
  const fileRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => { if (open) { setCsvText(""); setFileName(""); setPreview([]); } }, [open]);

  const handleFile = (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target?.result as string;
      setCsvText(text);
      // Preview first 5 rows
      const lines = text.replace(/\r\n/g, "\n").split("\n").filter(l => l.trim()).slice(0, 6);
      setPreview(lines.map(l => l.split(",").map(v => v.trim().replace(/^"|"$/g, ""))));
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border text-foreground sm:max-w-[580px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-lg">Import Members from CSV</DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            Upload a CSV file with member details. Existing emails in this campaign will be updated, not duplicated.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          {/* Format guide */}
          <div className="bg-muted/50 rounded-md border border-border/60 p-3 text-xs">
            <div className="font-semibold text-foreground mb-1.5">Required CSV columns</div>
            <div className="grid grid-cols-3 gap-1 text-muted-foreground">
              <span className="font-mono bg-muted px-1.5 py-0.5 rounded">first_name <span className="text-red-400">*</span></span>
              <span className="font-mono bg-muted px-1.5 py-0.5 rounded">last_name <span className="text-red-400">*</span></span>
              <span className="font-mono bg-muted px-1.5 py-0.5 rounded">email <span className="text-red-400">*</span></span>
              <span className="font-mono bg-muted px-1.5 py-0.5 rounded">company_name</span>
              <span className="font-mono bg-muted px-1.5 py-0.5 rounded">role</span>
            </div>
          </div>

          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-border/60 rounded-lg p-8 flex flex-col items-center gap-2 cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
          >
            <Upload className="w-8 h-8 text-muted-foreground" />
            {fileName ? (
              <div className="text-sm text-foreground font-medium">{fileName}</div>
            ) : (
              <>
                <div className="text-sm font-medium text-foreground">Drop CSV file here or click to browse</div>
                <div className="text-xs text-muted-foreground">Supports .csv files, UTF-8 encoded</div>
              </>
            )}
            <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          </div>

          {/* Or paste */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Or paste CSV content</label>
            <textarea
              value={csvText}
              onChange={e => {
                setCsvText(e.target.value);
                const lines = e.target.value.replace(/\r\n/g, "\n").split("\n").filter(l => l.trim()).slice(0, 6);
                setPreview(lines.map(l => l.split(",").map(v => v.trim().replace(/^"|"$/g, ""))));
                setFileName("");
              }}
              placeholder={"first_name,last_name,email,company_name,role\nJane,Smith,jane@acme.com,Acme Corp,VP Sales"}
              rows={4}
              className="w-full px-3 py-2 rounded-md bg-muted border border-border text-foreground text-xs font-mono outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground resize-none"
            />
          </div>

          {/* Preview */}
          {preview.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <div className="text-xs font-medium text-muted-foreground">Preview (first {Math.min(preview.length, 5)} rows)</div>
              <div className="overflow-x-auto rounded-md border border-border/60">
                <table className="w-full text-xs">
                  {preview.slice(0, 6).map((row, i) => (
                    <tr key={i} className={i === 0 ? "bg-muted/50 font-semibold" : "border-t border-border/40 hover:bg-muted/20"}>
                      {row.map((cell, j) => (
                        <td key={j} className="px-2.5 py-1.5 text-foreground whitespace-nowrap max-w-[120px] truncate">{cell || <span className="text-muted-foreground/50">—</span>}</td>
                      ))}
                    </tr>
                  ))}
                </table>
              </div>
            </div>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-border" disabled={isPending}>Cancel</Button>
          <Button onClick={() => csvText.trim() && onImport(csvText)} disabled={!csvText.trim() || isPending} className="gap-2">
            {isPending ? <><span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full" /> Importing…</> : <><Upload className="w-3.5 h-3.5" /> Import</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
