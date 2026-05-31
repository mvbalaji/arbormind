import React, { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Mail, Phone, Building2, Briefcase, MapPin, Activity,
  Phone as CallIcon, Mail as EmailIcon, Users, Calendar, CheckCircle2, Clock,
} from "lucide-react";
import { format } from "date-fns";
import { useCurrency } from "@/context/currency";

interface ContactDetail {
  id: number;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  title: string | null;
  department: string | null;
  accountId: number | null;
  accountName: string | null;
  ownerName: string | null;
  leadSource: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  description: string | null;
  createdAt: string;
}

interface RelatedActivity {
  id: number;
  type: string;
  subject: string;
  status: string;
  dueDate: string | null;
  opportunityName: string | null;
}

interface RelatedOpportunity {
  id: number;
  name: string;
  stage: string;
  amount: number | null;
  closeDate: string | null;
  accountName: string | null;
}

const STAGE_COLORS: Record<string, string> = {
  prospecting: "bg-blue-50 text-blue-700 border-blue-500/30",
  qualification: "bg-indigo-50 text-indigo-700 border-indigo-500/30",
  proposal: "bg-purple-50 text-purple-700 border-purple-500/30",
  negotiation: "bg-orange-50 text-orange-700 border-orange-500/30",
  closed_won: "bg-green-50 text-green-700 border-green-500/30",
  closed_lost: "bg-red-50 text-red-700 border-red-500/30",
};

const ACTIVITY_ICONS: Record<string, React.ElementType> = {
  call: CallIcon,
  email: EmailIcon,
  meeting: Users,
  task: CheckCircle2,
  demo: Briefcase,
};

type Tab = "activities" | "opportunities" | "about";

