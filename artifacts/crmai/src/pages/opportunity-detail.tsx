import React, { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, DollarSign, Calendar, Activity, Building2,
  Phone, Mail, Users, Briefcase, CheckCircle2, Clock, TrendingUp,
} from "lucide-react";
import { format } from "date-fns";

interface OpportunityDetail {
  id: number;
  name: string;
  accountId: number | null;
  accountName: string | null;
  contactFirstName: string | null;
  contactLastName: string | null;
  stage: string;
  amount: number | null;
  probability: number | null;
  closeDate: string | null;
  description: string | null;
  source: string | null;
  ownerName: string | null;
  createdAt: string;
}

interface RelatedActivity {
  id: number;
  type: string;
  subject: string;
  status: string;
  dueDate: string | null;
  contactName: string | null;
}

const STAGE_CONFIG: Record<string, { label: string; color: string; step: number }> = {
  prospecting: { label: "Prospecting", color: "text-blue-400 border-blue-500/30 bg-blue-500/10", step: 1 },
  qualification: { label: "Qualification", color: "text-indigo-400 border-indigo-500/30 bg-indigo-500/10", step: 2 },
  proposal: { label: "Proposal", color: "text-purple-400 border-purple-500/30 bg-purple-500/10", step: 3 },
  negotiation: { label: "Negotiation", color: "text-orange-400 border-orange-500/30 bg-orange-500/10", step: 4 },
  closed_won: { label: "Closed Won", color: "text-green-400 border-green-500/30 bg-green-500/10", step: 5 },
  closed_lost: { label: "Closed Lost", color: "text-red-400 border-red-500/30 bg-red-500/10", step: 0 },
};

const STAGES_ORDERED = ["prospecting", "qualification", "proposal", "negotiation", "closed_won"];

const ACTIVITY_ICONS: Record<string, React.ElementType> = {
  call: Phone,
  email: Mail,
  meeting: Users,
  task: CheckCircle2,
  demo: Briefcase,
};

type Tab = "activities" | "about";

