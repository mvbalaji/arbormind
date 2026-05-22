import React from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3, PieChart as PieChartIcon, TrendingUp, Users, Briefcase,
  PoundSterling, Trophy, Target, Activity as ActivityIcon, AlertCircle,
  CheckCircle2, Calendar, Mail, Phone, ClipboardList, StickyNote,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend,
  AreaChart, Area, ComposedChart, Line,
} from "recharts";
import {
  useGetPipelineReport, useGetLeadSourcesReport, useGetRevenueForecast,
  useGetDashboardStats, useGetActivitiesSummary,
} from "@workspace/api-client-react";
import { format } from "date-fns";
import { Link } from "wouter";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CustomReportBuilder } from "@/components/custom-report-builder";

const COLORS = [
  "hsl(217 91% 60%)", // blue
  "hsl(160 84% 39%)", // green
  "hsl(38 92% 50%)",  // amber
  "hsl(280 65% 60%)", // purple
  "hsl(0 84% 60%)",   // red
  "hsl(199 89% 48%)", // sky
  "hsl(340 82% 52%)", // pink
];

const STAGE_LABELS: Record<string, string> = {
  prospecting: "Prospecting",
  qualification: "Qualification",
  needs_analysis: "Needs Analysis",
  proposal: "Proposal",
  negotiation: "Negotiation",
  closed_won: "Closed Won",
  closed_lost: "Closed Lost",
};

const gbp = (n: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(n || 0);

const ACTIVITY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  call: Phone, email: Mail, meeting: Calendar, task: ClipboardList, note: StickyNote,
};

const tooltipStyle = {
  backgroundColor: "hsl(var(--popover))",
  borderColor: "hsl(var(--border))",
  borderRadius: 8,
  color: "hsl(var(--popover-foreground))",
  fontSize: 12,
};

