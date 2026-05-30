import React, { useState } from "react";
import { useColResize } from "@/hooks/use-col-resize";
import { ColResizeHandle } from "@/components/col-resize-handle";
import {
  useListContacts,
  useCreateContact,
  useUpdateContact,
  useDeleteContact,
  getListContactsQueryKey,
  useListAccounts,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { AISummary } from "@/components/ai-summary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Search, Plus, Mail, Phone, Building2, MoreHorizontal, Pencil, Trash2, ExternalLink } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useColumnVisibility } from "@/hooks/use-column-visibility";
import { ColumnsMenu } from "@/components/columns-menu";
import { usePagination } from "@/hooks/use-pagination";
import { TablePagination } from "@/components/table-pagination";

const CONTACT_TOGGLEABLE_COLS = [
  { key: "name" as const, label: "Name" },
  { key: "contactInfo" as const, label: "Contact Info" },
  { key: "account" as const, label: "Account / Title" },
  { key: "owner" as const, label: "Owner" },
];

interface ContactFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  title: string;
  accountId: string;
}

const defaultFormData: ContactFormData = {
  firstName: "", lastName: "", email: "", phone: "", title: "", accountId: "",
};

const CONTACTS_COL_KEYS = ["name","contactInfo","account","owner","actions"] as const;
const CONTACTS_COL_DEFAULTS: Record<typeof CONTACTS_COL_KEYS[number], number> = {"name":180,"contactInfo":240,"account":200,"owner":140,"actions":120};

