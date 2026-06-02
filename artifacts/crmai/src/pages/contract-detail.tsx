import React, { useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import {
  useGetContract, useActivateContract, useTerminateContract, useRenewContract, useDeleteContract,
  getGetContractQueryKey, getListContractsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, CheckCircle, XCircle, RefreshCw, Trash2, FileSignature } from "lucide-react";
import { format } from "date-fns";
import { useCurrency } from "@/context/currency";
import { useToast } from "@/hooks/use-toast";
import { CONTRACT_STATUS_COLORS, contractStatusLabel } from "./contracts";
import { ContractDocumentPanel } from "@/components/contract-document-panel";

export default function ContractDetail() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id);
  const [, navigate] = useLocation();
  const [terminateOpen, setTerminateOpen] = useState(false);
  const [terminateReason, setTerminateReason] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { data: contract, isLoading } = useGetContract(id);
  const activateMutation = useActivateContract();
  const terminateMutation = useTerminateContract();
  const renewMutation = useRenewContract();
  const deleteMutation = useDeleteContract();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { format: fmtMoney } = useCurrency();

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: getGetContractQueryKey(id) });
    queryClient.invalidateQueries({ queryKey: getListContractsQueryKey() });
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

  const items = contract.items ?? [];

  return (
    <Layout>
      <div className="flex flex-col gap-5 max-w-5xl mx-auto">
        <div>
          <Link href="/contracts">
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground mb-3 hover:text-foreground">
              <ArrowLeft className="w-4 h-4" /> Back to Contracts
            </Button>
          </Link>

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

        <Card className="glass-panel border-border p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wide">Contract Information</h2>
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
        </Card>

        <Card className="glass-panel border-border overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Contracted Pricing</h2>
          </div>
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
        </Card>

        <ContractDocumentPanel contractId={id} />
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
