import React from "react";
import { useListCases } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Card } from "@/components/ui/card";
import { LifeBuoy, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  medium: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  high: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  critical: "bg-red-500/10 text-red-400 border-red-500/20",
};

export default function Cases() {
  const { data, isLoading } = useListCases();

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-display font-bold text-white tracking-tight">Support Cases</h1>
            <p className="text-muted-foreground mt-1 text-sm">Manage customer issues and requests.</p>
          </div>
          <Button className="bg-primary text-white"><Plus className="w-4 h-4 mr-2" /> New Case</Button>
        </div>

        <Card className="glass-panel border-white/5">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-white/5 border-b border-white/5">
                <tr>
                  <th className="px-6 py-4 font-medium">Case Number</th>
                  <th className="px-6 py-4 font-medium">Subject</th>
                  <th className="px-6 py-4 font-medium">Priority</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Opened</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {isLoading ? (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">Loading...</td></tr>
                ) : data?.data?.map(c => (
                  <tr key={c.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-muted-foreground">{c.caseNumber}</td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">{c.subject}</div>
                      <div className="text-xs text-muted-foreground mt-1">{c.contactName || c.accountName || '-'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className={`capitalize ${PRIORITY_COLORS[c.priority]}`}>
                        {c.priority}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className="capitalize bg-black/40 border-white/10 text-muted-foreground">
                        {c.status.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {format(new Date(c.createdAt), 'MMM d, yyyy')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
