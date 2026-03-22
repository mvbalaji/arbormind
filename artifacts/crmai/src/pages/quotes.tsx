import React, { useState } from "react";
import {
  useListQuotes, useCreateQuote, useUpdateQuote, useDeleteQuote, useListProducts,
  getListQuotesQueryKey,
  CreateQuoteInputStatus,
  type CreateQuoteInput, type CreateQuoteItemInput,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
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
import { FileText, Plus, MoreHorizontal, Pencil, Trash2, X, Package } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const STATUS_COLORS: Record<string, string> = {
  draft: "border-white/10 text-muted-foreground",
  sent: "border-blue-500/30 text-blue-400 bg-blue-500/5",
  accepted: "border-green-500/30 text-green-400 bg-green-500/5",
  rejected: "border-red-500/30 text-red-400 bg-red-500/5",
  expired: "border-orange-500/30 text-orange-400 bg-orange-500/5",
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
      <DialogContent className="bg-card border-white/10 text-white max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Create Quote" : "Edit Quote"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          {/* Header fields */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2 col-span-2">
              <Label htmlFor="q-name">Quote Name *</Label>
              <Input id="q-name" required className="bg-black/20 border-white/10"
                value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="q-status">Status</Label>
              <select
                id="q-status"
                className="w-full h-10 px-3 rounded-md bg-black/20 border border-white/10 text-white text-sm"
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
              <Input id="q-valid" type="date" className="bg-black/20 border-white/10"
                value={formData.validUntil} onChange={e => setFormData({ ...formData, validUntil: e.target.value })} />
            </div>
          </div>

          {/* Line Items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-sm font-semibold">Line Items</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem} className="border-white/10 text-xs">
                <Plus className="w-3 h-3 mr-1" /> Add Item
              </Button>
            </div>

            {formData.items.length === 0 ? (
              <div
                className="border border-dashed border-white/10 rounded-lg p-6 text-center text-muted-foreground text-sm cursor-pointer hover:border-primary/30 transition-colors"
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
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-white/5 rounded-lg p-2">
                    <div className="col-span-4">
                      <select
                        className="w-full h-8 px-2 rounded-md bg-black/30 border border-white/10 text-white text-sm"
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
                          className="mt-1 h-7 text-xs bg-black/30 border-white/10"
                          placeholder="Product name..."
                          value={item.productName}
                          onChange={e => updateItem(idx, { productName: e.target.value })}
                        />
                      )}
                    </div>
                    <div className="col-span-2">
                      <Input type="number" min="1" className="h-8 bg-black/30 border-white/10 text-right text-sm"
                        value={item.quantity}
                        onChange={e => updateItem(idx, { quantity: parseFloat(e.target.value) || 1 })} />
                    </div>
                    <div className="col-span-2">
                      <Input type="number" min="0" step="0.01" className="h-8 bg-black/30 border-white/10 text-right text-sm"
                        value={item.unitPrice}
                        onChange={e => updateItem(idx, { unitPrice: parseFloat(e.target.value) || 0 })} />
                    </div>
                    <div className="col-span-2">
                      <Input type="number" min="0" max="100" className="h-8 bg-black/30 border-white/10 text-right text-sm"
                        value={item.discount}
                        onChange={e => updateItem(idx, { discount: parseFloat(e.target.value) || 0 })} />
                    </div>
                    <div className="col-span-1 text-right text-sm font-medium text-white">
                      ${lineTotal(item).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-400"
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
            <div className="border border-white/5 rounded-lg p-4 space-y-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Quote Discount %</Label>
                  <Input type="number" min="0" max="100" className="h-8 bg-black/20 border-white/10 text-sm"
                    value={formData.discount} onChange={e => setFormData({ ...formData, discount: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Tax %</Label>
                  <Input type="number" min="0" className="h-8 bg-black/20 border-white/10 text-sm"
                    value={formData.tax} onChange={e => setFormData({ ...formData, tax: e.target.value })} />
                </div>
              </div>
              <div className="border-t border-white/5 pt-2 mt-2 space-y-1 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span><span>${subtotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
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
                    <span>${taxAmt.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-white text-base border-t border-white/10 pt-1 mt-1">
                  <span>Total</span>
                  <span>${total.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="q-notes">Notes</Label>
            <Input id="q-notes" className="bg-black/20 border-white/10"
              value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Internal notes or terms..." />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="border-white/10">Cancel</Button>
            <Button type="submit" disabled={isPending} className="bg-primary hover:bg-primary/90 text-white">
              {isPending ? "Saving..." : mode === "create" ? "Create Quote" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Quotes() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState<({ id: number } & QuoteFormData) | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const { data, isLoading } = useListQuotes();
  const deleteMutation = useDeleteQuote();
  const queryClient = useQueryClient();
  const { toast } = useToast();

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

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-display font-bold text-white tracking-tight">Quotes</h1>
            <p className="text-muted-foreground mt-1 text-sm">Manage pricing quotes sent to customers.</p>
          </div>
          <Button onClick={() => setIsCreateOpen(true)} className="bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20">
            <Plus className="w-4 h-4 mr-2" /> Create Quote
          </Button>
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
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {isLoading ? (
                  <tr><td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">Loading...</td></tr>
                ) : data?.data?.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    No quotes yet. Create your first quote.
                  </td></tr>
                ) : data?.data?.map(q => (
                  <tr key={q.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">{q.name}</div>
                      <div className="text-xs text-muted-foreground mt-1 font-mono">{q.quoteNumber}</div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {q.opportunityName || "-"}
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-white">
                      ${q.total.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className={`capitalize ${STATUS_COLORS[q.status] ?? ""}`}>
                        {q.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {q.validUntil ? format(new Date(q.validUntil), "MMM d, yyyy") : "-"}
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
                            className="cursor-pointer hover:bg-white/10"
                          >
                            <Pencil className="w-4 h-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-white/10" />
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
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <QuoteFormDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} mode="create" />
      <QuoteFormDialog
        open={!!editingQuote}
        onOpenChange={(o) => { if (!o) setEditingQuote(null); }}
        mode="edit"
        initialData={editingQuote ?? undefined}
      />
      <AlertDialog open={deletingId !== null} onOpenChange={(o) => { if (!o) setDeletingId(null); }}>
        <AlertDialogContent className="bg-card border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Quote?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This quote and all its line items will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 hover:bg-white/5">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/80">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
