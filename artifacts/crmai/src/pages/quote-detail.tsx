import React, { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import {
  useGetQuote, useUpdateQuote, useCreateQuoteVersion, useSendQuote,
  useListProducts, useListOpportunityItems,
  useListOpportunities, useListContacts, useListAccounts,
  getGetQuoteQueryKey, getListQuotesQueryKey,
  CreateQuoteInputStatus,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Download, Send, Copy, CheckCircle, XCircle, Clock,
  FileText, Package, Building2, User, History, Pencil, Plus, X, Save,
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const STATUS_COLORS: Record<string, string> = {
  draft: "border-border text-muted-foreground",
  sent: "border-blue-500/30 text-blue-600 bg-blue-500/5",
  accepted: "border-green-500/30 text-green-600 bg-green-500/5",
  rejected: "border-red-500/30 text-red-600 bg-red-500/5",
  expired: "border-orange-500/30 text-orange-600 bg-orange-500/5",
};

interface EditableItem {
  productId: number | null;
  productName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
}

export default function QuoteDetail() {
  const [, params] = useRoute("/quotes/:id");
  const [, navigate] = useLocation();
  const quoteId = parseInt(params?.id ?? "0");
  const { data: quote, isLoading, error } = useGetQuote(quoteId, { query: { enabled: quoteId > 0 } });
  const updateMutation = useUpdateQuote();
  const versionMutation = useCreateQuoteVersion();
  const sendMutation = useSendQuote();
  const { data: productsData } = useListProducts({ limit: 200 });
  const products = productsData?.data ?? [];
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: oppItemsData } = useListOpportunityItems(quote?.opportunityId ?? 0, {
    query: { enabled: !!quote?.opportunityId },
  });
  const opportunityItems = oppItemsData?.data ?? [];
  const { data: oppsData } = useListOpportunities({ limit: 200 });
  const opportunities = oppsData?.data ?? [];
  const { data: contactsData } = useListContacts({ limit: 200 });
  const contacts = contactsData?.data ?? [];
  const { data: accountsData } = useListAccounts({ limit: 200 });
  const accounts = accountsData?.data ?? [];

  const [isEditing, setIsEditing] = useState(false);
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

  useEffect(() => {
    if (quote && isEditing) {
      setEditName(quote.name);
      setEditStatus(quote.status);
      setEditValidUntil(quote.validUntil ? quote.validUntil.split("T")[0] : "");
      setEditDiscount(String(quote.discount ?? 0));
      setEditTax(String(quote.tax ?? 0));
      setEditNotes(quote.notes ?? "");
      setEditOpportunityId(quote.opportunityId ?? null);
      setEditContactId(quote.contactId ?? null);
      setEditAccountId(quote.accountId ?? null);
      setEditItems(quote.items.map(it => ({
        productId: it.productId ?? null,
        productName: it.productName,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        discount: it.discount ?? 0,
      })));
    }
  }, [isEditing, quote]);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: getGetQuoteQueryKey(quoteId) });
    void queryClient.invalidateQueries({ queryKey: getListQuotesQueryKey() });
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      await updateMutation.mutateAsync({ id: quoteId, data: { status: newStatus } });
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
          items: editItems.filter(it => it.productName).map(it => ({
            productId: it.productId,
            productName: it.productName,
            quantity: it.quantity || 1,
            unitPrice: it.unitPrice || 0,
            discount: it.discount || 0,
          })),
        },
      });
      toast({ title: "Quote updated" });
      setIsEditing(false);
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

  const addItem = () => setEditItems(prev => [...prev, { productId: null, productName: "", quantity: 1, unitPrice: 0, discount: 0 }]);
  const removeItem = (idx: number) => setEditItems(prev => prev.filter((_, i) => i !== idx));
  const updateItem = (idx: number, changes: Partial<EditableItem>) =>
    setEditItems(prev => prev.map((item, i) => i === idx ? { ...item, ...changes } : item));
  const pickProduct = (idx: number, productId: number) => {
    const prod = products.find(p => p.id === productId);
    if (prod) updateItem(idx, { productId: prod.id, productName: prod.name, unitPrice: prod.unitPrice, discount: 0 });
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
              {isEditing ? (
                <Input value={editName} onChange={e => setEditName(e.target.value)} className="max-w-xs bg-muted border-border text-lg font-bold" />
              ) : (
                <h1 className="text-2xl font-display font-bold text-foreground tracking-tight">{quote.name}</h1>
              )}
              <Badge variant="outline" className={`capitalize ${STATUS_COLORS[quote.status] ?? ""}`}>
                {quote.status}
              </Badge>
              <span className="text-sm text-muted-foreground font-mono">{quote.quoteNumber}</span>
              <Badge variant="secondary" className="text-xs">v{quote.version}</Badge>
              {quote.isLatestVersion === false && (
                <Badge variant="outline" className="text-xs border-orange-500/30 text-orange-600 bg-orange-500/5">older version</Badge>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleDownloadPdf} className="border-border">
            <Download className="w-4 h-4 mr-2" /> Download PDF
          </Button>
          {canEdit && !isEditing && (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} className="border-border">
              <Pencil className="w-4 h-4 mr-2" /> Edit Quote
            </Button>
          )}
          {isEditing && (
            <>
              <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending} className="bg-primary hover:bg-primary/90 text-foreground">
                <Save className="w-4 h-4 mr-2" /> {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setIsEditing(false)} className="border-border">
                Cancel
              </Button>
            </>
          )}
          {!isEditing && quote.status === "draft" && (
            <Button size="sm" onClick={handleSend} disabled={sendMutation.isPending} className="bg-blue-600 hover:bg-blue-700 text-white">
              <Send className="w-4 h-4 mr-2" /> Send to Customer
            </Button>
          )}
          {!isEditing && quote.status === "sent" && (
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
          {canEdit && !isEditing && (
            <Button variant="outline" size="sm" onClick={handleCreateVersion} disabled={versionMutation.isPending} className="border-border">
              <Copy className="w-4 h-4 mr-2" /> Create New Version
            </Button>
          )}
          {!isEditing && quote.status === "accepted" && (
            <Button size="sm" onClick={() => navigate(`/orders?fromQuote=${quoteId}`)} className="bg-primary hover:bg-primary/90 text-foreground">
              <Package className="w-4 h-4 mr-2" /> Convert to Order
            </Button>
          )}
        </div>

        {/* Status Workflow Bar */}
        <Card className="glass-panel border-border p-4">
          <div className="flex items-center gap-1">
            {["draft", "sent", "accepted"].map((s, idx) => {
              const mainStages = ["draft", "sent", "accepted"];
              const isActive = s === quote.status;
              const isPast = mainStages.indexOf(quote.status) > idx;
              return (
                <React.Fragment key={s}>
                  {idx > 0 && <div className={`flex-1 h-0.5 ${isPast ? "bg-green-500" : "bg-border"}`} />}
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    isActive ? "bg-primary/10 text-primary"
                    : isPast ? "bg-green-500/10 text-green-600"
                    : "bg-muted text-muted-foreground"
                  }`}>
                    {isPast ? <CheckCircle className="w-3 h-3" /> : null}
                    <span className="capitalize">{s}</span>
                  </div>
                </React.Fragment>
              );
            })}
            {quote.status === "rejected" && (
              <>
                <div className="flex-1 h-0.5 bg-red-500/30" />
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-red-500/10 text-red-600">
                  <XCircle className="w-3 h-3" /> Rejected
                </div>
              </>
            )}
            {quote.status === "expired" && (
              <>
                <div className="flex-1 h-0.5 bg-orange-500/30" />
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-orange-500/10 text-orange-600">
                  <Clock className="w-3 h-3" /> Expired
                </div>
              </>
            )}
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="glass-panel border-border p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-3">
              <FileText className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase">Opportunity</span>
            </div>
            {isEditing ? (
              <select className="w-full h-8 px-2 rounded-md bg-muted border border-border text-foreground text-sm"
                value={editOpportunityId ?? ""}
                onChange={e => setEditOpportunityId(e.target.value ? parseInt(e.target.value) : null)}>
                <option value="">None</option>
                {opportunities.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            ) : quote.opportunityId ? (
              <button className="text-primary hover:underline font-medium text-left" onClick={() => navigate(`/opportunities`)}>
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
            {isEditing ? (
              <select className="w-full h-8 px-2 rounded-md bg-muted border border-border text-foreground text-sm"
                value={editAccountId ?? ""}
                onChange={e => setEditAccountId(e.target.value ? parseInt(e.target.value) : null)}>
                <option value="">None</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            ) : (
              <p className="text-foreground font-medium">{quote.accountName ?? "—"}</p>
            )}
          </Card>
          <Card className="glass-panel border-border p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-3">
              <User className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase">Contact</span>
            </div>
            {isEditing ? (
              <select className="w-full h-8 px-2 rounded-md bg-muted border border-border text-foreground text-sm"
                value={editContactId ?? ""}
                onChange={e => setEditContactId(e.target.value ? parseInt(e.target.value) : null)}>
                <option value="">None</option>
                {contacts.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
              </select>
            ) : (
              <>
                <p className="text-foreground font-medium">{quote.contactName ?? "—"}</p>
                {quote.contactEmail && <p className="text-xs text-muted-foreground mt-1">{quote.contactEmail}</p>}
              </>
            )}
          </Card>
          <Card className="glass-panel border-border p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-3">
              <Clock className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase">Valid Until</span>
            </div>
            {isEditing ? (
              <Input type="date" value={editValidUntil} onChange={e => setEditValidUntil(e.target.value)} className="bg-muted border-border h-8" />
            ) : (
              <p className="text-foreground font-medium">
                {quote.validUntil ? format(new Date(quote.validUntil), "MMM d, yyyy") : "—"}
              </p>
            )}
          </Card>
        </div>

        {/* Opportunity Line Items (source reference) */}
        {opportunityItems.length > 0 && (
          <Card className="glass-panel border-border border-blue-500/20">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-500" />
                <h3 className="font-semibold text-foreground">Opportunity Line Items</h3>
                <Badge variant="secondary" className="text-xs">{opportunityItems.length} items from opportunity</Badge>
              </div>
              {isEditing && editItems.length === 0 && (
                <Button type="button" variant="outline" size="sm"
                  className="border-blue-500/30 text-blue-600 hover:bg-blue-500/10 text-xs"
                  onClick={() => setEditItems(opportunityItems.map(oi => ({
                    productId: oi.productId ?? null,
                    productName: oi.productName,
                    quantity: oi.quantity,
                    unitPrice: oi.unitPrice,
                    discount: oi.discount ?? 0,
                  })))}
                >
                  <Copy className="w-3 h-3 mr-1" /> Import to Quote
                </Button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground uppercase bg-blue-500/5 border-b border-border">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">Product</th>
                    <th className="px-4 py-2 text-right font-medium">Qty</th>
                    <th className="px-4 py-2 text-right font-medium">Unit Price</th>
                    <th className="px-4 py-2 text-right font-medium">Disc %</th>
                    <th className="px-4 py-2 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {opportunityItems.map((item) => (
                    <tr key={item.id} className="hover:bg-blue-500/5 transition-colors">
                      <td className="px-4 py-2 text-foreground">{item.productName}</td>
                      <td className="px-4 py-2 text-right text-muted-foreground">{item.quantity}</td>
                      <td className="px-4 py-2 text-right text-muted-foreground">${item.unitPrice.toFixed(2)}</td>
                      <td className="px-4 py-2 text-right text-muted-foreground">{item.discount}%</td>
                      <td className="px-4 py-2 text-right font-medium text-foreground">${item.total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Line Items */}
        <Card className="glass-panel border-border">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Line Items</h3>
            {isEditing && (
              <Button type="button" variant="outline" size="sm" onClick={addItem} className="border-border text-xs">
                <Plus className="w-3 h-3 mr-1" /> Add Item
              </Button>
            )}
          </div>
          {isEditing ? (
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
                    ${lineTotal(item).toFixed(2)}
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
                    <th className="px-4 py-3 text-left font-medium">Product</th>
                    <th className="px-4 py-3 text-right font-medium">Qty</th>
                    <th className="px-4 py-3 text-right font-medium">Unit Price</th>
                    <th className="px-4 py-3 text-right font-medium">Disc %</th>
                    <th className="px-4 py-3 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {quote.items.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No line items</td></tr>
                  ) : quote.items.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 text-foreground font-medium">{item.productName}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{item.quantity}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">${item.unitPrice.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{item.discount}%</td>
                      <td className="px-4 py-3 text-right font-semibold text-foreground">${item.total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Totals */}
          <div className="p-4 border-t border-border space-y-2">
            {isEditing ? (
              <>
                <div className="grid grid-cols-2 gap-3 max-w-xs ml-auto">
                  <div>
                    <Label className="text-xs text-muted-foreground">Discount %</Label>
                    <Input type="number" min="0" max="100" className="h-8 bg-muted border-border text-sm"
                      value={editDiscount} onChange={e => setEditDiscount(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Tax %</Label>
                    <Input type="number" min="0" className="h-8 bg-muted border-border text-sm"
                      value={editTax} onChange={e => setEditTax(e.target.value)} />
                  </div>
                </div>
                <div className="border-t border-border pt-2 mt-2 space-y-1 text-sm max-w-xs ml-auto">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span><span>${editSubtotal.toFixed(2)}</span>
                  </div>
                  {editDiscountAmt > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Discount ({editDiscount}%)</span><span>-${editDiscountAmt.toFixed(2)}</span>
                    </div>
                  )}
                  {editTaxAmt > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Tax ({editTax}%)</span><span>${editTaxAmt.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-foreground text-lg border-t border-border pt-1 mt-1">
                    <span>Total</span><span>${editTotal.toFixed(2)}</span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Subtotal</span><span>${quote.subtotal.toFixed(2)}</span>
                </div>
                {quote.discount > 0 && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Discount ({quote.discount}%)</span><span>-${(quote.subtotal * quote.discount / 100).toFixed(2)}</span>
                  </div>
                )}
                {quote.tax > 0 && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Tax ({quote.tax}%)</span><span>${(quote.subtotal * (1 - quote.discount / 100) * quote.tax / 100).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-foreground text-lg border-t border-border pt-2 mt-2">
                  <span>Total</span><span>${quote.total.toFixed(2)}</span>
                </div>
              </>
            )}
          </div>
        </Card>

        {/* Notes */}
        {isEditing ? (
          <Card className="glass-panel border-border p-4">
            <Label className="font-semibold text-foreground mb-2 block">Notes & Terms</Label>
            <Input value={editNotes} onChange={e => setEditNotes(e.target.value)}
              className="bg-muted border-border" placeholder="Internal notes or terms..." />
          </Card>
        ) : quote.notes ? (
          <Card className="glass-panel border-border p-4">
            <h3 className="font-semibold text-foreground mb-2">Notes & Terms</h3>
            <p className="text-muted-foreground text-sm whitespace-pre-wrap">{quote.notes}</p>
          </Card>
        ) : null}

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
                  className={`px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-muted/30 transition-colors ${v.id === quote.id ? "bg-primary/5" : ""}`}
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
      </div>
    </Layout>
  );
}
