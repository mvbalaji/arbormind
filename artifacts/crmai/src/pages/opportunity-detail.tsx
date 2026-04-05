import React, { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useListQuotes, useCreateQuote, useListProducts, getListQuotesQueryKey, CreateQuoteInputStatus, type CreateQuoteInput, type CreateQuoteItemInput } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AISummary } from "@/components/ai-summary";
import { EmailCompose } from "@/components/email-compose";
import {
  ArrowLeft, DollarSign, Calendar, Activity, Building2,
  Phone, Mail, Users, Briefcase, CheckCircle2, Clock, TrendingUp,
  FileText, Plus, Package, X, Printer,
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface OpportunityDetail {
  id: number;
  name: string;
  accountId: number | null;
  accountName: string | null;
  contactFirstName: string | null;
  contactLastName: string | null;
  stage: string;
  amount: number | null;
  probability: number | null;
  closeDate: string | null;
  description: string | null;
  source: string | null;
  ownerName: string | null;
  createdAt: string;
}

interface RelatedActivity {
  id: number;
  type: string;
  subject: string;
  status: string;
  dueDate: string | null;
  contactName: string | null;
}

const STAGE_CONFIG: Record<string, { label: string; color: string; step: number }> = {
  prospecting: { label: "Prospecting", color: "text-blue-400 border-blue-500/30 bg-blue-500/10", step: 1 },
  qualification: { label: "Qualification", color: "text-indigo-400 border-indigo-500/30 bg-indigo-500/10", step: 2 },
  proposal: { label: "Proposal", color: "text-purple-400 border-purple-500/30 bg-purple-500/10", step: 3 },
  negotiation: { label: "Negotiation", color: "text-orange-400 border-orange-500/30 bg-orange-500/10", step: 4 },
  closed_won: { label: "Closed Won", color: "text-green-400 border-green-500/30 bg-green-500/10", step: 5 },
  closed_lost: { label: "Closed Lost", color: "text-red-400 border-red-500/30 bg-red-500/10", step: 0 },
};

const STAGES_ORDERED = ["prospecting", "qualification", "proposal", "negotiation", "closed_won"];

const ACTIVITY_ICONS: Record<string, React.ElementType> = {
  call: Phone,
  email: Mail,
  meeting: Users,
  task: CheckCircle2,
  demo: Briefcase,
};

type Tab = "activities" | "quotes" | "about";

interface OppQuote {
  id: number;
  name: string;
  quoteNumber: string;
  status: string;
  total: number;
  validUntil: string | null;
}

interface QuickQuoteItem {
  productId: number | null;
  productName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
}

const DEFAULT_ITEM: QuickQuoteItem = { productId: null, productName: "", quantity: 1, unitPrice: 0, discount: 0 };

const QUOTE_STATUS_COLORS: Record<string, string> = {
  draft: "border-white/10 text-muted-foreground",
  sent: "border-blue-500/30 text-blue-400 bg-blue-500/5",
  accepted: "border-green-500/30 text-green-400 bg-green-500/5",
  rejected: "border-red-500/30 text-red-400 bg-red-500/5",
  expired: "border-orange-500/30 text-orange-400 bg-orange-500/5",
};

function QuickQuoteDialog({
  open, onOpenChange, opportunityId, opportunityName,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  opportunityId: number;
  opportunityName: string;
}) {
  const [name, setName] = useState(opportunityName + " Quote");
  const [status, setStatus] = useState<string>("draft");
  const [validUntil, setValidUntil] = useState("");
  const [discount, setDiscount] = useState("0");
  const [tax, setTax] = useState("0");
  const [items, setItems] = useState<QuickQuoteItem[]>([]);
  const { data: productsData } = useListProducts({ limit: 200 });
  const products = productsData?.data ?? [];
  const createMutation = useCreateQuote();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  React.useEffect(() => {
    if (open) {
      setName(opportunityName + " Quote");
      setStatus("draft");
      setValidUntil("");
      setDiscount("0");
      setTax("0");
      setItems([]);
    }
  }, [open, opportunityName]);

  const lineTotal = (item: QuickQuoteItem) => item.quantity * item.unitPrice * (1 - (item.discount ?? 0) / 100);
  const subtotal = items.reduce((sum, it) => sum + lineTotal(it), 0);
  const discountAmt = subtotal * (parseFloat(discount) || 0) / 100;
  const taxAmt = (subtotal - discountAmt) * (parseFloat(tax) || 0) / 100;
  const total = subtotal - discountAmt + taxAmt;

  const addItem = () => setItems(prev => [...prev, { ...DEFAULT_ITEM }]);
  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));
  const updateItem = (idx: number, changes: Partial<QuickQuoteItem>) =>
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, ...changes } : it));

  const pickProduct = (idx: number, productId: number) => {
    const prod = products.find(p => p.id === productId);
    if (prod) updateItem(idx, { productId: prod.id, productName: prod.name, unitPrice: prod.unitPrice, discount: 0 });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    const quoteItems: CreateQuoteItemInput[] = items.filter(it => it.productName).map(it => ({
      productId: it.productId || null,
      productName: it.productName,
      quantity: it.quantity || 1,
      unitPrice: it.unitPrice || 0,
      discount: it.discount || 0,
    }));
    const payload: CreateQuoteInput = {
      name,
      opportunityId,
      status: status as CreateQuoteInputStatus,
      validUntil: validUntil || null,
      discount: parseFloat(discount) || 0,
      tax: parseFloat(tax) || 0,
      items: quoteItems,
    };
    try {
      await createMutation.mutateAsync({ data: payload });
      await queryClient.invalidateQueries({ queryKey: getListQuotesQueryKey() });
      await queryClient.invalidateQueries({ queryKey: ["opportunity-quotes", String(opportunityId)] });
      toast({ title: "Quote created", description: `${name} linked to this opportunity.` });
      onOpenChange(false);
    } catch {
      toast({ title: "Error", description: "Could not create quote.", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-white/10 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Quote for this Opportunity</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2 col-span-2">
              <Label>Quote Name *</Label>
              <Input required className="bg-black/20 border-white/10"
                value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <select className="w-full h-10 px-3 rounded-md bg-black/20 border border-white/10 text-white text-sm"
                value={status} onChange={e => setStatus(e.target.value)}>
                {Object.keys(CreateQuoteInputStatus).map(s => (
                  <option key={s} value={s} className="bg-card capitalize">{s}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Valid Until</Label>
              <Input type="date" className="bg-black/20 border-white/10"
                value={validUntil} onChange={e => setValidUntil(e.target.value)} />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-semibold">Products / Line Items</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem} className="border-white/10 text-xs">
                <Plus className="w-3 h-3 mr-1" /> Add Item
              </Button>
            </div>
            {items.length === 0 ? (
              <div className="border border-dashed border-white/10 rounded-lg p-5 text-center text-muted-foreground text-sm cursor-pointer hover:border-primary/30 transition-colors" onClick={addItem}>
                <Package className="w-5 h-5 mx-auto mb-1.5 opacity-40" />
                Click to add products
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-12 gap-1 text-xs text-muted-foreground uppercase px-1">
                  <span className="col-span-4">Product</span>
                  <span className="col-span-2 text-right">Qty</span>
                  <span className="col-span-2 text-right">Price</span>
                  <span className="col-span-2 text-right">Disc%</span>
                  <span className="col-span-1 text-right">Total</span>
                  <span className="col-span-1"></span>
                </div>
                {items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-1 items-center bg-white/5 rounded-lg p-2">
                    <div className="col-span-4">
                      <select className="w-full h-8 px-2 rounded-md bg-black/30 border border-white/10 text-white text-sm"
                        value={item.productId ?? ""} onChange={e => {
                          const val = e.target.value;
                          val === "" ? updateItem(idx, { productId: null, productName: "", unitPrice: 0 }) : pickProduct(idx, parseInt(val));
                        }}>
                        <option value="" className="bg-card">Custom</option>
                        {products.map(p => <option key={p.id} value={p.id} className="bg-card">{p.name}</option>)}
                      </select>
                      {!item.productId && (
                        <Input className="mt-1 h-7 text-xs bg-black/30 border-white/10" placeholder="Name..."
                          value={item.productName} onChange={e => updateItem(idx, { productName: e.target.value })} />
                      )}
                    </div>
                    <div className="col-span-2">
                      <Input type="number" min="1" className="h-8 bg-black/30 border-white/10 text-right text-sm"
                        value={item.quantity} onChange={e => updateItem(idx, { quantity: parseFloat(e.target.value) || 1 })} />
                    </div>
                    <div className="col-span-2">
                      <Input type="number" min="0" step="0.01" className="h-8 bg-black/30 border-white/10 text-right text-sm"
                        value={item.unitPrice} onChange={e => updateItem(idx, { unitPrice: parseFloat(e.target.value) || 0 })} />
                    </div>
                    <div className="col-span-2">
                      <Input type="number" min="0" max="100" className="h-8 bg-black/30 border-white/10 text-right text-sm"
                        value={item.discount} onChange={e => updateItem(idx, { discount: parseFloat(e.target.value) || 0 })} />
                    </div>
                    <div className="col-span-1 text-right text-xs font-medium text-white">
                      ${lineTotal(item).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-400" onClick={() => removeItem(idx)}>
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {items.length > 0 && (
            <div className="border border-white/5 rounded-lg p-3 space-y-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Discount %</Label>
                  <Input type="number" min="0" max="100" className="h-8 bg-black/20 border-white/10 text-sm"
                    value={discount} onChange={e => setDiscount(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Tax %</Label>
                  <Input type="number" min="0" className="h-8 bg-black/20 border-white/10 text-sm"
                    value={tax} onChange={e => setTax(e.target.value)} />
                </div>
              </div>
              <div className="flex justify-between font-bold text-white border-t border-white/10 pt-2">
                <span>Total</span>
                <span>${total.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="border-white/10">Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending} className="bg-primary hover:bg-primary/90 text-white">
              {createMutation.isPending ? "Creating..." : "Create Quote"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function generateQuotePDF(quote: OppQuote, opp: OpportunityDetail) {
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Quote: ${quote.name}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #111; background: #fff; padding: 48px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
    .brand { font-size: 22px; font-weight: 700; color: #4f46e5; letter-spacing: -0.5px; }
    .brand-sub { font-size: 12px; color: #6b7280; margin-top: 2px; }
    .quote-num { font-size: 13px; color: #6b7280; text-align: right; }
    .quote-num strong { font-size: 18px; color: #111; display: block; }
    h1 { font-size: 20px; font-weight: 700; margin-bottom: 8px; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin: 32px 0; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; }
    .meta-item label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280; }
    .meta-item p { font-size: 14px; font-weight: 600; color: #111; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; margin: 24px 0; }
    thead { background: #f9fafb; }
    th { padding: 10px 14px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280; text-align: left; border-bottom: 2px solid #e5e7eb; }
    td { padding: 12px 14px; font-size: 13px; border-bottom: 1px solid #f3f4f6; }
    .total-row { font-size: 16px; font-weight: 700; color: #4f46e5; }
    .badge { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 600; background: #ede9fe; color: #4f46e5; text-transform: uppercase; }
    .footer { margin-top: 48px; font-size: 11px; color: #9ca3af; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 16px; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">ArborMind CRM</div>
      <div class="brand-sub">arbormind.in</div>
    </div>
    <div class="quote-num">
      <strong>${quote.quoteNumber}</strong>
      Quote Reference
    </div>
  </div>

  <h1>${quote.name}</h1>
  <span class="badge">${quote.status}</span>

  <div class="meta-grid">
    <div class="meta-item"><label>Opportunity</label><p>${opp.name}</p></div>
    <div class="meta-item"><label>Account</label><p>${opp.accountName ?? "—"}</p></div>
    <div class="meta-item"><label>Contact</label><p>${[opp.contactFirstName, opp.contactLastName].filter(Boolean).join(" ") || "—"}</p></div>
    <div class="meta-item"><label>Valid Until</label><p>${quote.validUntil ? new Date(quote.validUntil).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "—"}</p></div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th style="text-align:right">Total</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>${quote.name}</td>
        <td style="text-align:right">$${quote.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      </tr>
      <tr class="total-row">
        <td><strong>Total</strong></td>
        <td style="text-align:right"><strong>$${quote.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></td>
      </tr>
    </tbody>
  </table>

  <div class="footer">
    Generated by ArborMind CRM &bull; arbormind.in &bull; ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
  </div>
  <script>window.onload = () => { window.print(); }</script>
</body>
</html>`;
  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}

export default function OpportunityDetail() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [activeTab, setActiveTab] = useState<Tab>("activities");
  const [isQuoteOpen, setIsQuoteOpen] = useState(false);
  const [isEmailOpen, setIsEmailOpen] = useState(false);

  const { data: opp, isLoading } = useQuery<OpportunityDetail>({
    queryKey: ["opportunity", id],
    queryFn: async () => {
      const res = await fetch(`/api/opportunities/${id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Not found");
      return res.json() as Promise<OpportunityDetail>;
    },
    enabled: !!id,
  });

  const { data: activitiesData } = useQuery<{ data: RelatedActivity[] }>({
    queryKey: ["opportunity-activities", id],
    queryFn: async () => {
      const res = await fetch(`/api/opportunities/${id}/activities`, { credentials: "include" });
      return res.json() as Promise<{ data: RelatedActivity[] }>;
    },
    enabled: !!id,
  });

  const numericId = id ? parseInt(id) : undefined;
  const { data: quotesData } = useListQuotes(numericId ? { opportunityId: numericId } : undefined);
  const oppQuotes: OppQuote[] = (quotesData?.data ?? []) as OppQuote[];

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

  if (!opp) {
    return (
      <Layout>
        <div className="text-center py-20 text-muted-foreground">Opportunity not found.</div>
      </Layout>
    );
  }

  const stageConfig = STAGE_CONFIG[opp.stage] ?? STAGE_CONFIG["prospecting"];
  const currentStep = stageConfig.step;

  const TABS: { id: Tab; label: string; count?: number }[] = [
    { id: "activities", label: "Activities", count: activitiesData?.data.length },
    { id: "quotes", label: "Quotes", count: oppQuotes.length },
    { id: "about", label: "Details" },
  ];

  return (
    <Layout>
      <div className="flex flex-col gap-6 max-w-5xl mx-auto">
        <div>
          <Link href="/opportunities">
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground mb-4 hover:text-white">
              <ArrowLeft className="w-4 h-4" />
              Back to Pipeline
            </Button>
          </Link>

          {/* Header Card */}
          <Card className="glass-panel border-white/5 p-6">
            <div className="flex flex-col gap-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-white">{opp.name}</h1>
                  {opp.accountName && (
                    <div className="flex items-center gap-1.5 text-muted-foreground mt-1">
                      <Building2 className="w-4 h-4" />
                      <span className="text-sm">{opp.accountName}</span>
                    </div>
                  )}
                </div>
                <Badge variant="outline" className={`capitalize shrink-0 ${stageConfig.color}`}>
                  {stageConfig.label}
                </Badge>
              </div>

              {/* Key Metrics Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {opp.amount !== null && (
                  <div className="bg-white/5 rounded-xl p-3">
                    <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                      <DollarSign className="w-3 h-3" /> Value
                    </div>
                    <div className="text-lg font-bold text-white">${opp.amount.toLocaleString()}</div>
                  </div>
                )}
                {opp.probability !== null && (
                  <div className="bg-white/5 rounded-xl p-3">
                    <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" /> Win Probability
                    </div>
                    <div className="text-lg font-bold text-white">{opp.probability}%</div>
                  </div>
                )}
                {opp.closeDate && (
                  <div className="bg-white/5 rounded-xl p-3">
                    <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Close Date
                    </div>
                    <div className="text-sm font-semibold text-white">{format(new Date(opp.closeDate), "MMM d, yyyy")}</div>
                  </div>
                )}
                {(opp.contactFirstName || opp.contactLastName) && (
                  <div className="bg-white/5 rounded-xl p-3">
                    <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                      <Users className="w-3 h-3" /> Contact
                    </div>
                    <div className="text-sm font-semibold text-white">
                      {[opp.contactFirstName, opp.contactLastName].filter(Boolean).join(" ")}
                    </div>
                  </div>
                )}
              </div>

              {/* Stage Pipeline Progress */}
              {opp.stage !== "closed_lost" && (
                <div>
                  <div className="text-xs text-muted-foreground mb-2">Pipeline Progress</div>
                  <div className="flex items-center gap-1">
                    {STAGES_ORDERED.map((s, idx) => {
                      const isActive = idx + 1 <= currentStep;
                      const isCurrent = s === opp.stage;
                      return (
                        <React.Fragment key={s}>
                          <div
                            className={`flex-1 h-1.5 rounded-full transition-all ${
                              isActive ? "bg-primary" : "bg-white/10"
                            } ${isCurrent ? "shadow-[0_0_8px_rgba(99,102,241,0.6)]" : ""}`}
                          />
                        </React.Fragment>
                      );
                    })}
                  </div>
                  <div className="flex justify-between mt-1">
                    {STAGES_ORDERED.map((s) => (
                      <span key={s} className={`text-xs ${s === opp.stage ? "text-primary font-medium" : "text-muted-foreground/50"}`}>
                        {STAGE_CONFIG[s]?.label.split(" ")[0]}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5">
                <Button size="sm" variant="outline" className="gap-1.5 border-white/10 hover:text-white" onClick={() => setIsEmailOpen(true)}>
                  <Mail className="w-3.5 h-3.5" /> Send Email
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5 border-white/10 hover:text-white" onClick={() => { setActiveTab("quotes"); setIsQuoteOpen(true); }}>
                  <FileText className="w-3.5 h-3.5" /> Create Quote
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* AI Summary */}
        <AISummary entityType="opportunity" entityData={opp as unknown as Record<string, unknown>} />

        {/* Tabs */}
        <div className="flex gap-1 border-b border-white/5">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-white"
              }`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className="ml-2 text-xs bg-white/10 rounded-full px-1.5 py-0.5">{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Activities Tab */}
        {activeTab === "activities" && (
          <div className="flex flex-col gap-3">
            {!activitiesData?.data.length ? (
              <div className="text-center py-12 text-muted-foreground">
                <Activity className="w-10 h-10 mx-auto mb-3 opacity-30" />
                No activities logged for this deal yet.
              </div>
            ) : (
              activitiesData.data.map((act) => {
                const Icon = ACTIVITY_ICONS[act.type] ?? Activity;
                return (
                  <Card key={act.id} className="glass-panel border-white/5 p-4 flex items-start gap-4">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-white text-sm">{act.subject}</span>
                        <Badge variant="outline" className={`capitalize text-xs ${
                          act.status === "completed" ? "border-green-500/30 text-green-400" :
                          act.status === "cancelled" ? "border-red-500/30 text-red-400" :
                          "border-blue-500/30 text-blue-400"
                        }`}>
                          {act.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-muted-foreground capitalize">{act.type}</span>
                        {act.dueDate && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {format(new Date(act.dueDate), "MMM d, h:mm a")}
                          </span>
                        )}
                        {act.contactName && (
                          <span className="text-xs text-muted-foreground">· {act.contactName}</span>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        )}

        {/* Quotes Tab */}
        {activeTab === "quotes" && (
          <div className="flex flex-col gap-3">
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setIsQuoteOpen(true)} className="bg-primary text-white hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-1.5" /> New Quote
              </Button>
            </div>
            {oppQuotes.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                No quotes for this opportunity yet.
                <div className="mt-2">
                  <Button variant="outline" size="sm" onClick={() => setIsQuoteOpen(true)} className="border-white/10 text-sm">
                    Create first quote
                  </Button>
                </div>
              </div>
            ) : (
              oppQuotes.map(q => (
                <Card key={q.id} className="glass-panel border-white/5 p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium text-white text-sm">{q.name}</div>
                      <div className="text-xs text-muted-foreground font-mono mt-0.5">{q.quoteNumber}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {q.validUntil && (
                      <span className="text-xs text-muted-foreground hidden sm:block">
                        Valid until {format(new Date(q.validUntil), "MMM d, yyyy")}
                      </span>
                    )}
                    <span className="font-semibold text-white text-sm">${q.total.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                    <Badge variant="outline" className={`capitalize text-xs ${QUOTE_STATUS_COLORS[q.status] ?? ""}`}>
                      {q.status}
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1.5 text-muted-foreground hover:text-white h-7 px-2"
                      title="Generate PDF Quote"
                      onClick={() => generateQuotePDF(q, opp)}
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Details Tab */}
        {activeTab === "about" && (
          <Card className="glass-panel border-white/5 p-6">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
              {[
                { label: "Stage", value: stageConfig.label },
                { label: "Amount", value: opp.amount !== null ? `$${opp.amount.toLocaleString()}` : null },
                { label: "Probability", value: opp.probability !== null ? `${opp.probability}%` : null },
                { label: "Close Date", value: opp.closeDate ? format(new Date(opp.closeDate), "MMM d, yyyy") : null },
                { label: "Account", value: opp.accountName },
                { label: "Contact", value: [opp.contactFirstName, opp.contactLastName].filter(Boolean).join(" ") || null },
                { label: "Lead Source", value: opp.source },
                { label: "Owner", value: opp.ownerName },
                { label: "Created", value: opp.createdAt ? format(new Date(opp.createdAt), "MMM d, yyyy") : null },
              ].map(({ label, value }) =>
                value ? (
                  <div key={label}>
                    <dt className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">{label}</dt>
                    <dd className="text-sm text-white">{value}</dd>
                  </div>
                ) : null
              )}
            </dl>
            {opp.description && (
              <div className="mt-6 pt-6 border-t border-white/5">
                <dt className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Description</dt>
                <dd className="text-sm text-muted-foreground leading-relaxed">{opp.description}</dd>
              </div>
            )}
          </Card>
        )}
      </div>
      {numericId && (
        <QuickQuoteDialog
          open={isQuoteOpen}
          onOpenChange={setIsQuoteOpen}
          opportunityId={numericId}
          opportunityName={opp.name}
        />
      )}
      <EmailCompose
        open={isEmailOpen}
        onOpenChange={setIsEmailOpen}
        defaultTo={opp.accountName ?? undefined}
        defaultSubject={`Re: ${opp.name}`}
      />
    </Layout>
  );
}
