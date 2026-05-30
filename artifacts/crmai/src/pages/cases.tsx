import React, { useState } from "react";
import { useColResize } from "@/hooks/use-col-resize";
import { ColResizeHandle } from "@/components/col-resize-handle";
import {
  useListCases, useCreateCase, useUpdateCase, useDeleteCase,
  getListCasesQueryKey,
  CreateCaseInputStatus, CreateCaseInputPriority,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { ListPageHeader } from "@/components/list-page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { LifeBuoy, Plus, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useColumnVisibility } from "@/hooks/use-column-visibility";
import { ColumnsMenu } from "@/components/columns-menu";
import { usePagination } from "@/hooks/use-pagination";
import { TablePagination } from "@/components/table-pagination";

const CASE_TOGGLEABLE_COLS = [
  { key: "caseNumber" as const, label: "Case #" },
  { key: "subject" as const, label: "Subject" },
  { key: "priority" as const, label: "Priority" },
  { key: "status" as const, label: "Status" },
  { key: "opened" as const, label: "Opened" },
];

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-blue-50 text-blue-700 border-blue-200",
  medium: "bg-yellow-50 text-yellow-700 border-yellow-200",
  high: "bg-orange-50 text-orange-700 border-orange-200",
  critical: "bg-red-50 text-red-700 border-red-200",
};

const STATUS_COLORS: Record<string, string> = {
  open: "bg-blue-50 text-blue-700 border-blue-200",
  in_progress: "bg-yellow-50 text-yellow-700 border-yellow-200",
  resolved: "bg-green-50 text-green-700 border-green-200",
  closed: "bg-gray-100 text-gray-600 border-gray-200",
};

interface CaseFormData {
  subject: string;
  description: string;
  priority: string;
  status: string;
  type: string;
}

const defaultFormData: CaseFormData = {
  subject: "", description: "", priority: "medium", status: "open", type: "question",
};

const CASES_COL_KEYS = ["caseNumber","subject","priority","status","opened","actions"] as const;
const CASES_COL_DEFAULTS: Record<typeof CASES_COL_KEYS[number], number> = {"caseNumber":110,"subject":280,"priority":110,"status":110,"opened":130,"actions":120};

