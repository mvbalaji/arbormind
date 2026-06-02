import React, { useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import {
  useGetContract, useActivateContract, useTerminateContract, useRenewContract, useDeleteContract,
  useSubmitContractForApproval, useUpdateContract, useListProducts, useListAccounts,
  getGetContractQueryKey, getListContractsQueryKey, getListContractDocumentsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ArrowLeft, CheckCircle, XCircle, RefreshCw, Trash2, FileSignature, Send, History, Pencil, Check, Plus, X, Package } from "lucide-react";
import { format } from "date-fns";
import { useCurrency } from "@/context/currency";
import { useToast } from "@/hooks/use-toast";
import { CONTRACT_STATUS_COLORS, contractStatusLabel } from "./contracts";
import { ContractRevisions } from "@/components/contract-revisions";
import { EntityNotes } from "@/components/entity-notes";

interface EditLineItem {
  productId: number | null;
  productName: string;
  quantity: number;
  listPrice: number;
  unitPrice: number;
  discount: number;
}

export default function ContractDetail() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id);
  const [, navigate] = useLocation();
  const [terminateOpen, setTerminateOpen] = useState(false);
  const [terminateReason, setTerminateReason] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { data: contract, isLoading } = useGetContract(id);
  const activateMutation = useActivateContract();
  const submitMutation = useSubmitContractForApproval();
  const terminateMutation = useTerminateContract();
  const renewMutation = useRenewContract();
  const deleteMutation = useDeleteContract();
  const updateMutation = useUpdateContract();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { format: fmtMoney } = useCurrency();

  const { data: productsData } = useListProducts({ limit: 200 });
  const { data: accountsData } = useListAccounts({ limit: 200 });
  const products = productsData?.data ?? [];
  const accounts = accountsData?.data ?? [];

  // Per-section inline editing state.
  const [editInfo, setEditInfo] = useState(false);
  const [editPricing, setEditPricing] = useState(false);
  const [iName, setIName] = useState("");
  const [iAccountId, setIAccountId] = useState("");
  const [iStartDate, setIStartDate] = useState("");
  const [iTermMonths, setITermMonths] = useState("");
  const [iAutoRenew, setIAutoRenew] = useState(false);
  const [iRenewalTermMonths, setIRenewalTermMonths] = useState("12");
  const [iDescription, setIDescription] = useState("");
  const [pItems, setPItems] = useState<EditLineItem[]>([]);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: getGetContractQueryKey(id) });
    queryClient.invalidateQueries({ queryKey: getListContractsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListContractDocumentsQueryKey(id) });
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

  if (!contract) {
    return (
      <Layout>
        <div className="text-center py-20 text-muted-foreground">Contract not found.</div>
      </Layout>
    );
  }

  const canEdit = contract.status === "draft" || contract.status === "in_approval";

  const handleSubmitForApproval = async () => {
    try {
      await submitMutation.mutateAsync({ id });
      toast({ title: "Submitted for approval", description: "Contract document generated." });
      refresh();
    } catch {
      toast({ title: "Error", description: "Could not submit the contract for approval.", variant: "destructive" });
    }
  };

  const handleActivate = async () => {
    try {
      await activateMutation.mutateAsync({ id });
      toast({ title: "Contract activated" });
      refresh();
    } catch {
      toast({ title: "Error", description: "Could not activate contract.", variant: "destructive" });
    }
  };

  const handleTerminate = async () => {
    try {
      await terminateMutation.mutateAsync({ id, data: { reason: terminateReason || null } });
      toast({ title: "Contract terminated" });
      setTerminateOpen(false); setTerminateReason("");
      refresh();
    } catch {
      toast({ title: "Error", description: "Could not terminate contract.", variant: "destructive" });
    }
  };

  const handleRenew = async () => {
    try {
      const result = await renewMutation.mutateAsync({ id });
      toast({ title: "Renewal contract created" });
      if (result?.id) navigate(`/contracts/${result.id}`);
    } catch {
      toast({ title: "Error", description: "Could not renew contract.", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync({ id });
      toast({ title: "Contract deleted" });
      navigate("/contracts");
    } catch {
      toast({ title: "Error", description: "Could not delete contract.", variant: "destructive" });
    }
  };

  // ----- Contract Information inline editing -----
  const startEditInfo = () => {
    setIName(contract.name ?? "");
    setIAccountId(contract.accountId != null ? String(contract.accountId) : "");
    setIStartDate(contract.startDate ? contract.startDate.slice(0, 10) : "");
    setITermMonths(contract.contractTermMonths != null ? String(contract.contractTermMonths) : "");
    setIAutoRenew(!!contract.autoRenew);
    setIRenewalTermMonths(contract.renewalTermMonths != null ? String(contract.renewalTermMonths) : "12");
    setIDescription(contract.description ?? "");
    setEditInfo(true);
  };

  const saveInfo = async () => {
    try {
      await updateMutation.mutateAsync({ id, data: {
        name: iName || undefined,
        accountId: iAccountId ? parseInt(iAccountId) : null,
        startDate: iStartDate || null,
        contractTermMonths: iTermMonths ? parseInt(iTermMonths) : null,
        autoRenew: iAutoRenew,
        renewalTermMonths: iRenewalTermMonths ? parseInt(iRenewalTermMonths) : null,
        description: iDescription || null,
      } });
      toast({ title: "Contract information updated" });
      refresh();
      setEditInfo(false);
    } catch {
      toast({ title: "Error", description: "Could not update contract information.", variant: "destructive" });
    }
  };

  // ----- Contracted Pricing inline editing -----
  const startEditPricing = () => {
    setPItems((contract.items ?? []).map((it) => ({
      productId: it.productId ?? null,
      productName: it.productName,
      quantity: it.quantity,
      listPrice: it.listPrice,
      unitPrice: it.unitPrice,
      discount: it.discount,
    })));
    setEditPricing(true);
  };

  const lineTotal = (it: EditLineItem) => it.quantity * it.unitPrice * (1 - it.discount / 100);
  const editSubtotal = pItems.reduce((sum, it) => sum + lineTotal(it), 0);
  const addItem = () => setPItems((prev) => [...prev, { productId: null, productName: "", quantity: 1, listPrice: 0, unitPrice: 0, discount: 0 }]);
  const removeItem = (idx: number) => setPItems((prev) => prev.filter((_, i) => i !== idx));
  const updateItemAt = (idx: number, changes: Partial<EditLineItem>) =>
    setPItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...changes } : it)));
  const pickProduct = (idx: number, productId: number) => {
    const prod = products.find((p) => p.id === productId);
    if (prod) updateItemAt(idx, { productId: prod.id, productName: prod.name, listPrice: prod.unitPrice, unitPrice: prod.unitPrice, discount: 0 });
  };

  const savePricing = async () => {
    try {
      await updateMutation.mutateAsync({ id, data: {
        items: pItems.filter((it) => it.productName).map((it) => ({
          productId: it.productId,
          productName: it.productName,
          quantity: it.quantity || 1,
          listPrice: it.listPrice || 0,
          unitPrice: it.unitPrice || 0,
          discount: it.discount || 0,
        })),
      } });
      toast({ title: "Contracted pricing updated" });
      refresh();
      setEditPricing(false);
    } catch {
      toast({ title: "Error", description: "Could not update contracted pricing.", variant: "destructive" });
    }
  };

  const items = contract.items ?? [];

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        <Link href="/contracts">
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground mb-3 hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> Back to Contracts
          </Button>
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5 items-start">
          <div className="flex flex-col gap-5 min-w-0">
            <div>
              <Card className="glass-panel border-border p-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileSignature className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold text-foreground">{contract.name}</h1>
                    <Badge variant="outline" className={CONTRACT_STATUS_COLORS[contract.status] ?? ""}>{contractStatusLabel(contract.status)}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{contract.contractNumber}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {contract.status === "draft" && (
                  <Button onClick={handleSubmitForApproval} disabled={submitMutation.isPending}
                    variant="outline" className="border-border">
                    <Send className="w-4 h-4 mr-1" /> Submit for Approval
                  </Button>
                )}
                {(contract.status === "draft" || contract.status === "in_approval") && (
                  <Button onClick={handleActivate} disabled={activateMutation.isPending}
                    className="bg-green-600 hover:bg-green-700 text-white">
                    <CheckCircle className="w-4 h-4 mr-1" /> Activate
                  </Button>
                )}
                {contract.status === "activated" && (
                  <Button onClick={() => setTerminateOpen(true)} variant="outline" className="border-red-300 text-red-600 hover:bg-red-50">
                    <XCircle className="w-4 h-4 mr-1" /> Terminate
                  </Button>
                )}
                {["activated", "expired", "terminated"].includes(contract.status) && (
                  <Button onClick={handleRenew} disabled={renewMutation.isPending} variant="outline" className="border-border">
                    <RefreshCw className="w-4 h-4 mr-1" /> Renew
                  </Button>
                )}
                <Button onClick={() => setDeleteOpen(true)} variant="ghost" size="icon" className="text-muted-foreground hover:text-red-600">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {(() => {
          const baseStages = [
            { id: "draft", label: "Draft" },
            { id: "in_approval", label: "In Approval" },
            { id: "activated", label: "Activated" },
          ];
          let stages = baseStages;
          if (contract.status === "terminated") stages = [...baseStages, { id: "terminated", label: "Terminated" }];
          else if (contract.status === "expired") stages = [...baseStages, { id: "expired", label: "Expired" }];
          const idx = stages.findIndex((s) => s.id === contract.status);
          if (idx < 0) return null;
          const currentCls =
            contract.status === "terminated" ? "bg-red-600 text-white" :
            contract.status === "expired" ? "bg-amber-500 text-white" :
            "bg-blue-600 text-white";

          const stageDate = (stageId: string): Date | null => {
            if (stageId === "draft" && contract.createdAt) return new Date(contract.createdAt);
            if (stageId === "activated" && contract.activatedAt) return new Date(contract.activatedAt);
            return null;
          };

          const nextAction =
            contract.status === "draft"
              ? { label: "Submit for Approval", icon: Send, fn: handleSubmitForApproval, pending: submitMutation.isPending, cls: "bg-blue-600 hover:bg-blue-700 text-white" }
              : contract.status === "in_approval"
              ? { label: "Activate", icon: CheckCircle, fn: handleActivate, pending: activateMutation.isPending, cls: "bg-emerald-600 hover:bg-emerald-700 text-white" }
              : null;

          return (
            <Card className="glass-panel border-border p-5">
              <h2 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wide">Lifecycle Stage</h2>
              <div className="flex items-stretch gap-0 -mx-1">
                <TooltipProvider delayDuration={150}>
                  <ol
                    role="list"
                    aria-label="Contract lifecycle stage"
                    className="flex-1 flex items-stretch overflow-hidden rounded-md border border-border bg-muted/30 list-none p-0 m-0"
                  >
                    {stages.map((s, i) => {
                      const done = i < idx;
                      const current = i === idx;
                      const isLast = i === stages.length - 1;
                      const stateLabel = done ? "Completed" : current ? "Current" : "Upcoming";
                      const entered = stageDate(s.id);
                      return (
                        <Tooltip key={s.id}>
                          <TooltipTrigger asChild>
                            <li
                              role="listitem"
                              tabIndex={0}
                              aria-current={current ? "step" : undefined}
                              aria-label={`${s.label} — ${stateLabel}`}
                              className={`relative flex-1 flex items-center justify-center px-3 py-1 text-xs font-medium min-w-0 cursor-default focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-inset ${
                                done ? "bg-emerald-500 text-white" :
                                current ? currentCls :
                                "bg-muted/50 text-muted-foreground"
                              }`}
                              style={!isLast
                                ? { clipPath: "polygon(0 0, calc(100% - 10px) 0, 100% 50%, calc(100% - 10px) 100%, 0 100%, 10px 50%)" }
                                : { clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%, 10px 50%)" }}
                            >
                              {done ? (
                                <>
                                  <span aria-hidden="true" className="flex items-center justify-center w-5 h-5 rounded-full bg-white/20"><Check className="w-3.5 h-3.5" /></span>
                                  <span className="sr-only">{s.label}</span>
                                </>
                              ) : (
                                <span className="truncate max-w-full">{s.label}</span>
                              )}
                            </li>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="bg-foreground text-background border-border max-w-xs">
                            <div className="text-xs">
                              <div className="font-semibold mb-1">{s.label}</div>
                              <div className="flex items-center gap-1.5 mb-1">
                                <span className={`inline-block w-1.5 h-1.5 rounded-full ${done ? "bg-emerald-400" : current ? "bg-blue-400" : "bg-muted-foreground/50"}`} />
                                <span>Status: {stateLabel}</span>
                              </div>
                              {entered && <div className="opacity-80">Entered: {format(entered, "MMM d, yyyy")}</div>}
                              {!entered && !current && !done && <div className="opacity-70">Not yet reached</div>}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </ol>
                </TooltipProvider>
                {nextAction ? (
                  <Button
                    size="sm"
                    onClick={nextAction.fn}
                    disabled={nextAction.pending}
                    className={`shrink-0 ml-2 gap-1.5 ${nextAction.cls}`}
                  >
                    <nextAction.icon className="w-3.5 h-3.5" />
                    {nextAction.label}
                  </Button>
                ) : contract.status === "activated" ? (
                  <Button size="sm" disabled className="shrink-0 ml-2 gap-1.5 bg-emerald-600 text-white">
                    <Check className="w-3.5 h-3.5" /> Activated
                  </Button>
                ) : null}
              </div>
            </Card>
          );
        })()}

        <Card className="glass-panel border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Contract Information</h2>
            {canEdit && !editInfo && (
              <Button variant="ghost" size="sm" onClick={startEditInfo} className="h-7 text-muted-foreground hover:text-foreground">
                <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
              </Button>
            )}
          </div>

          {editInfo ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="ci-name">Contract Name</Label>
                  <Input id="ci-name" className="bg-muted border-border" value={iName}
                    onChange={(e) => setIName(e.target.value)} placeholder="Auto-generated if blank" />
                </div>
                <div>
                  <Label>Account</Label>
                  <select className="w-full h-10 px-3 rounded-md bg-muted border border-border text-foreground text-sm"
                    value={iAccountId} onChange={(e) => setIAccountId(e.target.value)}>
                    <option value="">— Select account —</option>
                    {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                <div>
                  <Label htmlFor="ci-start">Start Date</Label>
                  <Input id="ci-start" type="date" className="bg-muted border-border" value={iStartDate}
                    onChange={(e) => setIStartDate(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="ci-term">Term (months)</Label>
                  <Input id="ci-term" type="number" min="1" className="bg-muted border-border" value={iTermMonths}
                    onChange={(e) => setITermMonths(e.target.value)} />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input id="ci-autorenew" type="checkbox" checked={iAutoRenew}
                    onChange={(e) => setIAutoRenew(e.target.checked)} className="h-4 w-4" />
                  <Label htmlFor="ci-autorenew" className="cursor-pointer">Auto-renew</Label>
                </div>
                {iAutoRenew && (
                  <div>
                    <Label htmlFor="ci-renewterm">Renewal Term (months)</Label>
                    <Input id="ci-renewterm" type="number" min="1" className="bg-muted border-border" value={iRenewalTermMonths}
                      onChange={(e) => setIRenewalTermMonths(e.target.value)} />
                  </div>
                )}
              </div>
              <div>
                <Label htmlFor="ci-desc">Description</Label>
                <Input id="ci-desc" className="bg-muted border-border" value={iDescription}
                  onChange={(e) => setIDescription(e.target.value)} placeholder="Contract description..." />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditInfo(false)} className="border-border">Cancel</Button>
                <Button onClick={saveInfo} disabled={updateMutation.isPending} className="bg-primary hover:bg-primary/90 text-foreground">
                  {updateMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <Field label="Account" value={contract.accountId && contract.accountName
                  ? <span className="text-primary cursor-pointer hover:underline" onClick={() => navigate(`/accounts/${contract.accountId}`)}>{contract.accountName}</span>
                  : contract.accountName ?? "—"} />
                <Field label="Owner" value={contract.ownerName ?? "—"} />
                <Field label="Opportunity" value={contract.opportunityId && contract.opportunityName
                  ? <span className="text-primary cursor-pointer hover:underline" onClick={() => navigate(`/opportunities/${contract.opportunityId}`)}>{contract.opportunityName}</span>
                  : contract.opportunityName ?? "—"} />
                <Field label="Start Date" value={contract.startDate ? format(new Date(contract.startDate), "MMM d, yyyy") : "—"} />
                <Field label="End Date" value={contract.endDate ? format(new Date(contract.endDate), "MMM d, yyyy") : "—"} />
                <Field label="Term" value={contract.contractTermMonths ? `${contract.contractTermMonths} months` : "—"} />
                <Field label="Auto-renew" value={contract.autoRenew ? `Yes${contract.renewalTermMonths ? ` (${contract.renewalTermMonths} mo)` : ""}` : "No"} />
                <Field label="Activated" value={contract.activatedAt ? format(new Date(contract.activatedAt), "MMM d, yyyy") : "—"} />
                {contract.status === "terminated" && (
                  <Field label="Terminated" value={contract.terminatedAt ? format(new Date(contract.terminatedAt), "MMM d, yyyy") : "—"} />
                )}
              </div>
              {contract.terminationReason && (
                <div className="mt-4 text-sm">
                  <span className="text-muted-foreground">Termination reason: </span>
                  <span className="text-foreground">{contract.terminationReason}</span>
                </div>
              )}
              {contract.description && (
                <div className="mt-4 text-sm">
                  <span className="text-muted-foreground">Description: </span>
                  <span className="text-foreground">{contract.description}</span>
                </div>
              )}
            </>
          )}
        </Card>

        <Card className="glass-panel border-border overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Contracted Pricing</h2>
            {canEdit && !editPricing && (
              <Button variant="ghost" size="sm" onClick={startEditPricing} className="h-7 text-muted-foreground hover:text-foreground">
                <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
              </Button>
            )}
          </div>

          {editPricing ? (
            <div className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Products</Label>
                <Button type="button" variant="outline" size="sm" onClick={addItem} className="border-border text-xs">
                  <Plus className="w-3 h-3 mr-1" /> Add Product
                </Button>
              </div>
              {pItems.length === 0 ? (
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
                  {pItems.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-muted/50 rounded-lg p-2">
                      <div className="col-span-4">
                        <select className="w-full h-8 px-2 rounded-md bg-muted border border-border text-foreground text-sm"
                          value={item.productId ?? ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "") updateItemAt(idx, { productId: null, productName: "", listPrice: 0, unitPrice: 0 });
                            else pickProduct(idx, parseInt(val));
                          }}>
                          <option value="">Custom / No product</option>
                          {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        {!item.productId && (
                          <Input className="mt-1 h-7 text-xs bg-muted border-border" placeholder="Product name..."
                            value={item.productName} onChange={(e) => updateItemAt(idx, { productName: e.target.value })} />
                        )}
                        {item.productId != null && item.listPrice > 0 && (
                          <p className="mt-1 text-[10px] text-muted-foreground">List: {fmtMoney(item.listPrice)}</p>
                        )}
                      </div>
                      <div className="col-span-2">
                        <Input type="number" min="1" className="h-8 bg-muted border-border text-right text-sm"
                          value={item.quantity} onChange={(e) => updateItemAt(idx, { quantity: parseFloat(e.target.value) || 1 })} />
                      </div>
                      <div className="col-span-2">
                        <Input type="number" min="0" step="0.01" className="h-8 bg-muted border-border text-right text-sm"
                          value={item.unitPrice} onChange={(e) => updateItemAt(idx, { unitPrice: parseFloat(e.target.value) || 0 })} />
                      </div>
                      <div className="col-span-2">
                        <Input type="number" min="0" max="100" className="h-8 bg-muted border-border text-right text-sm"
                          value={item.discount} onChange={(e) => updateItemAt(idx, { discount: parseFloat(e.target.value) || 0 })} />
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
                    <span>{fmtMoney(editSubtotal)}</span>
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" onClick={() => setEditPricing(false)} className="border-border">Cancel</Button>
                <Button onClick={savePricing} disabled={updateMutation.isPending} className="bg-primary hover:bg-primary/90 text-foreground">
                  {updateMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          ) : (
            <>
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs text-muted-foreground font-medium">Product</th>
                    <th className="px-4 py-2 text-right text-xs text-muted-foreground font-medium">Qty</th>
                    <th className="px-4 py-2 text-right text-xs text-muted-foreground font-medium">List Price</th>
                    <th className="px-4 py-2 text-right text-xs text-muted-foreground font-medium">Contract Price</th>
                    <th className="px-4 py-2 text-right text-xs text-muted-foreground font-medium">Disc %</th>
                    <th className="px-4 py-2 text-right text-xs text-muted-foreground font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">No contracted products</td></tr>
                  ) : items.map((it, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-2 text-foreground">{it.productName}</td>
                      <td className="px-4 py-2 text-right text-muted-foreground">{it.quantity}</td>
                      <td className="px-4 py-2 text-right text-muted-foreground">{fmtMoney(it.listPrice)}</td>
                      <td className="px-4 py-2 text-right font-medium text-foreground">{fmtMoney(it.unitPrice)}</td>
                      <td className="px-4 py-2 text-right text-muted-foreground">{it.discount}%</td>
                      <td className="px-4 py-2 text-right font-medium">{fmtMoney(it.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-5 py-3 border-t border-border flex justify-end">
                <div className="text-sm space-y-1 w-56">
                  <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>{fmtMoney(contract.subtotal)}</span></div>
                  {contract.discount > 0 && <div className="flex justify-between text-muted-foreground"><span>Discount ({contract.discount}%)</span><span>-{fmtMoney(contract.subtotal * contract.discount / 100)}</span></div>}
                  {contract.tax > 0 && <div className="flex justify-between text-muted-foreground"><span>Tax ({contract.tax}%)</span><span>{fmtMoney(contract.subtotal * (1 - contract.discount / 100) * contract.tax / 100)}</span></div>}
                  <div className="flex justify-between font-bold text-foreground text-base border-t border-border pt-1 mt-1"><span>Total</span><span>{fmtMoney(contract.total)}</span></div>
                </div>
              </div>
            </>
          )}
        </Card>

        <Card className="glass-panel border-border p-5">
          <div className="flex items-center gap-2 mb-2">
            <History className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Document Revisions</h2>
          </div>
          <ContractRevisions contractId={id} heading={false} />
        </Card>
          </div>

          <aside className="lg:sticky lg:top-4 self-start min-w-0">
            <EntityNotes entity="contract" entityId={id} />
          </aside>
        </div>
      </div>

      <AlertDialog open={terminateOpen} onOpenChange={(v) => { setTerminateOpen(v); if (!v) setTerminateReason(""); }}>
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

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
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

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-foreground">{value}</p>
    </div>
  );
}
