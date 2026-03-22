import React from "react";
import { useListAccounts } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Card } from "@/components/ui/card";
import { Building2, Search, MapPin, Link as LinkIcon, Users, Briefcase } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function Accounts() {
  const { data, isLoading } = useListAccounts();

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-display font-bold text-white tracking-tight">Accounts</h1>
            <p className="text-muted-foreground mt-1 text-sm">Organizations and companies you do business with.</p>
          </div>
          <Button className="bg-primary text-white"><Building2 className="w-4 h-4 mr-2" /> Add Account</Button>
        </div>

        <Card className="glass-panel border-white/5">
          <div className="p-4 border-b border-white/5 flex gap-4 bg-black/20">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
              <Input placeholder="Search accounts..." className="pl-9 bg-card border-white/10" />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-white/5 border-b border-white/5">
                <tr>
                  <th className="px-6 py-4 font-medium">Account Name</th>
                  <th className="px-6 py-4 font-medium">Industry</th>
                  <th className="px-6 py-4 font-medium">Location</th>
                  <th className="px-6 py-4 font-medium text-center">Contacts</th>
                  <th className="px-6 py-4 font-medium text-center">Deals</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {isLoading ? (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">Loading...</td></tr>
                ) : data?.data?.map(acc => (
                  <tr key={acc.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-white text-base">{acc.name}</div>
                      {acc.website && <div className="text-xs text-primary flex items-center gap-1 mt-1 hover:underline cursor-pointer"><LinkIcon className="w-3 h-3"/> {acc.website}</div>}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{acc.industry || '-'}</td>
                    <td className="px-6 py-4 text-muted-foreground flex items-center gap-1 mt-2">
                      <MapPin className="w-3.5 h-3.5" /> {acc.city ? `${acc.city}, ${acc.country || ''}` : '-'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-md text-white font-medium">
                        <Users className="w-3.5 h-3.5 text-muted-foreground" /> {acc.contactCount}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center gap-1.5 bg-primary/10 px-2.5 py-1 rounded-md text-primary font-medium border border-primary/20">
                        <Briefcase className="w-3.5 h-3.5" /> {acc.dealCount}
                      </span>
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
