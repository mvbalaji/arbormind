import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { useGetDashboardStats, useGetPipelineReport, useListOpportunities, useListActivities, useListLeads } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import {
  Plus, FileText, Mic, Download, TrendingUp,
  RefreshCw, Search, MoreHorizontal, ChevronDown, ChevronUp,
  Phone, Calendar, Users, Target, ArrowRight, X,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { useCurrency } from "@/context/currency";
import { convertFromBase, CURRENCY_META } from "@/lib/currency";
import { format } from "date-fns";

const TABS = ["Sales Performance", "Opportunity Dynamics", "Productivity", "Product Analytics", "Lead Management", "News"];

const FUNNEL_COLORS = ["#1e40af","#1d4ed8","#2563eb","#3b82f6","#16a34a","#15803d","#166534","#14532d","#052e16"];

const WEEKLY_DATA = [
  { w: "W1", c: 12, m: 8 }, { w: "W2", c: 9, m: 6 }, { w: "W3", c: 15, m: 10 },
  { w: "W4", c: 11, m: 7 }, { w: "W5", c: 14, m: 9 }, { w: "W6", c: 8, m: 5 },
  { w: "W7", c: 16, m: 11 }, { w: "W8", c: 13, m: 8 }, { w: "W9", c: 10, m: 6 },
  { w: "W10", c: 17, m: 12 },
];

const RECS = [
  { pct: "+15%", text: "Follow-up with prospects you've been silent for too long.", action: "Schedule" },
  { pct: "+8%", text: "Touchbase with the latest updates", action: "Send" },
  { pct: "+6%", text: "Generate new leads to increase your pipeline", action: "Generate" },
];

const STAGE_BADGE: Record<string, string> = {
  prospecting: "text-blue-600 bg-blue-50 border-blue-200",
  qualification: "text-indigo-600 bg-indigo-50 border-indigo-200",
  proposal: "text-purple-600 bg-purple-50 border-purple-200",
  negotiation: "text-orange-600 bg-orange-50 border-orange-200",
  closed_won: "text-green-600 bg-green-50 border-green-200",
  closed_lost: "text-red-600 bg-red-50 border-red-200",
};

/* ── Gauge (semicircle) ─────────────────────────────── */
function Gauge({ value, max = 100, color = "#16a34a" }: { value: number; max?: number; color?: string }) {
  const pct = Math.min(value / max, 1);
  const r = 48, cx = 70, cy = 62;
  const startA = Math.PI;
  const sweep = Math.PI;
  const endFg = startA + sweep * pct;

  const pt = (a: number) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  const arc = (a0: number, a1: number, col: string) => {
    const [x1, y1] = pt(a0), [x2, y2] = pt(a1);
    const large = a1 - a0 > Math.PI ? 1 : 0;
    return <path d={`M${x1} ${y1} A${r} ${r} 0 ${large} 1 ${x2} ${y2}`} fill="none" stroke={col} strokeWidth="11" strokeLinecap="round" />;
  };

  // tick marks
  const ticks = [0, 20, 40, 60, 80, 100].map((v) => {
    const a = Math.PI + (v / max) * Math.PI;
    const [ix, iy] = pt(a);
    const [ox, oy] = [cx + (r + 10) * Math.cos(a), cy + (r + 10) * Math.sin(a)];
    return { v, ix, iy, ox, oy };
  });

  return (
    <svg width="140" height="80" viewBox="0 0 140 80">
      {arc(Math.PI, 2 * Math.PI, "#e5e7eb")}
      {pct > 0 && arc(Math.PI, endFg, color)}
      {ticks.map(({ v, ix, iy, ox, oy }) => (
        <g key={v}>
          <line x1={ix} y1={iy} x2={ox} y2={oy} stroke="#9ca3af" strokeWidth="1" />
          <text x={ox} y={oy + (oy > cy ? 8 : -3)} textAnchor="middle" fontSize="7" fill="#9ca3af">{v}</text>
        </g>
      ))}
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize="24" fontWeight="700" fill="currentColor">{value}</text>
    </svg>
  );
}

/* ── Donut ──────────────────────────────────────────── */
function Donut({ value, size = 100 }: { value: number; size?: number }) {
  const d = [{ value }, { value: 100 - value }];
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <PieChart width={size} height={size}>
        <Pie data={d} cx={size / 2 - 1} cy={size / 2 - 1} innerRadius={size * 0.32} outerRadius={size * 0.45}
          startAngle={90} endAngle={-270} dataKey="value" stroke="none">
          <Cell fill="rgba(255,255,255,0.9)" />
          <Cell fill="rgba(255,255,255,0.25)" />
        </Pie>
      </PieChart>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-bold text-white" style={{ fontSize: size * 0.2 }}>{value}%</span>
      </div>
    </div>
  );
}

const FUNNEL_BAND_COLORS = [
  "#7B2D2D","#C0392B","#E55A1C","#E67E22","#27AE60","#16A085","#2471A3","#1A5276","#0D2B4E",
];

const STAGE_INSIGHTS: Record<string, string> = {
  Prospecting: "Top of funnel — focus on volume and lead quality to drive pipeline growth.",
  Qualification: "Leads being assessed for fit. High drop-off here signals qualification criteria need tightening.",
  Proposal: "Active deals with proposals sent. Track response time to improve win rates.",
  Negotiation: "Deals in final discussions. Accelerate decisions with deal-desk support and approvals.",
  "Closed Won": "Successfully converted deals. Analyse patterns to replicate winning strategies.",
  "Closed Lost": "Lost opportunities. Review reasons to improve messaging and objection handling.",
};

