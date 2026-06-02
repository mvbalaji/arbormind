import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  useListContracts, useCreateContract, useActivateContract, useTerminateContract,
  useRenewContract, useDeleteContract,
  useListProducts, useListAccounts,
  getListContractsQueryKey,
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
  FileSignature, MoreHorizontal, Trash2, CheckCircle, XCircle, RefreshCw,
  Plus, X, Package, Eye, ChevronRight, ChevronDown,
} from "lucide-react";
import { format } from "date-fns";
import { useCurrency } from "@/context/currency";
import { useToast } from "@/hooks/use-toast";
import { isRecentlyCreated } from "@/lib/utils";
import { ContractRevisions } from "@/components/contract-revisions";

export const CONTRACT_STATUS_COLORS: Record<string, string> = {
  draft: "border-gray-500/30 text-gray-600 bg-gray-500/5",
  in_approval: "border-yellow-500/30 text-yellow-600 bg-yellow-500/5",
  activated: "border-green-500/30 text-green-600 bg-green-500/5",
  expired: "border-orange-500/30 text-orange-600 bg-orange-500/5",
  terminated: "border-red-500/30 text-red-600 bg-red-500/5",
  cancelled: "border-red-500/30 text-red-600 bg-red-500/5",
};

export function contractStatusLabel(status: string): string {
  return status === "in_approval" ? "In Approval" : status.charAt(0).toUpperCase() + status.slice(1);
}

interface ContractLineItem {
  productId: number | null;
  productName: string;
  quantity: number;
  listPrice: number;
  unitPrice: number;
  discount: number;
}

function CreateContractDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [name, setName] = useState("");
  const [accountId, setAccountId] = useState<string>("");
  const [startDate, setStartDate] = useState("");
  const [termMonths, setTermMonths] = useState("12");
  const [autoRenew, setAutoRenew] = useState(false);
  const [renewalTermMonths, setRenewalTermMonths] = useState("12");
  const [description, setDescription] = useState("");
  const [items, setItems] = useState<ContractLineItem[]>([]);
  const { data: productsData } = useListProducts({ limit: 200 });
  const { data: accountsData } = useListAccounts({ limit: 200 });
  const products = productsData?.data ?? [];
  const accounts = accountsData?.data ?? [];
  const createMutation = useCreateContract();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { format: fmtMoney } = useCurrency();

  useEffect(() => {
    if (open) {
      setName(""); setAccountId(""); setStartDate(""); setTermMonths("12");
      setAutoRenew(false); setRenewalTermMonths("12"); setDescription(""); setItems([]);
    }
  }, [open]);

  const lineTotal = (item: ContractLineItem) => item.quantity * item.unitPrice * (1 - item.discount / 100);
  const subtotal = items.reduce((sum, item) => sum + lineTotal(item), 0);

  const addItem = () => setItems(prev => [...prev, { productId: null, productName: "", quantity: 1, listPrice: 0, unitPrice: 0, discount: 0 }]);
  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));
  const updateItem = (idx: number, changes: Partial<ContractLineItem>) =>
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, ...changes } : item));
  const pickProduct = (idx: number, productId: number) => {
    const prod = products.find(p => p.id === productId);
    if (prod) updateItem(idx, { productId: prod.id, productName: prod.name, listPrice: prod.unitPrice, unitPrice: prod.unitPrice, discount: 0 });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createMutation.mutateAsync({
        data: {
          name: name || undefined,
          accountId: accountId ? parseInt(accountId) : null,
          startDate: startDate || null,
          contractTermMonths: termMonths ? parseInt(termMonths) : null,
          autoRenew,
          renewalTermMonths: renewalTermMonths ? parseInt(renewalTermMonths) : null,
          description: description || null,
          items: items.filter(it => it.productName).map(it => ({
            productId: it.productId,
            productName: it.productName,
            quantity: it.quantity || 1,
            listPrice: it.listPrice || 0,
            unitPrice: it.unitPrice || 0,
            discount: it.discount || 0,
          })),
        },
      });
      toast({ title: "Contract created" });
      void queryClient.invalidateQueries({ queryKey: getListContractsQueryKey() });
      onOpenChange(false);
    } catch {
      toast({ title: "Error", description: "Could not create contract.", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border text-foreground max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Contract</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="c-name">Contract Name</Label>
              <Input id="c-name" className="bg-muted border-border" value={name}
                onChange={e => setName(e.target.value)} placeholder="Auto-generated if blank" />
            </div>
            <div>
              <Label>Account</Label>
              <select className="w-full h-10 px-3 rounded-md bg-muted border border-border text-foreground text-sm"
                value={accountId} onChange={e => setAccountId(e.target.value)}>
                <option value="">— Select account —</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <Label htmlFor="c-start">Start Date</Label>
              <Input id="c-start" type="date" className="bg-muted border-border" value={startDate}
                onChange={e => setStartDate(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="c-term">Contract Term (months)</Label>
              <Input id="c-term" type="number" min="1" className="bg-muted border-border" value={termMonths}
                onChange={e => setTermMonths(e.target.value)} />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input id="c-autorenew" type="checkbox" checked={autoRenew}
                onChange={e => setAutoRenew(e.target.checked)} className="h-4 w-4" />
              <Label htmlFor="c-autorenew" className="cursor-pointer">Auto-renew</Label>
            </div>
            {autoRenew && (
              <div>
                <Label htmlFor="c-renewterm">Renewal Term (months)</Label>
                <Input id="c-renewterm" type="number" min="1" className="bg-muted border-border" value={renewalTermMonths}
                  onChange={e => setRenewalTermMonths(e.target.value)} />
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-sm font-semibold">Contracted Pricing</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem} className="border-border text-xs">
                <Plus className="w-3 h-3 mr-1" /> Add Product
              </Button>
            </div>
            {items.length === 0 ? (
              <div className="border border-dashed border-border rounded-lg p-6 text-center text-muted-foreground text-sm cursor-pointer hover:border-primary/30 transition-colors" onClick={addItem}>
                <Package className="w-6 h-6 mx-auto mb-2 opacity-40" />
                Add products with negotiated contract prices
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-12 gap-2 text-xs text-muted-foreground uppercase px-1 mb-1">
                  <span className="col-span-4">Product</span>
                  <span className="col-span-2 text-right">Qty</span>
                  <span className="col-span-2 text-right">Contract Price</span>
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
                          if (val === "") updateItem(idx, { productId: null, productName: "", listPrice: 0, unitPrice: 0 });
                          else pickProduct(idx, parseInt(val));
                        }}>
                        <option value="">Custom / No product</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                      {!item.productId && (
                        <Input className="mt-1 h-7 text-xs bg-muted border-border" placeholder="Product name..."
                          value={item.productName} onChange={e => updateItem(idx, { productName: e.target.value })} />
                      )}
                      {item.productId != null && item.listPrice > 0 && (
                        <p className="mt-1 text-[10px] text-muted-foreground">List: {fmtMoney(item.listPrice)}</p>
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
                    <div className="col-span-1 text-right text-sm font-medium text-foreground">{fmtMoney(lineTotal(item))}</div>
                    <div className="col-span-1 flex justify-end">
                      <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-red-600"
                        onClick={() => removeItem(idx)}><X className="w-3 h-3" /></Button>
                    </div>
                  </div>
                ))}
                <div className="flex justify-between text-sm font-medium border-t border-border pt-2 mt-2">
                  <span className="text-muted-foreground">Contract Value</span>
                  <span>{fmtMoney(subtotal)}</span>
                </div>
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="c-desc">Description</Label>
            <Input id="c-desc" className="bg-muted border-border" value={description}
              onChange={e => setDescription(e.target.value)} placeholder="Contract description..." />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="border-border">Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending} className="bg-primary hover:bg-primary/90 text-foreground">
              {createMutation.isPending ? "Creating..." : "Create Contract"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Contracts() {
  const [, navigate] = useLocation();
  const [createOpen, setCreateOpen] = useState(false);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [terminateId, setTerminateId] = useState<number | null>(null);
  const [terminateReason, setTerminateReason] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const { data, isLoading } = useListContracts({ limit: 100 });
  const activateMutation = useActivateContract();
  const terminateMutation = useTerminateContract();
  const renewMutation = useRenewContract();
  const deleteMutation = useDeleteContract();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { format: fmtMoney } = useCurrency();

  const contracts = data?.data ?? [];
  const refresh = () => queryClient.invalidateQueries({ queryKey: getListContractsQueryKey() });

  const handleActivate = async (id: number) => {
    try {
      await activateMutation.mutateAsync({ id });
      toast({ title: "Contract activated" });
      refresh();
    } catch {
      toast({ title: "Error", description: "Could not activate contract.", variant: "destructive" });
    }
  };

  const handleTerminate = async () => {
    if (terminateId == null) return;
    try {
      await terminateMutation.mutateAsync({ id: terminateId, data: { reason: terminateReason || null } });
      toast({ title: "Contract terminated" });
      setTerminateId(null); setTerminateReason("");
      refresh();
    } catch {
      toast({ title: "Error", description: "Could not terminate contract.", variant: "destructive" });
    }
  };

  const handleRenew = async (id: number) => {
    try {
      const result = await renewMutation.mutateAsync({ id });
      toast({ title: "Renewal contract created" });
      refresh();
      if (result?.id) navigate(`/contracts/${result.id}`);
    } catch {
      toast({ title: "Error", description: "Could not renew contract.", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (deleteId == null) return;
    try {
      await deleteMutation.mutateAsync({ id: deleteId });
      toast({ title: "Contract deleted" });
      setDeleteId(null);
      refresh();
    } catch {
      toast({ title: "Error", description: "Could not delete contract.", variant: "destructive" });
    }
  };

  return (
    <Layout>
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSignature className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Contracts</h1>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="bg-primary hover:bg-primary/90 text-foreground">
            <Plus className="w-4 h-4 mr-1" /> New Contract
          </Button>
        </div>

        <Card className="glass-panel border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="w-8 px-2 py-2"></th>
                <th className="px-4 py-2 text-left text-xs text-muted-foreground font-medium">Contract #</th>
                <th className="px-4 py-2 text-left text-xs text-muted-foreground font-medium">Name</th>
                <th className="px-4 py-2 text-left text-xs text-muted-foreground font-medium">Account</th>
                <th className="px-4 py-2 text-left text-xs text-muted-foreground font-medium">Term</th>
                <th className="px-4 py-2 text-right text-xs text-muted-foreground font-medium">Value</th>
                <th className="px-4 py-2 text-left text-xs text-muted-foreground font-medium">Status</th>
                <th className="px-4 py-2 text-right text-xs text-muted-foreground font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">Loading...</td></tr>
              ) : contracts.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">No contracts yet. Create your first contract.</td></tr>
              ) : contracts.map(c => (
                <React.Fragment key={c.id}>
                <tr className="hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => navigate(`/contracts/${c.id}`)}>
                  <td className="w-8 px-2 py-2 text-center" onClick={e => e.stopPropagation()}>
                    <button
                      className="text-muted-foreground hover:text-foreground p-1 rounded transition-colors"
                      title={expanded.has(c.id) ? "Hide revisions" : "Show revisions"}
                      onClick={() => setExpanded(prev => {
                        const next = new Set(prev);
                        if (next.has(c.id)) next.delete(c.id); else next.add(c.id);
                        return next;
                      })}
                    >
                      {expanded.has(c.id) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                  </td>
                  <td className="px-4 py-2 font-medium text-primary">
                    {c.contractNumber}
                    {isRecentlyCreated(c.createdAt) && <span className="ml-2 text-[10px] text-green-600">New</span>}
                  </td>
                  <td className="px-4 py-2 text-foreground">{c.name}</td>
                  <td className="px-4 py-2 text-muted-foreground">{c.accountName ?? "—"}</td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {c.startDate ? format(new Date(c.startDate), "MMM d, yyyy") : "—"}
                    {c.endDate ? ` → ${format(new Date(c.endDate), "MMM d, yyyy")}` : ""}
                  </td>
                  <td className="px-4 py-2 text-right font-medium">{fmtMoney(c.total)}</td>
                  <td className="px-4 py-2">
                    <Badge variant="outline" className={CONTRACT_STATUS_COLORS[c.status] ?? ""}>{contractStatusLabel(c.status)}</Badge>
                  </td>
                  <td className="px-4 py-2 text-right" onClick={e => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="w-4 h-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-card border-border">
                        <DropdownMenuItem onClick={() => navigate(`/contracts/${c.id}`)}>
                          <Eye className="w-4 h-4 mr-2" /> View
                        </DropdownMenuItem>
                        {(c.status === "draft" || c.status === "in_approval") && (
                          <DropdownMenuItem onClick={() => handleActivate(c.id)}>
                            <CheckCircle className="w-4 h-4 mr-2 text-green-600" /> Activate
                          </DropdownMenuItem>
                        )}
                        {c.status === "activated" && (
                          <DropdownMenuItem onClick={() => setTerminateId(c.id)}>
                            <XCircle className="w-4 h-4 mr-2 text-red-600" /> Terminate
                          </DropdownMenuItem>
                        )}
                        {["activated", "expired", "terminated"].includes(c.status) && (
                          <DropdownMenuItem onClick={() => handleRenew(c.id)}>
                            <RefreshCw className="w-4 h-4 mr-2 text-blue-600" /> Renew
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setDeleteId(c.id)} className="text-red-600">
                          <Trash2 className="w-4 h-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
                {expanded.has(c.id) && (
                  <tr className="bg-muted/20">
                    <td></td>
                    <td colSpan={7} className="px-4 pb-3 pt-0">
                      <ContractRevisions contractId={c.id} />
                    </td>
                  </tr>
                )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      <CreateContractDialog open={createOpen} onOpenChange={setCreateOpen} />

      <AlertDialog open={terminateId != null} onOpenChange={(v) => { if (!v) { setTerminateId(null); setTerminateReason(""); } }}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Terminate contract?</AlertDialogTitle>
            <AlertDialogDescription>
              This will end the contract and stop its pricing from applying. Optionally provide a reason.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input className="bg-muted border-border" placeholder="Termination reason (optional)"
            value={terminateReason} onChange={e => setTerminateReason(e.target.value)} />
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleTerminate} className="bg-red-600 hover:bg-red-700 text-white">Terminate</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteId != null} onOpenChange={(v) => { if (!v) setDeleteId(null); }}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete contract?</AlertDialogTitle>
            <AlertDialogDescription>This permanently deletes the contract and its line items.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
