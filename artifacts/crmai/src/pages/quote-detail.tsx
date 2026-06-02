import React, { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import {
  useGetQuote, useUpdateQuote, useCreateQuoteVersion, useSendQuote, useDeleteQuote,
  useListProducts,
  useListOpportunities, useListContacts, useListAccounts,
  useListPriceBooks, useListActivePriceBookEntries,
  useGetActiveContractPricing, useListContracts,
  getGetQuoteQueryKey, getListQuotesQueryKey, getListActivePriceBookEntriesQueryKey, getListContractsQueryKey,
  getGetActiveContractPricingQueryKey,
  CreateQuoteInputStatus, UpdateQuoteInputStatus,
} from "@workspace/api-client-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Download, Send, Copy, CheckCircle, XCircle, Clock, Check,
  FileText, FileSignature, Calendar, Package, Building2, User, History, Pencil, Plus, X, Save, Trash2,
} from "lucide-react";
import { format } from "date-fns";
import { useCurrency } from "@/context/currency";
import { useToast } from "@/hooks/use-toast";
import { EntityApprovals } from "@/components/entity-approvals";
import { ApprovalWarning } from "@/components/approval-warning";
import { useAuth } from "@/context/auth";

const STATUS_COLORS: Record<string, string> = {
  draft: "border-border text-muted-foreground",
  sent: "border-blue-500/30 text-blue-600 bg-blue-500/5",
  accepted: "border-green-500/30 text-green-600 bg-green-500/5",
  rejected: "border-red-500/30 text-red-600 bg-red-500/5",
  expired: "border-orange-500/30 text-orange-600 bg-orange-500/5",
};

interface EditableItem {
  productId: number | null;
  priceBookEntryId: number | null;
  productName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
}

