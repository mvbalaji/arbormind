import React, { useState, useEffect, useMemo } from "react";
import { useColResize } from "@/hooks/use-col-resize";
import { ColResizeHandle } from "@/components/col-resize-handle";
import {
  useListOpportunities,
  useUpdateOpportunity,
  useCreateOpportunity,
  useDeleteOpportunity,
  useListAccounts,
  useListUsers,
  getListOpportunitiesQueryKey,
} from "@workspace/api-client-react";
import type { Opportunity, UpdateOpportunityInputStage, CreateOpportunityInputStage } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { useAuth } from "@/context/auth";
import { AISummary } from "@/components/ai-summary";
import { useColumnVisibility } from "@/hooks/use-column-visibility";
import { ColumnsMenu } from "@/components/columns-menu";
import { usePagination } from "@/hooks/use-pagination";
import { TablePagination } from "@/components/table-pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Plus,
  Calendar,
  ExternalLink,
  Briefcase,
  List,
  LayoutGrid,
  ArrowUpDown,
  Search,
  Pencil,
  MoreHorizontal,
  ChevronDown,
  Trash2,
  Eye,
  Check,
  Pin,
} from "lucide-react";
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
  prospecting: "bg-teal-500 text-white border-teal-500",
  qualification: "bg-amber-500 text-white border-amber-500",
  proposal: "bg-purple-500 text-white border-purple-500",
  negotiation: "bg-blue-600 text-white border-blue-600",
  closed_won: "bg-emerald-600 text-white border-emerald-600",
  closed_lost: "bg-red-500 text-white border-red-500",
};

const STATUS_FROM_STAGE: Record<string, { label: string; cls: string }> = {
  prospecting: { label: "Initial Contact", cls: "bg-green-100 text-green-700 border-green-300 dark:bg-green-950 dark:text-green-300 dark:border-green-700" },
  qualification: { label: "Qualified", cls: "bg-gray-100 text-gray-600 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600" },
  proposal: { label: "Proposal Sent", cls: "bg-gray-100 text-gray-600 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600" },
  negotiation: { label: "In Progress", cls: "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-700" },
  closed_won: { label: "Won", cls: "bg-green-100 text-green-700 border-green-300 dark:bg-green-950 dark:text-green-300 dark:border-green-700" },
  closed_lost: { label: "Lost", cls: "bg-red-100 text-red-600 border-red-300 dark:bg-red-950 dark:text-red-300 dark:border-red-700" },
};

const VALID_STAGES = new Set(STAGES.map((s) => s.id));

const STAGE_PROBABILITY: Record<string, number> = {
  prospecting: 10, qualification: 25, proposal: 50,
  negotiation: 75, closed_won: 100, closed_lost: 0,
};

type ListViewId =
  | "all"
  | "high_probability"
  | "high_value"
  | "recently_viewed"
  | "closing_next_month"
  | "closing_this_month"
  | "my_opportunities"
  | "new_last_week"
  | "new_this_week";

interface ListView {
  id: ListViewId;
  label: string;
  pinned: boolean;
  filter: (opp: Opportunity, userId?: number) => boolean;
}

const now = () => new Date();

