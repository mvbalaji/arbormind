import React, { useState } from "react";
import { Link } from "wouter";
import { useColResize } from "@/hooks/use-col-resize";
import { ColResizeHandle } from "@/components/col-resize-handle";
import {
  useListProducts, useCreateProduct, useUpdateProduct, useDeleteProduct,
  getListProductsQueryKey,
  type CreateProductInput,
} from "@workspace/api-client-react";
import { ProductPricingManager } from "@/components/product-pricing-manager";
import { useCurrency } from "@/context/currency";
import { BASE_CURRENCY } from "@/lib/currency";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { ListPageHeader } from "@/components/list-page-header";
import { isRecentlyCreated } from "@/lib/utils";
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
import { Package, Plus, MoreHorizontal, Pencil, Trash2, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useColumnVisibility } from "@/hooks/use-column-visibility";
import { ColumnsMenu } from "@/components/columns-menu";
import { usePagination } from "@/hooks/use-pagination";
import { TablePagination } from "@/components/table-pagination";

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

type ProductColKey = "name" | "productFamily" | "uom" | "price" | "status";
const PRODUCT_TOGGLEABLE_COLS = [
  { key: "name" as const, label: "Name / Code" },
  { key: "productFamily" as const, label: "Product Family" },
  { key: "uom" as const, label: "Unit of Measure" },
  { key: "price" as const, label: "Standard Price" },
  { key: "status" as const, label: "Active" },
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

const defaultForm: ProductFormData = {
  name: "", code: "", description: "", unitPrice: "", currency: BASE_CURRENCY,
  category: "", quantityUnitOfMeasure: "", isActive: true,
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
      currency: BASE_CURRENCY,
      category: formData.category || null,
      quantityUnitOfMeasure: formData.quantityUnitOfMeasure || null,
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
          <DialogTitle>{mode === "create" ? "New Product" : "Edit Product"}</DialogTitle>
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
              <Label htmlFor="p-family">Product Family</Label>
              <select id="p-family" className="w-full h-9 px-3 rounded-md bg-muted border border-border text-sm"
                value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                <option value="" className="bg-card">--None--</option>
                {PRODUCT_FAMILY_OPTIONS.map(f => (
                  <option key={f} value={f} className="bg-card">{f}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="p-price">Standard Price ({BASE_CURRENCY}) *</Label>
              <Input id="p-price" type="number" min="0" step="0.01" required className="bg-muted border-border"
                value={formData.unitPrice} onChange={e => setFormData({ ...formData, unitPrice: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-uom">Quantity Unit of Measure</Label>
              <select id="p-uom" className="w-full h-9 px-3 rounded-md bg-muted border border-border text-sm"
                value={formData.quantityUnitOfMeasure} onChange={e => setFormData({ ...formData, quantityUnitOfMeasure: e.target.value })}>
                <option value="" className="bg-card">--None--</option>
                {UOM_OPTIONS.map(u => (
                  <option key={u} value={u} className="bg-card">{u}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="p-desc">Product Description</Label>
            <Input id="p-desc" className="bg-muted border-border"
              value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="p-active" checked={formData.isActive}
              onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-4 h-4 rounded border-white/20 accent-primary" />
            <Label htmlFor="p-active" className="cursor-pointer">Active</Label>
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="border-border">Cancel</Button>
            <Button type="submit" disabled={isPending} className="bg-primary hover:bg-primary/90 text-foreground">
              {isPending ? "Saving..." : mode === "create" ? "Save" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface ManagePricingProduct {
  id: number;
  name: string;
  currency: string;
  unitPrice: number;
}

function ManageProductPricingDialog({
  product,
  open,
  onOpenChange,
}: {
  product: ManagePricingProduct | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border text-foreground max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" />
            Manage Pricing{product ? ` — ${product.name}` : ""}
          </DialogTitle>
        </DialogHeader>
        <div className="mt-2">
          {product && (
            <ProductPricingManager productId={product.id} unitPrice={product.unitPrice} enabled={open} />
          )}
        </div>
        <DialogFooter className="pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="border-border">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const PRODUCTS_COL_KEYS = ["name","productFamily","uom","price","status","actions"] as const;
const PRODUCTS_COL_DEFAULTS: Record<typeof PRODUCTS_COL_KEYS[number], number> = {"name":240,"productFamily":140,"uom":130,"price":130,"status":80,"actions":120};

const VIEW_OPTIONS = [
  { label: "All Products", value: "all", pinned: true },
  { label: "Active Products", value: "active", pinned: true },
  { label: "Recently Created", value: "recent" },
];

export default function Products() {
  const { format } = useCurrency();
  const { widths: colWidths, startResize: startColResize } = useColResize("col-widths:products:v2", PRODUCTS_COL_KEYS, PRODUCTS_COL_DEFAULTS);
  const [search, setSearch] = useState("");
  const [activeView, setActiveView] = useState(VIEW_OPTIONS[0]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<({ id: number } & ProductFormData) | null>(null);
  const [managingProduct, setManagingProduct] = useState<ManagePricingProduct | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const { data, isLoading } = useListProducts({ search: search || undefined });
  const allProducts = data?.data ?? [];
  const products = allProducts.filter((p) => {
    if (activeView.value === "active") return p.isActive;
    if (activeView.value === "recent") return isRecentlyCreated(p.createdAt);
    return true;
  });
  const productsPagination = usePagination("products", products);
  const colVis = useColumnVisibility<ProductColKey>("col-visibility:products:v2", PRODUCT_TOGGLEABLE_COLS);
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
      <div className="flex flex-col gap-3">
        <ListPageHeader
          icon={Package}
          title="Products"
          viewLabel="All Products"
          viewOptions={VIEW_OPTIONS}
          activeView={activeView.value}
          onViewChange={(val) => { const v = VIEW_OPTIONS.find((o) => o.value === val); if (v) setActiveView(v); }}
          search={{ value: search, onChange: setSearch, placeholder: "Search products..." }}
          aiEntityType="products"
          onNew={() => setIsCreateOpen(true)}
          newLabel="New"
        />

        <Card className="glass-panel border-0 overflow-hidden">
          <div className="px-3 py-1 border-b border-border bg-muted/20 flex items-center justify-end">
            <TablePagination
              variant="inline"
              page={productsPagination.page}
              totalPages={productsPagination.totalPages}
              pageSize={productsPagination.pageSize}
              total={productsPagination.total}
              pageStart={productsPagination.pageStart}
              pageEnd={productsPagination.pageEnd}
              onPageChange={productsPagination.setPage}
              onPageSizeChange={productsPagination.setPageSize}
            />
            <ColumnsMenu columns={PRODUCT_TOGGLEABLE_COLS} isVisible={colVis.isVisible} toggle={colVis.toggle} showAll={colVis.showAll} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left [&_tbody_td]:whitespace-nowrap">
              <colgroup>
                {colVis.isVisible("name") && <col data-col="name" style={{ width: `${colWidths.name}px` }} />}
                {colVis.isVisible("productFamily") && <col data-col="productFamily" style={{ width: `${colWidths.productFamily}px` }} />}
                {colVis.isVisible("uom") && <col data-col="uom" style={{ width: `${colWidths.uom}px` }} />}
                {colVis.isVisible("price") && <col data-col="price" style={{ width: `${colWidths.price}px` }} />}
                {colVis.isVisible("status") && <col data-col="status" style={{ width: `${colWidths.status}px` }} />}
                <col data-col="actions" style={{ width: `${colWidths.actions}px` }} />
              </colgroup>
              <thead className="sticky top-0 z-10">
                <tr className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800 border-b border-blue-800 divide-x divide-blue-500/40">
                  {colVis.isVisible("name") && <th className="relative px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-white leading-tight whitespace-nowrap">Product Name<ColResizeHandle onMouseDown={startColResize("name")} /></th>}
                  {colVis.isVisible("productFamily") && <th className="relative px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-white leading-tight whitespace-nowrap">Product Family<ColResizeHandle onMouseDown={startColResize("productFamily")} /></th>}
                  {colVis.isVisible("uom") && <th className="relative px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-white leading-tight whitespace-nowrap">Unit of Measure<ColResizeHandle onMouseDown={startColResize("uom")} /></th>}
                  {colVis.isVisible("price") && <th className="relative px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-white leading-tight whitespace-nowrap text-right">Standard Price<ColResizeHandle onMouseDown={startColResize("price")} /></th>}
                  {colVis.isVisible("status") && <th className="relative px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-white leading-tight whitespace-nowrap text-center">Active<ColResizeHandle onMouseDown={startColResize("status")} /></th>}
                  <th className="relative px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-white leading-tight whitespace-nowrap text-right">Actions<ColResizeHandle onMouseDown={startColResize("actions")} /></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr><td colSpan={productColSpan} className="px-6 py-8 text-center text-muted-foreground">Loading...</td></tr>
                ) : products.length === 0 ? (
                  <tr><td colSpan={productColSpan} className="px-6 py-12 text-center text-muted-foreground">
                    <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    No products found. Click <strong>New</strong> to add your first product.
                  </td></tr>
                ) : productsPagination.paged.map(prod => (
                  <tr key={prod.id} className="hover:bg-muted/50 transition-colors group">
                    {colVis.isVisible("name") && (
                      <td className="px-3 py-1">
                        <Link href={`/products/${prod.id}`} className="font-medium text-primary hover:underline flex items-center gap-2 transition-colors">
                          <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                            <Package className="w-4 h-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <div className="hover:underline">{prod.name}</div>
                            {prod.code && <div className="text-xs text-muted-foreground font-normal">{prod.code}</div>}
                          </div>
                        </Link>
                      </td>
                    )}
                    {colVis.isVisible("productFamily") && (
                      <td className="px-3 py-1 text-muted-foreground">{prod.category || "-"}</td>
                    )}
                    {colVis.isVisible("uom") && (
                      <td className="px-3 py-1 text-muted-foreground">{prod.quantityUnitOfMeasure || "-"}</td>
                    )}
                    {colVis.isVisible("price") && (
                      <td className="px-3 py-1 text-right font-semibold text-foreground">
                        {format(prod.unitPrice)}
                      </td>
                    )}
                    {colVis.isVisible("status") && (
                      <td className="px-3 py-1 text-center">
                        {prod.isActive ? (
                          <span className="inline-block w-4 h-4 rounded-sm bg-green-500/20 border border-green-500/40 text-green-600 text-[10px] flex items-center justify-center">✓</span>
                        ) : (
                          <span className="inline-block w-4 h-4 rounded-sm border border-border" />
                        )}
                      </td>
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
                            onClick={() => setEditingProduct({
                              id: prod.id,
                              name: prod.name,
                              code: prod.code ?? "",
                              description: prod.description ?? "",
                              unitPrice: prod.unitPrice.toString(),
                              currency: prod.currency,
                              category: prod.category ?? "",
                              quantityUnitOfMeasure: prod.quantityUnitOfMeasure ?? "",
                              isActive: prod.isActive,
                            })}
                            className="cursor-pointer hover:bg-muted"
                          >
                            <Pencil className="w-4 h-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setManagingProduct({
                              id: prod.id,
                              name: prod.name,
                              currency: prod.currency,
                              unitPrice: prod.unitPrice,
                            })}
                            className="cursor-pointer hover:bg-muted"
                          >
                            <DollarSign className="w-4 h-4 mr-2" /> Manage Pricing
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
        </Card>
      </div>

      <ProductFormDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} mode="create" />
      <ProductFormDialog
        open={!!editingProduct}
        onOpenChange={(o) => { if (!o) setEditingProduct(null); }}
        mode="edit"
        initialData={editingProduct ?? undefined}
      />
      <ManageProductPricingDialog
        product={managingProduct}
        open={!!managingProduct}
        onOpenChange={(o) => { if (!o) setManagingProduct(null); }}
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
