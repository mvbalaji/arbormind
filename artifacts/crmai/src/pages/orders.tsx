import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  useListOrders, useCreateOrder, useCreateOrderFromQuote, useUpdateOrder, useDeleteOrder,
  useListProducts, useListAccounts, useListContacts,
  getListOrdersQueryKey,
  type CreateQuoteItemInput,
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
import {
  ShoppingCart, MoreHorizontal, Trash2, CheckCircle, Truck, PackageCheck, XCircle,
  Plus, X, Package, Eye,
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const STATUS_COLORS: Record<string, string> = {
  pending: "border-yellow-500/30 text-yellow-600 bg-yellow-500/5",
  confirmed: "border-blue-500/30 text-blue-600 bg-blue-500/5",
  shipped: "border-purple-500/30 text-purple-600 bg-purple-500/5",
  delivered: "border-green-500/30 text-green-600 bg-green-500/5",
  cancelled: "border-red-500/30 text-red-600 bg-red-500/5",
};

const STATUS_TRANSITIONS: Record<string, { label: string; next: string; icon: typeof CheckCircle }[]> = {
  pending: [
    { label: "Confirm", next: "confirmed", icon: CheckCircle },
    { label: "Cancel", next: "cancelled", icon: XCircle },
  ],
  confirmed: [
    { label: "Mark Shipped", next: "shipped", icon: Truck },
    { label: "Cancel", next: "cancelled", icon: XCircle },
  ],
  shipped: [
    { label: "Mark Delivered", next: "delivered", icon: PackageCheck },
  ],
};

interface OrderItem {
  productId: number | null;
  productName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
}

interface OrderViewDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  order: {
    orderNumber: string;
    accountName?: string | null;
    contactName?: string | null;
    quoteNumber?: string | null;
    status: string;
    total: number;
    subtotal: number;
    discount: number;
    tax: number;
    notes?: string | null;
    orderDate: string;
    items: Array<{ productName: string; quantity: number; unitPrice: number; discount: number; total: number }>;
  };
}