export default function QuoteDetail() {
  const [, params] = useRoute("/quotes/:id");
  const [, navigate] = useLocation();
  const quoteId = parseInt(params?.id ?? "0");
  const { data: quote, isLoading, error } = useGetQuote(quoteId, { query: { enabled: quoteId > 0, queryKey: getGetQuoteQueryKey(quoteId) } });
  const updateMutation = useUpdateQuote();
  const versionMutation = useCreateQuoteVersion();
  const sendMutation = useSendQuote();
  const deleteMutation = useDeleteQuote();
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const { data: productsData } = useListProducts({ limit: 200 });
  const products = productsData?.data ?? [];
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { format: fmtMoney } = useCurrency();
  const { data: oppsData } = useListOpportunities({ limit: 200 });
  const opportunities = oppsData?.data ?? [];
  const { data: contactsData } = useListContacts({ limit: 200 });
  const contacts = contactsData?.data ?? [];
  const { data: accountsData } = useListAccounts({ limit: 200 });
  const accounts = accountsData?.data ?? [];

  const [activeTab, setActiveTab] = useState<"details" | "approvals" | "contracts">("details");
  const { data: quoteContractsData } = useListContracts(
    { opportunityId: quote?.opportunityId ?? undefined, limit: 100 },
    { query: { enabled: !!quote?.opportunityId, queryKey: getListContractsQueryKey({ opportunityId: quote?.opportunityId ?? undefined, limit: 100 }) } },
  );
  const quoteContracts = quoteContractsData?.data ?? [];
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  type EditSection = "header" | "parties" | "items" | "notes";
  const [editingSection, setEditingSection] = useState<EditSection | null>(null);
  const startEdit = (s: EditSection) => setEditingSection(s);
  const cancelEdit = () => setEditingSection(null);
  const [editName, setEditName] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editValidUntil, setEditValidUntil] = useState("");
  const [editDiscount, setEditDiscount] = useState("0");
  const [editTax, setEditTax] = useState("0");
  const [editNotes, setEditNotes] = useState("");
  const [editItems, setEditItems] = useState<EditableItem[]>([]);
  const [editOpportunityId, setEditOpportunityId] = useState<number | null>(null);
  const [editContactId, setEditContactId] = useState<number | null>(null);
  const [editAccountId, setEditAccountId] = useState<number | null>(null);
  const [editPriceBookId, setEditPriceBookId] = useState<number | null>(null);

  const { data: priceBooksData } = useListPriceBooks();
  const priceBooks = (priceBooksData?.data ?? []).filter(pb => pb.isActive);
  const { data: activeEntriesData } = useListActivePriceBookEntries(editPriceBookId ?? 0, {
    query: { enabled: (editPriceBookId ?? 0) > 0, queryKey: getListActivePriceBookEntriesQueryKey(editPriceBookId ?? 0) },
  });
  const entryByProduct = new Map((activeEntriesData?.data ?? []).map(e => [e.productId, e]));
  const priceBookName = (id: number | null | undefined) => priceBooks.find(pb => pb.id === id)?.name;

  const pricingAccountId = editAccountId ?? quote?.accountId ?? 0;
  const { data: contractPricingData } = useGetActiveContractPricing(pricingAccountId, {
    query: { enabled: pricingAccountId > 0, queryKey: getGetActiveContractPricingQueryKey(pricingAccountId) },
  });
  const contractPricing = contractPricingData?.pricing ?? {};
  const contractPriceFor = (productId: number) => contractPricing[String(productId)] ?? null;

  useEffect(() => {
    if (quote && editingSection) {
      setEditName(quote.name);
      setEditStatus(quote.status);
      setEditValidUntil(quote.validUntil ? quote.validUntil.split("T")[0] : "");
      setEditDiscount(String(quote.discount ?? 0));
      setEditTax(String(quote.tax ?? 0));
      setEditNotes(quote.notes ?? "");
      setEditOpportunityId(quote.opportunityId ?? null);
      setEditContactId(quote.contactId ?? null);
      setEditAccountId(quote.accountId ?? null);
      setEditPriceBookId(quote.priceBookId ?? null);
      setEditItems(quote.items.map(it => ({
        productId: it.productId ?? null,
        priceBookEntryId: it.priceBookEntryId ?? null,
        productName: it.productName,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        discount: it.discount ?? 0,
      })));
    }
  }, [editingSection, quote]);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: getGetQuoteQueryKey(quoteId) });
    void queryClient.invalidateQueries({ queryKey: getListQuotesQueryKey() });
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      await updateMutation.mutateAsync({ id: quoteId, data: { status: newStatus as UpdateQuoteInputStatus } });
      toast({ title: "Status updated", description: `Quote status changed to ${newStatus}` });
      invalidate();
    } catch {
      toast({ title: "Error", description: "Could not update status.", variant: "destructive" });
    }
  };

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync({
        id: quoteId,
        data: {
          name: editName,
          status: editStatus as CreateQuoteInputStatus,
          validUntil: editValidUntil || null,
          discount: parseFloat(editDiscount) || 0,
          tax: parseFloat(editTax) || 0,
          notes: editNotes || null,
          opportunityId: editOpportunityId,
          contactId: editContactId,
          accountId: editAccountId,
          priceBookId: editPriceBookId,
          items: editItems.filter(it => it.productName).map(it => ({
            productId: it.productId,
            priceBookEntryId: it.priceBookEntryId,
            productName: it.productName,
            quantity: it.quantity || 1,
            unitPrice: it.unitPrice || 0,
            discount: it.discount || 0,
          })),
        },
      });
      toast({ title: "Quote updated" });
      setEditingSection(null);
      invalidate();
    } catch {
      toast({ title: "Error", description: "Could not save quote. Only the latest version can be edited.", variant: "destructive" });
    }
  };

  const handleCreateVersion = async () => {
    try {
      const newQuote = await versionMutation.mutateAsync({ id: quoteId });
      toast({ title: "New version created", description: `Version ${newQuote.version} created as draft.` });
      invalidate();
      navigate(`/quotes/${newQuote.id}`);
    } catch {
      toast({ title: "Error", description: "Could not create version.", variant: "destructive" });
    }
  };

  const handleSend = async () => {
    try {
      const result = await sendMutation.mutateAsync({ id: quoteId });
      toast({ title: "Quote sent", description: result.message });
      invalidate();
    } catch {
      toast({ title: "Error", description: "Could not send quote.", variant: "destructive" });
    }
  };

  const handleDownloadPdf = () => {
    const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, "");
    window.open(`${baseUrl}/api/quotes/${quoteId}/pdf`, "_blank");
  };

  const lineTotal = (item: EditableItem) => item.quantity * item.unitPrice * (1 - (item.discount ?? 0) / 100);
  const editSubtotal = editItems.reduce((sum, item) => sum + lineTotal(item), 0);
  const editDiscountAmt = editSubtotal * (parseFloat(editDiscount) || 0) / 100;
  const editTaxAmt = (editSubtotal - editDiscountAmt) * (parseFloat(editTax) || 0) / 100;
  const editTotal = editSubtotal - editDiscountAmt + editTaxAmt;

  const addItem = () => setEditItems(prev => [...prev, { productId: null, priceBookEntryId: null, productName: "", quantity: 1, unitPrice: 0, discount: 0 }]);
  const removeItem = (idx: number) => setEditItems(prev => prev.filter((_, i) => i !== idx));
  const updateItem = (idx: number, changes: Partial<EditableItem>) =>
    setEditItems(prev => prev.map((item, i) => i === idx ? { ...item, ...changes } : item));
  const pickProduct = (idx: number, productId: number) => {
    const prod = products.find(p => p.id === productId);
    if (!prod) return;
    const entry = entryByProduct.get(productId);
    const contractPrice = contractPriceFor(productId);
    const basePrice = entry ? entry.listPrice : prod.unitPrice;
    updateItem(idx, {
      productId: prod.id,
      productName: prod.name,
      priceBookEntryId: entry?.id ?? null,
      unitPrice: contractPrice ? contractPrice.unitPrice : basePrice,
      discount: 0,
    });
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !quote) {
    return (
      <Layout>
        <div className="text-center py-20">
          <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-30" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Quote Not Found</h2>
          <Button variant="outline" onClick={() => navigate("/quotes")} className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Quotes
          </Button>
        </div>
      </Layout>
    );
  }

  const canEdit = quote.isLatestVersion !== false && (quote.status === "draft" || quote.status === "sent");

  return (
    <Layout>
      <div className="flex flex-col gap-6 max-w-5xl mx-auto">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/quotes")} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              {editingSection === "header" ? (
                <>
                  <Input value={editName} onChange={e => setEditName(e.target.value)} className="max-w-xs bg-muted border-border text-lg font-bold" />
                  <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending} className="bg-primary hover:bg-primary/90 text-foreground h-8">
                    <Save className="w-3.5 h-3.5 mr-1" /> Save
                  </Button>
                  <Button variant="outline" size="sm" onClick={cancelEdit} className="border-border h-8">
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  <h1 className="text-2xl font-display font-bold text-foreground tracking-tight">{quote.name}</h1>
                  {canEdit && (
                    <Button variant="ghost" size="icon" onClick={() => startEdit("header")} className="h-7 w-7 text-muted-foreground hover:text-foreground" title="Edit name">
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </>
              )}
              <Badge variant="outline" className={`capitalize ${STATUS_COLORS[quote.status] ?? ""}`}>
                {quote.status}
              </Badge>
              <span className="text-sm text-muted-foreground font-mono">{quote.quoteNumber}</span>
              <Badge variant="secondary" className="text-xs">v{quote.version}</Badge>
              {quote.isLatestVersion === false && (
                <Badge variant="outline" className="text-xs border-orange-500/30 text-orange-600 bg-orange-500/5">older version</Badge>
              )}
              {quote.clonedFromQuoteId && (
                <a
                  href={`/quotes/${quote.clonedFromQuoteId}`}
                  className="inline-flex items-center"
                  title={quote.clonedFromQuoteName ?? undefined}
                >
                  <Badge
                    variant="outline"
                    className="text-xs border-primary/30 text-primary bg-primary/5 hover:bg-primary/10 cursor-pointer gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    Cloned from {quote.clonedFromQuoteNumber ?? `#${quote.clonedFromQuoteId}`}
                  </Badge>
                </a>
              )}
            </div>
            {(quote.createdByName || quote.createdAt) && (
              <div className="mt-1 text-xs text-muted-foreground">
                Created by <span className="font-medium text-foreground">{quote.createdByName ?? "System"}</span>
                {quote.createdAt && (
                  <> on {format(new Date(quote.createdAt), "MMM d, yyyy 'at' h:mm a")}</>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleDownloadPdf} className="border-border">
            <Download className="w-4 h-4 mr-2" /> Download PDF
          </Button>
          {quote.status === "draft" && (
            <Button size="sm" onClick={handleSend} disabled={sendMutation.isPending} className="bg-blue-600 hover:bg-blue-700 text-white">
              <Send className="w-4 h-4 mr-2" /> Send to Customer
            </Button>
          )}
          {quote.status === "sent" && (
            <>
              <Button size="sm" onClick={() => handleStatusChange("accepted")} className="bg-green-600 hover:bg-green-700 text-white">
                <CheckCircle className="w-4 h-4 mr-2" /> Accept
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleStatusChange("rejected")} className="border-red-500/30 text-red-600 hover:bg-red-500/10">
                <XCircle className="w-4 h-4 mr-2" /> Reject
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleStatusChange("expired")} className="border-orange-500/30 text-orange-600 hover:bg-orange-500/10">
                <Clock className="w-4 h-4 mr-2" /> Mark Expired
              </Button>
            </>
          )}
          {canEdit && (
            <Button variant="outline" size="sm" onClick={handleCreateVersion} disabled={versionMutation.isPending} className="border-border">
              <Copy className="w-4 h-4 mr-2" /> Revise Quote
            </Button>
          )}
          {quote.status === "accepted" && (
            <Button size="sm" onClick={() => navigate(`/orders?fromQuote=${quoteId}`)} className="bg-primary hover:bg-primary/90 text-foreground">
              <Package className="w-4 h-4 mr-2" /> Convert to Order
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsDeleteOpen(true)}
            className="border-red-500/30 text-red-600 hover:bg-red-500/10 ml-auto"
          >
            <Trash2 className="w-4 h-4 mr-2" /> Delete
          </Button>
        </div>

        <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <AlertDialogContent className="bg-card border-border text-foreground">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Quote?</AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground">
                This will permanently delete <span className="font-medium text-foreground">{quote.quoteNumber}</span>
                {quote.name ? <> — <span className="font-medium text-foreground">{quote.name}</span></> : null}.
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-border">Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={deleteMutation.isPending}
                onClick={async (e) => {
                  e.preventDefault();
                  try {
                    await deleteMutation.mutateAsync({ id: quoteId });
                    await queryClient.invalidateQueries({ queryKey: getListQuotesQueryKey() });
                    toast({ title: "Quote deleted", description: `${quote.quoteNumber} has been removed.` });
                    setIsDeleteOpen(false);
                    navigate("/quotes");
                  } catch {
                    toast({ title: "Delete failed", description: "Could not delete quote.", variant: "destructive" });
                  }
                }}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {deleteMutation.isPending ? "Deleting…" : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Tabs */}
        <div className="inline-flex items-center gap-1 rounded-lg bg-muted/70 border border-border p-1">
          {(["details", "contracts", "approvals"] as const).map((t) => {
            const isActive = activeTab === t;
            const label = t === "details" ? "Quote Details" : t === "contracts" ? "Contracts" : "Approvals";
            return (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all capitalize flex items-center gap-1.5 ${
                  isActive
                    ? "bg-primary text-white font-semibold shadow-md ring-1 ring-primary/40"
                    : "bg-sky-100 text-sky-700 hover:bg-sky-200"
                }`}
              >
                {label}
                {t === "contracts" && quoteContracts.length > 0 && (
                  <span className={`text-xs rounded-full px-1.5 py-0.5 ${isActive ? "bg-white/20 text-white" : "bg-muted text-foreground"}`}>{quoteContracts.length}</span>
                )}
              </button>
            );
          })}
        </div>

        {activeTab === "approvals" && (
          <EntityApprovals
            entity="quote"
            record={quote as unknown as Record<string, unknown>}
            isAdmin={isAdmin}
          />
        )}

        {activeTab === "contracts" && (
          <div className="flex flex-col gap-3">
            {!quote.opportunityId ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileSignature className="w-10 h-8 mx-auto mb-3 opacity-30" />
                Link this quote to an opportunity to see its contracts.
              </div>
            ) : quoteContracts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileSignature className="w-10 h-8 mx-auto mb-3 opacity-30" />
                No contracts for this deal yet.
              </div>
            ) : (
              quoteContracts.map((c) => (
                <Card key={c.id} className="glass-panel border-border hover:border-primary/30 transition-all p-4 cursor-pointer" onClick={() => navigate(`/contracts/${c.id}`)}>
                  <div className="flex items-center gap-4">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <FileSignature className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground truncate">{c.name}</p>
                        <Badge variant="outline" className="text-xs capitalize shrink-0">
                          {c.status.replace("_", " ")}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span>#{c.contractNumber}</span>
                        {c.startDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(c.startDate), "MMM d, yyyy")}
                            {c.endDate ? ` → ${format(new Date(c.endDate), "MMM d, yyyy")}` : ""}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold text-foreground">{fmtMoney(Number(c.total))}</p>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {activeTab === "details" && (<>
        {/* Status Workflow Bar — Salesforce-style chevrons */}
        <Card className="glass-panel border-border p-4">
          {(() => {
            const baseStages = [
              { id: "draft", label: "Draft" },
              { id: "sent", label: "Sent" },
              { id: "accepted", label: "Accepted" },
            ];
            let stages = baseStages;
            if (quote.status === "rejected") stages = [...baseStages, { id: "rejected", label: "Rejected" }];
            else if (quote.status === "expired") stages = [...baseStages, { id: "expired", label: "Expired" }];
            const idx = stages.findIndex((s) => s.id === quote.status);
            if (idx < 0) return null;
            const currentCls =
              quote.status === "rejected" ? "bg-red-600 text-white" :
              quote.status === "expired" ? "bg-amber-500 text-white" :
              "bg-blue-600 text-white";
            return (
              <ol
                role="list"
                aria-label="Quote status"
                className="flex items-stretch overflow-hidden rounded-md border border-border bg-muted/30 list-none p-0 m-0"
              >
                {stages.map((s, i) => {
                  const done = i < idx;
                  const current = i === idx;
                  const isLast = i === stages.length - 1;
                  return (
                    <li
                      key={s.id}
                      role="listitem"
                      aria-current={current ? "step" : undefined}
                      aria-label={`${s.label} — ${done ? "Completed" : current ? "Current" : "Upcoming"}`}
                      className={`relative flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium min-w-0 ${
                        done ? "bg-emerald-500 text-white" :
                        current ? currentCls :
                        "bg-muted/50 text-muted-foreground"
                      }`}
                      style={!isLast
                        ? { clipPath: "polygon(0 0, calc(100% - 10px) 0, 100% 50%, calc(100% - 10px) 100%, 0 100%, 10px 50%)" }
                        : { clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%, 10px 50%)" }}
                    >
                      {done && <Check className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />}
                      <span className="truncate max-w-full">{s.label}</span>
                    </li>
                  );
                })}
              </ol>
            );
          })()}
        </Card>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Customer Details</h3>
            {editingSection === "parties" ? (
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending} className="bg-primary hover:bg-primary/90 text-foreground h-8">
                  <Save className="w-3.5 h-3.5 mr-1" /> Save
                </Button>
                <Button variant="outline" size="sm" onClick={cancelEdit} className="border-border h-8">
                  Cancel
                </Button>
              </div>
            ) : canEdit ? (
              <Button variant="ghost" size="sm" onClick={() => startEdit("parties")} className="h-7 text-xs text-muted-foreground hover:text-foreground">
                <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
              </Button>
            ) : null}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="glass-panel border-border p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-3">
                <Package className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase">Price Book</span>
              </div>
              {editingSection === "parties" ? (
                <select className="w-full h-8 px-2 rounded-md bg-muted border border-border text-foreground text-sm"
                  value={editPriceBookId ?? ""}
                  onChange={e => setEditPriceBookId(e.target.value ? parseInt(e.target.value) : null)}>
                  <option value="">None</option>
                  {priceBooks.map(pb => <option key={pb.id} value={pb.id}>{pb.name}</option>)}
                </select>
              ) : (
                <p className="text-foreground font-medium">{priceBookName(quote.priceBookId) ?? "—"}</p>
              )}
            </Card>
            <Card className="glass-panel border-border p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-3">
                <FileText className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase">Opportunity</span>
              </div>
              {editingSection === "parties" ? (
                <select className="w-full h-8 px-2 rounded-md bg-muted border border-border text-foreground text-sm"
                  value={editOpportunityId ?? ""}
                  onChange={e => setEditOpportunityId(e.target.value ? parseInt(e.target.value) : null)}>
                  <option value="">None</option>
                  {opportunities.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              ) : quote.opportunityId ? (
                <button className="text-primary hover:underline font-medium text-left" onClick={() => navigate(`/opportunities/${quote.opportunityId}`)}>
                  {quote.opportunityName ?? `Opportunity #${quote.opportunityId}`}
                </button>
              ) : (
                <p className="text-foreground font-medium">—</p>
              )}
            </Card>
            <Card className="glass-panel border-border p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-3">
                <Building2 className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase">Account</span>
              </div>
              {editingSection === "parties" ? (
                <select className="w-full h-8 px-2 rounded-md bg-muted border border-border text-foreground text-sm"
                  value={editAccountId ?? ""}
                  onChange={e => setEditAccountId(e.target.value ? parseInt(e.target.value) : null)}>
                  <option value="">None</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              ) : quote.accountId && quote.accountName ? (
                <button className="text-primary hover:underline font-medium text-left" onClick={() => navigate(`/accounts/${quote.accountId}`)}>
                  {quote.accountName}
                </button>
              ) : (
                <p className="text-foreground font-medium">{quote.accountName ?? "—"}</p>
              )}
            </Card>
            <Card className="glass-panel border-border p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-3">
                <User className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase">Contact</span>
              </div>
              {editingSection === "parties" ? (
                <select className="w-full h-8 px-2 rounded-md bg-muted border border-border text-foreground text-sm"
                  value={editContactId ?? ""}
                  onChange={e => setEditContactId(e.target.value ? parseInt(e.target.value) : null)}>
                  <option value="">None</option>
                  {contacts.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
                </select>
              ) : (
                <>
                  {quote.contactId && quote.contactName ? (
                    <button className="text-primary hover:underline font-medium text-left" onClick={() => navigate(`/contacts/${quote.contactId}`)}>
                      {quote.contactName}
                    </button>
                  ) : (
                    <p className="text-foreground font-medium">{quote.contactName ?? "—"}</p>
                  )}
                  {quote.contactEmail && <p className="text-xs text-muted-foreground mt-1">{quote.contactEmail}</p>}
                </>
              )}
            </Card>
            <Card className="glass-panel border-border p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-3">
                <Clock className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase">Valid Until</span>
              </div>
              {editingSection === "parties" ? (
                <Input type="date" value={editValidUntil} onChange={e => setEditValidUntil(e.target.value)} className="bg-muted border-border h-8" />
              ) : (
                <p className="text-foreground font-medium">
                  {quote.validUntil ? format(new Date(quote.validUntil), "MMM d, yyyy") : "—"}
                </p>
              )}
            </Card>
          </div>
        </div>

        {/* Line Items */}
        <Card className="glass-panel border-border">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Line Items & Totals</h3>
            <div className="flex items-center gap-2">
              {editingSection === "items" && (
                <Button type="button" variant="outline" size="sm" onClick={addItem} className="border-border text-xs">
                  <Plus className="w-3 h-3 mr-1" /> Add Item
                </Button>
              )}
              {editingSection === "items" ? (
                <>
                  <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending} className="bg-primary hover:bg-primary/90 text-foreground h-8">
                    <Save className="w-3.5 h-3.5 mr-1" /> Save
                  </Button>
                  <Button variant="outline" size="sm" onClick={cancelEdit} className="border-border h-8">
                    Cancel
                  </Button>
                </>
              ) : canEdit ? (
                <Button variant="ghost" size="sm" onClick={() => startEdit("items")} className="h-7 text-xs text-muted-foreground hover:text-foreground">
                  <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                </Button>
              ) : null}
            </div>
          </div>
          {editingSection === "items" ? (
            <div className="p-4 space-y-2">
              <div className="grid grid-cols-12 gap-2 text-xs text-muted-foreground uppercase px-1 mb-1">
                <span className="col-span-4">Product</span>
                <span className="col-span-2 text-right">Qty</span>
                <span className="col-span-2 text-right">Unit Price</span>
                <span className="col-span-2 text-right">Disc %</span>
                <span className="col-span-1 text-right">Total</span>
                <span className="col-span-1"></span>
              </div>
              {editItems.length === 0 ? (
                <div className="border border-dashed border-border rounded-lg p-6 text-center text-muted-foreground text-sm cursor-pointer hover:border-primary/30 transition-colors" onClick={addItem}>
                  <Package className="w-6 h-6 mx-auto mb-2 opacity-40" />
                  Click to add products
                </div>
              ) : editItems.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-muted/50 rounded-lg p-2">
                  <div className="col-span-4">
                    <select
                      className="w-full h-8 px-2 rounded-md bg-muted border border-border text-foreground text-sm"
                      value={item.productId ?? ""}
                      onChange={e => {
                        const val = e.target.value;
                        if (val === "") updateItem(idx, { productId: null, productName: "", unitPrice: 0 });
                        else pickProduct(idx, parseInt(val));
                      }}
                    >
                      <option value="">Custom / No product</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    {!item.productId && (
                      <Input className="mt-1 h-7 text-xs bg-muted border-border" placeholder="Product name..."
                        value={item.productName} onChange={e => updateItem(idx, { productName: e.target.value })} />
                    )}
                    {item.productId != null && contractPriceFor(item.productId) && (
                      <p className="mt-1 text-[10px] text-green-600 flex items-center gap-1">
                        Contract price applied ({contractPriceFor(item.productId)!.contractNumber})
                      </p>
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
                  <div className="col-span-1 text-right text-sm font-medium text-foreground">
                    {fmtMoney(lineTotal(item))}
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-600"
                      onClick={() => removeItem(idx)}>
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                  <tr>
                    <th className="px-2 py-1 text-left font-medium">Product</th>
                    <th className="px-2 py-1 text-right font-medium">Qty</th>
                    <th className="px-2 py-1 text-right font-medium">Unit Price</th>
                    <th className="px-2 py-1 text-right font-medium">Disc %</th>
                    <th className="px-2 py-1 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {quote.items.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No line items</td></tr>
                  ) : quote.items.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-2 py-1 text-foreground font-medium">{item.productName}</td>
                      <td className="px-2 py-1 text-right text-muted-foreground">{item.quantity}</td>
                      <td className="px-2 py-1 text-right text-muted-foreground">{fmtMoney(item.unitPrice)}</td>
                      <td className="px-2 py-1 text-right text-muted-foreground">{item.discount}%</td>
                      <td className="px-2 py-1 text-right font-semibold text-foreground">{fmtMoney(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Totals */}
          <div className="p-4 border-t border-border space-y-2">
            {editingSection === "items" ? (
              <>
                <div className="grid grid-cols-2 gap-3 max-w-xs ml-auto">
                  <div>
                    <Label className="text-xs text-muted-foreground">Discount %</Label>
                    <Input type="number" min="0" max="100" className="h-8 bg-muted border-border text-sm"
                      value={editDiscount} onChange={e => setEditDiscount(e.target.value)} />
                    <ApprovalWarning
                      entity="quote"
                      className="mt-2"
                      snapshot={{ discountPercent: parseFloat(editDiscount) || 0, total: editTotal }}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Tax %</Label>
                    <Input type="number" min="0" className="h-8 bg-muted border-border text-sm"
                      value={editTax} onChange={e => setEditTax(e.target.value)} />
                  </div>
                </div>
                <div className="border-t border-border pt-2 mt-2 space-y-1 text-sm max-w-xs ml-auto">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span><span>{fmtMoney(editSubtotal)}</span>
                  </div>
                  {editDiscountAmt > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Discount ({editDiscount}%)</span><span>-{fmtMoney(editDiscountAmt)}</span>
                    </div>
                  )}
                  {editTaxAmt > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Tax ({editTax}%)</span><span>{fmtMoney(editTaxAmt)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-foreground text-lg border-t border-border pt-1 mt-1">
                    <span>Total</span><span>{fmtMoney(editTotal)}</span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Subtotal</span><span>{fmtMoney(quote.subtotal)}</span>
                </div>
                {quote.discount > 0 && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Discount ({quote.discount}%)</span><span>-{fmtMoney(quote.subtotal * quote.discount / 100)}</span>
                  </div>
                )}
                {quote.tax > 0 && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Tax ({quote.tax}%)</span><span>{fmtMoney(quote.subtotal * (1 - quote.discount / 100) * quote.tax / 100)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-foreground text-lg border-t border-border pt-2 mt-2">
                  <span>Total</span><span>{fmtMoney(quote.total)}</span>
                </div>
              </>
            )}
          </div>
        </Card>

        {/* Notes */}
        {(canEdit || quote.notes) && (
          <Card className="glass-panel border-border p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-foreground">Notes & Terms</h3>
              {editingSection === "notes" ? (
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending} className="bg-primary hover:bg-primary/90 text-foreground h-8">
                    <Save className="w-3.5 h-3.5 mr-1" /> Save
                  </Button>
                  <Button variant="outline" size="sm" onClick={cancelEdit} className="border-border h-8">
                    Cancel
                  </Button>
                </div>
              ) : canEdit ? (
                <Button variant="ghost" size="sm" onClick={() => startEdit("notes")} className="h-7 text-xs text-muted-foreground hover:text-foreground">
                  <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                </Button>
              ) : null}
            </div>
            {editingSection === "notes" ? (
              <Textarea value={editNotes} onChange={e => setEditNotes(e.target.value)}
                className="bg-muted border-border min-h-[100px]" placeholder="Internal notes or terms..." />
            ) : quote.notes ? (
              <p className="text-muted-foreground text-sm whitespace-pre-wrap">{quote.notes}</p>
            ) : (
              <p className="text-muted-foreground text-sm italic">No notes yet.</p>
            )}
          </Card>
        )}

        {/* Version History */}
        {quote.versions && quote.versions.length > 1 && (
          <Card className="glass-panel border-border">
            <div className="p-4 border-b border-border flex items-center gap-2">
              <History className="w-4 h-4 text-muted-foreground" />
              <h3 className="font-semibold text-foreground">Version History</h3>
            </div>
            <div className="divide-y divide-border">
              {quote.versions.map((v) => (
                <div
                  key={v.id}
                  className={`px-2 py-1 flex items-center justify-between cursor-pointer hover:bg-muted/30 transition-colors ${v.id === quote.id ? "bg-primary/5" : ""}`}
                  onClick={() => { if (v.id !== quote.id) navigate(`/quotes/${v.id}`); }}
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="text-xs">v{v.version}</Badge>
                    <span className="text-sm font-mono text-muted-foreground">{v.quoteNumber}</span>
                    <Badge variant="outline" className={`capitalize text-xs ${STATUS_COLORS[v.status] ?? ""}`}>
                      {v.status}
                    </Badge>
                    {v.id === quote.id && (
                      <span className="text-xs text-primary font-medium">(current)</span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">{format(new Date(v.createdAt), "MMM d, yyyy")}</span>
                </div>
              ))}
            </div>
          </Card>
        )}
        </>)}
      </div>
    </Layout>
  );
}
