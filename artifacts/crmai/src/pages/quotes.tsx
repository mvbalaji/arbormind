import React, { useState } from "react";
import {
  useListQuotes, useCreateQuote, useUpdateQuote, useDeleteQuote, useListProducts,
  getListQuotesQueryKey,
  CreateQuoteInputStatus,
  type CreateQuoteInput, type CreateQuoteItemInput,
} from "@workspace/api-client-react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FileText, Plus, MoreHorizontal, Pencil, Trash2, X, Package, Download, ChevronUp, ChevronDown, Settings, RefreshCw, ArrowUpDown, Filter, Search, Copy, ChevronsUpDown, Check } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { useListAccounts } from "@workspace/api-client-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { AISummary } from "@/components/ai-summary";
import { formatDistanceToNow } from "date-fns";
import { useColumnVisibility } from "@/hooks/use-column-visibility";
import { ColumnsMenu } from "@/components/columns-menu";
import { ApprovalWarning } from "@/components/approval-warning";
import { usePagination } from "@/hooks/use-pagination";
import { TablePagination } from "@/components/table-pagination";

type QuoteColKey = "quoteNumber" | "name" | "revision" | "clonedFrom" | "validUntil" | "subtotal" | "total" | "createdBy";
const QUOTE_TOGGLEABLE_COLS = [
  { key: "quoteNumber" as const, label: "Quote Number" },
  { key: "name" as const, label: "Quote Name" },
  { key: "revision" as const, label: "Revision" },
  { key: "clonedFrom" as const, label: "Cloned From" },
  { key: "validUntil" as const, label: "Expiration Date" },
  { key: "subtotal" as const, label: "Subtotal" },
  { key: "total" as const, label: "Total Price" },
  { key: "createdBy" as const, label: "Created By" },
];

const STATUS_COLORS: Record<string, string> = {
  draft: "border-border text-muted-foreground",
  sent: "border-blue-500/30 text-blue-600 bg-blue-500/5",
  accepted: "border-green-500/30 text-green-600 bg-green-500/5",
  rejected: "border-red-500/30 text-red-600 bg-red-500/5",
  expired: "border-orange-500/30 text-orange-600 bg-orange-500/5",
};

interface QuoteItem {
  productId: number | null;
  productName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
}

interface QuoteFormData {
  name: string;
  status: string;
  validUntil: string;
  discount: string;
  tax: string;
  notes: string;
  items: QuoteItem[];
}

const DEFAULT_FORM: QuoteFormData = {
  name: "", status: "draft", validUntil: "", discount: "0", tax: "0", notes: "", items: [],
};

const DEFAULT_ITEM: QuoteItem = { productId: null, productName: "", quantity: 1, unitPrice: 0, discount: 0 };

interface QuoteFormDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: "create" | "edit";
  initialData?: { id: number } & QuoteFormData;
}