function OrderViewDialog({ open, onOpenChange, order }: OrderViewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border text-foreground max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{order.orderNumber}</span>
            <Badge variant="outline" className={`capitalize ${STATUS_COLORS[order.status] ?? ""}`}>{order.status}</Badge>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-muted-foreground">Account:</span> <span className="font-medium">{order.accountName ?? "—"}</span></div>
            <div><span className="text-muted-foreground">Contact:</span> <span className="font-medium">{order.contactName ?? "—"}</span></div>
            <div><span className="text-muted-foreground">Quote:</span> <span className="font-medium">{order.quoteNumber ?? "—"}</span></div>
            <div><span className="text-muted-foreground">Date:</span> <span className="font-medium">{format(new Date(order.orderDate), "MMM d, yyyy")}</span></div>
          </div>

          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-3 py-2 text-left text-xs text-muted-foreground font-medium">Product</th>
                  <th className="px-3 py-2 text-right text-xs text-muted-foreground font-medium">Qty</th>
                  <th className="px-3 py-2 text-right text-xs text-muted-foreground font-medium">Price</th>
                  <th className="px-3 py-2 text-right text-xs text-muted-foreground font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {order.items.length === 0 ? (
                  <tr><td colSpan={4} className="px-3 py-4 text-center text-muted-foreground">No items</td></tr>
                ) : order.items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="px-3 py-2 text-foreground">{item.productName}</td>
                    <td className="px-3 py-2 text-right text-muted-foreground">{item.quantity}</td>
                    <td className="px-3 py-2 text-right text-muted-foreground">${item.unitPrice.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right font-medium">${item.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="text-sm space-y-1">
            <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>${order.subtotal.toFixed(2)}</span></div>
            {order.discount > 0 && <div className="flex justify-between text-muted-foreground"><span>Discount ({order.discount}%)</span><span>-${(order.subtotal * order.discount / 100).toFixed(2)}</span></div>}
            {order.tax > 0 && <div className="flex justify-between text-muted-foreground"><span>Tax ({order.tax}%)</span><span>${(order.subtotal * (1 - order.discount / 100) * order.tax / 100).toFixed(2)}</span></div>}
            <div className="flex justify-between font-bold text-foreground text-lg border-t border-border pt-2 mt-1"><span>Total</span><span>${order.total.toFixed(2)}</span></div>
          </div>

          {order.notes && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">Notes</h4>
              <p className="text-sm text-foreground">{order.notes}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CreateOrderDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [notes, setNotes] = useState("");
  const [discount, setDiscount] = useState("0");
  const [tax, setTax] = useState("0");
  const [items, setItems] = useState<OrderItem[]>([]);
  const { data: productsData } = useListProducts({ limit: 200 });
  const products = productsData?.data ?? [];
  const createMutation = useCreateOrder();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    if (open) { setNotes(""); setDiscount("0"); setTax("0"); setItems([]); }
  }, [open]);

  const lineTotal = (item: OrderItem) => item.quantity * item.unitPrice * (1 - item.discount / 100);
  const subtotal = items.reduce((sum, item) => sum + lineTotal(item), 0);
  const discountAmt = subtotal * (parseFloat(discount) || 0) / 100;
  const taxAmt = (subtotal - discountAmt) * (parseFloat(tax) || 0) / 100;
  const total = subtotal - discountAmt + taxAmt;

  const addItem = () => setItems(prev => [...prev, { productId: null, productName: "", quantity: 1, unitPrice: 0, discount: 0 }]);
  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));
  const updateItem = (idx: number, changes: Partial<OrderItem>) =>
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, ...changes } : item));
  const pickProduct = (idx: number, productId: number) => {
    const prod = products.find(p => p.id === productId);
    if (prod) updateItem(idx, { productId: prod.id, productName: prod.name, unitPrice: prod.unitPrice, discount: 0 });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const orderItems: CreateQuoteItemInput[] = items.filter(it => it.productName).map(it => ({
      productId: it.productId,
      productName: it.productName,
      quantity: it.quantity || 1,
      unitPrice: it.unitPrice || 0,
      discount: it.discount || 0,
    }));

    try {
      await createMutation.mutateAsync({
        data: {
          discount: parseFloat(discount) || 0,
          tax: parseFloat(tax) || 0,
          notes: notes || null,
          items: orderItems,
        },
      });
      toast({ title: "Order created" });
      void queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
      onOpenChange(false);
    } catch {
      toast({ title: "Error", description: "Could not create order.", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border text-foreground max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Order</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-sm font-semibold">Line Items</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem} className="border-border text-xs">
                <Plus className="w-3 h-3 mr-1" /> Add Item
              </Button>
            </div>
            {items.length === 0 ? (
              <div className="border border-dashed border-border rounded-lg p-6 text-center text-muted-foreground text-sm cursor-pointer hover:border-primary/30 transition-colors" onClick={addItem}>
                <Package className="w-6 h-6 mx-auto mb-2 opacity-40" />
                Click to add products
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
                {items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-muted/50 rounded-lg p-2">
                    <div className="col-span-4">
                      <select className="w-full h-8 px-2 rounded-md bg-muted border border-border text-foreground text-sm"
                        value={item.productId ?? ""}
                        onChange={e => {
                          const val = e.target.value;
                          if (val === "") updateItem(idx, { productId: null, productName: "", unitPrice: 0 });
                          else pickProduct(idx, parseInt(val));
                        }}>
                        <option value="">Custom / No product</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                      {!item.productId && (
                        <Input className="mt-1 h-7 text-xs bg-muted border-border" placeholder="Product name..."
                          value={item.productName} onChange={e => updateItem(idx, { productName: e.target.value })} />
                      )}
                    </div>
                    <div className="col-span-2">
                      <Input type="number" min="1" className="h-8 bg-muted border-border text-right text-sm"
                        value={item.quantity} onChange={e => updateItem(idx, { quantity: parseFloat(e.target.value) || 1 })} />
                    </div>
                    <div className="col-span-2">
                      <Input type="number" min="0" step="0.01" className="h-8 bg-muted border-border text-right text-sm"
                        value={item.unitPrice} onChange={e => updateItem(idx, { unitPrice: parseFloat(e.target.value) || 0 })} />
                    </div>
                    <div className="col-span-2">
                      <Input type="number" min="0" max="100" className="h-8 bg-muted border-border text-right text-sm"
                        value={item.discount} onChange={e => updateItem(idx, { discount: parseFloat(e.target.value) || 0 })} />
                    </div>
                    <div className="col-span-1 text-right text-sm font-medium text-foreground">${lineTotal(item).toFixed(2)}</div>
                    <div className="col-span-1 flex justify-end">
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-600"
                        onClick={() => removeItem(idx)}><X className="w-3 h-3" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {items.length > 0 && (
            <div className="border border-border rounded-lg p-4 space-y-2">
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs text-muted-foreground">Discount %</Label>
                  <Input type="number" min="0" max="100" className="h-8 bg-muted border-border text-sm"
                    value={discount} onChange={e => setDiscount(e.target.value)} /></div>
                <div><Label className="text-xs text-muted-foreground">Tax %</Label>
                  <Input type="number" min="0" className="h-8 bg-muted border-border text-sm"
                    value={tax} onChange={e => setTax(e.target.value)} /></div>
              </div>
              <div className="border-t border-border pt-2 mt-2 space-y-1 text-sm">
                <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
                {discountAmt > 0 && <div className="flex justify-between text-muted-foreground"><span>Discount ({discount}%)</span><span>-${discountAmt.toFixed(2)}</span></div>}
                {taxAmt > 0 && <div className="flex justify-between text-muted-foreground"><span>Tax ({tax}%)</span><span>${taxAmt.toFixed(2)}</span></div>}
                <div className="flex justify-between font-bold text-foreground text-base border-t border-border pt-1 mt-1"><span>Total</span><span>${total.toFixed(2)}</span></div>
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="o-notes">Notes</Label>
            <Input id="o-notes" className="bg-muted border-border" value={notes}
              onChange={e => setNotes(e.target.value)} placeholder="Internal notes..." />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="border-border">Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending} className="bg-primary hover:bg-primary/90 text-foreground">
              {createMutation.isPending ? "Creating..." : "Create Order"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Orders() {
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [viewingOrder, setViewingOrder] = useState<OrderViewDialogProps["order"] | null>(null);
  const { data, isLoading } = useListOrders();
  const createFromQuoteMutation = useCreateOrderFromQuote();
  const updateMutation = useUpdateOrder();
  const deleteMutation = useDeleteOrder();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [location, navigate] = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromQuote = params.get("fromQuote");
    if (fromQuote) {
      const quoteId = parseInt(fromQuote);
      if (quoteId > 0) {
        createFromQuoteMutation.mutateAsync({ quoteId })
          .then(() => {
            toast({ title: "Order created", description: "Order created from accepted quote." });
            void queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
            window.history.replaceState({}, "", window.location.pathname);
          })
          .catch(() => {
            toast({ title: "Error", description: "Could not create order from quote. Make sure the quote is accepted.", variant: "destructive" });
            window.history.replaceState({}, "", window.location.pathname);
          });
      }
    }
  }, []);

  const handleStatusChange = async (orderId: number, newStatus: string) => {
    try {
      await updateMutation.mutateAsync({ id: orderId, data: { status: newStatus } });
      toast({ title: "Status updated", description: `Order status changed to ${newStatus}` });
      void queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
    } catch {
      toast({ title: "Error", description: "Could not update order.", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (deletingId === null) return;
    try {
      await deleteMutation.mutateAsync({ id: deletingId });
      void queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
      toast({ title: "Order deleted" });
    } catch {
      toast({ title: "Error", description: "Could not delete order.", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground tracking-tight">Orders</h1>
            <p className="text-muted-foreground mt-1 text-sm">Manage customer orders and fulfillment.</p>
          </div>
          <Button onClick={() => setIsCreateOpen(true)} className="bg-primary text-foreground hover:bg-primary/90 shadow-lg shadow-primary/20">
            <Plus className="w-4 h-4 mr-2" /> Create Order
          </Button>
        </div>

        <Card className="glass-panel border-border">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-6 py-4 font-medium">Order #</th>
                  <th className="px-6 py-4 font-medium">Account</th>
                  <th className="px-6 py-4 font-medium">Quote</th>
                  <th className="px-6 py-4 font-medium text-right">Total</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Date</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr><td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">Loading...</td></tr>
                ) : data?.data?.length === 0 ? (
                  <tr><td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                    <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    No orders yet. Create an order or convert an accepted quote.
                  </td></tr>
                ) : data?.data?.map(order => (
                  <tr key={order.id} className="hover:bg-muted/50 transition-colors group">
                    <td className="px-6 py-4">
                      <button
                        className="font-medium text-primary hover:underline cursor-pointer font-mono"
                        onClick={() => setViewingOrder({
                          orderNumber: order.orderNumber,
                          accountName: order.accountName,
                          contactName: order.contactName,
                          quoteNumber: order.quoteNumber,
                          status: order.status,
                          total: order.total,
                          subtotal: order.subtotal,
                          discount: order.discount,
                          tax: order.tax,
                          notes: order.notes,
                          orderDate: order.orderDate,
                          items: order.items,
                        })}
                      >
                        {order.orderNumber}
                      </button>
                      {order.contactName && (
                        <div className="text-xs text-muted-foreground mt-1">{order.contactName}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {order.accountName ?? "—"}
                    </td>
                    <td className="px-6 py-4">
                      {order.quoteNumber ? (
                        <span
                          className="text-primary cursor-pointer hover:underline font-mono text-xs"
                          onClick={() => order.quoteId && navigate(`/quotes/${order.quoteId}`)}
                        >
                          {order.quoteNumber}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-foreground">
                      ${order.total.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className={`capitalize ${STATUS_COLORS[order.status] ?? ""}`}>
                        {order.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {format(new Date(order.orderDate), "MMM d, yyyy")}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-card border-border text-foreground">
                          <DropdownMenuItem
                            onClick={() => setViewingOrder({
                              orderNumber: order.orderNumber,
                              accountName: order.accountName,
                              contactName: order.contactName,
                              quoteNumber: order.quoteNumber,
                              status: order.status,
                              total: order.total,
                              subtotal: order.subtotal,
                              discount: order.discount,
                              tax: order.tax,
                              notes: order.notes,
                              orderDate: order.orderDate,
                              items: order.items,
                            })}
                            className="cursor-pointer hover:bg-muted"
                          >
                            <Eye className="w-4 h-4 mr-2" /> View Details
                          </DropdownMenuItem>
                          {(STATUS_TRANSITIONS[order.status] ?? []).length > 0 && <DropdownMenuSeparator className="bg-muted" />}
                          {(STATUS_TRANSITIONS[order.status] ?? []).map((t) => (
                            <DropdownMenuItem
                              key={t.next}
                              onClick={() => handleStatusChange(order.id, t.next)}
                              className={`cursor-pointer hover:bg-muted ${t.next === "cancelled" ? "text-red-600" : ""}`}
                            >
                              <t.icon className="w-4 h-4 mr-2" /> {t.label}
                            </DropdownMenuItem>
                          ))}
                          <DropdownMenuSeparator className="bg-muted" />
                          <DropdownMenuItem
                            onClick={() => setDeletingId(order.id)}
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

      <CreateOrderDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />

      {viewingOrder && (
        <OrderViewDialog
          open={!!viewingOrder}
          onOpenChange={(o) => { if (!o) setViewingOrder(null); }}
          order={viewingOrder}
        />
      )}

      <AlertDialog open={deletingId !== null} onOpenChange={(o) => { if (!o) setDeletingId(null); }}>
        <AlertDialogContent className="bg-card border-border text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Order?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This order and all its items will be permanently deleted.
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
