import React from "react";
import { cn } from "@/lib/utils";
import { useGetDashboardStats, useGetPipelineReport, useListLeads } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import {
  TrendingUp, Target, UserPlus, Briefcase, Clock, ArrowRight,
  Zap, AlertCircle, CheckCircle2, Activity, DollarSign, Users, Calendar,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Cell,
  PieChart, Pie,
} from "recharts";
import { format, formatDistanceToNow } from "date-fns";

const STAGE_LABELS: Record<string, string> = {
  prospecting: "Prospecting",
  qualification: "Qualification",
  proposal: "Proposal",
  negotiation: "Negotiation",
  closed_won: "Won",
  closed_lost: "Lost",
};

const STAGE_COLORS = [
  "#6366f1", "#818cf8", "#a78bfa", "#f59e0b", "#10b981", "#ef4444",
];

const LEAD_STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  contacted: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border-purple-200 dark:border-purple-800",
  qualified: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300 border-green-200 dark:border-green-800",
  unqualified: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 border-red-200 dark:border-red-800",
  converted: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700",
};

const STAGE_BADGE: Record<string, string> = {
  prospecting: "text-blue-600 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800",
  qualification: "text-indigo-600 bg-indigo-50 dark:bg-indigo-950 border-indigo-200 dark:border-indigo-800",
  proposal: "text-purple-600 bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800",
  negotiation: "text-orange-600 bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800",
  closed_won: "text-green-600 bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800",
  closed_lost: "text-red-600 bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800",
};

