import React, { useState } from "react";
import { useListContacts, useCreateContact, getListContactsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, Plus, Mail, Phone, Building2, MoreHorizontal } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export default function Contacts() {
  const [search, setSearch] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { data, isLoading } = useListContacts({ search, limit: 50 });

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-white tracking-tight">Contacts</h1>
            <p className="text-muted-foreground mt-1 text-sm">Manage your customer relationships and personnel.</p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
              <Input 
                placeholder="Search contacts..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-card border-white/10"
              />
            </div>
            <CreateContactDialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen} />
          </div>
        </div>

        <Card className="glass-panel border-white/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-black/20 border-b border-white/5">
                <tr>
                  <th className="px-6 py-4 font-medium">Name</th>
                  <th className="px-6 py-4 font-medium">Contact Info</th>
                  <th className="px-6 py-4 font-medium">Account / Title</th>
                  <th className="px-6 py-4 font-medium">Owner</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-6 py-4" colSpan={5}><div className="h-10 bg-white/5 rounded animate-pulse w-full"></div></td>
                    </tr>
                  ))
                ) : data?.data?.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
                          <Search className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <p>No contacts found.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  data?.data?.map((contact) => (
                    <tr key={contact.id} className="hover:bg-white/5 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs border border-primary/30">
                            {contact.firstName[0]}{contact.lastName[0]}
                          </div>
                          <div>
                            <div className="font-medium text-white">{contact.firstName} {contact.lastName}</div>
                            <div className="text-xs text-muted-foreground">Added {format(new Date(contact.createdAt), 'MMM d, yyyy')}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Mail className="w-3.5 h-3.5" />
                            <span className="truncate max-w-[150px]">{contact.email || '-'}</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Phone className="w-3.5 h-3.5" />
                            <span>{contact.phone || '-'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 font-medium text-white">
                            <Building2 className="w-3.5 h-3.5 text-primary" />
                            {contact.accountName || <span className="text-muted-foreground font-normal">No Account</span>}
                          </div>
                          <div className="text-xs text-muted-foreground ml-5.5">
                            {contact.title || '-'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {contact.ownerName || '-'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
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

function CreateContactDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createContactMutation = useCreateContact();
  
  const [formData, setFormData] = useState({
    firstName: "", lastName: "", email: "", phone: "", title: "", company: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createContactMutation.mutate({ data: formData }, {
      onSuccess: () => {
        toast({ title: "Contact Created", description: "The contact has been added successfully." });
        queryClient.invalidateQueries({ queryKey: getListContactsQueryKey() });
        onOpenChange(false);
        setFormData({ firstName: "", lastName: "", email: "", phone: "", title: "", company: "" });
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to create contact.", variant: "destructive" });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all">
          <Plus className="w-4 h-4 mr-2" />
          Add Contact
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] bg-card border-white/10 text-white shadow-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Create New Contact</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input id="firstName" required className="bg-black/20 border-white/10" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input id="lastName" required className="bg-black/20 border-white/10" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" className="bg-black/20 border-white/10" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" className="bg-black/20 border-white/10" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="title">Job Title</Label>
            <Input id="title" className="bg-black/20 border-white/10" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
          </div>
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="border-white/10">Cancel</Button>
            <Button type="submit" disabled={createContactMutation.isPending} className="bg-primary hover:bg-primary/90 text-white">
              {createContactMutation.isPending ? "Creating..." : "Create Contact"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
