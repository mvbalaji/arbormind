import React, { useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useUpdateAccount } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AISummary } from "@/components/ai-summary";
import { EmailCompose } from "@/components/email-compose";
import {
  ArrowLeft, Building2, Globe, Phone, Mail, MapPin, Users, Briefcase,
  DollarSign, TrendingUp, Activity, Clock, Calendar, CheckCircle2,
  User, Send, ArrowRight, FileText, AlertTriangle, ShieldCheck, FileSignature,
  Pencil, Save, X,
} from "lucide-react";
import { format } from "date-fns";
import { useCurrency } from "@/context/currency";
import { convertFromBase, CURRENCY_META } from "@/lib/currency";
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
  status: string | null;
  stage: string | null;
  amount: number | null;
  closeDate: string | null;
  probability: number | null;
  forecastCategory: string | null;
  nextStep: string | null;
  optyOwner: string | null;
  optyTeam: string | null;
  ownerId: number | null;
  createdBy: number | null;
  modifiedBy: number | null;
  ownerName: string | null;
  clmEnabled: boolean | null;
  contactCount: number;
  dealCount: number;
  createdAt: string;
  updatedAt: string;
}

interface ContractRecord {
  id: number;
  contractNumber: string;
  name: string;
  status: string;
  total: number;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
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
  description: string | null;
  status: string;
  dueDate: string | null;
  createdAt: string;
}

interface QuoteRecord {
  id: number;
  quoteNumber: string;
  name: string;
  status: string;
  total: number;
  validUntil: string | null;
  createdAt: string;
}

interface CaseRecord {
  id: number;
  caseNumber: string;
  subject: string;
  status: string;
  priority: string;
  type: string | null;
  createdAt: string;
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

const CASE_PRIORITY_BADGE: Record<string, string> = {
  low: "text-gray-600 bg-gray-100 border-gray-200",
  medium: "text-yellow-700 bg-yellow-50 border-yellow-200",
  high: "text-orange-700 bg-orange-50 border-orange-200",
  critical: "text-red-700 bg-red-50 border-red-200",
};

const CASE_STATUS_BADGE: Record<string, string> = {
  new: "text-blue-600 bg-blue-50 border-blue-200",
  in_progress: "text-indigo-600 bg-indigo-50 border-indigo-200",
  escalated: "text-orange-600 bg-orange-50 border-orange-200",
  resolved: "text-green-600 bg-green-50 border-green-200",
  closed: "text-gray-600 bg-gray-50 border-gray-200",
};

const QUOTE_STATUS_BADGE: Record<string, string> = {
  draft: "text-gray-600 bg-gray-50 border-gray-200",
  sent: "text-blue-600 bg-blue-50 border-blue-200",
  accepted: "text-green-600 bg-green-50 border-green-200",
  rejected: "text-red-600 bg-red-50 border-red-200",
  expired: "text-orange-600 bg-orange-50 border-orange-200",
};

type Tab = "contacts" | "opportunities" | "activities" | "quotes" | "contracts" | "cases" | "about";

export default function AccountDetail() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [activeTab, setActiveTab] = useState<Tab>("contacts");
  const [isEmailOpen, setIsEmailOpen] = useState(false);
  const [editingAbout, setEditingAbout] = useState(false);
  const [aboutForm, setAboutForm] = useState<Record<string, string>>({});
  const { format: fmtMoney, displayCurrency, rates } = useCurrency();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const updateAccountMutation = useUpdateAccount();

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

  const { data: quotesData } = useQuery<{ data: QuoteRecord[] }>({
    queryKey: ["account-quotes", id],
    queryFn: async () => {
      const res = await fetch(`/api/accounts/${id}/quotes`, { credentials: "include" });
      return res.json() as Promise<{ data: QuoteRecord[] }>;
    },
    enabled: !!id,
  });

  const { data: casesData } = useQuery<{ data: CaseRecord[] }>({
    queryKey: ["account-cases", id],
    queryFn: async () => {
      const res = await fetch(`/api/accounts/${id}/cases`, { credentials: "include" });
      return res.json() as Promise<{ data: CaseRecord[] }>;
    },
    enabled: !!id,
  });

