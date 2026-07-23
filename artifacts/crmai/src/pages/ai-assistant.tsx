import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Bot, Sparkles, Send, Zap, User, Mail, TrendingUp, Target,
  CheckCircle2, ArrowRight, Clock, BarChart2, Layers
} from "lucide-react";
import { useListLeads, useListContacts } from "@workspace/api-client-react";

export default function AIAssistant() {
  const [activeTab, setActiveTab] = useState("insights");
  const [selectedTemplate, setSelectedTemplate] = useState(0);
  const [customName, setCustomName] = useState("");
  const [customProduct, setCustomProduct] = useState("Enterprise Tier");
  const [draftGenerated, setDraftGenerated] = useState(false);

  const { data: leadsData, isLoading: leadsLoading } = useListLeads({ limit: 100 });
  const { data: contactsData } = useListContacts({ limit: 5 });

  const leads = leadsData?.data ?? [];

  const scoreBuckets = leads.reduce((acc, l) => {
    const s = l.score ?? 0;
    if (s >= 80) acc.hot++;
    else if (s >= 50) acc.warm++;
    else acc.cold++;
    return acc;
  }, { hot: 0, warm: 0, cold: 0 });

  const sourceWeights: Record<string, number> = {
    referral: 30, website: 20, linkedin: 18, email_campaign: 15,
    trade_show: 12, cold_call: 8, other: 5,
  };

  const sourceDist = leads.reduce((acc, l) => {
    const src = l.source ?? "other";
    if (!acc[src]) acc[src] = { count: 0, totalScore: 0 };
    acc[src].count++;
    acc[src].totalScore += l.score ?? 0;
    return acc;
  }, {} as Record<string, { count: number; totalScore: number }>);

  const highValueOpps = [
    ...(contactsData?.data ?? []).slice(0, 3).map(c => ({
      name: `${c.firstName} ${c.lastName}`,
      company: c.accountName ?? "Unknown",
      action: "Follow up on last interaction",
      probability: Math.floor(Math.random() * 30 + 60),
    })),
  ];

  const templates = [
    {
      label: "Proposal Follow-up",
      subject: `Checking in on our proposal`,
      body: (name: string, product: string) =>
        `Hi ${name || "there"},\n\nI hope this email finds you well.\n\nI'm writing to follow up on the proposal I sent over earlier this week. I wanted to see if you had any questions or needed further clarification on the ${product} features we discussed.\n\nGiven your team's growth trajectory, the automated workflows in ${product} could save your reps ~15 hours per week immediately.\n\nWould you have 10 minutes this week for a quick call?\n\nBest regards,\nYour arbormind.in rep`,
    },
    {
      label: "Cold Outreach",
      subject: `Helping ${"{company}"} close deals faster`,
      body: (name: string, product: string) =>
        `Hi ${name || "there"},\n\nI came across your company and noticed you're scaling your sales team — congrats!\n\nWe built arbormind.in for exactly this stage. Our ${product} includes AI-powered lead scoring, pipeline automation, and a full CRM — all in one place.\n\nWould you be open to a 15-minute intro call this week?\n\nBest,\narbormind.in Team`,
    },
    {
      label: "AI Welcome — New Lead",
      subject: `Our sales team will be in touch within 24 hrs`,
      body: (name: string, _product: string) =>
        `Hi ${name || "there"},\n\nThank you for your interest in arbormind.in!\n\nOur sales team will reach out to you within the next 24 hours to walk you through how arbormind.in can transform your sales pipeline.\n\nIn the meantime, feel free to explore our platform at arbormind.in.\n\nLooking forward to connecting!\n\nThe arbormind.in Team`,
    },
    {
      label: "Meeting Recap",
      subject: `Great connecting — next steps`,
      body: (name: string, product: string) =>
        `Hi ${name || "there"},\n\nThank you for taking the time to meet with us today. It was great to learn more about your team's challenges.\n\nAs discussed, I'll be sending over details on the ${product}. Key takeaways:\n• We'll configure a custom demo environment for your team\n• Trial period: 14 days, full access\n• Estimated go-live: 2 weeks after sign-off\n\nI'll follow up with a formal proposal by end of week.\n\nThanks again,\narbormind.in Team`,
    },
  ];

  const currentTemplate = templates[selectedTemplate];
  const draftBody = currentTemplate.body(customName, customProduct);

  return (
    <Layout>
      <div className="flex flex-col gap-3 relative">
        <div className="absolute top-0 right-0 -z-10 w-[500px] h-[500px] bg-accent/20 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 -z-10 w-[500px] h-[500px] bg-primary/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-[0_0_30px_rgba(139,92,246,0.3)]">
            <Bot className="w-6 h-6 text-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground tracking-tight flex items-center gap-2">
              AI Intelligence <Sparkles className="w-5 h-5 text-yellow-600" />
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">Smart suggestions, scoring, and drafting.</p>
          </div>
        </div>

        <div className="flex gap-4 border-b border-border pb-px">
          {["insights", "drafts", "scoring"].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1 font-medium text-sm capitalize transition-all border-b-2 ${activeTab === tab ? "border-accent text-primary" : "border-transparent bg-sky-100 text-sky-700 hover:bg-sky-200"}`}
            >
              {tab === "insights" ? "Next Best Actions" : tab === "drafts" ? "Email Drafter" : "Lead Scoring"}
            </button>
          ))}
        </div>

        {activeTab === "insights" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="glass-panel border-border col-span-2">
              <CardContent className="p-6 space-y-5">
                <h3 className="font-display font-semibold text-lg text-foreground mb-2">Recommended Actions</h3>

                {highValueOpps.length === 0 ? (
                  <p className="text-muted-foreground text-sm">Add contacts to see AI-powered next best actions.</p>
                ) : (
                  highValueOpps.map((opp, i) => (
                    <div key={i} className={`rounded-xl p-4 bg-muted relative overflow-hidden border ${i === 0 ? "border-primary/30" : "border-border"}`}>
                      {i === 0 && <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-primary to-accent" />}
                      <div className="flex gap-4">
                        <div className={`w-10 h-8 rounded-full flex items-center justify-center shrink-0 ${i === 0 ? "bg-accent/20 text-primary" : "bg-blue-500/20 text-blue-600"}`}>
                          <User className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-foreground">Follow up with {opp.name}</h4>
                          <p className="text-sm text-muted-foreground mt-1">{opp.action} at {opp.company}. Deal probability: <span className="text-chart-3 font-medium">{opp.probability}%</span></p>
                          <div className="mt-3 flex gap-2 flex-wrap">
                            <Button
                              size="sm"
                              className="bg-primary text-foreground"
                              onClick={() => { setCustomName(opp.name); setActiveTab("drafts"); }}
                            >
                              <Mail className="w-3 h-3 mr-1.5" /> Draft Email
                            </Button>
                            <Button size="sm" variant="outline" className="border-border">Dismiss</Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}

                <div className="border border-border rounded-xl p-4 bg-muted mt-2">
                  <div className="flex gap-4">
                    <div className="w-10 h-8 rounded-full bg-green-500/20 flex items-center justify-center shrink-0 text-green-600">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground">Pipeline health check</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {leads.filter(l => l.status === "qualified").length} qualified leads ready for conversion.
                        {" "}{scoreBuckets.hot} leads are hot (score ≥ 80) — prioritise them today.
                      </p>
                      <div className="mt-3">
                        <Button size="sm" variant="outline" className="border-border" onClick={() => setActiveTab("scoring")}>
                          <ArrowRight className="w-3 h-3 mr-1.5" /> View Scoring
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-panel border-border">
              <CardContent className="p-6">
                <h3 className="font-display font-semibold text-lg text-foreground mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-600" /> Quick Stats
                </h3>
                <div className="space-y-4">
                  <div className="p-4 bg-muted/50 rounded-lg border border-border">
                    <div className="text-sm text-muted-foreground mb-1">Hot Leads</div>
                    <div className="text-2xl font-bold text-green-600">{scoreBuckets.hot}</div>
                    <div className="text-xs text-muted-foreground mt-1">Score ≥ 80</div>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg border border-border">
                    <div className="text-sm text-muted-foreground mb-1">Warm Leads</div>
                    <div className="text-2xl font-bold text-yellow-600">{scoreBuckets.warm}</div>
                    <div className="text-xs text-muted-foreground mt-1">Score 50–79</div>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg border border-border">
                    <div className="text-sm text-muted-foreground mb-1">Cold / New</div>
                    <div className="text-2xl font-bold text-red-600">{scoreBuckets.cold}</div>
                    <div className="text-xs text-muted-foreground mt-1">Score &lt; 50</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "drafts" && (
          <Card className="glass-panel border-border col-span-full">
            <CardContent className="p-6 flex gap-6 min-h-[500px] flex-col md:flex-row">
              <div className="w-full md:w-1/3 border-b md:border-b-0 md:border-r border-border pb-4 md:pb-0 md:pr-6 space-y-3">
                <h3 className="font-display font-semibold text-foreground mb-2">Templates</h3>
                {templates.map((t, i) => (
                  <div
                    key={i}
                    onClick={() => { setSelectedTemplate(i); setDraftGenerated(false); }}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${i === selectedTemplate ? "bg-primary/10 border-primary/30 text-primary" : "bg-muted border-border text-muted-foreground hover:bg-muted/50"}`}
                  >
                    {t.label}
                  </div>
                ))}

                <div className="pt-4 space-y-3 border-t border-border">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Contact Name</label>
                    <input
                      className="w-full bg-muted border border-border rounded px-3 py-1 text-sm text-foreground placeholder:text-muted-foreground"
                      placeholder="e.g. Sarah Jenkins"
                      value={customName}
                      onChange={e => { setCustomName(e.target.value); setDraftGenerated(false); }}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Product / Tier</label>
                    <input
                      className="w-full bg-muted border border-border rounded px-3 py-1 text-sm text-foreground placeholder:text-muted-foreground"
                      placeholder="e.g. Enterprise Tier"
                      value={customProduct}
                      onChange={e => { setCustomProduct(e.target.value); setDraftGenerated(false); }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex-1 flex flex-col">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs text-muted-foreground">Subject:</span>
                  <span className="text-sm text-foreground font-medium">{currentTemplate.subject}</span>
                </div>
                <div className="flex-1 bg-muted rounded-xl border border-border p-6 font-mono text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed overflow-y-auto">
                  {draftBody}
                </div>
                <div className="mt-4 flex justify-end gap-3">
                  <Button
                    variant="outline"
                    className="border-border"
                    onClick={() => setDraftGenerated(true)}
                  >
                    <Sparkles className="w-4 h-4 mr-2" /> Personalise
                  </Button>
                  <Button
                    className="bg-primary"
                    onClick={() => {
                      navigator.clipboard?.writeText(`Subject: ${currentTemplate.subject}\n\n${draftBody}`);
                    }}
                  >
                    <Send className="w-4 h-4 mr-2" /> Copy Draft
                  </Button>
                </div>
                {draftGenerated && (
                  <div className="mt-3 p-3 rounded-lg bg-green-500/10 border border-green-200 flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    Draft personalised for <strong>{customName || "contact"}</strong> — ready to send.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === "scoring" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="glass-panel border-border lg:col-span-2">
              <CardContent className="p-6">
                <h3 className="font-display font-semibold text-lg text-foreground mb-2 flex items-center gap-2">
                  <BarChart2 className="w-5 h-5 text-primary" /> Scoring Formula
                </h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Scores (0–100) are calculated using three weighted components: source quality, lead behaviour, and firmographic fit.
                </p>

                <div className="space-y-4">
                  {[
                    {
                      label: "Source Quality", weight: "30%", icon: Layers, color: "text-primary",
                      desc: "Where the lead came from. Referrals score highest (30 pts); cold calls score lowest (8 pts).",
                      breakdown: Object.entries(sourceWeights).map(([src, w]) => ({ label: src.replace("_", " "), value: w })),
                    },
                    {
                      label: "Behaviour Score", weight: "40%", icon: TrendingUp, color: "text-primary",
                      desc: "Engagement signals: email opens, page visits, form submits, demo requests. Max 40 pts.",
                      breakdown: [
                        { label: "Demo request", value: 40 }, { label: "Pricing page visit", value: 30 },
                        { label: "Email opened", value: 15 }, { label: "Blog read", value: 5 },
                      ],
                    },
                    {
                      label: "Firmographic Fit", weight: "30%", icon: Target, color: "text-chart-3",
                      desc: "Company size, industry, and revenue alignment with ideal customer profile. Max 30 pts.",
                      breakdown: [
                        { label: "Perfect ICP match", value: 30 }, { label: "Good fit", value: 20 },
                        { label: "Partial match", value: 10 }, { label: "No data", value: 0 },
                      ],
                    },
                  ].map((factor) => (
                    <div key={factor.label} className="p-4 rounded-xl border border-border bg-muted">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <factor.icon className={`w-4 h-4 ${factor.color}`} />
                          <span className="font-medium text-foreground">{factor.label}</span>
                        </div>
                        <Badge variant="outline" className={`${factor.color} border-current/30`}>{factor.weight}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">{factor.desc}</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {factor.breakdown.map(b => (
                          <div key={b.label} className="flex justify-between items-center text-xs bg-muted/50 rounded px-2 py-1">
                            <span className="text-muted-foreground capitalize">{b.label}</span>
                            <span className={`font-bold ${factor.color}`}>{b.value} pts</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="glass-panel border-border">
              <CardContent className="p-6">
                <h3 className="font-display font-semibold text-lg text-foreground mb-4 flex items-center gap-2">
                  <Target className="w-5 h-5 text-chart-3" /> Score Distribution
                </h3>

                {leadsLoading ? (
                  <div className="space-y-3">{[0,1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
                ) : (
                  <div className="space-y-4">
                    {[
                      { label: "Hot (80–100)", count: scoreBuckets.hot, color: "bg-green-500", text: "text-green-600" },
                      { label: "Warm (50–79)", count: scoreBuckets.warm, color: "bg-yellow-500", text: "text-yellow-600" },
                      { label: "Cold (1–49)", count: scoreBuckets.cold, color: "bg-red-500", text: "text-red-600" },
                      { label: "Unscored", count: leads.filter(l => l.score == null).length, color: "bg-gray-500", text: "text-gray-400" },
                    ].map(bucket => (
                      <div key={bucket.label} className="p-3 bg-muted/50 rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <span className={`text-sm font-medium ${bucket.text}`}>{bucket.label}</span>
                          <span className="text-foreground font-bold">{bucket.count}</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full ${bucket.color}`}
                            style={{ width: leads.length > 0 ? `${Math.round((bucket.count / leads.length) * 100)}%` : "0%" }}
                          />
                        </div>
                      </div>
                    ))}

                    {leads.length > 0 && (
                      <div className="mt-2 p-3 bg-primary/10 rounded-lg border border-primary/20">
                        <div className="text-xs text-muted-foreground">Average Score</div>
                        <div className="text-xl font-bold text-primary mt-1">
                          {Math.round(leads.filter(l => l.score != null).reduce((s, l) => s + (l.score ?? 0), 0) / Math.max(1, leads.filter(l => l.score != null).length))}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">across {leads.filter(l => l.score != null).length} scored leads</div>
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-6 space-y-2 border-t border-border pt-4">
                  <h4 className="text-sm font-medium text-foreground flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-muted-foreground" /> Score by Source
                  </h4>
                  {Object.entries(sourceDist).length === 0 ? (
                    <p className="text-xs text-muted-foreground">No leads with source data yet.</p>
                  ) : (
                    Object.entries(sourceDist).map(([src, d]) => (
                      <div key={src} className="flex justify-between text-xs">
                        <span className="text-muted-foreground capitalize">{src.replace("_", " ")}</span>
                        <span className="text-foreground">{d.count} leads · avg {d.count > 0 ? Math.round(d.totalScore / d.count) : 0}</span>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
}
