import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  useListOrders, useCreateOrderFromQuote, useUpdateOrder, useDeleteOrder,
  getListOrdersQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ShoppingCart, MoreHorizontal, Trash2, CheckCircle, Truck, PackageCheck, XCircle } from "lucide-react";
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

export default function Orders() {
  const [deletingId, setDeletingId] = useState<number | null>(null);
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
            <p className="text-muted-foreground mt-1 text-sm">Track orders created from accepted quotes.</p>
          </div>
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
                    No orders yet. Orders are created from accepted quotes.
                  </td></tr>
                ) : data?.data?.map(order => (
                  <tr key={order.id} className="hover:bg-muted/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-medium text-foreground font-mono">{order.orderNumber}</div>
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
                          {(STATUS_TRANSITIONS[order.status] ?? []).map((t) => (
                            <DropdownMenuItem
                              key={t.next}
                              onClick={() => handleStatusChange(order.id, t.next)}
                              className={`cursor-pointer hover:bg-muted ${t.next === "cancelled" ? "text-red-600" : ""}`}
                            >
                              <t.icon className="w-4 h-4 mr-2" /> {t.label}
                            </DropdownMenuItem>
                          ))}
                          {(STATUS_TRANSITIONS[order.status] ?? []).length > 0 && <DropdownMenuSeparator className="bg-muted" />}
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
