import React, { useState, useEffect } from "react";
import {
  useListOpportunities,
  useUpdateOpportunity,
  useCreateOpportunity,
  useListAccounts,
  useListUsers,
  getListOpportunitiesQueryKey,
} from "@workspace/api-client-react";
import type { Opportunity, UpdateOpportunityInputStage, CreateOpportunityInputStage } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, DollarSign, Calendar, ExternalLink, Briefcase, List, LayoutGrid, ArrowUpDown, User } from "lucide-react";
import { Link } from "wouter";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import type { DropResult } from "@hello-pangea/dnd";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const STAGES = [
  { id: "prospecting", label: "Prospecting", color: "border-blue-500/50 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300" },
  { id: "qualification", label: "Qualification", color: "border-indigo-500/50 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300" },
  { id: "proposal", label: "Proposal", color: "border-purple-500/50 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300" },
  { id: "negotiation", label: "Negotiation", color: "border-orange-500/50 bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300" },
  { id: "closed_won", label: "Closed Won", color: "border-green-500/50 bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300" },
  { id: "closed_lost", label: "Closed Lost", color: "border-red-500/50 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300" },
];

const STAGE_BADGE_COLORS: Record<string, string> = {
  prospecting: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  qualification: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
  proposal: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border-purple-200 dark:border-purple-800",
  negotiation: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300 border-orange-200 dark:border-orange-800",
  closed_won: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300 border-green-200 dark:border-green-800",
  closed_lost: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 border-red-200 dark:border-red-800",
};

const VALID_STAGES = new Set(STAGES.map((s) => s.id));

const STAGE_PROBABILITY: Record<string, number> = {
  prospecting: 10, qualification: 25, proposal: 50,
  negotiation: 75, closed_won: 100, closed_lost: 0,
};

interface NewDealForm {
  name: string;
  accountId: string;
  amount: string;
  stage: string;
  closeDate: string;
  probability: string;
  assignedTo: string;
  description: string;
}

const defaultDealForm: NewDealForm = {
  name: "", accountId: "", amount: "", stage: "prospecting",
  closeDate: "", probability: "10", assignedTo: "", description: "",
};

type ViewMode = "list" | "kanban";

