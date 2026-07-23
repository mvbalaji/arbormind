import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, RefreshCw, AlertTriangle, CheckCircle, XCircle, Clock } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { useCurrency } from "@/context/currency";
import { useToast } from "@/hooks/use-toast";

const API = "/api";

type ContractRow = {
  id: number;
  contract_number: string;
  name: string;
  account_name: string | null;
  status: string;
  end_date: string | null;
  total: number;
  arr_at_risk: number | null;
  renewal_status: string | null;
  renewal_window_days: number | null;
  auto_renew: boolean;
};

const RENEWAL_STATUS_OPTIONS = ["pending", "in_review", "approved", "declined", "negotiating", "renewed"];

const RENEWAL_BADGE: Record<string, string> = {
  pending: "bg-yellow-500/15 text-yellow-600 border-yellow-300",
  in_review: "bg-blue-500/15 text-blue-600 border-blue-300",
  approved: "bg-green-500/15 text-green-700 border-green-300",
  declined: "bg-red-500/15 text-red-600 border-red-300",
  negotiating: "bg-purple-500/15 text-purple-600 border-purple-300",
  renewed: "bg-emerald-500/15 text-emerald-700 border-emerald-300",
};

function urgencyClass(daysLeft: number | null) {
  if (daysLeft === null) return "";
  if (daysLeft < 0) return "text-red-600";
  if (daysLeft <= 30) return "text-red-500";
  if (daysLeft <= 60) return "text-amber-500";
  return "text-muted-foreground";
}

export default function ClmRenewals() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { format: fmtMoney } = useCurrency();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ["clm-renewals"],
    queryFn: () => fetch(`${API}/clm/renewals`).then((r) => r.json()) as Promise<ContractRow[]>,
  });

  const updateClm = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      fetch(`${API}/contracts/${id}/clm`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then((r) => r.json()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["clm-renewals"] }); toast({ title: "Renewal status updated" }); },
  });

  const filtered = contracts.filter((c) => {
    const q = search.toLowerCase();
    const matchSearch = !q || (c.name ?? "").toLowerCase().includes(q) || (c.account_name ?? "").toLowerCase().includes(q) || (c.contract_number ?? "").toLowerCase().includes(q);
    const matchStatus = !statusFilter || c.renewal_status === statusFilter;
    return matchSearch && matchStatus;
  });

  const today = new Date();
  const expiringSoon = contracts.filter((c) => c.end_date && differenceInDays(new Date(c.end_date), today) <= 90 && differenceInDays(new Date(c.end_date), today) >= 0);
  const totalArrAtRisk = contracts.reduce((sum, c) => sum + (c.arr_at_risk ?? 0), 0);

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Renewal Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Track and manage contract renewals (UC-011)</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="glass-panel border-border p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Expiring â‰¤ 90d</p>
                <p className="text-2xl font-bold text-foreground">{expiringSoon.length}</p>
              </div>
            </div>
          </Card>
          <Card className="glass-panel border-border p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">ARR at Risk</p>
                <p className="text-2xl font-bold text-foreground">{fmtMoney(totalArrAtRisk)}</p>
              </div>
            </div>
          </Card>
          <Card className="glass-panel border-border p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Approved</p>
                <p className="text-2xl font-bold text-foreground">{contracts.filter((c) => c.renewal_status === "approved").length}</p>
              </div>
            </div>
          </Card>
          <Card className="glass-panel border-border p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Declined</p>
                <p className="text-2xl font-bold text-foreground">{contracts.filter((c) => c.renewal_status === "declined").length}</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="flex gap-3 mb-4">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-9 bg-muted border-border" placeholder="Search contracts..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="h-10 px-3 rounded-md bg-muted border border-border text-foreground text-sm"
            value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Renewal Statuses</option>
            {RENEWAL_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1).replace("_", " ")}</option>)}
          </select>
        </div>

        <Card className="glass-panel border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Contract</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Account</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">End Date</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Days Left</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">TCV</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">ARR at Risk</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase">Auto-Renew</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Renewal Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr><td colSpan={9} className="py-8 text-center text-muted-foreground">Loading renewals...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="py-8 text-center text-muted-foreground">
                  <RefreshCw className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  No contracts found.
                </td></tr>
              ) : filtered.map((c) => {
                const daysLeft = c.end_date ? differenceInDays(new Date(c.end_date), today) : null;
                return (
                  <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <button className="text-primary hover:underline font-medium" onClick={() => navigate(`/contracts/${c.id}`)}>
                        {c.name}
                      </button>
                      <p className="text-xs text-muted-foreground">{c.contract_number}</p>
                    </td>
                    <td className="px-4 py-3 text-foreground">{c.account_name ?? "—"}</td>
                    <td className="px-4 py-3 text-right text-foreground">
                      {c.end_date ? format(new Date(c.end_date), "MMM d, yyyy") : "—"}
                    </td>
                    <td className={`px-4 py-3 text-right font-medium ${urgencyClass(daysLeft)}`}>
                      {daysLeft !== null ? (daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d`) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-foreground">{fmtMoney(c.total)}</td>
                    <td className="px-4 py-3 text-right text-foreground">{c.arr_at_risk ? fmtMoney(c.arr_at_risk) : "—"}</td>
                    <td className="px-4 py-3 text-center">
                      {c.auto_renew
                        ? <CheckCircle className="w-4 h-4 text-green-500 mx-auto" />
                        : <XCircle className="w-4 h-4 text-muted-foreground mx-auto" />}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        className="h-8 px-2 rounded-md bg-muted border border-border text-foreground text-xs"
                        value={c.renewal_status ?? ""}
                        onChange={(e) => updateClm.mutate({ id: c.id, data: { renewalStatus: e.target.value || null } })}>
                        <option value="">— Set Status —</option>
                        {RENEWAL_STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1).replace("_", " ")}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => navigate(`/contracts/${c.id}`)}>
                        View
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      </div>
    </Layout>
  );
}

