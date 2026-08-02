import React, { useState, useEffect, useMemo } from "react";
import { useLocation, Link } from "wouter";
import {
  useListContracts, useCreateContract, useUpdateContract, useActivateContract, useTerminateContract,
  useRenewContract, useDeleteContract,
  useListProducts, useListAccounts,
  getListContractsQueryKey, getGetContractQueryKey, getListContractDocumentsQueryKey,
  type Contract,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  FileSignature, MoreHorizontal, Trash2, CheckCircle, XCircle, RefreshCw,
  Plus, X, Package, Eye, ChevronDown, Pencil, ArrowUpDown, Search, Check,
} from "lucide-react";
import { format } from "date-fns";
import { useCurrency } from "@/context/currency";
import { useToast } from "@/hooks/use-toast";
import { isRecentlyCreated, cn } from "@/lib/utils";
import { useColResize } from "@/hooks/use-col-resize";
import { ColResizeHandle } from "@/components/col-resize-handle";
import { useColumnVisibility } from "@/hooks/use-column-visibility";
import { ColumnsMenu } from "@/components/columns-menu";
import { usePagination } from "@/hooks/use-pagination";
import { TablePagination } from "@/components/table-pagination";

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

export function CreateContractDialog({ open, onOpenChange, contract }: { open: boolean; onOpenChange: (v: boolean) => void; contract?: Contract | null }) {
  const isEdit = !!contract;
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
  const updateMutation = useUpdateContract();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { format: fmtMoney } = useCurrency();
  const isPending = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (open) {
      if (contract) {
        setName(contract.name ?? "");
        setAccountId(contract.accountId != null ? String(contract.accountId) : "");
        setStartDate(contract.startDate ? contract.startDate.slice(0, 10) : "");
        setTermMonths(contract.contractTermMonths != null ? String(contract.contractTermMonths) : "");
        setAutoRenew(!!contract.autoRenew);
        setRenewalTermMonths(contract.renewalTermMonths != null ? String(contract.renewalTermMonths) : "12");
        setDescription(contract.description ?? "");
        setItems((contract.items ?? []).map(it => ({
          productId: it.productId ?? null,
          productName: it.productName,
          quantity: it.quantity,
          listPrice: it.listPrice,
          unitPrice: it.unitPrice,
          discount: it.discount,
        })));
      } else {
        setName(""); setAccountId(""); setStartDate(""); setTermMonths("12");
        setAutoRenew(false); setRenewalTermMonths("12"); setDescription(""); setItems([]);
      }
    }
  }, [open, contract]);

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
    const payload = {
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
    };
    try {
      if (contract) {
        await updateMutation.mutateAsync({ id: contract.id, data: payload });
        toast({ title: "Contract updated" });
        void queryClient.invalidateQueries({ queryKey: getGetContractQueryKey(contract.id) });
        // The server re-syncs a draft contract's latest document on edit, so
        // refresh the document list/revisions to pick up the new content.
        void queryClient.invalidateQueries({ queryKey: getListContractDocumentsQueryKey(contract.id) });
      } else {
        await createMutation.mutateAsync({ data: payload });
        toast({ title: "Contract created" });
      }
      void queryClient.invalidateQueries({ queryKey: getListContractsQueryKey() });
      onOpenChange(false);
    } catch {
      toast({ title: "Error", description: `Could not ${contract ? "update" : "create"} contract.`, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border text-foreground max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Edit Contract${contract?.contractNumber ? ` ${contract.contractNumber}` : ""}` : "Create Contract"}</DialogTitle>
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
            <Button type="submit" disabled={isPending} className="bg-primary hover:bg-primary/90 text-foreground">
              {isPending ? (isEdit ? "Saving..." : "Creating...") : (isEdit ? "Save Changes" : "Create Contract")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type ContractViewId =
  | "all" | "draft" | "in_approval" | "active"
  | "expiring_soon" | "expired" | "terminated" | "recently_created" | "high_value";

interface ContractListView {
  id: ContractViewId;
  label: string;
  pinned: boolean;
  filter: (c: Contract) => boolean;
}

const cNow = () => new Date();

const CONTRACT_LIST_VIEWS: ContractListView[] = [
  { id: "all", label: "All Contracts", pinned: true, filter: () => true },
  { id: "draft", label: "Draft Contracts", pinned: true, filter: (c) => c.status === "draft" },
  { id: "in_approval", label: "In Approval", pinned: true, filter: (c) => c.status === "in_approval" },
  { id: "active", label: "Active Contracts", pinned: true, filter: (c) => c.status === "activated" },
  {
    id: "expiring_soon", label: "Expiring Soon", pinned: false,
    filter: (c) => {
      if (c.status !== "activated" || !c.endDate) return false;
      const d = new Date(c.endDate);
      const n = cNow();
      const in30 = new Date(n);
      in30.setDate(in30.getDate() + 30);
      return d >= n && d <= in30;
    },
  },
  { id: "expired", label: "Expired", pinned: false, filter: (c) => c.status === "expired" },
  { id: "terminated", label: "Terminated", pinned: false, filter: (c) => c.status === "terminated" },
  {
    id: "recently_created", label: "Recently Created", pinned: false,
    filter: (c) => {
      if (!c.createdAt) return false;
      const d = new Date(c.createdAt);
      const n = cNow();
      const weekAgo = new Date(n);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return d >= weekAgo;
    },
  },
  { id: "high_value", label: "High Value", pinned: false, filter: (c) => (Number(c.total) || 0) >= 100000 },
];

const CONTRACT_PINNED_VIEWS = CONTRACT_LIST_VIEWS.filter((v) => v.pinned);
const CONTRACT_OTHER_VIEWS = CONTRACT_LIST_VIEWS.filter((v) => !v.pinned);

const CONTRACT_TOGGLEABLE_COLS = [
  { key: "number" as const, label: "Contract #" },
  { key: "name" as const, label: "Name" },
  { key: "account" as const, label: "Account" },
  { key: "term" as const, label: "Term" },
  { key: "value" as const, label: "Value" },
  { key: "status" as const, label: "Status" },
];

const CONTRACTS_COL_KEYS = ["number", "name", "account", "term", "value", "status", "actions"] as const;
const CONTRACTS_COL_DEFAULTS: Record<typeof CONTRACTS_COL_KEYS[number], number> =
  { number: 140, name: 240, account: 180, term: 210, value: 130, status: 130, actions: 110 };

export default function Contracts() {
  const [, navigate] = useLocation();
  const [createOpen, setCreateOpen] = useState(false);
  const [terminateId, setTerminateId] = useState<number | null>(null);
  const [terminateReason, setTerminateReason] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [sortField, setSortField] = useState<string>("number");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [activeViewId, setActiveViewId] = useState<ContractViewId>("all");
  const [viewPickerOpen, setViewPickerOpen] = useState(false);
  const [viewPickerSearch, setViewPickerSearch] = useState("");
  const { data, isLoading } = useListContracts({ limit: 200 });
  const activateMutation = useActivateContract();
  const terminateMutation = useTerminateContract();
  const renewMutation = useRenewContract();
  const deleteMutation = useDeleteContract();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { format: fmtMoney } = useCurrency();

  const { widths: colWidths, startResize: startColResize } = useColResize("col-widths:contracts:v1", CONTRACTS_COL_KEYS, CONTRACTS_COL_DEFAULTS);
  const colVis = useColumnVisibility<"number" | "name" | "account" | "term" | "value" | "status">(
    "col-visibility:contracts:v1",
    CONTRACT_TOGGLEABLE_COLS,
  );
  const contractColSpan = colVis.visible.size + 2;

  const refresh = () => queryClient.invalidateQueries({ queryKey: getListContractsQueryKey() });

  const allContracts = data?.data ?? [];
  const activeView = CONTRACT_LIST_VIEWS.find((v) => v.id === activeViewId) ?? CONTRACT_LIST_VIEWS[0];

  const viewFiltered = useMemo(() => allContracts.filter((c) => activeView.filter(c)), [allContracts, activeView]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return viewFiltered;
    const q = searchQuery.toLowerCase();
    return viewFiltered.filter((c) =>
      (c.contractNumber ?? "").toLowerCase().includes(q) ||
      (c.name ?? "").toLowerCase().includes(q) ||
      (c.accountName ?? "").toLowerCase().includes(q) ||
      (c.status ?? "").toLowerCase().includes(q));
  }, [viewFiltered, searchQuery]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "number": cmp = (a.contractNumber ?? "").localeCompare(b.contractNumber ?? "", undefined, { numeric: true }); break;
        case "name": cmp = (a.name ?? "").localeCompare(b.name ?? ""); break;
        case "account": cmp = (a.accountName ?? "").localeCompare(b.accountName ?? ""); break;
        case "term": cmp = (a.startDate ? new Date(a.startDate).getTime() : 0) - (b.startDate ? new Date(b.startDate).getTime() : 0); break;
        case "value": cmp = (Number(a.total) || 0) - (Number(b.total) || 0); break;
        case "status": cmp = (a.status ?? "").localeCompare(b.status ?? ""); break;
        default: cmp = 0;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortField, sortDir]);

  const toggleSort = (field: string) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("asc"); }
  };

  const visibleIds = useMemo(() => new Set(sorted.map((c) => c.id)), [sorted]);
  const pagination = usePagination("contracts", sorted);
  const visibleSelectedCount = useMemo(() => {
    let count = 0;
    for (const id of selectedIds) { if (visibleIds.has(id)) count++; }
    return count;
  }, [selectedIds, visibleIds]);
  const allVisibleSelected = visibleIds.size > 0 && visibleSelectedCount === visibleIds.size;
  const someVisibleSelected = visibleSelectedCount > 0 && !allVisibleSelected;

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) { for (const id of visibleIds) next.delete(id); }
      else { for (const id of visibleIds) next.add(id); }
      return next;
    });
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const SortHeader = ({ field, children }: { field: string; children: React.ReactNode }) => (
    <button
      onClick={() => toggleSort(field)}
      aria-sort={sortField === field ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
      className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-white hover:text-white/80 transition-colors whitespace-nowrap"
    >
      {children}
      <ArrowUpDown className={cn("w-3 h-3", sortField === field ? "opacity-100" : "opacity-40")} />
    </button>
  );

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

  const thClass = "relative text-left px-2 py-1 [&_*]:!whitespace-nowrap";

  return (
    <Layout>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <FileSignature className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-display font-bold text-foreground tracking-tight">Contracts</h1>
              <Popover open={viewPickerOpen} onOpenChange={(o) => { setViewPickerOpen(o); if (!o) setViewPickerSearch(""); }}>
                <PopoverTrigger asChild>
                  <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {activeView.label}
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" sideOffset={6} className="w-64 p-0">
                  <div className="p-2 border-b border-border">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <Input
                        autoFocus
                        placeholder="Search list views..."
                        value={viewPickerSearch}
                        onChange={(e) => setViewPickerSearch(e.target.value)}
                        className="pl-7 h-7 text-xs bg-card border-border"
                      />
                    </div>
                  </div>
                  <div className="max-h-72 overflow-auto py-1" role="listbox">
                    {(() => {
                      const q = viewPickerSearch.trim().toLowerCase();
                      const filteredPinned = CONTRACT_PINNED_VIEWS.filter((v) => v.label.toLowerCase().includes(q));
                      const filteredOther = CONTRACT_OTHER_VIEWS.filter((v) => v.label.toLowerCase().includes(q));
                      if (filteredPinned.length === 0 && filteredOther.length === 0) {
                        return <div className="px-3 py-4 text-center text-xs text-muted-foreground">No views found.</div>;
                      }
                      const renderView = (view: ContractListView) => (
                        <button
                          key={view.id}
                          role="option"
                          aria-selected={activeViewId === view.id}
                          onClick={() => { setActiveViewId(view.id); setViewPickerOpen(false); setViewPickerSearch(""); setSelectedIds(new Set()); }}
                          className={cn(
                            "w-full flex items-center gap-2 px-3 py-1 text-sm text-left hover:bg-muted transition-colors",
                            activeViewId === view.id && "text-primary font-medium"
                          )}
                        >
                          {activeViewId === view.id ? (
                            <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                          ) : (
                            <span className="w-3.5 shrink-0" />
                          )}
                          {view.label}
                        </button>
                      );
                      return (
                        <>
                          {filteredPinned.length > 0 && (
                            <>
                              <div className="px-3 pt-2 pb-1">
                                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Pinned List Views</span>
                              </div>
                              {filteredPinned.map(renderView)}
                            </>
                          )}
                          {filteredOther.length > 0 && (
                            <>
                              <div className="border-t border-border mt-1" />
                              <div className="px-3 pt-2 pb-1">
                                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">All Other Views</span>
                              </div>
                              {filteredOther.map(renderView)}
                            </>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search this list..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 w-48 text-sm bg-card border-border"
              />
            </div>
            <Button
              size="sm"
              onClick={() => setCreateOpen(true)}
              className="bg-primary text-primary-foreground hover:bg-primary/90 h-8"
            >
              <Plus className="w-4 h-4 mr-1" /> New
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="bg-card rounded-md h-64 animate-pulse" />
        ) : (
          <div className="bg-card rounded-md overflow-hidden shadow-sm">
            <div className="px-3 py-1 border-b border-border bg-muted/20 flex items-center justify-end gap-3">
              <TablePagination
                variant="inline"
                page={pagination.page}
                totalPages={pagination.totalPages}
                pageSize={pagination.pageSize}
                total={pagination.total}
                pageStart={pagination.pageStart}
                pageEnd={pagination.pageEnd}
                onPageChange={pagination.setPage}
                onPageSizeChange={pagination.setPageSize}
              />
              <ColumnsMenu columns={CONTRACT_TOGGLEABLE_COLS} isVisible={colVis.isVisible} toggle={colVis.toggle} showAll={colVis.showAll} />
            </div>
            <div className="overflow-auto max-h-[calc(100dvh-260px)]">
              <table className="w-full text-sm bg-card [&_tbody_td]:whitespace-nowrap">
                <colgroup>
                  <col style={{ width: "32px" }} />
                  {colVis.isVisible("number") && <col data-col="number" style={{ width: `${colWidths.number}px` }} />}
                  {colVis.isVisible("name") && <col data-col="name" style={{ width: `${colWidths.name}px` }} />}
                  {colVis.isVisible("account") && <col data-col="account" style={{ width: `${colWidths.account}px` }} />}
                  {colVis.isVisible("term") && <col data-col="term" style={{ width: `${colWidths.term}px` }} />}
                  {colVis.isVisible("value") && <col data-col="value" style={{ width: `${colWidths.value}px` }} />}
                  {colVis.isVisible("status") && <col data-col="status" style={{ width: `${colWidths.status}px` }} />}
                  <col data-col="actions" style={{ width: `${colWidths.actions}px` }} />
                </colgroup>
                <thead className="sticky top-0 z-30">
                  <tr className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800 border-b border-blue-800 divide-x divide-blue-500/40">
                    <th className="w-8 px-2 py-1.5">
                      <Checkbox
                        checked={allVisibleSelected ? true : someVisibleSelected ? "indeterminate" : false}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Select all contracts"
                        className="border-white/70 data-[state=checked]:bg-white data-[state=checked]:text-blue-700 data-[state=indeterminate]:bg-white data-[state=indeterminate]:text-blue-700"
                      />
                    </th>
                    {colVis.isVisible("number") && (
                      <th className={cn(thClass, "[&_*]:!text-white")}>
                        <SortHeader field="number">Contract #</SortHeader>
                        <ColResizeHandle onMouseDown={startColResize("number")} />
                      </th>
                    )}
                    {colVis.isVisible("name") && (
                      <th className={cn(thClass, "[&_*]:!text-white")}>
                        <SortHeader field="name">Name</SortHeader>
                        <ColResizeHandle onMouseDown={startColResize("name")} />
                      </th>
                    )}
                    {colVis.isVisible("account") && (
                      <th className={cn(thClass, "[&_*]:!text-white")}>
                        <SortHeader field="account">Account</SortHeader>
                        <ColResizeHandle onMouseDown={startColResize("account")} />
                      </th>
                    )}
                    {colVis.isVisible("term") && (
                      <th className={cn(thClass, "[&_*]:!text-white")}>
                        <SortHeader field="term">Term</SortHeader>
                        <ColResizeHandle onMouseDown={startColResize("term")} />
                      </th>
                    )}
                    {colVis.isVisible("value") && (
                      <th className={cn(thClass, "[&_*]:!text-white")}>
                        <SortHeader field="value">Value</SortHeader>
                        <ColResizeHandle onMouseDown={startColResize("value")} />
                      </th>
                    )}
                    {colVis.isVisible("status") && (
                      <th className={cn(thClass, "[&_*]:!text-white")}>
                        <SortHeader field="status">Status</SortHeader>
                        <ColResizeHandle onMouseDown={startColResize("status")} />
                      </th>
                    )}
                    <th className="relative text-center px-2 py-1">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-white whitespace-nowrap leading-tight">Actions</span>
                      <ColResizeHandle onMouseDown={startColResize("actions")} />
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-card">
                  {sorted.length === 0 ? (
                    <tr><td colSpan={contractColSpan} className="px-4 py-12 text-center text-muted-foreground">{searchQuery ? "No contracts match your search." : "No contracts in this view yet."}</td></tr>
                  ) : pagination.paged.map((c) => (
                    <tr key={c.id} className="hover:bg-muted/30 transition-colors group">
                      <td className="w-8 px-2 py-1">
                        <Checkbox
                          checked={selectedIds.has(c.id)}
                          onCheckedChange={() => toggleSelect(c.id)}
                          aria-label={`Select contract ${c.contractNumber}`}
                        />
                      </td>
                      {colVis.isVisible("number") && (
                        <td className="px-3 py-1">
                          <Link href={`/contracts/${c.id}`}>
                            <span
                              className="font-medium text-primary hover:underline cursor-pointer inline-flex items-center truncate"
                              style={{ maxWidth: `${colWidths.number}px` }}
                              title={c.contractNumber}
                            >
                              {c.contractNumber}
                              {isRecentlyCreated(c.createdAt) && <span className="ml-2 text-[10px] text-green-600">New</span>}
                            </span>
                          </Link>
                        </td>
                      )}
                      {colVis.isVisible("name") && (
                        <td className="px-3 py-1 text-foreground">
                          <span className="block truncate" style={{ maxWidth: `${colWidths.name}px` }} title={c.name}>{c.name}</span>
                        </td>
                      )}
                      {colVis.isVisible("account") && (
                        <td className="px-3 py-1 text-muted-foreground">
                          <span className="block truncate" style={{ maxWidth: `${colWidths.account}px` }} title={c.accountName ?? ""}>{c.accountName ?? "—"}</span>
                        </td>
                      )}
                      {colVis.isVisible("term") && (
                        <td className="px-3 py-1 text-muted-foreground">
                          {c.startDate ? format(new Date(c.startDate), "MMM d, yyyy") : "—"}
                          {c.endDate ? ` → ${format(new Date(c.endDate), "MMM d, yyyy")}` : ""}
                        </td>
                      )}
                      {colVis.isVisible("value") && (
                        <td className="px-3 py-1 font-semibold text-foreground">{fmtMoney(c.total)}</td>
                      )}
                      {colVis.isVisible("status") && (
                        <td className="px-3 py-1">
                          <Badge variant="outline" className={CONTRACT_STATUS_COLORS[c.status] ?? ""}>{contractStatusLabel(c.status)}</Badge>
                        </td>
                      )}
                      <td className="px-3 py-1">
                        <div className="flex items-center justify-center gap-1">
                          <Link href={`/contracts/${c.id}`}>
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground">
                              <Pencil className="w-3.5 h-3.5" /> Edit
                            </Button>
                          </Link>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" aria-label={`More actions for ${c.contractNumber}`}><MoreHorizontal className="w-4 h-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-card border-border">
                              <DropdownMenuItem onClick={() => navigate(`/contracts/${c.id}`)}>
                                <Eye className="w-4 h-4 mr-2" /> View Details
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
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
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
