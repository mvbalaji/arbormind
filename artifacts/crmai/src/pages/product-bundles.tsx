import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Search, Edit2, Trash2, Package, ToggleLeft, ToggleRight, X, ArrowLeft, Eye, ChevronRight, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useCurrency } from "@/context/currency";

const API = "/api";

type BundleItem = {
  id: number;
  bundle_id: number;
  product_id: number;
  product_name: string;
  default_unit_price: string;
  product_code: string | null;
  quantity: number;
  unit_price_override: string | null;
  discount_pct: number;
  sort_order: number;
};

type Bundle = {
  id: number;
  name: string;
  description: string | null;
  bundle_discount_pct: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  items: BundleItem[];
};

type Product = { id: number; name: string; unitPrice: string; code: string | null; category: string | null };

function fetchBundles(): Promise<Bundle[]> {
  return fetch(`${API}/product-bundles`).then((r) => r.json());
}
function fetchProducts(): Promise<{ data: Product[] }> {
  return fetch(`${API}/products?limit=500`).then((r) => r.json());
}

// â”€â”€ Bundle Form â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function BundleForm({
  initial,
  products,
  onSave,
  onClose,
}: {
  initial?: Bundle;
  products: Product[];
  onSave: (data: any) => Promise<void>;
  onClose: () => void;
}) {
  const { format: fmtMoney } = useCurrency();
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [discountPct, setDiscountPct] = useState(String(initial?.bundle_discount_pct ?? 0));
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [items, setItems] = useState<{ product_id: number; product_name: string; quantity: number; unit_price_override: string; discount_pct: number; default_price: number }[]>(
    initial?.items.map((i) => ({
      product_id: i.product_id,
      product_name: i.product_name,
      quantity: Number(i.quantity),
      unit_price_override: i.unit_price_override ?? "",
      discount_pct: Number(i.discount_pct),
      default_price: Number(i.default_unit_price),
    })) ?? []
  );
  const [saving, setSaving] = useState(false);

  const addProduct = (productId: number) => {
    const p = products.find((x) => x.id === productId);
    if (!p || items.find((i) => i.product_id === productId)) return;
    setItems((prev) => [...prev, { product_id: p.id, product_name: p.name, quantity: 1, unit_price_override: "", discount_pct: 0, default_price: Number(p.unitPrice) }]);
  };

  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));
  const updateItem = (idx: number, changes: Partial<typeof items[0]>) =>
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, ...changes } : item)));

  const bundleTotal = items.reduce((sum, it) => {
    const price = it.unit_price_override !== "" ? Number(it.unit_price_override) : it.default_price;
    const after = price * it.quantity * (1 - it.discount_pct / 100);
    return sum + after;
  }, 0);
  const afterBundleDisc = bundleTotal * (1 - Number(discountPct) / 100);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        description: description.trim() || null,
        bundle_discount_pct: Number(discountPct) || 0,
        is_active: isActive,
        items: items.map((i) => ({
          product_id: i.product_id,
          quantity: i.quantity,
          unit_price_override: i.unit_price_override !== "" ? Number(i.unit_price_override) : null,
          discount_pct: i.discount_pct,
        })),
      });
      onClose();
    } finally { setSaving(false); }
  };

  const availableToAdd = products.filter((p) => !items.find((i) => i.product_id === p.id));

  return (
    <div className="flex flex-col gap-4 max-h-[80vh] overflow-y-auto pr-1">
      {/* Header fields */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Bundle Name <span className="text-red-500">*</span></Label>
          <Input className="bg-muted border-border" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Starter Pack" />
        </div>
        <div className="space-y-1.5">
          <Label>Bundle Discount %</Label>
          <Input type="number" min="0" max="100" className="bg-muted border-border" value={discountPct} onChange={(e) => setDiscountPct(e.target.value)} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Description <span className="text-muted-foreground text-xs font-normal">(optional)</span></Label>
        <Input className="bg-muted border-border" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description of this bundle…" />
      </div>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => setIsActive(!isActive)}>
          {isActive ? <ToggleRight className="w-6 h-6 text-green-500" /> : <ToggleLeft className="w-6 h-6 text-muted-foreground" />}
        </button>
        <span className="text-sm text-foreground">{isActive ? "Active" : "Inactive"}</span>
      </div>

      {/* Products */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Products in Bundle</Label>
          {availableToAdd.length > 0 && (
            <select
              className="h-8 px-2 rounded-md bg-muted border border-border text-foreground text-sm max-w-[220px]"
              value=""
              onChange={(e) => { if (e.target.value) addProduct(Number(e.target.value)); }}
            >
              <option value="">+ Add product…</option>
              {availableToAdd.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}
        </div>

        {items.length === 0 ? (
          <div className="border border-dashed border-border rounded-lg p-6 text-center text-muted-foreground text-sm">
            <Package className="w-6 h-6 mx-auto mb-2 opacity-40" />
            No products yet — select a product above to add it
          </div>
        ) : (
          <div className="border border-border rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="text-left px-3 py-2 text-xs text-muted-foreground font-medium">Product</th>
                  <th className="text-right px-3 py-2 text-xs text-muted-foreground font-medium whitespace-nowrap">List Price</th>
                  <th className="text-right px-3 py-2 text-xs text-muted-foreground font-medium whitespace-nowrap">Override Price</th>
                  <th className="text-right px-3 py-2 text-xs text-muted-foreground font-medium">Qty</th>
                  <th className="text-right px-3 py-2 text-xs text-muted-foreground font-medium whitespace-nowrap">Item Disc %</th>
                  <th className="text-right px-3 py-2 text-xs text-muted-foreground font-medium">Line Total</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((item, idx) => {
                  const effectivePrice = item.unit_price_override !== "" ? Number(item.unit_price_override) : item.default_price;
                  const lineTotal = effectivePrice * item.quantity * (1 - item.discount_pct / 100);
                  return (
                    <tr key={idx} className="hover:bg-muted/30">
                      <td className="px-3 py-2 font-medium text-foreground">{item.product_name}</td>
                      <td className="px-3 py-2 text-right text-muted-foreground">{fmtMoney(item.default_price)}</td>
                      <td className="px-3 py-2 text-right">
                        <Input type="number" min="0" step="0.01" className="h-7 w-24 bg-muted border-border text-right text-xs ml-auto"
                          placeholder="Default"
                          value={item.unit_price_override}
                          onChange={(e) => updateItem(idx, { unit_price_override: e.target.value })} />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Input type="number" min="1" className="h-7 w-16 bg-muted border-border text-right text-xs ml-auto"
                          value={item.quantity}
                          onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) || 1 })} />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Input type="number" min="0" max="100" className="h-7 w-16 bg-muted border-border text-right text-xs ml-auto"
                          value={item.discount_pct}
                          onChange={(e) => updateItem(idx, { discount_pct: Number(e.target.value) || 0 })} />
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-foreground">{fmtMoney(lineTotal)}</td>
                      <td className="px-3 py-2">
                        <button type="button" onClick={() => removeItem(idx)} className="text-muted-foreground hover:text-red-500">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="border-t border-border p-3 bg-muted/30 space-y-1 text-sm text-right">
              <div className="text-muted-foreground">Items subtotal: <span className="font-medium text-foreground">{fmtMoney(bundleTotal)}</span></div>
              {Number(discountPct) > 0 && (
                <div className="text-muted-foreground">Bundle discount ({discountPct}%): <span className="text-red-500">-{fmtMoney(bundleTotal - afterBundleDisc)}</span></div>
              )}
              <div className="font-bold text-foreground text-base">Bundle Total: {fmtMoney(afterBundleDisc)}</div>
            </div>
          </div>
        )}
      </div>

      <DialogFooter className="pt-3 border-t border-border">
        <Button variant="outline" onClick={onClose} className="border-border">Cancel</Button>
        <Button onClick={handleSave} disabled={saving || !name.trim() || items.length === 0} className="bg-primary hover:bg-primary/90 text-foreground">
          {saving ? "Saving…" : initial ? "Update Bundle" : "Create Bundle"}
        </Button>
      </DialogFooter>
    </div>
  );
}

// â”€â”€ Main Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function ProductBundles() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { format: fmtMoney } = useCurrency();
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editBundle, setEditBundle] = useState<Bundle | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const { data: bundles = [], isLoading } = useQuery({ queryKey: ["product-bundles"], queryFn: fetchBundles });
  const { data: productsData } = useQuery({ queryKey: ["products-list"], queryFn: fetchProducts });
  const products = productsData?.data ?? [];
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["product-bundles"] });

  const createMut = useMutation({
    mutationFn: (data: any) => fetch(`${API}/product-bundles`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then((r) => r.json()),
    onSuccess: () => { refresh(); toast({ title: "Bundle created" }); },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => fetch(`${API}/product-bundles/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then((r) => r.json()),
    onSuccess: () => { refresh(); toast({ title: "Bundle updated" }); },
  });
  const deleteMut = useMutation({
    mutationFn: (id: number) => fetch(`${API}/product-bundles/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => { refresh(); toast({ title: "Bundle deleted" }); },
  });
  const toggleMut = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) => fetch(`${API}/product-bundles/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_active }) }).then((r) => r.json()),
    onSuccess: () => refresh(),
  });

  const filtered = bundles.filter((b) =>
    !search || b.name.toLowerCase().includes(search.toLowerCase()) || (b.description ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const bundleTotal = (b: Bundle) => {
    const sub = b.items.reduce((s, i) => {
      const price = i.unit_price_override != null ? Number(i.unit_price_override) : Number(i.default_unit_price);
      return s + price * Number(i.quantity) * (1 - Number(i.discount_pct) / 100);
    }, 0);
    return sub * (1 - Number(b.bundle_discount_pct) / 100);
  };

  return (
    <Layout>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Product Bundles</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Configure bundles to add multiple products to a quote at once</p>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="bg-primary hover:bg-primary/90 text-foreground gap-1.5">
            <Plus className="w-4 h-4" /> New Bundle
          </Button>
        </div>

        <div className="relative max-w-xs mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9 bg-muted border-border" placeholder="Search bundles…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {isLoading ? (
          <div className="flex gap-1.5 py-16 justify-center">
            {[0, 1, 2].map((i) => <div key={i} className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="glass-panel border-border p-12 text-center">
            <Package className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">{bundles.length === 0 ? "No bundles yet. Create your first bundle." : "No bundles match the search."}</p>
          </Card>
        ) : (
          <Card className="glass-panel border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Bundle Name</th>
                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Products</th>
                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Bundle Disc %</th>
                  <th className="text-right px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Bundle Total</th>
                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((b) => {
                  const expanded = expandedIds.has(b.id);
                  return (
                    <React.Fragment key={b.id}>
                      <tr className="hover:bg-muted/30 transition-colors group">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => toggleExpand(b.id)}
                              className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                              title={expanded ? "Collapse" : "Expand products"}
                            >
                              {expanded
                                ? <ChevronDown className="w-4 h-4" />
                                : <ChevronRight className="w-4 h-4" />}
                            </button>
                            <div className="w-7 h-7 rounded bg-primary/10 flex items-center justify-center shrink-0">
                              <Package className="w-3.5 h-3.5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{b.name}</p>
                              {b.description && <p className="text-xs text-muted-foreground truncate max-w-xs">{b.description}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                          {b.items.length} product{b.items.length !== 1 ? "s" : ""}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {Number(b.bundle_discount_pct) > 0
                            ? <Badge variant="outline" className="text-[10px] text-green-600 border-green-500/30">{b.bundle_discount_pct}% off</Badge>
                            : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-foreground whitespace-nowrap">
                          {fmtMoney(bundleTotal(b))}
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={() => toggleMut.mutate({ id: b.id, is_active: !b.is_active })} className="flex items-center gap-1.5 text-xs font-medium">
                            {b.is_active
                              ? <><ToggleRight className="w-4 h-4 text-green-500" /><span className="text-green-600">Active</span></>
                              : <><ToggleLeft className="w-4 h-4 text-muted-foreground" /><span className="text-muted-foreground">Inactive</span></>}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-7 w-7" title="Edit" onClick={() => setEditBundle(b)}>
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-red-600" title="Delete"
                              onClick={() => { if (confirm(`Delete bundle "${b.name}"?`)) deleteMut.mutate(b.id); }}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>

                      {expanded && b.items.length > 0 && (
                        <tr className="bg-muted/20">
                          <td colSpan={6} className="px-4 py-0">
                            <div className="ml-9 border-l-2 border-primary/20 pl-4 py-2">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="text-muted-foreground">
                                    <th className="text-left py-1 pr-4 font-semibold uppercase tracking-wide">Product</th>
                                    <th className="text-left py-1 pr-4 font-semibold uppercase tracking-wide">Code</th>
                                    <th className="text-right py-1 pr-4 font-semibold uppercase tracking-wide">Qty</th>
                                    <th className="text-right py-1 pr-4 font-semibold uppercase tracking-wide">Unit Price</th>
                                    <th className="text-right py-1 pr-4 font-semibold uppercase tracking-wide">Disc %</th>
                                    <th className="text-right py-1 font-semibold uppercase tracking-wide">Line Total</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-border/50">
                                  {b.items.map((item) => {
                                    const unitPrice = item.unit_price_override != null
                                      ? Number(item.unit_price_override)
                                      : Number(item.default_unit_price);
                                    const lineTotal = unitPrice * Number(item.quantity) * (1 - Number(item.discount_pct) / 100);
                                    return (
                                      <tr key={item.id} className="text-foreground">
                                        <td className="py-1.5 pr-4 font-medium">{item.product_name}</td>
                                        <td className="py-1.5 pr-4 text-muted-foreground">{item.product_code ?? "—"}</td>
                                        <td className="py-1.5 pr-4 text-right">{Number(item.quantity)}</td>
                                        <td className="py-1.5 pr-4 text-right">{fmtMoney(unitPrice)}</td>
                                        <td className="py-1.5 pr-4 text-right">
                                          {Number(item.discount_pct) > 0
                                            ? <span className="text-green-600">{item.discount_pct}%</span>
                                            : <span className="text-muted-foreground">—</span>}
                                        </td>
                                        <td className="py-1.5 text-right font-semibold">{fmtMoney(lineTotal)}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}

                      {expanded && b.items.length === 0 && (
                        <tr className="bg-muted/20">
                          <td colSpan={6} className="px-4 py-3">
                            <p className="ml-9 text-xs text-muted-foreground italic">No products in this bundle.</p>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </Card>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-card border-border max-w-3xl max-h-[90vh]">
          <DialogHeader><DialogTitle>Create Product Bundle</DialogTitle></DialogHeader>
          <BundleForm products={products} onSave={(d) => createMut.mutateAsync(d)} onClose={() => setCreateOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editBundle} onOpenChange={(v) => { if (!v) setEditBundle(null); }}>
        <DialogContent className="bg-card border-border max-w-3xl max-h-[90vh]">
          <DialogHeader><DialogTitle>Edit Bundle</DialogTitle></DialogHeader>
          {editBundle && (
            <BundleForm
              initial={editBundle}
              products={products}
              onSave={(d) => updateMut.mutateAsync({ id: editBundle.id, data: d })}
              onClose={() => setEditBundle(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