export default function Opportunities() {
  const { data, isLoading } = useListOpportunities({ limit: 200 });
  const updateMutation = useUpdateOpportunity();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [columns, setColumns] = useState<Record<string, Opportunity[]>>({});
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [sortField, setSortField] = useState<string>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    if (data?.data) {
      const cols: Record<string, Opportunity[]> = {};
      STAGES.forEach((s) => (cols[s.id] = []));
      data.data.forEach((opp) => {
        if (cols[opp.stage]) cols[opp.stage].push(opp);
      });
      setColumns(cols);
    }
  }, [data]);

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const { source, destination, draggableId } = result;
    if (source.droppableId === destination.droppableId) return;
    if (!VALID_STAGES.has(destination.droppableId)) return;

    const sourceCol = [...columns[source.droppableId]];
    const destCol = [...columns[destination.droppableId]];
    const itemIndex = sourceCol.findIndex((i) => i.id.toString() === draggableId);
    if (itemIndex === -1) return;
    const [item] = sourceCol.splice(itemIndex, 1);
    const updatedItem: Opportunity = { ...item, stage: destination.droppableId as UpdateOpportunityInputStage };
    destCol.splice(destination.index, 0, updatedItem);

    setColumns({ ...columns, [source.droppableId]: sourceCol, [destination.droppableId]: destCol });

    updateMutation.mutate(
      { id: parseInt(draggableId), data: { stage: destination.droppableId as UpdateOpportunityInputStage } },
      { onSettled: () => queryClient.invalidateQueries({ queryKey: getListOpportunitiesQueryKey() }) }
    );
  };

  const allOpps = data?.data ?? [];
  const sortedOpps = [...allOpps].sort((a, b) => {
    let cmp = 0;
    switch (sortField) {
      case "name": cmp = (a.name ?? "").localeCompare(b.name ?? ""); break;
      case "account": cmp = (a.accountName ?? "").localeCompare(b.accountName ?? ""); break;
      case "amount": cmp = (Number(a.amount) || 0) - (Number(b.amount) || 0); break;
      case "stage": cmp = (a.stage ?? "").localeCompare(b.stage ?? ""); break;
      case "closeDate": cmp = (a.closeDate ? new Date(a.closeDate).getTime() : 0) - (b.closeDate ? new Date(b.closeDate).getTime() : 0); break;
      case "probability": cmp = (a.probability ?? 0) - (b.probability ?? 0); break;
      default: cmp = 0;
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  const toggleSort = (field: string) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  };

  const SortHeader = ({ field, children }: { field: string; children: React.ReactNode }) => (
    <button onClick={() => toggleSort(field)} className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors">
      {children}
      <ArrowUpDown className={cn("w-3 h-3", sortField === field ? "text-primary" : "text-muted-foreground/40")} />
    </button>
  );

  return (
    <Layout>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <Briefcase className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold text-foreground tracking-tight">Opportunities</h1>
              <p className="text-muted-foreground text-sm">
                {viewMode === "kanban" ? "Drag and drop deals across stages" : `${allOpps.length} opportunities`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center border border-border rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode("list")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors",
                  viewMode === "list" ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                <List className="w-3.5 h-3.5" /> List
              </button>
              <button
                onClick={() => setViewMode("kanban")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors",
                  viewMode === "kanban" ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                <LayoutGrid className="w-3.5 h-3.5" /> Kanban
              </button>
            </div>
            <Button
              onClick={() => setIsCreateOpen(true)}
              className="bg-gradient-to-r from-primary to-accent text-white shadow-lg shadow-primary/20"
            >
              <Plus className="w-4 h-4 mr-2" /> New Opportunity
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex gap-4 h-64">
            {STAGES.map((s) => (
              <div key={s.id} className="w-80 shrink-0 bg-card/50 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : viewMode === "list" ? (
          <Card className="border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-4 py-3"><SortHeader field="name">Opportunity Name</SortHeader></th>
                    <th className="text-left px-4 py-3 hidden md:table-cell"><SortHeader field="account">Account</SortHeader></th>
                    <th className="text-left px-4 py-3"><SortHeader field="stage">Stage</SortHeader></th>
                    <th className="text-right px-4 py-3"><SortHeader field="amount">Amount</SortHeader></th>
                    <th className="text-left px-4 py-3 hidden lg:table-cell"><SortHeader field="closeDate">Close Date</SortHeader></th>
                    <th className="text-right px-4 py-3 hidden lg:table-cell"><SortHeader field="probability">Probability</SortHeader></th>
                    <th className="text-left px-4 py-3 hidden xl:table-cell">Owner</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sortedOpps.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-muted-foreground">
                        No opportunities yet. Create your first one!
                      </td>
                    </tr>
                  ) : (
                    sortedOpps.map((opp) => (
                      <tr key={opp.id} className="hover:bg-muted/30 transition-colors group">
                        <td className="px-4 py-3">
                          <Link href={`/opportunities/${opp.id}`}>
                            <span className="font-medium text-foreground hover:text-primary transition-colors cursor-pointer flex items-center gap-1.5">
                              <Briefcase className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                              {opp.name}
                            </span>
                          </Link>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                          {opp.accountName ?? "—"}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={cn("capitalize text-xs", STAGE_BADGE_COLORS[opp.stage] ?? "")}>
                            {STAGES.find(s => s.id === opp.stage)?.label ?? opp.stage}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-foreground">
                          ${(Number(opp.amount) || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">
                          {opp.closeDate ? format(new Date(opp.closeDate), "MMM d, yyyy") : "—"}
                        </td>
                        <td className="px-4 py-3 text-right hidden lg:table-cell">
                          {opp.probability != null ? (
                            <span className={cn(
                              "text-xs font-semibold",
                              opp.probability >= 75 ? "text-green-600" : opp.probability >= 50 ? "text-orange-600" : "text-muted-foreground"
                            )}>
                              {opp.probability}%
                            </span>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-3 hidden xl:table-cell text-muted-foreground text-xs">
                          {opp.assignedToName ?? "Unassigned"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        ) : (
          <div className="flex-1 overflow-x-auto pb-4 custom-scrollbar">
            <DragDropContext onDragEnd={onDragEnd}>
              <div className="flex gap-4 items-start" style={{ minHeight: "calc(100vh - 14rem)" }}>
                {STAGES.map((stage) => {
                  const items = columns[stage.id] ?? [];
                  const totalValue = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

                  return (
                    <div key={stage.id} className="w-[300px] shrink-0 flex flex-col bg-muted/30 rounded-2xl border border-border overflow-hidden" style={{ maxHeight: "calc(100vh - 14rem)" }}>
                      <div className="p-3 border-b border-border bg-muted/50 flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-2">
                          <div className={cn("w-2 h-2 rounded-full", stage.color.split(" ")[0].replace("border-", "bg-"))} />
                          <h3 className="font-semibold text-foreground text-sm">{stage.label}</h3>
                          <span className="text-xs font-medium text-muted-foreground bg-background px-1.5 py-0.5 rounded-full border border-border">
                            {items.length}
                          </span>
                        </div>
                        <div className="text-xs font-medium text-muted-foreground">
                          ${(totalValue / 1000).toFixed(1)}k
                        </div>
                      </div>

                      <Droppable droppableId={stage.id}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={cn(
                              "flex-1 p-2 overflow-y-auto custom-scrollbar flex flex-col gap-2 transition-colors",
                              snapshot.isDraggingOver && "bg-primary/5"
                            )}
                          >
                            {items.map((opp, index) => (
                              <Draggable key={opp.id} draggableId={opp.id.toString()} index={index}>
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    className={cn(
                                      "bg-card rounded-xl p-3 border transition-all",
                                      snapshot.isDragging
                                        ? "border-primary shadow-xl shadow-primary/20 scale-105 z-50"
                                        : "border-border hover:border-primary/30 hover:shadow-md"
                                    )}
                                  >
                                    <Link href={`/opportunities/${opp.id}`}>
                                      <div className="font-medium text-foreground mb-1 hover:text-primary transition-colors flex items-center gap-1 group/opp cursor-pointer text-sm">
                                        {opp.name}
                                        <ExternalLink className="w-3 h-3 opacity-0 group-hover/opp:opacity-60 transition-opacity shrink-0" />
                                      </div>
                                    </Link>
                                    <div className="text-xs text-muted-foreground mb-2">
                                      {opp.accountName ?? "No Account"}
                                    </div>
                                    <div className="flex justify-between items-center mt-auto pt-2 border-t border-border">
                                      <div className="flex items-center text-primary font-semibold text-sm">
                                        <DollarSign className="w-3.5 h-3.5 mr-0.5" />
                                        {(Number(opp.amount) || 0).toLocaleString()}
                                      </div>
                                      <div className="flex items-center text-xs text-muted-foreground">
                                        <Calendar className="w-3 h-3 mr-1" />
                                        {opp.closeDate ? format(new Date(opp.closeDate), "MMM d") : "—"}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </div>
                  );
                })}
              </div>
            </DragDropContext>
          </div>
        )}
      </div>

      <NewDealDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
    </Layout>
  );
}

function NewDealDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [form, setForm] = useState<NewDealForm>(defaultDealForm);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createMutation = useCreateOpportunity();
  const { data: accountsData } = useListAccounts({ limit: 100 });
  const { data: usersData } = useListUsers({ limit: 50 });

  useEffect(() => {
    if (open) setForm(defaultDealForm);
  }, [open]);

  const f = (field: keyof NewDealForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const updated = { ...form, [field]: e.target.value };
      if (field === "stage") {
        updated.probability = String(STAGE_PROBABILITY[e.target.value] ?? 10);
      }
      setForm(updated);
    };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      data: {
        name: form.name,
        accountId: form.accountId ? parseInt(form.accountId) : undefined,
        amount: form.amount ? Number(form.amount) : undefined,
        stage: form.stage as CreateOpportunityInputStage,
        closeDate: form.closeDate || undefined,
        probability: form.probability ? parseInt(form.probability) : undefined,
        assignedTo: form.assignedTo ? parseInt(form.assignedTo) : undefined,
        description: form.description || undefined,
      },
    }, {
      onSuccess: () => {
        toast({ title: "Opportunity created!", description: `${form.name} added to ${form.stage} stage.` });
        queryClient.invalidateQueries({ queryKey: getListOpportunitiesQueryKey() });
        onOpenChange(false);
      },
      onError: () => toast({ title: "Error", description: "Failed to create opportunity.", variant: "destructive" }),
    });
  };

  const selectClass = "w-full bg-muted border border-border rounded-md px-3 py-2 text-foreground text-sm";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border text-foreground sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-primary" />
            New Opportunity
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Opportunity Name *</Label>
            <Input required className="bg-muted border-border" value={form.name} onChange={f("name")} placeholder="e.g. Acme Corp — Enterprise Tier" />
          </div>

          <div className="space-y-2">
            <Label>Account</Label>
            <select className={selectClass} value={form.accountId} onChange={f("accountId")}>
              <option value="">No Account</option>
              {accountsData?.data?.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Stage</Label>
              <select className={selectClass} value={form.stage} onChange={f("stage")}>
                {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Probability (%)</Label>
              <Input type="number" min="0" max="100" className="bg-muted border-border" value={form.probability} onChange={f("probability")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Amount ($)</Label>
              <Input type="number" min="0" className="bg-muted border-border" value={form.amount} onChange={f("amount")} placeholder="0" />
            </div>
            <div className="space-y-2">
              <Label>Close Date</Label>
              <Input type="date" className="bg-muted border-border" value={form.closeDate} onChange={f("closeDate")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Assign To Rep</Label>
            <select className={selectClass} value={form.assignedTo} onChange={f("assignedTo")}>
              <option value="">Unassigned (round-robin)</option>
              {usersData?.data?.map(u => (
                <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <textarea
              className="w-full bg-muted border border-border rounded-md px-3 py-2 text-foreground text-sm resize-none h-16"
              value={form.description}
              onChange={f("description")}
              placeholder="Deal context, next steps..."
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="border-border">Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending} className="bg-gradient-to-r from-primary to-accent text-white">
              {createMutation.isPending ? "Creating..." : "Create Opportunity"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
