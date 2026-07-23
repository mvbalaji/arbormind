import React, { useState, useEffect } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  useGetContract, useActivateContract, useTerminateContract, useRenewContract, useDeleteContract,
  useSubmitContractForApproval, useUpdateContract, useListProducts, useListAccounts,
  useListContacts, useListOpportunities, useListContractDocuments, useCreateContractDocument,
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
import { StagePipeline } from "@/components/stage-pipeline";
import { ArrowLeft, CheckCircle, XCircle, RefreshCw, Trash2, FileSignature, Send, History, Pencil, Check, Plus, X, Package, Edit3, UserCheck, GitBranch, PenTool, RotateCcw, FolderOpen, Download, Eye, Sparkles, GitCompare } from "lucide-react";
import { format } from "date-fns";
import { useCurrency } from "@/context/currency";
import { useToast } from "@/hooks/use-toast";
import { CONTRACT_STATUS_COLORS, contractStatusLabel } from "./contracts";
import { ContractRevisions } from "@/components/contract-revisions";
import { EntityNotes } from "@/components/entity-notes";

const API = "/api";

const CLM_TABS = [
  { id: "overview",   label: "Overview",   icon: FileSignature },
  { id: "documents",  label: "Documents",  icon: FolderOpen },
  { id: "authoring",  label: "Authoring",  icon: Edit3 },
  { id: "review",     label: "Review",     icon: UserCheck },
  { id: "signing",    label: "Signing",    icon: PenTool },
  { id: "renewal",    label: "Renewal",    icon: RotateCcw },
] as const;

type ClmTab = typeof CLM_TABS[number]["id"];

function CLMField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-foreground text-sm">{value ?? "—"}</p>
    </div>
  );
}

