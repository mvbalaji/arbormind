import React, { useState, useEffect } from "react";
import { useListOpportunities, useUpdateOpportunity, getListOpportunitiesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Plus, Search, DollarSign, Calendar } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { format } from "date-fns";

const STAGES = [
  { id: "prospecting", label: "Prospecting", color: "border-blue-500/50 bg-blue-500/10 text-blue-400" },
  { id: "qualification", label: "Qualification", color: "border-indigo-500/50 bg-indigo-500/10 text-indigo-400" },
  { id: "proposal", label: "Proposal", color: "border-purple-500/50 bg-purple-500/10 text-purple-400" },
  { id: "negotiation", label: "Negotiation", color: "border-orange-500/50 bg-orange-500/10 text-orange-400" },
  { id: "closed_won", label: "Closed Won", color: "border-green-500/50 bg-green-500/10 text-green-400" },
  { id: "closed_lost", label: "Closed Lost", color: "border-red-500/50 bg-red-500/10 text-red-400" },
];

export default function Opportunities() {
  const { data, isLoading } = useListOpportunities({ limit: 100 });
  const mutation = useUpdateOpportunity();
  const queryClient = useQueryClient();
  
  // Local state for optimistic drag and drop
  const [columns, setColumns] = useState<Record<string, any[]>>({});

  useEffect(() => {
    if (data?.data) {
      const cols: Record<string, any[]> = {};
      STAGES.forEach(s => cols[s.id] = []);
      data.data.forEach(opp => {
        if (cols[opp.stage]) cols[opp.stage].push(opp);
      });
      setColumns(cols);
    }
  }, [data]);

  const onDragEnd = (result: any) => {
    if (!result.destination) return;
    const { source, destination, draggableId } = result;
    if (source.droppableId === destination.droppableId) return; // Ignore reordering in same column for now

    // Optimistic update
    const sourceCol = [...columns[source.droppableId]];
    const destCol = [...columns[destination.droppableId]];
    const itemIndex = sourceCol.findIndex(i => i.id.toString() === draggableId);
    const [item] = sourceCol.splice(itemIndex, 1);
    
    item.stage = destination.droppableId;
    destCol.splice(destination.index, 0, item);
    
    setColumns({
      ...columns,
      [source.droppableId]: sourceCol,
      [destination.droppableId]: destCol
    });

    // Mutate
    mutation.mutate({ id: parseInt(draggableId), data: { stage: destination.droppableId as any } }, {
      onSettled: () => queryClient.invalidateQueries({ queryKey: getListOpportunitiesQueryKey() })
    });
  };

  return (
    <Layout>
      <div className="flex flex-col h-[calc(100vh-8rem)]">
        <div className="flex justify-between items-center mb-6 shrink-0">
          <div>
            <h1 className="text-3xl font-display font-bold text-white tracking-tight">Pipeline</h1>
            <p className="text-muted-foreground mt-1 text-sm">Drag and drop deals across stages.</p>
          </div>
          <Button className="bg-gradient-to-r from-primary to-accent text-white shadow-lg shadow-primary/20">
            <Plus className="w-4 h-4 mr-2" /> New Deal
          </Button>
        </div>

        {isLoading ? (
          <div className="flex gap-4 h-full overflow-hidden">
             {STAGES.map(s => <div key={s.id} className="w-80 shrink-0 bg-card/50 rounded-xl animate-pulse"></div>)}
          </div>
        ) : (
          <div className="flex-1 overflow-x-auto pb-4 custom-scrollbar">
            <DragDropContext onDragEnd={onDragEnd}>
              <div className="flex gap-4 h-full items-start">
                {STAGES.map(stage => {
                  const items = columns[stage.id] || [];
                  const totalValue = items.reduce((sum, item) => sum + (item.amount || 0), 0);
                  
                  return (
                    <div key={stage.id} className="w-[320px] shrink-0 flex flex-col h-full bg-card/30 rounded-2xl border border-white/5 overflow-hidden">
                      <div className="p-4 border-b border-white/5 bg-black/20 flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${stage.color.split(' ')[0].replace('border-', 'bg-')}`} />
                          <h3 className="font-semibold text-white">{stage.label}</h3>
                          <span className="text-xs font-medium text-muted-foreground bg-white/5 px-2 py-0.5 rounded-full">{items.length}</span>
                        </div>
                        <div className="text-xs font-medium text-muted-foreground">
                          ${(totalValue/1000).toFixed(1)}k
                        </div>
                      </div>
                      
                      <Droppable droppableId={stage.id}>
                        {(provided, snapshot) => (
                          <div 
                            ref={provided.innerRef} 
                            {...provided.droppableProps}
                            className={`flex-1 p-3 overflow-y-auto custom-scrollbar flex flex-col gap-3 transition-colors ${snapshot.isDraggingOver ? 'bg-white/5' : ''}`}
                          >
                            {items.map((opp, index) => (
                              <Draggable key={opp.id} draggableId={opp.id.toString()} index={index}>
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    className={`bg-card rounded-xl p-4 border transition-all ${
                                      snapshot.isDragging ? 'border-primary shadow-xl shadow-primary/20 scale-105 z-50' : 'border-white/10 hover:border-white/20 hover:shadow-lg'
                                    }`}
                                  >
                                    <div className="font-medium text-white mb-1">{opp.name}</div>
                                    <div className="text-xs text-muted-foreground mb-3">{opp.accountName || 'No Account'}</div>
                                    
                                    <div className="flex justify-between items-center mt-auto pt-3 border-t border-white/5">
                                      <div className="flex items-center text-primary font-semibold text-sm">
                                        <DollarSign className="w-3.5 h-3.5 mr-0.5" />
                                        {opp.amount?.toLocaleString() || '0'}
                                      </div>
                                      <div className="flex items-center text-xs text-muted-foreground">
                                        <Calendar className="w-3 h-3 mr-1" />
                                        {opp.closeDate ? format(new Date(opp.closeDate), 'MMM d') : '-'}
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
    </Layout>
  );
}