function KPICard({
  title, value, subtitle, icon: Icon, color, trend, trendUp,
}: {
  title: string; value: React.ReactNode; subtitle?: string;
  icon: React.ElementType; color: string; trend?: string; trendUp?: boolean;
}) {
  return (
    <Card className="glass-panel border-border overflow-hidden group hover:border-border transition-all">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
            <div className="mt-1.5 text-2xl font-bold text-foreground font-display">{value}</div>
            {trend && (
              <p className={cn("text-xs mt-1 font-medium", trendUp ? "text-emerald-600" : "text-rose-600")}>
                {trend}
              </p>
            )}
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          <div className={cn("p-2.5 rounded-xl shrink-0 group-hover:scale-110 transition-transform", color)}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AIInsightsBanner({ stats }: { stats: ReturnType<typeof useGetDashboardStats>["data"] }) {
  if (!stats) return null;
  const insights: { icon: React.ElementType; color: string; text: string; type: "info" | "warn" | "success" }[] = [];

  if ((stats.winRate ?? 0) < 30) insights.push({ icon: AlertCircle, color: "text-orange-600", type: "warn", text: `Win rate at ${stats.winRate}% — review lost deal reasons to improve conversion.` });
  if ((stats.openCases ?? 0) > 5) insights.push({ icon: AlertCircle, color: "text-rose-600", type: "warn", text: `${stats.openCases} open support cases need attention.` });
  if ((stats.wonDealsThisMonth ?? 0) > 0) insights.push({ icon: CheckCircle2, color: "text-emerald-600", type: "success", text: `${stats.wonDealsThisMonth} deals closed this month totaling $${(stats.revenueThisMonth ?? 0).toLocaleString()}.` });
  if ((stats.totalLeads ?? 0) > 10) insights.push({ icon: Zap, color: "text-blue-600", type: "info", text: `${stats.totalLeads} leads in pipeline. Focus on top-scored leads for fastest conversion.` });

  if (insights.length === 0) return null;

  return (
    <Card className="glass-panel border-primary/20 bg-primary/5">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-primary">AI Insights</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {insights.map((ins, i) => (
            <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-muted/50">
              <ins.icon className={cn("w-4 h-4 mt-0.5 shrink-0", ins.color)} />
              <p className="text-xs text-muted-foreground leading-relaxed">{ins.text}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { data: stats, isLoading } = useGetDashboardStats();
  const { data: pipelineData, isLoading: pipelineLoading } = useGetPipelineReport();
  const { data: leadsData, isLoading: leadsLoading } = useListLeads({ limit: 5 });
  const { data: topDealsData, isLoading: topDealsLoading } = useQuery<{
    data: { id: number; name: string; amount: number; stage: string; closeDate: string | null; accountName: string | null; probability: number | null }[];
  }>({
    queryKey: ["reports", "top-deals"],
    queryFn: async () => {
      const res = await fetch("/api/reports/top-deals", { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });
  const topDeals = topDealsData?.data ?? [];

  const chartData = pipelineData?.stages
    ? pipelineData.stages
        .filter(s => s.stage !== "closed_lost")
        .map((s, i) => ({
          name: STAGE_LABELS[s.stage] ?? s.stage,
          value: Number(s.totalValue) || 0,
          count: Number(s.count) || 0,
          color: STAGE_COLORS[i % STAGE_COLORS.length],
        }))
    : [];

  const winLossData = pipelineData?.stages
    ? [
        { name: "Won", value: Number(pipelineData.stages.find(s => s.stage === "closed_won")?.count ?? 0), fill: "#10b981" },
        { name: "Lost", value: Number(pipelineData.stages.find(s => s.stage === "closed_lost")?.count ?? 0), fill: "#ef4444" },
      ]
    : [];

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold tracking-tight text-foreground">
              Sales Command Center
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              {format(new Date(), "EEEE, MMMM d yyyy")} · Real-time overview of your pipeline
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/leads">
              <Button variant="outline" size="sm" className="border-border text-foreground hover:bg-muted gap-1.5">
                <UserPlus className="w-4 h-4" /> Add Lead
              </Button>
            </Link>
            <Link href="/opportunities">
              <Button size="sm" className="bg-primary hover:bg-primary/90 text-white gap-1.5 shadow-lg shadow-primary/20">
                <Briefcase className="w-4 h-4" /> View Pipeline
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <KPICard
            title="Revenue This Month"
            value={isLoading ? <Skeleton className="h-7 w-24" /> : `$${(Number(stats?.revenueThisMonth) || 0).toLocaleString()}`}
            trend={`↑ ${Number(stats?.wonDealsThisMonth) || 0} deals closed`}
            trendUp={true}
            icon={DollarSign}
            color="text-emerald-600 bg-emerald-100 dark:bg-emerald-950"
          />
          <KPICard
            title="Pipeline Value"
            value={isLoading ? <Skeleton className="h-7 w-24" /> : `$${((Number(stats?.totalPipelineValue) || 0) / 1000).toFixed(0)}k`}
            subtitle={`${Number(stats?.openOpportunities) || 0} open deals`}
            icon={TrendingUp}
            color="text-blue-600 bg-blue-100 dark:bg-blue-950"
          />
          <KPICard
            title="Win Rate"
            value={isLoading ? <Skeleton className="h-7 w-16" /> : `${Number(stats?.winRate) || 0}%`}
            trend={(Number(stats?.winRate) || 0) >= 40 ? "↑ On target" : "↓ Below target"}
            trendUp={(Number(stats?.winRate) || 0) >= 40}
            icon={Target}
            color="text-violet-600 bg-violet-100 dark:bg-violet-950"
          />
          <KPICard
            title="Total Leads"
            value={isLoading ? <Skeleton className="h-7 w-16" /> : Number(stats?.totalLeads) || 0}
            subtitle={`${Number(stats?.totalContacts) || 0} contacts`}
            icon={UserPlus}
            color="text-orange-600 bg-orange-100 dark:bg-orange-950"
          />
          <KPICard
            title="Activities / Week"
            value={isLoading ? <Skeleton className="h-7 w-16" /> : Number(stats?.activitiesThisWeek) || 0}
            subtitle={`${Number(stats?.openCases) || 0} open cases`}
            icon={Activity}
            color="text-rose-600 bg-rose-100 dark:bg-rose-950"
          />
        </div>

        {!isLoading && <AIInsightsBanner stats={stats} />}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <Card className="lg:col-span-2 glass-panel border-border">
            <CardHeader className="pb-2">
              <CardTitle className="font-display font-semibold text-base flex items-center justify-between">
                Pipeline by Stage
                <Link href="/opportunities">
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground gap-1 text-xs h-7">
                    Full Pipeline <ArrowRight className="w-3 h-3" />
                  </Button>
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[220px] w-full">
                {pipelineLoading ? (
                  <Skeleton className="h-full w-full rounded-lg" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                      <XAxis dataKey="name" className="fill-muted-foreground" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis className="fill-muted-foreground" fontSize={11} tickLine={false} axisLine={false}
                        tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
                      <RechartsTooltip
                        cursor={{ fill: "hsl(var(--muted) / 0.3)" }}
                        contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px", color: "hsl(var(--foreground))", fontSize: "12px" }}
                        formatter={(value: number, _name: string, entry: { payload?: { count?: number } }) => [
                          `$${value.toLocaleString()}`,
                          `Value (${entry.payload?.count ?? 0} deals)`,
                        ]}
                      />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-4">
            <Card className="glass-panel border-border flex-1">
              <CardHeader className="pb-1 pt-4">
                <CardTitle className="text-sm font-medium text-muted-foreground">Closed Deals</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {pipelineLoading ? (
                  <Skeleton className="h-32 w-32 rounded-full mx-auto" />
                ) : (
                  <div className="flex items-center gap-4">
                    <div className="h-[110px] w-[110px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={winLossData} dataKey="value" cx="50%" cy="50%" innerRadius={30} outerRadius={50} paddingAngle={3}>
                            {winLossData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-2.5">
                      {winLossData.map((d, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.fill }} />
                          <div>
                            <div className="text-lg font-bold text-foreground leading-none">{d.value}</div>
                            <div className="text-xs text-muted-foreground">{d.name}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="glass-panel border-border">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Total Accounts</span>
                  <span className="font-bold text-foreground">{isLoading ? "—" : Number(stats?.totalAccounts) || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Total Contacts</span>
                  <span className="font-bold text-foreground">{isLoading ? "—" : Number(stats?.totalContacts) || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Open Support Cases</span>
                  <span className={cn("font-bold", (Number(stats?.openCases) || 0) > 0 ? "text-rose-600" : "text-foreground")}>
                    {isLoading ? "—" : Number(stats?.openCases) || 0}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <Card className="glass-panel border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-display font-semibold flex items-center justify-between">
                Recent Leads
                <Link href="/leads">
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground gap-1 text-xs h-7">
                    All <ArrowRight className="w-3 h-3" />
                  </Button>
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {leadsLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="px-4 py-3 flex gap-3">
                      <Skeleton className="w-8 h-8 rounded-full" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-3 w-28" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                  ))
                ) : leadsData?.data.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">No leads yet.</div>
                ) : (
                  leadsData?.data.map((lead) => {
                    const initials = `${lead.firstName[0] ?? ""}${lead.lastName[0] ?? ""}`.toUpperCase();
                    return (
                      <Link key={lead.id} href={`/leads/${lead.id}`}>
                        <div className="px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/70 to-accent/70 flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {initials}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{lead.firstName} {lead.lastName}</p>
                            <p className="text-xs text-muted-foreground truncate">{lead.company ?? lead.email ?? "—"}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {lead.score != null && (
                              <span className={cn("text-xs font-bold", lead.score >= 70 ? "text-emerald-600" : lead.score >= 40 ? "text-yellow-600" : "text-rose-600")}>
                                {lead.score}
                              </span>
                            )}
                            <Badge variant="outline" className={cn("text-xs capitalize px-1.5 py-0", LEAD_STATUS_COLORS[lead.status] ?? "")}>
                              {lead.status}
                            </Badge>
                          </div>
                        </div>
                      </Link>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-display font-semibold flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  Top Deals
                </span>
                <Link href="/opportunities">
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground gap-1 text-xs h-7">
                    All <ArrowRight className="w-3 h-3" />
                  </Button>
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {topDealsLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="px-4 py-3 space-y-1.5">
                      <Skeleton className="h-3 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  ))
                ) : topDeals.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">No open deals.</div>
                ) : (
                  topDeals.map((deal) => (
                    <Link key={deal.id} href={`/opportunities/${deal.id}`}>
                      <div className="px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{deal.name}</p>
                            <p className="text-xs text-muted-foreground">{deal.accountName ?? "—"}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-bold text-emerald-600">${(Number(deal.amount) || 0).toLocaleString()}</p>
                            <Badge variant="outline" className={cn("text-[10px] capitalize mt-0.5", STAGE_BADGE[deal.stage] ?? "")}>
                              {STAGE_LABELS[deal.stage] ?? deal.stage}
                            </Badge>
                          </div>
                        </div>
                        {deal.closeDate && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <Calendar className="w-3 h-3" />
                            Closes {format(new Date(deal.closeDate), "MMM d, yyyy")}
                          </p>
                        )}
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-display font-semibold flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                Upcoming Activities
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="px-4 py-3 flex gap-3">
                      <Skeleton className="w-7 h-7 rounded-lg" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-3 w-32" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                  ))
                ) : !stats?.upcomingActivities?.length ? (
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">No upcoming activities.</div>
                ) : (
                  stats.upcomingActivities.map((activity) => (
                    <div key={activity.id} className="px-4 py-3 flex items-start gap-3 hover:bg-muted/50 transition-colors">
                      <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                        <Clock className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{activity.subject}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {activity.dueDate
                            ? formatDistanceToNow(new Date(activity.dueDate), { addSuffix: true })
                            : "No date set"}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {!pipelineLoading && pipelineData?.stages && pipelineData.stages.length > 0 && (
          <Card className="glass-panel border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-display font-semibold">Lead & Deal Stage Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {pipelineData.stages.filter(s => s.stage !== "closed_lost").map((s, i) => (
                  <div key={s.stage} className="text-center p-3 rounded-xl bg-muted/50 border border-border">
                    <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{STAGE_LABELS[s.stage]}</div>
                    <div className="text-xl font-bold font-display" style={{ color: STAGE_COLORS[i] }}>{Number(s.count) || 0}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">${((Number(s.totalValue) || 0) / 1000).toFixed(0)}k</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
