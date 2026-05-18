import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { FileText, Paperclip, Pencil, Plus, Trash2, X, ExternalLink } from "lucide-react";
import { format } from "date-fns";

type EntityNote = {
  id: number;
  entityType: string;
  entityId: number;
  body: string;
  attachmentName: string | null;
  attachmentUrl: string | null;
  createdBy: number | null;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
};

export function EntityNotes({ entity, entityId }: { entity: string; entityId: number }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const queryKey = ["entity-notes", entity, entityId];

  const { data, isLoading } = useQuery<{ data: EntityNote[] }>({
    queryKey,
    queryFn: async () => {
      const res = await fetch(`/api/notes?entity=${entity}&entityId=${entityId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load notes");
      return res.json();
    },
  });

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [body, setBody] = useState("");
  const [attachmentName, setAttachmentName] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");

  const resetForm = () => {
    setBody(""); setAttachmentName(""); setAttachmentUrl("");
    setShowForm(false); setEditingId(null);
  };

  const createMut = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/notes", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entity, entityId, body, attachmentName, attachmentUrl }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      toast({ title: "Note saved" });
      resetForm();
    },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const updateMut = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/notes/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, attachmentName, attachmentUrl }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      toast({ title: "Note updated" });
      resetForm();
    },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/notes/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      toast({ title: "Note deleted" });
    },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const beginEdit = (n: EntityNote) => {
    setEditingId(n.id);
    setBody(n.body);
    setAttachmentName(n.attachmentName ?? "");
    setAttachmentUrl(n.attachmentUrl ?? "");
    setShowForm(true);
  };

  const submit = () => {
    if (!body.trim() && !attachmentUrl.trim()) {
      toast({ title: "Add a note or an attachment link", variant: "destructive" });
      return;
    }
    if (editingId != null) updateMut.mutate(editingId);
    else createMut.mutate();
  };

  const notes = data?.data ?? [];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Notes & Attachments ({notes.length})</h3>
        </div>
        {!showForm && (
          <Button size="sm" onClick={() => setShowForm(true)} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Add Note
          </Button>
        )}
      </div>

      {showForm && (
        <Card className="border-border p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">{editingId != null ? "Edit note" : "New note"}</div>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={resetForm}><X className="w-4 h-4" /></Button>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Note</Label>
            <Textarea
              rows={3}
              placeholder="Write a note..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="bg-muted border-border text-sm"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Attachment name (optional)</Label>
              <Input
                placeholder="e.g. Proposal.pdf"
                value={attachmentName}
                onChange={(e) => setAttachmentName(e.target.value)}
                className="bg-muted border-border text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Attachment URL (optional)</Label>
              <Input
                placeholder="https://..."
                value={attachmentUrl}
                onChange={(e) => setAttachmentUrl(e.target.value)}
                className="bg-muted border-border text-sm"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={resetForm}>Cancel</Button>
            <Button size="sm" onClick={submit} disabled={createMut.isPending || updateMut.isPending}>
              {editingId != null ? "Save changes" : "Add note"}
            </Button>
          </div>
        </Card>
      )}

      {isLoading ? (
        <div className="text-sm text-muted-foreground py-4">Loading…</div>
      ) : notes.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground border border-dashed border-border rounded-md">
          <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No notes or attachments yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {notes.map((n) => (
            <Card key={n.id} className="border-border p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {n.body && <p className="text-sm whitespace-pre-wrap text-foreground">{n.body}</p>}
                  {n.attachmentUrl && (
                    <a
                      href={n.attachmentUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="mt-2 inline-flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      <Paperclip className="w-3.5 h-3.5" />
                      {n.attachmentName || n.attachmentUrl}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  <div className="mt-2 text-[11px] text-muted-foreground">
                    {n.createdByName ?? "Someone"} · {format(new Date(n.createdAt), "MMM d, yyyy · h:mm a")}
                    {n.updatedAt !== n.createdAt && " · edited"}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => beginEdit(n)} title="Edit">
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600 hover:text-red-700"
                    onClick={() => { if (confirm("Delete this note?")) deleteMut.mutate(n.id); }}
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
