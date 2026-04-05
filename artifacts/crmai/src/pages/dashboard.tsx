import React from "react";
import { cn } from "@/lib/utils";
import { useGetDashboardStats, useGetPipelineReport, useListLeads, useListOpportunities } from "@workspace/api-client-react";
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
  ResponsiveContainer, Cell, FunnelChart, Funnel, LabelList,
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
  new: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  contacted: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  qualified: "bg-green-500/10 text-green-400 border-green-500/20",
  unqualified: "bg-red-500/10 text-red-400 border-red-500/20",
  converted: "bg-gray-500/10 text-gray-400 border-gray-500/20",
};

const STAGE_BADGE: Record<string, string> = {
  prospecting: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  qualification: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
  proposal: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  negotiation: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  closed_won: "text-green-400 bg-green-500/10 border-green-500/20",
  closed_lost: "text-red-400 bg-red-500/10 border-red-500/20",
};

function KPICard({
  title, value, subtitle, icon: Icon, color, trend, trendUp,
}: {
  title: string; value: React.ReactNode; subtitle?: string;
  icon: React.ElementType; color: string; trend?: string; trendUp?: boolean;
}) {
  return (
    <Card className="glass-panel border-white/5 overflow-hidden group hover:border-white/10 transition-all">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
            <div className="mt-1.5 text-2xl font-bold text-white font-display">{value}</div>
            {trend && (
              <p className={cn("text-xs mt-1 font-medium", trendUp ? "text-emerald-400" : "text-rose-400")}>
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

  if ((stats.winRate ?? 0) < 30) insights.push({ icon: AlertCircle, color: "text-orange-400", type: "warn", text: `Win rate at ${stats.winRate}% — review lost deal reasons to improve conversion.` });
  if ((stats.openCases ?? 0) > 5) insights.push({ icon: AlertCircle, color: "text-rose-400", type: "warn", text: `${stats.openCases} open support cases need attention.` });
  if ((stats.wonDealsThisMonth ?? 0) > 0) insights.push({ icon: CheckCircle2, color: "text-emerald-400", type: "success", text: `${stats.wonDealsThisMonth} deals closed this month totaling $${(stats.revenueThisMonth ?? 0).toLocaleString()}.` });
  if ((stats.totalLeads ?? 0) > 10) insights.push({ icon: Zap, color: "text-blue-400", type: "info", text: `${stats.totalLeads} leads in pipeline. Focus on top-scored leads for fastest conversion.` });

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
            <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-white/5">
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
  const { data: dealsData, isLoading: dealsLoading } = useListOpportunities({ limit: 5, stage: "negotiation" });

  const chartData = pipelineData?.stages
    ? pipelineData.stages
        .filter(s => s.stage !== "closed_lost")
        .map((s, i) => ({
          name: STAGE_LABELS[s.stage] ?? s.stage,
          value: s.totalValue,
          count: s.count,
          color: STAGE_COLORS[i % STAGE_COLORS.length],
        }))
    : [];

  const funnelData = pipelineData?.stages
    ? pipelineData.stages
        .filter(s => !["closed_won", "closed_lost"].includes(s.stage))
        .map((s, i) => ({
          name: STAGE_LABELS[s.stage] ?? s.stage,
          value: s.count,
          fill: STAGE_COLORS[i],
        }))
    : [];

  const winLossData = pipelineData?.stages
    ? [
        { name: "Won", value: pipelineData.stages.find(s => s.stage === "closed_won")?.count ?? 0, fill: "#10b981" },
        { name: "Lost", value: pipelineData.stages.find(s => s.stage === "closed_lost")?.count ?? 0, fill: "#ef4444" },
      ]
    : [];

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        {/* Page Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold tracking-tight text-white">
              Sales Command Center
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              {format(new Date(), "EEEE, MMMM d yyyy")} · Real-time overview of your pipeline
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/leads">
              <Button variant="outline" size="sm" className="border-white/10 text-white hover:bg-white/10 gap-1.5">
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

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <KPICard
            title="Revenue This Month"
            value={isLoading ? <Skeleton className="h-7 w-24" /> : `$${(stats?.revenueThisMonth ?? 0).toLocaleString()}`}
            trend={`↑ ${stats?.wonDealsThisMonth ?? 0} deals closed`}
            trendUp={true}
            icon={DollarSign}
            color="text-emerald-400 bg-emerald-500/10"
          />
          <KPICard
            title="Pipeline Value"
            value={isLoading ? <Skeleton className="h-7 w-24" /> : `$${((stats?.totalPipelineValue ?? 0) / 1000).toFixed(0)}k`}
            subtitle={`${stats?.openOpportunities ?? 0} open deals`}
            icon={TrendingUp}
            color="text-blue-400 bg-blue-500/10"
          />
          <KPICard
            title="Win Rate"
            value={isLoading ? <Skeleton className="h-7 w-16" /> : `${stats?.winRate ?? 0}%`}
            trend={(stats?.winRate ?? 0) >= 40 ? "↑ On target" : "↓ Below target"}
            trendUp={(stats?.winRate ?? 0) >= 40}
            icon={Target}
            color="text-violet-400 bg-violet-500/10"
          />
          <KPICard
            title="Total Leads"
            value={isLoading ? <Skeleton className="h-7 w-16" /> : stats?.totalLeads ?? 0}
            subtitle={`${stats?.totalContacts ?? 0} contacts`}
            icon={UserPlus}
            color="text-orange-400 bg-orange-500/10"
          />
          <KPICard
            title="Activities / Week"
            value={isLoading ? <Skeleton className="h-7 w-16" /> : stats?.activitiesThisWeek ?? 0}
            subtitle={`${stats?.openCases ?? 0} open cases`}
            icon={Activity}
            color="text-rose-400 bg-rose-500/10"
          />
        </div>

        {/* AI Insights */}
        {!isLoading && <AIInsightsBanner stats={stats} />}

        {/* Main Content Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Pipeline Chart */}
          <Card className="lg:col-span-2 glass-panel border-white/5">
            <CardHeader className="pb-2">
              <CardTitle className="font-display font-semibold text-base flex items-center justify-between">
                Pipeline by Stage
                <Link href="/opportunities">
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-white gap-1 text-xs h-7">
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
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                      <XAxis dataKey="name" stroke="rgba(255,255,255,0.35)" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="rgba(255,255,255,0.35)" fontSize={11} tickLine={false} axisLine={false}
                        tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
                      <RechartsTooltip
                        cursor={{ fill: "rgba(255,255,255,0.04)" }}
                        contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "rgba(255,255,255,0.1)", borderRadius: "8px", color: "white", fontSize: "12px" }}
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

          {/* Win/Loss + Quick Stats */}
          <div className="flex flex-col gap-4">
            {/* Win/Loss Donut */}
            <Card className="glass-panel border-white/5 flex-1">
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
                            <div className="text-lg font-bold text-white leading-none">{d.value}</div>
                            <div className="text-xs text-muted-foreground">{d.name}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="glass-panel border-white/5">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Total Accounts</span>
                  <span className="font-bold text-white">{isLoading ? "—" : stats?.totalAccounts ?? 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Total Contacts</span>
                  <span className="font-bold text-white">{isLoading ? "—" : stats?.totalContacts ?? 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Open Support Cases</span>
                  <span className={cn("font-bold", (stats?.openCases ?? 0) > 0 ? "text-rose-400" : "text-white")}>
                    {isLoading ? "—" : stats?.openCases ?? 0}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Bottom Row: Recent Leads + Deals in Negotiation + Upcoming Activities */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Recent Leads */}
          <Card className="glass-panel border-white/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-display font-semibold flex items-center justify-between">
                Recent Leads
                <Link href="/leads">
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-white gap-1 text-xs h-7">
                    All <ArrowRight className="w-3 h-3" />
                  </Button>
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-white/5">
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
                        <div className="px-4 py-3 hover:bg-white/5 transition-colors cursor-pointer flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/70 to-accent/70 flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {initials}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{lead.firstName} {lead.lastName}</p>
                            <p className="text-xs text-muted-foreground truncate">{lead.company ?? lead.email ?? "—"}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {lead.score != null && (
                              <span className={cn("text-xs font-bold", lead.score >= 70 ? "text-emerald-400" : lead.score >= 40 ? "text-yellow-400" : "text-rose-400")}>
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

          {/* Hot Deals */}
          <Card className="glass-panel border-white/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-display font-semibold flex items-center justify-between">
                🔥 Hot Deals (Negotiation)
                <Link href="/opportunities">
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-white gap-1 text-xs h-7">
                    All <ArrowRight className="w-3 h-3" />
                  </Button>
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-white/5">
                {dealsLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="px-4 py-3 space-y-1.5">
                      <Skeleton className="h-3 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  ))
                ) : !dealsData?.data?.length ? (
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">No deals in negotiation.</div>
                ) : (
                  dealsData.data.map((deal) => (
                    <Link key={deal.id} href={`/opportunities/${deal.id}`}>
                      <div className="px-4 py-3 hover:bg-white/5 transition-colors cursor-pointer">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{deal.name}</p>
                            <p className="text-xs text-muted-foreground">{deal.accountName ?? "—"}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-bold text-emerald-400">${(deal.amount ?? 0).toLocaleString()}</p>
                            {deal.closeDate && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                                <Calendar className="w-3 h-3" />
                                {format(new Date(deal.closeDate), "MMM d")}
                              </p>
                            )}
                          </div>
                        </div>
                        {deal.probability != null && (
                          <div className="mt-1.5">
                            <div className="w-full bg-white/5 rounded-full h-1">
                              <div className="bg-orange-400 h-1 rounded-full" style={{ width: `${deal.probability}%` }} />
                            </div>
                          </div>
                        )}
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Activities */}
          <Card className="glass-panel border-white/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-display font-semibold flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                Upcoming Activities
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-white/5">
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
                    <div key={activity.id} className="px-4 py-3 flex items-start gap-3 hover:bg-white/5 transition-colors">
                      <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                        <Clock className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{activity.subject}</p>
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

        {/* Pipeline Funnel + Stage Table */}
        {!pipelineLoading && funnelData.length > 0 && (
          <Card className="glass-panel border-white/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-display font-semibold">Lead & Deal Stage Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {pipelineData?.stages?.filter(s => s.stage !== "closed_lost").map((s, i) => (
                  <div key={s.stage} className="text-center p-3 rounded-xl bg-white/5 border border-white/5">
                    <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{STAGE_LABELS[s.stage]}</div>
                    <div className="text-xl font-bold font-display" style={{ color: STAGE_COLORS[i] }}>{s.count}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">${(s.totalValue / 1000).toFixed(0)}k</div>
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