export default function Contacts() {
  const { widths: colWidths, startResize: startColResize } = useColResize("col-widths:contacts:v1", CONTACTS_COL_KEYS, CONTACTS_COL_DEFAULTS);
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<{ id: number } & ContactFormData | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const { data, isLoading } = useListContacts({ search, limit: 50 });
  const allContacts = data?.data ?? [];
  const contactsPagination = usePagination("contacts", allContacts);
  const colVis = useColumnVisibility<"name" | "contactInfo" | "account" | "owner">("col-visibility:contacts:v1", CONTACT_TOGGLEABLE_COLS);
  const contactColSpan = colVis.visible.size + 1;

  return (
    <Layout>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground tracking-tight">Contacts</h1>
            <p className="text-muted-foreground mt-1 text-sm">Manage your customer relationships and personnel.</p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
              <Input
                placeholder="Search contacts..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-card border-border"
              />
            </div>
            <Button
              onClick={() => setIsCreateOpen(true)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground hover:shadow-primary/40 hover:-translate-y-0.5 transition-all"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Contact
            </Button>
          </div>
        </div>

        <AISummary entityType="contacts" />

        <Card className="glass-panel border-0 overflow-hidden">
          <div className="px-3 py-1 border-b border-border bg-muted/20 flex items-center justify-end">
            <TablePagination
              variant="inline"
              page={contactsPagination.page}
              totalPages={contactsPagination.totalPages}
              pageSize={contactsPagination.pageSize}
              total={contactsPagination.total}
              pageStart={contactsPagination.pageStart}
              pageEnd={contactsPagination.pageEnd}
              onPageChange={contactsPagination.setPage}
              onPageSizeChange={contactsPagination.setPageSize}
            />
            <ColumnsMenu columns={CONTACT_TOGGLEABLE_COLS} isVisible={colVis.isVisible} toggle={colVis.toggle} showAll={colVis.showAll} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left [&_tbody_td]:whitespace-nowrap">
              <colgroup>
                {colVis.isVisible("name") && <col data-col="name" style={{ width: `${colWidths.name}px` }} />}
                {colVis.isVisible("contactInfo") && <col data-col="contactInfo" style={{ width: `${colWidths.contactInfo}px` }} />}
                {colVis.isVisible("account") && <col data-col="account" style={{ width: `${colWidths.account}px` }} />}
                {colVis.isVisible("owner") && <col data-col="owner" style={{ width: `${colWidths.owner}px` }} />}
                <col data-col="actions" style={{ width: `${colWidths.actions}px` }} />
              </colgroup>
              <thead className="sticky top-0 z-10">
                <tr className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800 border-b border-blue-800 divide-x divide-blue-500/40">
                  {colVis.isVisible("name") && <th className="relative px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-white leading-tight whitespace-nowrap">Name<ColResizeHandle onMouseDown={startColResize("name")} /></th>}
                  {colVis.isVisible("contactInfo") && <th className="relative px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-white leading-tight whitespace-nowrap">Contact Info<ColResizeHandle onMouseDown={startColResize("contactInfo")} /></th>}
                  {colVis.isVisible("account") && <th className="relative px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-white leading-tight whitespace-nowrap">Account / Title<ColResizeHandle onMouseDown={startColResize("account")} /></th>}
                  {colVis.isVisible("owner") && <th className="relative px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-white leading-tight whitespace-nowrap">Owner<ColResizeHandle onMouseDown={startColResize("owner")} /></th>}
                  <th className="relative px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-white leading-tight whitespace-nowrap text-right">Actions<ColResizeHandle onMouseDown={startColResize("actions")} /></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-3 py-1" colSpan={contactColSpan}>
                        <div className="h-8 bg-muted/50 rounded animate-pulse w-full" />
                      </td>
                    </tr>
                  ))
                ) : data?.data?.length === 0 ? (
                  <tr>
                    <td colSpan={contactColSpan} className="px-6 py-12 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                          <Search className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <p>No contacts found.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  contactsPagination.paged.map((contact) => (
                    <tr key={contact.id} className="hover:bg-muted/50 transition-colors group">
                      {colVis.isVisible("name") && (
                        <td className="px-3 py-1">
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs border border-primary/30">
                              {contact.firstName[0]}{contact.lastName[0]}
                            </div>
                            <div>
                              <Link href={`/contacts/${contact.id}`}>
                                <div className="font-medium text-foreground hover:text-primary transition-colors cursor-pointer flex items-center gap-1 group/link">
                                  {contact.firstName} {contact.lastName}
                                  <ExternalLink className="w-3 h-3 opacity-0 group-hover/link:opacity-60 transition-opacity" />
                                </div>
                              </Link>
                            </div>
                          </div>
                        </td>
                      )}
                      {colVis.isVisible("contactInfo") && (
                        <td className="px-3 py-1">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Mail className="w-3.5 h-3.5" />
                              <span className="truncate max-w-[150px]">{contact.email ?? "-"}</span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Phone className="w-3.5 h-3.5" />
                              <span>{contact.phone ?? "-"}</span>
                            </div>
                          </div>
                        </td>
                      )}
                      {colVis.isVisible("account") && (
                        <td className="px-3 py-1">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2 font-medium text-foreground">
                              <Building2 className="w-3.5 h-3.5 text-primary" />
                              {contact.accountName ?? <span className="text-muted-foreground font-normal">No Account</span>}
                            </div>
                            <div className="text-xs text-muted-foreground ml-5">{contact.title ?? "-"}</div>
                          </div>
                        </td>
                      )}
                      {colVis.isVisible("owner") && (
                        <td className="px-3 py-1 text-muted-foreground">{contact.ownerName ?? "-"}</td>
                      )}
                      <td className="px-3 py-1 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-card border-border text-foreground">
                            <DropdownMenuItem
                              onClick={() => setEditingContact({
                                id: contact.id,
                                firstName: contact.firstName,
                                lastName: contact.lastName,
                                email: contact.email ?? "",
                                phone: contact.phone ?? "",
                                title: contact.title ?? "",
                                accountId: contact.accountId?.toString() ?? "",
                              })}
                              className="cursor-pointer hover:bg-muted"
                            >
                              <Pencil className="w-4 h-4 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-muted" />
                            <DropdownMenuItem
                              onClick={() => setDeletingId(contact.id)}
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
          </div>        </Card>
      </div>

      <ContactFormDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        mode="create"
      />
      <ContactFormDialog
        open={!!editingContact}
        onOpenChange={(o) => { if (!o) setEditingContact(null); }}
        mode="edit"
        initialData={editingContact ?? undefined}
      />
      <DeleteConfirmDialog
        open={deletingId !== null}
        onOpenChange={(o) => { if (!o) setDeletingId(null); }}
        id={deletingId}
        entityName="contact"
      />
    </Layout>
  );
}

