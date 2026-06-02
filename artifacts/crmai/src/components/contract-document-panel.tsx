import React, { useMemo, useState } from "react";
import { diffWords } from "diff";
import {
  useListContractDocuments,
  useCreateContractDocument,
  getListContractDocumentsQueryKey,
  type ContractDocument,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { FileText, Plus, GitCompare, History } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export function ContractDocumentPanel({ contractId }: { contractId: number }) {
  const { data, isLoading } = useListContractDocuments(contractId);
  const createMutation = useCreateContractDocument();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const docs = useMemo<ContractDocument[]>(
    () => [...(data?.data ?? [])].sort((a, b) => b.version - a.version),
    [data],
  );

  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [showRedline, setShowRedline] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [draftSummary, setDraftSummary] = useState("");

  const latest = docs[0] ?? null;
  const selected = useMemo(
    () => docs.find((d) => d.version === selectedVersion) ?? latest,
    [docs, selectedVersion, latest],
  );
  const previous = useMemo(
    () => (selected ? docs.find((d) => d.version === selected.version - 1) ?? null : null),
    [docs, selected],
  );

  const openEditor = () => {
    setDraftTitle(latest?.title ?? "");
    setDraftContent(latest?.content ?? "");
    setDraftSummary("");
    setEditorOpen(true);
  };

  const handleSave = async () => {
    if (!draftContent.trim()) {
      toast({ title: "Document text is required", variant: "destructive" });
      return;
    }
    try {
      await createMutation.mutateAsync({
        id: contractId,
        data: {
          title: draftTitle.trim() || null,
          content: draftContent,
          changeSummary: draftSummary.trim() || null,
        },
      });
      await queryClient.invalidateQueries({ queryKey: getListContractDocumentsQueryKey(contractId) });
      setEditorOpen(false);
      setSelectedVersion(null);
      setShowRedline(false);
      toast({ title: docs.length === 0 ? "Document captured" : "Revision saved" });
    } catch {
      toast({ title: "Error", description: "Could not save the document revision.", variant: "destructive" });
    }
  };

  return (
    <Card className="glass-panel border-border overflow-hidden">
      <div className="px-5 py-3 border-b border-border flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide flex items-center gap-2">
          <FileText className="w-4 h-4" /> Contract Document
        </h2>
        <div className="flex items-center gap-2">
          {previous && (
            <Button
              variant={showRedline ? "default" : "outline"}
              size="sm"
              onClick={() => setShowRedline((v) => !v)}
              className={showRedline ? "" : "border-border"}
            >
              <GitCompare className="w-4 h-4 mr-1" /> Redline
            </Button>
          )}
          <Button size="sm" onClick={openEditor}>
            <Plus className="w-4 h-4 mr-1" /> {docs.length === 0 ? "Add Document" : "New Revision"}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="px-5 py-10 text-center text-muted-foreground text-sm">Loading…</div>
      ) : docs.length === 0 ? (
        <div className="px-5 py-12 text-center text-muted-foreground text-sm">
          No contract document captured yet. Use “Add Document” to record the agreement text.
        </div>
      ) : (
        <div className="grid md:grid-cols-[200px_1fr]">
          {/* Version history */}
          <div className="border-b md:border-b-0 md:border-r border-border">
            <div className="px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <History className="w-3.5 h-3.5" /> Revisions
            </div>
            <ul className="max-h-[420px] overflow-auto">
              {docs.map((d) => {
                const active = selected?.version === d.version;
                return (
                  <li key={d.id}>
                    <button
                      onClick={() => { setSelectedVersion(d.version); }}
                      className={`w-full text-left px-4 py-2.5 border-l-2 transition-colors ${
                        active ? "border-primary bg-primary/5" : "border-transparent hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">v{d.version}</span>
                        {d.version === latest?.version && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-green-500/40 text-green-600">Current</Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {d.createdAt ? format(new Date(d.createdAt), "MMM d, yyyy h:mm a") : "—"}
                      </div>
                      {d.createdByName && (
                        <div className="text-xs text-muted-foreground">{d.createdByName}</div>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Document body */}
          <div className="p-5 min-w-0">
            {selected && (
              <>
                <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
                  <div>
                    <div className="text-base font-semibold text-foreground">
                      {selected.title || `Version ${selected.version}`}
                    </div>
                    {selected.changeSummary && (
                      <div className="text-xs text-muted-foreground mt-0.5">
                        <span className="font-medium">Change note:</span> {selected.changeSummary}
                      </div>
                    )}
                  </div>
                  {showRedline && previous && (
                    <span className="text-xs text-muted-foreground">
                      Redline: v{previous.version} → v{selected.version}
                    </span>
                  )}
                </div>

                {showRedline && previous ? (
                  <Redline oldText={previous.content} newText={selected.content} />
                ) : (
                  <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed font-mono bg-muted/30 rounded-md p-4 max-h-[420px] overflow-auto">
                    {selected.content}
                  </div>
                )}

                {showRedline && previous && (
                  <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <span className="inline-block w-3 h-3 rounded-sm bg-green-500/30 border border-green-500/50" /> Added
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="inline-block w-3 h-3 rounded-sm bg-red-500/30 border border-red-500/50" /> Removed
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="bg-card border-border max-w-2xl">
          <DialogHeader>
            <DialogTitle>{docs.length === 0 ? "Capture contract document" : `New revision (v${(latest?.version ?? 0) + 1})`}</DialogTitle>
            <DialogDescription>
              {docs.length === 0
                ? "Record the agreement text. Future edits create new versions with full history."
                : "Edit the text below. Saving keeps the prior version and lets you compare changes with redline."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wide">Title (optional)</label>
              <Input
                className="bg-muted border-border mt-1"
                placeholder="e.g. Master Services Agreement"
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wide">Document text</label>
              <Textarea
                className="bg-muted border-border mt-1 font-mono text-sm min-h-[280px]"
                placeholder="Paste or type the contract document text…"
                value={draftContent}
                onChange={(e) => setDraftContent(e.target.value)}
              />
            </div>
            {docs.length > 0 && (
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wide">Change summary (optional)</label>
                <Input
                  className="bg-muted border-border mt-1"
                  placeholder="What changed in this revision?"
                  value={draftSummary}
                  onChange={(e) => setDraftSummary(e.target.value)}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-border" onClick={() => setEditorOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function Redline({ oldText, newText }: { oldText: string; newText: string }) {
  const parts = useMemo(() => diffWords(oldText, newText), [oldText, newText]);
  return (
    <div className="text-sm whitespace-pre-wrap leading-relaxed font-mono bg-muted/30 rounded-md p-4 max-h-[420px] overflow-auto">
      {parts.map((part, i) => {
        if (part.added) {
          return (
            <span key={i} className="bg-green-500/25 text-green-700 dark:text-green-400 rounded-sm">
              {part.value}
            </span>
          );
        }
        if (part.removed) {
          return (
            <span key={i} className="bg-red-500/25 text-red-700 dark:text-red-400 line-through rounded-sm">
              {part.value}
            </span>
          );
        }
        return <span key={i} className="text-foreground">{part.value}</span>;
      })}
    </div>
  );
}