const LIST_VIEWS: ListView[] = [
  { id: "all", label: "All Opportunities", pinned: true, filter: () => true },
  {
    id: "high_probability",
    label: "High Probability Opportunities",
    pinned: true,
    filter: (o) => (o.probability ?? 0) >= 70,
  },
  {
    id: "high_value",
    label: "High Value Opportunities",
    pinned: true,
    filter: (o) => (Number(o.amount) || 0) >= 100000,
  },
  {
    id: "recently_viewed",
    label: "Recently Viewed",
    pinned: true,
    filter: (o) => {
      if (!o.updatedAt) return false;
      const d = new Date(o.updatedAt);
      const n = now();
      const threeDaysAgo = new Date(n);
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      return d >= threeDaysAgo;
    },
  },
  {
    id: "closing_this_month",
    label: "Closing This Month",
    pinned: false,
    filter: (o) => {
      if (!o.closeDate) return false;
      const d = new Date(o.closeDate);
      const n = now();
      return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
    },
  },
  {
    id: "closing_next_month",
    label: "Closing Next Month",
    pinned: false,
    filter: (o) => {
      if (!o.closeDate) return false;
      const d = new Date(o.closeDate);
      const n = now();
      const nextMonth = n.getMonth() === 11 ? 0 : n.getMonth() + 1;
      const nextYear = n.getMonth() === 11 ? n.getFullYear() + 1 : n.getFullYear();
      return d.getMonth() === nextMonth && d.getFullYear() === nextYear;
    },
  },
  {
    id: "my_opportunities",
    label: "My Opportunities",
    pinned: false,
    filter: (o, userId) => userId != null && o.assignedTo === userId,
  },
  {
    id: "new_last_week",
    label: "New Last Week",
    pinned: false,
    filter: (o) => {
      if (!o.createdAt) return false;
      const d = new Date(o.createdAt);
      const n = now();
      const weekAgo = new Date(n);
      weekAgo.setDate(weekAgo.getDate() - 7);
      const twoWeeksAgo = new Date(n);
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      return d >= twoWeeksAgo && d < weekAgo;
    },
  },
  {
    id: "new_this_week",
    label: "New This Week",
    pinned: false,
    filter: (o) => {
      if (!o.createdAt) return false;
      const d = new Date(o.createdAt);
      const n = now();
      const weekAgo = new Date(n);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return d >= weekAgo;
    },
  },
];

const PINNED_VIEWS = LIST_VIEWS.filter((v) => v.pinned);
const OTHER_VIEWS = LIST_VIEWS.filter((v) => !v.pinned);

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

const OPPORTUNITY_TOGGLEABLE_COLS = [
  { key: "name" as const, label: "Opportunity" },
  { key: "account" as const, label: "Account" },
  { key: "stage" as const, label: "Stage" },
  { key: "amount" as const, label: "Value" },
  { key: "closeDate" as const, label: "Close Date" },
  { key: "owner" as const, label: "Owner" },
  { key: "status" as const, label: "Status" },
];

const OPPORTUNITIES_COL_KEYS = ["name","account","stage","amount","closeDate","owner","status","actions"] as const;
const OPPORTUNITIES_COL_DEFAULTS: Record<typeof OPPORTUNITIES_COL_KEYS[number], number> = {"name":360,"account":160,"stage":140,"amount":120,"closeDate":130,"owner":140,"status":120,"actions":100};