export function ContactFormDialog({
  open, onOpenChange, mode, initialData, lockedAccountId, onSaved,
  showPrimaryContactOption = false,
  primaryContactLabel = "Set as primary contact",
  defaultPrimary = false,
  primaryContactHint,
  primaryContactCheckboxDisabled = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  initialData?: { id: number } & ContactFormData;
  lockedAccountId?: number;
  onSaved?: (saved: { id: number; isPrimary: boolean }) => void;
  showPrimaryContactOption?: boolean;
  primaryContactLabel?: string;
  defaultPrimary?: boolean;
  primaryContactHint?: string;
  primaryContactCheckboxDisabled?: boolean;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createMutation = useCreateContact();
  const updateMutation = useUpdateContact();
  const [formData, setFormData] = useState<ContactFormData>(initialData ?? defaultFormData);
  const [isPrimary, setIsPrimary] = useState<boolean>(defaultPrimary);

  React.useEffect(() => {
    if (open) {
      const base = initialData ?? defaultFormData;
      setFormData(lockedAccountId != null && !initialData ? { ...base, accountId: String(lockedAccountId) } : base);
      setIsPrimary(defaultPrimary);
    }
  }, [open, initialData, lockedAccountId, defaultPrimary]);

  const { data: accountsData } = useListAccounts({ limit: 100 });
  const accounts = accountsData?.data ?? [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const invalidate = () => queryClient.invalidateQueries({ queryKey: getListContactsQueryKey() });
    const effectiveAccountId = lockedAccountId != null ? lockedAccountId : (formData.accountId ? parseInt(formData.accountId) : undefined);
    const payload = {
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email || undefined,
      phone: formData.phone || undefined,
      title: formData.title || undefined,
      accountId: effectiveAccountId,
    };
    if (mode === "create") {
      createMutation.mutate({ data: payload }, {
        onSuccess: (created) => {
          toast({ title: "Contact created", description: "The contact has been added successfully." });
          invalidate();
          onSaved?.({ id: created.id, isPrimary });
          onOpenChange(false);
        },
        onError: () => toast({ title: "Error", description: "Failed to create contact.", variant: "destructive" }),
      });
    } else if (initialData) {
      updateMutation.mutate({ id: initialData.id, data: payload }, {
        onSuccess: () => {
          toast({ title: "Contact updated", description: "Changes saved successfully." });
          invalidate();
          onSaved?.({ id: initialData.id, isPrimary });
          onOpenChange(false);
        },
        onError: () => toast({ title: "Error", description: "Failed to update contact.", variant: "destructive" }),
      });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-card border-border text-foreground shadow-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {mode === "create" ? "Create New Contact" : "Edit Contact"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input id="firstName" required className="bg-muted border-border" value={formData.firstName} onChange={e => setFormData({ ...formData, firstName: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input id="lastName" required className="bg-muted border-border" value={formData.lastName} onChange={e => setFormData({ ...formData, lastName: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" className="bg-muted border-border" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" className="bg-muted border-border" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Job Title</Label>
              <Input id="title" className="bg-muted border-border" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accountId">Account</Label>
              <select
                id="accountId"
                disabled={lockedAccountId != null}
                className="w-full h-8 px-3 rounded-md bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60 disabled:cursor-not-allowed"
                value={lockedAccountId != null ? String(lockedAccountId) : formData.accountId}
                onChange={e => setFormData({ ...formData, accountId: e.target.value })}
              >
                {lockedAccountId == null && <option value="">No account</option>}
                {(accounts as Array<{ id: number; name: string }>).map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
              {lockedAccountId != null && (
                <p className="text-[11px] text-muted-foreground">Locked to this opportunity's account.</p>
              )}
            </div>
          </div>
          {showPrimaryContactOption && (
            <div className="pt-1">
              <div className="flex items-center gap-2">
                <input
                  id="isPrimaryContact"
                  type="checkbox"
                  checked={isPrimary}
                  disabled={primaryContactCheckboxDisabled}
                  onChange={(e) => setIsPrimary(e.target.checked)}
                  className="h-4 w-4 rounded border-border accent-primary cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                />
                <Label
                  htmlFor="isPrimaryContact"
                  className={`text-sm font-normal ${primaryContactCheckboxDisabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
                >
                  {primaryContactLabel}
                </Label>
              </div>
              {primaryContactHint && (
                <p className="text-[11px] text-muted-foreground mt-1 ml-6">{primaryContactHint}</p>
              )}
            </div>
          )}
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="border-border">Cancel</Button>
            <Button type="submit" disabled={isPending} className="bg-primary hover:bg-primary/90 text-foreground">
              {isPending ? "Saving..." : mode === "create" ? "Create Contact" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteConfirmDialog({
  open, onOpenChange, id, entityName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  id: number | null;
  entityName: string;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const deleteMutation = useDeleteContact();

  const handleDelete = () => {
    if (id === null) return;
    deleteMutation.mutate({ id }, {
      onSuccess: () => {
        toast({ title: `${entityName} deleted`, description: "The record has been permanently removed." });
        queryClient.invalidateQueries({ queryKey: getListContactsQueryKey() });
        onOpenChange(false);
      },
      onError: () => toast({ title: "Error", description: `Failed to delete ${entityName}.`, variant: "destructive" }),
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-card border-border text-foreground">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {entityName}?</AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground">
            This action cannot be undone. The {entityName} will be permanently deleted.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="border-border text-foreground hover:bg-muted">Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive hover:bg-destructive/90 text-foreground"
          >
            {deleteMutation.isPending ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
