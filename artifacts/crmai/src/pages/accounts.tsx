import React, { useState } from "react";
import {
  useListAccounts, useCreateAccount, useUpdateAccount, useDeleteAccount,
  getListAccountsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/auth";
import { Layout } from "@/components/layout";
import { AISummary } from "@/components/ai-summary";
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
import {
  Building2, Search, MapPin, Link as LinkIcon, Users, Briefcase,
  Plus, MoreHorizontal, Pencil, Trash2, ExternalLink, ChevronDown,
  Mail, Phone, Filter, Download, Upload, ListFilter, User,
} from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useColumnVisibility } from "@/hooks/use-column-visibility";
import { ColumnsMenu } from "@/components/columns-menu";
import { usePagination } from "@/hooks/use-pagination";
import { TablePagination } from "@/components/table-pagination";

type AccountColKey = "name" | "location" | "phone" | "industry" | "email" | "owner" | "contacts" | "deals";
const ACCOUNT_TOGGLEABLE_COLS = [
  { key: "name" as const, label: "Account Name" },
  { key: "location" as const, label: "Location" },
  { key: "phone" as const, label: "Phone" },
  { key: "industry" as const, label: "Industry" },
  { key: "email" as const, label: "Email" },
  { key: "owner" as const, label: "Account Owner" },
  { key: "contacts" as const, label: "Contacts" },
  { key: "deals" as const, label: "Deals" },
];

interface AccountFormData {
  name: string;
  industry: string;
  website: string;
  phone: string;
  email: string;
  city: string;
  country: string;
  employees: string;
  annualRevenue: string;
  description: string;
  status: string;
  stage: string;
  amount: string;
  closeDate: string;
  probability: string;
  forecastCategory: string;
  nextStep: string;
  optyOwner: string;
  optyTeam: string;
}

const defaultFormData: AccountFormData = {
  name: "", industry: "", website: "", phone: "", email: "",
  city: "", country: "", employees: "", annualRevenue: "",
  description: "", status: "active", stage: "", amount: "",
  closeDate: "", probability: "", forecastCategory: "",
  nextStep: "", optyOwner: "", optyTeam: "",
};

const INDUSTRY_OPTIONS = [
  "Technology", "Finance", "Healthcare", "Manufacturing",
  "Retail", "Education", "Real Estate", "Other",
];

const VIEW_OPTIONS = [
  { label: "All Accounts", value: "all" },
  { label: "My Accounts", value: "my" },
  { label: "Recently Created", value: "recent" },
];