export default function Opportunities() {
  const { widths: colWidths, startResize: startColResize } = useColResize("col-widths:opportunities:v3", OPPORTUNITIES_COL_KEYS, OPPORTUNITIES_COL_DEFAULTS);
  const { data, isLoading } = useListOpportunities({ limit: 200 });
  const updateMutation = useUpdateOpportunity();
  const deleteMutation = useDeleteOpportunity();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [columns, setColumns] = useState<Record<string, Opportunity[]>>({});
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [sortField, setSortField] = useState<string>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [activeViewId, setActiveViewId] = useState<ListViewId>("all");
  const [viewPickerOpen, setViewPickerOpen] = useState(false);
  const [viewPickerSearch, setViewPickerSearch] = useState("");
  const colVis = useColumnVisibility<"name" | "account" | "stage" | "amount" | "closeDate" | "owner" | "status">(
    "col-visibility:opportunities:v1",
    OPPORTUNITY_TOGGLEABLE_COLS,
  );
  const opportunityColSpan = colVis.visible.size + 2;

  const activeView = LIST_VIEWS.find((v) => v.id === activeViewId) ?? LIST_VIEWS[0];

  const allOpps = data?.data ?? [];

  const viewFilteredOpps = useMemo(() => {
    return allOpps.filter((o) => activeView.filter(o, currentUser?.id));
  }, [allOpps, activeView, currentUser?.id]);

  useEffect(() => {
    if (data?.data) {
      const filtered = viewFilteredOpps;
      const cols: Record<string, Opportunity[]> = {};
      STAGES.forEach((s) => (cols[s.id] = []));
      filtered.forEach((opp) => {
        if (cols[opp.stage]) cols[opp.stage].push(opp);
      });
      setColumns(cols);
    }
  }, [data, viewFilteredOpps]);

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

  const filteredOpps = useMemo(() => {
    if (!searchQuery.trim()) return viewFilteredOpps;
    const q = searchQuery.toLowerCase();
    return viewFilteredOpps.filter(
      (opp) =>
        (opp.name ?? "").toLowerCase().includes(q) ||
        (opp.accountName ?? "").toLowerCase().includes(q) ||
        (opp.stage ?? "").toLowerCase().includes(q) ||
        (opp.assignedToName ?? "").toLowerCase().includes(q)
    );
  }, [viewFilteredOpps, searchQuery]);

  const sortedOpps = useMemo(() => {
    return [...filteredOpps].sort((a, b) => {
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
  }, [filteredOpps, sortField, sortDir]);

  const toggleSort = (field: string) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  };

  const visibleIds = useMemo(() => new Set(sortedOpps.map((o) => o.id)), [sortedOpps]);
  const opportunitiesPagination = usePagination("opportunities", sortedOpps);
  const visibleSelectedCount = useMemo(() => {
    let count = 0;
    for (const id of selectedIds) { if (visibleIds.has(id)) count++; }
    return count;
  }, [selectedIds, visibleIds]);
  const allVisibleSelected = visibleIds.size > 0 && visibleSelectedCount === visibleIds.size;
  const someVisibleSelected = visibleSelectedCount > 0 && !allVisibleSelected;

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const id of visibleIds) next.delete(id);
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const id of visibleIds) next.add(id);
        return next;
      });
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDelete = (id: number, name: string) => {
    if (!window.confirm(`Delete opportunity "${name}"? This cannot be undone.`)) return;
    deleteMutation.mutate(
      { id },
      {
        onSuccess: () => {
          toast({ title: "Deleted", description: `"${name}" has been removed.` });
          queryClient.invalidateQueries({ queryKey: getListOpportunitiesQueryKey() });
          setSelectedIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
        },
        onError: () => toast({ title: "Error", description: "Failed to delete opportunity.", variant: "destructive" }),
      }
    );
  };

  const SortHeader = ({ field, children }: { field: string; children: React.ReactNode }) => (
    <button
      onClick={() => toggleSort(field)}
      aria-sort={sortField === field ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
      className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
    >
      {children}
      <ArrowUpDown className={cn("w-3 h-3", sortField === field ? "opacity-100" : "opacity-40")} />
    </button>
  );

  return (
    <Layout>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <Briefcase className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-display font-bold text-foreground tracking-tight">Opportunities</h1>
              <Popover open={viewPickerOpen} onOpenChange={(open) => { setViewPickerOpen(open); if (!open) setViewPickerSearch(""); }}>
                <PopoverTrigger asChild>
                  <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {activeView.label}
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" sideOffset={6} className="w-64 p-0">
                  <div className="p-2 border-b border-border">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <input
                        type="text"
                        aria-label="Search list views"
                        placeholder="Search list views..."
                        value={viewPickerSearch}
                        onChange={(e) => setViewPickerSearch(e.target.value)}
                        className="w-full pl-7 pr-2 py-1.5 text-sm bg-transparent border border-border rounded-md outline-none focus:border-primary text-foreground placeholder:text-muted-foreground"
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="max-h-72 overflow-y-auto" role="listbox" aria-label="List views">
                    {(() => {
                      const filteredPinned = PINNED_VIEWS.filter((v) => !viewPickerSearch || v.label.toLowerCase().includes(viewPickerSearch.toLowerCase()));
                      const filteredOther = OTHER_VIEWS.filter((v) => !viewPickerSearch || v.label.toLowerCase().includes(viewPickerSearch.toLowerCase()));
                      if (filteredPinned.length === 0 && filteredOther.length === 0) {
                        return (
                          <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                            No matching views found.
                          </div>
                        );
                      }
                      return (
                        <>
                          {filteredPinned.length > 0 && (
                            <>
                              <div className="px-3 pt-2 pb-1">
                                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Pinned List Views</span>
                              </div>
                              {filteredPinned.map((view) => (
                                <button
                                  key={view.id}
                                  role="option"
                                  aria-selected={activeViewId === view.id}
                                  onClick={() => { setActiveViewId(view.id); setViewPickerOpen(false); setViewPickerSearch(""); setSelectedIds(new Set()); }}
                                  className={cn(
                                    "w-full flex items-center gap-2 px-3 py-1 text-sm text-left hover:bg-muted transition-colors",
                                    activeViewId === view.id && "text-primary font-medium"
                                  )}
                                >
                                  {activeViewId === view.id ? (
                                    <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                                  ) : (
                                    <span className="w-3.5 shrink-0" />
                                  )}
                                  {view.label}
                                </button>
                              ))}
                            </>
                          )}
                          {filteredOther.length > 0 && (
                            <>
                              <div className="border-t border-border mt-1" />
                              <div className="px-3 pt-2 pb-1">
                                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">All Other Views</span>
                              </div>
                              {filteredOther.map((view) => (
                                <button
                                  key={view.id}
                                  role="option"
                                  aria-selected={activeViewId === view.id}
                                  onClick={() => { setActiveViewId(view.id); setViewPickerOpen(false); setViewPickerSearch(""); setSelectedIds(new Set()); }}
                                  className={cn(
                                    "w-full flex items-center gap-2 px-3 py-1 text-sm text-left hover:bg-muted transition-colors",
                                    activeViewId === view.id && "text-primary font-medium"
                                  )}
                                >
                                  {activeViewId === view.id ? (
                                    <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                                  ) : (
                                    <span className="w-3.5 shrink-0" />
                                  )}
                                  {view.label}
                                </button>
                              ))}
                            </>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search this list..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 w-48 text-sm bg-card border-border"
              />
            </div>

            <div className="flex items-center border border-border rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode("list")}
                aria-label="List view"
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium transition-colors",
                  viewMode === "list" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"
                )}
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode("kanban")}
                aria-label="Kanban view"
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium transition-colors",
                  viewMode === "kanban" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"
                )}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
            </div>

            <AISummary entityType="opportunities" compact />

            <Button
              size="sm"
              onClick={() => setIsCreateOpen(true)}
              className="bg-primary text-primary-foreground hover:bg-primary/90 h-8"
            >
              New
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
          <div className="bg-card rounded-md overflow-hidden shadow-sm">
            <div className="px-3 py-1 border-b border-border bg-muted/20 flex items-center justify-end gap-3">
              <TablePagination
                variant="inline"
                page={opportunitiesPagination.page}
                totalPages={opportunitiesPagination.totalPages}
                pageSize={opportunitiesPagination.pageSize}
                total={opportunitiesPagination.total}
                pageStart={opportunitiesPagination.pageStart}
                pageEnd={opportunitiesPagination.pageEnd}
                onPageChange={opportunitiesPagination.setPage}
                onPageSizeChange={opportunitiesPagination.setPageSize}
              />
              <ColumnsMenu columns={OPPORTUNITY_TOGGLEABLE_COLS} isVisible={colVis.isVisible} toggle={colVis.toggle} showAll={colVis.showAll} />
            </div>
            <div className="overflow-auto max-h-[calc(100vh-260px)]">
              <table className="w-full text-sm bg-card [&_tbody_td]:whitespace-nowrap">
                <colgroup>
                  <col style={{ width: "32px" }} />
                  {colVis.isVisible("name") && <col data-col="name" style={{ width: `${colWidths.name}px` }} />}
                  {colVis.isVisible("account") && <col data-col="account" style={{ width: `${colWidths.account}px` }} />}
                  {colVis.isVisible("stage") && <col data-col="stage" style={{ width: `${colWidths.stage}px` }} />}
                  {colVis.isVisible("amount") && <col data-col="amount" style={{ width: `${colWidths.amount}px` }} />}
                  {colVis.isVisible("closeDate") && <col data-col="closeDate" style={{ width: `${colWidths.closeDate}px` }} />}
                  {colVis.isVisible("owner") && <col data-col="owner" style={{ width: `${colWidths.owner}px` }} />}
                  {colVis.isVisible("status") && <col data-col="status" style={{ width: `${colWidths.status}px` }} />}
                  <col data-col="actions" style={{ width: `${colWidths.actions}px` }} />
                </colgroup>
                <thead className="sticky top-0 z-30">
                  <tr className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800 border-b border-blue-800 divide-x divide-blue-500/40">
                    <th className="w-8 px-2 py-1">
                      <Checkbox
                        checked={allVisibleSelected ? true : someVisibleSelected ? "indeterminate" : false}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Select all opportunities"
                        className="border-white/70 data-[state=checked]:bg-white data-[state=checked]:text-blue-700"
                      />
                    </th>
                    {colVis.isVisible("name") && <th className="relative text-left px-3 py-1 [&_*]:!text-white [&_*]:!uppercase [&_*]:!tracking-wide [&_*]:!font-semibold"><SortHeader field="name">Opportunity</SortHeader><ColResizeHandle onMouseDown={startColResize("name")} /></th>}
                    {colVis.isVisible("account") && <th className="relative text-left px-3 py-1 [&_*]:!text-white [&_*]:!uppercase [&_*]:!tracking-wide [&_*]:!font-semibold"><SortHeader field="account">Account</SortHeader><ColResizeHandle onMouseDown={startColResize("account")} /></th>}
                    {colVis.isVisible("stage") && <th className="relative text-left px-3 py-1 [&_*]:!text-white [&_*]:!uppercase [&_*]:!tracking-wide [&_*]:!font-semibold"><SortHeader field="stage">Stage</SortHeader><ColResizeHandle onMouseDown={startColResize("stage")} /></th>}
                    {colVis.isVisible("amount") && <th className="relative text-left px-3 py-1 [&_*]:!text-white [&_*]:!uppercase [&_*]:!tracking-wide [&_*]:!font-semibold"><SortHeader field="amount">Value</SortHeader><ColResizeHandle onMouseDown={startColResize("amount")} /></th>}
                    {colVis.isVisible("closeDate") && <th className="relative text-left px-3 py-1 [&_*]:!text-white [&_*]:!uppercase [&_*]:!tracking-wide [&_*]:!font-semibold"><SortHeader field="closeDate">Close Date</SortHeader><ColResizeHandle onMouseDown={startColResize("closeDate")} /></th>}
                    {colVis.isVisible("owner") && <th className="relative text-left px-3 py-1"><span className="text-xs font-semibold uppercase tracking-wide text-white whitespace-nowrap">Owner</span><ColResizeHandle onMouseDown={startColResize("owner")} /></th>}
                    {colVis.isVisible("status") && <th className="relative text-left px-3 py-1"><span className="text-xs font-semibold uppercase tracking-wide text-white whitespace-nowrap">Status</span><ColResizeHandle onMouseDown={startColResize("status")} /></th>}
                    <th className="relative text-center px-3 py-1"><span className="text-xs font-semibold uppercase tracking-wide text-white whitespace-nowrap">Actions</span><ColResizeHandle onMouseDown={startColResize("actions")} /></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-card">
                  {sortedOpps.length === 0 ? (
                    <tr>
                      <td colSpan={opportunityColSpan} className="text-center py-12 text-muted-foreground">
                        {searchQuery ? "No opportunities match your search." : "No opportunities yet. Create your first one!"}
                      </td>
                    </tr>
                  ) : (
                    opportunitiesPagination.paged.map((opp) => {
                      const status = (opp as any).forecastCategory
                        ? { label: (opp as any).forecastCategory, cls: "bg-gray-100 text-gray-600 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600" }
                        : STATUS_FROM_STAGE[opp.stage] ?? { label: "Open", cls: "bg-gray-100 text-gray-600 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600" };

                      return (
                        <tr key={opp.id} className="hover:bg-muted/30 transition-colors group">
                          <td className="w-8 px-2 py-1">
                            <Checkbox
                              checked={selectedIds.has(opp.id)}
                              onCheckedChange={() => toggleSelect(opp.id)}
                              aria-label={`Select ${opp.name}`}
                            />
                          </td>
                          {colVis.isVisible("name") && (
                            <td className="px-3 py-1">
                              <Link href={`/opportunities/${opp.id}`}>
                                <span
                                  className="font-medium text-foreground hover:text-primary hover:underline transition-colors cursor-pointer block truncate"
                                  style={{ maxWidth: `${colWidths.name}px` }}
                                  title={opp.name}
                                >
                                  {opp.name}
                                </span>
                              </Link>
                            </td>
                          )}
                          {colVis.isVisible("account") && (
                            <td className="px-3 py-1 text-foreground">
                              {opp.accountName ?? "—"}
                            </td>
                          )}
                          {colVis.isVisible("stage") && (
                            <td className="px-3 py-1">
                              <span
                                className={cn(
                                  "inline-flex items-center justify-center text-xs font-semibold pl-2.5 pr-4 py-1 whitespace-nowrap w-[130px]",
                                  STAGE_BADGE_COLORS[opp.stage] ?? "bg-gray-500 text-white border-gray-500"
                                )}
                                style={{ clipPath: "polygon(0 0, calc(100% - 8px) 0, 100% 50%, calc(100% - 8px) 100%, 0 100%)" }}
                              >
                                {STAGES.find(s => s.id === opp.stage)?.label ?? opp.stage}
                              </span>
                            </td>
                          )}
                          {colVis.isVisible("amount") && (
                            <td className="px-3 py-1 font-semibold text-foreground">
                              £{(Number(opp.amount) || 0).toLocaleString()}
                            </td>
                          )}
                          {colVis.isVisible("closeDate") && (
                            <td className="px-3 py-1 text-foreground">
                              {opp.closeDate ? format(new Date(opp.closeDate), "dd MMM yyyy") : "—"}
                            </td>
                          )}
                          {colVis.isVisible("owner") && (
                            <td className="px-3 py-1">
                              <span className="inline-flex items-center gap-1 text-foreground text-sm">
                                {opp.assignedToName ?? "Unassigned"}
                                <ChevronDown className="w-3 h-3 text-muted-foreground" />
                              </span>
                            </td>
                          )}
                          {colVis.isVisible("status") && (
                            <td className="px-3 py-1">
                              <Badge
                                variant="outline"
                                className={cn("text-xs font-medium rounded-md px-2.5 py-0.5", status.cls)}
                              >
                                {status.label}
                              </Badge>
                            </td>
                          )}
                          <td className="px-3 py-1">
                            <div className="flex items-center justify-center gap-1">
                              <Link href={`/opportunities/${opp.id}`}>
                                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground">
                                  <Pencil className="w-3.5 h-3.5" />
                                  Edit
                                </Button>
                              </Link>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground" aria-label={`More actions for ${opp.name}`}>
                                    <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-40">
                                  <DropdownMenuItem asChild>
                                    <Link href={`/opportunities/${opp.id}`} className="flex items-center gap-2 cursor-pointer">
                                      <Eye className="w-4 h-4" />
                                      View Details
                                    </Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive cursor-pointer"
                                    onClick={() => handleDelete(opp.id, opp.name)}
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
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
                          £{(totalValue / 1000).toFixed(1)}k
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
                                        £{(Number(opp.amount) || 0).toLocaleString()}
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

  const selectClass = "w-full bg-muted border border-border rounded-md px-3 py-1 text-foreground text-sm";

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
              <Label>Amount (£)</Label>
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
              className="w-full bg-muted border border-border rounded-md px-3 py-1 text-foreground text-sm resize-none h-16"
              value={form.description}
              onChange={f("description")}
              placeholder="Deal context, next steps..."
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="border-border">Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending} className="bg-primary text-primary-foreground hover:bg-primary/90">
              {createMutation.isPending ? "Creating..." : "Create Opportunity"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