export default function ContactDetail() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [activeTab, setActiveTab] = useState<Tab>("activities");
  const { format: fmtMoney } = useCurrency();

  const { data: contact, isLoading: contactLoading } = useQuery<ContactDetail>({
    queryKey: ["contact", id],
    queryFn: async () => {
      const res = await fetch(`/api/contacts/${id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Contact not found");
      return res.json() as Promise<ContactDetail>;
    },
    enabled: !!id,
  });

  const { data: activitiesData } = useQuery<{ data: RelatedActivity[] }>({
    queryKey: ["contact-activities", id],
    queryFn: async () => {
      const res = await fetch(`/api/contacts/${id}/activities`, { credentials: "include" });
      return res.json() as Promise<{ data: RelatedActivity[] }>;
    },
    enabled: !!id,
  });

  const { data: opportunitiesData } = useQuery<{ data: RelatedOpportunity[] }>({
    queryKey: ["contact-opportunities", id],
    queryFn: async () => {
      const res = await fetch(`/api/contacts/${id}/opportunities`, { credentials: "include" });
      return res.json() as Promise<{ data: RelatedOpportunity[] }>;
    },
    enabled: !!id,
  });

  if (contactLoading) {
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

  if (!contact) {
    return (
      <Layout>
        <div className="text-center py-20 text-muted-foreground">Contact not found.</div>
      </Layout>
    );
  }

  const initials = `${contact.firstName[0] ?? ""}${contact.lastName[0] ?? ""}`.toUpperCase();
  const TABS: { id: Tab; label: string; count?: number }[] = [
    { id: "activities", label: "Activities", count: activitiesData?.data.length },
    { id: "opportunities", label: "Deals", count: opportunitiesData?.data.length },
    { id: "about", label: "About" },
  ];

  return (
    <Layout>
      <div className="flex flex-col gap-6 max-w-5xl mx-auto">
        {/* Back + Header */}
        <div>
          <Link href="/contacts">
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground mb-4 hover:text-foreground">
              <ArrowLeft className="w-4 h-4" />
              Back to Contacts
            </Button>
          </Link>

          <Card className="glass-panel border-border p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground text-2xl font-bold shadow-lg shadow-primary/20">
                {initials}
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-foreground">
                  {contact.firstName} {contact.lastName}
                </h1>
                {contact.title && (
                  <p className="text-muted-foreground mt-0.5">
                    {contact.title}{contact.department ? ` · ${contact.department}` : ""}
                  </p>
                )}
                <div className="flex flex-wrap gap-3 mt-3">
                  {contact.email && (
                    <a href={`mailto:${contact.email}`} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
                      <Mail className="w-4 h-4" />
                      {contact.email}
                    </a>
                  )}
                  {contact.phone && (
                    <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Phone className="w-4 h-4" />
                      {contact.phone}
                    </span>
                  )}
                  {contact.accountName && (
                    <Link href={contact.accountId ? `/accounts/${contact.accountId}` : "#"}>
                      <span className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer">
                        <Building2 className="w-4 h-4" />
                        {contact.accountName}
                      </span>
                    </Link>
                  )}
                  {(contact.city || contact.country) && (
                    <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      {[contact.city, contact.country].filter(Boolean).join(", ")}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className="ml-2 text-xs bg-muted rounded-full px-1.5 py-0.5">{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Activities Tab */}
        {activeTab === "activities" && (
          <div className="flex flex-col gap-3">
            {!activitiesData?.data.length ? (
              <div className="text-center py-12 text-muted-foreground">
                <Activity className="w-10 h-8 mx-auto mb-3 opacity-30" />
                No activities logged for this contact yet.
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
                        <Badge variant="outline" className={`capitalize text-xs ${
                          act.status === "completed" ? "border-green-500/30 text-green-600" :
                          act.status === "cancelled" ? "border-red-500/30 text-red-600" :
                          "border-blue-500/30 text-blue-600"
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
                        {act.opportunityName && (
                          <span className="text-xs text-muted-foreground">· {act.opportunityName}</span>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        )}

        {/* Opportunities Tab */}
        {activeTab === "opportunities" && (
          <div className="flex flex-col gap-3">
            {!opportunitiesData?.data.length ? (
              <div className="text-center py-12 text-muted-foreground">
                <Briefcase className="w-10 h-8 mx-auto mb-3 opacity-30" />
                No deals linked to this contact yet.
              </div>
            ) : (
              opportunitiesData.data.map((opp) => (
                <Link key={opp.id} href={`/opportunities/${opp.id}`}>
                  <Card className="glass-panel border-border p-4 hover:border-primary/30 transition-all cursor-pointer group">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-foreground group-hover:text-primary transition-colors">{opp.name}</div>
                        {opp.accountName && (
                          <div className="text-xs text-muted-foreground mt-0.5">{opp.accountName}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {opp.amount !== null && (
                          <span className="text-sm font-semibold text-foreground">
                            {fmtMoney(opp.amount)}
                          </span>
                        )}
                        <Badge variant="outline" className={`capitalize text-xs ${STAGE_COLORS[opp.stage] ?? ""}`}>
                          {opp.stage.replace("_", " ")}
                        </Badge>
                        {opp.closeDate && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(opp.closeDate), "MMM d")}
                          </span>
                        )}
                      </div>
                    </div>
                  </Card>
                </Link>
              ))
            )}
          </div>
        )}

        {/* About Tab */}
        {activeTab === "about" && (
          <Card className="glass-panel border-border p-6">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
              {[
                { label: "Email", value: contact.email },
                { label: "Phone", value: contact.phone },
                { label: "Mobile", value: contact.mobile },
                { label: "Title", value: contact.title },
                { label: "Department", value: contact.department },
                { label: "Account", value: contact.accountName },
                { label: "Lead Source", value: contact.leadSource },
                { label: "City", value: contact.city },
                { label: "Country", value: contact.country },
                { label: "Owner", value: contact.ownerName },
                { label: "Created", value: contact.createdAt ? format(new Date(contact.createdAt), "MMM d, yyyy") : null },
              ].map(({ label, value }) =>
                value ? (
                  <div key={label}>
                    <dt className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">{label}</dt>
                    <dd className="text-sm text-foreground">{value}</dd>
                  </div>
                ) : null
              )}
            </dl>
            {contact.description && (
              <div className="mt-6 pt-6 border-t border-border">
                <dt className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Notes</dt>
                <dd className="text-sm text-muted-foreground leading-relaxed">{contact.description}</dd>
              </div>
            )}
          </Card>
        )}
      </div>
    </Layout>
  );
}
