import React from "react";
import { useListQuotes } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Card } from "@/components/ui/card";
import { FileText, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function Quotes() {
  const { data, isLoading } = useListQuotes();

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-display font-bold text-white tracking-tight">Quotes</h1>
            <p className="text-muted-foreground mt-1 text-sm">Manage pricing quotes sent to customers.</p>
          </div>
          <Button className="bg-primary text-white"><Plus className="w-4 h-4 mr-2" /> Create Quote</Button>
        </div>

        <Card className="glass-panel border-white/5">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-white/5 border-b border-white/5">
                <tr>
                  <th className="px-6 py-4 font-medium">Quote</th>
                  <th className="px-6 py-4 font-medium">Opportunity</th>
                  <th className="px-6 py-4 font-medium text-right">Total</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Valid Until</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {isLoading ? (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">Loading...</td></tr>
                ) : data?.data?.map(q => (
                  <tr key={q.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">{q.name}</div>
                      <div className="text-xs text-muted-foreground mt-1 font-mono">{q.quoteNumber}</div>
                    </td>
                    <td className="px-6 py-4 text-primary hover:underline cursor-pointer">
                      {q.opportunityName || '-'}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-white">
                      ${q.total.toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className="capitalize bg-black/40 border-white/10 text-muted-foreground">
                        {q.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {q.validUntil ? format(new Date(q.validUntil), 'MMM d, yyyy') : '-'}
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
