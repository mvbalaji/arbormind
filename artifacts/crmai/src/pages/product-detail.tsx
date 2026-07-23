import React, { useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import {
  useGetProduct, useUpdateProduct, useDeleteProduct,
  getGetProductQueryKey, getListProductsQueryKey, getListEntriesByProductQueryKey,
  type CreateProductInput,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Package, DollarSign, Trash2, Save, Pencil, X } from "lucide-react";
import { ProductPricingManager } from "@/components/product-pricing-manager";
import { useCurrency } from "@/context/currency";
import { BASE_CURRENCY } from "@/lib/currency";
import { useToast } from "@/hooks/use-toast";

// Salesforce Product Family picklist values
const PRODUCT_FAMILY_OPTIONS = [
  "Consulting", "Education", "Hardware", "Installation",
  "Other", "Services", "Software", "Training",
];

// Salesforce Quantity Unit of Measure picklist values
const UOM_OPTIONS = [
  "Each", "Hour", "Day", "Week", "Month", "Year",
  "Seat", "License", "GB", "TB",
];

interface ProductFormData {
  name: string;
  code: string;
  description: string;
  unitPrice: string;
  currency: string;
  category: string;
  quantityUnitOfMeasure: string;
  isActive: boolean;
}

function ReadonlyField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm text-foreground min-h-[1.25rem]">{value ?? <span className="text-muted-foreground">—</span>}</div>
    </div>
  );
}