/* ── Funnel ─────────────────────────────────────────── */
function Funnel({ stages }: { stages: { label: string; count: number }[] }) {
  const [selected, setSelected] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; label: string; pct: number; count: number } | null>(null);
  if (!stages.length) return null;
  const n = stages.length;
  const W = 340, rowH = 18, gap = 0;
  const totalH = n * rowH;
  const cx = W / 2;
  const topHalf = W * 0.475, botHalf = W * 0.07;
  const total = stages.reduce((s, a) => s + a.count, 0);

  const sel = selected !== null ? stages[selected] : null;
  const selIdx = selected ?? -1;
  const selColor = selected !== null ? FUNNEL_BAND_COLORS[selected % FUNNEL_BAND_COLORS.length] : "#2563eb";
  const selPct = sel && total > 0 ? Math.round((sel.count / total) * 100) : 0;
  const nextStage = selected !== null ? stages[selected + 1] : null;
  const prevStage = selected !== null && selected > 0 ? stages[selected - 1] : null;
  const stageConv = sel && nextStage ? Math.round((nextStage.count / sel.count) * 100) : null;
  const cumulConv = sel && stages[0].count > 0 ? Math.round((sel.count / stages[0].count) * 100) : 100;
  const dropOff = sel && nextStage ? sel.count - nextStage.count : null;

  return (
    <div className="flex flex-col w-full py-1">
      {/* Funnel SVG */}
      <div className="flex justify-center relative">
        <svg viewBox={`0 0 ${W} ${totalH}`} style={{ width: "auto", height: 140, display: "block" }}
          onMouseLeave={() => setTooltip(null)}>
          <defs>
            <filter id="fshadow" x="-5%" y="-5%" width="110%" height="110%">
              <feDropShadow dx="1" dy="2" stdDeviation="2" floodOpacity="0.25" />
            </filter>
          </defs>
          <g filter="url(#fshadow)">
            {stages.map((s, i) => {
              const y = i * rowH;
              const fracTop = i / (n - 1 || 1);
              const fracBot = Math.min((i + 1) / (n - 1 || 1), 1);
              const hTop = topHalf - (topHalf - botHalf) * fracTop;
              const hBot = topHalf - (topHalf - botHalf) * fracBot;
              const x1 = cx - hTop, x2 = cx + hTop;
              const x3 = cx + hBot, x4 = cx - hBot;
              const pts = `${x1},${y} ${x2},${y} ${x3},${y + rowH} ${x4},${y + rowH}`;
              const color = FUNNEL_BAND_COLORS[i % FUNNEL_BAND_COLORS.length];
              const pct = total > 0 ? Math.round((s.count / total) * 100) : 0;
              const isSelected = selected === i;
              return (
                <g key={i} style={{ cursor: "pointer" }}
                  onClick={() => setSelected(selected === i ? null : i)}
                  onMouseEnter={(e) => {
                    const rect = (e.currentTarget.closest("svg") as SVGSVGElement).getBoundingClientRect();
                    setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top, label: s.label, pct, count: s.count });
                  }}
                  onMouseMove={(e) => {
                    const rect = (e.currentTarget.closest("svg") as SVGSVGElement).getBoundingClientRect();
                    setTooltip(t => t ? { ...t, x: e.clientX - rect.left, y: e.clientY - rect.top } : null);
                  }}>
                  <polygon points={pts} fill={color} opacity={selected !== null && !isSelected ? 0.45 : 1} />
                  {isSelected && <polygon points={pts} fill="none" stroke="white" strokeWidth="1.5" opacity="0.9" />}
                  <polygon points={`${cx},${y} ${x2},${y} ${x3},${y + rowH} ${cx},${y + rowH}`} fill="white" opacity="0.06" />
                  {i > 0 && <line x1={x1} y1={y} x2={x2} y2={y} stroke="white" strokeWidth="0.5" opacity="0.4" />}
                  <text x={cx} y={y + rowH / 2} textAnchor="middle" dominantBaseline="middle"
                    fontSize="8" fontWeight="500" fill="white" opacity="0.9" style={{ pointerEvents: "none" }}>
                    {s.label}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
        {tooltip && (
          <div className="absolute z-50 pointer-events-none bg-gray-900 text-white rounded-lg shadow-xl px-2.5 py-1.5 text-xs border border-white/10"
            style={{ left: tooltip.x + 14, top: tooltip.y - 8, minWidth: 130 }}>
            <div className="font-semibold mb-0.5">{tooltip.label}</div>
            <div className="flex justify-between gap-3 text-gray-300"><span>Count</span><span className="font-bold text-white">{tooltip.count}</span></div>
            <div className="flex justify-between gap-3 text-gray-300"><span>Share</span><span className="font-bold text-white">{tooltip.pct}%</span></div>
          </div>
        )}
      </div>

      {/* Expanded stage detail */}
      {sel && (
        <div className="mx-1 mt-2 rounded-lg border overflow-hidden" style={{ borderColor: selColor + "55", backgroundColor: selColor + "0d" }}>
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2" style={{ backgroundColor: selColor + "22" }}>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: selColor }} />
              <span className="text-xs font-bold text-foreground">{sel.label}</span>
            </div>
            <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground text-xs px-1.5 py-0.5 rounded hover:bg-muted/50">✕</button>
          </div>
          {/* Metrics grid */}
          <div className="grid grid-cols-2 gap-px bg-border">
            {[
              { label: "Opportunities", value: sel.count, sub: "in this stage" },
              { label: "Pipeline Share", value: `${selPct}%`, sub: `of ${total} total` },
              { label: "Cumulative Conv.", value: `${cumulConv}%`, sub: "from top of funnel" },
              { label: "Drop-off to Next", value: dropOff !== null ? dropOff : "—", sub: nextStage ? `→ ${nextStage.label}` : "final stage" },
            ].map((m, i) => (
              <div key={i} className="bg-card px-3 py-2">
                <div className="text-[10px] text-muted-foreground">{m.label}</div>
                <div className="text-sm font-bold text-foreground mt-0.5">{m.value}</div>
                <div className="text-[10px] text-muted-foreground">{m.sub}</div>
              </div>
            ))}
          </div>
          {/* Conversion bar */}
          {stageConv !== null && (
            <div className="px-3 py-2">
              <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                <span>Stage conversion → {nextStage?.label}</span>
                <span className="font-semibold text-foreground">{stageConv}%</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${stageConv}%`, backgroundColor: selColor }} />
              </div>
            </div>
          )}
          {/* Insight */}
          <div className="px-3 py-2 border-t border-border/50">
            <p className="text-[10px] text-muted-foreground leading-snug">
              💡 {STAGE_INSIGHTS[sel.label] ?? "Review opportunities in this stage and take action to move them forward."}
            </p>
          </div>
        </div>
      )}

      {/* Legend — shown when nothing selected */}
      {!sel && (
        <div className="px-2 pt-1.5">
          <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
            {stages.map((s, i) => {
              const pct = total > 0 ? Math.round((s.count / total) * 100) : 0;
              return (
                <div key={i} className="flex items-center gap-1.5 min-w-0 cursor-pointer hover:opacity-75 transition-opacity"
                  onClick={() => setSelected(i)}>
                  <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: FUNNEL_BAND_COLORS[i % FUNNEL_BAND_COLORS.length] }} />
                  <span className="text-[10px] text-foreground truncate flex-1">{s.label}</span>
                  <span className="text-[10px] font-semibold text-foreground shrink-0">{s.count}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0">({pct}%)</span>
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5 text-center">Click a stage or band for details</p>
        </div>
      )}
    </div>
  );
}

/* ── Panel wrapper ──────────────────────────────────── */
function Panel({ title, children, headerRight, noPad }: {
  title: string; children: React.ReactNode; headerRight?: React.ReactNode; noPad?: boolean;
}) {
  return (
    <div className="border border-border rounded-md bg-card overflow-hidden flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
        <span className="text-xs font-semibold text-foreground">{title}</span>
        {headerRight && <div>{headerRight}</div>}
      </div>
      <div className={cn("flex-1", noPad ? "" : "p-3")}>{children}</div>
    </div>
  );
}

/* ── Drilldown wrapper ──────────────────────────────── */
function DrillCard({ title, icon: Icon, color, children, drill }: {
  title: string; icon?: React.ElementType; color?: string;
  children: React.ReactNode; drill: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border rounded-md bg-card overflow-hidden flex flex-col">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center justify-between px-3 py-2 border-b border-border hover:bg-muted/30 transition-colors w-full text-left"
      >
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-3.5 h-3.5" style={{ color }} />}
          <span className="text-xs font-semibold text-foreground">{title}</span>
        </div>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
      </button>
      <div className="flex-1 p-3">{children}</div>
      {open && (
        <div className="border-t border-border bg-muted/20 p-3">
          {drill}
        </div>
      )}
    </div>
  );
}

export default function SalesManager() {
  const [activeTab, setActiveTab] = useState("Sales Performance");
  const [funnelView, setFunnelView] = useState<"opportunities" | "stage-conversion" | "pipeline-conversion">("opportunities");
  const { data: stats } = useGetDashboardStats({});
  const { data: pipeline } = useGetPipelineReport({});
  const { data: oppsData } = useListOpportunities({ page: 1, pageSize: 10 });
  const { data: wonOpps } = useListOpportunities({ page: 1, pageSize: 5 });
  const { data: activitiesData } = useListActivities({ limit: 50 });
  const leadsData = undefined;
  const { displayCurrency: currency, rates } = useCurrency();
  const meta = CURRENCY_META[currency] ?? CURRENCY_META["GBP"];

  const fmt = (v: number) =>
    `${meta.symbol}${convertFromBase(v, currency, rates).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  const STAGE_ORDER = ["prospecting","qualification","proposal","negotiation","closed_won","closed_lost"];
  const STAGE_LABELS: Record<string, string> = {
    prospecting: "Prospecting", qualification: "Qualification",
    proposal: "Proposal", negotiation: "Negotiation",
    closed_won: "Closed Won", closed_lost: "Closed Lost",
  };

  const stages = pipeline?.byStage
    ? STAGE_ORDER
        .filter((s) => (pipeline.byStage as any)[s]?.count > 0)
        .map((s) => ({
          label: STAGE_LABELS[s] ?? s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
          count: (pipeline.byStage as any)[s]?.count ?? 0,
          value: (pipeline.byStage as any)[s]?.totalValue ?? 0,
        }))
        .filter((s) => s.count > 0)
    : STAGE_ORDER.map((s, i) => ({
        label: STAGE_LABELS[s], count: [45, 32, 18, 9, 12, 4][i] ?? 0, value: 0,
      }));

  const allActivities = (activitiesData as any)?.data ?? (activitiesData as any)?.activities ?? [];
  const meetings = allActivities.filter((a: any) => a.type === "meeting");
  const calls = allActivities.filter((a: any) => a.type === "call");
  const completedMeetings = meetings.filter((a: any) => a.status === "completed");
  const completedCalls = calls.filter((a: any) => a.status === "completed");
  const meetingRate = meetings.length > 0 ? Math.round((completedMeetings.length / meetings.length) * 100) : 89;
  const callRate = calls.length > 0 ? Math.round((completedCalls.length / calls.length) * 100) : 84;

  const wonRate = stats?.totalOpportunities
    ? Math.round(((stats as any).wonOpportunities ?? 0) / stats.totalOpportunities * 100)
    : 41;
  const totalPipelineValue = stages.reduce((s, a) => s + (a.value ?? 0), 0);
  const wonPipelineValue = (pipeline?.byStage as any)?.closed_won?.totalValue ?? 0;
  const quotaTarget = totalPipelineValue * 0.3;
  const quotaAttained = quotaTarget > 0 ? Math.min(Math.round((wonPipelineValue / quotaTarget) * 100), 100) : 80;

  const topOpps = oppsData?.opportunities?.slice(0, 5) ?? [];

  return (
    <Layout>
      <div className="flex flex-col h-full overflow-y-auto text-sm"
        style={{ scrollbarWidth: "thin", scrollbarColor: "hsl(var(--muted-foreground) / 0.4) transparent" }}>

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-4 pt-3 pb-1.5 shrink-0 flex-wrap gap-2">
          <h1 className="text-base font-bold text-foreground">Sales manager homepage</h1>
          <div className="flex items-center gap-1.5 flex-wrap">
            <button className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors">
              <Plus className="w-3 h-3" />New opportunity
            </button>
            <button className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors">
              <FileText className="w-3 h-3" />New offer
            </button>
            <button className="flex items-center gap-1 px-3 py-1.5 rounded text-xs text-muted-foreground hover:text-foreground transition-colors">
              <Mic className="w-3 h-3" />Capture notes
            </button>
            <button className="flex items-center gap-1 px-3 py-1.5 rounded text-xs text-muted-foreground hover:text-foreground transition-colors">
              <Download className="w-3 h-3" />Download weekly report
            </button>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex items-end gap-0 px-4 border-b border-border shrink-0 overflow-x-auto">
          {TABS.map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={cn(
                "px-3 py-2 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors",
                activeTab === tab
                  ? "border-orange-500 text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}>
              {tab.toUpperCase()}
            </button>
          ))}
        </div>

        {/* ── Sales Performance ── */}
        {activeTab === "Sales Performance" && (
          <div className="flex-1 p-3 space-y-3">

            {/* Row 1: Funnel | Quota + Conversion | Recommendation */}
            <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-3">

              {/* Funnel */}
              <Panel title="Full pipeline"
                headerRight={
                  <select
                    value={funnelView}
                    onChange={(e) => setFunnelView(e.target.value as any)}
                    className="text-[10px] border border-border rounded px-1.5 py-0.5 bg-card text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="opportunities">Number of Opportunities</option>
                    <option value="stage-conversion">Stage Conversion Rate</option>
                    <option value="pipeline-conversion">Pipeline Conversion</option>
                  </select>
                }>
                {funnelView === "opportunities" && <Funnel stages={stages} />}
                {funnelView === "stage-conversion" && (
                  <div className="space-y-1.5 p-1">
                    {stages.map((s, i) => {
                      const next = stages[i + 1];
                      const rate = next ? Math.round((next.count / s.count) * 100) : 100;
                      return (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: FUNNEL_BAND_COLORS[i % FUNNEL_BAND_COLORS.length] }} />
                          <span className="flex-1 text-foreground truncate">{s.label}</span>
                          <span className="text-muted-foreground">{s.count}</span>
                          {next && (
                            <div className="flex items-center gap-1 ml-1">
                              <div className="h-1.5 rounded-full bg-muted w-16 overflow-hidden">
                                <div className="h-full rounded-full bg-blue-500" style={{ width: `${rate}%` }} />
                              </div>
                              <span className="font-semibold text-blue-600 w-8 text-right">{rate}%</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    <p className="text-[10px] text-muted-foreground pt-1">Conversion rate from each stage to the next</p>
                  </div>
                )}
                {funnelView === "pipeline-conversion" && (
                  <div className="space-y-1.5 p-1">
                    {stages.map((s, i) => {
                      const topCount = stages[0]?.count || 1;
                      const rate = Math.round((s.count / topCount) * 100);
                      return (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: FUNNEL_BAND_COLORS[i % FUNNEL_BAND_COLORS.length] }} />
                          <span className="flex-1 text-foreground truncate">{s.label}</span>
                          <span className="text-muted-foreground">{s.count}</span>
                          <div className="flex items-center gap-1 ml-1">
                            <div className="h-1.5 rounded-full bg-muted w-16 overflow-hidden">
                              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${rate}%` }} />
                            </div>
                            <span className="font-semibold text-emerald-600 w-8 text-right">{rate}%</span>
                          </div>
                        </div>
                      );
                    })}
                    <p className="text-[10px] text-muted-foreground pt-1">Conversion rate from top of pipeline</p>
                  </div>
                )}
              </Panel>

              {/* Right column: gauges + recommendation */}
              <div className="flex flex-col gap-3">
                {/* Gauges side by side */}
                <div className="grid grid-cols-2 gap-3 flex-1">
                  <DrillCard title="% Quota attainment" icon={Target} color="#16a34a"
                    drill={
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between text-muted-foreground"><span>Won Revenue</span><span className="font-semibold text-foreground">{fmt(wonPipelineValue)}</span></div>
                        <div className="flex justify-between text-muted-foreground"><span>Target (est.)</span><span className="font-semibold text-foreground">{fmt(quotaTarget)}</span></div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full" style={{ width: `${quotaAttained}%` }} /></div>
                        <p className="text-[10px] text-muted-foreground">Top closed won deals:</p>
                        {(wonOpps as any)?.opportunities?.slice(0,3).map((o: any) => (
                          <div key={o.id} className="flex justify-between">
                            <Link href={`/opportunities/${o.id}`} className="text-blue-600 hover:underline truncate max-w-[120px]">{o.name}</Link>
                            <span className="font-medium">{fmt(o.amount ?? 0)}</span>
                          </div>
                        )) ?? <span className="text-muted-foreground">No won deals yet</span>}
                      </div>
                    }>
                    <div className="flex flex-col items-center justify-center pt-1">
                      <Gauge value={quotaAttained || 80} color="#16a34a" />
                    </div>
                  </DrillCard>
                  <DrillCard title="% Conversion rate" icon={TrendingUp} color="#6b7280"
                    drill={
                      <div className="space-y-1.5 text-xs">
                        {stages.map((s, i) => {
                          const next = stages[i + 1];
                          if (!next) return null;
                          const rate = Math.round((next.count / (s.count || 1)) * 100);
                          return (
                            <div key={i} className="flex items-center gap-2">
                              <span className="text-muted-foreground truncate flex-1">{s.label} → {next.label}</span>
                              <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden"><div className="h-full bg-blue-500 rounded-full" style={{ width: `${rate}%` }} /></div>
                              <span className="font-semibold text-blue-600 w-7 text-right">{rate}%</span>
                            </div>
                          );
                        })}
                        <p className="text-[10px] text-muted-foreground pt-1">Overall: {stages[0]?.count ? Math.round(((stages.find(s=>s.label==="Closed Won")?.count??0)/stages[0].count)*100) : wonRate}% from prospect to won</p>
                      </div>
                    }>
                    <div className="flex flex-col items-center justify-center pt-1">
                      <Gauge value={wonRate || 41} color="#9ca3af" />
                    </div>
                  </DrillCard>
                </div>

                {/* Recommendation */}
                <DrillCard title="AI Recommendations" icon={TrendingUp} color="#2563eb"
                  drill={
                    <div className="space-y-2 text-xs">
                      <p className="text-muted-foreground text-[10px]">Based on pipeline analysis:</p>
                      <div className="flex justify-between"><span className="text-muted-foreground">Stale opportunities (&gt;30d)</span><span className="font-semibold">{topOpps.filter((o:any)=>new Date(o.updatedAt)<new Date(Date.now()-30*86400000)).length}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">High probability (&gt;70%)</span><span className="font-semibold text-emerald-600">{topOpps.filter((o:any)=>(o.probability??0)>70).length}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Needs follow-up</span><span className="font-semibold text-orange-500">{calls.filter((a:any)=>a.status==="planned").length} calls</span></div>
                      <Link href="/opportunities" className="text-blue-600 hover:underline text-[10px] flex items-center gap-1">View all opportunities <ArrowRight className="w-3 h-3" /></Link>
                    </div>
                  }>
                  <div className="space-y-2">
                    {RECS.map((r, i) => (
                      <div key={i} className="flex items-start gap-2 pb-2 border-b border-border last:border-0 last:pb-0">
                        <span className="text-xs font-bold text-emerald-600 w-10 shrink-0 pt-0.5">{r.pct}</span>
                        <span className="text-xs text-foreground flex-1 leading-snug">{r.text}</span>
                        <button className="text-xs text-blue-600 hover:underline shrink-0 pt-0.5">{r.action}</button>
                      </div>
                    ))}
                  </div>
                </DrillCard>
              </div>
            </div>

            {/* Row 2: Weekly chart | Meeting donut | Calls donut | Totals */}
            <div className="grid grid-cols-1 xl:grid-cols-[1fr_160px_160px_160px] gap-3">

              {/* Bar chart */}
              <div className="border border-border rounded-md bg-card overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                  <span className="text-xs font-semibold text-foreground">Successful calls and meetings by week</span>
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />Calls</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-700 inline-block" />Meetings</span>
                  </div>
                </div>
                <div className="p-2 h-36">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={WEEKLY_DATA} barGap={2} barSize={7}>
                      <XAxis dataKey="w" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                      <YAxis hide />
                      <RechartsTooltip contentStyle={{ fontSize: 11 }} />
                      <Bar dataKey="c" name="Calls" fill="#93c5fd" radius={[2, 2, 0, 0]} />
                      <Bar dataKey="m" name="Meetings" fill="#1d4ed8" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Successful meetings */}
              <div className="rounded-md bg-blue-600 overflow-hidden flex flex-col">
                <div className="px-3 py-2 border-b border-blue-500">
                  <span className="text-xs font-semibold text-white">Successful meetings</span>
                </div>
                <div className="flex-1 flex items-center justify-center p-3">
                  <Donut value={meetingRate} size={100} />
                </div>
                {completedMeetings.length > 0 && (
                  <div className="border-t border-blue-500 px-3 py-2 space-y-1">
                    {completedMeetings.slice(0, 3).map((a: any) => (
                      <div key={a.id} className="text-[10px] text-blue-100 flex items-center gap-1">
                        <Calendar className="w-2.5 h-2.5 shrink-0" />
                        <span className="truncate">{a.subject || a.contactName || "Meeting"}</span>
                      </div>
                    ))}
                    <Link href="/activities" className="text-[10px] text-blue-200 hover:text-white flex items-center gap-1 pt-0.5">
                      All meetings <ArrowRight className="w-2.5 h-2.5" />
                    </Link>
                  </div>
                )}
              </div>

              {/* Successful calls */}
              <div className="rounded-md bg-blue-600 overflow-hidden flex flex-col">
                <div className="px-3 py-2 border-b border-blue-500">
                  <span className="text-xs font-semibold text-white">Successful calls</span>
                </div>
                <div className="flex-1 flex items-center justify-center p-3">
                  <Donut value={callRate} size={100} />
                </div>
                {completedCalls.length > 0 && (
                  <div className="border-t border-blue-500 px-3 py-2 space-y-1">
                    {completedCalls.slice(0, 3).map((a: any) => (
                      <div key={a.id} className="text-[10px] text-blue-100 flex items-center gap-1">
                        <Phone className="w-2.5 h-2.5 shrink-0" />
                        <span className="truncate">{a.subject || a.contactName || "Call"}</span>
                      </div>
                    ))}
                    <Link href="/activities" className="text-[10px] text-blue-200 hover:text-white flex items-center gap-1 pt-0.5">
                      All calls <ArrowRight className="w-2.5 h-2.5" />
                    </Link>
                  </div>
                )}
              </div>

              {/* Totals */}
              <div className="flex flex-col gap-3">
                <div className="flex-1 rounded-md bg-blue-600 px-4 py-3 flex flex-col justify-center cursor-pointer hover:bg-blue-700 transition-colors">
                  <div className="text-[11px] text-blue-200 font-medium">Total # of meetings</div>
                  <div className="text-3xl font-bold text-white mt-1">{meetings.length || 0}</div>
                  <div className="text-[10px] text-blue-300 mt-1">{completedMeetings.length} completed</div>
                </div>
                <div className="flex-1 rounded-md bg-blue-600 px-4 py-3 flex flex-col justify-center cursor-pointer hover:bg-blue-700 transition-colors">
                  <div className="text-[11px] text-blue-200 font-medium">Total # of calls</div>
                  <div className="text-3xl font-bold text-white mt-1">{calls.length || 0}</div>
                  <div className="text-[10px] text-blue-300 mt-1">{completedCalls.length} completed</div>
                </div>
              </div>
            </div>

            {/* Row 3: Top opportunities */}
            <div className="border border-border rounded-md bg-card overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
                <span className="w-3 h-3 rounded-sm bg-red-500 shrink-0" />
                <span className="text-xs font-semibold text-foreground">Top opportunities to close</span>
                <button className="text-muted-foreground hover:text-foreground ml-1"><Plus className="w-3.5 h-3.5" /></button>
                <button className="text-muted-foreground hover:text-foreground"><RefreshCw className="w-3.5 h-3.5" /></button>
                <button className="text-muted-foreground hover:text-foreground"><MoreHorizontal className="w-3.5 h-3.5" /></button>
                <div className="ml-auto flex items-center gap-1 border border-border rounded px-2 py-0.5 text-xs text-muted-foreground cursor-pointer hover:bg-muted">
                  <Search className="w-3 h-3" />Search
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/20 text-muted-foreground">
                      <th className="text-left px-3 py-2 font-medium w-8">#</th>
                      <th className="text-left px-3 py-2 font-medium">Name</th>
                      <th className="text-left px-3 py-2 font-medium">Opportunity amount</th>
                      <th className="text-left px-3 py-2 font-medium">Stage</th>
                      <th className="text-left px-3 py-2 font-medium">Created on</th>
                      <th className="text-left px-3 py-2 font-medium">Predictive probability</th>
                      <th className="text-left px-3 py-2 font-medium">Loyalty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topOpps.length > 0
                      ? topOpps.map((opp: any, i: number) => (
                          <tr key={opp.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                            <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                            <td className="px-3 py-2">
                              <Link href={`/opportunities/${opp.id}`} className="text-blue-600 hover:underline">{opp.name}</Link>
                            </td>
                            <td className="px-3 py-2 font-medium">{fmt(opp.amount ?? 0)}</td>
                            <td className="px-3 py-2">
                              <Badge variant="outline" className={cn("text-[10px] capitalize", STAGE_BADGE[opp.stage] ?? "")}>
                                {(opp.stage ?? "").replace(/_/g, " ")}
                              </Badge>
                            </td>
                            <td className="px-3 py-2 text-muted-foreground">
                              {opp.createdAt ? format(new Date(opp.createdAt), "M/d/yyyy h:mm a") : "—"}
                            </td>
                            <td className="px-3 py-2">{opp.probability ?? "—"}</td>
                            <td className="px-3 py-2 text-muted-foreground">—</td>
                          </tr>
                        ))
                      : [
                          { name: "Infocom / 20", amount: "10,340.00", stage: "Qualification", date: "4/13/2023 7:17 PM", prob: 76, loyalty: "1 – Interested" },
                          { name: "Alpha Business / Package", amount: "5,300.00", stage: "Qualification", date: "4/13/2023 7:17 PM", prob: 86, loyalty: "2 – Supportive" },
                          { name: "Optima Prime / 2", amount: "10,480.00", stage: "Proposal", date: "4/13/2023 7:17 PM", prob: 94, loyalty: "3 – Active supporter" },
                          { name: "BBR / 20 / Renewal", amount: "2,760.00", stage: "Contracting", date: "4/13/2023 7:17 PM", prob: 99, loyalty: "2 – Supportive" },
                        ].map((r, i) => (
                          <tr key={i} className="border-b border-border hover:bg-muted/20 transition-colors">
                            <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                            <td className="px-3 py-2 text-blue-600 cursor-pointer hover:underline">{r.name}</td>
                            <td className="px-3 py-2">{r.amount}</td>
                            <td className="px-3 py-2">
                              <Badge variant="outline" className={cn("text-[10px]",
                                r.stage === "Qualification" ? "text-green-700 bg-green-50 border-green-200" :
                                r.stage === "Proposal" ? "text-purple-600 bg-purple-50 border-purple-200" :
                                "text-orange-600 bg-orange-50 border-orange-200"
                              )}>{r.stage}</Badge>
                            </td>
                            <td className="px-3 py-2 text-muted-foreground">{r.date}</td>
                            <td className="px-3 py-2">{r.prob}</td>
                            <td className="px-3 py-2 text-muted-foreground">{r.loyalty}</td>
                          </tr>
                        ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── Opportunity Dynamics ── */}
        {activeTab === "Opportunity Dynamics" && (
          <div className="flex-1 p-3 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {/* Win/Loss ratio */}
              <DrillCard title="Win / Loss Ratio" icon={TrendingUp} color="#16a34a"
                drill={
                  <div className="space-y-1.5 text-xs">
                    {stages.map((s, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="text-muted-foreground">{s.label}</span>
                        <span className="font-semibold">{s.count} deals</span>
                      </div>
                    ))}
                  </div>
                }>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between"><span className="text-muted-foreground">Won</span><span className="font-bold text-emerald-600">{stages.find(s=>s.label==="Closed Won")?.count ?? 0}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Lost</span><span className="font-bold text-red-500">{stages.find(s=>s.label==="Closed Lost")?.count ?? 0}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Win Rate</span><span className="font-bold">{wonRate}%</span></div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden flex">
                    <div className="h-full bg-emerald-500" style={{width:`${wonRate}%`}} />
                    <div className="h-full bg-red-400 flex-1" />
                  </div>
                </div>
              </DrillCard>

              {/* Average deal size */}
              <DrillCard title="Avg Deal Size" icon={Target} color="#2563eb"
                drill={
                  <div className="space-y-1 text-xs">
                    {topOpps.slice(0,4).map((o:any)=>(
                      <div key={o.id} className="flex justify-between">
                        <Link href={`/opportunities/${o.id}`} className="text-blue-600 hover:underline truncate max-w-[120px]">{o.name}</Link>
                        <span className="font-medium">{fmt(o.amount??0)}</span>
                      </div>
                    ))}
                  </div>
                }>
                <div className="text-center pt-1">
                  <div className="text-2xl font-bold text-foreground">{fmt(topOpps.length>0 ? topOpps.reduce((s:number,o:any)=>s+(o.amount??0),0)/topOpps.length : 0)}</div>
                  <div className="text-[10px] text-muted-foreground mt-1">across {topOpps.length} active deals</div>
                </div>
              </DrillCard>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Pipeline velocity */}
              <DrillCard title="Pipeline Velocity" icon={TrendingUp} color="#f59e0b"
                drill={
                  <div className="space-y-1.5 text-xs text-muted-foreground">
                    <p>Pipeline value × win rate ÷ avg sales cycle</p>
                    <div className="flex justify-between pt-1"><span>Pipeline value</span><span className="font-semibold text-foreground">{fmt(totalPipelineValue)}</span></div>
                    <div className="flex justify-between"><span>Win rate</span><span className="font-semibold text-foreground">{wonRate}%</span></div>
                    <div className="flex justify-between"><span>Active deals</span><span className="font-semibold text-foreground">{topOpps.length}</span></div>
                  </div>
                }>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between"><span className="text-muted-foreground">Total Pipeline</span><span className="font-bold">{fmt(totalPipelineValue)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Active Deals</span><span className="font-bold">{topOpps.length}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Avg Age</span><span className="font-bold text-amber-500">~14 days</span></div>
                </div>
              </DrillCard>

              {/* Stage distribution */}
              <DrillCard title="Stage Distribution" icon={Users} color="#8b5cf6"
                drill={
                  <div className="space-y-1.5 text-xs">
                    {stages.map((s,i)=>{
                      const pct = stages.reduce((a,b)=>a+b.count,0)>0?Math.round(s.count/stages.reduce((a,b)=>a+b.count,0)*100):0;
                      return <div key={i} className="flex items-center gap-2">
                        <span className="truncate flex-1 text-muted-foreground">{s.label}</span>
                        <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden"><div className="h-full rounded-full" style={{width:`${pct}%`,backgroundColor:FUNNEL_BAND_COLORS[i%FUNNEL_BAND_COLORS.length]}} /></div>
                        <span className="font-semibold w-6 text-right">{pct}%</span>
                      </div>;
                    })}
                  </div>
                }>
                <div className="space-y-1.5 text-xs">
                  {stages.slice(0,4).map((s,i)=>{
                    const total=stages.reduce((a,b)=>a+b.count,0);
                    const pct=total>0?Math.round(s.count/total*100):0;
                    return <div key={i} className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-sm shrink-0" style={{backgroundColor:FUNNEL_BAND_COLORS[i%FUNNEL_BAND_COLORS.length]}} />
                      <span className="truncate flex-1 text-muted-foreground">{s.label}</span>
                      <span className="font-semibold">{s.count} <span className="text-muted-foreground">({pct}%)</span></span>
                    </div>;
                  })}
                </div>
              </DrillCard>
            </div>

            {/* Top opportunities */}
            <div className="border border-border rounded-md bg-card overflow-hidden">
              <div className="px-3 py-2 border-b border-border flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm bg-blue-500 shrink-0" />
                <span className="text-xs font-semibold">Open Opportunities by Value</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-border bg-muted/20 text-muted-foreground">
                    <th className="text-left px-3 py-2 font-medium">Name</th>
                    <th className="text-left px-3 py-2 font-medium">Amount</th>
                    <th className="text-left px-3 py-2 font-medium">Stage</th>
                    <th className="text-left px-3 py-2 font-medium">Probability</th>
                  </tr></thead>
                  <tbody>
                    {topOpps.map((o:any)=>(
                      <tr key={o.id} className="border-b border-border hover:bg-muted/20">
                        <td className="px-3 py-2"><Link href={`/opportunities/${o.id}`} className="text-blue-600 hover:underline">{o.name}</Link></td>
                        <td className="px-3 py-2 font-medium">{fmt(o.amount??0)}</td>
                        <td className="px-3 py-2"><Badge variant="outline" className={cn("text-[10px] capitalize",STAGE_BADGE[o.stage]??"")}>{o.stage?.replace(/_/g," ")}</Badge></td>
                        <td className="px-3 py-2">{o.probability??"-"}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── Productivity ── */}
        {activeTab === "Productivity" && (
          <div className="flex-1 p-3 space-y-3">
            <div className="grid grid-cols-3 gap-3">
              {[
                {label:"Total Activities",value:allActivities.length,sub:"logged",color:"#2563eb",icon:Calendar},
                {label:"Calls Made",value:calls.length,sub:`${completedCalls.length} completed`,color:"#16a34a",icon:Phone},
                {label:"Meetings Held",value:meetings.length,sub:`${completedMeetings.length} completed`,color:"#f59e0b",icon:Users},
              ].map((m,i)=>(
                <div key={i} className="border border-border rounded-md bg-card p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <m.icon className="w-3.5 h-3.5" style={{color:m.color}} />
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{m.label}</span>
                  </div>
                  <div className="text-2xl font-bold text-foreground">{m.value}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{m.sub}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <DrillCard title="Call Completion Rate" icon={Phone} color="#16a34a"
                drill={
                  <div className="space-y-1.5 text-xs">
                    {completedCalls.slice(0,5).map((a:any)=>(
                      <div key={a.id} className="flex items-center gap-2">
                        <Phone className="w-3 h-3 text-emerald-500 shrink-0" />
                        <span className="truncate text-muted-foreground">{a.subject||a.contactName||"Call"}</span>
                        <Badge variant="outline" className="text-[9px] ml-auto shrink-0">done</Badge>
                      </div>
                    ))}
                    {completedCalls.length===0 && <span className="text-muted-foreground">No completed calls yet</span>}
                  </div>
                }>
                <div className="flex flex-col items-center pt-1">
                  <Donut value={callRate} size={90} />
                  <div className="text-[10px] text-muted-foreground mt-2">{completedCalls.length} of {calls.length} calls done</div>
                </div>
              </DrillCard>

              <DrillCard title="Meeting Completion Rate" icon={Calendar} color="#f59e0b"
                drill={
                  <div className="space-y-1.5 text-xs">
                    {completedMeetings.slice(0,5).map((a:any)=>(
                      <div key={a.id} className="flex items-center gap-2">
                        <Calendar className="w-3 h-3 text-amber-500 shrink-0" />
                        <span className="truncate text-muted-foreground">{a.subject||a.contactName||"Meeting"}</span>
                        <Badge variant="outline" className="text-[9px] ml-auto shrink-0">done</Badge>
                      </div>
                    ))}
                    {completedMeetings.length===0 && <span className="text-muted-foreground">No completed meetings yet</span>}
                  </div>
                }>
                <div className="flex flex-col items-center pt-1">
                  <Donut value={meetingRate} size={90} />
                  <div className="text-[10px] text-muted-foreground mt-2">{completedMeetings.length} of {meetings.length} meetings done</div>
                </div>
              </DrillCard>
            </div>

            {/* Recent activities list */}
            <div className="border border-border rounded-md bg-card overflow-hidden">
              <div className="px-3 py-2 border-b border-border">
                <span className="text-xs font-semibold">Recent Activities</span>
              </div>
              <div className="divide-y divide-border">
                {allActivities.slice(0,6).map((a:any)=>(
                  <div key={a.id} className="flex items-center gap-3 px-3 py-2">
                    {a.type==="call" ? <Phone className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <Calendar className="w-3.5 h-3.5 text-blue-500 shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate">{a.subject||a.contactName||a.type}</div>
                      <div className="text-[10px] text-muted-foreground">{a.contactName||""}</div>
                    </div>
                    <Badge variant="outline" className={cn("text-[9px] shrink-0", a.status==="completed"?"border-emerald-500 text-emerald-600":"")}>{a.status}</Badge>
                  </div>
                ))}
                {allActivities.length===0 && <div className="px-3 py-4 text-xs text-muted-foreground text-center">No activities recorded yet</div>}
              </div>
            </div>
          </div>
        )}

        {/* ── Product Analytics ── */}
        {activeTab === "Product Analytics" && (
          <div className="flex-1 p-3 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {[
                {label:"Deals with Products",value:topOpps.filter((o:any)=>o.amount>0).length,sub:`of ${topOpps.length} total`,color:"#2563eb"},
                {label:"Avg Deal Value",value:fmt(topOpps.length>0?topOpps.reduce((s:number,o:any)=>s+(o.amount??0),0)/topOpps.length:0),sub:"per opportunity",color:"#16a34a"},
              ].map((m,i)=>(
                <div key={i} className="border border-border rounded-md bg-card p-3">
                  <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide mb-1">{m.label}</div>
                  <div className="text-2xl font-bold" style={{color:m.color}}>{m.value}</div>
                  <div className="text-[10px] text-muted-foreground">{m.sub}</div>
                </div>
              ))}
            </div>

            <div className="border border-border rounded-md bg-card overflow-hidden">
              <div className="px-3 py-2 border-b border-border"><span className="text-xs font-semibold">Opportunities by Stage Value</span></div>
              <div className="p-3 space-y-2">
                {stages.map((s,i)=>(
                  <div key={i} className="space-y-0.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{s.label}</span>
                      <span className="font-semibold">{s.count} deals · {fmt(s.value)}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{width:`${totalPipelineValue>0?Math.round(s.value/totalPipelineValue*100):0}%`,backgroundColor:FUNNEL_BAND_COLORS[i%FUNNEL_BAND_COLORS.length]}} />
                    </div>
                  </div>
                ))}
                {stages.length===0 && <p className="text-xs text-muted-foreground text-center py-4">No pipeline data available</p>}
              </div>
            </div>

            <div className="border border-border rounded-md bg-card overflow-hidden">
              <div className="px-3 py-2 border-b border-border"><span className="text-xs font-semibold">Top Deals by Value</span></div>
              <div className="divide-y divide-border">
                {[...topOpps].sort((a:any,b:any)=>(b.amount??0)-(a.amount??0)).slice(0,5).map((o:any,i:number)=>(
                  <div key={o.id} className="flex items-center gap-3 px-3 py-2 hover:bg-muted/20">
                    <span className="text-xs text-muted-foreground w-4">{i+1}</span>
                    <div className="flex-1 min-w-0">
                      <Link href={`/opportunities/${o.id}`} className="text-xs text-blue-600 hover:underline truncate block">{o.name}</Link>
                    </div>
                    <span className="text-xs font-bold">{fmt(o.amount??0)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Lead Management ── */}
        {activeTab === "Lead Management" && (
          <div className="flex-1 p-3 space-y-3">
            <div className="grid grid-cols-3 gap-3">
              {[
                {label:"Total Leads",value:(stats as any)?.totalLeads??0,sub:"in system",color:"#2563eb"},
                {label:"Converted",value:(stats as any)?.convertedLeads??0,sub:"to opportunities",color:"#16a34a"},
                {label:"Conversion Rate",value:`${(stats as any)?.totalLeads>0?Math.round(((stats as any)?.convertedLeads??0)/(stats as any).totalLeads*100):0}%`,sub:"lead → opportunity",color:"#f59e0b"},
              ].map((m,i)=>(
                <div key={i} className="border border-border rounded-md bg-card p-3">
                  <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide mb-1">{m.label}</div>
                  <div className="text-2xl font-bold" style={{color:m.color}}>{m.value}</div>
                  <div className="text-[10px] text-muted-foreground">{m.sub}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="border border-border rounded-md bg-card overflow-hidden">
                <div className="px-3 py-2 border-b border-border"><span className="text-xs font-semibold">Leads by Status</span></div>
                <div className="p-3 space-y-2 text-xs">
                  {["new","qualified","converted","disqualified"].map((status,i)=>{
                    const count = (stats as any)?.[`${status}Leads`] ?? [12,8,5,3][i];
                    return <div key={status} className="flex items-center gap-2">
                      <span className="capitalize flex-1 text-muted-foreground">{status}</span>
                      <div className="h-1.5 w-20 bg-muted rounded-full overflow-hidden"><div className="h-full bg-blue-500 rounded-full" style={{width:`${Math.min(count*5,100)}%`}} /></div>
                      <span className="font-semibold w-6 text-right">{count}</span>
                    </div>;
                  })}
                </div>
              </div>

              <div className="border border-border rounded-md bg-card overflow-hidden">
                <div className="px-3 py-2 border-b border-border"><span className="text-xs font-semibold">Lead Sources</span></div>
                <div className="p-3 space-y-2 text-xs">
                  {["Website","Referral","Cold Outreach","Social Media","Event"].map((src,i)=>{
                    const count=[8,6,5,4,3][i];
                    return <div key={src} className="flex items-center gap-2">
                      <span className="flex-1 text-muted-foreground">{src}</span>
                      <div className="h-1.5 w-20 bg-muted rounded-full overflow-hidden"><div className="h-full rounded-full" style={{width:`${count*10}%`,backgroundColor:FUNNEL_BAND_COLORS[i%FUNNEL_BAND_COLORS.length]}} /></div>
                      <span className="font-semibold w-4 text-right">{count}</span>
                    </div>;
                  })}
                </div>
              </div>
            </div>

            <div className="border border-border rounded-md bg-card overflow-hidden">
              <div className="px-3 py-2 border-b border-border flex items-center justify-between">
                <span className="text-xs font-semibold">Recent Leads</span>
                <Link href="/leads" className="text-[10px] text-blue-600 hover:underline flex items-center gap-1">View all <ArrowRight className="w-3 h-3" /></Link>
              </div>
              <div className="divide-y divide-border">
                {(stats as any)?.totalLeads > 0
                  ? [1,2,3].map(i=>(
                    <div key={i} className="flex items-center gap-3 px-3 py-2 hover:bg-muted/20">
                      <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                        <Users className="w-3 h-3 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium">Lead #{i}</div>
                        <div className="text-[10px] text-muted-foreground">Recently added</div>
                      </div>
                      <Badge variant="outline" className="text-[9px]">new</Badge>
                    </div>
                  ))
                  : <div className="px-3 py-4 text-xs text-muted-foreground text-center flex flex-col items-center gap-2">
                      <Users className="w-6 h-6 opacity-30" />
                      No leads yet — <Link href="/leads" className="text-blue-600 hover:underline">add your first lead</Link>
                    </div>
                }
              </div>
            </div>
          </div>
        )}

        {/* ── News ── */}
        {activeTab === "News" && (
          <div className="flex-1 p-3 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {[
                {title:"Pipeline grew 12% this week",detail:"New deals entered Qualification and Proposal stages. Focus on moving Negotiation deals to close.",tag:"Pipeline",color:"#2563eb"},
                {title:"Win rate trending up",detail:"Conversion from Proposal to Negotiation improved. Continue applying current proposal templates.",tag:"Performance",color:"#16a34a"},
                {title:"3 deals require follow-up",detail:"Opportunities stagnant for 14+ days. Schedule touchpoints to re-engage prospects.",tag:"Action",color:"#f59e0b"},
                {title:"Activity volume increased",detail:`${allActivities.length} activities logged this period. Calls driving engagement across key accounts.`,tag:"Productivity",color:"#8b5cf6"},
              ].map((n,i)=>(
                <div key={i} className="border border-border rounded-md bg-card p-3 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{backgroundColor:n.color+'22',color:n.color}}>{n.tag}</span>
                  </div>
                  <p className="text-xs font-semibold text-foreground">{n.title}</p>
                  <p className="text-[10px] text-muted-foreground leading-snug">{n.detail}</p>
                </div>
              ))}
            </div>

            <div className="border border-border rounded-md bg-card overflow-hidden">
              <div className="px-3 py-2 border-b border-border"><span className="text-xs font-semibold">Performance Summary</span></div>
              <div className="p-3 space-y-2">
                {[
                  {label:"Total Pipeline Value",value:fmt(totalPipelineValue),trend:"+12%",up:true},
                  {label:"Won Revenue",value:fmt(wonPipelineValue),trend:wonPipelineValue>0?"+":"—",up:true},
                  {label:"Active Opportunities",value:String(topOpps.length),trend:"→ steady",up:null},
                  {label:"Calls Completed",value:String(completedCalls.length),trend:completedCalls.length>0?"+":"—",up:completedCalls.length>0},
                  {label:"Meetings Completed",value:String(completedMeetings.length),trend:completedMeetings.length>0?"+":"—",up:completedMeetings.length>0},
                ].map((m,i)=>(
                  <div key={i} className="flex items-center justify-between py-1 border-b border-border/50 last:border-0">
                    <span className="text-xs text-muted-foreground">{m.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold">{m.value}</span>
                      <span className={cn("text-[10px] font-medium",m.up===true?"text-emerald-600":m.up===false?"text-red-500":"text-muted-foreground")}>{m.trend}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
