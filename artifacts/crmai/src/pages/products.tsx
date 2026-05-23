import React, { useState } from "react";
import {
  useListProducts, useCreateProduct, useUpdateProduct, useDeleteProduct,
  getListProductsQueryKey,
  type CreateProductInput,
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
import { Package, Plus, MoreHorizontal, Pencil, Trash2, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useColumnVisibility } from "@/hooks/use-column-visibility";
import { ColumnsMenu } from "@/components/columns-menu";
import { usePagination } from "@/hooks/use-pagination";
import { TablePagination } from "@/components/table-pagination";

type ProductColKey = "name" | "category" | "price" | "status";
const PRODUCT_TOGGLEABLE_COLS = [
  { key: "name" as const, label: "Name / Code" },
  { key: "category" as const, label: "Category" },
  { key: "price" as const, label: "Unit Price" },
  { key: "status" as const, label: "Status" },
];

interface ProductFormData {
  name: string;
  code: string;
  description: string;
  unitPrice: string;
  currency: string;
  category: string;
  isActive: boolean;
}

const defaultForm: ProductFormData = {
  name: "", code: "", description: "", unitPrice: "", currency: "USD", category: "", isActive: true,
};

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: "create" | "edit";
  initialData?: { id: number } & ProductFormData;
}

function ProductFormDialog({ open, onOpenChange, mode, initialData }: ProductFormDialogProps) {
  const [formData, setFormData] = useState<ProductFormData>(initialData ?? defaultForm);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  const isPending = createMutation.isPending || updateMutation.isPending;

  React.useEffect(() => {
    if (open) setFormData(initialData ?? defaultForm);
  }, [open, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.unitPrice) return;

    const payload: CreateProductInput = {
      name: formData.name,
      code: formData.code || null,
      description: formData.description || null,
      unitPrice: parseFloat(formData.unitPrice),
      currency: formData.currency || "USD",
      category: formData.category || null,
      isActive: formData.isActive,
    };

    try {
      if (mode === "create") {
        await createMutation.mutateAsync({ data: payload });
        toast({ title: "Product created", description: `${formData.name} added to catalog.` });
      } else if (initialData) {
        await updateMutation.mutateAsync({ id: initialData.id, data: payload });
        toast({ title: "Product updated" });
      }
      await queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
      onOpenChange(false);
    } catch {
      toast({ title: "Error", description: "Could not save product.", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border text-foreground max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add Product" : "Edit Product"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="p-name">Product Name *</Label>
            <Input id="p-name" required className="bg-muted border-border"
              value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="p-code">Product Code</Label>
              <Input id="p-code" className="bg-muted border-border"
                value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-category">Category</Label>
              <Input id="p-category" className="bg-muted border-border"
                value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="p-price">Unit Price *</Label>
              <Input id="p-price" type="number" min="0" step="0.01" required className="bg-muted border-border"
                value={formData.unitPrice} onChange={e => setFormData({ ...formData, unitPrice: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-currency">Currency</Label>
              <Input id="p-currency" className="bg-muted border-border"
                value={formData.currency} onChange={e => setFormData({ ...formData, currency: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="p-desc">Description</Label>
            <Input id="p-desc" className="bg-muted border-border"
              value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="p-active" checked={formData.isActive}
              onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-4 h-4 rounded border-white/20 accent-primary" />
            <Label htmlFor="p-active" className="cursor-pointer">Active (available for quoting)</Label>
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="border-border">Cancel</Button>
            <Button type="submit" disabled={isPending} className="bg-primary hover:bg-primary/90 text-foreground">
              {isPending ? "Saving..." : mode === "create" ? "Add Product" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Products() {
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<({ id: number } & ProductFormData) | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const { data, isLoading } = useListProducts({ search: search || undefined });
  const allProducts = data?.data ?? [];
  const productsPagination = usePagination("products", allProducts);
  const colVis = useColumnVisibility<ProductColKey>("col-visibility:products:v1", PRODUCT_TOGGLEABLE_COLS);
  const productColSpan = colVis.visible.size + 1;
  const deleteMutation = useDeleteProduct();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleDelete = async () => {
    if (deletingId === null) return;
    try {
      await deleteMutation.mutateAsync({ id: deletingId });
      await queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
      toast({ title: "Product deleted" });
    } catch {
      toast({ title: "Error", description: "Could not delete product.", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground tracking-tight">Products</h1>
            <p className="text-muted-foreground mt-1 text-sm">Product catalog and pricing.</p>
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                className="pl-9 bg-muted border-border w-56"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <Button onClick={() => setIsCreateOpen(true)} className="bg-primary text-foreground hover:bg-primary/90 shadow-lg shadow-primary/20">
              <Plus className="w-4 h-4 mr-2" /> Add Product
            </Button>
          </div>
        </div>

        <Card className="glass-panel border-2 border-blue-700 dark:border-blue-800">
          <div className="px-3 py-1.5 border-b border-border bg-muted/20 flex items-center justify-end">
            <ColumnsMenu columns={PRODUCT_TOGGLEABLE_COLS} isVisible={colVis.isVisible} toggle={colVis.toggle} showAll={colVis.showAll} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="sticky top-0 z-10">
                <tr className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800 border-b border-blue-800 divide-x divide-blue-500/40">
                  {colVis.isVisible("name") && <th className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-white leading-tight whitespace-nowrap">Name / Code</th>}
                  {colVis.isVisible("category") && <th className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-white leading-tight whitespace-nowrap">Category</th>}
                  {colVis.isVisible("price") && <th className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-white leading-tight whitespace-nowrap text-right">Unit Price</th>}
                  {colVis.isVisible("status") && <th className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-white leading-tight whitespace-nowrap">Status</th>}
                  <th className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-white leading-tight whitespace-nowrap text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr><td colSpan={productColSpan} className="px-6 py-8 text-center text-muted-foreground">Loading...</td></tr>
                ) : data?.data?.length === 0 ? (
                  <tr><td colSpan={productColSpan} className="px-6 py-12 text-center text-muted-foreground">
                    <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    No products found. Add your first product to start quoting.
                  </td></tr>
                ) : productsPagination.paged.map(prod => (
                  <tr key={prod.id} className="hover:bg-muted/50 transition-colors group">
                    {colVis.isVisible("name") && (
                      <td className="px-3 py-2">
                        <div className="font-medium text-foreground flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <Package className="w-4 h-4 text-primary" />
                          </div>
                          {prod.name}
                        </div>
                        {prod.code && <div className="text-xs text-muted-foreground mt-1 ml-10 font-mono">{prod.code}</div>}
                      </td>
                    )}
                    {colVis.isVisible("category") && (
                      <td className="px-3 py-2 text-muted-foreground">{prod.category || "-"}</td>
                    )}
                    {colVis.isVisible("price") && (
                      <td className="px-3 py-2 text-right font-semibold text-foreground">
                        ${prod.unitPrice.toLocaleString()} <span className="text-xs text-muted-foreground">{prod.currency}</span>
                      </td>
                    )}
                    {colVis.isVisible("status") && (
                      <td className="px-3 py-2">
                        <Badge variant="outline" className={prod.isActive ? "border-green-500/30 text-green-600 bg-green-500/5" : "border-border text-muted-foreground"}>
                          {prod.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                    )}
                    <td className="px-3 py-2 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-card border-border text-foreground">
                          <DropdownMenuItem
                            onClick={() => setEditingProduct({
                              id: prod.id,
                              name: prod.name,
                              code: prod.code ?? "",
                              description: prod.description ?? "",
                              unitPrice: prod.unitPrice.toString(),
                              currency: prod.currency,
                              category: prod.category ?? "",
                              isActive: prod.isActive,
                            })}
                            className="cursor-pointer hover:bg-muted"
                          >
                            <Pencil className="w-4 h-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-muted" />
                          <DropdownMenuItem
                            onClick={() => setDeletingId(prod.id)}
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
          <TablePagination
            page={productsPagination.page}
            totalPages={productsPagination.totalPages}
            pageSize={productsPagination.pageSize}
            total={productsPagination.total}
            pageStart={productsPagination.pageStart}
            pageEnd={productsPagination.pageEnd}
            onPageChange={productsPagination.setPage}
            onPageSizeChange={productsPagination.setPageSize}
          />
        </Card>
      </div>

      <ProductFormDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} mode="create" />
      <ProductFormDialog
        open={!!editingProduct}
        onOpenChange={(o) => { if (!o) setEditingProduct(null); }}
        mode="edit"
        initialData={editingProduct ?? undefined}
      />
      <AlertDialog open={deletingId !== null} onOpenChange={(o) => { if (!o) setDeletingId(null); }}>
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
