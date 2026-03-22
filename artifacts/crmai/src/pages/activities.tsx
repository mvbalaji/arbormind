import React from "react";
import { useListActivities } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Card } from "@/components/ui/card";
import { Phone, Mail, Calendar, CheckSquare, FileText, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const ICONS: Record<string, any> = {
  call: Phone, email: Mail, meeting: Calendar, task: CheckSquare, note: FileText
};

const COLORS: Record<string, string> = {
  call: "text-blue-400 bg-blue-500/10",
  email: "text-purple-400 bg-purple-500/10",
  meeting: "text-orange-400 bg-orange-500/10",
  task: "text-green-400 bg-green-500/10",
  note: "text-gray-400 bg-gray-500/10"
};

export default function Activities() {
  const { data, isLoading } = useListActivities();

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-display font-bold text-white tracking-tight">Activities</h1>
            <p className="text-muted-foreground mt-1 text-sm">Calls, emails, meetings, and tasks.</p>
          </div>
          <Button className="bg-primary text-white"><Plus className="w-4 h-4 mr-2" /> Log Activity</Button>
        </div>

        <Card className="glass-panel border-white/5">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-white/5 border-b border-white/5">
                <tr>
                  <th className="px-6 py-4 font-medium w-12"></th>
                  <th className="px-6 py-4 font-medium">Subject</th>
                  <th className="px-6 py-4 font-medium">Related To</th>
                  <th className="px-6 py-4 font-medium">Date</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {isLoading ? (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">Loading...</td></tr>
                ) : data?.data?.map(act => {
                  const Icon = ICONS[act.type] || FileText;
                  return (
                    <tr key={act.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${COLORS[act.type]}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium text-white">{act.subject}</td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {act.contactName ? act.contactName : act.accountName ? act.accountName : '-'}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {act.dueDate ? format(new Date(act.dueDate), 'MMM d, yyyy') : '-'}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="outline" className={act.status === 'completed' ? 'border-green-500/30 text-green-400 bg-green-500/10' : 'border-white/10 text-muted-foreground'}>
                          {act.status}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
