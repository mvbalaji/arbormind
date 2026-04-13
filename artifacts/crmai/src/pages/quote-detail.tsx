import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import {
  useGetQuote, useUpdateQuote, useCreateQuoteVersion, useSendQuote,
  getGetQuoteQueryKey, getListQuotesQueryKey,
  type Quote,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Download, Send, Copy, CheckCircle, XCircle, Clock,
  FileText, Package, Building2, User, History,
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

const STATUS_FLOW = ["draft", "sent", "accepted", "rejected", "expired"];

export default function QuoteDetail() {
  const [, params] = useRoute("/quotes/:id");
  const [, navigate] = useLocation();
  const quoteId = parseInt(params?.id ?? "0");
  const { data: quote, isLoading, error } = useGetQuote(quoteId, { query: { enabled: quoteId > 0 } });
  const updateMutation = useUpdateQuote();
  const versionMutation = useCreateQuoteVersion();
  const sendMutation = useSendQuote();
  const queryClient = useQueryClient();
  const { toast } = useToast();

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

  const isEditable = quote.isLatestVersion !== false && (quote.status === "draft" || quote.status === "sent");

  return (
    <Layout>
      <div className="flex flex-col gap-6 max-w-5xl mx-auto">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/quotes")} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-display font-bold text-foreground tracking-tight">{quote.name}</h1>
              <Badge variant="outline" className={`capitalize ${STATUS_COLORS[quote.status] ?? ""}`}>
                {quote.status}
              </Badge>
              <span className="text-sm text-muted-foreground font-mono">{quote.quoteNumber}</span>
              <Badge variant="secondary" className="text-xs">v{quote.version}</Badge>
            </div>
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
            </>
          )}
          {isEditable && (
            <Button variant="outline" size="sm" onClick={handleCreateVersion} disabled={versionMutation.isPending} className="border-border">
              <Copy className="w-4 h-4 mr-2" /> Create New Version
            </Button>
          )}
          {quote.status === "accepted" && (
            <Button size="sm" onClick={() => navigate(`/orders?fromQuote=${quoteId}`)} className="bg-primary hover:bg-primary/90 text-foreground">
              <Package className="w-4 h-4 mr-2" /> Convert to Order
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="glass-panel border-border p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-3">
              <Building2 className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase">Account</span>
            </div>
            <p className="text-foreground font-medium">{quote.accountName ?? "—"}</p>
          </Card>
          <Card className="glass-panel border-border p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-3">
              <User className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase">Contact</span>
            </div>
            <p className="text-foreground font-medium">{quote.contactName ?? "—"}</p>
            {quote.contactEmail && <p className="text-xs text-muted-foreground mt-1">{quote.contactEmail}</p>}
          </Card>
          <Card className="glass-panel border-border p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-3">
              <Clock className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase">Valid Until</span>
            </div>
            <p className="text-foreground font-medium">
              {quote.validUntil ? format(new Date(quote.validUntil), "MMM d, yyyy") : "—"}
            </p>
          </Card>
        </div>

        <Card className="glass-panel border-border">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold text-foreground">Line Items</h3>
          </div>
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
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No line items</td>
                  </tr>
                ) : (
                  quote.items.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 text-foreground font-medium">{item.productName}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{item.quantity}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">${item.unitPrice.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{item.discount}%</td>
                      <td className="px-4 py-3 text-right font-semibold text-foreground">${item.total.toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-border space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Subtotal</span>
              <span>${quote.subtotal.toFixed(2)}</span>
            </div>
            {quote.discount > 0 && (
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Discount ({quote.discount}%)</span>
                <span>-${(quote.subtotal * quote.discount / 100).toFixed(2)}</span>
              </div>
            )}
            {quote.tax > 0 && (
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Tax ({quote.tax}%)</span>
                <span>${(quote.subtotal * (1 - quote.discount / 100) * quote.tax / 100).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-foreground text-lg border-t border-border pt-2 mt-2">
              <span>Total</span>
              <span>${quote.total.toFixed(2)}</span>
            </div>
          </div>
        </Card>

        {quote.notes && (
          <Card className="glass-panel border-border p-4">
            <h3 className="font-semibold text-foreground mb-2">Notes & Terms</h3>
            <p className="text-muted-foreground text-sm whitespace-pre-wrap">{quote.notes}</p>
          </Card>
        )}

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
