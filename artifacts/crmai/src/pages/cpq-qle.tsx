import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCurrency } from "@/context/currency";
import { useAuth } from "@/context/auth";
import { useCpqEnabled } from "@/context/cpq-feature";
import { cn } from "@/lib/utils";
import {
  Table2,
  Plus,
  Trash2,
  AlertTriangle,
  Search,
  Lock,
  ChevronDown,
  FileDown,
  Send,
  Save,
  Package,
  Box,
  ArrowLeft,
  CheckCircle2,
  Clock,
  ExternalLink,
} from "lucide-react";

interface LineItem {
  id: string;
  productId: number | null;
  productName: string;
  productCode: string;
  groupLabel: string;
  qty: number;
  listPrice: number;
  discountPct: number;
  costPrice: number;
  isBundle?: boolean;
  bundleParentId?: string;
  bundleId?: number | null;
  bundleName?: string | null;
}

function calcNet(item: LineItem) {
  return item.listPrice * (1 - item.discountPct / 100);
}
function calcTotal(item: LineItem) {
  return calcNet(item) * item.qty;
}
function calcMargin(item: LineItem) {
  const net = calcNet(item);
  if (net <= 0) return 0;
  return ((net - item.costPrice) / net) * 100;
}

export default function CpqQle() {
  const [location, navigate] = useLocation();
  const params = useParams<{ quoteId?: string }>();
  const fromQuote = new URLSearchParams(window.location.search).get("from") === "quote";
  const fromGuided = new URLSearchParams(window.location.search).get("from") === "guided";
  const queryClient = useQueryClient();
  const { format: fmtMoney } = useCurrency();
  const { user } = useAuth();
  const { cpqEnabled, isLoading: cpqLoading } = useCpqEnabled();

  const isAdmin = user?.role === "admin" || user?.role === "super_admin" || user?.role === "manager";

  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(params.quoteId ?? null);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [massDiscountVal, setMassDiscountVal] = useState("");
  const [massQtyVal, setMassQtyVal] = useState("");
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [pickerTab, setPickerTab] = useState<"products" | "bundles">("products");
  const [showNewQuoteDialog, setShowNewQuoteDialog] = useState(false);
  const [newQuoteName, setNewQuoteName] = useState("");
  const [collapsedBundles, setCollapsedBundles] = useState<Set<string>>(new Set());

  function toggleBundle(parentId: string) {
    setCollapsedBundles(prev => {
      const next = new Set(prev);
      next.has(parentId) ? next.delete(parentId) : next.add(parentId);
      return next;
    });
  }
  const [saveError, setSaveError] = useState<string | null>(null);
  const [approvalSubmitted, setApprovalSubmitted] = useState(false);
  const [approvalError, setApprovalError] = useState<string | null>(null);

  const { data: quotesData } = useQuery({
    queryKey: ["quotes"],
    queryFn: () => fetch("/api/quotes", { credentials: "include" }).then((r) => r.json()),
  });
  const { data: selectedQuoteData } = useQuery({
    queryKey: ["quote", selectedQuoteId],
    queryFn: () => fetch(`/api/quotes/${selectedQuoteId}`, { credentials: "include" }).then((r) => r.json()),
    enabled: !!selectedQuoteId,
  });
  const { data: productsData } = useQuery({
    queryKey: ["products"],
    queryFn: () => fetch("/api/products?limit=200", { credentials: "include" }).then((r) => r.json()),
  });
  const { data: approvalRequestsData } = useQuery({
    queryKey: ["approval-requests", selectedQuoteId],
    queryFn: () => fetch(`/api/approvals/requests?entity=quote&entityId=${selectedQuoteId}`, { credentials: "include" }).then((r) => r.json()),
    enabled: !!selectedQuoteId,
  });
  const { data: bundlesData } = useQuery({
    queryKey: ["product-bundles"],
    queryFn: () => fetch("/api/product-bundles", { credentials: "include" }).then((r) => r.json()),
  });

  const quotes: any[] = quotesData?.data ?? [];
  const products: any[] = productsData?.data ?? [];
  const bundles: any[] = bundlesData?.data ?? bundlesData ?? [];
  const approvalRequests: any[] = approvalRequestsData?.data ?? [];
  const latestApproval = approvalRequests[0] ?? null;
  const approvalStatus = latestApproval?.status ?? null; // "open" | "approved" | "rejected" | "cancelled" | null

  // Load line items from selected quote
  useEffect(() => {
    if (!selectedQuoteData) return;
    const q = selectedQuoteData.data ?? selectedQuoteData;
    if (!q?.items) return;
    const items: LineItem[] = (q.items as any[]).map((item: any, idx: number) => {
      const bid: number | null = item.bundleId ?? null;
      return {
        id: `item-${idx}-${item.productId ?? idx}`,
        productId: item.productId ?? null,
        productName: item.productName ?? item.name ?? "Product",
        productCode: item.productCode ?? item.sku ?? "",
        groupLabel: item.groupLabel ?? item.bundleName ?? "",
        qty: parseFloat(item.quantity ?? "1") || 1,
        listPrice: parseFloat(item.listPrice ?? item.unitPrice ?? "0") || 0,
        discountPct: parseFloat(item.discountPct ?? item.discount ?? "0") || 0,
        costPrice: parseFloat(item.costPrice ?? "0") || 0,
        bundleId: bid,
        bundleName: item.bundleName ?? null,
        bundleParentId: bid ? `bundle-${bid}` : undefined,
      };
    });
    setLineItems(items);
    setSelectedRows(new Set());
  }, [selectedQuoteData]);

  // Bootstrap line items from Guided Selling when arriving with ?from=guided
  useEffect(() => {
    if (!fromGuided) return;
    const raw = sessionStorage.getItem("cpq_guided_products");
    if (!raw) return;
    try {
      const guidedProducts: any[] = JSON.parse(raw);
      if (!guidedProducts.length) return;
      const items: LineItem[] = guidedProducts.map((p: any) => ({
        id: `guided-${Date.now()}-${p.id}`,
        productId: p.id,
        productName: p.name,
        productCode: p.sku ?? "",
        groupLabel: p.category ?? "Guided Selection",
        qty: 1,
        listPrice: parseFloat(p.unitPrice) || 0,
        discountPct: 0,
        costPrice: parseFloat(p.costPrice) || 0,
      }));
      setLineItems(prev => [...prev, ...items]);
      sessionStorage.removeItem("cpq_guided_products");
      sessionStorage.removeItem("cpq_guided_answers");
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromGuided]);

  const saveMutation = useMutation({
    mutationFn: async (quoteName?: string) => {
      setSaveError(null);
      const body = {
        items: lineItems.map((li) => ({
          productId: li.productId,
          productName: li.productName,
          quantity: li.qty,
          unitPrice: li.listPrice,
          discount: li.discountPct,
          bundleId: li.bundleId ?? null,
          bundleName: li.bundleName ?? null,
        })),
      };
      if (selectedQuoteId) {
        const r = await fetch(`/api/quotes/${selectedQuoteId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(body),
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error ?? "Failed to save quote");
        return data;
      } else {
        const r = await fetch("/api/quotes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ name: quoteName ?? "New CPQ Quote", status: "draft", ...body }),
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error ?? "Failed to create quote");
        return data;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      const newId = data?.data?.id ?? data?.id;
      if (newId && !selectedQuoteId) setSelectedQuoteId(String(newId));
      setShowNewQuoteDialog(false);
      setNewQuoteName("");
    },
    onError: (err: Error) => setSaveError(err.message),
  });

  const approvalMutation = useMutation({
    mutationFn: async () => {
      if (!selectedQuoteId) throw new Error("Save the quote first before submitting for approval.");
      const r = await fetch("/api/approvals/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ entity: "quote", entityId: Number(selectedQuoteId), comment: "High-discount quote submitted for manager approval from CPQ." }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error ?? "Failed to submit approval request");
      return data;
    },
    onSuccess: () => {
      setApprovalSubmitted(true);
      setApprovalError(null);
    },
    onError: (err: Error) => setApprovalError(err.message),
  });

  function handleSaveClick() {
    if (!selectedQuoteId) {
      setShowNewQuoteDialog(true);
    } else {
      saveMutation.mutate();
    }
  }

  function handleSubmitApproval() {
    if (!selectedQuoteId) {
      setApprovalError("Please save the quote first before submitting for approval.");
      return;
    }
    setApprovalError(null);
    approvalMutation.mutate();
  }

  if (!cpqLoading && !cpqEnabled) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
            <Lock className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold">CPQ Module Not Enabled</h2>
          <p className="text-muted-foreground text-sm text-center max-w-sm">
            The Configure-Price-Quote module is not enabled for your account. Contact your administrator to enable CPQ.
          </p>
          <Button variant="outline" onClick={() => navigate("/quotes")}>Go to Standard Quoting</Button>
        </div>
      </Layout>
    );
  }

  const hasHighDiscount = lineItems.some((li) => li.discountPct > 30);
  const subtotal = lineItems.reduce((s, li) => s + calcTotal(li), 0);
  const discountAmt = lineItems.reduce((s, li) => s + (li.listPrice * li.qty - calcTotal(li)), 0);
  const quoteTaxPct = parseFloat((selectedQuoteData?.data ?? selectedQuoteData)?.tax ?? "0") || 0;
  const quoteDiscountPct = parseFloat((selectedQuoteData?.data ?? selectedQuoteData)?.discount ?? "0") || 0;
  const tax = subtotal * (1 - quoteDiscountPct / 100) * (quoteTaxPct / 100);
  const total = subtotal * (1 - quoteDiscountPct / 100) + tax;
  const avgMargin = lineItems.length > 0 ? lineItems.reduce((s, li) => s + calcMargin(li), 0) / lineItems.length : 0;

  function updateLine(id: string, field: keyof LineItem, value: any) {
    setLineItems((prev) => prev.map((li) => (li.id === id ? { ...li, [field]: value } : li)));
  }

  function deleteLine(id: string) {
    setLineItems((prev) => prev.filter((li) => li.id !== id));
    setSelectedRows((prev) => { const next = new Set(prev); next.delete(id); return next; });
  }

  function toggleRow(id: string) {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selectedRows.size === lineItems.length) setSelectedRows(new Set());
    else setSelectedRows(new Set(lineItems.map((li) => li.id)));
  }

  function applyMassDiscount() {
    const val = parseFloat(massDiscountVal);
    if (isNaN(val)) return;
    setLineItems((prev) => prev.map((li) => selectedRows.has(li.id) ? { ...li, discountPct: Math.min(100, Math.max(0, val)) } : li));
  }

  function applyMassQty() {
    const val = parseInt(massQtyVal);
    if (isNaN(val) || val < 1) return;
    setLineItems((prev) => prev.map((li) => selectedRows.has(li.id) ? { ...li, qty: val } : li));
  }

  function removeSelected() {
    setLineItems((prev) => prev.filter((li) => !selectedRows.has(li.id)));
    setSelectedRows(new Set());
  }

  function addProduct(p: any) {
    const newItem: LineItem = {
      id: `item-${Date.now()}-${p.id}`,
      productId: p.id,
      productName: p.name,
      productCode: p.sku ?? "",
      groupLabel: p.category ?? "",
      qty: 1,
      listPrice: parseFloat(p.unitPrice) || 0,
      discountPct: 0,
      costPrice: parseFloat(p.costPrice) || 0,
    };
    setLineItems((prev) => [...prev, newItem]);
    setShowProductPicker(false);
    setProductSearch("");
  }

  async function addBundle(bundle: any) {
    // Fetch full bundle with items
    const res = await fetch(`/api/product-bundles/${bundle.id}`, { credentials: "include" });
    const data = await res.json();
    const items: any[] = data.items ?? [];
    const bundleDiscount = parseFloat(data.bundle_discount_pct ?? bundle.bundle_discount_pct ?? "0") || 0;
    const parentId = `bundle-${bundle.id}`;
    const newItems: LineItem[] = items.map((item: any, idx: number) => ({
      id: `${parentId}-item-${idx}-${Date.now()}`,
      productId: item.product_id,
      productName: item.product_name ?? item.name,
      productCode: item.product_code ?? "",
      groupLabel: bundle.name,
      qty: parseFloat(item.quantity ?? "1") || 1,
      listPrice: parseFloat(item.override_price ?? item.default_unit_price ?? "0") || 0,
      discountPct: bundleDiscount,
      costPrice: 0,
      isBundle: false,
      bundleParentId: parentId,
      bundleId: bundle.id,
      bundleName: bundle.name,
    }));
    setLineItems((prev) => [...prev, ...newItems]);
    setShowProductPicker(false);
    setProductSearch("");
  }

  const filteredProducts = products.filter(
    (p) =>
      p.name?.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.sku?.toLowerCase().includes(productSearch.toLowerCase())
  );

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        {/* Back nav */}
        {fromQuote && selectedQuoteId ? (
          <a href={`/quotes/${selectedQuoteId}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Quote
          </a>
        ) : fromGuided ? (
          <a href="/cpq/guided-selling" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Guided Selling
          </a>
        ) : (
          <a href="/cpq" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to CPQ
          </a>
        )}
        {fromGuided && lineItems.length > 0 && (
          <div className="flex items-center gap-2 rounded-lg bg-blue-50 border border-blue-200 px-4 py-2.5 mb-4 text-sm text-blue-800">
            <span className="font-semibold">Guided Selling</span> — {lineItems.length} product{lineItems.length !== 1 ? "s" : ""} pre-loaded from your wizard selections. Review, adjust quantities and discounts, then save as a new quote.
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
              <Table2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Quote Line Editor</h1>
              <p className="text-sm text-muted-foreground">Enterprise-grade quote builder with bulk operations.</p>
            </div>
          </div>

          {/* Quote selector */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                className="border border-border rounded-md px-3 py-1.5 text-sm bg-background pr-8 appearance-none cursor-pointer"
                value={selectedQuoteId ?? ""}
                onChange={(e) => setSelectedQuoteId(e.target.value || null)}
              >
                <option value="">— New Quote —</option>
                {quotes.map((q: any) => (
                  <option key={q.id} value={String(q.id)}>
                    {q.quoteNumber ?? `Q-${q.id}`} · {q.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Approval banner */}
        {hasHighDiscount && approvalStatus === "approved" && (
          <div className="flex items-center gap-3 rounded-lg bg-green-50 border border-green-200 px-4 py-3 mb-4 text-sm text-green-800">
            <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
            <span><strong>Approved</strong> — This quote has been approved by a manager and is ready to send.</span>
          </div>
        )}
        {hasHighDiscount && approvalStatus === "open" && (
          <div className="flex items-center gap-3 rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 mb-4 text-sm text-blue-800">
            <Clock className="w-4 h-4 text-blue-500 shrink-0" />
            <span><strong>Pending approval</strong> — Submitted for manager review. You will be notified once a decision is made.</span>
          </div>
        )}
        {hasHighDiscount && (approvalStatus === "rejected" || approvalStatus === "cancelled") && (
          <div className="flex items-center gap-3 rounded-lg bg-red-50 border border-red-200 px-4 py-3 mb-4 text-sm text-red-800">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
            <span><strong>Approval {approvalStatus}</strong> — Please revise the discount or resubmit for approval.</span>
          </div>
        )}
        {hasHighDiscount && !approvalStatus && (
          <div className="flex items-center gap-3 rounded-lg bg-yellow-50 border border-yellow-200 px-4 py-3 mb-4 text-sm text-yellow-800">
            <AlertTriangle className="w-4 h-4 text-yellow-600 shrink-0" />
            <span><strong>Manager approval required</strong> for discounts &gt;30%. Submit for approval before sending.</span>
          </div>
        )}

        {/* Mass Update Toolbar */}
        {selectedRows.size > 0 && (
          <div className="flex flex-wrap items-center gap-3 rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 mb-4">
            <span className="text-sm font-medium text-blue-700">{selectedRows.size} row(s) selected</span>
            <div className="flex items-center gap-1.5">
              <Input placeholder="Discount %" className="w-24 h-7 text-xs" value={massDiscountVal} onChange={(e) => setMassDiscountVal(e.target.value)} />
              <Button size="sm" className="h-7 text-xs" onClick={applyMassDiscount}>Apply Discount</Button>
            </div>
            <div className="flex items-center gap-1.5">
              <Input placeholder="Qty" className="w-16 h-7 text-xs" value={massQtyVal} onChange={(e) => setMassQtyVal(e.target.value)} />
              <Button size="sm" className="h-7 text-xs" onClick={applyMassQty}>Set Qty</Button>
            </div>
            <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={removeSelected}>
              <Trash2 className="w-3 h-3 mr-1" /> Remove Selected
            </Button>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Grid */}
          <div className="flex-1 min-w-0">
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Line Items</CardTitle>
                  <Button size="sm" className="h-7 text-xs gap-1.5" onClick={() => setShowProductPicker(true)}>
                    <Plus className="w-3.5 h-3.5" /> Add Products
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30 text-muted-foreground text-xs uppercase tracking-wide">
                        <th className="px-3 py-2.5 text-left w-8">
                          <input type="checkbox" checked={selectedRows.size === lineItems.length && lineItems.length > 0} onChange={toggleAll} className="accent-blue-600" />
                        </th>
                        <th className="px-3 py-2.5 text-left">#</th>
                        <th className="px-3 py-2.5 text-left">Product</th>
                        <th className="px-3 py-2.5 text-left">Group</th>
                        <th className="px-3 py-2.5 text-right w-16">Qty</th>
                        <th className="px-3 py-2.5 text-right">List Price</th>
                        <th className="px-3 py-2.5 text-right w-24">Disc %</th>
                        <th className="px-3 py-2.5 text-right">Net Price</th>
                        {isAdmin && <th className="px-3 py-2.5 text-right">Margin %</th>}
                        <th className="px-3 py-2.5 text-right">Total</th>
                        <th className="px-3 py-2.5 w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {lineItems.length === 0 && (
                        <tr>
                          <td colSpan={isAdmin ? 11 : 10} className="text-center py-12 text-muted-foreground text-sm">
                            No line items. Click "Add Products" to start building your quote.
                          </td>
                        </tr>
                      )}
                      {(() => {
                        const rows: React.ReactNode[] = [];
                        const seenBundles = new Set<string>();
                        let lineNum = 0;
                        for (const li of lineItems) {
                          const pid = li.bundleParentId ?? null;
                          const isCollapsed = pid ? collapsedBundles.has(pid) : false;

                          // Bundle header row
                          if (pid && !seenBundles.has(pid)) {
                            seenBundles.add(pid);
                            lineNum++;
                            const children = lineItems.filter(x => x.bundleParentId === pid);
                            const bundleTotal = children.reduce((s, x) => s + calcTotal(x), 0);
                            const collapsed = collapsedBundles.has(pid);
                            const bundleName = li.groupLabel || "Bundle";
                            const bundleDisc = li.discountPct;
                            rows.push(
                              <tr key={`bh-${pid}`} className="border-b border-border bg-emerald-50/60 dark:bg-emerald-950/20 hover:bg-emerald-50 transition-colors">
                                <td className="px-3 py-2">
                                  <input type="checkbox" className="accent-blue-600"
                                    checked={children.every(c => selectedRows.has(c.id))}
                                    onChange={e => {
                                      children.forEach(c => {
                                        setSelectedRows(prev => { const s = new Set(prev); e.target.checked ? s.add(c.id) : s.delete(c.id); return s; });
                                      });
                                    }} />
                                </td>
                                <td className="px-3 py-2 text-muted-foreground text-xs">{lineNum}</td>
                                <td className="px-3 py-2" colSpan={isAdmin ? 6 : 5}>
                                  <button type="button" onClick={() => toggleBundle(pid)} className="flex items-center gap-2 text-left w-full group">
                                    {collapsed
                                      ? <ChevronDown className="w-3.5 h-3.5 text-emerald-600 shrink-0 -rotate-90" />
                                      : <ChevronDown className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                                    <Package className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                    <span className="text-sm font-semibold text-emerald-700 group-hover:underline">{bundleName}</span>
                                    <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">{children.length} item{children.length !== 1 ? "s" : ""}</span>
                                    {bundleDisc > 0 && <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full font-medium">{bundleDisc}% off</span>}
                                  </button>
                                </td>
                                <td className="px-3 py-2 text-right font-bold text-sm text-emerald-700">{fmtMoney(bundleTotal)}</td>
                                <td className="px-3 py-2">
                                  <button onClick={() => {
                                    setLineItems(prev => prev.filter(x => x.bundleParentId !== pid));
                                    setSelectedRows(prev => { const s = new Set(prev); children.forEach(c => s.delete(c.id)); return s; });
                                  }} className="text-muted-foreground hover:text-red-500 transition-colors" title="Remove bundle">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            );
                          }

                          // Skip children when bundle collapsed
                          if (pid && isCollapsed) continue;

                          // Regular or bundle child row
                          if (!pid) lineNum++;
                          rows.push(
                            <tr key={li.id} className={cn(
                              "border-b border-border last:border-0 hover:bg-muted/20 transition-colors",
                              pid && "bg-muted/5",
                              selectedRows.has(li.id) && "bg-blue-50"
                            )}>
                              <td className="px-3 py-2">
                                <input type="checkbox" checked={selectedRows.has(li.id)} onChange={() => toggleRow(li.id)} className="accent-blue-600" />
                              </td>
                              <td className="px-3 py-2 text-muted-foreground text-xs">{!pid ? lineNum : ""}</td>
                              <td className={cn("px-3 py-2", pid && "pl-8")}>
                                {pid && <span className="text-muted-foreground text-xs mr-1.5 select-none">└</span>}
                                <p className="inline font-medium text-sm">{li.productName}</p>
                                {li.productCode && <p className="text-xs text-muted-foreground">{li.productCode}</p>}
                              </td>
                              <td className="px-3 py-2">
                                {!pid && li.groupLabel && <Badge className="text-xs bg-muted text-muted-foreground">{li.groupLabel}</Badge>}
                              </td>
                              <td className="px-3 py-2 text-right">
                                <Input type="number" min={1} className="w-14 h-7 text-xs text-right p-1"
                                  value={li.qty}
                                  onChange={(e) => updateLine(li.id, "qty", Math.max(1, parseInt(e.target.value) || 1))} />
                              </td>
                              <td className="px-3 py-2 text-right text-sm">{fmtMoney(li.listPrice)}</td>
                              <td className="px-3 py-2 text-right">
                                <Input type="number" min={0} max={100} step={0.5}
                                  className={cn("w-20 h-7 text-xs text-right p-1", li.discountPct > 30 && "border-red-400 text-red-600")}
                                  value={li.discountPct}
                                  onChange={(e) => updateLine(li.id, "discountPct", Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))} />
                              </td>
                              <td className="px-3 py-2 text-right text-sm">{fmtMoney(calcNet(li))}</td>
                              {isAdmin && (
                                <td className={cn("px-3 py-2 text-right text-sm", calcMargin(li) < 10 ? "text-red-600" : "text-green-700")}>
                                  {calcMargin(li).toFixed(1)}%
                                </td>
                              )}
                              <td className="px-3 py-2 text-right font-semibold text-sm">{fmtMoney(calcTotal(li))}</td>
                              <td className="px-3 py-2">
                                <button onClick={() => deleteLine(li.id)} className="text-muted-foreground hover:text-red-500 transition-colors">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        }
                        return rows;
                      })()}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Summary Sidebar */}
          <div className="lg:w-64 shrink-0">
            <div className="sticky top-4 space-y-4">
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Quote Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5 pb-5">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{fmtMoney(subtotal)}</span>
                  </div>
                  {discountAmt > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Item Discounts</span>
                      <span className="text-red-600">-{fmtMoney(discountAmt)}</span>
                    </div>
                  )}
                  {quoteDiscountPct > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Quote Discount ({quoteDiscountPct}%)</span>
                      <span className="text-red-600">-{fmtMoney(subtotal * quoteDiscountPct / 100)}</span>
                    </div>
                  )}
                  {quoteTaxPct > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tax ({quoteTaxPct}%)</span>
                      <span>{fmtMoney(tax)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-bold border-t border-border pt-2.5">
                    <span>Total {quoteTaxPct > 0 ? "(inc. tax)" : "(ex. tax)"}</span>
                    <span className="text-emerald-700">{fmtMoney(total)}</span>
                  </div>
                  {isAdmin && (
                    <div className="flex justify-between text-sm border-t border-border pt-2.5">
                      <span className="text-muted-foreground">Avg Margin</span>
                      <span className={cn("font-semibold", avgMargin < 10 ? "text-red-600" : "text-green-700")}>
                        {avgMargin.toFixed(1)}%
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="space-y-2">
                {saveError && (
                  <p className="text-xs text-red-600 text-center">{saveError}</p>
                )}
                <Button className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2 text-sm" onClick={handleSaveClick} disabled={saveMutation.isPending}>
                  <Save className="w-4 h-4" />
                  {saveMutation.isPending ? "Saving…" : selectedQuoteId ? "Save Quote" : "Create Quote"}
                </Button>
                {selectedQuoteId && (
                  <Button variant="outline" className="w-full gap-2 text-sm border-blue-300 text-blue-700 hover:bg-blue-50"
                    onClick={() => navigate(`/quotes/${selectedQuoteId}`)}>
                    <ExternalLink className="w-4 h-4" /> View Quote Details
                  </Button>
                )}
                <Button variant="outline" className="w-full gap-2 text-sm" disabled={!selectedQuoteId}
                  onClick={() => {
                    if (!selectedQuoteId) return;
                    const base = import.meta.env.BASE_URL.replace(/\/$/, "");
                    window.open(`${base}/api/quotes/${selectedQuoteId}/pdf`, "_blank");
                  }}>
                  <FileDown className="w-4 h-4" /> Download PDF
                </Button>
                {hasHighDiscount && (
                  <>
                    {approvalStatus === "approved" ? (
                      <div className="flex items-center gap-2 rounded-md bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700">
                        <CheckCircle2 className="w-4 h-4 shrink-0" /> Approved by manager
                      </div>
                    ) : approvalStatus === "open" || approvalSubmitted ? (
                      <div className="flex items-center gap-2 rounded-md bg-blue-50 border border-blue-200 px-3 py-2 text-sm text-blue-700">
                        <Clock className="w-4 h-4 shrink-0" /> Awaiting manager approval
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        className="w-full gap-2 text-sm border-yellow-400 text-yellow-700 hover:bg-yellow-50"
                        onClick={handleSubmitApproval}
                        disabled={approvalMutation.isPending}
                      >
                        <Send className="w-4 h-4" />
                        {approvalMutation.isPending ? "Submitting…" : "Submit for Approval"}
                      </Button>
                    )}
                    {approvalError && (
                      <p className="text-xs text-red-600 text-center">{approvalError}</p>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* New Quote Dialog */}
      <Dialog open={showNewQuoteDialog} onOpenChange={setShowNewQuoteDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Create New Quote</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Quote Name</label>
              <Input
                placeholder="e.g. Q4 Enterprise Deal"
                value={newQuoteName}
                onChange={(e) => setNewQuoteName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && newQuoteName.trim() && saveMutation.mutate(newQuoteName.trim())}
                autoFocus
              />
            </div>
            {saveError && <p className="text-xs text-red-600">{saveError}</p>}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => { setShowNewQuoteDialog(false); setSaveError(null); }}>
                Cancel
              </Button>
              <Button
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                disabled={!newQuoteName.trim() || saveMutation.isPending}
                onClick={() => saveMutation.mutate(newQuoteName.trim())}
              >
                {saveMutation.isPending ? "Creating…" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Product Picker Dialog */}
      <Dialog open={showProductPicker} onOpenChange={(open) => { setShowProductPicker(open); if (!open) { setProductSearch(""); setPickerTab("products"); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add to Quote</DialogTitle>
          </DialogHeader>

          {/* Tabs */}
          <div className="flex border-b border-border mb-3">
            <button
              onClick={() => setPickerTab("products")}
              className={cn("px-4 py-2 text-sm font-medium border-b-2 transition-colors", pickerTab === "products" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}
            >
              Products
            </button>
            <button
              onClick={() => setPickerTab("bundles")}
              className={cn("px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5", pickerTab === "bundles" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}
            >
              <Package className="w-3.5 h-3.5" /> Bundles
              {bundles.length > 0 && <span className="ml-1 rounded-full bg-emerald-100 text-emerald-700 text-xs px-1.5 py-0.5 font-semibold">{bundles.length}</span>}
            </button>
          </div>

          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-9" placeholder={pickerTab === "bundles" ? "Search bundles…" : "Search products…"} value={productSearch} onChange={(e) => setProductSearch(e.target.value)} />
          </div>

          {pickerTab === "products" ? (
            <div className="max-h-80 overflow-y-auto divide-y divide-border border border-border rounded-md">
              {filteredProducts.slice(0, 30).map((p) => (
                <button key={p.id} onClick={() => addProduct(p)}
                  className="w-full text-left flex items-center justify-between px-4 py-2.5 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-2">
                    <Box className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-sm font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.sku} · {p.category}</p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold shrink-0 ml-4">{fmtMoney(parseFloat(p.unitPrice) || 0)}</span>
                </button>
              ))}
              {filteredProducts.length === 0 && (
                <p className="text-center py-6 text-sm text-muted-foreground">No products match.</p>
              )}
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto divide-y divide-border border border-border rounded-md">
              {bundles.filter((b: any) =>
                !productSearch || b.name?.toLowerCase().includes(productSearch.toLowerCase())
              ).map((b: any) => (
                <button key={b.id} onClick={() => addBundle(b)}
                  className="w-full text-left flex items-start justify-between px-4 py-3 hover:bg-emerald-50/60 transition-colors group">
                  <div className="flex items-start gap-2">
                    <div className="w-7 h-7 rounded bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                      <Package className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{b.name}</p>
                        <span className="text-xs bg-emerald-100 text-emerald-700 rounded-full px-1.5 py-0.5 font-medium">Bundle</span>
                        {b.bundle_discount_pct > 0 && (
                          <span className="text-xs bg-orange-100 text-orange-700 rounded-full px-1.5 py-0.5 font-medium">{b.bundle_discount_pct}% off</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{b.description ?? "Product bundle"}</p>
                    </div>
                  </div>
                  <span className="text-xs text-emerald-600 font-medium shrink-0 ml-4 mt-1 group-hover:underline">Add all items →</span>
                </button>
              ))}
              {bundles.length === 0 && (
                <p className="text-center py-6 text-sm text-muted-foreground">No bundles configured yet.</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