// â”€â”€â”€ Documents Tab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function DocumentsTab({ contractId }: { contractId: number }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: docsData } = useListContractDocuments(contractId);
  const docs = (docsData as unknown as { data?: unknown[] })?.data ?? (Array.isArray(docsData) ? docsData : []) as Record<string, unknown>[];
  const createDocMutation = useCreateContractDocument();
  const [addOpen, setAddOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<Record<string, unknown> | null>(null);
  const [redlineData, setRedlineData] = useState<{doc: Record<string,unknown>; prev: Record<string,unknown>} | null>(null);
  const [form, setForm] = useState({ title: "", content: "", changeSummary: "" });

  const generateDocument = async () => {
    setGenerating(true);
    try {
      const res = await fetch(`${API}/contracts/${contractId}/generate-document`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as Record<string, string>).error ?? "Failed");
      }
      toast({ title: "Document generated", description: "Contract document created from current contract data." });
      queryClient.invalidateQueries({ queryKey: getListContractDocumentsQueryKey(contractId) });
    } catch (e: unknown) {
      toast({ title: "Error", description: (e as Error).message ?? "Could not generate document.", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const save = async () => {
    if (!form.content.trim()) { toast({ title: "Content required", variant: "destructive" }); return; }
    try {
      await createDocMutation.mutateAsync({ id: contractId, data: { title: form.title || null, content: form.content, changeSummary: form.changeSummary || null } });
      toast({ title: "Document saved" });
      queryClient.invalidateQueries({ queryKey: getListContractDocumentsQueryKey(contractId) });
      setForm({ title: "", content: "", changeSummary: "" });
      setAddOpen(false);
    } catch {
      toast({ title: "Error", description: "Could not save document.", variant: "destructive" });
    }
  };

  const openDoc = (doc: Record<string, unknown>) => {
    const title = (doc.title as string) || "Contract Document";
    const version = doc.version as number;
    // Convert plain-text contract to styled HTML sections
    const raw = doc.content as string;
    const escaped = raw.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
    // Highlight section headings like "1. PARTIES" and rule lines
    const htmlBody = escaped
      .replace(/^(â•+)$/gm, '<hr style="border:2px solid #1a1a1a;margin:12px 0">')
      .replace(/^(â”€+)$/gm, '<hr style="border:0.5px solid #aaa;margin:4px 0">')
      .replace(/^(\d+)\. ([A-Z &\/\(\)]+)$/gm, (_,n,t) => `<div class="sec-heading"><span class="sec-num">${n}.</span> ${t}</div>`)
      .replace(/^   ([A-Z][A-Za-z &\/]+)$/gm, (_,t) => `<div class="sub-heading">${t}</div>`)
      .replace(/\n/g, "<br>");
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title} v${version}</title>
<style>
  *{box-sizing:border-box}
  body{font-family:"Segoe UI",Arial,sans-serif;max-width:900px;margin:0 auto;padding:40px 48px 80px;color:#1a1a1a;line-height:1.75;font-size:13.5px;background:#fff}
  .cover{text-align:center;margin-bottom:32px}
  .doc-title{font-size:24px;font-weight:800;letter-spacing:3px;margin:16px 0 8px}
  .sec-heading{font-size:13.5px;font-weight:700;letter-spacing:1px;margin:20px 0 6px;padding:6px 0 4px;border-bottom:1.5px solid #333;color:#111}
  .sub-heading{font-weight:600;margin:10px 0 2px;color:#333}
  pre,code{font-family:"Courier New",monospace;font-size:12px;background:#f5f5f5;padding:10px 12px;border-radius:4px;overflow-x:auto;white-space:pre-wrap;word-break:break-word}
  .meta{font-size:11px;color:#666;margin-bottom:24px;padding-bottom:8px;border-bottom:1px solid #ddd}
  @media print{
    body{padding:20px 32px}
    .no-print{display:none}
    .sec-heading{break-after:avoid}
  }
</style></head><body>
<div class="no-print" style="background:#f0f4ff;border:1px solid #c7d7f9;border-radius:6px;padding:10px 16px;margin-bottom:24px;font-size:12px;display:flex;align-items:center;justify-content:space-between">
  <span>ðŸ“„ <strong>${title}</strong> &nbsp;Â·&nbsp; Version ${version}${doc.createdAt ? " &nbsp;Â·&nbsp; " + new Date(doc.createdAt as string).toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"}) : ""}${doc.createdByName ? " &nbsp;Â·&nbsp; by " + doc.createdByName : ""}</span>
  <button onclick="window.print()" style="background:#2563eb;color:#fff;border:none;border-radius:4px;padding:4px 14px;cursor:pointer;font-size:12px">Print / Save PDF</button>
</div>
<div>${htmlBody}</div>
</body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 15000);
  };

  // â”€â”€ Redline: LCS diff â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const computeRedlineSections = (oldText: string, newText: string) => {
    const a = oldText.split("\n");
    const b = newText.split("\n");
    const m = a.length, n = b.length;
    // Build LCS table (limit size to avoid freeze on huge docs)
    const MAX = 800;
    const am = Math.min(m, MAX), bn = Math.min(n, MAX);
    const dp: Uint16Array[] = Array.from({length: am+1}, () => new Uint16Array(bn+1));
    for (let i = 1; i <= am; i++)
      for (let j = 1; j <= bn; j++)
        dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1]+1 : Math.max(dp[i-1][j], dp[i][j-1]);
    // Back-trace
    type Op = {type:"equal"|"del"|"ins"; line:string};
    const ops: Op[] = [];
    let i = am, j = bn;
    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && a[i-1] === b[j-1]) { ops.unshift({type:"equal", line:a[i-1]}); i--; j--; }
      else if (j > 0 && (i === 0 || dp[i][j-1] >= dp[i-1][j])) { ops.unshift({type:"ins", line:b[j-1]}); j--; }
      else { ops.unshift({type:"del", line:a[i-1]}); i--; }
    }
    // Append any remaining lines beyond MAX as equal (unchanged)
    for (let k = am; k < m; k++) ops.push({type:"equal", line:a[k]});
    // Group consecutive del+ins as "change" for inline word diff
    type Grp = {type:"equal"|"del"|"ins"|"change"; line?:string; del?:string; ins?:string};
    const grouped: Grp[] = [];
    let q = 0;
    while (q < ops.length) {
      if (ops[q].type === "del" && q+1 < ops.length && ops[q+1].type === "ins") {
        grouped.push({type:"change", del:ops[q].line, ins:ops[q+1].line});
        q += 2;
      } else {
        grouped.push(ops[q] as Grp);
        q++;
      }
    }
    return grouped;
  };

  const inlineWordDiff = (oldLine: string, newLine: string): React.ReactNode[] => {
    const aw = oldLine.split(/(\s+)/), bw = newLine.split(/(\s+)/);
    const m = aw.length, n = bw.length;
    const dp: Uint16Array[] = Array.from({length:m+1},()=>new Uint16Array(n+1));
    for (let i=1;i<=m;i++) for (let j=1;j<=n;j++)
      dp[i][j] = aw[i-1]===bw[j-1] ? dp[i-1][j-1]+1 : Math.max(dp[i-1][j],dp[i][j-1]);
    type WOp = {type:"equal"|"del"|"ins"; w:string};
    const wops: WOp[] = [];
    let i=m, j=n;
    while (i>0||j>0) {
      if (i>0&&j>0&&aw[i-1]===bw[j-1]) { wops.unshift({type:"equal",w:aw[i-1]}); i--;j--; }
      else if (j>0&&(i===0||dp[i][j-1]>=dp[i-1][j])) { wops.unshift({type:"ins",w:bw[j-1]}); j--; }
      else { wops.unshift({type:"del",w:aw[i-1]}); i--; }
    }
    return wops.map((op, idx) => {
      if (op.type==="equal") return <span key={idx}>{op.w}</span>;
      if (op.type==="ins")   return <span key={idx} style={{background:"#bbf7d0",color:"#14532d",borderRadius:2,padding:"0 1px",fontWeight:600}}>{op.w}</span>;
      return <span key={idx} style={{background:"#fecaca",color:"#7f1d1d",textDecoration:"line-through",borderRadius:2,padding:"0 1px"}}>{op.w}</span>;
    });
  };

  const openRedline = (doc: Record<string, unknown>, prevDoc: Record<string, unknown>) => {
    setRedlineData({doc, prev: prevDoc});
  };

  const downloadDoc = (doc: Record<string, unknown>) => {
    const title = (doc.title as string) || "contract-document";
    const content = doc.content as string;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
<style>body{font-family:"Segoe UI",Arial,sans-serif;max-width:820px;margin:40px auto;padding:0 32px 80px;color:#1a1a1a;line-height:1.7;font-size:14px}pre{white-space:pre-wrap;word-break:break-word;font-family:inherit}@media print{body{margin:0;padding:20px}}</style>
<script>window.onload=function(){window.print();}<\/script></head><body><pre>${content.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}</pre></body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title}-v${doc.version as number}.html`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  return (
    <Card className="glass-panel border-border p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">Contract Documents</h3>
        <div className="flex gap-2">
          <Button size="sm" onClick={generateDocument} disabled={generating} className="h-7 gap-1 bg-primary text-primary-foreground hover:bg-primary/90">
            <Sparkles className="w-3 h-3" /> {generating ? "Generating…" : "Generate Document"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setAddOpen(true)} className="h-7 border-border gap-1">
            <Plus className="w-3 h-3" /> Add Manually
          </Button>
        </div>
      </div>

      {/* Generate prompt when no docs */}
      {(docs as Record<string, unknown>[]).length === 0 && !addOpen && (
        <div className="mb-4 p-4 rounded-lg border border-dashed border-primary/40 bg-primary/5 flex items-center gap-4">
          <Sparkles className="w-8 h-8 text-primary opacity-70 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Auto-generate a contract document</p>
            <p className="text-xs text-muted-foreground mt-0.5">Click <strong>Generate Document</strong> to create a formatted contract from the account, contact, line items, and terms already on this contract.</p>
          </div>
          <Button size="sm" onClick={generateDocument} disabled={generating} className="flex-shrink-0 gap-1">
            <Sparkles className="w-3 h-3" /> {generating ? "Generating…" : "Generate"}
          </Button>
        </div>
      )}

      {/* Add form */}
      {addOpen && (
        <div className="mb-4 p-4 border border-border rounded-lg space-y-3 bg-muted/20">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Document Title</Label>
              <Input className="h-8 mt-1 text-sm" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Signed Agreement" />
            </div>
            <div>
              <Label className="text-xs">Change Summary</Label>
              <Input className="h-8 mt-1 text-sm" value={form.changeSummary} onChange={e => setForm(f => ({ ...f, changeSummary: e.target.value }))} placeholder="e.g. Initial version" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Document Content</Label>
            <textarea
              className="w-full mt-1 text-sm border border-border rounded-md p-2 bg-background text-foreground resize-y min-h-[120px] focus:outline-none focus:ring-1 focus:ring-primary"
              value={form.content}
              onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              placeholder="Paste or type the contract document text here..."
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={save} disabled={createDocMutation.isPending}>Save Document</Button>
          </div>
        </div>
      )}

      {/* Document list */}
      {(docs as Record<string, unknown>[]).length > 0 && (
        <div className="space-y-2">
          {(docs as Record<string, unknown>[]).map((doc) => (
            <div key={doc.id as number} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border border-border">
              <FolderOpen className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              {(() => {
                const prev = (docs as Record<string, unknown>[]).find(d => (d.version as number) === (doc.version as number) - 1);
                const hasRedline = (doc.version as number) > 1 && !!prev;
                return (
                  <>
                    <div className={`flex-1 min-w-0 ${!doc.isActive ? "opacity-50" : ""}`}>
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Title: clicking opens redline if available, else clean view */}
                        <button
                          onClick={() => hasRedline ? openRedline(doc, prev!) : openDoc(doc)}
                          className={`text-sm font-medium hover:underline truncate text-left cursor-pointer ${doc.isActive ? "text-primary" : "text-muted-foreground"}`}
                          title={hasRedline ? "View with redline changes" : "View document"}
                        >
                          {(doc.title as string) || "Untitled Document"}
                        </button>
                        <Badge variant="outline" className="text-[10px] flex-shrink-0">v{doc.version as number}</Badge>
                        {doc.isActive
                          ? <Badge className="text-[10px] flex-shrink-0 bg-green-600 text-white border-0">Active</Badge>
                          : <Badge variant="outline" className="text-[10px] flex-shrink-0 text-muted-foreground border-muted-foreground/30">Superseded</Badge>
                        }
                        {hasRedline && (
                          <Badge variant="outline" className="text-[10px] flex-shrink-0 text-amber-700 border-amber-400 gap-0.5">
                            <GitCompare className="w-2.5 h-2.5" /> Redlined
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        {doc.changeSummary && <span className="text-xs text-muted-foreground italic truncate">{doc.changeSummary as string}</span>}
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          {doc.createdAt ? format(new Date(doc.createdAt as string), "MMM d, yyyy") : ""}
                          {doc.createdByName ? ` Â· ${doc.createdByName}` : ""}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      {hasRedline ? (
                        <>
                          <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs text-amber-700 hover:bg-amber-50" onClick={() => openRedline(doc, prev!)} title="View with redline highlights">
                            <GitCompare className="w-3.5 h-3.5" /> Redline
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={() => openDoc(doc)} title="View clean document">
                            <Eye className="w-3.5 h-3.5" /> Clean
                          </Button>
                        </>
                      ) : (
                        <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={() => openDoc(doc)} title="View document">
                          <Eye className="w-3.5 h-3.5" /> View
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => downloadDoc(doc)} title="Download" disabled={!doc.isActive as boolean}>
                        <Download className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </>
                );
              })()}
            </div>
          ))}
        </div>
      )}

      {/* Preview modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setPreviewDoc(null)}>
          <div className="bg-background border border-border rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div>
                <h3 className="font-semibold text-foreground">{(previewDoc.title as string) || "Untitled Document"}</h3>
                <p className="text-xs text-muted-foreground">Version {previewDoc.version as number} Â· {previewDoc.createdAt ? format(new Date(previewDoc.createdAt as string), "MMM d, yyyy") : ""}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => openDoc(previewDoc)} className="gap-1 h-7">
                  <Eye className="w-3.5 h-3.5" /> Open in Tab
                </Button>
                <Button variant="outline" size="sm" onClick={() => downloadDoc(previewDoc)} className="gap-1 h-7">
                  <Download className="w-3.5 h-3.5" /> Download
                </Button>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setPreviewDoc(null)}><X className="w-4 h-4" /></Button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <pre className="text-sm text-foreground whitespace-pre-wrap font-mono leading-relaxed">{previewDoc.content as string}</pre>
            </div>
          </div>
        </div>
      )}

      {/* Redline modal */}
      {redlineData && (() => {
        const { doc: rd, prev: pd } = redlineData;
        const sections = computeRedlineSections(pd.content as string, rd.content as string);
        const changedCount = sections.filter(s => s.type !== "equal").length;
        return (
          <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setRedlineData(null)}>
            <div className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
                <div>
                  <div className="flex items-center gap-2">
                    <GitCompare className="w-4 h-4 text-amber-600" />
                    <h3 className="font-semibold text-foreground">Redline — v{pd.version as number} → v{rd.version as number}</h3>
                    <Badge variant="outline" className="text-[10px] text-amber-700 border-amber-400">{changedCount} change{changedCount !== 1 ? "s" : ""}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{(rd.title as string) || "Contract Document"}</p>
                </div>
                <div className="flex items-center gap-2">
                  {/* Legend */}
                  <div className="flex gap-2 text-[10px] mr-2 hidden sm:flex">
                    <span className="px-2 py-0.5 rounded" style={{background:"#bbf7d0",color:"#14532d"}}>Added</span>
                    <span className="px-2 py-0.5 rounded" style={{background:"#fecaca",color:"#7f1d1d",textDecoration:"line-through"}}>Removed</span>
                    <span className="px-2 py-0.5 rounded" style={{background:"#fef3c7",color:"#92400e"}}>Modified</span>
                  </div>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setRedlineData(null)}><X className="w-4 h-4" /></Button>
                </div>
              </div>
              {/* Diff content */}
              <div className="flex-1 overflow-y-auto p-4 font-mono text-xs leading-6">
                {sections.map((s, idx) => {
                  if (s.type === "equal") {
                    const line = s.line ?? "";
                    // Section headings
                    if (/^\d+\.\s[A-Z]/.test(line.trim()))
                      return <div key={idx} className="font-bold text-sm py-1 mt-3 border-b border-border text-foreground">{line}</div>;
                    if (/^[â•]{4,}$/.test(line))
                      return <hr key={idx} className="border-foreground/40 my-2" />;
                    if (/^[â”€]{4,}$/.test(line))
                      return <hr key={idx} className="border-border my-1" />;
                    return <div key={idx} className="text-foreground/80 whitespace-pre-wrap">{line || "Â "}</div>;
                  }
                  if (s.type === "del")
                    return <div key={idx} className="whitespace-pre-wrap line-through" style={{background:"#fef2f2",color:"#991b1b",borderLeft:"3px solid #ef4444",paddingLeft:8,marginBottom:1}}>âˆ’ {s.line}</div>;
                  if (s.type === "ins")
                    return <div key={idx} className="whitespace-pre-wrap font-medium" style={{background:"#f0fdf4",color:"#15803d",borderLeft:"3px solid #22c55e",paddingLeft:8,marginBottom:1}}>+ {s.line}</div>;
                  // change — inline word diff
                  return (
                    <div key={idx} className="whitespace-pre-wrap" style={{background:"#fffbeb",borderLeft:"3px solid #f59e0b",paddingLeft:8,marginBottom:1}}>
                      ~ {inlineWordDiff(s.del ?? "", s.ins ?? "")}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}
    </Card>
  );
}

// â”€â”€â”€ Authoring Tab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function AuthoringTab({ contractId }: { contractId: number }) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [clmData, setClmData] = useState<Record<string, unknown>>({});

  // Fetch contract data directly on mount (bypasses typed orval hook)
  useEffect(() => {
    fetch(`${API}/contracts/${contractId}`)
      .then((r) => r.json())
      .then((d) => setClmData(d))
      .catch(() => {});
  }, [contractId]);

  const FIELDS: { key: string; label: string; options?: string[] }[] = [
    { key: "contract_type", label: "Contract Type", options: ["MSA", "NDA", "SOW", "Order Form", "Amendment", "SLA", "License Agreement"] },
    { key: "territory", label: "Territory / Region" },
    { key: "business_unit", label: "Business Unit" },
    { key: "priority", label: "Priority", options: ["Low", "Medium", "High", "Critical"] },
    { key: "governing_law", label: "Governing Law", options: ["California", "Delaware", "New York", "Texas", "UK", "Singapore", "Other"] },
    { key: "payment_terms", label: "Payment Terms", options: ["Net 15", "Net 30", "Net 45", "Net 60", "Net 90", "Upfront", "Monthly"] },
    { key: "ip_ownership", label: "IP Ownership", options: ["Customer Owns", "Vendor Owns", "Jointly Owned", "Work-for-Hire"] },
    { key: "liability_cap_multiplier", label: "Liability Cap (Ã— TCV)" },
    { key: "confidentiality_period_years", label: "Confidentiality Period (years)" },
    { key: "termination_notice_days", label: "Termination Notice (days)" },
    { key: "counterparty_company", label: "Counterparty Company" },
    { key: "counterparty_signer_name", label: "Counterparty Signer Name" },
    { key: "counterparty_signer_email", label: "Counterparty Signer Email" },
    { key: "counterparty_signer_title", label: "Counterparty Signer Title" },
    { key: "counterparty_address", label: "Counterparty Address" },
  ];

  // snake_case field key → camelCase contract property name
  const KEY_MAP: Record<string, string> = {
    contract_type: "contractType", territory: "territory", business_unit: "businessUnit",
    priority: "priority", governing_law: "governingLaw", payment_terms: "paymentTerms",
    ip_ownership: "ipOwnership", liability_cap_multiplier: "liabilityCapMultiplier",
    confidentiality_period_years: "confidentialityPeriodYears",
    termination_notice_days: "terminationNoticeDays",
    counterparty_company: "counterpartyCompany", counterparty_signer_name: "counterpartySignerName",
    counterparty_signer_email: "counterpartySignerEmail", counterparty_signer_title: "counterpartySignerTitle",
    counterparty_address: "counterpartyAddress",
  };

  const startEdit = () => {
    const f: Record<string, string> = {};
    for (const field of FIELDS) {
      const camel = KEY_MAP[field.key] ?? field.key;
      f[field.key] = (clmData[camel] as string) ?? "";
    }
    setForm(f); setEditing(true);
  };

  const save = async () => {
    const payload: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(form)) payload[KEY_MAP[k] ?? k] = v || null;
    const resp = await fetch(`${API}/contracts/${contractId}/clm`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    if (!resp.ok) {
      const errText = await resp.text();
      toast({ title: `Save failed (${resp.status}): ${errText.slice(0, 80)}`, variant: "destructive" });
      return;
    }
    // Server returns the updated row in snake_case — re-fetch in camelCase
    const updated = await fetch(`${API}/contracts/${contractId}`).then((r) => r.json());
    setClmData(updated);
    toast({ title: "Contract terms updated" }); setEditing(false);
  };

  return (
    <Card className="glass-panel border-border p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">Contract Terms &amp; Authoring (UC-002)</h3>
        {!editing && (
          <Button variant="ghost" size="sm" onClick={startEdit} className="h-7 text-muted-foreground hover:text-foreground">
            <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
          </Button>
        )}
      </div>
      {editing ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {FIELDS.map((f) => (
              <div key={f.key}>
                <Label className="text-xs">{f.label}</Label>
                {f.options ? (
                  <select className="w-full h-9 px-3 rounded-md bg-muted border border-border text-foreground text-sm mt-1"
                    value={form[f.key] ?? ""} onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}>
                    <option value="">— Select —</option>
                    {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <Input className="bg-muted border-border mt-1 h-9 text-sm" value={form[f.key] ?? ""}
                    onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))} />
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={save} className="bg-primary hover:bg-primary/90 text-foreground">Save</Button>
            <Button variant="outline" onClick={() => setEditing(false)} className="border-border">Cancel</Button>
          </div>
        </>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {FIELDS.map((f) => {
            const camel = KEY_MAP[f.key] ?? f.key;
            return <CLMField key={f.key} label={f.label} value={(clmData[camel] as string) ?? null} />;
          })}
        </div>
      )}
    </Card>
  );
}

// â”€â”€â”€ Review Tab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function ReviewTab({ contractId }: { contractId: number }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [newStage, setNewStage] = useState("legal");
  const [newDue, setNewDue] = useState("");

  const { data: reviews = [] } = useQuery({
    queryKey: ["clm-reviews", contractId],
    queryFn: () => fetch(`${API}/clm/reviews?contractId=${contractId}`).then((r) => r.json()).then((d) => Array.isArray(d) ? d : (d?.data ?? [])),
  });

  const addReview = async () => {
    await fetch(`${API}/clm/reviews`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contractId, stage: newStage, dueDate: newDue || null }),
    });
    queryClient.invalidateQueries({ queryKey: ["clm-reviews", contractId] });
    toast({ title: "Review stage added" });
    setAddOpen(false); setNewStage("legal"); setNewDue("");
  };

  const decide = async (id: number, decision: string) => {
    await fetch(`${API}/clm/reviews/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "completed", decision, decisionDate: new Date().toISOString().slice(0, 10) }),
    });
    queryClient.invalidateQueries({ queryKey: ["clm-reviews", contractId] });
    toast({ title: `Review ${decision}` });
  };

  const STAGE_COLOR: Record<string, string> = {
    legal: "bg-purple-500/15 text-purple-600 border-purple-300",
    finance: "bg-blue-500/15 text-blue-600 border-blue-300",
    executive: "bg-amber-500/15 text-amber-600 border-amber-300",
    compliance: "bg-green-500/15 text-green-600 border-green-300",
    technical: "bg-rose-500/15 text-rose-600 border-rose-300",
  };

  return (
    <Card className="glass-panel border-border p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">Internal Review &amp; Approval (UC-003)</h3>
        <Button variant="outline" size="sm" onClick={() => setAddOpen(true)} className="h-7 border-border gap-1">
          <Plus className="w-3 h-3" /> Add Review Stage
        </Button>
      </div>
      {(reviews as Record<string, unknown>[]).length === 0 && !addOpen ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          <UserCheck className="w-8 h-8 mx-auto mb-2 opacity-30" />
          No review stages assigned yet.
        </div>
      ) : (
        <div className="space-y-3">
          {(reviews as Record<string, unknown>[]).map((r) => (
            <div key={r.id as number} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border border-border">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className={`text-[10px] ${STAGE_COLOR[r.stage as string] ?? ""}`}>{r.stage as string}</Badge>
                  <span className="text-sm text-foreground">{(r.reviewer_name as string) ?? "Unassigned"}</span>
                  {r.due_date != null && <span className="text-xs text-muted-foreground">Due {format(new Date(r.due_date as string), "MMM d")}</span>}
                </div>
                {r.notes != null && <p className="text-xs text-muted-foreground mt-1 italic">{r.notes as string}</p>}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {r.status === "completed" ? (
                  <Badge variant="outline" className={r.decision === "approved" ? "text-green-600 border-green-300" : "text-red-600 border-red-300"}>
                    {r.decision as string}
                  </Badge>
                ) : (
                  <>
                    <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white" onClick={() => decide(r.id as number, "approved")}>Approve</Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs border-red-300 text-red-600 hover:bg-red-50" onClick={() => decide(r.id as number, "rejected")}>Reject</Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {addOpen && (
        <div className="mt-4 p-4 border border-dashed border-border rounded-lg">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <Label className="text-xs">Review Stage</Label>
              <select className="w-full h-9 px-2 rounded-md bg-muted border border-border text-foreground text-sm mt-1"
                value={newStage} onChange={(e) => setNewStage(e.target.value)}>
                {["legal", "finance", "executive", "compliance", "technical"].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs">Due Date</Label>
              <Input type="date" className="bg-muted border-border mt-1 h-9 text-sm" value={newDue} onChange={(e) => setNewDue(e.target.value)} />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={addReview} className="bg-primary hover:bg-primary/90 text-foreground">Add Stage</Button>
            <Button size="sm" variant="outline" onClick={() => setAddOpen(false)} className="border-border">Cancel</Button>
          </div>
        </div>
      )}
    </Card>
  );
}

// â”€â”€â”€ Redlining Tab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function RedliningTab({ contract, contractId }: { contract: Record<string, unknown>; contractId: number }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ section: "", originalText: "", proposedText: "", changeType: "modification", party: "counterparty", notes: "" });

  const { data: redlines = [] } = useQuery({
    queryKey: ["clm-redlines", contractId],
    queryFn: () => fetch(`${API}/clm/redlines?contractId=${contractId}`).then((r) => r.json()).then((d) => Array.isArray(d) ? d : (d?.data ?? [])),
  });

  const addRedline = async () => {
    const round = (contract.redline_round as number) ?? 1;
    await fetch(`${API}/clm/redlines`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contractId, round, ...form }),
    });
    queryClient.invalidateQueries({ queryKey: ["clm-redlines", contractId] });
    toast({ title: "Redline added" }); setAddOpen(false);
    setForm({ section: "", originalText: "", proposedText: "", changeType: "modification", party: "counterparty", notes: "" });
  };

  const updateStatus = async (id: number, status: string) => {
    await fetch(`${API}/clm/redlines/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }),
    });
    queryClient.invalidateQueries({ queryKey: ["clm-redlines", contractId] });
    toast({ title: `Redline ${status}` });
  };

  const STATUS_COLOR: Record<string, string> = {
    open: "bg-amber-500/15 text-amber-600 border-amber-300",
    accepted: "bg-green-500/15 text-green-700 border-green-300",
    rejected: "bg-red-500/15 text-red-600 border-red-300",
  };

  return (
    <Card className="glass-panel border-border p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">Redlining &amp; Negotiation (UC-004)</h3>
          <Badge variant="outline" className="text-xs">Round {(contract.redline_round as number) ?? 0}</Badge>
          {contract.risk_score != null && (
            <Badge variant="outline" className={`text-xs ${(contract.risk_score as number) >= 70 ? "text-red-600 border-red-300" : (contract.risk_score as number) >= 40 ? "text-amber-600 border-amber-300" : "text-green-600 border-green-300"}`}>
              Risk {contract.risk_score as number}/100
            </Badge>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={() => setAddOpen(true)} className="h-7 border-border gap-1">
          <Plus className="w-3 h-3" /> Add Redline
        </Button>
      </div>
      {(redlines as Record<string, unknown>[]).length === 0 && !addOpen ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          <GitBranch className="w-8 h-8 mx-auto mb-2 opacity-30" /> No redlines tracked yet.
        </div>
      ) : (
        <div className="space-y-3">
          {(redlines as Record<string, unknown>[]).map((r) => (
            <div key={r.id as number} className="p-3 bg-muted/30 rounded-lg border border-border">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className={`text-[10px] ${STATUS_COLOR[r.status as string] ?? ""}`}>{r.status as string}</Badge>
                  <span className="text-xs text-muted-foreground">Rd {r.round as number} Â· {r.party as string} Â· {r.change_type as string}</span>
                  {r.section != null && <span className="text-xs font-medium text-foreground">Â§ {r.section as string}</span>}
                </div>
                {r.status === "open" && (
                  <div className="flex gap-1">
                    <Button size="sm" className="h-6 text-[10px] bg-green-600 hover:bg-green-700 text-white px-2" onClick={() => updateStatus(r.id as number, "accepted")}>Accept</Button>
                    <Button size="sm" variant="outline" className="h-6 text-[10px] border-red-300 text-red-600 px-2" onClick={() => updateStatus(r.id as number, "rejected")}>Reject</Button>
                  </div>
                )}
              </div>
              {r.original_text != null && <div className="text-xs bg-red-500/5 border border-red-500/20 rounded p-2 mb-1 line-through text-muted-foreground">{r.original_text as string}</div>}
              {r.proposed_text != null && <div className="text-xs bg-green-500/5 border border-green-500/20 rounded p-2">{r.proposed_text as string}</div>}
              {r.notes != null && <p className="text-xs text-muted-foreground mt-1.5 italic">{r.notes as string}</p>}
            </div>
          ))}
        </div>
      )}
      {addOpen && (
        <div className="mt-4 p-4 border border-dashed border-border rounded-lg space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Section / Clause</Label>
              <Input className="bg-muted border-border mt-1 h-9 text-sm" value={form.section} onChange={(e) => setForm((p) => ({ ...p, section: e.target.value }))} placeholder="e.g. Â§4.2 Liability" />
            </div>
            <div>
              <Label className="text-xs">Change Type</Label>
              <select className="w-full h-9 px-2 rounded-md bg-muted border border-border text-foreground text-sm mt-1"
                value={form.changeType} onChange={(e) => setForm((p) => ({ ...p, changeType: e.target.value }))}>
                {["modification", "deletion", "addition"].map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs">Party</Label>
              <select className="w-full h-9 px-2 rounded-md bg-muted border border-border text-foreground text-sm mt-1"
                value={form.party} onChange={(e) => setForm((p) => ({ ...p, party: e.target.value }))}>
                {["counterparty", "internal"].map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Original Text</Label>
              <textarea className="w-full h-20 px-2 py-1.5 rounded-md bg-muted border border-border text-foreground text-xs mt-1 resize-y"
                value={form.originalText} onChange={(e) => setForm((p) => ({ ...p, originalText: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Proposed Text</Label>
              <textarea className="w-full h-20 px-2 py-1.5 rounded-md bg-muted border border-border text-foreground text-xs mt-1 resize-y"
                value={form.proposedText} onChange={(e) => setForm((p) => ({ ...p, proposedText: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={addRedline} className="bg-primary hover:bg-primary/90 text-foreground">Add</Button>
            <Button size="sm" variant="outline" onClick={() => setAddOpen(false)} className="border-border">Cancel</Button>
          </div>
        </div>
      )}
    </Card>
  );
}

// â”€â”€â”€ Signing Tab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function SigningTab({ contract, contractId }: { contract: Record<string, unknown>; contractId: number }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [sForm, setSForm] = useState({ name: "", email: "", title: "", role: "signer", party: "counterparty", signingOrder: "1" });
  const [provider, setProvider] = useState((contract.signing_provider as string) ?? "");
  const [deadline, setDeadline] = useState((contract.signing_deadline as string)?.slice(0, 10) ?? "");
  const [sigOrder, setSigOrder] = useState((contract.signing_order as string) ?? "Sequential");

  const { data: signers = [] } = useQuery({
    queryKey: ["clm-signers", contractId],
    queryFn: () => fetch(`${API}/clm/signers?contractId=${contractId}`).then((r) => r.json()).then((d) => Array.isArray(d) ? d : (d?.data ?? [])),
  });

  const saveConfig = async () => {
    await fetch(`${API}/contracts/${contractId}/clm`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signingProvider: provider || null, signingDeadline: deadline || null, signingOrder: sigOrder }),
    });
    queryClient.invalidateQueries({ queryKey: getGetContractQueryKey(contractId) });
    toast({ title: "Signing configuration saved" });
  };

  const addSigner = async () => {
    await fetch(`${API}/clm/signers`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contractId, ...sForm, signingOrder: parseInt(sForm.signingOrder) }),
    });
    queryClient.invalidateQueries({ queryKey: ["clm-signers", contractId] });
    toast({ title: "Signer added" }); setAddOpen(false);
    setSForm({ name: "", email: "", title: "", role: "signer", party: "counterparty", signingOrder: "1" });
  };

  const removeSigner = async (id: number) => {
    await fetch(`${API}/clm/signers/${id}`, { method: "DELETE" });
    queryClient.invalidateQueries({ queryKey: ["clm-signers", contractId] });
    toast({ title: "Signer removed" });
  };

  return (
    <Card className="glass-panel border-border p-5">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground mb-4">E-Signature Workflow (UC-009)</h3>
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div>
          <Label className="text-xs">Signing Provider</Label>
          <select className="w-full h-9 px-2 rounded-md bg-muted border border-border text-foreground text-sm mt-1"
            value={provider} onChange={(e) => setProvider(e.target.value)}>
            <option value="">— Select —</option>
            {["DocuSign", "Adobe Sign", "HelloSign", "SignNow", "PandaDoc"].map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <Label className="text-xs">Signing Order</Label>
          <select className="w-full h-9 px-2 rounded-md bg-muted border border-border text-foreground text-sm mt-1"
            value={sigOrder} onChange={(e) => setSigOrder(e.target.value)}>
            {["Sequential", "Parallel", "Custom"].map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <div>
          <Label className="text-xs">Signing Deadline</Label>
          <Input type="date" className="bg-muted border-border mt-1 h-9 text-sm" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        </div>
      </div>
      <Button size="sm" onClick={saveConfig} className="bg-primary hover:bg-primary/90 text-foreground mb-5">Save Config</Button>

      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Signers</h4>
        <Button variant="outline" size="sm" onClick={() => setAddOpen(true)} className="h-7 border-border gap-1">
          <Plus className="w-3 h-3" /> Add Signer
        </Button>
      </div>

      {(signers as Record<string, unknown>[]).length === 0 && !addOpen ? (
        <div className="text-center py-6 text-muted-foreground text-sm">
          <PenTool className="w-7 h-7 mx-auto mb-2 opacity-30" /> No signers configured yet.
        </div>
      ) : (
        <div className="space-y-2 mb-4">
          {(signers as Record<string, unknown>[]).map((s) => (
            <div key={s.id as number} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border border-border">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                {(s.name as string)?.[0]?.toUpperCase() ?? "?"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-foreground">{s.name as string}</span>
                  <Badge variant="outline" className="text-[10px]">{s.party as string}</Badge>
                  <Badge variant="outline" className="text-[10px]">#{s.signing_order as number}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{s.email as string}{s.title ? ` Â· ${s.title}` : ""}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={`text-[10px] ${(s.status as string) === "completed" ? "text-green-600 border-green-300" : ""}`}>{s.status as string}</Badge>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-600" onClick={() => removeSigner(s.id as number)}>
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {addOpen && (
        <div className="p-4 border border-dashed border-border rounded-lg space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div><Label className="text-xs">Name *</Label><Input className="bg-muted border-border mt-1 h-9 text-sm" value={sForm.name} onChange={(e) => setSForm((p) => ({ ...p, name: e.target.value }))} /></div>
            <div><Label className="text-xs">Email *</Label><Input type="email" className="bg-muted border-border mt-1 h-9 text-sm" value={sForm.email} onChange={(e) => setSForm((p) => ({ ...p, email: e.target.value }))} /></div>
            <div><Label className="text-xs">Title</Label><Input className="bg-muted border-border mt-1 h-9 text-sm" value={sForm.title} onChange={(e) => setSForm((p) => ({ ...p, title: e.target.value }))} /></div>
            <div>
              <Label className="text-xs">Role</Label>
              <select className="w-full h-9 px-2 rounded-md bg-muted border border-border text-foreground text-sm mt-1" value={sForm.role} onChange={(e) => setSForm((p) => ({ ...p, role: e.target.value }))}>
                {["signer", "cc", "approver"].map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs">Party</Label>
              <select className="w-full h-9 px-2 rounded-md bg-muted border border-border text-foreground text-sm mt-1" value={sForm.party} onChange={(e) => setSForm((p) => ({ ...p, party: e.target.value }))}>
                {["counterparty", "internal"].map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div><Label className="text-xs">Order</Label><Input type="number" min="1" className="bg-muted border-border mt-1 h-9 text-sm" value={sForm.signingOrder} onChange={(e) => setSForm((p) => ({ ...p, signingOrder: e.target.value }))} /></div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={addSigner} disabled={!sForm.name || !sForm.email} className="bg-primary hover:bg-primary/90 text-foreground">Add Signer</Button>
            <Button size="sm" variant="outline" onClick={() => setAddOpen(false)} className="border-border">Cancel</Button>
          </div>
        </div>
      )}
    </Card>
  );
}

// â”€â”€â”€ Renewal Tab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function RenewalTab({ contract, contractId }: { contract: Record<string, unknown>; contractId: number }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { format: fmtMoney } = useCurrency();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    renewalStatus: (contract.renewal_status as string) ?? "",
    renewalWindowDays: (contract.renewal_window_days as number)?.toString() ?? "90",
    arrAtRisk: (contract.arr_at_risk as number)?.toString() ?? "",
    yearlyEscalationPct: (contract.yearly_escalation_pct as number)?.toString() ?? "",
    minimumAnnualCommit: (contract.minimum_annual_commit as number)?.toString() ?? "",
  });

  const save = async () => {
    await fetch(`${API}/contracts/${contractId}/clm`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        renewalStatus: form.renewalStatus || null,
        renewalWindowDays: form.renewalWindowDays ? parseInt(form.renewalWindowDays) : null,
        arrAtRisk: form.arrAtRisk ? parseFloat(form.arrAtRisk) : null,
        yearlyEscalationPct: form.yearlyEscalationPct ? parseFloat(form.yearlyEscalationPct) : null,
        minimumAnnualCommit: form.minimumAnnualCommit ? parseFloat(form.minimumAnnualCommit) : null,
      }),
    });
    queryClient.invalidateQueries({ queryKey: getGetContractQueryKey(contractId) });
    toast({ title: "Renewal terms updated" }); setEditing(false);
  };

  const RENEWAL_COLOR: Record<string, string> = {
    pending: "text-yellow-600", in_review: "text-blue-600", approved: "text-green-700",
    declined: "text-red-600", negotiating: "text-purple-600", renewed: "text-emerald-700",
  };

  return (
    <Card className="glass-panel border-border p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">Renewal Management (UC-011)</h3>
        {!editing && (
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)} className="h-7 text-muted-foreground hover:text-foreground">
            <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
          </Button>
        )}
      </div>
      {editing ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs">Renewal Status</Label>
              <select className="w-full h-9 px-2 rounded-md bg-muted border border-border text-foreground text-sm mt-1"
                value={form.renewalStatus} onChange={(e) => setForm((p) => ({ ...p, renewalStatus: e.target.value }))}>
                <option value="">— Not Set —</option>
                {["pending", "in_review", "approved", "declined", "negotiating", "renewed"].map((s) => (
                  <option key={s} value={s}>{s.replace("_", " ")}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">Renewal Window (days before expiry)</Label>
              <Input type="number" min="0" className="bg-muted border-border mt-1 h-9 text-sm" value={form.renewalWindowDays} onChange={(e) => setForm((p) => ({ ...p, renewalWindowDays: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">ARR at Risk ($)</Label>
              <Input type="number" min="0" className="bg-muted border-border mt-1 h-9 text-sm" value={form.arrAtRisk} onChange={(e) => setForm((p) => ({ ...p, arrAtRisk: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Yearly Escalation (%)</Label>
              <Input type="number" min="0" step="0.1" className="bg-muted border-border mt-1 h-9 text-sm" value={form.yearlyEscalationPct} onChange={(e) => setForm((p) => ({ ...p, yearlyEscalationPct: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Minimum Annual Commit ($)</Label>
              <Input type="number" min="0" className="bg-muted border-border mt-1 h-9 text-sm" value={form.minimumAnnualCommit} onChange={(e) => setForm((p) => ({ ...p, minimumAnnualCommit: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={save} className="bg-primary hover:bg-primary/90 text-foreground">Save</Button>
            <Button variant="outline" onClick={() => setEditing(false)} className="border-border">Cancel</Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Renewal Status</p>
            {contract.renewal_status
              ? <span className={`text-sm font-medium ${RENEWAL_COLOR[contract.renewal_status as string] ?? ""}`}>{(contract.renewal_status as string).replace("_", " ")}</span>
              : <p className="text-foreground text-sm">—</p>}
          </div>
          <CLMField label="Renewal Window" value={contract.renewal_window_days ? `${contract.renewal_window_days} days` : null} />
          <CLMField label="ARR at Risk" value={contract.arr_at_risk ? fmtMoney(contract.arr_at_risk as number) : null} />
          <CLMField label="Yearly Escalation" value={contract.yearly_escalation_pct ? `${contract.yearly_escalation_pct}%` : null} />
          <CLMField label="Minimum Annual Commit" value={contract.minimum_annual_commit ? fmtMoney(contract.minimum_annual_commit as number) : null} />
          <CLMField label="Auto-Renew" value={(contract as Record<string, unknown>).autoRenew ? `Yes (${(contract as Record<string, unknown>).renewalTermMonths ?? "?"}mo)` : "No"} />
        </div>
      )}
    </Card>
  );
}

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
  const [clmTab, setClmTab] = useState<ClmTab>("overview");
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
  const { data: contactsData } = useListContacts({ limit: 500 });
  const { data: oppsData } = useListOpportunities({ limit: 200 });
  const products = productsData?.data ?? [];
  const accounts = accountsData?.data ?? [];
  const contacts = contactsData?.data ?? [];
  const opportunities = oppsData?.data ?? [];

  // Per-section inline editing state.
  const [editInfo, setEditInfo] = useState(false);
  const [editPricing, setEditPricing] = useState(false);
  const [iName, setIName] = useState("");
  const [iAccountId, setIAccountId] = useState("");
  const [iContactId, setIContactId] = useState("");
  const [iOpportunityId, setIOpportunityId] = useState("");
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
    setIContactId(contract.contactId != null ? String(contract.contactId) : "");
    setIOpportunityId(contract.opportunityId != null ? String(contract.opportunityId) : "");
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
        contactId: iContactId ? parseInt(iContactId) : null,
        opportunityId: iOpportunityId ? parseInt(iOpportunityId) : null,
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
          const currentTone =
            contract.status === "terminated" ? "red" as const :
            contract.status === "expired" ? "amber" as const :
            "blue" as const;

          const stageDate = (stageId: string): Date | null => {
            if (stageId === "draft" && contract.createdAt) return new Date(contract.createdAt);
            if (stageId === "activated" && contract.activatedAt) return new Date(contract.activatedAt);
            return null;
          };

          const advance =
            contract.status === "draft"
              ? { label: "Submit for Approval", icon: Send, onClick: handleSubmitForApproval, disabled: submitMutation.isPending, tone: "blue" as const }
              : contract.status === "in_approval"
              ? { label: "Activate", icon: CheckCircle, onClick: handleActivate, disabled: activateMutation.isPending, tone: "emerald" as const }
              : contract.status === "activated"
              ? { label: "Activated", icon: Check, onClick: () => {}, disabled: true, tone: "emerald" as const }
              : null;

          return (
            <Card className="glass-panel border-border p-5">
              <h2 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wide">Lifecycle Stage</h2>
              <StagePipeline
                ariaLabel="Contract lifecycle stage"
                stages={stages.map((s) => ({ ...s, enteredAt: stageDate(s.id) }))}
                currentId={contract.status}
                currentTone={currentTone}
                advance={advance}
              />
            </Card>
          );
        })()}

        {/* CLM Tab Bar */}
        <div className="flex gap-0 border-b border-border overflow-x-auto">
          {CLM_TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setClmTab(id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                clmTab === id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        {/* CLM Tab Content */}
        {clmTab === "documents" && <DocumentsTab contractId={id} />}
        {clmTab === "authoring" && <AuthoringTab contractId={id} />}
        {clmTab === "review" && <ReviewTab contractId={id} />}
        {clmTab === "signing" && <SigningTab contract={contract as unknown as Record<string, unknown>} contractId={id} />}
        {clmTab === "renewal" && <RenewalTab contract={contract as unknown as Record<string, unknown>} contractId={id} />}

        {clmTab === "overview" && <><Card className="glass-panel border-border p-5">
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
                  <Label>Contact</Label>
                  <select className="w-full h-10 px-3 rounded-md bg-muted border border-border text-foreground text-sm"
                    value={iContactId} onChange={(e) => setIContactId(e.target.value)}>
                    <option value="">— Select contact —</option>
                    {contacts.map((c) => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Opportunity</Label>
                  <select className="w-full h-10 px-3 rounded-md bg-muted border border-border text-foreground text-sm"
                    value={iOpportunityId} onChange={(e) => setIOpportunityId(e.target.value)}>
                    <option value="">— Select opportunity —</option>
                    {opportunities.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
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
                <Field label="Contact" value={contract.contactId && contract.contactName
                  ? <span className="text-primary cursor-pointer hover:underline" onClick={() => navigate(`/contacts/${contract.contactId}`)}>{contract.contactName}</span>
                  : contract.contactName ?? "—"} />
                <Field label="Opportunity" value={contract.opportunityId && contract.opportunityName
                  ? <span className="text-primary cursor-pointer hover:underline" onClick={() => navigate(`/opportunities/${contract.opportunityId}`)}>{contract.opportunityName}</span>
                  : contract.opportunityName ?? "—"} />
                <Field label="Owner" value={contract.ownerName ?? "—"} />
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
        </>}
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