export default function OpportunityDetail() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [activeTab, setActiveTab] = useState<Tab>("activities");

  const { data: opp, isLoading } = useQuery<OpportunityDetail>({
    queryKey: ["opportunity", id],
    queryFn: async () => {
      const res = await fetch(`/api/opportunities/${id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Not found");
      return res.json() as Promise<OpportunityDetail>;
    },
    enabled: !!id,
  });

  const { data: activitiesData } = useQuery<{ data: RelatedActivity[] }>({
    queryKey: ["opportunity-activities", id],
    queryFn: async () => {
      const res = await fetch(`/api/opportunities/${id}/activities`, { credentials: "include" });
      return res.json() as Promise<{ data: RelatedActivity[] }>;
    },
    enabled: !!id,
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

  if (!opp) {
    return (
      <Layout>
        <div className="text-center py-20 text-muted-foreground">Opportunity not found.</div>
      </Layout>
    );
  }

  const stageConfig = STAGE_CONFIG[opp.stage] ?? STAGE_CONFIG["prospecting"];
  const currentStep = stageConfig.step;

  const TABS: { id: Tab; label: string; count?: number }[] = [
    { id: "activities", label: "Activities", count: activitiesData?.data.length },
    { id: "about", label: "Details" },
  ];

  return (
    <Layout>
      <div className="flex flex-col gap-6 max-w-5xl mx-auto">
        <div>
          <Link href="/opportunities">
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground mb-4 hover:text-white">
              <ArrowLeft className="w-4 h-4" />
              Back to Pipeline
            </Button>
          </Link>

          {/* Header Card */}
          <Card className="glass-panel border-white/5 p-6">
            <div className="flex flex-col gap-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-white">{opp.name}</h1>
                  {opp.accountName && (
                    <div className="flex items-center gap-1.5 text-muted-foreground mt-1">
                      <Building2 className="w-4 h-4" />
                      <span className="text-sm">{opp.accountName}</span>
                    </div>
                  )}
                </div>
                <Badge variant="outline" className={`capitalize shrink-0 ${stageConfig.color}`}>
                  {stageConfig.label}
                </Badge>
              </div>

              {/* Key Metrics Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {opp.amount !== null && (
                  <div className="bg-white/5 rounded-xl p-3">
                    <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                      <DollarSign className="w-3 h-3" /> Value
                    </div>
                    <div className="text-lg font-bold text-white">${opp.amount.toLocaleString()}</div>
                  </div>
                )}
                {opp.probability !== null && (
                  <div className="bg-white/5 rounded-xl p-3">
                    <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" /> Win Probability
                    </div>
                    <div className="text-lg font-bold text-white">{opp.probability}%</div>
                  </div>
                )}
                {opp.closeDate && (
                  <div className="bg-white/5 rounded-xl p-3">
                    <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Close Date
                    </div>
                    <div className="text-sm font-semibold text-white">{format(new Date(opp.closeDate), "MMM d, yyyy")}</div>
                  </div>
                )}
                {(opp.contactFirstName || opp.contactLastName) && (
                  <div className="bg-white/5 rounded-xl p-3">
                    <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                      <Users className="w-3 h-3" /> Contact
                    </div>
                    <div className="text-sm font-semibold text-white">
                      {[opp.contactFirstName, opp.contactLastName].filter(Boolean).join(" ")}
                    </div>
                  </div>
                )}
              </div>

              {/* Stage Pipeline Progress */}
              {opp.stage !== "closed_lost" && (
                <div>
                  <div className="text-xs text-muted-foreground mb-2">Pipeline Progress</div>
                  <div className="flex items-center gap-1">
                    {STAGES_ORDERED.map((s, idx) => {
                      const isActive = idx + 1 <= currentStep;
                      const isCurrent = s === opp.stage;
                      return (
                        <React.Fragment key={s}>
                          <div
                            className={`flex-1 h-1.5 rounded-full transition-all ${
                              isActive ? "bg-primary" : "bg-white/10"
                            } ${isCurrent ? "shadow-[0_0_8px_rgba(99,102,241,0.6)]" : ""}`}
                          />
                        </React.Fragment>
                      );
                    })}
                  </div>
                  <div className="flex justify-between mt-1">
                    {STAGES_ORDERED.map((s) => (
                      <span key={s} className={`text-xs ${s === opp.stage ? "text-primary font-medium" : "text-muted-foreground/50"}`}>
                        {STAGE_CONFIG[s]?.label.split(" ")[0]}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-white/5">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-white"
              }`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className="ml-2 text-xs bg-white/10 rounded-full px-1.5 py-0.5">{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Activities Tab */}
        {activeTab === "activities" && (
          <div className="flex flex-col gap-3">
            {!activitiesData?.data.length ? (
              <div className="text-center py-12 text-muted-foreground">
                <Activity className="w-10 h-10 mx-auto mb-3 opacity-30" />
                No activities logged for this deal yet.
              </div>
            ) : (
              activitiesData.data.map((act) => {
                const Icon = ACTIVITY_ICONS[act.type] ?? Activity;
                return (
                  <Card key={act.id} className="glass-panel border-white/5 p-4 flex items-start gap-4">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-white text-sm">{act.subject}</span>
                        <Badge variant="outline" className={`capitalize text-xs ${
                          act.status === "completed" ? "border-green-500/30 text-green-400" :
                          act.status === "cancelled" ? "border-red-500/30 text-red-400" :
                          "border-blue-500/30 text-blue-400"
                        }`}>
                          {act.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-muted-foreground capitalize">{act.type}</span>
                        {act.dueDate && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {format(new Date(act.dueDate), "MMM d, h:mm a")}
                          </span>
                        )}
                        {act.contactName && (
                          <span className="text-xs text-muted-foreground">· {act.contactName}</span>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        )}

        {/* Details Tab */}
        {activeTab === "about" && (
          <Card className="glass-panel border-white/5 p-6">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
              {[
                { label: "Stage", value: stageConfig.label },
                { label: "Amount", value: opp.amount !== null ? `$${opp.amount.toLocaleString()}` : null },
                { label: "Probability", value: opp.probability !== null ? `${opp.probability}%` : null },
                { label: "Close Date", value: opp.closeDate ? format(new Date(opp.closeDate), "MMM d, yyyy") : null },
                { label: "Account", value: opp.accountName },
                { label: "Contact", value: [opp.contactFirstName, opp.contactLastName].filter(Boolean).join(" ") || null },
                { label: "Lead Source", value: opp.source },
                { label: "Owner", value: opp.ownerName },
                { label: "Created", value: opp.createdAt ? format(new Date(opp.createdAt), "MMM d, yyyy") : null },
              ].map(({ label, value }) =>
                value ? (
                  <div key={label}>
                    <dt className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">{label}</dt>
                    <dd className="text-sm text-white">{value}</dd>
                  </div>
                ) : null
              )}
            </dl>
            {opp.description && (
              <div className="mt-6 pt-6 border-t border-white/5">
                <dt className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Description</dt>
                <dd className="text-sm text-muted-foreground leading-relaxed">{opp.description}</dd>
              </div>
            )}
          </Card>
        )}
      </div>
    </Layout>
  );
}
