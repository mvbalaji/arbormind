import React, { useState } from "react";
import {
  useListAccounts, useCreateAccount, useUpdateAccount, useDeleteAccount,
  getListAccountsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Building2, Search, MapPin, Link as LinkIcon, Users, Briefcase, Plus, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AccountFormData {
  name: string;
  industry: string;
  website: string;
  phone: string;
  city: string;
  country: string;
  employees: string;
  annualRevenue: string;
}

const defaultFormData: AccountFormData = {
  name: "", industry: "", website: "", phone: "",
  city: "", country: "", employees: "", annualRevenue: "",
};

export default function Accounts() {
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<{ id: number } & AccountFormData | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const { data, isLoading } = useListAccounts({ search, limit: 50 });

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-display font-bold text-white tracking-tight">Accounts</h1>
            <p className="text-muted-foreground mt-1 text-sm">Organizations and companies you do business with.</p>
          </div>
          <Button
            onClick={() => setIsCreateOpen(true)}
            className="bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Account
          </Button>
        </div>

        <Card className="glass-panel border-white/5">
          <div className="p-4 border-b border-white/5 flex gap-4 bg-black/20">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
              <Input
                placeholder="Search accounts..."
                className="pl-9 bg-card border-white/10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
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
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {isLoading ? (
                  <tr><td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">Loading...</td></tr>
                ) : data?.data?.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">No accounts found.</td></tr>
                ) : (
                  data?.data?.map((acc) => (
                    <tr key={acc.id} className="hover:bg-white/5 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="font-medium text-white text-base">{acc.name}</div>
                        {acc.website && (
                          <div className="text-xs text-primary flex items-center gap-1 mt-1 hover:underline cursor-pointer">
                            <LinkIcon className="w-3 h-3" /> {acc.website}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">{acc.industry ?? "-"}</td>
                      <td className="px-6 py-4 text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {acc.city ? `${acc.city}, ${acc.country ?? ""}` : "-"}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-md text-white font-medium">
                          <Users className="w-3.5 h-3.5 text-muted-foreground" /> {acc.contactCount ?? 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center gap-1.5 bg-primary/10 px-2.5 py-1 rounded-md text-primary font-medium border border-primary/20">
                          <Briefcase className="w-3.5 h-3.5" /> {acc.dealCount ?? 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-card border-white/10 text-white">
                            <DropdownMenuItem
                              onClick={() => setEditingAccount({
                                id: acc.id,
                                name: acc.name,
                                industry: acc.industry ?? "",
                                website: acc.website ?? "",
                                phone: acc.phone ?? "",
                                city: acc.city ?? "",
                                country: acc.country ?? "",
                                employees: acc.employees != null ? String(acc.employees) : "",
                                annualRevenue: acc.annualRevenue != null ? String(acc.annualRevenue) : "",
                              })}
                              className="cursor-pointer hover:bg-white/10"
                            >
                              <Pencil className="w-4 h-4 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-white/10" />
                            <DropdownMenuItem
                              onClick={() => setDeletingId(acc.id)}
                              className="cursor-pointer text-destructive hover:bg-destructive/10 focus:text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <AccountFormDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} mode="create" />
      <AccountFormDialog
        open={!!editingAccount}
        onOpenChange={(o) => { if (!o) setEditingAccount(null); }}
        mode="edit"
        initialData={editingAccount ?? undefined}
      />
      <DeleteAccountDialog
        open={deletingId !== null}
        onOpenChange={(o) => { if (!o) setDeletingId(null); }}
        id={deletingId}
      />
    </Layout>
  );
}

function AccountFormDialog({
  open, onOpenChange, mode, initialData,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  initialData?: { id: number } & AccountFormData;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createMutation = useCreateAccount();
  const updateMutation = useUpdateAccount();
  const [formData, setFormData] = useState<AccountFormData>(initialData ?? defaultFormData);

  React.useEffect(() => {
    if (open) setFormData(initialData ?? defaultFormData);
  }, [open, initialData]);

  const f = (field: keyof AccountFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setFormData({ ...formData, [field]: e.target.value });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: formData.name,
      industry: formData.industry || undefined,
      website: formData.website || undefined,
      phone: formData.phone || undefined,
      city: formData.city || undefined,
      country: formData.country || undefined,
      employees: formData.employees ? parseInt(formData.employees) : undefined,
      annualRevenue: formData.annualRevenue ? parseFloat(formData.annualRevenue) : undefined,
    };
    const invalidate = () => queryClient.invalidateQueries({ queryKey: getListAccountsQueryKey() });
    if (mode === "create") {
      createMutation.mutate({ data: payload }, {
        onSuccess: () => { toast({ title: "Account created" }); invalidate(); onOpenChange(false); },
        onError: () => toast({ title: "Error", description: "Failed to create account.", variant: "destructive" }),
      });
    } else if (initialData) {
      updateMutation.mutate({ id: initialData.id, data: payload }, {
        onSuccess: () => { toast({ title: "Account updated" }); invalidate(); onOpenChange(false); },
        onError: () => toast({ title: "Error", description: "Failed to update account.", variant: "destructive" }),
      });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-white/10 text-white sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {mode === "create" ? "Create Account" : "Edit Account"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Account Name *</Label>
            <Input required className="bg-black/20 border-white/10" value={formData.name} onChange={f("name")} />
          </div>
          <div className="space-y-2">
            <Label>Industry</Label>
            <select
              className="w-full bg-black/20 border border-white/10 rounded-md px-3 py-2 text-white text-sm"
              value={formData.industry}
              onChange={f("industry")}
            >
              <option value="">Select industry</option>
              <option value="Technology">Technology</option>
              <option value="Finance">Finance</option>
              <option value="Healthcare">Healthcare</option>
              <option value="Manufacturing">Manufacturing</option>
              <option value="Retail">Retail</option>
              <option value="Education">Education</option>
              <option value="Real Estate">Real Estate</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Website</Label>
              <Input className="bg-black/20 border-white/10" placeholder="https://" value={formData.website} onChange={f("website")} />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input className="bg-black/20 border-white/10" value={formData.phone} onChange={f("phone")} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>City</Label>
              <Input className="bg-black/20 border-white/10" value={formData.city} onChange={f("city")} />
            </div>
            <div className="space-y-2">
              <Label>Country</Label>
              <Input className="bg-black/20 border-white/10" value={formData.country} onChange={f("country")} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Employees</Label>
              <Input type="number" className="bg-black/20 border-white/10" value={formData.employees} onChange={f("employees")} />
            </div>
            <div className="space-y-2">
              <Label>Annual Revenue ($)</Label>
              <Input type="number" className="bg-black/20 border-white/10" value={formData.annualRevenue} onChange={f("annualRevenue")} />
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="border-white/10">Cancel</Button>
            <Button type="submit" disabled={isPending} className="bg-primary hover:bg-primary/90 text-white">
              {isPending ? "Saving..." : mode === "create" ? "Create Account" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteAccountDialog({
  open, onOpenChange, id,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  id: number | null;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const deleteMutation = useDeleteAccount();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-card border-white/10 text-white">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Account?</AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground">
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="border-white/10 text-white hover:bg-white/10">Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              if (id === null) return;
              deleteMutation.mutate({ id }, {
                onSuccess: () => {
                  toast({ title: "Account deleted" });
                  queryClient.invalidateQueries({ queryKey: getListAccountsQueryKey() });
                  onOpenChange(false);
                },
                onError: () => toast({ title: "Error", description: "Failed to delete account.", variant: "destructive" }),
              });
            }}
            className="bg-destructive hover:bg-destructive/90 text-white"
          >
            {deleteMutation.isPending ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
