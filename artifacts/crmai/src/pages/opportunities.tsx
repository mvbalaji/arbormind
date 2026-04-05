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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, DollarSign, Calendar, ExternalLink } from "lucide-react";
import { Link } from "wouter";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import type { DropResult } from "@hello-pangea/dnd";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const STAGES = [
  { id: "prospecting", label: "Prospecting", color: "border-blue-500/50 bg-blue-50 text-blue-700" },
  { id: "qualification", label: "Qualification", color: "border-indigo-500/50 bg-indigo-50 text-indigo-700" },
  { id: "proposal", label: "Proposal", color: "border-purple-500/50 bg-purple-50 text-purple-700" },
  { id: "negotiation", label: "Negotiation", color: "border-orange-500/50 bg-orange-50 text-orange-700" },
  { id: "closed_won", label: "Closed Won", color: "border-green-500/50 bg-green-50 text-green-700" },
  { id: "closed_lost", label: "Closed Lost", color: "border-red-500/50 bg-red-50 text-red-700" },
];

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

export default function Opportunities() {
  const { data, isLoading } = useListOpportunities({ limit: 100 });
  const updateMutation = useUpdateOpportunity();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [columns, setColumns] = useState<Record<string, Opportunity[]>>({});

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

  return (
    <Layout>
      <div className="flex flex-col h-[calc(100vh-8rem)]">
        <div className="flex justify-between items-center mb-6 shrink-0">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground tracking-tight">Pipeline</h1>
            <p className="text-muted-foreground mt-1 text-sm">Drag and drop deals across stages.</p>
          </div>
          <Button
            onClick={() => setIsCreateOpen(true)}
            className="bg-gradient-to-r from-primary to-accent text-white shadow-lg shadow-primary/20"
          >
            <Plus className="w-4 h-4 mr-2" /> New Deal
          </Button>
        </div>

        {isLoading ? (
          <div className="flex gap-4 h-full overflow-hidden">
            {STAGES.map((s) => (
              <div key={s.id} className="w-80 shrink-0 bg-card/50 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="flex-1 overflow-x-auto pb-4 custom-scrollbar">
            <DragDropContext onDragEnd={onDragEnd}>
              <div className="flex gap-4 h-full items-start">
                {STAGES.map((stage) => {
                  const items = columns[stage.id] ?? [];
                  const totalValue = items.reduce((sum, item) => sum + (item.amount ?? 0), 0);

                  return (
                    <div key={stage.id} className="w-[320px] shrink-0 flex flex-col h-full bg-card/30 rounded-2xl border border-border overflow-hidden">
                      <div className="p-4 border-b border-border bg-muted flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${stage.color.split(" ")[0].replace("border-", "bg-")}`} />
                          <h3 className="font-semibold text-foreground">{stage.label}</h3>
                          <span className="text-xs font-medium text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
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
                            className={`flex-1 p-3 overflow-y-auto custom-scrollbar flex flex-col gap-3 transition-colors ${snapshot.isDraggingOver ? "bg-muted/50" : ""}`}
                          >
                            {items.map((opp, index) => (
                              <Draggable key={opp.id} draggableId={opp.id.toString()} index={index}>
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    className={`bg-card rounded-xl p-4 border transition-all ${
                                      snapshot.isDragging
                                        ? "border-primary shadow-xl shadow-primary/20 scale-105 z-50"
                                        : "border-border hover:border-white/20 hover:shadow-lg"
                                    }`}
                                  >
                                    <Link href={`/opportunities/${opp.id}`}>
                                      <div className="font-medium text-white mb-1 hover:text-primary transition-colors flex items-center gap-1 group/opp cursor-pointer">
                                        {opp.name}
                                        <ExternalLink className="w-3 h-3 opacity-0 group-hover/opp:opacity-60 transition-opacity shrink-0" />
                                      </div>
                                    </Link>
                                    <div className="text-xs text-muted-foreground mb-3">
                                      {opp.accountName ?? "No Account"}
                                    </div>
                                    <div className="flex justify-between items-center mt-auto pt-3 border-t border-border">
                                      <div className="flex items-center text-primary font-semibold text-sm">
                                        <DollarSign className="w-3.5 h-3.5 mr-0.5" />
                                        {opp.amount?.toLocaleString() ?? "0"}
                                      </div>
                                      <div className="flex items-center text-xs text-muted-foreground">
                                        <Calendar className="w-3 h-3 mr-1" />
                                        {opp.closeDate ? format(new Date(opp.closeDate), "MMM d") : "-"}
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
        toast({ title: "Deal created!", description: `${form.name} added to ${form.stage} stage.` });
        queryClient.invalidateQueries({ queryKey: getListOpportunitiesQueryKey() });
        onOpenChange(false);
      },
      onError: () => toast({ title: "Error", description: "Failed to create deal.", variant: "destructive" }),
    });
  };

  const selectClass = "w-full bg-muted border border-border rounded-md px-3 py-2 text-white text-sm";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border text-white sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">New Deal</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Deal Name *</Label>
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
              className="w-full bg-muted border border-border rounded-md px-3 py-2 text-white text-sm resize-none h-16"
              value={form.description}
              onChange={f("description")}
              placeholder="Deal context, next steps..."
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="border-border">Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending} className="bg-gradient-to-r from-primary to-accent text-foreground">
              {createMutation.isPending ? "Creating..." : "Create Deal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