export default function Cases() {
  const { widths: colWidths, startResize: startColResize } = useColResize("col-widths:cases:v1", CASES_COL_KEYS, CASES_COL_DEFAULTS);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCase, setEditingCase] = useState<{ id: number } & CaseFormData | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const { data, isLoading } = useListCases({ limit: 50 });
  const [search, setSearch] = useState("");
  const allCases = data?.data ?? [];
  const caseQuery = search.trim().toLowerCase();
  const filteredCases = caseQuery
    ? allCases.filter((c) => Object.values(c).some((v) => typeof v === "string" && v.toLowerCase().includes(caseQuery)))
    : allCases;
  const casesPagination = usePagination("cases", filteredCases);
  const colVis = useColumnVisibility<"caseNumber" | "subject" | "priority" | "status" | "opened">("col-visibility:cases:v1", CASE_TOGGLEABLE_COLS);
  const caseColSpan = colVis.visible.size + 1;

  return (
    <Layout>
      <div className="flex flex-col gap-3">
        <ListPageHeader
          icon={LifeBuoy}
          title="Support Cases"
          viewLabel="All Cases"
          search={{ value: search, onChange: setSearch, placeholder: "Search cases..." }}
          aiEntityType="cases"
          onNew={() => setIsCreateOpen(true)}
          newLabel="New Case"
        />

        <Card className="glass-panel border-0 overflow-hidden">
          <div className="px-3 py-1 border-b border-border bg-muted/20 flex items-center justify-end">
            <TablePagination
              variant="inline"
              page={casesPagination.page}
              totalPages={casesPagination.totalPages}
              pageSize={casesPagination.pageSize}
              total={casesPagination.total}
              pageStart={casesPagination.pageStart}
              pageEnd={casesPagination.pageEnd}
              onPageChange={casesPagination.setPage}
              onPageSizeChange={casesPagination.setPageSize}
            />
            <ColumnsMenu columns={CASE_TOGGLEABLE_COLS} isVisible={colVis.isVisible} toggle={colVis.toggle} showAll={colVis.showAll} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left [&_tbody_td]:whitespace-nowrap">
              <colgroup>
                {colVis.isVisible("caseNumber") && <col data-col="caseNumber" style={{ width: `${colWidths.caseNumber}px` }} />}
                {colVis.isVisible("subject") && <col data-col="subject" style={{ width: `${colWidths.subject}px` }} />}
                {colVis.isVisible("priority") && <col data-col="priority" style={{ width: `${colWidths.priority}px` }} />}
                {colVis.isVisible("status") && <col data-col="status" style={{ width: `${colWidths.status}px` }} />}
                {colVis.isVisible("opened") && <col data-col="opened" style={{ width: `${colWidths.opened}px` }} />}
                <col data-col="actions" style={{ width: `${colWidths.actions}px` }} />
              </colgroup>
              <thead className="sticky top-0 z-10">
                <tr className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800 border-b border-blue-800 divide-x divide-blue-500/40">
                  {colVis.isVisible("caseNumber") && <th className="relative px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-white leading-tight whitespace-nowrap">Case #<ColResizeHandle onMouseDown={startColResize("caseNumber")} /></th>}
                  {colVis.isVisible("subject") && <th className="relative px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-white leading-tight whitespace-nowrap">Subject<ColResizeHandle onMouseDown={startColResize("subject")} /></th>}
                  {colVis.isVisible("priority") && <th className="relative px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-white leading-tight whitespace-nowrap">Priority<ColResizeHandle onMouseDown={startColResize("priority")} /></th>}
                  {colVis.isVisible("status") && <th className="relative px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-white leading-tight whitespace-nowrap">Status<ColResizeHandle onMouseDown={startColResize("status")} /></th>}
                  {colVis.isVisible("opened") && <th className="relative px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-white leading-tight whitespace-nowrap">Opened<ColResizeHandle onMouseDown={startColResize("opened")} /></th>}
                  <th className="relative px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-white leading-tight whitespace-nowrap text-right">Actions<ColResizeHandle onMouseDown={startColResize("actions")} /></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr><td colSpan={caseColSpan} className="px-6 py-8 text-center text-muted-foreground">Loading...</td></tr>
                ) : data?.data?.length === 0 ? (
                  <tr><td colSpan={caseColSpan} className="px-6 py-8 text-center text-muted-foreground">No cases found.</td></tr>
                ) : (
                  casesPagination.paged.map((c) => (
                    <tr key={c.id} className="hover:bg-muted/50 transition-colors group">
                      {colVis.isVisible("caseNumber") && (
                        <td className="px-3 py-1 font-mono text-xs text-muted-foreground">{c.caseNumber}</td>
                      )}
                      {colVis.isVisible("subject") && (
                        <td className="px-3 py-1">
                          <div className="font-medium text-foreground">{c.subject}</div>
                        </td>
                      )}
                      {colVis.isVisible("priority") && (
                        <td className="px-3 py-1">
                          <Badge variant="outline" className={`capitalize ${PRIORITY_COLORS[c.priority] ?? ""}`}>
                            {c.priority}
                          </Badge>
                        </td>
                      )}
                      {colVis.isVisible("status") && (
                        <td className="px-3 py-1">
                          <Badge variant="outline" className={`capitalize ${STATUS_COLORS[c.status] ?? "bg-muted border-border text-muted-foreground"}`}>
                            {c.status.replace("_", " ")}
                          </Badge>
                        </td>
                      )}
                      {colVis.isVisible("opened") && (
                        <td className="px-3 py-1 text-muted-foreground">
                          {format(new Date(c.createdAt), "MMM d, yyyy")}
                        </td>
                      )}
                      <td className="px-3 py-1 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-card border-border text-foreground">
                            <DropdownMenuItem
                              onClick={() => setEditingCase({
                                id: c.id,
                                subject: c.subject,
                                description: c.description ?? "",
                                priority: c.priority,
                                status: c.status,
                                type: c.type ?? "question",
                              })}
                              className="cursor-pointer hover:bg-muted"
                            >
                              <Pencil className="w-4 h-4 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-muted" />
                            <DropdownMenuItem
                              onClick={() => setDeletingId(c.id)}
                              className="cursor-pointer text-destructive hover:bg-destructive/10 focus:text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <CaseFormDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} mode="create" />
      <CaseFormDialog
        open={!!editingCase}
        onOpenChange={(o) => { if (!o) setEditingCase(null); }}
        mode="edit"
        initialData={editingCase ?? undefined}
      />
      <AlertDialog open={deletingId !== null} onOpenChange={(o) => { if (!o) setDeletingId(null); }}>
        <AlertDialogContent className="bg-card border-border text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Case?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border text-foreground hover:bg-muted">Cancel</AlertDialogCancel>
            <DeleteCaseAction id={deletingId} onDone={() => setDeletingId(null)} />
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}

function DeleteCaseAction({ id, onDone }: { id: number | null; onDone: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const deleteMutation = useDeleteCase();
  return (
    <AlertDialogAction
      onClick={() => {
        if (id === null) return;
        deleteMutation.mutate({ id }, {
          onSuccess: () => {
            toast({ title: "Case deleted" });
            queryClient.invalidateQueries({ queryKey: getListCasesQueryKey() });
            onDone();
          },
          onError: () => toast({ title: "Error", description: "Failed to delete case.", variant: "destructive" }),
        });
      }}
      className="bg-destructive hover:bg-destructive/90 text-foreground"
    >
      Delete
    </AlertDialogAction>
  );
}

function CaseFormDialog({
  open, onOpenChange, mode, initialData,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  initialData?: { id: number } & CaseFormData;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createMutation = useCreateCase();
  const updateMutation = useUpdateCase();
  const [formData, setFormData] = useState<CaseFormData>(initialData ?? defaultFormData);

  React.useEffect(() => {
    if (open) setFormData(initialData ?? defaultFormData);
  }, [open, initialData]);

  const f = (field: keyof CaseFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setFormData({ ...formData, [field]: e.target.value });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      status: formData.status as CreateCaseInputStatus,
      priority: formData.priority as CreateCaseInputPriority,
    };
    const invalidate = () => queryClient.invalidateQueries({ queryKey: getListCasesQueryKey() });
    if (mode === "create") {
      createMutation.mutate({ data: payload }, {
        onSuccess: () => { toast({ title: "Case created" }); invalidate(); onOpenChange(false); },
        onError: () => toast({ title: "Error", description: "Failed to create case.", variant: "destructive" }),
      });
    } else if (initialData) {
      updateMutation.mutate({ id: initialData.id, data: payload }, {
        onSuccess: () => { toast({ title: "Case updated" }); invalidate(); onOpenChange(false); },
        onError: () => toast({ title: "Error", description: "Failed to update case.", variant: "destructive" }),
      });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border text-foreground sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {mode === "create" ? "New Support Case" : "Edit Case"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Subject *</Label>
            <Input required className="bg-muted border-border" value={formData.subject} onChange={f("subject")} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <select className="w-full bg-muted border border-border rounded-md px-3 py-1 text-foreground text-sm" value={formData.type} onChange={f("type")}>
                <option value="question">Question</option>
                <option value="bug">Bug</option>
                <option value="feature_request">Feature Request</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <select className="w-full bg-muted border border-border rounded-md px-3 py-1 text-foreground text-sm" value={formData.priority} onChange={f("priority")}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <select className="w-full bg-muted border border-border rounded-md px-3 py-1 text-foreground text-sm" value={formData.status} onChange={f("status")}>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <textarea
              className="w-full bg-muted border border-border rounded-md px-3 py-1 text-foreground text-sm resize-none"
              rows={4}
              value={formData.description}
              onChange={f("description")}
              placeholder="Describe the issue..."
            />
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="border-border">Cancel</Button>
            <Button type="submit" disabled={isPending} className="bg-primary hover:bg-primary/90 text-foreground">
              {isPending ? "Saving..." : mode === "create" ? "Create Case" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