function KpiCard({
  icon: Icon, label, value, sub, accent = "primary",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: string; sub?: string;
  accent?: "primary" | "green" | "amber" | "red" | "purple";
}) {
  const accentBg = {
    primary: "bg-primary/10 text-primary",
    green: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    red: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    purple: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  }[accent];

  return (
    <Card className="border-border">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium truncate">{label}</div>
            <div className="text-2xl font-display font-bold mt-1 truncate">{value}</div>
            {sub && <div className="text-xs text-muted-foreground mt-0.5 truncate">{sub}</div>}
          </div>
          <div className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${accentBg}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Reports() {
  const { data: stats } = useGetDashboardStats();
  const { data: pipelineData } = useGetPipelineReport();
  const { data: leadSourcesData } = useGetLeadSourcesReport();
  const { data: forecastData } = useGetRevenueForecast();
  const { data: activitiesData } = useGetActivitiesSummary();

  const pipelineStages = (pipelineData?.stages ?? []).map((s) => ({
    ...s,
    label: STAGE_LABELS[s.stage] ?? s.stage,
  }));

  const winRate = stats?.winRate ?? 0;
  const conversionRate = stats && stats.totalLeads > 0
    ? Math.round((stats.totalContacts / stats.totalLeads) * 100)
    : 0;

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground tracking-tight">Reports &amp; Analytics</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Pipeline, revenue, leads and activity insights across your entire workspace.
            </p>
          </div>
          <Badge variant="outline" className="text-xs">
            Updated {format(new Date(), "d MMM yyyy, HH:mm")}
          </Badge>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="custom">Custom Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-4">
        {/* KPI ROW */}
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-4 gap-3">
          <KpiCard icon={PoundSterling} label="Pipeline Value" value={gbp(stats?.totalPipelineValue ?? 0)}
            sub={`${stats?.openOpportunities ?? 0} open opportunities`} accent="primary" />
          <KpiCard icon={Trophy} label="Revenue (Month)" value={gbp(stats?.revenueThisMonth ?? 0)}
            sub={`${stats?.wonDealsThisMonth ?? 0} deals won`} accent="green" />
          <KpiCard icon={Target} label="Win Rate" value={`${winRate}%`}
            sub="closed-won / closed total" accent="amber" />
          <KpiCard icon={TrendingUp} label="Lead → Contact" value={`${conversionRate}%`}
            sub={`${stats?.totalLeads ?? 0} leads · ${stats?.totalContacts ?? 0} contacts`} accent="purple" />
          <KpiCard icon={Users} label="Total Contacts" value={String(stats?.totalContacts ?? 0)} accent="primary" />
          <KpiCard icon={Briefcase} label="Total Accounts" value={String(stats?.totalAccounts ?? 0)} accent="purple" />
          <KpiCard icon={ActivityIcon} label="Activities (Week)" value={String(stats?.activitiesThisWeek ?? 0)} accent="green" />
          <KpiCard icon={AlertCircle} label="Open Cases" value={String(stats?.openCases ?? 0)} accent="red" />
        </div>

        {/* Pipeline */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="border-border lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="font-display font-semibold flex items-center gap-2 text-base">
                <BarChart3 className="w-5 h-5 text-primary" /> Pipeline Value by Stage
              </CardTitle>
              <div className="text-xs text-muted-foreground">
                {pipelineData?.totalDeals ?? 0} deals · {gbp(pipelineData?.totalValue ?? 0)} total
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pipelineStages} layout="vertical"
                    margin={{ top: 0, right: 24, left: 16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal vertical={false} />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false}
                      tickFormatter={(v) => gbp(Number(v))} />
                    <YAxis dataKey="label" type="category" width={120}
                      stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                    <RechartsTooltip contentStyle={tooltipStyle}
                      formatter={(value: number, name: string) => name === "totalValue" ? [gbp(value), "Value"] : [value, name]} />
                    <Bar dataKey="totalValue" radius={[0, 4, 4, 0]}>
                      {pipelineStages.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="font-display font-semibold flex items-center gap-2 text-base">
                <ClipboardList className="w-5 h-5 text-primary" /> Stage Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {pipelineStages.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-8 text-center">No opportunities yet.</p>
                ) : pipelineStages.map((s, i) => (
                  <div key={s.stage} className="flex items-center justify-between gap-3 text-sm py-1.5 border-b border-border last:border-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="truncate">{s.label}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-semibold tabular-nums">{gbp(s.totalValue)}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {s.count} deals · {Math.round(s.avgProbability)}% avg
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Revenue Forecast */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="font-display font-semibold flex items-center gap-2 text-base">
              <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> Revenue &amp; Forecast (9 months)
            </CardTitle>
            <div className="text-xs text-muted-foreground">
              Actual: <span className="font-semibold text-foreground">{gbp(forecastData?.totalActual ?? 0)}</span>
              {"  ·  "}
              Weighted forecast: <span className="font-semibold text-foreground">{gbp(forecastData?.totalForecast ?? 0)}</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[340px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={forecastData?.months ?? []} margin={{ top: 12, right: 24, left: 8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(217 91% 60%)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="hsl(217 91% 60%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false}
                    tickFormatter={(v) => gbp(Number(v))} />
                  <RechartsTooltip contentStyle={tooltipStyle} formatter={(v: number) => gbp(Number(v))} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="revenue" name="Actual Revenue"
                    stroke="hsl(217 91% 60%)" strokeWidth={2} fill="url(#revFill)" />
                  <Line type="monotone" dataKey="forecast" name="Weighted Forecast"
                    stroke="hsl(160 84% 39%)" strokeDasharray="5 4" strokeWidth={2}
                    dot={{ r: 3, fill: "hsl(160 84% 39%)" }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Lead Sources + Activities Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="font-display font-semibold flex items-center gap-2 text-base">
                <PieChartIcon className="w-5 h-5 text-primary" /> Lead Sources
              </CardTitle>
              <div className="text-xs text-muted-foreground">{leadSourcesData?.total ?? 0} total leads</div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={leadSourcesData?.sources ?? []}
                        innerRadius={55} outerRadius={90} paddingAngle={3}
                        dataKey="count" nameKey="source" stroke="hsl(var(--background))" strokeWidth={2}>
                        {(leadSourcesData?.sources ?? []).map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-1.5">
                  {(leadSourcesData?.sources ?? []).length === 0 ? (
                    <p className="text-xs text-muted-foreground py-4">No leads yet.</p>
                  ) : (leadSourcesData?.sources ?? []).map((s, i) => (
                    <div key={s.source} className="flex items-center justify-between text-sm py-1 border-b border-border last:border-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                        <span className="truncate capitalize">{s.source}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-semibold tabular-nums">{s.count}</span>
                        <span className="text-[11px] text-muted-foreground ml-2">{s.percentage}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="font-display font-semibold flex items-center gap-2 text-base">
                <ActivityIcon className="w-5 h-5 text-primary" /> Activities by Type
              </CardTitle>
              <div className="text-xs text-muted-foreground">
                <CheckCircle2 className="inline w-3 h-3 mr-1 text-emerald-500" />
                {activitiesData?.totalCompleted ?? 0} completed
                {"  ·  "}
                <Calendar className="inline w-3 h-3 mr-1 text-amber-500" />
                {activitiesData?.totalPlanned ?? 0} planned
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={activitiesData?.byType ?? []} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="type" stroke="hsl(var(--muted-foreground))" fontSize={11}
                      tickLine={false} axisLine={false} tickFormatter={(v: string) => v.charAt(0).toUpperCase() + v.slice(1)} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                    <RechartsTooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="completed" stackId="a" name="Completed" fill="hsl(160 84% 39%)" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="planned" stackId="a" name="Planned" fill="hsl(38 92% 50%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-5 gap-2 mt-3">
                {(activitiesData?.byType ?? []).map((b) => {
                  const Icon = ACTIVITY_ICONS[b.type] ?? ActivityIcon;
                  return (
                    <div key={b.type} className="rounded-md border border-border p-2 text-center">
                      <Icon className="w-3.5 h-3.5 mx-auto text-muted-foreground" />
                      <div className="text-[10px] uppercase text-muted-foreground mt-1 capitalize">{b.type}</div>
                      <div className="text-sm font-semibold tabular-nums">{b.completed + b.planned}</div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Leads & Upcoming Activities */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="font-display font-semibold flex items-center gap-2 text-base">
                <Users className="w-5 h-5 text-primary" /> Recent Leads
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(stats?.recentLeads ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground py-6 text-center">No recent leads.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {(stats?.recentLeads ?? []).map((l) => (
                    <li key={l.id} className="py-2 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <Link href={`/leads/${l.id}`} className="text-sm font-medium hover:text-primary truncate block">
                          {l.firstName} {l.lastName}
                        </Link>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {l.company || "—"} {l.email ? `· ${l.email}` : ""}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px] capitalize shrink-0">{l.status}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="font-display font-semibold flex items-center gap-2 text-base">
                <Calendar className="w-5 h-5 text-primary" /> Upcoming Activities
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(stats?.upcomingActivities ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground py-6 text-center">Nothing scheduled.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {(stats?.upcomingActivities ?? []).map((a) => {
                    const Icon = ACTIVITY_ICONS[a.type] ?? ActivityIcon;
                    return (
                      <li key={a.id} className="py-2 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">{a.subject}</div>
                            <div className="text-[11px] text-muted-foreground capitalize">{a.type}</div>
                          </div>
                        </div>
                        {a.dueDate && (
                          <span className="text-[11px] text-muted-foreground shrink-0 tabular-nums">
                            {format(new Date(a.dueDate), "d MMM, HH:mm")}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
          </TabsContent>

          <TabsContent value="custom" className="mt-4">
            <CustomReportBuilder />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
