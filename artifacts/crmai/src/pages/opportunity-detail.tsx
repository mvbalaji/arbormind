import React, { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useListQuotes, useCreateQuote, useListProducts, useUpdateOpportunity, useListOpportunityItems, useUpdateOpportunityItems, getListQuotesQueryKey, getListOpportunityItemsQueryKey, CreateQuoteInputStatus, type CreateQuoteInput, type CreateQuoteItemInput, type OpportunityItem } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { ChevronsUpDown } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { AISummary } from "@/components/ai-summary";
import { EmailCompose } from "@/components/email-compose";
import { EntityApprovals } from "@/components/entity-approvals";
import { EntityNotes } from "@/components/entity-notes";
import { ContactFormDialog } from "@/pages/contacts";
import { useTabOrder } from "@/hooks/use-tab-order";
import { useAuth } from "@/context/auth";
import {
  ArrowLeft, ArrowRight, Pencil, DollarSign, Calendar, Activity, Building2,
  Phone, Mail, Users, Briefcase, Check, CheckCircle2, Clock, TrendingUp,
  FileText, Plus, Package, X, Printer, ShieldCheck,
  Filter, RotateCw, ChevronDown, ChevronRight, PhoneCall, CalendarPlus, ListTodo,
  UserPlus, FilePlus, Copy, MoreVertical, Globe, GripVertical,
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface OpportunityDetail {
  id: number;
  name: string;
  accountId: number | null;
  accountName: string | null;
  contactId: number | null;
  contactFirstName: string | null;
  contactLastName: string | null;
  stage: string;
  amount: number | null;
  probability: number | null;
  closeDate: string | null;
  description: string | null;
  leadSource: string | null;
  assignedToName: string | null;
  nextStep: string | null;
  forecastCategory: string | null;
  teamMembers: string | null;
  createdAt: string;
  updatedAt: string | null;
}

interface RelatedActivity {
  id: number;
  type: string;
  subject: string;
  status: string;
  dueDate: string | null;
  contactName: string | null;
  notes?: string | null;
}

const STAGE_CONFIG: Record<string, { label: string; color: string; step: number }> = {
  prospecting: { label: "Prospecting", color: "text-blue-600 border-blue-500/30 bg-blue-500/10", step: 1 },
  qualification: { label: "Qualification", color: "text-indigo-400 border-indigo-500/30 bg-indigo-500/10", step: 2 },
  proposal: { label: "Proposal", color: "text-purple-600 border-purple-500/30 bg-purple-500/10", step: 3 },
  negotiation: { label: "Negotiation", color: "text-orange-600 border-orange-500/30 bg-orange-500/10", step: 4 },
  closed_won: { label: "Closed Won", color: "text-green-600 border-green-500/30 bg-green-500/10", step: 5 },
  closed_lost: { label: "Closed Lost", color: "text-red-600 border-red-500/30 bg-red-500/10", step: 0 },
};

const STAGES_ORDERED = ["prospecting", "qualification", "proposal", "negotiation", "closed_won"];

const ACTIVITY_ICONS: Record<string, React.ElementType> = {
  call: Phone,
  email: Mail,
  meeting: Users,
  task: CheckCircle2,
  demo: Briefcase,
};

type Tab = "activities" | "quotes" | "approvals" | "notes" | "about";

const DEFAULT_OPP_TAB_ORDER: readonly Tab[] = ["about", "quotes", "approvals", "activities", "notes"];

interface OppQuote {
  id: number;
  name: string;
  quoteNumber: string;
  status: string;
  total: number;
  validUntil: string | null;
}

interface OppContact {
  id: number;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  accountId: number | null;
  accountName: string | null;
}

interface QuickQuoteItem {
  productId: number | null;
  productName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
}

const DEFAULT_ITEM: QuickQuoteItem = { productId: null, productName: "", quantity: 1, unitPrice: 0, discount: 0 };

function OpportunityProductsDialog({
  open, onOpenChange, opportunityId, initialItems,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  opportunityId: number;
  initialItems: OpportunityItem[];
}) {
  const [items, setItems] = useState<QuickQuoteItem[]>([]);
  const { data: productsData } = useListProducts({ limit: 200 });
  const products = productsData?.data ?? [];
  const updateMutation = useUpdateOpportunityItems();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  React.useEffect(() => {
    if (open) {
      setItems(initialItems.map(it => ({
        productId: it.productId ?? null,
        productName: it.productName,
        quantity: Number(it.quantity),
        unitPrice: Number(it.unitPrice),
        discount: Number(it.discount),
      })));
    }
  }, [open, initialItems]);

  const lineTotal = (item: QuickQuoteItem) => item.quantity * item.unitPrice * (1 - (item.discount ?? 0) / 100);
  const total = items.reduce((sum, it) => sum + lineTotal(it), 0);

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
    const cleanItems: CreateQuoteItemInput[] = items
      .filter(it => it.productName && it.quantity > 0)
      .map(it => ({
        productId: it.productId || null,
        productName: it.productName,
        quantity: it.quantity || 1,
        unitPrice: it.unitPrice || 0,
        discount: it.discount || 0,
      }));
    try {
      await updateMutation.mutateAsync({ id: opportunityId, data: { items: cleanItems } });
      await queryClient.invalidateQueries({ queryKey: getListOpportunityItemsQueryKey(opportunityId) });
      await queryClient.invalidateQueries({ queryKey: ["opportunity", String(opportunityId)] });
      await queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      toast({ title: "Products saved", description: `${cleanItems.length} product(s) on this opportunity.` });
      onOpenChange(false);
    } catch {
      toast({ title: "Error", description: "Could not save products.", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border text-foreground max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Products on this Opportunity</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-semibold">Products / Line Items</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem} className="border-border text-xs">
                <Plus className="w-3 h-3 mr-1" /> Add Product
              </Button>
            </div>
            {items.length === 0 ? (
              <div className="border border-dashed border-border rounded-lg p-5 text-center text-muted-foreground text-sm cursor-pointer hover:border-primary/30 transition-colors" onClick={addItem}>
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
                  <div key={idx} className="grid grid-cols-12 gap-1 items-center bg-muted/50 rounded-lg p-2">
                    <div className="col-span-4">
                      <select className="w-full h-8 px-2 rounded-md bg-muted border border-border text-sm"
                        value={item.productId ?? ""} onChange={e => {
                          const val = e.target.value;
                          val === "" ? updateItem(idx, { productId: null, productName: "", unitPrice: 0 }) : pickProduct(idx, parseInt(val));
                        }}>
                        <option value="" className="bg-card">Custom</option>
                        {products.map(p => <option key={p.id} value={p.id} className="bg-card">{p.name}</option>)}
                      </select>
                      {!item.productId && (
                        <Input className="mt-1 h-7 text-xs bg-muted border-border" placeholder="Name..."
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
                    <div className="col-span-1 text-right text-xs font-medium text-foreground">
                      £{lineTotal(item).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-600" onClick={() => removeItem(idx)}>
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {items.length > 0 && (
            <div className="flex justify-end border-t border-border pt-3">
              <div className="text-sm text-muted-foreground">
                Total: <span className="ml-2 text-base font-semibold text-foreground">£{total.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Saving will update the opportunity's total amount based on these line items.
          </p>

          <DialogFooter>
            <Button type="button" variant="outline" className="border-border" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={updateMutation.isPending} className="bg-blue-600 hover:bg-blue-700 text-white">
              {updateMutation.isPending ? "Saving…" : "Save Products"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const QUOTE_STATUS_COLORS: Record<string, string> = {
  draft: "border-border text-muted-foreground",
  sent: "border-blue-500/30 text-blue-600 bg-blue-500/5",
  accepted: "border-green-500/30 text-green-600 bg-green-500/5",
  rejected: "border-red-500/30 text-red-600 bg-red-500/5",
  expired: "border-orange-500/30 text-orange-600 bg-orange-500/5",
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
      <DialogContent className="bg-card border-border text-foreground max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Quote for this Opportunity</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2 col-span-2">
              <Label>Quote Name *</Label>
              <Input required className="bg-muted border-border"
                value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <select className="w-full h-10 px-3 rounded-md bg-muted border border-border text-sm"
                value={status} onChange={e => setStatus(e.target.value)}>
                {Object.keys(CreateQuoteInputStatus).map(s => (
                  <option key={s} value={s} className="bg-card capitalize">{s}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Valid Until</Label>
              <Input type="date" className="bg-muted border-border"
                value={validUntil} onChange={e => setValidUntil(e.target.value)} />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-semibold">Products / Line Items</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem} className="border-border text-xs">
                <Plus className="w-3 h-3 mr-1" /> Add Item
              </Button>
            </div>
            {items.length === 0 ? (
              <div className="border border-dashed border-border rounded-lg p-5 text-center text-muted-foreground text-sm cursor-pointer hover:border-primary/30 transition-colors" onClick={addItem}>
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
                  <div key={idx} className="grid grid-cols-12 gap-1 items-center bg-muted/50 rounded-lg p-2">
                    <div className="col-span-4">
                      <select className="w-full h-8 px-2 rounded-md bg-muted border border-border text-sm"
                        value={item.productId ?? ""} onChange={e => {
                          const val = e.target.value;
                          val === "" ? updateItem(idx, { productId: null, productName: "", unitPrice: 0 }) : pickProduct(idx, parseInt(val));
                        }}>
                        <option value="" className="bg-card">Custom</option>
                        {products.map(p => <option key={p.id} value={p.id} className="bg-card">{p.name}</option>)}
                      </select>
                      {!item.productId && (
                        <Input className="mt-1 h-7 text-xs bg-muted border-border" placeholder="Name..."
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
                    <div className="col-span-1 text-right text-xs font-medium text-foreground">
                      ${lineTotal(item).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-600" onClick={() => removeItem(idx)}>
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {items.length > 0 && (
            <div className="border border-border rounded-lg p-3 space-y-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Discount %</Label>
                  <Input type="number" min="0" max="100" className="h-8 bg-muted border-border text-sm"
                    value={discount} onChange={e => setDiscount(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Tax %</Label>
                  <Input type="number" min="0" className="h-8 bg-muted border-border text-sm"
                    value={tax} onChange={e => setTax(e.target.value)} />
                </div>
              </div>
              <div className="flex justify-between font-bold text-foreground border-t border-border pt-2">
                <span>Total</span>
                <span>£{total.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="border-border">Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending} className="bg-primary hover:bg-primary/90 text-foreground">
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
        <td style="text-align:right">£${quote.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      </tr>
      <tr class="total-row">
        <td><strong>Total</strong></td>
        <td style="text-align:right"><strong>£${quote.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></td>
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
  const [activeTab, setActiveTab] = useState<Tab>("about");
  const [isQuoteOpen, setIsQuoteOpen] = useState(false);
  const [isProductsOpen, setIsProductsOpen] = useState(false);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<{ id: number; firstName: string; lastName: string; email: string; phone: string; title: string; accountId: string } | null>(null);
  const [draggedTab, setDraggedTab] = useState<Tab | null>(null);
  const [tabDropTarget, setTabDropTarget] = useState<Tab | null>(null);
  const [isEmailOpen, setIsEmailOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [activitySubTab, setActivitySubTab] = useState<"call" | "email" | "task" | "event">("call");
  const [recapText, setRecapText] = useState("");
  const [isAddingActivity, setIsAddingActivity] = useState(false);
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());
  const [newTeamMember, setNewTeamMember] = useState("");
  const [teamPickerOpen, setTeamPickerOpen] = useState(false);
  const ownerSeededRef = React.useRef<number | null>(null);
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

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

  const { data: usersData } = useQuery<{ data: Array<{ id: number; name: string; email: string; role: string }> }>({
    queryKey: ["users", "all"],
    queryFn: async () => {
      const res = await fetch(`/api/users?limit=200`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  // Auto-add the opportunity owner as a default team member (one time per opp)
  React.useEffect(() => {
    if (!opp || !id) return;
    const oppId = Number(id);
    if (ownerSeededRef.current === oppId) return;
    const owner = opp.assignedToName?.trim();
    if (!owner) return;
    const existing = (opp.teamMembers ?? "")
      .split(",")
      .map((m) => m.trim())
      .filter(Boolean);
    if (existing.some((m) => m.toLowerCase() === owner.toLowerCase())) {
      ownerSeededRef.current = oppId;
      return;
    }
    ownerSeededRef.current = oppId;
    const next = [owner, ...existing].join(", ");
    fetch(`/api/opportunities/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ teamMembers: next }),
    }).then((res) => {
      if (res.ok) queryClient.invalidateQueries({ queryKey: ["opportunity", id] });
    });
  }, [opp, id, queryClient]);

  const { data: accountData } = useQuery<{
    id: number; name: string; industry: string | null; website: string | null; phone: string | null;
    email: string | null; address: string | null; city: string | null; country: string | null;
    annualRevenue: number | null; ownerName: string | null; status: string | null;
  }>({
    queryKey: ["account", (opp as { accountId?: number } | undefined)?.accountId],
    queryFn: async () => {
      const accountId = (opp as { accountId?: number } | undefined)?.accountId;
      const res = await fetch(`/api/accounts/${accountId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch account");
      return res.json();
    },
    enabled: !!(opp as { accountId?: number } | undefined)?.accountId,
  });

  const { data: stageHistoryData } = useQuery<{ data: Array<{ id: number; opportunityId: number; stage: string; enteredAt: string; leftAt: string | null }> }>({
    queryKey: ["opportunity-stage-history", id],
    queryFn: async () => {
      const res = await fetch(`/api/opportunities/${id}/stage-history`, { credentials: "include" });
      return res.json();
    },
    enabled: !!id,
  });

  const { data: contactsData } = useQuery<{ data: OppContact[] }>({
    queryKey: ["opportunity-contacts", id],
    queryFn: async () => {
      const res = await fetch(`/api/opportunities/${id}/contacts`, { credentials: "include" });
      return res.json() as Promise<{ data: OppContact[] }>;
    },
    enabled: !!id,
  });

  const numericId = id ? parseInt(id) : undefined;
  const { data: quotesData } = useListQuotes(numericId ? { opportunityId: numericId } : undefined);
  const oppQuotes: OppQuote[] = (quotesData?.data ?? []) as OppQuote[];
  const { data: oppItemsData } = useListOpportunityItems(numericId ?? 0, {
    query: {
      enabled: !!numericId,
      queryKey: getListOpportunityItemsQueryKey(numericId ?? 0),
    },
  });
  const oppItems: OpportunityItem[] = oppItemsData?.data ?? [];

  const { order: tabOrder, move: moveTab } = useTabOrder<Tab>(`tab-order:opportunity:v5`, DEFAULT_OPP_TAB_ORDER);

  const updateOppMutation = useUpdateOpportunity();
  const { toast: toastTop } = useToast();
  const advanceStage = () => {
    if (!opp || !numericId) return;
    const idx = STAGES_ORDERED.indexOf(opp.stage);
    if (idx < 0 || idx >= STAGES_ORDERED.length - 1) return;
    const nextStage = STAGES_ORDERED[idx + 1];
    updateOppMutation.mutate(
      { id: numericId, data: { stage: nextStage as Parameters<typeof updateOppMutation.mutate>[0]["data"]["stage"] } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["opportunity", id] });
          queryClient.invalidateQueries({ queryKey: ["opportunities"] });
          queryClient.invalidateQueries({ queryKey: ["opportunity-activities", id] });
          queryClient.invalidateQueries({ queryKey: ["opportunity-stage-history", id] });
          toastTop({ title: nextStage === "closed_won" ? "Marked as Won!" : "Stage advanced", description: `Now: ${STAGE_CONFIG[nextStage]?.label ?? nextStage}` });
        },
        onError: () => toastTop({ title: "Failed to update stage", variant: "destructive" }),
      }
    );
  };

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

  const TAB_META: Record<Tab, { label: string; count?: number }> = {
    activities: { label: "Activities", count: activitiesData?.data.length },
    quotes: { label: "Quotes", count: oppQuotes.length },
    approvals: { label: "Approvals" },
    notes: { label: "Notes & Attachments" },
    about: { label: "Details" },
  };
  const TABS = tabOrder.map((id) => ({ id, ...TAB_META[id] }));

  return (
    <Layout>
      <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-8">
        <div>
          <Link href="/opportunities">
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground mb-4 hover:text-foreground">
              <ArrowLeft className="w-4 h-4" />
              Back to Opportunities
            </Button>
          </Link>

          {/* Header Card — Salesforce-style highlight panel */}
          <Card className="border-border p-0 overflow-hidden shadow-sm">
            {/* Title row */}
            <div className="flex items-start justify-between gap-4 px-6 pt-4 pb-3 border-b border-border bg-gradient-to-r from-blue-50/60 to-transparent dark:from-blue-950/20">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-10 h-10 rounded-md bg-blue-600 flex items-center justify-center text-white shrink-0 mt-0.5">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide">Opportunity</div>
                  <h1 className="text-xl font-bold text-foreground truncate">{opp.name}</h1>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button size="sm" variant="outline" className="gap-1.5 border-border" onClick={() => setIsEditOpen(true)} title="Edit opportunity details">
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5 border-border" onClick={() => setIsEmailOpen(true)} title="Send an email">
                  <Mail className="w-3.5 h-3.5" /> Send Email
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 border-border"
                  disabled={opp.stage !== "proposal"}
                  title={opp.stage !== "proposal" ? "Create Quote is enabled when stage is Proposal/Price Quote" : "Create a new quote"}
                  onClick={() => { setActiveTab("quotes"); setIsQuoteOpen(true); }}
                >
                  <FileText className="w-3.5 h-3.5" /> Create Quote
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5 border-border" title="Follow this opportunity">
                  <Plus className="w-3.5 h-3.5" /> Follow
                </Button>
                <Button size="sm" variant="outline" className="border-border" title="Create a new case linked to this opportunity">New Case</Button>
                <Button size="sm" variant="outline" className="border-border" title="Clone this opportunity">Clone</Button>
                <Button size="sm" variant="outline" className="border-border p-2" aria-label="More actions">
                  <MoreVertical className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            {/* Highlight fields — inline flow, no table dividers */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-6 py-3 border-b border-border bg-card text-sm">
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Account:</span>
                {opp.accountId ? (
                  <Link href={`/accounts/${opp.accountId}`}>
                    <span className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer font-medium">{opp.accountName ?? "—"}</span>
                  </Link>
                ) : (
                  <span className="text-foreground font-medium">{opp.accountName ?? "—"}</span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Close Date:</span>
                <span className="text-foreground font-medium">{opp.closeDate ? format(new Date(opp.closeDate), "yyyy-MM-dd") : "—"}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Amount:</span>
                <span className="text-foreground font-medium">{opp.amount !== null ? `£${opp.amount.toLocaleString()}` : "—"}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Owner:</span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-700 dark:text-emerald-300 text-[10px] font-bold shrink-0">
                    {(opp.assignedToName ?? "—").charAt(0).toUpperCase()}
                  </span>
                  <span className="text-foreground font-medium">{opp.assignedToName ?? "—"}</span>
                </span>
              </div>
            </div>

            <div className="p-6 flex flex-col gap-5">

              {/* Stage Pipeline Progress — Salesforce-style chevrons */}
              {opp.stage !== "closed_lost" && (() => {
                const idx = STAGES_ORDERED.indexOf(opp.stage);
                const isWon = opp.stage === "closed_won";
                const nextStage = idx >= 0 && idx < STAGES_ORDERED.length - 1 ? STAGES_ORDERED[idx + 1] : null;
                const isProposal = opp.stage === "proposal";
                const history = stageHistoryData?.data ?? [];
                // For each stage, find the most recent history row, compute days
                const stageInfo = (stage: string): { days: number | null; enteredAt: Date | null; leftAt: Date | null } => {
                  const rows = history.filter((h) => h.stage === stage);
                  if (rows.length === 0) return { days: null, enteredAt: null, leftAt: null };
                  const latest = rows[rows.length - 1];
                  const enteredAt = new Date(latest.enteredAt);
                  const leftAt = latest.leftAt ? new Date(latest.leftAt) : null;
                  const end = leftAt ?? new Date();
                  const days = Math.max(0, Math.floor((end.getTime() - enteredAt.getTime()) / 86400000));
                  return { days, enteredAt, leftAt };
                };
                return (
                  <div className="flex items-stretch gap-0 -mx-1">
                    <TooltipProvider delayDuration={150}>
                    <ol
                      role="list"
                      aria-label="Opportunity stage progress"
                      className="flex-1 flex items-stretch overflow-hidden rounded-md border border-border bg-muted/30 list-none p-0 m-0"
                    >
                      {STAGES_ORDERED.map((s, i) => {
                        const done = i < idx;
                        const current = i === idx;
                        const isLast = i === STAGES_ORDERED.length - 1;
                        const label = STAGE_CONFIG[s]?.label ?? s;
                        const stateLabel = done ? "Completed" : current ? "Current" : "Upcoming";
                        const info = stageInfo(s);
                        const daysLabel = info.days !== null
                          ? (current ? `${info.days} day${info.days === 1 ? "" : "s"} in this stage so far`
                                     : done ? `Spent ${info.days} day${info.days === 1 ? "" : "s"} here`
                                     : "")
                          : "";
                        return (
                          <Tooltip key={s}>
                            <TooltipTrigger asChild>
                          <li
                            role="listitem"
                            tabIndex={0}
                            aria-current={current ? "step" : undefined}
                            aria-label={`${label} — ${stateLabel}${daysLabel ? `, ${daysLabel}` : ""}`}
                            className={`relative flex-1 flex items-center justify-center px-3 py-1.5 text-xs font-medium min-w-0 cursor-default focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-inset ${
                              done ? "bg-emerald-500 text-white" :
                              current ? (isProposal ? "bg-blue-700 text-white" : "bg-blue-600 text-white") :
                              "bg-muted/50 text-muted-foreground"
                            }`}
                            style={!isLast ? { clipPath: "polygon(0 0, calc(100% - 10px) 0, 100% 50%, calc(100% - 10px) 100%, 0 100%, 10px 50%)" } : { clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%, 10px 50%)" }}
                          >
                            {done ? (
                              <>
                                <span aria-hidden="true" className="flex items-center justify-center w-5 h-5 rounded-full bg-white/20"><Check className="w-3.5 h-3.5" /></span>
                                <span className="sr-only">{label}</span>
                              </>
                            ) : (
                              <span className="truncate max-w-full">{label}</span>
                            )}
                          </li>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="bg-foreground text-background border-border max-w-xs">
                              <div className="text-xs">
                                <div className="font-semibold mb-1">{label}</div>
                                <div className="flex items-center gap-1.5 mb-1">
                                  <span className={`inline-block w-1.5 h-1.5 rounded-full ${done ? "bg-emerald-400" : current ? "bg-blue-400" : "bg-muted-foreground/50"}`} />
                                  <span>Status: {stateLabel}</span>
                                </div>
                                {info.enteredAt && (
                                  <div className="opacity-80">Entered: {format(info.enteredAt, "MMM d, yyyy")}</div>
                                )}
                                {info.leftAt && (
                                  <div className="opacity-80">Left: {format(info.leftAt, "MMM d, yyyy")}</div>
                                )}
                                {daysLabel && <div className="mt-1">{daysLabel}</div>}
                                {!info.enteredAt && !current && !done && <div className="opacity-70">Not yet reached</div>}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </ol>
                    </TooltipProvider>
                    <Button
                      size="sm"
                      onClick={advanceStage}
                      disabled={isWon || updateOppMutation.isPending || !nextStage}
                      className={`shrink-0 ml-2 gap-1.5 ${
                        nextStage === "closed_won"
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                          : "bg-blue-600 hover:bg-blue-700 text-white"
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      {isWon ? "Won" : nextStage === "closed_won" ? "Mark as Won" : "Mark Stage as Complete"}
                    </Button>
                  </div>
                );
              })()}

            </div>
          </Card>

          {/* AI Insights — below the stage pipeline */}
          <AISummary entityType="opportunity" entityData={opp as unknown as Record<string, unknown>} />
        </div>

        {/* Two-column layout: tabs + right sidebar (sidebar only on Details tab) */}
        <div className={`grid grid-cols-1 gap-6 ${activeTab === "about" ? "lg:grid-cols-[1fr_320px]" : ""}`}>
          <div className="min-w-0 flex flex-col gap-6">
        {/* Tabs — draggable to reorder */}
        <div className="inline-flex items-center gap-1 rounded-lg bg-muted/70 border border-border p-1 overflow-x-auto">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const isDropTarget = tabDropTarget === tab.id && draggedTab !== tab.id;
            return (
              <button
                key={tab.id}
                draggable
                onDragStart={(e) => {
                  setDraggedTab(tab.id);
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", tab.id);
                }}
                onDragOver={(e) => {
                  if (draggedTab && draggedTab !== tab.id) {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    setTabDropTarget(tab.id);
                  }
                }}
                onDragLeave={() => setTabDropTarget((t) => (t === tab.id ? null : t))}
                onDrop={(e) => {
                  e.preventDefault();
                  if (draggedTab && draggedTab !== tab.id) moveTab(draggedTab, tab.id);
                  setDraggedTab(null);
                  setTabDropTarget(null);
                }}
                onDragEnd={() => { setDraggedTab(null); setTabDropTarget(null); }}
                onClick={() => setActiveTab(tab.id)}
                title="Drag to reorder"
                className={`group rounded-md px-4 py-1.5 text-sm font-medium transition-all flex items-center gap-1.5 whitespace-nowrap cursor-grab active:cursor-grabbing ${
                  isActive
                    ? "bg-primary text-white font-semibold shadow-md ring-1 ring-primary/40"
                    : "text-muted-foreground hover:text-foreground hover:bg-background"
                } ${isDropTarget ? "ring-2 ring-primary/60" : ""} ${draggedTab === tab.id ? "opacity-50" : ""}`}
              >
                <GripVertical className={`w-3 h-3 ${isActive ? "opacity-70" : "opacity-40 group-hover:opacity-80"}`} />
                {tab.label}
                {tab.count !== undefined && (
                  <span className={`ml-1 text-xs rounded-full px-1.5 py-0.5 ${isActive ? "bg-white/20 text-white" : "bg-muted text-foreground"}`}>{tab.count}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Activities Tab */}
        {activeTab === "activities" && (() => {
          const subTabs = [
            { id: "call" as const, label: "Log a Call", icon: PhoneCall, placeholder: "Recap your call...", type: "call" as const, status: "completed" as const },
            { id: "email" as const, label: "Email", icon: Mail, placeholder: "Compose a quick email summary...", type: "email" as const, status: "completed" as const },
            { id: "task" as const, label: "New Task", icon: ListTodo, placeholder: "Describe the task...", type: "task" as const, status: "pending" as const },
            { id: "event" as const, label: "New Event", icon: CalendarPlus, placeholder: "Describe the event...", type: "event" as const, status: "pending" as const },
          ];
          const current = subTabs.find((t) => t.id === activitySubTab) ?? subTabs[0];

          const filteredActivities = (activitiesData?.data ?? []).filter((a) => a.type === activitySubTab);
          const upcoming = filteredActivities.filter((a) => a.status !== "completed" && a.status !== "cancelled");
          const completed = filteredActivities.filter((a) => a.status === "completed" || a.status === "cancelled");

          const handleAdd = async () => {
            const text = recapText.trim();
            if (!text || !numericId) return;
            setIsAddingActivity(true);
            try {
              const res = await fetch("/api/activities", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                  type: current.type,
                  subject: text.length > 80 ? text.slice(0, 77) + "..." : text,
                  notes: text,
                  status: current.status,
                  opportunityId: numericId,
                }),
              });
              if (!res.ok) throw new Error("Failed");
              setRecapText("");
              queryClient.invalidateQueries({ queryKey: ["opportunity-activities", id] });
              toastTop({ title: "Activity added", description: current.label });
            } catch {
              toastTop({ title: "Could not add activity", variant: "destructive" });
            } finally {
              setIsAddingActivity(false);
            }
          };

          const toggleStep = (actId: number) => {
            setExpandedSteps((prev) => {
              const next = new Set(prev);
              if (next.has(actId)) next.delete(actId); else next.add(actId);
              return next;
            });
          };
          const expandAll = () => {
            const allIds = filteredActivities.map((a) => a.id);
            setExpandedSteps(expandedSteps.size === allIds.length ? new Set() : new Set(allIds));
          };

          return (
            <div className="flex flex-col gap-4">
              {/* Composer Card */}
              <Card className="border-border overflow-hidden">
                {/* Sub-tabs */}
                <div className="flex items-center gap-1 border-b border-border bg-muted/30 p-1.5">
                  {subTabs.map((t) => {
                    const Icon = t.icon;
                    const isActive = activitySubTab === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => setActivitySubTab(t.id)}
                        className={`flex items-center gap-1.5 rounded-md px-4 py-1.5 text-sm font-medium transition-all ${
                          isActive
                            ? "bg-primary text-white font-semibold shadow-md ring-1 ring-primary/40"
                            : "text-muted-foreground hover:text-foreground hover:bg-background"
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {t.label}
                      </button>
                    );
                  })}
                </div>
                {/* Recap input */}
                <div className="p-3 flex items-stretch gap-2 bg-card">
                  <Input
                    value={recapText}
                    onChange={(e) => setRecapText(e.target.value)}
                    placeholder={current.placeholder}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAdd(); } }}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleAdd}
                    disabled={!recapText.trim() || isAddingActivity}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6"
                  >
                    {isAddingActivity ? "Adding..." : "Add"}
                  </Button>
                </div>
              </Card>

              {/* Activity Timeline Header */}
              <div className="flex items-center justify-between border-b border-border pb-2">
                <h3 className="text-sm font-semibold text-foreground">Activity Timeline</h3>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" aria-label="Filter activities" title="Filter">
                    <Filter className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => queryClient.invalidateQueries({ queryKey: ["opportunity-activities", id] })}
                    aria-label="Refresh activities"
                    title="Refresh"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={expandAll}
                    disabled={!filteredActivities.length}
                  >
                    {expandedSteps.size > 0 && expandedSteps.size === filteredActivities.length ? "Collapse All" : "Expand All"}
                  </Button>
                </div>
              </div>

              {/* Next Steps section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-foreground">Next Steps</h4>
                  <Button variant="outline" size="sm" disabled className="h-7 px-2 text-xs">
                    More Steps
                  </Button>
                </div>
                {upcoming.length === 0 ? (
                  <div className="text-xs text-muted-foreground italic px-1 py-2">No upcoming steps.</div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {upcoming.map((act) => {
                      const Icon = ACTIVITY_ICONS[act.type] ?? Activity;
                      const isOpen = expandedSteps.has(act.id);
                      return (
                        <Card key={act.id} className="border-l-4 border-l-emerald-500 border-border">
                          <button
                            onClick={() => toggleStep(act.id)}
                            className="w-full flex items-center gap-3 p-3 text-left hover:bg-muted/40 transition-colors"
                          >
                            {isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
                            <div className="w-7 h-7 rounded bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center shrink-0">
                              <Icon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-foreground text-sm truncate">{act.subject}</div>
                              <div className="text-xs text-muted-foreground">You have an upcoming {act.type}</div>
                            </div>
                            <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
                              {act.dueDate ? format(new Date(act.dueDate), "MMM d") : "Today"}
                              <ChevronDown className="w-3 h-3" />
                            </span>
                          </button>
                          {isOpen && (
                            <div className="px-12 pb-3 text-xs text-muted-foreground border-t border-border/50 pt-2">
                              {act.notes || "No additional details."}
                              {act.contactName && (
                                <div className="mt-1.5">Contact: <span className="text-foreground">{act.contactName}</span></div>
                              )}
                            </div>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Past activity */}
              {completed.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-2">Past Activity</h4>
                  <div className="flex flex-col gap-2">
                    {completed.map((act) => {
                      const Icon = ACTIVITY_ICONS[act.type] ?? Activity;
                      return (
                        <Card key={act.id} className="border-border p-3 flex items-start gap-3">
                          <div className="w-7 h-7 rounded bg-muted flex items-center justify-center shrink-0">
                            <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium text-foreground text-sm">{act.subject}</span>
                              <span className="text-xs text-muted-foreground capitalize">{act.status}</span>
                            </div>
                            <div className="flex items-center gap-3 mt-0.5">
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
                    })}
                  </div>
                </div>
              )}

              {!filteredActivities.length && (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  No {current.type} activities logged yet. Use the form above to add one.
                </div>
              )}
            </div>
          );
        })()}

        {activeTab === "notes" && numericId && (
          <EntityNotes entity="opportunity" entityId={numericId} />
        )}

        {/* Quotes Tab */}
        {activeTab === "quotes" && (
          <div className="flex flex-col gap-3">
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={() => setIsQuoteOpen(true)}
                disabled={opp.stage !== "proposal"}
                title={opp.stage !== "proposal" ? "Create Quote is enabled when stage is Proposal/Price Quote" : "Create a new quote"}
                className="bg-primary text-foreground hover:bg-primary/90"
              >
                <Plus className="w-4 h-4 mr-1.5" /> New Quote
              </Button>
            </div>
            {oppQuotes.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                No quotes for this opportunity yet.
                <div className="mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsQuoteOpen(true)}
                    disabled={opp.stage !== "proposal"}
                    title={opp.stage !== "proposal" ? "Create Quote is enabled when stage is Proposal/Price Quote" : "Create a new quote"}
                    className="border-border text-sm"
                  >
                    Create first quote
                  </Button>
                  {opp.stage !== "proposal" && (
                    <div className="text-xs text-muted-foreground/70 mt-2">
                      Quote creation is unlocked when the opportunity reaches the <span className="font-medium text-foreground">Proposal/Price Quote</span> stage.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              oppQuotes.map(q => (
                <Card key={q.id} className="glass-panel border-border p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium text-foreground text-sm">{q.name}</div>
                      <div className="text-xs text-muted-foreground font-mono mt-0.5">{q.quoteNumber}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {q.validUntil && (
                      <span className="text-xs text-muted-foreground hidden sm:block">
                        Valid until {format(new Date(q.validUntil), "MMM d, yyyy")}
                      </span>
                    )}
                    <span className="font-semibold text-foreground text-sm">£{q.total.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                    <Badge variant="outline" className={`capitalize text-xs ${QUOTE_STATUS_COLORS[q.status] ?? ""}`}>
                      {q.status}
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1.5 text-muted-foreground hover:text-foreground h-7 px-2"
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

        {/* Approvals Tab */}
        {activeTab === "approvals" && (
          <EntityApprovals
            entity="opportunity"
            record={opp as unknown as Record<string, unknown>}
            isAdmin={isAdmin}
          />
        )}

        {activeTab === "about" && (
          <div className="flex flex-col gap-4">
            {/* Next Step - Prominent Highlight */}
            {opp.nextStep && (
              <Card className="glass-panel border-primary/20 bg-primary/5 p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                    <ArrowRight className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-primary/80 uppercase tracking-wide font-semibold mb-0.5">Next Step</p>
                    <p className="text-sm text-foreground">{opp.nextStep}</p>
                  </div>
                </div>
              </Card>
            )}

            {/* Forecast Category - Prominent */}
            {opp.forecastCategory && (
              <Card className="glass-panel border-border p-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Forecast Category</p>
                    <p className="text-sm font-semibold text-emerald-600 capitalize">{opp.forecastCategory}</p>
                  </div>
                </div>
              </Card>
            )}

            {/* Main Details Grid */}
            <Card className="glass-panel border-border p-6">
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                {[
                  { label: "Opportunity Name", value: opp.name },
                  { label: "Account", value: opp.accountName },
                  { label: "Stage", value: stageConfig.label },
                  { label: "Contact", value: [opp.contactFirstName, opp.contactLastName].filter(Boolean).join(" ") || null },
                  { label: "Amount", value: opp.amount !== null ? `£${opp.amount.toLocaleString()}` : null },
                  { label: "Close Date", value: opp.closeDate ? format(new Date(opp.closeDate), "MMM d, yyyy") : null },
                  { label: "Win Probability", value: opp.probability !== null ? `${opp.probability}%` : null },
                  { label: "Lead Source", value: opp.leadSource },
                  { label: "Opty Owner", value: opp.assignedToName },
                  { label: "Forecast Category", value: opp.forecastCategory ?? (opp.forecastCategory === null && !opp.nextStep ? null : null) },
                  { label: "Created By", value: opp.createdAt ? format(new Date(opp.createdAt), "MMM d, yyyy 'at' h:mm a") : null },
                  { label: "Last Modified", value: opp.updatedAt ? format(new Date(opp.updatedAt), "MMM d, yyyy 'at' h:mm a") : null },
                ].map(({ label, value }) =>
                  value ? (
                    <div key={label}>
                      <dt className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">{label}</dt>
                      <dd className="text-sm text-foreground">{value}</dd>
                    </div>
                  ) : null
                )}
              </dl>
              {opp.description && (
                <div className="mt-6 pt-6 border-t border-border">
                  <dt className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Description</dt>
                  <dd className="text-sm text-muted-foreground leading-relaxed">{opp.description}</dd>
                </div>
              )}
            </Card>

            {/* Opty Team */}
            <Card className="glass-panel border-border">
              <div className="flex items-center justify-between p-4 pb-3">
                <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" /> Opty Team
                </p>
              </div>
              <div className="px-4 pb-4 space-y-3">
                {(() => {
                  const members = (opp.teamMembers ?? "")
                    .split(",")
                    .map((m) => m.trim())
                    .filter(Boolean);
                  const saveMembers = async (next: string[]) => {
                    const body = { teamMembers: next.join(", ") };
                    const res = await fetch(`/api/opportunities/${id}`, {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      credentials: "include",
                      body: JSON.stringify(body),
                    });
                    if (res.ok) {
                      queryClient.invalidateQueries({ queryKey: ["opportunity", id] });
                    }
                  };
                  const handleAdd = () => {
                    const name = newTeamMember.trim();
                    if (!name) return;
                    if (members.some((m) => m.toLowerCase() === name.toLowerCase())) {
                      setNewTeamMember("");
                      return;
                    }
                    saveMembers([...members, name]);
                    setNewTeamMember("");
                  };
                  const handleRemove = (name: string) => {
                    saveMembers(members.filter((m) => m !== name));
                  };
                  return (
                    <>
                      {members.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No team members yet. Add one below.</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {members.map((member) => {
                            const initials = member.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
                            return (
                              <div key={member} className="flex items-center gap-2 pl-2 pr-1 py-1 bg-muted/50 border border-border rounded-full group">
                                <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">{initials}</div>
                                <span className="text-sm text-foreground">{member}</span>
                                <button
                                  type="button"
                                  onClick={() => handleRemove(member)}
                                  className="w-5 h-5 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive flex items-center justify-center"
                                  aria-label={`Remove ${member}`}
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {(() => {
                        const allUsers = usersData?.data ?? [];
                        const available = allUsers.filter(
                          (u) => !members.some((m) => m.toLowerCase() === u.name.toLowerCase())
                        );
                        const roleLabel = (r: string) =>
                          r ? r.charAt(0).toUpperCase() + r.slice(1) : "";
                        const pickUser = (name: string) => {
                          if (!name) return;
                          if (members.some((m) => m.toLowerCase() === name.toLowerCase())) return;
                          saveMembers([...members, name]);
                          setNewTeamMember("");
                          setTeamPickerOpen(false);
                        };
                        return (
                          <div className="pt-1">
                            <Popover open={teamPickerOpen} onOpenChange={setTeamPickerOpen}>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  aria-expanded={teamPickerOpen}
                                  className="w-full h-9 justify-between bg-muted border-border text-sm font-normal"
                                >
                                  <span className="flex items-center gap-2 text-muted-foreground">
                                    <Plus className="w-3.5 h-3.5" />
                                    Search and add team member…
                                  </span>
                                  <ChevronsUpDown className="w-3.5 h-3.5 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]" align="start">
                                <Command>
                                  <CommandInput placeholder="Search by name, email or role…" />
                                  <CommandList>
                                    <CommandEmpty>
                                      {available.length === 0 ? "All users are already on the team." : "No user found."}
                                    </CommandEmpty>
                                    <CommandGroup>
                                      {available.map((u) => (
                                        <CommandItem
                                          key={u.id}
                                          value={`${u.name} ${u.email} ${u.role}`}
                                          onSelect={() => pickUser(u.name)}
                                          className="flex items-center gap-2"
                                        >
                                          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                                            {u.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                                          </div>
                                          <div className="min-w-0 flex-1">
                                            <div className="text-sm font-medium truncate">{u.name}</div>
                                            <div className="text-xs text-muted-foreground truncate">
                                              {roleLabel(u.role)}{u.email ? ` · ${u.email}` : ""}
                                            </div>
                                          </div>
                                          <Check className={`w-3.5 h-3.5 ${newTeamMember === u.name ? "opacity-100" : "opacity-0"}`} />
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          </div>
                        );
                      })()}
                    </>
                  );
                })()}
              </div>
            </Card>
          </div>
        )}
          </div>
          {/* Right Sidebar — only on Details (about) tab */}
          {activeTab === "about" && (
          <aside className="flex flex-col gap-4">
            {/* Account Details */}
            <Card className="border-border overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 bg-blue-50 dark:bg-blue-950/40 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center">
                    <Building2 className="w-3.5 h-3.5 text-white" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">Account Details</h3>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs text-foreground hover:bg-blue-100 dark:hover:bg-blue-950/50"
                  onClick={() => setIsEditOpen(true)}
                >
                  <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                </Button>
              </div>
              <div className="p-4 grid grid-cols-2 gap-x-3 gap-y-3 text-sm">
                <div className="col-span-2">
                  <div className="text-[11px] text-muted-foreground mb-0.5">Account Name</div>
                  {opp.accountId ? (
                    <Link href={`/accounts/${opp.accountId}`}>
                      <span className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer text-sm">{opp.accountName ?? "—"}</span>
                    </Link>
                  ) : (
                    <div className="text-foreground text-sm">{opp.accountName ?? "—"}</div>
                  )}
                </div>
                <div>
                  <div className="text-[11px] text-muted-foreground mb-0.5">Type</div>
                  <div className="text-foreground text-sm">{accountData?.status ?? "—"}</div>
                </div>
                <div>
                  <div className="text-[11px] text-muted-foreground mb-0.5">Industry</div>
                  <div className="text-foreground text-sm">{accountData?.industry ?? "—"}</div>
                </div>
                <div>
                  <div className="text-[11px] text-muted-foreground mb-0.5">Phone</div>
                  <div className="text-foreground text-sm flex items-center gap-1">
                    {accountData?.phone ? (
                      <a href={`tel:${accountData.phone}`} className="text-blue-600 dark:text-blue-400 hover:underline">{accountData.phone}</a>
                    ) : "—"}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-muted-foreground mb-0.5">Annual Revenue</div>
                  <div className="text-foreground text-sm">{accountData?.annualRevenue != null ? `£${accountData.annualRevenue.toLocaleString()}` : "—"}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-[11px] text-muted-foreground mb-0.5">Website</div>
                  {accountData?.website ? (
                    <a href={accountData.website.startsWith("http") ? accountData.website : `https://${accountData.website}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline text-sm flex items-center gap-1 truncate">
                      <Globe className="w-3 h-3 shrink-0" />
                      <span className="truncate">{accountData.website}</span>
                    </a>
                  ) : <div className="text-foreground text-sm">—</div>}
                </div>
                <div className="col-span-2">
                  <div className="text-[11px] text-muted-foreground mb-0.5">Billing Address</div>
                  <div className="text-foreground text-sm whitespace-pre-line">
                    {[accountData?.address, accountData?.city, accountData?.country].filter(Boolean).join("\n") || "—"}
                  </div>
                </div>
              </div>
            </Card>

            {/* Products */}
            <Card className="border-border overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 bg-amber-50 dark:bg-amber-950/30 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-amber-500 flex items-center justify-center">
                    <Package className="w-3.5 h-3.5 text-white" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">Products ({oppItems.length})</h3>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs text-foreground hover:bg-amber-100 dark:hover:bg-amber-950/50"
                  onClick={() => setIsProductsOpen(true)}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  {oppItems.length === 0 ? "Add" : "Manage"}
                </Button>
              </div>
              {oppItems.length > 0 ? (
                <div className="p-4 text-sm flex flex-col gap-2">
                  {oppItems.slice(0, 4).map((it) => (
                    <div key={it.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate text-foreground" title={it.productName}>
                        {it.productId ? (
                          <Link href={`/products/${it.productId}`}>
                            <span className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">{it.productName}</span>
                          </Link>
                        ) : (
                          it.productName
                        )}
                      </span>
                      <span className="text-[11px] text-muted-foreground shrink-0">
                        {Number(it.quantity)} × £{Number(it.unitPrice).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                  {oppItems.length > 4 ? (
                    <div className="text-[11px] text-muted-foreground pt-1">+ {oppItems.length - 4} more…</div>
                  ) : null}
                </div>
              ) : (
                <div className="p-4 text-xs text-muted-foreground italic">No products on this opportunity yet.</div>
              )}
            </Card>

            {/* Contact Roles */}
            <Card className="border-border overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 bg-orange-50 dark:bg-orange-950/30 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-orange-500 flex items-center justify-center">
                    <Users className="w-3.5 h-3.5 text-white" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">Contact Roles ({contactsData?.data.length ?? 0})</h3>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs text-foreground hover:bg-orange-100 dark:hover:bg-orange-950/50"
                  onClick={() => { setEditingContact(null); setContactDialogOpen(true); }}
                  disabled={!opp.accountId}
                  title={opp.accountId ? "Add a contact to this account" : "Set an account first"}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add
                </Button>
              </div>
              {contactsData?.data.length ? (
                <div className="p-4 text-sm flex flex-col gap-2.5">
                  {contactsData.data.slice(0, 4).map((c) => {
                    const initials = `${c.firstName[0] ?? ""}${c.lastName[0] ?? ""}`.toUpperCase();
                    const isPrimaryContact = opp.contactId != null && c.id === opp.contactId;
                    return (
                      <div key={c.id} className="flex items-center gap-2.5 group">
                        <div className="w-7 h-7 rounded-full bg-orange-100 dark:bg-orange-950/50 flex items-center justify-center text-orange-700 dark:text-orange-300 text-[11px] font-bold shrink-0">
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <Link href={`/contacts/${c.id}`}>
                            <span className="text-blue-600 dark:text-blue-400 hover:underline text-sm cursor-pointer truncate block">
                              {c.firstName} {c.lastName}
                              {isPrimaryContact && <span className="ml-1.5 text-[9px] font-bold text-orange-700 dark:text-orange-300">PRIMARY</span>}
                            </span>
                          </Link>
                          {c.title && <div className="text-[11px] text-muted-foreground truncate">Role: {c.title}</div>}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => {
                            setEditingContact({
                              id: c.id,
                              firstName: c.firstName,
                              lastName: c.lastName,
                              email: c.email ?? "",
                              phone: c.phone ?? "",
                              title: c.title ?? "",
                              accountId: c.accountId ? String(c.accountId) : "",
                            });
                            setContactDialogOpen(true);
                          }}
                          title="Edit contact"
                        >
                          <Pencil className="w-3 h-3" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 text-xs text-muted-foreground">No contact roles assigned.</div>
              )}
            </Card>
          </aside>
          )}
        </div>
      </div>
      {numericId && (
        <>
          <OpportunityProductsDialog
            open={isProductsOpen}
            onOpenChange={setIsProductsOpen}
            opportunityId={numericId}
            initialItems={oppItems}
          />
          <QuickQuoteDialog
            open={isQuoteOpen}
            onOpenChange={setIsQuoteOpen}
            opportunityId={numericId}
            opportunityName={opp.name}
          />
        </>
      )}
      <EmailCompose
        open={isEmailOpen}
        onOpenChange={setIsEmailOpen}
        defaultTo={
          (opp.contactId != null
            ? contactsData?.data.find((c) => c.id === opp.contactId)?.email
            : contactsData?.data[0]?.email) ?? ""
        }
        recipientName={
          (opp.contactId != null
            ? (() => {
                const c = contactsData?.data.find((cc) => cc.id === opp.contactId);
                return c ? `${c.firstName} ${c.lastName}` : "";
              })()
            : (() => {
                const c = contactsData?.data[0];
                return c ? `${c.firstName} ${c.lastName}` : "";
              })()) || ""
        }
        defaultSubject={`Re: ${opp.name}`}
        opportunityId={numericId ?? undefined}
        contactId={opp.contactId ?? undefined}
        accountId={opp.accountId ?? undefined}
        onSent={() => {
          queryClient.invalidateQueries({ queryKey: ["opportunity-activities", id] });
          setActiveTab("activities");
          setActivitySubTab("email");
        }}
      />
      <OppEditDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        opp={opp}
        oppId={id ?? ""}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ["opportunity", id] })}
      />
      <ContactFormDialog
        open={contactDialogOpen}
        onOpenChange={(o) => { setContactDialogOpen(o); if (!o) setEditingContact(null); }}
        mode={editingContact ? "edit" : "create"}
        initialData={editingContact ?? undefined}
        lockedAccountId={opp.accountId ?? undefined}
        showPrimaryContactOption
        primaryContactLabel="Set as primary contact for this opportunity"
        defaultPrimary={editingContact ? editingContact.id === opp.contactId : false}
        primaryContactCheckboxDisabled={!!editingContact && editingContact.id === opp.contactId}
        primaryContactHint={(() => {
          if (editingContact && editingContact.id === opp.contactId) {
            return "This contact is the current primary. Promote another contact to change it.";
          }
          if (opp.contactId != null) {
            const current = contactsData?.data.find((c) => c.id === opp.contactId);
            const name = current ? `${current.firstName} ${current.lastName}` : "the current primary contact";
            return `Only one primary is allowed. Checking this will replace ${name}.`;
          }
          return undefined;
        })()}
        onSaved={async (saved) => {
          if (saved.isPrimary && numericId && saved.id !== opp.contactId) {
            try {
              const res = await fetch(`/api/opportunities/${numericId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ contactId: saved.id }),
              });
              if (!res.ok) {
                throw new Error(`HTTP ${res.status}`);
              }
              queryClient.invalidateQueries({ queryKey: ["opportunity", id] });
              toastTop({ title: "Primary contact updated" });
            } catch (err) {
              console.error("Failed to set primary contact", err);
              toastTop({
                title: "Couldn't set primary contact",
                description: "The contact was saved, but updating the opportunity's primary contact failed.",
                variant: "destructive",
              });
            }
          }
          queryClient.invalidateQueries({ queryKey: ["opportunity-contacts", id] });
        }}
      />
    </Layout>
  );
}

function OppEditDialog({ open, onOpenChange, opp, oppId, onSaved }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  opp: OpportunityDetail;
  oppId: string;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: opp.name ?? "",
    stage: opp.stage ?? "prospecting",
    amount: opp.amount?.toString() ?? "",
    probability: opp.probability?.toString() ?? "",
    closeDate: opp.closeDate?.slice(0, 10) ?? "",
    leadSource: opp.leadSource ?? "",
    nextStep: opp.nextStep ?? "",
    forecastCategory: opp.forecastCategory ?? "",
    teamMembers: opp.teamMembers ?? "",
    description: opp.description ?? "",
  });

  React.useEffect(() => {
    if (open) setForm({
      name: opp.name ?? "", stage: opp.stage ?? "prospecting",
      amount: opp.amount?.toString() ?? "", probability: opp.probability?.toString() ?? "",
      closeDate: opp.closeDate?.slice(0, 10) ?? "", leadSource: opp.leadSource ?? "",
      nextStep: opp.nextStep ?? "", forecastCategory: opp.forecastCategory ?? "",
      teamMembers: opp.teamMembers ?? "", description: opp.description ?? "",
    });
  }, [open, opp]);

  const mutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await fetch(`/api/opportunities/${oppId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...data,
          amount: data.amount ? parseFloat(data.amount) : null,
          probability: data.probability ? parseInt(data.probability) : null,
          closeDate: data.closeDate || null,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Opportunity updated" });
      onSaved();
      onOpenChange(false);
    },
    onError: () => toast({ title: "Error", description: "Could not save.", variant: "destructive" }),
  });

  const f = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [field]: e.target.value });
  const sc = "w-full h-9 px-3 rounded-md bg-muted border border-border text-sm";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border text-foreground sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Edit Opportunity</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(form); }} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Opportunity Name *</Label>
            <Input required className="bg-muted border-border h-9" value={form.name} onChange={f("name")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-xs">Stage</Label>
              <select className={sc} value={form.stage} onChange={f("stage")}>
                {["prospecting","qualification","proposal","negotiation","closed_won","closed_lost"].map(s =>
                  <option key={s} value={s} className="bg-card capitalize">{s.replace("_", " ")}</option>)}
              </select>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Forecast Category</Label>
              <select className={sc} value={form.forecastCategory} onChange={f("forecastCategory")}>
                <option value="" className="bg-card">— Not set —</option>
                {["pipeline","best case","commit","closed"].map(c =>
                  <option key={c} value={c} className="bg-card capitalize">{c}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-xs">Amount (£)</Label>
              <Input type="number" className="bg-muted border-border h-9" value={form.amount} onChange={f("amount")} />
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Win Probability (%)</Label>
              <Input type="number" min="0" max="100" className="bg-muted border-border h-9" value={form.probability} onChange={f("probability")} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-xs">Close Date</Label>
              <Input type="date" className="bg-muted border-border h-9" value={form.closeDate} onChange={f("closeDate")} />
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Lead Source</Label>
              <select className={sc} value={form.leadSource} onChange={f("leadSource")}>
                <option value="" className="bg-card">— Not set —</option>
                {["Website","Referral","Cold Call","LinkedIn","Email Campaign","Partner","Conference","Other"].map(s =>
                  <option key={s} value={s} className="bg-card">{s}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-1.5"><Label className="text-xs">Next Step</Label>
            <Input className="bg-muted border-border h-9" placeholder="e.g. Send proposal by Friday, Schedule demo with CTO" value={form.nextStep} onChange={f("nextStep")} />
          </div>
          <div className="space-y-1.5"><Label className="text-xs">Opty Team (comma-separated names)</Label>
            <Input className="bg-muted border-border h-9" placeholder="e.g. Sarah Johnson, Mike Chen" value={form.teamMembers} onChange={f("teamMembers")} />
          </div>
          <div className="space-y-1.5"><Label className="text-xs">Description</Label>
            <textarea className="w-full px-3 py-1.5 rounded-md bg-muted border border-border text-sm min-h-[80px] resize-none" value={form.description} onChange={f("description")} />
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="border-border">Cancel</Button>
            <Button type="submit" disabled={mutation.isPending} className="bg-primary hover:bg-primary/90 text-foreground">
              {mutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