function QuoteFormDialog({ open, onOpenChange, mode, initialData }: QuoteFormDialogProps) {
  const [formData, setFormData] = useState<QuoteFormData>(initialData ?? DEFAULT_FORM);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createMutation = useCreateQuote();
  const updateMutation = useUpdateQuote();
  const { data: productsData } = useListProducts({ limit: 200 });
  const products = productsData?.data ?? [];
  const isPending = createMutation.isPending || updateMutation.isPending;

  React.useEffect(() => {
    if (open) setFormData(initialData ?? DEFAULT_FORM);
  }, [open, initialData]);

  const lineTotal = (item: QuoteItem) => item.quantity * item.unitPrice * (1 - (item.discount ?? 0) / 100);
  const subtotal = formData.items.reduce((sum, item) => sum + lineTotal(item), 0);
  const discountAmt = subtotal * (parseFloat(formData.discount) || 0) / 100;
  const taxAmt = (subtotal - discountAmt) * (parseFloat(formData.tax) || 0) / 100;
  const total = subtotal - discountAmt + taxAmt;

  const addItem = () => setFormData(d => ({ ...d, items: [...d.items, { ...DEFAULT_ITEM }] }));

  const removeItem = (idx: number) =>
    setFormData(d => ({ ...d, items: d.items.filter((_, i) => i !== idx) }));

  const updateItem = (idx: number, changes: Partial<QuoteItem>) =>
    setFormData(d => ({
      ...d,
      items: d.items.map((item, i) => i === idx ? { ...item, ...changes } : item),
    }));

  const pickProduct = (idx: number, productId: number) => {
    const prod = products.find(p => p.id === productId);
    if (prod) {
      updateItem(idx, { productId: prod.id, productName: prod.name, unitPrice: prod.unitPrice, discount: 0 });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    const items: CreateQuoteItemInput[] = formData.items
      .filter(it => it.productName)
      .map(it => ({
        productId: it.productId || null,
        productName: it.productName,
        quantity: it.quantity || 1,
        unitPrice: it.unitPrice || 0,
        discount: it.discount || 0,
      }));

    const payload: CreateQuoteInput = {
      name: formData.name,
      status: formData.status as CreateQuoteInputStatus,
      validUntil: formData.validUntil || null,
      discount: parseFloat(formData.discount) || 0,
      tax: parseFloat(formData.tax) || 0,
      notes: formData.notes || null,
      items,
    };

    try {
      if (mode === "create") {
        await createMutation.mutateAsync({ data: payload });
        toast({ title: "Quote created", description: `${formData.name} has been created.` });
      } else if (initialData) {
        await updateMutation.mutateAsync({ id: initialData.id, data: payload });
        toast({ title: "Quote updated" });
      }
      await queryClient.invalidateQueries({ queryKey: getListQuotesQueryKey() });
      onOpenChange(false);
    } catch {
      toast({ title: "Error", description: "Could not save quote.", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border text-foreground max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Create Quote" : "Edit Quote"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          {/* Header fields */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2 col-span-2">
              <Label htmlFor="q-name">Quote Name *</Label>
              <Input id="q-name" required className="bg-muted border-border"
                value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="q-status">Status</Label>
              <select
                id="q-status"
                className="w-full h-10 px-3 rounded-md bg-muted border border-border text-foreground text-sm"
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value })}
              >
                {Object.keys(CreateQuoteInputStatus).map(s => (
                  <option key={s} value={s} className="bg-card capitalize">{s}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="q-valid">Valid Until</Label>
              <Input id="q-valid" type="date" className="bg-muted border-border"
                value={formData.validUntil} onChange={e => setFormData({ ...formData, validUntil: e.target.value })} />
            </div>
          </div>

          {/* Line Items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-sm font-semibold">Line Items</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem} className="border-border text-xs">
                <Plus className="w-3 h-3 mr-1" /> Add Item
              </Button>
            </div>

            {formData.items.length === 0 ? (
              <div
                className="border border-dashed border-border rounded-lg p-6 text-center text-muted-foreground text-sm cursor-pointer hover:border-primary/30 transition-colors"
                onClick={addItem}
              >
                <Package className="w-6 h-6 mx-auto mb-2 opacity-40" />
                Click "Add Item" or here to add products to this quote
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-12 gap-2 text-xs text-muted-foreground uppercase px-1 mb-1">
                  <span className="col-span-4">Product</span>
                  <span className="col-span-2 text-right">Qty</span>
                  <span className="col-span-2 text-right">Unit Price</span>
                  <span className="col-span-2 text-right">Disc %</span>
                  <span className="col-span-1 text-right">Total</span>
                  <span className="col-span-1"></span>
                </div>
                {formData.items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-muted/50 rounded-lg p-2">
                    <div className="col-span-4">
                      <select
                        className="w-full h-8 px-2 rounded-md bg-muted border border-border text-foreground text-sm"
                        value={item.productId ?? ""}
                        onChange={e => {
                          const val = e.target.value;
                          if (val === "") {
                            updateItem(idx, { productId: null, productName: "", unitPrice: 0 });
                          } else {
                            pickProduct(idx, parseInt(val));
                          }
                        }}
                      >
                        <option value="" className="bg-card">Custom / No product</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id} className="bg-card">{p.name}</option>
                        ))}
                      </select>
                      {!item.productId && (
                        <Input
                          className="mt-1 h-7 text-xs bg-muted border-border"
                          placeholder="Product name..."
                          value={item.productName}
                          onChange={e => updateItem(idx, { productName: e.target.value })}
                        />
                      )}
                    </div>
                    <div className="col-span-2">
                      <Input type="number" min="1" className="h-8 bg-muted border-border text-right text-sm"
                        value={item.quantity}
                        onChange={e => updateItem(idx, { quantity: parseFloat(e.target.value) || 1 })} />
                    </div>
                    <div className="col-span-2">
                      <Input type="number" min="0" step="0.01" className="h-8 bg-muted border-border text-right text-sm"
                        value={item.unitPrice}
                        onChange={e => updateItem(idx, { unitPrice: parseFloat(e.target.value) || 0 })} />
                    </div>
                    <div className="col-span-2">
                      <Input type="number" min="0" max="100" className="h-8 bg-muted border-border text-right text-sm"
                        value={item.discount}
                        onChange={e => updateItem(idx, { discount: parseFloat(e.target.value) || 0 })} />
                    </div>
                    <div className="col-span-1 text-right text-sm font-medium text-foreground">
                      ${lineTotal(item).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-600"
                        onClick={() => removeItem(idx)}>
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Totals */}
          {formData.items.length > 0 && (
            <div className="border border-border rounded-lg p-4 space-y-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Quote Discount %</Label>
                  <Input type="number" min="0" max="100" className="h-8 bg-muted border-border text-sm"
                    value={formData.discount} onChange={e => setFormData({ ...formData, discount: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Tax %</Label>
                  <Input type="number" min="0" className="h-8 bg-muted border-border text-sm"
                    value={formData.tax} onChange={e => setFormData({ ...formData, tax: e.target.value })} />
                </div>
              </div>
              <ApprovalWarning
                entity="quote"
                snapshot={{ discountPercent: parseFloat(formData.discount) || 0, total }}
              />
              <div className="border-t border-border pt-2 mt-2 space-y-1 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span><span>£{subtotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                </div>
                {discountAmt > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Discount ({formData.discount}%)</span>
                    <span>-${discountAmt.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                  </div>
                )}
                {taxAmt > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Tax ({formData.tax}%)</span>
                    <span>£{taxAmt.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-foreground text-base border-t border-border pt-1 mt-1">
                  <span>Total</span>
                  <span>£{total.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="q-notes">Notes</Label>
            <Input id="q-notes" className="bg-muted border-border"
              value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Internal notes or terms..." />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="border-border">Cancel</Button>
            <Button type="submit" disabled={isPending} className="bg-primary hover:bg-primary/90 text-foreground">
              {isPending ? "Saving..." : mode === "create" ? "Create Quote" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type SortField = "quoteNumber" | "name" | "validUntil" | "subtotal" | "total";
type SortDir = "asc" | "desc";

type CloneSource = { id: number; name: string; quoteNumber: string };

interface CloneQuoteDialogProps {
  open: boolean;
  initialSource: CloneSource | null;
  sourceQuotes: CloneSource[];
  onOpenChange: (open: boolean) => void;
}

function CloneQuoteDialog({ open, initialSource, sourceQuotes, onOpenChange }: CloneQuoteDialogProps) {
  const [source, setSource] = useState<CloneSource | null>(initialSource);
  const [sourcePickerOpen, setSourcePickerOpen] = useState(false);
  const [accountId, setAccountId] = useState<number | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: accountsData } = useListAccounts({ limit: 200 });
  const accounts = (accountsData?.data ?? []) as Array<{ id: number; name: string; industry?: string | null; city?: string | null }>;
  const selectedAccount = accounts.find((a) => a.id === accountId) ?? null;

  const { data: contactsPreview } = useQuery<{ data: Array<{ id: number; firstName: string; lastName: string; email: string | null }> }>({
    queryKey: ["clone-quote-contacts", accountId],
    queryFn: async () => {
      const res = await fetch(`/api/contacts?accountId=${accountId}&limit=10&sort=id`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!accountId,
  });

  React.useEffect(() => {
    if (open) {
      setSource(initialSource);
      setAccountId(null);
      setSourcePickerOpen(false);
      setPickerOpen(false);
      setNameInput(initialSource ? `${initialSource.name} (Copy)` : "");
    }
  }, [open, initialSource]);

  React.useEffect(() => {
    if (open && source) setNameInput((prev) => prev || `${source.name} (Copy)`);
  }, [open, source]);

  const handleClone = async () => {
    if (!source || !accountId) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/quotes/${source.id}/clone`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ accountId, name: nameInput.trim() || undefined }),
      });
      if (!res.ok) throw new Error("Failed");
      await queryClient.invalidateQueries({ queryKey: getListQuotesQueryKey() });
      toast({ title: "Quote cloned", description: `A copy of ${source.quoteNumber} was created for ${selectedAccount?.name ?? "the selected account"}.` });
      onOpenChange(false);
    } catch {
      toast({ title: "Clone failed", description: "Could not clone quote.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border text-foreground sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="w-4 h-4 text-primary" />
            Clone Quote{source ? ` ${source.quoteNumber}` : ""}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="text-sm text-muted-foreground">
            Pick the quote to clone and the target account — the account's primary contact will be auto-populated on the new quote.
          </div>
          {/* Source quote picker */}
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Source Quote *</Label>
            <Popover open={sourcePickerOpen} onOpenChange={setSourcePickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={sourcePickerOpen}
                  className="w-full h-9 justify-between bg-muted border-border text-sm font-normal"
                >
                  {source ? (
                    <span className="truncate">
                      <span className="font-mono text-xs text-muted-foreground mr-1">{source.quoteNumber}</span>
                      {source.name}
                    </span>
                  ) : (
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Search className="w-3.5 h-3.5" />
                      Search for a quote to clone…
                    </span>
                  )}
                  <ChevronsUpDown className="w-3.5 h-3.5 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]" align="start">
                <Command>
                  <CommandInput placeholder="Search by quote number or name…" />
                  <CommandList>
                    <CommandEmpty>No quote found.</CommandEmpty>
                    <CommandGroup>
                      {sourceQuotes.map((q) => (
                        <CommandItem
                          key={q.id}
                          value={`${q.quoteNumber} ${q.name}`}
                          onSelect={() => { setSource(q); setSourcePickerOpen(false); }}
                          className="flex items-center gap-2"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium truncate">{q.name}</div>
                            <div className="text-xs text-muted-foreground font-mono truncate">{q.quoteNumber}</div>
                          </div>
                          <Check className={`w-3.5 h-3.5 ${source?.id === q.id ? "opacity-100" : "opacity-0"}`} />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          {source && (
            <div className="space-y-1.5">
              <Label htmlFor="clone-quote-name" className="text-xs uppercase tracking-wide text-muted-foreground">Quote Name *</Label>
              <Input
                id="clone-quote-name"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder={`${source.name} (Copy)`}
                className="h-9 bg-muted border-border text-sm"
              />
              <p className="text-xs text-muted-foreground">Defaults to "{source.name} (Copy)" — edit to give the clone a different name.</p>
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Target Account *</Label>
            <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={pickerOpen}
                  className="w-full h-9 justify-between bg-muted border-border text-sm font-normal"
                >
                  {selectedAccount ? (
                    <span className="truncate">{selectedAccount.name}</span>
                  ) : (
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Search className="w-3.5 h-3.5" />
                      Search for an account…
                    </span>
                  )}
                  <ChevronsUpDown className="w-3.5 h-3.5 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]" align="start">
                <Command>
                  <CommandInput placeholder="Search by account name…" />
                  <CommandList>
                    <CommandEmpty>No account found.</CommandEmpty>
                    <CommandGroup>
                      {accounts.map((a) => (
                        <CommandItem
                          key={a.id}
                          value={`${a.name} ${a.industry ?? ""} ${a.city ?? ""}`}
                          onSelect={() => { setAccountId(a.id); setPickerOpen(false); }}
                          className="flex items-center gap-2"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium truncate">{a.name}</div>
                            {(a.industry || a.city) && (
                              <div className="text-xs text-muted-foreground truncate">
                                {[a.industry, a.city].filter(Boolean).join(" · ")}
                              </div>
                            )}
                          </div>
                          <Check className={`w-3.5 h-3.5 ${accountId === a.id ? "opacity-100" : "opacity-0"}`} />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          {accountId && (
            <div className="rounded-md border border-border bg-muted/30 p-3 space-y-1.5">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Auto-populated contacts</div>
              {!contactsPreview ? (
                <div className="text-sm text-muted-foreground">Loading…</div>
              ) : contactsPreview.data.length === 0 ? (
                <div className="text-sm text-muted-foreground">No contacts exist for this account — the clone will have no contact set.</div>
              ) : (
                <ul className="space-y-1">
                  {contactsPreview.data.slice(0, 5).map((c, i) => (
                    <li key={c.id} className="text-sm flex items-center gap-2">
                      <span className="font-medium">{c.firstName} {c.lastName}</span>
                      {c.email && <span className="text-muted-foreground text-xs">· {c.email}</span>}
                      {i === 0 && <Badge variant="outline" className="text-[10px] py-0">Primary</Badge>}
                    </li>
                  ))}
                  {contactsPreview.data.length > 5 && (
                    <li className="text-xs text-muted-foreground">+ {contactsPreview.data.length - 5} more</li>
                  )}
                </ul>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-border">Cancel</Button>
          <Button onClick={handleClone} disabled={!source || !accountId || !nameInput.trim() || isSubmitting} className="gap-1.5">
            <Copy className="w-3.5 h-3.5" />
            {isSubmitting ? "Cloning…" : "Clone Quote"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Quotes() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState<({ id: number } & QuoteFormData) | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [cloneOpen, setCloneOpen] = useState(false);
  const [cloneInitialSource, setCloneInitialSource] = useState<CloneSource | null>(null);
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [searchQuery, setSearchQuery] = useState("");
  const colVis = useColumnVisibility<QuoteColKey>("col-visibility:quotes:v1", QUOTE_TOGGLEABLE_COLS);
  const quoteColSpan = colVis.visible.size + 3;
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [updatedAt, setUpdatedAt] = useState<Date>(new Date());
  const { data, isLoading, refetch, isFetching } = useListQuotes();
  const deleteMutation = useDeleteQuote();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  React.useEffect(() => {
    if (data) setUpdatedAt(new Date());
  }, [data]);

  const handleDelete = async () => {
    if (deletingId === null) return;
    try {
      await deleteMutation.mutateAsync({ id: deletingId });
      await queryClient.invalidateQueries({ queryKey: getListQuotesQueryKey() });
      toast({ title: "Quote deleted" });
    } catch {
      toast({ title: "Error", description: "Could not delete quote.", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const allQuotes = data?.data ?? [];

  const filteredQuotes = React.useMemo(() => {
    if (!searchQuery.trim()) return allQuotes;
    const q = searchQuery.toLowerCase();
    return allQuotes.filter((quote) =>
      (quote.name ?? "").toLowerCase().includes(q) ||
      (quote.quoteNumber ?? "").toLowerCase().includes(q) ||
      (quote.opportunityName ?? "").toLowerCase().includes(q)
    );
  }, [allQuotes, searchQuery]);

  const sortedQuotes = React.useMemo(() => {
    return [...filteredQuotes].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "quoteNumber":
          cmp = (a.quoteNumber ?? "").localeCompare(b.quoteNumber ?? "");
          break;
        case "name":
          cmp = (a.name ?? "").localeCompare(b.name ?? "");
          break;
        case "validUntil":
          cmp = (a.validUntil ? new Date(a.validUntil).getTime() : 0) - (b.validUntil ? new Date(b.validUntil).getTime() : 0);
          break;
        case "subtotal":
          cmp = (Number(a.subtotal) || 0) - (Number(b.subtotal) || 0);
          break;
        case "total":
          cmp = (Number(a.total) || 0) - (Number(b.total) || 0);
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filteredQuotes, sortField, sortDir]);

  const quotesPagination = usePagination("quotes", sortedQuotes);
  const allSelected = sortedQuotes.length > 0 && sortedQuotes.every((q) => selectedIds.has(q.id));
  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sortedQuotes.map((q) => q.id)));
    }
  };
  const toggleSelectOne = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 opacity-30" />;
    return sortDir === "asc" ? <ChevronUp className="w-3.5 h-3.5 text-primary" /> : <ChevronDown className="w-3.5 h-3.5 text-primary" />;
  };

  const SortableHeader = ({ field, label, align = "left" }: { field: SortField; label: string; align?: "left" | "right" }) => (
    <th className={`px-3 py-3 font-semibold uppercase tracking-wide text-white border-r border-blue-500/40 last:border-r-0 ${align === "right" ? "text-right" : "text-left"}`}>
      <button
        onClick={() => toggleSort(field)}
        className={`inline-flex items-center gap-1 text-white hover:text-white/80 transition-colors ${align === "right" ? "flex-row-reverse" : ""}`}
      >
        <span>{label}</span>
        <SortIcon field={field} />
      </button>
    </th>
  );

  const itemCount = sortedQuotes.length;
  const updatedAgo = formatDistanceToNow(updatedAt, { addSuffix: true });
  const sortLabel = ({ quoteNumber: "Quote Number", name: "Quote Name", validUntil: "Expiration Date", subtotal: "Subtotal", total: "Total Price" } as const)[sortField];

  return (
    <Layout>
      <div className="flex flex-col gap-3">
        {/* Breadcrumb */}
        <div className="text-xs text-muted-foreground">
          <Link href="/opportunities" className="hover:text-primary hover:underline">Opportunities</Link>
          <span className="mx-1.5">›</span>
          <span>All Quotes</span>
        </div>

        {/* Header bar */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold text-foreground tracking-tight leading-tight">Quotes</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isLoading ? "Loading..." : `${itemCount} ${itemCount === 1 ? "item" : "items"}`}
                {!isLoading && (
                  <>
                    {" "}• Sorted by <span className="font-medium">{sortLabel}</span> • Updated {updatedAgo}
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search this list..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 pl-8 w-56 bg-card border-border"
              />
            </div>
            <div className="flex items-center gap-1 border border-border rounded-md p-0.5 bg-card">
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" title="List settings">
                <Settings className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                title="Refresh"
                onClick={() => { refetch(); }}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" title="Sort">
                <ArrowUpDown className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" title="Filters">
                <Filter className="w-3.5 h-3.5" />
              </Button>
            </div>
            <Button
              variant="outline"
              onClick={() => setIsCreateOpen(true)}
              className="border-border text-foreground hover:bg-muted h-9"
            >
              New Quote
            </Button>
            <Button
              variant="outline"
              onClick={() => { setCloneInitialSource(null); setCloneOpen(true); }}
              className="border-border text-foreground hover:bg-muted h-9 gap-1.5"
              title="Clone an existing quote into a different account"
            >
              <Copy className="w-3.5 h-3.5" />
              Clone Quote
            </Button>
          </div>
        </div>

        <AISummary entityType="quotes" />

        {/* Table */}
        <Card className="border-2 border-blue-700 dark:border-blue-800 overflow-hidden p-0">
          <div className="px-3 py-1.5 border-b border-border bg-muted/20 flex items-center justify-end">
            <ColumnsMenu columns={QUOTE_TOGGLEABLE_COLS} isVisible={colVis.isVisible} toggle={colVis.toggle} showAll={colVis.showAll} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs sticky top-0 z-10">
                <tr className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800 border-b border-blue-800 divide-x divide-blue-500/40">
                  <th className="w-10 px-3 py-3 border-r border-blue-500/40">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      aria-label="Select all quotes"
                      className="rounded border-white/40 cursor-pointer"
                    />
                  </th>
                  <th className="w-10 px-2 py-3 text-white/80 font-semibold uppercase tracking-wide text-center border-r border-blue-500/40">#</th>
                  {colVis.isVisible("quoteNumber") && <SortableHeader field="quoteNumber" label="Quote Number" />}
                  {colVis.isVisible("name") && <SortableHeader field="name" label="Quote Name" />}
                  {colVis.isVisible("revision") && <th className="px-3 py-3 font-semibold uppercase tracking-wide text-white border-r border-blue-500/40 text-center">Revision</th>}
                  {colVis.isVisible("clonedFrom") && <th className="px-3 py-3 font-semibold uppercase tracking-wide text-white border-r border-blue-500/40">Cloned From</th>}
                  {colVis.isVisible("validUntil") && <SortableHeader field="validUntil" label="Expiration Date" />}
                  {colVis.isVisible("subtotal") && <SortableHeader field="subtotal" label="Subtotal" align="right" />}
                  {colVis.isVisible("total") && <SortableHeader field="total" label="Total Price" align="right" />}
                  {colVis.isVisible("createdBy") && <th className="px-3 py-3 font-semibold uppercase tracking-wide text-white border-r border-blue-500/40">Created By</th>}
                  <th className="w-10 px-2 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr><td colSpan={quoteColSpan} className="px-6 py-8 text-center text-muted-foreground">Loading...</td></tr>
                ) : sortedQuotes.length === 0 ? (
                  <tr>
                    <td colSpan={quoteColSpan} className="px-6 py-12 text-center text-muted-foreground">
                      <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      {searchQuery ? "No quotes match your search." : "No quotes yet. Create your first quote."}
                    </td>
                  </tr>
                ) : quotesPagination.paged.map((q, idx) => {
                  const checked = selectedIds.has(q.id);
                  const subtotal = Number(q.subtotal) || 0;
                  const total = Number(q.total) || 0;
                  return (
                    <tr
                      key={q.id}
                      className={`group transition-colors ${checked ? "bg-primary/5" : "hover:bg-muted/40"}`}
                    >
                      <td className="px-3 py-2 border-r border-border">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleSelectOne(q.id)}
                          aria-label={`Select quote ${q.quoteNumber}`}
                          className="rounded border-border cursor-pointer"
                        />
                      </td>
                      <td className="px-2 py-2 text-center text-muted-foreground border-r border-border">{idx + 1}</td>
                      {colVis.isVisible("quoteNumber") && (
                        <td className="px-3 py-2 border-r border-border">
                          <Link href={`/quotes/${q.id}`} className="text-primary hover:underline font-mono text-sm">
                            {q.quoteNumber}
                          </Link>
                        </td>
                      )}
                      {colVis.isVisible("name") && (
                        <td className="px-3 py-2 border-r border-border">
                          <Link href={`/quotes/${q.id}`} className="text-primary hover:underline">
                            {q.name}
                          </Link>
                        </td>
                      )}
                      {colVis.isVisible("revision") && (
                        <td className="px-3 py-2 text-center border-r border-border">
                          <Badge
                            variant="secondary"
                            className={`text-[10px] font-mono ${q.version && q.version > 1 ? "bg-primary/10 text-primary border-primary/20" : "bg-muted text-muted-foreground"}`}
                          >
                            v{q.version ?? 1}
                          </Badge>
                        </td>
                      )}
                      {colVis.isVisible("clonedFrom") && (
                        <td className="px-3 py-2 border-r border-border">
                          {q.clonedFromQuoteId ? (
                            <Link
                              href={`/quotes/${q.clonedFromQuoteId}`}
                              className="inline-flex items-center gap-1 text-primary hover:underline font-mono text-xs"
                              title={q.clonedFromQuoteName ?? undefined}
                            >
                              <Copy className="w-3 h-3" />
                              {q.clonedFromQuoteNumber ?? `#${q.clonedFromQuoteId}`}
                            </Link>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      )}
                      {colVis.isVisible("validUntil") && (
                        <td className="px-3 py-2 text-foreground border-r border-border">
                          {q.validUntil ? format(new Date(q.validUntil), "M/d/yyyy") : "-"}
                        </td>
                      )}
                      {colVis.isVisible("subtotal") && (
                        <td className="px-3 py-2 text-right text-foreground border-r border-border tabular-nums">
                          £{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      )}
                      {colVis.isVisible("total") && (
                        <td className="px-3 py-2 text-right text-foreground border-r border-border tabular-nums">
                          £{total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      )}
                      {colVis.isVisible("createdBy") && (
                        <td className="px-3 py-2 border-r border-border text-foreground">
                          <div className="flex flex-col leading-tight">
                            <span>{q.createdByName || "—"}</span>
                            {q.createdAt && (
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(q.createdAt), "M/d/yyyy h:mm a")}
                              </span>
                            )}
                          </div>
                        </td>
                      )}
                      <td className="px-2 py-2 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground opacity-60 group-hover:opacity-100 transition-opacity"
                              aria-label="Row actions"
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-card border-border text-foreground">
                            <DropdownMenuItem
                              onClick={() => {
                                const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, "");
                                window.open(`${baseUrl}/api/quotes/${q.id}/pdf`, "_blank");
                              }}
                              className="cursor-pointer hover:bg-muted"
                            >
                              <Download className="w-4 h-4 mr-2" /> Download PDF
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-muted" />
                            <DropdownMenuItem
                              onClick={() => setEditingQuote({
                                id: q.id,
                                name: q.name,
                                status: q.status,
                                validUntil: q.validUntil ?? "",
                                discount: String(q.discount ?? 0),
                                tax: String(q.tax ?? 0),
                                notes: q.notes ?? "",
                                items: (q.items ?? []).map((it: { productId?: number | null; productName: string; quantity: number; unitPrice: number; discount?: number }) => ({
                                  productId: it.productId ?? null,
                                  productName: it.productName,
                                  quantity: it.quantity,
                                  unitPrice: it.unitPrice,
                                  discount: it.discount ?? 0,
                                })),
                              })}
                              className="cursor-pointer hover:bg-muted"
                            >
                              <Pencil className="w-4 h-4 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => { setCloneInitialSource({ id: q.id, name: q.name, quoteNumber: q.quoteNumber }); setCloneOpen(true); }}
                              className="cursor-pointer hover:bg-muted"
                            >
                              <Copy className="w-4 h-4 mr-2" /> Clone
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-muted" />
                            <DropdownMenuItem
                              onClick={() => setDeletingId(q.id)}
                              className="cursor-pointer text-destructive hover:bg-destructive/10 focus:text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <TablePagination
            page={quotesPagination.page}
            totalPages={quotesPagination.totalPages}
            pageSize={quotesPagination.pageSize}
            total={quotesPagination.total}
            pageStart={quotesPagination.pageStart}
            pageEnd={quotesPagination.pageEnd}
            onPageChange={quotesPagination.setPage}
            onPageSizeChange={quotesPagination.setPageSize}
          />
        </Card>

        {/* Status badge legend (subtle) */}
        {sortedQuotes.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground px-1">
            <span>Status legend:</span>
            {Object.entries(STATUS_COLORS).map(([s, cls]) => (
              <Badge key={s} variant="outline" className={`capitalize text-[10px] py-0 ${cls}`}>{s}</Badge>
            ))}
          </div>
        )}
      </div>

      <QuoteFormDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} mode="create" />
      <QuoteFormDialog
        open={!!editingQuote}
        onOpenChange={(o) => { if (!o) setEditingQuote(null); }}
        mode="edit"
        initialData={editingQuote ?? undefined}
      />
      <CloneQuoteDialog
        open={cloneOpen}
        initialSource={cloneInitialSource}
        sourceQuotes={allQuotes.map((q) => ({ id: q.id, name: q.name, quoteNumber: q.quoteNumber }))}
        onOpenChange={(o) => { setCloneOpen(o); if (!o) setCloneInitialSource(null); }}
      />
      <AlertDialog open={deletingId !== null} onOpenChange={(o) => { if (!o) setDeletingId(null); }}>
        <AlertDialogContent className="bg-card border-border text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Quote?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This quote and all its line items will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border hover:bg-muted/50">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/80">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
