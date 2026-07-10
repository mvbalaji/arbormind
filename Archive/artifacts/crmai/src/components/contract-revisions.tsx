import { useListContractDocuments, type ContractDocument } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { History, FileDown } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { downloadAsPdf, downloadAsWord } from "@/lib/document-export";

export function ContractRevisions({ contractId, heading = true }: { contractId: number; heading?: boolean }) {
  const { data, isLoading } = useListContractDocuments(contractId);
  const { toast } = useToast();
  const docs = [...(data?.data ?? [])].sort((a, b) => b.version - a.version);
  const latestVersion = docs[0]?.version;

  const handleDownload = async (doc: ContractDocument, kind: "pdf" | "word") => {
    const title = doc.title || `Version ${doc.version}`;
    const baseName = `${title}-v${doc.version}`;
    try {
      if (kind === "pdf") downloadAsPdf(title, doc.content, baseName);
      else await downloadAsWord(title, doc.content, baseName);
    } catch {
      toast({ title: "Error", description: `Could not generate the ${kind === "pdf" ? "PDF" : "Word"} file.`, variant: "destructive" });
    }
  };

  return (
    <div className="py-2">
      {heading && (
        <div className="px-1 pb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
          <History className="w-3.5 h-3.5" /> Revisions
        </div>
      )}
      {isLoading ? (
        <div className="px-1 py-3 text-sm text-muted-foreground">Loading revisions…</div>
      ) : docs.length === 0 ? (
        <div className="px-1 py-3 text-sm text-muted-foreground">No document revisions for this contract yet.</div>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {docs.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-3 rounded-md bg-background/60 border border-border px-3 py-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">v{d.version}</span>
                  {d.version === latestVersion && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-green-500/40 text-green-600">Current</Badge>
                  )}
                  {d.title && <span className="text-sm text-foreground truncate">{d.title}</span>}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                  <span>{d.createdAt ? format(new Date(d.createdAt), "MMM d, yyyy h:mm a") : "—"}</span>
                  {d.createdByName && <span>· {d.createdByName}</span>}
                  {d.changeSummary && <span className="italic">· {d.changeSummary}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button variant="outline" size="sm" className="border-border h-7" onClick={() => handleDownload(d, "pdf")}>
                  <FileDown className="w-3.5 h-3.5 mr-1" /> PDF
                </Button>
                <Button variant="outline" size="sm" className="border-border h-7" onClick={() => handleDownload(d, "word")}>
                  <FileDown className="w-3.5 h-3.5 mr-1" /> Word
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
