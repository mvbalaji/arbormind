import React, { useMemo, useState } from "react";
import { useParams, Link } from "wouter";
import {
  useGetPriceBook, useListPriceBooks, useListProducts,
  useAddPriceBookEntry, useUpdatePriceBookEntry, useRemovePriceBookEntry,
  getGetPriceBookQueryKey, getListPriceBooksQueryKey,
  type PriceBookEntryDetail,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, BookText, Lock, Plus, Trash2, Package, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function AddEntryDialog({
  open, onOpenChange, bookId, isStandard, existingProductIds, standardEntryProductIds, standardPriceMap,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  bookId: number;
  isStandard: boolean;
  existingProductIds: Set<number>;
  standardEntryProductIds: Set<number>;
  standardPriceMap: Map<number, number>;
}) {
  const [productId, setProductId] = useState<string>("");
  const [listPrice, setListPrice] = useState<string>("");
  const [useStandardPrice, setUseStandardPrice] = useState(false);
  const { data: productsData } = useListProducts({ limit: 500 });
  const products = productsData?.data ?? [];
  const addMutation = useAddPriceBookEntry();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const eligibleProducts = useMemo(() => products.filter(p => {
    if (existingProductIds.has(p.id)) return false;
    if (!isStandard && !standardEntryProductIds.has(p.id)) return false;
    return true;
  }), [products, existingProductIds, standardEntryProductIds, isStandard]);

  React.useEffect(() => {
    if (open) { setProductId(""); setListPrice(""); setUseStandardPrice(false); }
  }, [open]);

  const onPickProduct = (val: string) => {
    setProductId(val);
    const prod = products.find(p => p.id === parseInt(val));
    if (prod) {
      if (useStandardPrice) {
        const stdPrice = standardPriceMap.get(prod.id);
        setListPrice(stdPrice !== undefined ? stdPrice.toString() : prod.unitPrice.toString());
      } else if (!listPrice) {
        setListPrice(prod.unitPrice.toString());
      }
    }
  };

  const onUseStandardChange = (checked: boolean) => {
    setUseStandardPrice(checked);
    if (checked && productId) {
      const pid = parseInt(productId);
      const stdPrice = standardPriceMap.get(pid);
      if (stdPrice !== undefined) setListPrice(stdPrice.toString());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId || !listPrice) return;
    try {
      await addMutation.mutateAsync({
        id: bookId,
        data: { productId: parseInt(productId), listPrice: parseFloat(listPrice), useStandardPrice },
      });
      await queryClient.invalidateQueries({ queryKey: getGetPriceBookQueryKey(bookId) });
      await queryClient.invalidateQueries({ queryKey: getListPriceBooksQueryKey() });
      toast({ title: "Product added", description: "Price book entry created." });
      onOpenChange(false);
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || "Could not add product.";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border text-foreground max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Product to Price Book</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {isStandard
              ? "Set the Standard Price for a product. This becomes its default unit price."
              : "Only products that already have a Standard Price can be added to a custom price book."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="pbe-product">Product *</Label>
            <select id="pbe-product" required className="w-full h-9 px-3 rounded-md bg-muted border border-border text-sm"
              value={productId} onChange={e => onPickProduct(e.target.value)}>
              <option value="" className="bg-card">Select a product…</option>
              {eligibleProducts.map(p => (
                <option key={p.id} value={p.id} className="bg-card">{p.name}{p.code ? ` (${p.code})` : ""}</option>
              ))}
            </select>
            {eligibleProducts.length === 0 && (
              <p className="text-xs text-muted-foreground">
                {isStandard
                  ? "All products already have a Standard Price entry."
                  : "No eligible products. Add a Standard Price for products first."}
              </p>
            )}
          </div>
          {!isStandard && (
            <div className="flex items-center gap-2">
              <input type="checkbox" id="pbe-use-std" checked={useStandardPrice}
                onChange={e => onUseStandardChange(e.target.checked)}
                className="w-4 h-4 rounded border-white/20 accent-primary" />
              <Label htmlFor="pbe-use-std" className="cursor-pointer">Use Standard Price</Label>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="pbe-price">List Price *</Label>
            <Input id="pbe-price" type="number" min="0" step="0.01" required
              className={`bg-muted border-border ${useStandardPrice ? "opacity-60" : ""}`}
              readOnly={useStandardPrice}
              value={listPrice} onChange={e => setListPrice(e.target.value)} />
            {useStandardPrice && (
              <p className="text-xs text-muted-foreground">Price is inherited from the Standard Price Book.</p>
            )}
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="border-border">Cancel</Button>
            <Button type="submit" disabled={addMutation.isPending || !productId} className="bg-primary hover:bg-primary/90 text-foreground">
              {addMutation.isPending ? "Adding..." : "Add Product"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function PriceBookDetail() {
  const params = useParams();
  const bookId = parseInt(params.id as string);
  const { data: book, isLoading } = useGetPriceBook(bookId);
  const { data: booksList } = useListPriceBooks();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [removingEntry, setRemovingEntry] = useState<PriceBookEntryDetail | null>(null);
  const removeMutation = useRemovePriceBookEntry();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const standardBookId = booksList?.data.find(b => b.isStandard)?.id;
  const { data: standardBook } = useGetPriceBook(standardBookId ?? 0);
  const standardEntryProductIds = useMemo(
    () => new Set((standardBook?.entries ?? []).map(e => e.productId)),
    [standardBook],
  );
  const standardPriceMap = useMemo(
    () => new Map((standardBook?.entries ?? []).map(e => [e.productId, e.listPrice])),
    [standardBook],
  );

  const entries = book?.entries ?? [];
  const existingProductIds = useMemo(() => new Set(entries.map(e => e.productId)), [entries]);
  const isStandard = !!book?.isStandard;

  const handleRemove = async () => {
    if (!removingEntry) return;
    try {
      await removeMutation.mutateAsync({ id: bookId, entryId: removingEntry.id });
      await queryClient.invalidateQueries({ queryKey: getGetPriceBookQueryKey(bookId) });
      await queryClient.invalidateQueries({ queryKey: getListPriceBooksQueryKey() });
      toast({ title: "Product removed from price book" });
    } catch {
      toast({ title: "Error", description: "Could not remove product.", variant: "destructive" });
    } finally {
      setRemovingEntry(null);
    }
  };

  if (isLoading) {
    return <Layout><div className="flex items-center justify-center py-20 text-muted-foreground">Loading...</div></Layout>;
  }

  if (!book) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <BookText className="w-10 h-10 text-muted-foreground opacity-40" />
          <p className="text-muted-foreground">Price book not found.</p>
          <Link href="/price-books"><Button variant="outline" className="border-border">Back to Price Books</Button></Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/price-books">
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <BookText className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-foreground">{book.name}</h1>
              {book.isStandard && (
                <Badge variant="outline" className="border-amber-500/30 text-amber-600 bg-amber-500/5 gap-1">
                  <Lock className="w-3 h-3" /> Standard
                </Badge>
              )}
              <Badge variant="outline" className={book.isActive ? "border-green-500/30 text-green-600 bg-green-500/5" : "border-border text-muted-foreground"}>
                {book.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
            {book.description && <p className="text-sm text-muted-foreground">{book.description}</p>}
          </div>
          <Button onClick={() => setIsAddOpen(true)} className="bg-primary hover:bg-primary/90 text-foreground">
            <Plus className="w-4 h-4 mr-1" /> Add Product
          </Button>
        </div>

        {isStandard && (
          <div className="text-xs text-muted-foreground bg-amber-500/5 border border-amber-500/20 rounded-md px-3 py-2">
            The Standard Price Book defines each product's default unit price. Prices here stay in sync with the product catalog.
          </div>
        )}

        <Card className="glass-panel border-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left [&_tbody_td]:whitespace-nowrap">
              <thead className="sticky top-0 z-10">
                <tr className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800 border-b border-blue-800 divide-x divide-blue-500/40">
                  <th className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-white leading-tight whitespace-nowrap">Product Name</th>
                  <th className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-white leading-tight whitespace-nowrap">Product Code</th>
                  <th className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-white leading-tight whitespace-nowrap">Product Family</th>
                  <th className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-white leading-tight whitespace-nowrap text-right">List Price</th>
                  {!isStandard && (
                    <th className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-white leading-tight whitespace-nowrap text-center">Use Standard Price</th>
                  )}
                  <th className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-white leading-tight whitespace-nowrap text-center">Active</th>
                  <th className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-white leading-tight whitespace-nowrap text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {entries.length === 0 ? (
                  <tr><td colSpan={isStandard ? 6 : 7} className="px-6 py-12 text-center text-muted-foreground">
                    <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    No products in this price book yet.
                  </td></tr>
                ) : entries.map(entry => (
                  <React.Fragment key={entry.id}>
                    <EntryRowWithRemove
                      entry={entry}
                      bookId={bookId}
                      isStandard={isStandard}
                      standardPrice={standardPriceMap.get(entry.productId)}
                      onRemove={() => setRemovingEntry(entry)}
                    />
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <AddEntryDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        bookId={bookId}
        isStandard={isStandard}
        existingProductIds={existingProductIds}
        standardEntryProductIds={standardEntryProductIds}
        standardPriceMap={standardPriceMap}
      />

      <AlertDialog open={removingEntry !== null} onOpenChange={(o) => { if (!o) setRemovingEntry(null); }}>
        <AlertDialogContent className="bg-card border-border text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Product?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              {removingEntry?.productName || "This product"} will be removed from this price book. Existing quotes will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border hover:bg-muted/50">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemove} className="bg-destructive hover:bg-destructive/80">Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}

function EntryRowWithRemove({
  entry, bookId, isStandard, standardPrice, onRemove,
}: {
  entry: PriceBookEntryDetail;
  bookId: number;
  isStandard: boolean;
  standardPrice?: number;
  onRemove: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [price, setPrice] = useState(entry.listPrice.toString());
  const useStdPrice = (entry as any).useStandardPrice ?? false;
  const updateMutation = useUpdatePriceBookEntry();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  React.useEffect(() => { setPrice(entry.listPrice.toString()); }, [entry.listPrice]);

  const save = async () => {
    try {
      await updateMutation.mutateAsync({ id: bookId, entryId: entry.id, data: { listPrice: parseFloat(price) } });
      await queryClient.invalidateQueries({ queryKey: getGetPriceBookQueryKey(bookId) });
      if (isStandard) await queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "Price updated" });
      setEditing(false);
    } catch {
      toast({ title: "Error", description: "Could not update price.", variant: "destructive" });
    }
  };

  return (
    <tr className="hover:bg-muted/50 transition-colors group">
      <td className="px-3 py-1.5">
        <div className="font-medium text-foreground flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
            <Package className="w-4 h-4 text-primary" />
          </div>
          {entry.productName || `Product #${entry.productId}`}
        </div>
      </td>
      <td className="px-3 py-1.5 text-muted-foreground font-mono text-xs">{entry.productCode || "—"}</td>
      <td className="px-3 py-1.5 text-muted-foreground">{entry.productCategory || "—"}</td>
      <td className="px-3 py-1.5 text-right">
        {editing ? (
          <div className="flex items-center justify-end gap-1">
            <Input type="number" min="0" step="0.01" autoFocus className="h-7 w-28 bg-muted border-border text-right text-sm"
              value={price} onChange={e => setPrice(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") { setEditing(false); setPrice(entry.listPrice.toString()); } }} />
            <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600" onClick={save} disabled={updateMutation.isPending}>
              <Check className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => { setEditing(false); setPrice(entry.listPrice.toString()); }}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <button className={`font-semibold text-foreground hover:text-primary ${useStdPrice ? "opacity-60 cursor-default" : ""}`}
            onClick={() => !useStdPrice && setEditing(true)} disabled={useStdPrice}>
            {entry.listPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs text-muted-foreground">{entry.currency}</span>
          </button>
        )}
      </td>
      {!isStandard && (
        <td className="px-3 py-1.5 text-center">
          {useStdPrice ? (
            <span className="inline-block w-4 h-4 rounded-sm bg-green-500/20 border border-green-500/40 text-green-600 text-[10px] flex items-center justify-center">✓</span>
          ) : (
            <span className="inline-block w-4 h-4 rounded-sm border border-border" />
          )}
        </td>
      )}
      <td className="px-3 py-1.5 text-center">
        {entry.isActive ? (
          <span className="inline-block w-4 h-4 rounded-sm bg-green-500/20 border border-green-500/40 text-green-600 text-[10px] flex items-center justify-center">✓</span>
        ) : (
          <span className="inline-block w-4 h-4 rounded-sm border border-border" />
        )}
      </td>
      <td className="px-3 py-1.5 text-right">
        {!isStandard && (
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={onRemove}>
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </td>
    </tr>
  );
}