  const { data: contractsData } = useQuery<{ data: ContractRecord[] }>({
    queryKey: ["account-contracts", id],
    queryFn: async () => {
      const res = await fetch(`/api/contracts?accountId=${id}&limit=100`, { credentials: "include" });
      return res.json() as Promise<{ data: ContractRecord[] }>;
    },
    enabled: !!id,
  });

  const toggleClm = async (enabled: boolean) => {
    if (!id) return;
    try {
      await updateAccountMutation.mutateAsync({ id: parseInt(id), data: { clmEnabled: enabled } });
      toast({ title: enabled ? "Contract management enabled" : "Contract management disabled" });
      void queryClient.invalidateQueries({ queryKey: ["account", id] });
    } catch {
      toast({ title: "Error", description: "Could not update contract management setting.", variant: "destructive" });
    }
  };

  const startEditAbout = () => {
    if (!account) return;
    setAboutForm({
      name: account.name ?? "",
      industry: account.industry ?? "",
      status: account.status ?? "",
      stage: account.stage ?? "",
      website: account.website ?? "",
      phone: account.phone ?? "",
      email: account.email ?? "",
      employees: account.employees != null ? String(account.employees) : "",
      annualRevenue: account.annualRevenue != null ? String(account.annualRevenue) : "",
      amount: account.amount != null ? String(account.amount) : "",
      closeDate: account.closeDate ? account.closeDate.split("T")[0] : "",
      probability: account.probability != null ? String(account.probability) : "",
      forecastCategory: account.forecastCategory ?? "",
      nextStep: account.nextStep ?? "",
      optyOwner: account.optyOwner ?? "",
      optyTeam: account.optyTeam ?? "",
      address: account.address ?? "",
      city: account.city ?? "",
      country: account.country ?? "",
      description: account.description ?? "",
    });
    setEditingAbout(true);
  };

  const cancelEditAbout = () => {
    setEditingAbout(false);
    setAboutForm({});
  };

  const setAboutField = (key: string, value: string) =>
    setAboutForm((prev) => ({ ...prev, [key]: value }));

  const handleSaveAbout = async () => {
    if (!id) return;
    const trimmedName = (aboutForm.name ?? "").trim();
    if (!trimmedName) {
      toast({ title: "Account name is required", variant: "destructive" });
      return;
    }
    const str = (v: string) => (v.trim() === "" ? null : v.trim());
    const numFields: Array<[string, string]> = [
      ["employees", "Employees"],
      ["annualRevenue", "Annual Revenue"],
      ["amount", "Amount"],
      ["probability", "Probability"],
    ];
    const nums: Record<string, number | null> = {};
    for (const [key, label] of numFields) {
      const t = (aboutForm[key] ?? "").trim();
      if (t === "") {
        nums[key] = null;
        continue;
      }
      const n = Number(t);
      if (!Number.isFinite(n)) {
        toast({ title: `Invalid ${label}`, description: "Please enter a valid number.", variant: "destructive" });
        return;
      }
      nums[key] = n;
    }
    try {
      await updateAccountMutation.mutateAsync({
        id: parseInt(id),
        data: {
          name: trimmedName,
          industry: str(aboutForm.industry),
          status: str(aboutForm.status),
          stage: str(aboutForm.stage),
          website: str(aboutForm.website),
          phone: str(aboutForm.phone),
          email: str(aboutForm.email),
          employees: nums.employees,
          annualRevenue: nums.annualRevenue,
          amount: nums.amount,
          closeDate: str(aboutForm.closeDate),
          probability: nums.probability,
          forecastCategory: str(aboutForm.forecastCategory),
          nextStep: str(aboutForm.nextStep),
          optyOwner: str(aboutForm.optyOwner),
          optyTeam: str(aboutForm.optyTeam),
          address: str(aboutForm.address),
          city: str(aboutForm.city),
          country: str(aboutForm.country),
          description: str(aboutForm.description),
        },
      });
      toast({ title: "Account updated" });
      void queryClient.invalidateQueries({ queryKey: ["account", id] });
      setEditingAbout(false);
      setAboutForm({});
    } catch {
      toast({ title: "Error", description: "Could not update account.", variant: "destructive" });
    }
  };

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

  const contacts = contactsData?.data ?? [];
  const opportunities = opportunitiesData?.data ?? [];
  const activities = activitiesData?.data ?? [];
  const quotes = quotesData?.data ?? [];
  const cases = casesData?.data ?? [];
  const contracts = contractsData?.data ?? [];
  const clmEnabled = !!account.clmEnabled;

