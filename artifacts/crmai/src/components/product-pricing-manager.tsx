import React, { useState } from "react";
import {
  useListEntriesByProduct, getListEntriesByProductQueryKey,
  useListPriceBooks, getListPriceBooksQueryKey,
  useAddPriceBookEntry, useUpdatePriceBookEntry, useRemovePriceBookEntry,
  getListProductsQueryKey, getGetProductQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Pencil, Trash2, Check, X as XIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PricingEntry {
  id: number;
  priceBookId: number;
  listPrice: number;
  currency: string;
  isActive: boolean;
  priceBookName?: string | null;
  isStandard?: boolean | null;
}

function EntryPriceRow({ entry, onChanged }: { entry: PricingEntry; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [price, setPrice] = useState(entry.listPrice.toString());
  const updateMutation = useUpdatePriceBookEntry();
  const removeMutation = useRemovePriceBookEntry();
  const { toast } = useToast();

  React.useEffect(() => { setPrice(entry.listPrice.toString()); }, [entry.listPrice]);

  const save = async () => {
    if (!price) return;
    try {
      await updateMutation.mutateAsync({ id: entry.priceBookId, entryId: entry.id, data: { listPrice: parseFloat(price) } });
      setEditing(false);
      onChanged();
      toast({ title: "Price updated" });
    } catch {
      toast({ title: "Error", description: "Could not update price.", variant: "destructive" });
    }
  };

  const remove = async () => {
    try {
      await removeMutation.mutateAsync({ id: entry.priceBookId, entryId: entry.id });
      onChanged();
      toast({ title: "Removed from price book" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not remove entry.";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  };

  return (
    <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-md bg-muted/30 border border-border">
      <div className="flex items-center gap-2 min-w-0">
        <BookOpen className="w-4 h-4 text-primary shrink-0" />
        <span className="font-medium text-foreground truncate">{entry.priceBookName || "Price Book"}</span>
        {entry.isStandard && (
          <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5 text-[10px]">Standard</Badge>
        )}
        {!entry.isActive && (
          <Badge variant="outline" className="border-border text-muted-foreground text-[10px]">Inactive</Badge>
        )}
      </div>
      <div className="flex items-center gap-1">
        {editing ? (
          <>
            <Input
              type="number" min="0" step="0.01" autoFocus
              className="h-7 w-28 bg-card border-border text-right"
              value={price} onChange={e => setPrice(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") { setEditing(false); setPrice(entry.listPrice.toString()); } }}
            />
            <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600" onClick={save} disabled={updateMutation.isPending}>
              <Check className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => { setEditing(false); setPrice(entry.listPrice.toString()); }}>
              <XIcon className="w-4 h-4" />
            </Button>
          </>
        ) : (
          <>
            <span className="font-semibold text-foreground tabular-nums">
              ${entry.listPrice.toLocaleString()} <span className="text-xs text-muted-foreground">{entry.currency}</span>
            </span>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => setEditing(true)}>
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            {!entry.isStandard && (
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={remove} disabled={removeMutation.isPending}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export function ProductPricingManager({
  productId,
  unitPrice,
  enabled = true,
}: {
  productId: number;
  unitPrice: number;
  enabled?: boolean;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [addBookId, setAddBookId] = useState("");
  const [addPrice, setAddPrice] = useState("");

  const { data: entriesData, isLoading } = useListEntriesByProduct(productId, {
    query: { enabled: enabled && productId > 0, queryKey: getListEntriesByProductQueryKey(productId) },
  });
  const { data: booksData } = useListPriceBooks({
    query: { enabled, queryKey: getListPriceBooksQueryKey() },
  });
  const addMutation = useAddPriceBookEntry();

  const entries = entriesData?.data ?? [];
  const standardEntry = entries.find(e => e.isStandard);
  const hasStandard = !!standardEntry;
  const usedBookIds = new Set(entries.map(e => e.priceBookId));
  const availableBooks = (booksData?.data ?? []).filter(b => b.isActive && !usedBookIds.has(b.id));

  React.useEffect(() => {
    if (enabled) { setAddBookId(""); setAddPrice(unitPrice ? unitPrice.toString() : ""); }
  }, [enabled, unitPrice]);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: getListEntriesByProductQueryKey(productId) });
    queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetProductQueryKey(productId) });
  };

  const handleAdd = async () => {
    if (!addBookId || !addPrice) return;
    try {
      await addMutation.mutateAsync({
        id: parseInt(addBookId),
        data: { productId, listPrice: parseFloat(addPrice) },
      });
      setAddBookId("");
      setAddPrice(unitPrice ? unitPrice.toString() : "");
      refresh();
      toast({ title: "Added to price book" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not add to price book.";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      {!hasStandard && !isLoading && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
          This product has no Standard Price yet. Add a Standard Price before listing it in other price books.
        </div>
      )}

      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Price Book Entries</Label>
        {isLoading ? (
          <div className="text-sm text-muted-foreground py-4 text-center">Loading...</div>
        ) : entries.length === 0 ? (
          <div className="text-sm text-muted-foreground py-4 text-center">Not listed in any price book yet.</div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {entries.map(e => (
              <EntryPriceRow key={e.id} entry={e} onChanged={refresh} />
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2 border-t border-border pt-3">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Add to Price Book</Label>
        {availableBooks.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            {hasStandard ? "Listed in all active price books." : "Add the Standard Price first."}
          </div>
        ) : (
          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-1">
              <Label htmlFor="add-book" className="text-xs">Price Book</Label>
              <select
                id="add-book"
                className="w-full h-9 rounded-md bg-muted border border-border px-2 text-sm"
                value={addBookId}
                onChange={e => setAddBookId(e.target.value)}
              >
                <option value="" className="bg-card">Select a book…</option>
                {availableBooks.map(b => (
                  <option key={b.id} value={b.id} className="bg-card">
                    {b.name}{b.isStandard ? " (Standard)" : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-32 space-y-1">
              <Label htmlFor="add-price" className="text-xs">List Price</Label>
              <Input
                id="add-price" type="number" min="0" step="0.01"
                className="h-9 bg-muted border-border text-right"
                value={addPrice} onChange={e => setAddPrice(e.target.value)}
              />
            </div>
            <Button
              className="h-9 bg-primary hover:bg-primary/90 text-foreground"
              onClick={handleAdd}
              disabled={addMutation.isPending || !addBookId || !addPrice}
            >
              Add
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
