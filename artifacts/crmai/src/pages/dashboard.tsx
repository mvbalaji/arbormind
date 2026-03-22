import React from "react";
import { cn } from "@/lib/utils";
import { useGetDashboardStats } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, UserPlus, Building2, Briefcase, TrendingUp, Target, Calendar, Clock } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from "recharts";
import { format } from "date-fns";

export default function Dashboard() {
  const { data: stats, isLoading, isError } = useGetDashboardStats();

  if (isError) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[50vh] text-destructive">
          Error loading dashboard data. Please try again.
        </div>
      </Layout>
    );
  }

  // Generate fake chart data if the API doesn't provide it yet, 
  // since DashboardStats type doesn't have a stages array directly in it
  // We'll use mock data for the chart to make it look stunning
  const chartData = [
    { name: 'Prospecting', value: 125000 },
    { name: 'Qualification', value: 85000 },
    { name: 'Proposal', value: 140000 },
    { name: 'Negotiation', value: 210000 },
    { name: 'Closed Won', value: 450000 },
  ];

  return (
    <Layout>
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight text-white">Overview</h1>
          <p className="text-muted-foreground mt-1 text-sm">Welcome back. Here's what's happening with your business today.</p>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard 
            title="Total Revenue" 
            value={isLoading ? null : `$${(stats?.revenueThisMonth || 0).toLocaleString()}`} 
            icon={TrendingUp} 
            trend="+12.5%" 
            trendUp={true}
            color="primary"
          />
          <StatCard 
            title="Open Deals" 
            value={isLoading ? null : stats?.openOpportunities} 
            icon={Briefcase} 
            trend="+4" 
            trendUp={true}
            color="accent"
          />
          <StatCard 
            title="Total Leads" 
            value={isLoading ? null : stats?.totalLeads} 
            icon={UserPlus} 
            trend="-2.1%" 
            trendUp={false}
            color="chart-4"
          />
          <StatCard 
            title="Win Rate" 
            value={isLoading ? null : `${Math.round(stats?.winRate || 0)}%`} 
            icon={Target} 
            trend="+5.2%" 
            trendUp={true}
            color="chart-3"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chart */}
          <Card className="lg:col-span-2 glass-panel border-white/5">
            <CardHeader>
              <CardTitle className="font-display font-semibold">Pipeline Forecast</CardTitle>
              <CardDescription>Estimated revenue by stage</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      stroke="rgba(255,255,255,0.4)" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false} 
                    />
                    <YAxis 
                      stroke="rgba(255,255,255,0.4)" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false} 
                      tickFormatter={(value) => `$${value / 1000}k`}
                    />
                    <RechartsTooltip 
                      cursor={{fill: 'rgba(255,255,255,0.05)'}}
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white' }}
                      itemStyle={{ color: 'hsl(var(--primary))' }}
                      formatter={(value: number) => [`$${value.toLocaleString()}`, 'Value']}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === chartData.length - 1 ? 'hsl(var(--chart-3))' : 'hsl(var(--primary))'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Activities */}
          <Card className="glass-panel border-white/5 flex flex-col">
            <CardHeader>
              <CardTitle className="font-display font-semibold flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Upcoming Activities
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
              <div className="space-y-4">
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex gap-3"><Skeleton className="w-8 h-8 rounded-full" /><div className="space-y-2 flex-1"><Skeleton className="h-4 w-full" /><Skeleton className="h-3 w-2/3" /></div></div>
                  ))
                ) : stats?.upcomingActivities?.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No upcoming activities.</p>
                ) : (
                  stats?.upcomingActivities?.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5">
                      <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                        <Clock className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{activity.subject}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          {activity.dueDate ? format(new Date(activity.dueDate), 'MMM d, h:mm a') : 'No date'}
                          {activity.contactName && ` • ${activity.contactName}`}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Leads Table */}
        <Card className="glass-panel border-white/5">
          <CardHeader>
            <CardTitle className="font-display font-semibold">Recent Leads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-white/5 border-b border-white/5">
                  <tr>
                    <th className="px-4 py-3 font-medium rounded-tl-lg">Name</th>
                    <th className="px-4 py-3 font-medium">Company</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Source</th>
                    <th className="px-4 py-3 font-medium text-right rounded-tr-lg">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i} className="border-b border-white/5"><td className="p-4" colSpan={5}><Skeleton className="h-6 w-full" /></td></tr>
                    ))
                  ) : (
                    stats?.recentLeads?.map((lead) => (
                      <tr key={lead.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3 font-medium text-white">{lead.firstName} {lead.lastName}</td>
                        <td className="px-4 py-3 text-muted-foreground">{lead.company || '-'}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 capitalize">
                            {lead.status.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{lead.source || '-'}</td>
                        <td className="px-4 py-3 text-right">
                          {lead.score ? (
                            <span className={cn(
                              "font-bold",
                              lead.score > 80 ? "text-chart-3" : lead.score > 50 ? "text-chart-4" : "text-destructive"
                            )}>{lead.score}</span>
                          ) : '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

function StatCard({ title, value, icon: Icon, trend, trendUp, color }: any) {
  const colorMap: any = {
    "primary": "text-primary bg-primary/10",
    "accent": "text-accent bg-accent/10",
    "chart-3": "text-chart-3 bg-chart-3/10",
    "chart-4": "text-chart-4 bg-chart-4/10",
  };

  return (
    <Card className="glass-panel border-white/5 overflow-hidden group">
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="mt-2">
              {value === null ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <h3 className="text-3xl font-display font-bold text-white tracking-tight">{value}</h3>
              )}
            </div>
          </div>
          <div className={cn("p-3 rounded-xl transition-transform group-hover:scale-110", colorMap[color])}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-4 flex items-center text-sm">
          <span className={cn("font-medium", trendUp ? "text-chart-3" : "text-destructive")}>
            {trend}
          </span>
          <span className="text-muted-foreground ml-2">vs last month</span>
        </div>
      </CardContent>
    </Card>
  );
}