export default function ProductDetail() {
  const params = useParams<{ id: string }>();
  const { format } = useCurrency();
  const productId = parseInt(params.id ?? "0");
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: product, isLoading } = useGetProduct(productId, {
    query: { enabled: productId > 0, queryKey: getGetProductQueryKey(productId) },
  });

  const [form, setForm] = useState<ProductFormData | null>(null);
  const [editing, setEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const updateMutation = useUpdateProduct();
  const deleteMutation = useDeleteProduct();

  React.useEffect(() => {
    if (product) {
      setForm({
        name: product.name,
        code: product.code ?? "",
        description: product.description ?? "",
        unitPrice: product.unitPrice.toString(),
        currency: product.currency,
        category: product.category ?? "",
        quantityUnitOfMeasure: (product as any).quantityUnitOfMeasure ?? "",
        isActive: product.isActive,
      });
    }
  }, [product]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form || !form.name || !form.unitPrice) return;
    const payload: CreateProductInput = {
      name: form.name,
      code: form.code || null,
      description: form.description || null,
      unitPrice: parseFloat(form.unitPrice),
      currency: BASE_CURRENCY,
      category: form.category || null,
      quantityUnitOfMeasure: form.quantityUnitOfMeasure || null,
      isActive: form.isActive,
    };
    try {
      await updateMutation.mutateAsync({ id: productId, data: payload });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getGetProductQueryKey(productId) }),
        queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getListEntriesByProductQueryKey(productId) }),
      ]);
      toast({ title: "Product saved" });
      setEditing(false);
    } catch {
      toast({ title: "Error", description: "Could not save product.", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync({ id: productId });
      await queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
      toast({ title: "Product deleted" });
      navigate("/products");
    } catch {
      toast({ title: "Error", description: "Could not delete product.", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  if (!product || !form) {
    return (
      <Layout>
        <div className="text-center py-20 text-muted-foreground">Product not found.</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex flex-col gap-4">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Link href="/products" className="hover:text-foreground transition-colors">Products</Link>
          <span>/</span>
          <span className="text-foreground">{product.name}</span>
        </div>

        {/* Record Header — Salesforce-style highlight panel */}
        <Card className="glass-panel border-border">
          <CardContent className="p-0">
            {/* Top action bar */}
            <div className="flex items-center justify-between px-5 py-2.5 border-b border-border">
              <div className="flex items-center gap-2">
                <Link href="/products">
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                </Link>
                <span className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Product</span>
              </div>
              <div className="flex items-center gap-2">
                {!editing ? (
                  <>
                    <Button variant="outline" size="sm" onClick={() => setEditing(true)}
                      className="h-7 text-xs border-border gap-1">
                      <Pencil className="w-3 h-3" /> Edit
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setDeleteOpen(true)}
                      className="h-7 text-xs border-destructive/30 text-destructive hover:bg-destructive/10 gap-1">
                      <Trash2 className="w-3 h-3" /> Delete
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" size="sm" onClick={() => { setEditing(false); setForm({ name: product.name, code: product.code ?? "", description: product.description ?? "", unitPrice: product.unitPrice.toString(), currency: product.currency, category: product.category ?? "", quantityUnitOfMeasure: (product as any).quantityUnitOfMeasure ?? "", isActive: product.isActive }); }}
                      className="h-7 text-xs border-border gap-1">
                      <X className="w-3 h-3" /> Cancel
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending}
                      className="h-7 text-xs bg-primary hover:bg-primary/90 text-foreground gap-1">
                      <Save className="w-3 h-3" /> {updateMutation.isPending ? "Saving..." : "Save"}
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Record highlight */}
            <div className="px-5 py-4 bg-primary/5 border-b border-border">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 border border-border flex items-center justify-center shrink-0">
                  <Package className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-xl font-bold text-foreground">{product.name}</h1>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    {product.code && <span className="text-xs text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">{product.code}</span>}
                    {product.category && <span className="text-xs text-muted-foreground">{product.category}</span>}
                    <Badge variant="outline" className={product.isActive ? "border-green-500/30 text-green-600 bg-green-500/5 text-[10px]" : "border-border text-muted-foreground text-[10px]"}>
                      {product.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xl font-bold text-foreground tabular-nums">{format(product.unitPrice)}</div>
                  <div className="text-[11px] text-muted-foreground">Standard Price Â· {BASE_CURRENCY}</div>
                </div>
              </div>
            </div>

            {/* Key fields highlight row — Salesforce style */}
            <div className="px-5 py-3 grid grid-cols-4 gap-4 border-b border-border bg-muted/10">
              <ReadonlyField label="Product Code" value={product.code || "—"} />
              <ReadonlyField label="Product Family" value={product.category || "—"} />
              <ReadonlyField label="Unit of Measure" value={(product as any).quantityUnitOfMeasure || "—"} />
              <ReadonlyField label="Active" value={product.isActive ? "Yes" : "No"} />
            </div>
          </CardContent>
        </Card>

        {/* Details + Pricing two-column layout */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Product Information */}
          <Card className="glass-panel border-border">
            <CardHeader className="px-5 pt-4 pb-2">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Package className="w-4 h-4 text-primary" /> Product Information
              </h2>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              {editing ? (
                <form onSubmit={handleSave} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="d-name">Product Name *</Label>
                    <Input id="d-name" required className="bg-muted border-border"
                      value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="d-code">Product Code</Label>
                      <Input id="d-code" className="bg-muted border-border"
                        value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="d-family">Product Family</Label>
                      <select id="d-family" className="w-full h-9 px-3 rounded-md bg-muted border border-border text-sm"
                        value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                        <option value="" className="bg-card">--None--</option>
                        {PRODUCT_FAMILY_OPTIONS.map(f => (
                          <option key={f} value={f} className="bg-card">{f}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="d-price">Standard Price ({BASE_CURRENCY}) *</Label>
                      <Input id="d-price" type="number" min="0" step="0.01" required className="bg-muted border-border"
                        value={form.unitPrice} onChange={e => setForm({ ...form, unitPrice: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="d-uom">Quantity Unit of Measure</Label>
                      <select id="d-uom" className="w-full h-9 px-3 rounded-md bg-muted border border-border text-sm"
                        value={form.quantityUnitOfMeasure} onChange={e => setForm({ ...form, quantityUnitOfMeasure: e.target.value })}>
                        <option value="" className="bg-card">--None--</option>
                        {UOM_OPTIONS.map(u => (
                          <option key={u} value={u} className="bg-card">{u}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="d-desc">Product Description</Label>
                    <Input id="d-desc" className="bg-muted border-border"
                      value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="d-active" checked={form.isActive}
                      onChange={e => setForm({ ...form, isActive: e.target.checked })}
                      className="w-4 h-4 rounded border-white/20 accent-primary" />
                    <Label htmlFor="d-active" className="cursor-pointer">Active</Label>
                  </div>
                </form>
              ) : (
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <ReadonlyField label="Product Name" value={product.name} />
                  <ReadonlyField label="Product Code" value={product.code} />
                  <ReadonlyField label="Product Family" value={product.category} />
                  <ReadonlyField label="Quantity Unit of Measure" value={(product as any).quantityUnitOfMeasure} />
                  <ReadonlyField label="Standard Price" value={format(product.unitPrice)} />
                  <ReadonlyField label="Active" value={product.isActive ? "Yes" : "No"} />
                  <div className="col-span-2">
                    <ReadonlyField label="Product Description" value={product.description} />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pricing */}
          <Card className="glass-panel border-border">
            <CardHeader className="px-5 pt-4 pb-2">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-primary" /> Price Book Entries
              </h2>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <ProductPricingManager productId={productId} unitPrice={product.unitPrice} />
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-card border-border text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This product will be removed from the catalog. Existing quotes will not be affected.
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