export default function Accounts() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [industryFilter, setIndustryFilter] = useState("");
  const [activeView, setActiveView] = useState(VIEW_OPTIONS[0]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<{ id: number } & AccountFormData | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const colVis = useColumnVisibility<AccountColKey>("col-visibility:accounts:v1", ACCOUNT_TOGGLEABLE_COLS);
  const accountColSpan = colVis.visible.size + 1;
  const { data, isLoading } = useListAccounts({ search, limit: 100 });

  const allAccounts = data?.data ?? [];

  const filteredAccounts = allAccounts.filter((acc) => {
    if (industryFilter && acc.industry !== industryFilter) return false;
    if (activeView.value === "my") return acc.ownerId === user?.id;
    return true;
  });

  const total = filteredAccounts.length;
  const accountsPagination = usePagination("accounts", filteredAccounts);

  const handleExport = () => {
    const headers = ["Account Name", "Industry", "Location", "Phone", "Email", "Owner", "Contacts", "Deals"];
    const rows = filteredAccounts.map((a) => [
      a.name,
      a.industry ?? "",
      a.city ? `${a.city}, ${a.country ?? ""}` : "",
      a.phone ?? "",
      a.email ?? "",
      a.ownerName ?? "",
      String(a.contactCount ?? 0),
      String(a.dealCount ?? 0),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "accounts.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Layout>
      <div className="flex flex-col gap-0">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-foreground">Accounts</h1>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors border-b border-primary/40 pb-0.5">
                  {activeView.label}
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-52">
                {VIEW_OPTIONS.map((v) => (
                  <DropdownMenuItem
                    key={v.value}
                    onClick={() => setActiveView(v)}
                    className={`cursor-pointer text-sm ${activeView.value === v.value ? "text-primary font-medium" : ""}`}
                  >
                    {v.label}
                    {v.value === "all" && <span className="ml-auto text-xs text-muted-foreground">Pinned</span>}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="relative flex-shrink-0">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-muted-foreground" />
              <Input
                placeholder="Search accounts..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-xs w-60 bg-card border-border"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                  <Filter className="w-3.5 h-3.5" />
                  {industryFilter ? industryFilter : "Industry"}
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-44">
                <DropdownMenuItem onClick={() => setIndustryFilter("")} className="text-sm cursor-pointer">
                  All Industries
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {INDUSTRY_OPTIONS.map((ind) => (
                  <DropdownMenuItem
                    key={ind}
                    onClick={() => setIndustryFilter(ind)}
                    className={`text-sm cursor-pointer ${industryFilter === ind ? "text-primary font-medium" : ""}`}
                  >
                    {ind}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={handleExport}>
              <Download className="w-3.5 h-3.5" /> Export
            </Button>
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5">
              <Upload className="w-3.5 h-3.5" /> Import
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
              onClick={() => setIsCreateOpen(true)}
            >
              <Plus className="w-3.5 h-3.5" /> New
            </Button>
          </div>
        </div>

        <AISummary entityType="accounts" />

        {/* Toolbar */}
        <div className="flex items-center gap-2 mb-2">
          <div className="flex-1" />
          <TablePagination
            variant="inline"
            page={accountsPagination.page}
            totalPages={accountsPagination.totalPages}
            pageSize={accountsPagination.pageSize}
            total={accountsPagination.total}
            pageStart={accountsPagination.pageStart}
            pageEnd={accountsPagination.pageEnd}
            onPageChange={accountsPagination.setPage}
            onPageSizeChange={accountsPagination.setPageSize}
          />
          <ColumnsMenu columns={ACCOUNT_TOGGLEABLE_COLS} isVisible={colVis.isVisible} toggle={colVis.toggle} showAll={colVis.showAll} />
          <span className="text-xs text-muted-foreground">{total} account{total !== 1 ? "s" : ""}</span>
        </div>

        {/* Table */}
        <div className="bg-card border-2 border-blue-700 dark:border-blue-800 rounded-md overflow-hidden shadow-sm">
          <div className="overflow-auto max-h-[calc(100vh-260px)]">
            <table className="w-full text-sm min-w-[900px]">
              <thead className="sticky top-0 z-10">
                <tr className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800 border-b border-blue-800 [&_th]:text-white [&_th]:uppercase [&_th]:tracking-wide divide-x divide-blue-500/40">
                  {colVis.isVisible("name") && <th className="px-3 py-1 text-left text-xs font-semibold">Account Name</th>}
                  {colVis.isVisible("location") && <th className="px-3 py-1 text-left text-xs font-semibold">Location</th>}
                  {colVis.isVisible("phone") && <th className="px-3 py-1 text-left text-xs font-semibold">Phone</th>}
                  {colVis.isVisible("industry") && <th className="px-3 py-1 text-left text-xs font-semibold">Industry</th>}
                  {colVis.isVisible("email") && <th className="px-3 py-1 text-left text-xs font-semibold">Email</th>}
                  {colVis.isVisible("owner") && <th className="px-3 py-1 text-left text-xs font-semibold">Account Owner</th>}
                  {colVis.isVisible("contacts") && <th className="px-3 py-1 text-center text-xs font-semibold">Contacts</th>}
                  {colVis.isVisible("deals") && <th className="px-3 py-1 text-center text-xs font-semibold">Deals</th>}
                  <th className="px-3 py-1 text-center text-xs font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={accountColSpan} className="px-4 py-8 text-center text-muted-foreground text-sm">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                        Loading accounts...
                      </div>
                    </td>
                  </tr>
                ) : filteredAccounts.length === 0 ? (
                  <tr>
                    <td colSpan={accountColSpan} className="px-4 py-12 text-center">
                      <div className="text-muted-foreground text-sm mb-3">No accounts found.</div>
                      <Button size="sm" onClick={() => setIsCreateOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                        <Plus className="w-3.5 h-3.5 mr-1.5" /> Create your first account
                      </Button>
                    </td>
                  </tr>
                ) : (
                  accountsPagination.paged.map((acc) => (
                    <tr key={acc.id} className="hover:bg-muted/30 transition-colors group">
                      {colVis.isVisible("name") && (
                        <td className="px-3 py-1">
                          <Link href={`/accounts/${acc.id}`}>
                            <div className="font-medium text-primary hover:text-primary/80 cursor-pointer flex items-center gap-1">
                              {acc.name}
                              <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity" />
                            </div>
                          </Link>
                        </td>
                      )}
                      {colVis.isVisible("location") && (
                        <td className="px-3 py-1 text-xs text-muted-foreground">
                          {acc.city ? (
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 flex-shrink-0" />
                              {acc.city}{acc.country ? `, ${acc.country}` : ""}
                            </div>
                          ) : <span>—</span>}
                        </td>
                      )}
                      {colVis.isVisible("phone") && (
                        <td className="px-3 py-1 text-xs text-foreground">
                          {acc.phone ? (
                            <div className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                              {acc.phone}
                            </div>
                          ) : <span className="text-muted-foreground">—</span>}
                        </td>
                      )}
                      {colVis.isVisible("industry") && (
                        <td className="px-3 py-1 text-xs text-foreground">
                          {acc.industry ?? <span className="text-muted-foreground">—</span>}
                        </td>
                      )}
                      {colVis.isVisible("email") && (
                        <td className="px-3 py-1 text-xs text-foreground">
                          {acc.email ? (
                            <div className="flex items-center gap-1">
                              <Mail className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                              <span className="truncate max-w-[140px]">{acc.email}</span>
                            </div>
                          ) : <span className="text-muted-foreground">—</span>}
                        </td>
                      )}
                      {colVis.isVisible("owner") && (
                        <td className="px-3 py-1 text-xs text-foreground">
                          {acc.ownerName ? (
                            <div className="flex items-center gap-1">
                              <User className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                              {acc.ownerName}
                            </div>
                          ) : <span className="text-muted-foreground italic">Unassigned</span>}
                        </td>
                      )}
                      {colVis.isVisible("contacts") && (
                        <td className="px-3 py-1 text-center">
                          <span className="inline-flex items-center gap-1 bg-muted/50 px-2 py-0.5 rounded text-xs font-medium text-foreground">
                            <Users className="w-3 h-3 text-muted-foreground" /> {acc.contactCount ?? 0}
                          </span>
                        </td>
                      )}
                      {colVis.isVisible("deals") && (
                        <td className="px-3 py-1 text-center">
                          <span className="inline-flex items-center gap-1 bg-primary/10 px-2 py-0.5 rounded text-xs font-medium text-primary border border-primary/20">
                            <Briefcase className="w-3 h-3" /> {acc.dealCount ?? 0}
                          </span>
                        </td>
                      )}
                      <td className="px-3 py-1">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-1.5 text-xs gap-1 text-muted-foreground hover:text-foreground"
                            onClick={() => setEditingAccount({
                              id: acc.id,
                              name: acc.name,
                              industry: acc.industry ?? "",
                              website: acc.website ?? "",
                              phone: acc.phone ?? "",
                              email: acc.email ?? "",
                              city: acc.city ?? "",
                              country: acc.country ?? "",
                              employees: acc.employees != null ? String(acc.employees) : "",
                              annualRevenue: acc.annualRevenue != null ? String(acc.annualRevenue) : "",
                              description: acc.description ?? "",
                              status: acc.status ?? "active",
                              stage: acc.stage ?? "",
                              amount: acc.amount != null ? String(acc.amount) : "",
                              closeDate: acc.closeDate ?? "",
                              probability: acc.probability != null ? String(acc.probability) : "",
                              forecastCategory: acc.forecastCategory ?? "",
                              nextStep: acc.nextStep ?? "",
                              optyOwner: acc.optyOwner ?? "",
                              optyTeam: acc.optyTeam ?? "",
                            })}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            Edit
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground" aria-label={`More actions for ${acc.name}`}>
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuItem asChild>
                                <Link href={`/accounts/${acc.id}`} className="flex items-center gap-2 cursor-pointer text-sm">
                                  <ExternalLink className="w-3.5 h-3.5" /> View
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setEditingAccount({
                                  id: acc.id,
                                  name: acc.name,
                                  industry: acc.industry ?? "",
                                  website: acc.website ?? "",
                                  phone: acc.phone ?? "",
                                  email: acc.email ?? "",
                                  city: acc.city ?? "",
                                  country: acc.country ?? "",
                                  employees: acc.employees != null ? String(acc.employees) : "",
                                  annualRevenue: acc.annualRevenue != null ? String(acc.annualRevenue) : "",
                                  description: acc.description ?? "",
                                  status: acc.status ?? "active",
                                  stage: acc.stage ?? "",
                                  amount: acc.amount != null ? String(acc.amount) : "",
                                  closeDate: acc.closeDate ?? "",
                                  probability: acc.probability != null ? String(acc.probability) : "",
                                  forecastCategory: acc.forecastCategory ?? "",
                                  nextStep: acc.nextStep ?? "",
                                  optyOwner: acc.optyOwner ?? "",
                                  optyTeam: acc.optyTeam ?? "",
                                })}
                                className="cursor-pointer text-sm"
                              >
                                <Pencil className="w-3.5 h-3.5 mr-2 text-muted-foreground" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setDeletingId(acc.id)}
                                className="cursor-pointer text-sm text-destructive focus:text-destructive"
                              >
                                <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {false && filteredAccounts.length > 0 && (
            <div className="px-3 py-1 border-t border-border bg-muted/20 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{total} record{total !== 1 ? "s" : ""}</span>
              <span className="text-xs text-muted-foreground">Showing all {total} accounts</span>
            </div>
          )}
        </div>
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
      email: formData.email || undefined,
      city: formData.city || undefined,
      country: formData.country || undefined,
      employees: formData.employees ? parseInt(formData.employees) : undefined,
      annualRevenue: formData.annualRevenue ? parseFloat(formData.annualRevenue) : undefined,
      description: formData.description || undefined,
      status: formData.status || undefined,
      stage: formData.stage || undefined,
      amount: formData.amount ? parseFloat(formData.amount) : undefined,
      closeDate: formData.closeDate || undefined,
      probability: formData.probability ? parseInt(formData.probability) : undefined,
      forecastCategory: formData.forecastCategory || undefined,
      nextStep: formData.nextStep || undefined,
      optyOwner: formData.optyOwner || undefined,
      optyTeam: formData.optyTeam || undefined,
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
  const sc = "w-full bg-card border border-border rounded-md px-3 py-1 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b border-border pb-3">
          <DialogTitle className="text-base font-semibold">
            {mode === "create" ? "New Account" : "Edit Account"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Account Name *</Label>
            <Input required className="h-8 text-sm" value={formData.name} onChange={f("name")} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Industry</Label>
            <select className={sc} value={formData.industry} onChange={f("industry")}>
              <option value="">Select industry</option>
              {INDUSTRY_OPTIONS.map((ind) => <option key={ind} value={ind}>{ind}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Email</Label>
              <Input type="email" className="h-8 text-sm" placeholder="account@company.com" value={formData.email} onChange={f("email")} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Phone</Label>
              <Input className="h-8 text-sm" value={formData.phone} onChange={f("phone")} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Website</Label>
              <Input className="h-8 text-sm" placeholder="https://" value={formData.website} onChange={f("website")} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">City</Label>
              <Input className="h-8 text-sm" value={formData.city} onChange={f("city")} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Country</Label>
              <Input className="h-8 text-sm" value={formData.country} onChange={f("country")} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Employees</Label>
              <Input type="number" className="h-8 text-sm" value={formData.employees} onChange={f("employees")} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Annual Revenue (£)</Label>
            <Input type="number" className="h-8 text-sm" value={formData.annualRevenue} onChange={f("annualRevenue")} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Description</Label>
            <Input className="h-8 text-sm" value={formData.description} onChange={f("description")} placeholder="Account description..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Status</Label>
              <select className={sc} value={formData.status} onChange={f("status")}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="prospect">Prospect</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Stage</Label>
              <Input className="h-8 text-sm" value={formData.stage} onChange={f("stage")} placeholder="e.g., Growth" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Amount (£)</Label>
              <Input type="number" className="h-8 text-sm" value={formData.amount} onChange={f("amount")} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Close Date</Label>
              <Input type="date" className="h-8 text-sm" value={formData.closeDate} onChange={f("closeDate")} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Probability (%)</Label>
              <Input type="number" min="0" max="100" className="h-8 text-sm" value={formData.probability} onChange={f("probability")} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Forecast Category</Label>
              <select className={sc} value={formData.forecastCategory} onChange={f("forecastCategory")}>
                <option value="">Select category</option>
                <option value="pipeline">Pipeline</option>
                <option value="best_case">Best Case</option>
                <option value="commit">Commit</option>
                <option value="closed">Closed</option>
                <option value="omitted">Omitted</option>
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Next Step</Label>
            <Input className="h-8 text-sm" value={formData.nextStep} onChange={f("nextStep")} placeholder="e.g., Schedule demo" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Opty Owner</Label>
              <Input className="h-8 text-sm" value={formData.optyOwner} onChange={f("optyOwner")} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Opty Team</Label>
              <Input className="h-8 text-sm" value={formData.optyTeam} onChange={f("optyTeam")} />
            </div>
          </div>
          <DialogFooter className="pt-2 border-t border-border gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" size="sm" disabled={isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground">
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
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Account?</AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground">
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
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
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          >
            {deleteMutation.isPending ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
