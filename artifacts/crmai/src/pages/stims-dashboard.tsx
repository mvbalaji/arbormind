import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Target, TrendingUp, Trophy, AlertCircle, Users, DollarSign, BarChart3,
} from "lucide-react";

const API = "/api";

type FiscalPeriod = { id: number; name: string; fiscal_year: number; period_type: string; start_date: string; end_date: string };
type Cycle = { id: number; name: string; fiscal_period_id: number; total_target: number; status: string; currency: string };
type PerfRow = {
  user_id: number; user_name: string; email: string;
  quota: number; actual: number; attainment_pct: number; gap_to_target: number;
};

function StatCard({ icon: Icon, label, value, sub, color = "text-primary" }: {
  icon: any; label: string; value: string; sub?: string; color?: string;
}) {
  return (
    <Card className="p-5 flex items-start gap-4">
      <div className={`mt-0.5 p-2 rounded-lg bg-muted ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </Card>
  );
}

function AttainmentBar({ pct }: { pct: number }) {
  const capped = Math.min(pct, 150);
  const color = pct >= 100 ? "bg-green-500" : pct >= 70 ? "bg-yellow-500" : "bg-red-400";
  return (
    <div className="relative w-full h-2.5 bg-muted rounded-full overflow-hidden">
      <div className={`${color} h-full rounded-full transition-all`} style={{ width: `${(capped / 150) * 100}%` }} />
      {/* 70% mark */}
      <div className="absolute top-0 h-full w-px bg-orange-400 opacity-60" style={{ left: `${(70 / 150) * 100}%` }} />
      {/* 100% mark */}
      <div className="absolute top-0 h-full w-px bg-primary opacity-60" style={{ left: `${(100 / 150) * 100}%` }} />
    </div>
  );
}

function fmt(n: number, currency = "GBP") {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
}

export default function StimsDashboard() {
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>("");
  const [selectedCycleId, setSelectedCycleId] = useState<string>("");

  const { data: periods = [] } = useQuery<FiscalPeriod[]>({
    queryKey: ["stims-fiscal-periods"],
    queryFn: () => fetch(`${API}/stims/fiscal-periods`).then(r => r.json()),
  });

  const { data: cycles = [] } = useQuery<Cycle[]>({
    queryKey: ["stims-target-cycles"],
    queryFn: () => fetch(`${API}/stims/target-cycles`).then(r => r.json()),
  });

  const { data: perf = [], isLoading } = useQuery<PerfRow[]>({
    queryKey: ["stims-perf", selectedPeriodId, selectedCycleId],
    queryFn: () =>
      fetch(`${API}/stims/performance-summary?fiscal_period_id=${selectedPeriodId}&cycle_id=${selectedCycleId}`)
        .then(r => r.json()),
    enabled: !!(selectedPeriodId || selectedCycleId),
  });

  const cycle = cycles.find(c => String(c.id) === selectedCycleId);
  const totalQuota = perf.reduce((s, r) => s + Number(r.quota), 0);
  const totalActual = perf.reduce((s, r) => s + Number(r.actual), 0);
  const overallPct = totalQuota > 0 ? (totalActual / totalQuota) * 100 : 0;
  const atTarget = perf.filter(r => Number(r.attainment_pct) >= 100).length;
  const atRisk = perf.filter(r => Number(r.attainment_pct) < 70).length;

  return (
    <Layout>
      <div className="space-y-4 max-w-7xl mx-auto">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary" /> Sales Performance Dashboard
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Target attainment and incentive tracking across the team
            </p>
          </div>
          <div className="flex gap-2">
            <Select value={selectedCycleId} onValueChange={setSelectedCycleId}>
              <SelectTrigger className="w-52">
                <SelectValue placeholder="Select target cycle" />
              </SelectTrigger>
              <SelectContent>
                {cycles.filter(c => c.status === "published" || c.status === "approved").map(c => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedPeriodId} onValueChange={setSelectedPeriodId}>
              <SelectTrigger className="w-52">
                <SelectValue placeholder="Select fiscal period" />
              </SelectTrigger>
              <SelectContent>
                {periods.map(p => (
                  <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={Target} label="Total Quota" value={fmt(totalQuota, cycle?.currency)} />
          <StatCard icon={TrendingUp} label="Total Actuals" value={fmt(totalActual, cycle?.currency)} />
          <StatCard icon={BarChart3} label="Team Attainment" value={`${overallPct.toFixed(1)}%`}
            color={overallPct >= 100 ? "text-green-600" : overallPct >= 70 ? "text-yellow-600" : "text-red-500"} />
          <StatCard icon={Trophy} label="At / Above Target" value={`${atTarget} / ${perf.length}`}
            sub={`${atRisk} below threshold`} color="text-purple-600" />
        </div>

        {/* Leaderboard */}
        {!selectedPeriodId && !selectedCycleId ? (
          <Card className="p-10 text-center text-muted-foreground">
            <Target className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Select a target cycle and fiscal period to view performance</p>
          </Card>
        ) : isLoading ? (
          <Card className="p-10 text-center text-muted-foreground">Loading performance data…</Card>
        ) : perf.length === 0 ? (
          <Card className="p-10 text-center text-muted-foreground">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p>No quota data found for this selection. Allocate quotas in the Target Cycles screen.</p>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="px-5 py-4 border-b flex items-center gap-2 bg-muted/40">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold text-sm">Rep Attainment Leaderboard</span>
              <span className="text-xs text-muted-foreground ml-auto">
                Threshold mark at 70% · Target at 100%
              </span>
            </div>
            <div className="divide-y">
              {perf.map((row, idx) => {
                const pct = Number(row.attainment_pct);
                const statusColor = pct >= 100 ? "text-green-600" : pct >= 70 ? "text-yellow-600" : "text-red-500";
                const badge = pct >= 100 ? "default" : pct >= 70 ? "secondary" : "destructive";
                return (
                  <div key={row.user_id} className="px-5 py-3 flex items-center gap-4">
                    <span className="w-6 text-sm font-bold text-muted-foreground text-right shrink-0">{idx + 1}</span>
                    <div className="w-36 shrink-0">
                      <p className="text-sm font-medium truncate">{row.user_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{row.email}</p>
                    </div>
                    <div className="flex-1 space-y-1">
                      <AttainmentBar pct={pct} />
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span>Quota: {fmt(Number(row.quota), cycle?.currency)}</span>
                        <span>Actual: {fmt(Number(row.actual), cycle?.currency)}</span>
                        <span className={statusColor}>Gap: {fmt(Number(row.gap_to_target), cycle?.currency)}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0 w-20">
                      <Badge variant={badge as any}>{pct.toFixed(1)}%</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>
    </Layout>
  );
}
