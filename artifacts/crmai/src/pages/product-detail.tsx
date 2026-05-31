import React, { useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import {
  useGetProduct, useUpdateProduct, useDeleteProduct,
  getGetProductQueryKey, getListProductsQueryKey, getListEntriesByProductQueryKey,
  type CreateProductInput,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Package, DollarSign, Trash2, Save } from "lucide-react";
import { ProductPricingManager } from "@/components/product-pricing-manager";
import { useCurrency } from "@/context/currency";
import { BASE_CURRENCY } from "@/lib/currency";
import { useToast } from "@/hooks/use-toast";

interface ProductFormData {
  name: string;
  code: string;
  description: string;
  unitPrice: string;
  currency: string;
  category: string;
  isActive: boolean;
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
      isActive: form.isActive,
    };
    try {
      await updateMutation.mutateAsync({ id: productId, data: payload });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getGetProductQueryKey(productId) }),
        queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getListEntriesByProductQueryKey(productId) }),
      ]);
      toast({ title: "Product updated" });
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
      <div className="flex flex-col gap-5 max-w-4xl mx-auto">
        <div>
          <Link href="/products">
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground mb-3 hover:text-foreground">
              <ArrowLeft className="w-4 h-4" /> Back to Products
            </Button>
          </Link>

          <Card className="glass-panel border-border">
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-border flex items-center justify-center shrink-0">
                  <Package className="w-7 h-7 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h1 className="text-2xl font-bold text-foreground truncate">{product.name}</h1>
                      <div className="flex flex-wrap items-center gap-3 mt-1.5">
                        {product.code && <span className="text-sm text-muted-foreground">{product.code}</span>}
                        {product.category && <span className="text-sm text-muted-foreground">{product.category}</span>}
                        <Badge variant="outline" className={product.isActive ? "border-green-500/30 text-green-600 bg-green-500/5" : "border-border text-muted-foreground"}>
                          {product.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-foreground tabular-nums">
                        {format(product.unitPrice)}
                      </div>
                      <div className="text-xs text-muted-foreground">Standard Price · base {BASE_CURRENCY}</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <Card className="glass-panel border-border">
            <CardContent className="p-5">
              <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <Package className="w-4 h-4 text-primary" /> Product Details
              </h2>
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
                    <Label htmlFor="d-category">Category</Label>
                    <Input id="d-category" className="bg-muted border-border"
                      value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="d-price">Unit Price ({BASE_CURRENCY}) *</Label>
                  <Input id="d-price" type="number" min="0" step="0.01" required className="bg-muted border-border"
                    value={form.unitPrice} onChange={e => setForm({ ...form, unitPrice: e.target.value })} />
                  <p className="text-xs text-muted-foreground">Entered in the base currency ({BASE_CURRENCY}); other currencies are converted automatically.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="d-desc">Description</Label>
                  <Input id="d-desc" className="bg-muted border-border"
                    value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="d-active" checked={form.isActive}
                    onChange={e => setForm({ ...form, isActive: e.target.checked })}
                    className="w-4 h-4 rounded border-white/20 accent-primary" />
                  <Label htmlFor="d-active" className="cursor-pointer">Active (available for quoting)</Label>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <Button type="button" variant="outline" onClick={() => setDeleteOpen(true)}
                    className="gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10">
                    <Trash2 className="w-4 h-4" /> Delete
                  </Button>
                  <Button type="submit" disabled={updateMutation.isPending}
                    className="gap-1.5 bg-primary hover:bg-primary/90 text-foreground">
                    <Save className="w-4 h-4" /> {updateMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="glass-panel border-border">
            <CardContent className="p-5">
              <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-primary" /> Pricing
              </h2>
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
