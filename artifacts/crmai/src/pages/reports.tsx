import React from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, PieChart as PieChartIcon, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, PieChart, Pie, LineChart, Line } from "recharts";
import { useGetPipelineReport, useGetLeadSourcesReport, useGetRevenueForecast } from "@workspace/api-client-react";

export default function Reports() {
  const { data: pipelineData } = useGetPipelineReport();
  const { data: leadSourcesData } = useGetLeadSourcesReport();
  const { data: forecastData } = useGetRevenueForecast();

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-white tracking-tight">Reports & Analytics</h1>
          <p className="text-muted-foreground mt-1 text-sm">Deep dive into your sales performance.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="glass-panel border-white/5">
            <CardHeader>
              <CardTitle className="font-display font-semibold flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" /> Pipeline Value by Stage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pipelineData?.stages || []} layout="vertical" margin={{ top: 0, right: 30, left: 40, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={true} vertical={false} />
                    <XAxis type="number" stroke="rgba(255,255,255,0.4)" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis dataKey="stage" type="category" stroke="rgba(255,255,255,0.6)" fontSize={12} tickLine={false} axisLine={false} />
                    <RechartsTooltip contentStyle={{ backgroundColor: '#111827', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white' }} />
                    <Bar dataKey="totalValue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]}>
                      {(pipelineData?.stages || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel border-white/5">
            <CardHeader>
              <CardTitle className="font-display font-semibold flex items-center gap-2">
                <PieChartIcon className="w-5 h-5 text-accent" /> Lead Sources
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={leadSourcesData?.sources || []}
                      innerRadius={80}
                      outerRadius={110}
                      paddingAngle={5}
                      dataKey="count"
                      nameKey="source"
                      stroke="none"
                    >
                      {(leadSourcesData?.sources || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip contentStyle={{ backgroundColor: '#111827', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel border-white/5 lg:col-span-2">
            <CardHeader>
              <CardTitle className="font-display font-semibold flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-chart-3" /> Revenue Forecast
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={forecastData?.months || []} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="month" stroke="rgba(255,255,255,0.4)" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="rgba(255,255,255,0.4)" fontSize={12} tickLine={false} axisLine={false} />
                    <RechartsTooltip contentStyle={{ backgroundColor: '#111827', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white' }} />
                    <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4, fill: 'hsl(var(--primary))', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="forecast" stroke="hsl(var(--chart-3))" strokeDasharray="5 5" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