  const totalDealValue = opportunities
    .filter(o => o.stage !== "closed_lost")
    .reduce((sum, o) => sum + (Number(o.amount) || 0), 0);

  const wonDeals = opportunities.filter(o => o.stage === "closed_won");
  const openDeals = opportunities.filter(o => !["closed_won", "closed_lost"].includes(o.stage));

  const TABS: { id: Tab; label: string; count?: number }[] = [
    { id: "contacts", label: "Contacts", count: contacts.length },
    { id: "opportunities", label: "Opportunities", count: opportunities.length },
    { id: "activities", label: "Activities", count: activities.length },
    { id: "quotes", label: "Quotes", count: quotes.length },
    ...(clmEnabled || contracts.length > 0 ? [{ id: "contracts" as Tab, label: "Contracts", count: contracts.length }] : []),
    { id: "cases", label: "Cases", count: cases.length },
    { id: "about", label: "About" },
  ];

  return (
    <Layout>
      <div className="flex flex-col gap-5">
        <div>
          <Link href="/accounts">
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground mb-3 hover:text-foreground">
              <ArrowLeft className="w-4 h-4" /> Back to Accounts
            </Button>
          </Link>

          <Card className="glass-panel border-border">
            <CardContent className="p-5">
              <div className="flex flex-col sm:flex-row items-start gap-5">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/40 to-violet-500/40 border border-border flex items-center justify-center text-2xl font-bold text-foreground shrink-0">
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
                        {account.status && (
                          <Badge variant="outline" className="text-xs capitalize">{account.status}</Badge>
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

                  <div className="flex flex-wrap gap-4 mt-3">
                    {account.phone && <span className="flex items-center gap-1.5 text-sm text-muted-foreground"><Phone className="w-3.5 h-3.5" />{account.phone}</span>}
                    {account.email && <span className="flex items-center gap-1.5 text-sm text-muted-foreground"><Mail className="w-3.5 h-3.5" />{account.email}</span>}
                    {account.ownerName && <span className="flex items-center gap-1.5 text-sm text-muted-foreground"><User className="w-3.5 h-3.5" />{account.ownerName}</span>}
                  </div>

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
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleClm(!clmEnabled)}
                      disabled={updateAccountMutation.isPending}
                      className={cn(
                        "gap-1.5",
                        clmEnabled
                          ? "border-green-300 text-green-700 hover:bg-green-50"
                          : "border-border text-muted-foreground hover:bg-muted"
                      )}
                    >
                      <FileSignature className="w-3.5 h-3.5" />
                      {clmEnabled ? "Contract Mgmt: On" : "Enable Contract Mgmt"}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-border">
                <div className="text-center">
                  <div className="text-xl font-bold text-foreground">{contacts.length}</div>
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
                  <div className="text-xl font-bold text-foreground">{`${CURRENCY_META[displayCurrency].symbol}${(convertFromBase(totalDealValue, displayCurrency, rates) / 1000).toFixed(0)}k`}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Pipeline Value</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <AISummary
          entityType="account"
          entityData={{
            ...account,
            contactCount: contacts.length,
            dealCount: opportunities.length,
          } as unknown as Record<string, unknown>}
        />

        <div className="flex gap-1 border-b border-border overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-3 py-1 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap",
                activeTab === tab.id ? "border-primary text-primary" : "border-transparent bg-sky-100 text-sky-700 hover:bg-sky-200"
              )}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className="ml-2 text-xs bg-muted rounded-full px-1.5 py-0.5">{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        {activeTab === "contacts" && (
          <div className="space-y-2">
            {!contacts.length ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="w-10 h-8 mx-auto mb-3 opacity-30" />
                No contacts linked to this account.
              </div>
            ) : (
              contacts.map((contact) => {
                const initials = `${contact.firstName[0] ?? ""}${contact.lastName[0] ?? ""}`.toUpperCase();
                return (
                  <Link key={contact.id} href={`/contacts/${contact.id}`}>
                    <Card className="glass-panel border-border hover:border-primary/30 transition-all cursor-pointer group p-4">
                      <div className="flex items-center gap-4">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/70 to-accent/70 flex items-center justify-center text-primary-foreground text-sm font-bold shrink-0">
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-primary group-hover:underline transition-colors">
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

        {activeTab === "opportunities" && (
          <div className="space-y-2">
            {!opportunities.length ? (
              <div className="text-center py-12 text-muted-foreground">
                <Briefcase className="w-10 h-8 mx-auto mb-3 opacity-30" />
                No opportunities for this account yet.
              </div>
            ) : (
              opportunities.map((opp) => (
                <Link key={opp.id} href={`/opportunities/${opp.id}`}>
                  <Card className="glass-panel border-border hover:border-primary/30 transition-all cursor-pointer group p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-primary group-hover:underline transition-colors truncate">{opp.name}</p>
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
                        {opp.amount != null && <p className="text-lg font-bold text-foreground">{fmtMoney(Number(opp.amount))}</p>}
                        {opp.probability != null && <p className="text-xs text-muted-foreground">{opp.probability}% likely</p>}
                      </div>
                    </div>
                  </Card>
                </Link>
              ))
            )}
          </div>
        )}

        {activeTab === "activities" && (
          <div className="space-y-2">
            {!activities.length ? (
              <div className="text-center py-12 text-muted-foreground">
                <Activity className="w-10 h-8 mx-auto mb-3 opacity-30" />
                No activities logged for this account.
              </div>
            ) : (
              activities.map((act) => {
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
                      {act.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{act.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-muted-foreground capitalize">{act.type}</span>
                        {act.dueDate && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {format(new Date(act.dueDate), "MMM d, h:mm a")}
                          </span>
                        )}
                        {act.createdAt && (
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(act.createdAt), "MMM d, yyyy")}
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

        {activeTab === "quotes" && (
          <div className="space-y-2">
            {!quotes.length ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="w-10 h-8 mx-auto mb-3 opacity-30" />
                No quotes for this account yet.
              </div>
            ) : (
              quotes.map((q) => (
                <Card key={q.id} className="glass-panel border-border hover:border-primary/30 transition-all p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground truncate">{q.name}</p>
                        <Badge variant="outline" className={cn("text-xs capitalize shrink-0", QUOTE_STATUS_BADGE[q.status] ?? "")}>
                          {q.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span>#{q.quoteNumber}</span>
                        {q.validUntil && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Valid until {format(new Date(q.validUntil), "MMM d, yyyy")}
                          </span>
                        )}
                        <span>{format(new Date(q.createdAt), "MMM d, yyyy")}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold text-foreground">{fmtMoney(Number(q.total))}</p>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {activeTab === "contracts" && (
          <div className="space-y-2">
            {!contracts.length ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileSignature className="w-10 h-8 mx-auto mb-3 opacity-30" />
                No contracts for this account yet.
              </div>
            ) : (
              contracts.map((c) => (
                <Card key={c.id} className="glass-panel border-border hover:border-primary/30 transition-all p-4 cursor-pointer" onClick={() => navigate(`/contracts/${c.id}`)}>
                  <div className="flex items-center gap-4">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <FileSignature className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground truncate">{c.name}</p>
                        <Badge variant="outline" className="text-xs capitalize shrink-0">
                          {c.status.replace("_", " ")}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span>#{c.contractNumber}</span>
                        {c.startDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(c.startDate), "MMM d, yyyy")}
                            {c.endDate ? ` → ${format(new Date(c.endDate), "MMM d, yyyy")}` : ""}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold text-foreground">{fmtMoney(Number(c.total))}</p>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {activeTab === "cases" && (
          <div className="space-y-2">
            {!cases.length ? (
              <div className="text-center py-12 text-muted-foreground">
                <ShieldCheck className="w-10 h-8 mx-auto mb-3 opacity-30" />
                No cases for this account yet.
              </div>
            ) : (
              cases.map((c) => (
                <Card key={c.id} className="glass-panel border-border hover:border-primary/30 transition-all p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-9 h-9 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
                      <AlertTriangle className="w-4 h-4 text-orange-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground truncate">{c.subject}</p>
                        <Badge variant="outline" className={cn("text-xs capitalize shrink-0", CASE_STATUS_BADGE[c.status] ?? "")}>
                          {c.status.replace("_", " ")}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span>#{c.caseNumber}</span>
                        <Badge variant="outline" className={cn("text-xs capitalize", CASE_PRIORITY_BADGE[c.priority] ?? "")}>
                          {c.priority}
                        </Badge>
                        {c.type && <span>{c.type}</span>}
                        <span>{format(new Date(c.createdAt), "MMM d, yyyy")}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {activeTab === "about" && (
          <Card className="glass-panel border-border p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Account Details</h2>
              {editingAbout ? (
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveAbout} disabled={updateAccountMutation.isPending} className="h-8 gap-1.5 bg-primary hover:bg-primary/90 text-foreground">
                    <Save className="w-3.5 h-3.5" /> Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={cancelEditAbout} className="h-8 gap-1.5 border-border">
                    <X className="w-3.5 h-3.5" /> Cancel
                  </Button>
                </div>
              ) : (
                <Button size="sm" variant="ghost" onClick={startEditAbout} className="h-7 text-xs text-muted-foreground hover:text-foreground">
                  <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                </Button>
              )}
            </div>

            {editingAbout ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                  {([
                    { key: "name", label: "Account Name", type: "text" },
                    { key: "industry", label: "Industry", type: "text" },
                    { key: "status", label: "Status", type: "text" },
                    { key: "stage", label: "Stage", type: "text" },
                    { key: "website", label: "Website", type: "text" },
                    { key: "phone", label: "Phone", type: "text" },
                    { key: "email", label: "Email", type: "email" },
                    { key: "employees", label: "Employees", type: "number" },
                    { key: "annualRevenue", label: "Annual Revenue", type: "number" },
                    { key: "amount", label: "Amount", type: "number" },
                    { key: "closeDate", label: "Close Date", type: "date" },
                    { key: "probability", label: "Probability (%)", type: "number" },
                    { key: "forecastCategory", label: "Forecast Category", type: "text" },
                    { key: "nextStep", label: "Next Step", type: "text" },
                    { key: "optyOwner", label: "Opportunity Owner", type: "text" },
                    { key: "optyTeam", label: "Opportunity Team", type: "text" },
                    { key: "address", label: "Address", type: "text" },
                    { key: "city", label: "City", type: "text" },
                    { key: "country", label: "Country", type: "text" },
                  ] as const).map(({ key, label, type }) => (
                    <div key={key}>
                      <Label className="text-xs text-muted-foreground uppercase tracking-wide mb-1 block">{label}</Label>
                      <Input
                        type={type}
                        value={aboutForm[key] ?? ""}
                        onChange={(e) => setAboutField(key, e.target.value)}
                        className="h-9"
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-6 pt-6 border-t border-border">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide mb-2 block">Description</Label>
                  <Textarea
                    value={aboutForm.description ?? ""}
                    onChange={(e) => setAboutField("description", e.target.value)}
                    rows={4}
                  />
                </div>
              </>
            ) : (
              <>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                  {[
                    { label: "Account Name", value: account.name },
                    { label: "Industry", value: account.industry },
                    { label: "Status", value: account.status },
                    { label: "Stage", value: account.stage },
                    { label: "Website", value: account.website },
                    { label: "Phone", value: account.phone },
                    { label: "Email", value: account.email },
                    { label: "Employees", value: account.employees?.toLocaleString() },
                    { label: "Annual Revenue", value: account.annualRevenue ? fmtMoney(Number(account.annualRevenue)) : null },
                    { label: "Amount", value: account.amount ? fmtMoney(Number(account.amount)) : null },
                    { label: "Close Date", value: account.closeDate },
                    { label: "Probability", value: account.probability != null ? `${account.probability}%` : null },
                    { label: "Forecast Category", value: account.forecastCategory },
                    { label: "Next Step", value: account.nextStep },
                    { label: "Opportunity Owner", value: account.optyOwner },
                    { label: "Opportunity Team", value: account.optyTeam },
                    { label: "Address", value: account.address },
                    { label: "City", value: account.city },
                    { label: "Country", value: account.country },
                    { label: "Account Owner", value: account.ownerName },
                    { label: "Created", value: format(new Date(account.createdAt), "MMM d, yyyy") },
                    { label: "Last Updated", value: format(new Date(account.updatedAt), "MMM d, yyyy") },
                  ].map(({ label, value }) =>
                    value ? (
                      <div key={label} className="flex items-baseline gap-2">
                        <dt className="text-xs text-muted-foreground w-28 flex-shrink-0">{label}</dt>
                        <dd className="text-xs text-foreground font-medium">{value}</dd>
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
              </>
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

