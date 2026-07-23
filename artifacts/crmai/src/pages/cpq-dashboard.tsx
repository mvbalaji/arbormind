import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCurrency } from "@/context/currency";
import { useCpqEnabled } from "@/context/cpq-feature";
import {
  GitBranch,
  SlidersHorizontal,
  Table2,
  TrendingUp,
  Cpu,
  FileText,
  ArrowRight,
  BarChart2,
  CheckCircle2,
  DollarSign,
  Lock,
} from "lucide-react";

export default function CpqDashboard() {
  const [, navigate] = useLocation();
  const { format: fmtMoney } = useCurrency();
  const { cpqEnabled, isLoading: cpqLoading } = useCpqEnabled();

  const { data: quotesData } = useQuery({
    queryKey: ["quotes"],
    queryFn: () => fetch("/api/quotes", { credentials: "include" }).then((r) => r.json()),
  });

  const quotes: any[] = quotesData?.data ?? [];
  const recentQuotes = quotes.slice(0, 5);

  const activeQuotes = quotes.filter((q) => q.status === "draft" || q.status === "sent").length;
  const avgDiscount =
    quotes.length > 0
      ? quotes.reduce((acc, q) => acc + (parseFloat(q.discount) || 0), 0) / quotes.length
      : 0;
  const avgDealSize =
    quotes.length > 0
      ? quotes.reduce((acc, q) => acc + (parseFloat(q.total) || 0), 0) / quotes.length
      : 0;
  const approvalRate =
    quotes.length > 0
      ? Math.round((quotes.filter((q) => q.status === "accepted").length / quotes.length) * 100)
      : 0;

  if (!cpqLoading && !cpqEnabled) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
            <Lock className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">CPQ Module Not Enabled</h2>
          <p className="text-muted-foreground text-sm text-center max-w-sm">
            The Configure-Price-Quote module is not enabled for your account. Contact your administrator to enable CPQ.
          </p>
          <Button variant="outline" onClick={() => navigate("/quotes")}>
            Go to Standard Quoting
          </Button>
        </div>
      </Layout>
    );
  }

  const ACTION_CARDS = [
    {
      title: "Guided Selling",
      description: "Answer a few questions and get recommended products for your customer.",
      href: "/cpq/guided-selling",
      icon: GitBranch,
      color: "from-blue-500 to-blue-600",
    },
    {
      title: "Product Configurator",
      description: "Configure product attributes, options, and add-ons with real-time pricing.",
      href: "/cpq/configurator",
      icon: SlidersHorizontal,
      color: "from-purple-500 to-purple-600",
    },
    {
      title: "Quote Line Editor",
      description: "Build and edit quotes with enterprise-grade line item management.",
      href: "/cpq/qle",
      icon: Table2,
      color: "from-emerald-500 to-emerald-600",
    },
    {
      title: "Pricing Rules",
      description: "View tiered pricing, approval thresholds, and margin calculator.",
      href: "/cpq/pricing",
      icon: TrendingUp,
      color: "from-orange-500 to-orange-600",
    },
  ];

  const STATUS_COLOR: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700",
    sent: "bg-blue-100 text-blue-700",
    accepted: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
    expired: "bg-yellow-100 text-yellow-700",
  };

  return (
    <Layout>
      {/* Hero Banner */}
      <div className="rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-10 mb-8 text-white shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <Cpu className="w-8 h-8 text-blue-200" />
          <h1 className="text-3xl font-bold tracking-tight">Configure · Price · Quote</h1>
        </div>
        <p className="text-blue-100 text-lg mt-1 max-w-2xl">
          Streamline your sales process with guided selling, product configuration, and enterprise-grade quote management.
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Active Quotes", value: activeQuotes, icon: FileText, color: "text-blue-600" },
          { label: "Avg Discount", value: `${avgDiscount.toFixed(1)}%`, icon: BarChart2, color: "text-purple-600" },
          { label: "Approval Rate", value: `${approvalRate}%`, icon: CheckCircle2, color: "text-emerald-600" },
          { label: "Avg Deal Size", value: fmtMoney(avgDealSize), icon: DollarSign, color: "text-orange-600" },
        ].map((stat) => (
          <Card key={stat.label} className="shadow-sm">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">{stat.label}</p>
                  <p className="text-2xl font-bold mt-1">{stat.value}</p>
                </div>
                <stat.icon className={`w-8 h-8 ${stat.color} opacity-80`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Action Cards */}
      <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {ACTION_CARDS.map((card) => (
          <Link key={card.href} href={card.href}>
            <Card className="h-full shadow-sm hover:shadow-md transition-shadow cursor-pointer group border-border">
              <CardContent className="pt-6 pb-5">
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${card.color} flex items-center justify-center mb-4`}>
                  <card.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-semibold text-base mb-1 group-hover:text-primary transition-colors">
                  {card.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-snug">{card.description}</p>
                <div className="flex items-center gap-1 mt-4 text-primary text-xs font-medium">
                  Open <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Recent Quotes */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Recent Quotes</CardTitle>
            <Link href="/cpq/qle">
              <span className="text-xs text-primary hover:underline cursor-pointer">View all →</span>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {recentQuotes.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">No quotes found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground text-xs uppercase tracking-wide">
                    <th className="text-left px-4 py-2.5">Quote #</th>
                    <th className="text-left px-4 py-2.5">Name</th>
                    <th className="text-left px-4 py-2.5">Status</th>
                    <th className="text-right px-4 py-2.5">Subtotal</th>
                    <th className="text-right px-4 py-2.5">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {recentQuotes.map((q: any) => (
                    <tr key={q.id} className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs">
                        <a href={`/cpq/qle/${q.id}`} className="text-primary hover:underline cursor-pointer">
                          {q.quoteNumber ?? `Q-${q.id}`}
                        </a>
                      </td>
                      <td className="px-4 py-3 font-medium">
                        <a href={`/cpq/qle/${q.id}`} className="hover:text-primary cursor-pointer transition-colors">
                          {q.name}
                        </a>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={`text-xs ${STATUS_COLOR[q.status] ?? "bg-gray-100 text-gray-700"}`}>
                          {q.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">{fmtMoney(parseFloat(q.subtotal) || 0)}</td>
                      <td className="px-4 py-3 text-right font-semibold">{fmtMoney(parseFloat(q.total) || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </Layout>
  );
}
