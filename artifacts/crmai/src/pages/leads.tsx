import React, { useState } from "react";
import { useListLeads, useCreateLead, getListLeadsQueryKey, useConvertLead } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Filter, ArrowRightLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  contacted: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  qualified: "bg-green-500/10 text-green-400 border-green-500/20",
  unqualified: "bg-red-500/10 text-red-400 border-red-500/20",
  converted: "bg-gray-500/10 text-gray-400 border-gray-500/20",
};

export default function Leads() {
  const [search, setSearch] = useState("");
  const { data, isLoading } = useListLeads({ search, limit: 50 });

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-white tracking-tight">Leads</h1>
            <p className="text-muted-foreground mt-1 text-sm">Track and convert potential prospects.</p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Button variant="outline" size="icon" className="border-white/10 bg-card">
              <Filter className="w-4 h-4" />
            </Button>
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
              <Input 
                placeholder="Search leads..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-card border-white/10"
              />
            </div>
            <CreateLeadDialog />
          </div>
        </div>

        <Card className="glass-panel border-white/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-black/20 border-b border-white/5">
                <tr>
                  <th className="px-6 py-4 font-medium">Lead</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Company</th>
                  <th className="px-6 py-4 font-medium text-center">Score</th>
                  <th className="px-6 py-4 font-medium">Assigned To</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {isLoading ? (
                  <tr><td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">Loading...</td></tr>
                ) : data?.data?.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">No leads found.</td></tr>
                ) : (
                  data?.data?.map((lead) => (
                    <tr key={lead.id} className="hover:bg-white/5 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="font-medium text-white">{lead.firstName} {lead.lastName}</div>
                        <div className="text-xs text-muted-foreground">{lead.email || lead.phone || 'No contact info'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="outline" className={`capitalize ${STATUS_COLORS[lead.status]}`}>
                          {lead.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {lead.company || '-'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {lead.score ? (
                          <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full border ${
                            lead.score >= 80 ? 'border-green-500/50 text-green-400 bg-green-500/10' :
                            lead.score >= 50 ? 'border-yellow-500/50 text-yellow-400 bg-yellow-500/10' :
                            'border-red-500/50 text-red-400 bg-red-500/10'
                          } font-bold text-xs`}>
                            {lead.score}
                          </div>
                        ) : '-'}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {lead.assignedToName || 'Unassigned'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {!lead.isConverted && (
                          <ConvertLeadDialog leadId={lead.id} name={`${lead.firstName} ${lead.lastName}`} />
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </Layout>
  );
}

function CreateLeadDialog() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const mutation = useCreateLead();
  
  const [formData, setFormData] = useState({ firstName: "", lastName: "", email: "", company: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({ data: formData }, {
      onSuccess: () => {
        toast({ title: "Success", description: "Lead created." });
        queryClient.invalidateQueries({ queryKey: getListLeadsQueryKey() });
        setOpen(false);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20">
          <Plus className="w-4 h-4 mr-2" /> Add Lead
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-white/10 text-white">
        <DialogHeader><DialogTitle>Create Lead</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>First Name</Label><Input required className="bg-black/20 border-white/10" value={formData.firstName} onChange={e=>setFormData({...formData, firstName: e.target.value})} /></div>
            <div className="space-y-2"><Label>Last Name</Label><Input required className="bg-black/20 border-white/10" value={formData.lastName} onChange={e=>setFormData({...formData, lastName: e.target.value})} /></div>
          </div>
          <div className="space-y-2"><Label>Email</Label><Input type="email" className="bg-black/20 border-white/10" value={formData.email} onChange={e=>setFormData({...formData, email: e.target.value})} /></div>
          <div className="space-y-2"><Label>Company</Label><Input className="bg-black/20 border-white/10" value={formData.company} onChange={e=>setFormData({...formData, company: e.target.value})} /></div>
          <Button type="submit" disabled={mutation.isPending} className="w-full bg-primary">{mutation.isPending ? "Creating..." : "Create"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ConvertLeadDialog({ leadId, name }: { leadId: number, name: string }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const mutation = useConvertLead();

  const handleConvert = () => {
    mutation.mutate({ id: leadId, data: { createContact: true, createAccount: true, createOpportunity: true, opportunityName: `${name} Deal`, opportunityAmount: 0 } }, {
      onSuccess: () => {
        toast({ title: "Lead Converted!", description: "Successfully created Contact, Account, and Opportunity." });
        queryClient.invalidateQueries({ queryKey: getListLeadsQueryKey() });
        setOpen(false);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="border-primary/50 text-primary hover:bg-primary/10">
          <ArrowRightLeft className="w-4 h-4 mr-2" /> Convert
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-white/10 text-white">
        <DialogHeader><DialogTitle>Convert Lead</DialogTitle></DialogHeader>
        <div className="py-4 space-y-4">
          <p className="text-muted-foreground text-sm">Converting this lead will automatically create:</p>
          <ul className="list-disc pl-5 text-sm space-y-2">
            <li>A new Contact record</li>
            <li>A new Account record</li>
            <li>A new Opportunity in Prospecting stage</li>
          </ul>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} className="border-white/10">Cancel</Button>
          <Button onClick={handleConvert} disabled={mutation.isPending} className="bg-accent hover:bg-accent/90">
            {mutation.isPending ? "Converting..." : "Confirm Conversion"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
