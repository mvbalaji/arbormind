import React, { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AISummary } from "@/components/ai-summary";
import { EmailCompose } from "@/components/email-compose";
import {
  ArrowLeft, Building2, Globe, Phone, Mail, MapPin, Users, Briefcase,
  DollarSign, TrendingUp, Activity, Clock, Calendar, CheckCircle2,
  User, Send, ArrowRight,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface AccountDetail {
  id: number;
  name: string;
  industry: string | null;
  website: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  employees: number | null;
  annualRevenue: number | null;
  description: string | null;
  ownerId: number | null;
  ownerName: string | null;
  contactCount: number;
  dealCount: number;
  createdAt: string;
  updatedAt: string;
}

interface Contact {
  id: number;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  title: string | null;
}

interface Opportunity {
  id: number;
  name: string;
  stage: string;
  amount: number | null;
  closeDate: string | null;
  probability: number | null;
}

interface AccountActivity {
  id: number;
  type: string;
  subject: string;
  status: string;
  dueDate: string | null;
}

const STAGE_BADGE: Record<string, string> = {
  prospecting: "text-blue-600 bg-blue-500/10 border-blue-200",
  qualification: "text-indigo-400 bg-indigo-500/10 border-indigo-200",
  proposal: "text-purple-600 bg-purple-500/10 border-purple-200",
  negotiation: "text-orange-600 bg-orange-500/10 border-orange-200",
  closed_won: "text-green-600 bg-green-500/10 border-green-200",
  closed_lost: "text-red-600 bg-red-500/10 border-red-200",
};

const ACTIVITY_ICONS: Record<string, React.ElementType> = {
  call: Phone,
  email: Mail,
  meeting: Users,
  task: CheckCircle2,
  note: Activity,
  demo: Briefcase,
};

type Tab = "contacts" | "opportunities" | "activities" | "about";

export default function AccountDetail() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [activeTab, setActiveTab] = useState<Tab>("contacts");
  const [isEmailOpen, setIsEmailOpen] = useState(false);

  const { data: account, isLoading } = useQuery<AccountDetail>({
    queryKey: ["account", id],
    queryFn: async () => {
      const res = await fetch(`/api/accounts/${id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Account not found");
      return res.json() as Promise<AccountDetail>;
    },
    enabled: !!id,
  });

  const { data: contactsData } = useQuery<{ data: Contact[] }>({
    queryKey: ["account-contacts", id],
    queryFn: async () => {
      const res = await fetch(`/api/accounts/${id}/contacts`, { credentials: "include" });
      return res.json() as Promise<{ data: Contact[] }>;
    },
    enabled: !!id,
  });

  const { data: opportunitiesData } = useQuery<{ data: Opportunity[] }>({
    queryKey: ["account-opportunities", id],
    queryFn: async () => {
      const res = await fetch(`/api/accounts/${id}/opportunities`, { credentials: "include" });
      return res.json() as Promise<{ data: Opportunity[] }>;
    },
    enabled: !!id,
  });

  const { data: activitiesData } = useQuery<{ data: AccountActivity[] }>({
    queryKey: ["account-activities", id],
    queryFn: async () => {
      const res = await fetch(`/api/accounts/${id}/activities`, { credentials: "include" });
      return res.json() as Promise<{ data: AccountActivity[] }>;
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

  if (!account) {
    return (
      <Layout>
        <div className="text-center py-20 text-muted-foreground">Account not found.</div>
      </Layout>
    );
  }

  const totalDealValue = (opportunitiesData?.data ?? [])
    .filter(o => o.stage !== "closed_lost")
    .reduce((sum, o) => sum + (o.amount ?? 0), 0);

  const wonDeals = (opportunitiesData?.data ?? []).filter(o => o.stage === "closed_won");
  const openDeals = (opportunitiesData?.data ?? []).filter(o => !["closed_won", "closed_lost"].includes(o.stage));

  const TABS: { id: Tab; label: string; count?: number }[] = [
    { id: "contacts", label: "Contacts", count: contactsData?.data.length },
    { id: "opportunities", label: "Opportunities", count: opportunitiesData?.data.length },
    { id: "activities", label: "Activities", count: activitiesData?.data.length },
    { id: "about", label: "About" },
  ];

  return (
    <Layout>
      <div className="flex flex-col gap-5 max-w-5xl mx-auto">
        {/* Back */}
        <div>
          <Link href="/accounts">
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground mb-3 hover:text-foreground">
              <ArrowLeft className="w-4 h-4" /> Back to Accounts
            </Button>
          </Link>

          {/* Header Card */}
          <Card className="glass-panel border-border">
            <CardContent className="p-5">
              <div className="flex flex-col sm:flex-row items-start gap-5">
                {/* Logo placeholder */}
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/40 to-violet-500/40 border border-border flex items-center justify-center text-2xl font-bold text-white shrink-0">
                  {account.name[0]?.toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h1 className="text-2xl font-bold text-foreground">{account.name}</h1>
                      <div className="flex flex-wrap gap-3 mt-1.5">
                        {account.industry && <span className="text-sm text-muted-foreground">{account.industry}</span>}
                        {account.city && (
                          <span className="flex items-center gap-1 text-sm text-muted-foreground">
                            <MapPin className="w-3.5 h-3.5" /> {[account.city, account.country].filter(Boolean).join(", ")}
                          </span>
                        )}
                      </div>
                    </div>
                    {account.website && (
                      <a href={account.website.startsWith("http") ? account.website : `https://${account.website}`} target="_blank" rel="noreferrer"
                        className="text-xs text-primary hover:underline flex items-center gap-1">
                        <Globe className="w-3.5 h-3.5" /> {account.website}
                      </a>
                    )}
                  </div>

                  {/* Quick info */}
                  <div className="flex flex-wrap gap-4 mt-3">
                    {account.phone && <span className="flex items-center gap-1.5 text-sm text-muted-foreground"><Phone className="w-3.5 h-3.5" />{account.phone}</span>}
                    {account.email && <span className="flex items-center gap-1.5 text-sm text-muted-foreground"><Mail className="w-3.5 h-3.5" />{account.email}</span>}
                    {account.ownerName && <span className="flex items-center gap-1.5 text-sm text-muted-foreground"><User className="w-3.5 h-3.5" />{account.ownerName}</span>}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 mt-4">
                    {account.email && (
                      <Button size="sm" className="gap-1.5 bg-primary hover:bg-primary/90 text-foreground" onClick={() => setIsEmailOpen(true)}>
                        <Send className="w-3.5 h-3.5" /> Send Email
                      </Button>
                    )}
                    <Link href="/opportunities">
                      <Button size="sm" variant="outline" className="gap-1.5 border-accent/50 text-primary hover:bg-accent/10">
                        <Briefcase className="w-3.5 h-3.5" /> New Opportunity
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>

              {/* KPI Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-border">
                <div className="text-center">
                  <div className="text-xl font-bold text-foreground">{contactsData?.data.length ?? account.contactCount}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Contacts</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-foreground">{openDeals.length}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Open Deals</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-emerald-600">{wonDeals.length}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Won Deals</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-foreground">${(totalDealValue / 1000).toFixed(0)}k</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Pipeline Value</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* AI Summary */}
        <AISummary
          entityType="account"
          entityData={{
            ...account,
            contactCount: contactsData?.data.length ?? account.contactCount,
            dealCount: opportunitiesData?.data.length ?? account.dealCount,
          } as unknown as Record<string, unknown>}
        />

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px",
                activeTab === tab.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className="ml-2 text-xs bg-muted rounded-full px-1.5 py-0.5">{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Contacts Tab */}
        {activeTab === "contacts" && (
          <div className="space-y-2">
            {!contactsData?.data.length ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                No contacts linked to this account.
              </div>
            ) : (
              contactsData.data.map((contact) => {
                const initials = `${contact.firstName[0] ?? ""}${contact.lastName[0] ?? ""}`.toUpperCase();
                return (
                  <Link key={contact.id} href={`/contacts/${contact.id}`}>
                    <Card className="glass-panel border-border hover:border-primary/30 transition-all cursor-pointer group p-4">
                      <div className="flex items-center gap-4">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/70 to-accent/70 flex items-center justify-center text-white text-sm font-bold shrink-0">
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground group-hover:text-primary transition-colors">
                            {contact.firstName} {contact.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground">{contact.title ?? contact.email ?? "—"}</p>
                        </div>
                        <div className="flex items-center gap-3 text-muted-foreground shrink-0">
                          {contact.email && <a href={`mailto:${contact.email}`} onClick={e => e.stopPropagation()} className="hover:text-primary transition-colors"><Mail className="w-4 h-4" /></a>}
                          {contact.phone && <a href={`tel:${contact.phone}`} onClick={e => e.stopPropagation()} className="hover:text-primary transition-colors"><Phone className="w-4 h-4" /></a>}
                          <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    </Card>
                  </Link>
                );
              })
            )}
          </div>
        )}

        {/* Opportunities Tab */}
        {activeTab === "opportunities" && (
          <div className="space-y-2">
            {!opportunitiesData?.data.length ? (
              <div className="text-center py-12 text-muted-foreground">
                <Briefcase className="w-10 h-10 mx-auto mb-3 opacity-30" />
                No opportunities for this account yet.
              </div>
            ) : (
              opportunitiesData.data.map((opp) => (
                <Link key={opp.id} href={`/opportunities/${opp.id}`}>
                  <Card className="glass-panel border-border hover:border-primary/30 transition-all cursor-pointer group p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground group-hover:text-primary transition-colors truncate">{opp.name}</p>
                          <Badge variant="outline" className={cn("text-xs capitalize shrink-0", STAGE_BADGE[opp.stage] ?? "")}>
                            {opp.stage.replace("_", " ")}
                          </Badge>
                        </div>
                        {opp.closeDate && (
                          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Close: {format(new Date(opp.closeDate), "MMM d, yyyy")}
                          </p>
                        )}
                        {opp.probability != null && (
                          <div className="mt-2 w-full bg-muted/50 rounded-full h-1">
                            <div className="bg-primary h-1 rounded-full" style={{ width: `${opp.probability}%` }} />
                          </div>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        {opp.amount != null && <p className="text-lg font-bold text-foreground">${opp.amount.toLocaleString()}</p>}
                        {opp.probability != null && <p className="text-xs text-muted-foreground">{opp.probability}% likely</p>}
                      </div>
                    </div>
                  </Card>
                </Link>
              ))
            )}
          </div>
        )}

        {/* Activities Tab */}
        {activeTab === "activities" && (
          <div className="space-y-2">
            {!activitiesData?.data.length ? (
              <div className="text-center py-12 text-muted-foreground">
                <Activity className="w-10 h-10 mx-auto mb-3 opacity-30" />
                No activities logged for this account.
              </div>
            ) : (
              activitiesData.data.map((act) => {
                const Icon = ACTIVITY_ICONS[act.type] ?? Activity;
                return (
                  <Card key={act.id} className="glass-panel border-border p-4 flex items-start gap-4">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-foreground text-sm">{act.subject}</span>
                        <Badge variant="outline" className={cn("capitalize text-xs", act.status === "completed" ? "border-green-500/30 text-green-600" : "border-blue-500/30 text-blue-600")}>
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
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        )}

        {/* About Tab */}
        {activeTab === "about" && (
          <Card className="glass-panel border-border p-6">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
              {[
                { label: "Account Name", value: account.name },
                { label: "Industry", value: account.industry },
                { label: "Website", value: account.website },
                { label: "Phone", value: account.phone },
                { label: "Email", value: account.email },
                { label: "Employees", value: account.employees?.toLocaleString() },
                { label: "Annual Revenue", value: account.annualRevenue ? `$${account.annualRevenue.toLocaleString()}` : null },
                { label: "Address", value: account.address },
                { label: "City", value: account.city },
                { label: "Country", value: account.country },
                { label: "Account Owner", value: account.ownerName },
                { label: "Created", value: format(new Date(account.createdAt), "MMM d, yyyy") },
                { label: "Last Updated", value: format(new Date(account.updatedAt), "MMM d, yyyy") },
              ].map(({ label, value }) =>
                value ? (
                  <div key={label}>
                    <dt className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">{label}</dt>
                    <dd className="text-sm text-foreground">{value}</dd>
                  </div>
                ) : null
              )}
            </dl>
            {account.description && (
              <div className="mt-6 pt-6 border-t border-border">
                <dt className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Description</dt>
                <dd className="text-sm text-muted-foreground leading-relaxed">{account.description}</dd>
              </div>
            )}
          </Card>
        )}
      </div>

      <EmailCompose
        open={isEmailOpen}
        onOpenChange={setIsEmailOpen}
        defaultTo={account.email ?? ""}
        defaultSubject={`Following up — ${account.name}`}
        recipientName={account.name}
      />
    </Layout>
  );
}
