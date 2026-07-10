import React, { useState } from "react";
import {
  useListLeads, useCreateLead, useUpdateLead, useDeleteLead,
  useConvertLead, useListUsers, getListLeadsQueryKey, CreateLeadInputStatus,
  useListAccounts, useListContacts, type ConvertLeadInput,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/auth";
import { Layout } from "@/components/layout";
import { ListPageHeader } from "@/components/list-page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
  DropdownMenuLabel, DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "wouter";
import {
  Plus, ArrowRightLeft, MoreHorizontal, Pencil, Trash2, ExternalLink,
  ChevronDown, UserCheck, ListFilter, Eye, Users, ArrowUpDown, Columns3,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { EmailCompose } from "@/components/email-compose";
import { cn, isRecentlyCreated } from "@/lib/utils";
import { usePagination } from "@/hooks/use-pagination";
import { TablePagination } from "@/components/table-pagination";

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-50 text-blue-700 border-blue-200",
  contacted: "bg-purple-50 text-purple-700 border-purple-200",
  qualified: "bg-green-50 text-green-700 border-green-200",
  unqualified: "bg-red-50 text-red-700 border-red-200",
  converted: "bg-gray-100 text-gray-600 border-gray-200",
};

const STATUS_BADGE_COLORS: Record<string, string> = {
  new: "bg-blue-600 text-white border-blue-600",
  contacted: "bg-purple-500 text-white border-purple-500",
  qualified: "bg-emerald-600 text-white border-emerald-600",
  unqualified: "bg-red-500 text-white border-red-500",
  converted: "bg-gray-500 text-white border-gray-500",
};

const SCORE_META = (score: number) => {
  if (score >= 70) return { label: "🔥 Hot", classes: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800" };
  if (score >= 40) return { label: "♨ Warm", classes: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800" };
  return { label: "❄ Cold", classes: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800" };
};

const BUYER_CLASS_LABELS: Record<string, string> = {
  high_potential: "High Potential",
  medium_potential: "Med Potential",
  low_potential: "Low Potential",
};

const BUYER_CLASS_COLORS: Record<string, string> = {
  high_potential: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-700",
  medium_potential: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-700",
  low_potential: "bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-900 dark:text-gray-400 dark:border-gray-700",
};

const VIEW_OPTIONS = [
  { label: "All Open Leads", value: "", pinned: true },
  { label: "My Leads", value: "my", pinned: true },
  { label: "Converted Leads", value: "converted" },
  { label: "Recently Created", value: "recent" },
];

interface LeadFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  website: string;
  company: string;
  title: string;
  source: string;
  status: string;
  assignedTo: string;
  score: string;
  industry: string;
  employees: string;
  annualRevenue: string;
  description: string;
}

const defaultFormData: LeadFormData = {
  firstName: "", lastName: "", email: "", phone: "", website: "", company: "", title: "",
  source: "", status: "new", assignedTo: "", score: "",
  industry: "", employees: "", annualRevenue: "", description: "",
};

type LeadColKey = "select" | "name" | "company" | "phone" | "email" | "website" | "status" | "score" | "createdAt" | "owner" | "actions";

const LEAD_COL_DEFAULTS: Record<LeadColKey, number> = {
  select: 40,
  name: 200,
  company: 180,
  phone: 160,
  email: 220,
  website: 200,
  status: 150,
  score: 90,
  createdAt: 140,
  owner: 150,
  actions: 160,
};

const LEAD_COL_ORDER: LeadColKey[] = ["select", "name", "company", "phone", "email", "website", "status", "score", "createdAt", "owner", "actions"];
const LEAD_COL_RESIZABLE: ReadonlySet<LeadColKey> = new Set<LeadColKey>(["name", "company", "phone", "email", "website", "status", "score", "createdAt", "owner", "actions"]);
const LEAD_COL_MIN = 60;
const LEAD_COL_STORAGE_KEY = "col-widths:leads:v2";

type LeadToggleableCol = "name" | "company" | "phone" | "email" | "website" | "status" | "score" | "createdAt" | "owner";
const LEAD_TOGGLEABLE_COLS: { key: LeadToggleableCol; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "company", label: "Company" },
  { key: "phone", label: "Phone" },
  { key: "email", label: "Email" },
  { key: "website", label: "Website" },
  { key: "status", label: "Lead Status" },
  { key: "score", label: "Score" },
  { key: "createdAt", label: "Created Date" },
  { key: "owner", label: "Owner" },
];
const LEAD_VIS_STORAGE_KEY = "col-visibility:leads:v1";

function loadLeadColVisibility(): Set<LeadToggleableCol> {
  const all = new Set<LeadToggleableCol>(LEAD_TOGGLEABLE_COLS.map((c) => c.key));
  if (typeof window === "undefined") return all;
  try {
    const raw = window.localStorage.getItem(LEAD_VIS_STORAGE_KEY);
    if (!raw) return all;
    const parsed = JSON.parse(raw) as string[];
    if (!Array.isArray(parsed)) return all;
    const valid = LEAD_TOGGLEABLE_COLS.map((c) => c.key);
    const filtered = parsed.filter((k): k is LeadToggleableCol => (valid as string[]).includes(k));
    return new Set<LeadToggleableCol>(filtered);
  } catch {
    return all;
  }
}

function loadLeadColWidths(): Record<LeadColKey, number> {
  if (typeof window === "undefined") return { ...LEAD_COL_DEFAULTS };
  try {
    const raw = window.localStorage.getItem(LEAD_COL_STORAGE_KEY);
    if (!raw) return { ...LEAD_COL_DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<Record<LeadColKey, number>>;
    const merged: Record<LeadColKey, number> = { ...LEAD_COL_DEFAULTS };
    for (const k of LEAD_COL_ORDER) {
      const v = parsed[k];
      if (typeof v === "number" && Number.isFinite(v) && v >= LEAD_COL_MIN) merged[k] = v;
    }
    return merged;
  } catch {
    return { ...LEAD_COL_DEFAULTS };
  }
}

function useLeadColResize() {
  const [widths, setWidths] = useState<Record<LeadColKey, number>>(() => loadLeadColWidths());
  const draggingRef = React.useRef<{ key: LeadColKey; startX: number; startWidth: number } | null>(null);

  React.useEffect(() => {
    try {
      window.localStorage.setItem(LEAD_COL_STORAGE_KEY, JSON.stringify(widths));
    } catch {
      // ignore quota errors
    }
  }, [widths]);

  React.useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const d = draggingRef.current;
      if (!d) return;
      const delta = e.clientX - d.startX;
      const next = Math.max(LEAD_COL_MIN, d.startWidth + delta);
      setWidths((prev) => (prev[d.key] === next ? prev : { ...prev, [d.key]: next }));
    };
    const onUp = () => {
      if (draggingRef.current) {
        draggingRef.current = null;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  const startResize = (key: LeadColKey) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    draggingRef.current = { key, startX: e.clientX, startWidth: widths[key] };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  const resetWidths = () => setWidths({ ...LEAD_COL_DEFAULTS });

  return { widths, startResize, resetWidths };
}

function ColResizeHandle({ onMouseDown }: { onMouseDown: (e: React.MouseEvent) => void }) {
  return (
    <span
      role="separator"
      aria-orientation="vertical"
      onMouseDown={onMouseDown}
      onClick={(e) => e.stopPropagation()}
      className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize select-none hover:bg-white/40 active:bg-white/60 transition-colors"
      title="Drag to resize"
    />
  );
}

export default function Leads() {
  const { user } = useAuth();
  const { toast: pageToast } = useToast();
  const pageQueryClient = useQueryClient();
  const ownerUpdateMutation = useUpdateLead();
  const { data: ownerUsersData } = useListUsers({ limit: 100 });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [activeView, setActiveView] = useState(VIEW_OPTIONS[0]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<{ id: number } & LeadFormData | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [changeOwnerOpen, setChangeOwnerOpen] = useState(false);
  const [newOwnerId, setNewOwnerId] = useState<string>("");
  const [changeOwnerBusy, setChangeOwnerBusy] = useState(false);
  const [convertingId, setConvertingId] = useState<{ id: number; name: string; company?: string | null } | null>(null);
  const [emailOpen, setEmailOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [sortField, setSortField] = useState<string>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [visibleCols, setVisibleCols] = useState<Set<LeadToggleableCol>>(() => loadLeadColVisibility());
  React.useEffect(() => {
    try {
      window.localStorage.setItem(LEAD_VIS_STORAGE_KEY, JSON.stringify(Array.from(visibleCols)));
    } catch {
      // ignore
    }
  }, [visibleCols]);
  const toggleCol = (key: LeadToggleableCol) => {
    setVisibleCols((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size <= 1) return prev;
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };
  const isColVisible = (key: LeadToggleableCol) => visibleCols.has(key);
  const visibleColCount = 2 + visibleCols.size;
  const { widths: colWidths, startResize: startColResize, resetWidths: resetColWidths } = useLeadColResize();
  const { data, isLoading } = useListLeads({ search, limit: 200 });

  const allLeads = data?.data ?? [];

  const leads = allLeads.filter((lead) => {
    if (statusFilter && lead.status !== statusFilter) return false;
    if (activeView.value === "converted") return lead.isConverted;
    if (activeView.value === "my") return lead.assignedTo === user?.id;
    if (activeView.value === "recent") return isRecentlyCreated(lead.createdAt);
    return !lead.isConverted;
  });

  const total = leads.length;

  const sortedLeads = React.useMemo(() => {
    return [...leads].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "name":
          cmp = `${a.firstName ?? ""} ${a.lastName ?? ""}`.trim()
            .localeCompare(`${b.firstName ?? ""} ${b.lastName ?? ""}`.trim());
          break;
        case "company": cmp = (a.company ?? "").localeCompare(b.company ?? ""); break;
        case "phone": cmp = (a.phone ?? "").localeCompare(b.phone ?? ""); break;
        case "email": cmp = (a.email ?? "").localeCompare(b.email ?? ""); break;
        case "status": cmp = (a.status ?? "").localeCompare(b.status ?? ""); break;
        case "score": cmp = (a.score ?? 0) - (b.score ?? 0); break;
        case "createdAt":
          cmp = (a.createdAt ? new Date(a.createdAt).getTime() : 0)
              - (b.createdAt ? new Date(b.createdAt).getTime() : 0);
          break;
        case "owner": cmp = (a.assignedToName ?? "").localeCompare(b.assignedToName ?? ""); break;
        default: cmp = 0;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [leads, sortField, sortDir]);

  const toggleSort = (field: string) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("asc"); }
  };

  const SortHeader = ({ field, children, align = "left" }: { field: string; children: React.ReactNode; align?: "left" | "center" | "right" }) => (
    <button
      type="button"
      onClick={() => toggleSort(field)}
      aria-sort={sortField === field ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
      className={cn(
        "inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-white hover:text-white/80 transition-colors whitespace-nowrap",
        align === "center" && "justify-center",
        align === "right" && "justify-end"
      )}
    >
      {children}
      <ArrowUpDown className={cn("w-3 h-3", sortField === field ? "opacity-100" : "opacity-50")} />
    </button>
  );

  const visibleIds = React.useMemo(() => new Set(leads.map((l) => l.id)), [leads]);
  const visibleSelectedCount = React.useMemo(() => {
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

  const leadsPagination = usePagination("leads", sortedLeads);

  return (
    <Layout>
      <div className="flex flex-col gap-3">
        <ListPageHeader
          icon={Users}
          title="Leads"
          viewOptions={VIEW_OPTIONS}
          activeView={activeView.value}
          onViewChange={(val) => { const v = VIEW_OPTIONS.find((o) => o.value === val); if (v) setActiveView(v); }}
          viewLabel="All Leads"
          search={{ value: search, onChange: setSearch, placeholder: "Search leads..." }}
          aiEntityType="leads"
          onNew={() => setIsCreateOpen(true)}
          newLabel="New"
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                <ListFilter className="w-3.5 h-3.5" />
                {statusFilter ? statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1) : "Status"}
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuItem onClick={() => setStatusFilter("")} className="text-sm cursor-pointer">
                All Statuses
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {["new", "contacted", "qualified", "unqualified"].map((s) => (
                <DropdownMenuItem
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`text-sm cursor-pointer capitalize ${statusFilter === s ? "text-primary font-medium" : ""}`}
                >
                  {s}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs gap-1.5"
            disabled={selectedIds.size === 0}
            onClick={() => {
              setNewOwnerId("");
              setChangeOwnerOpen(true);
            }}
            title={selectedIds.size === 0 ? "Select one or more leads first" : "Change owner of selected leads"}
          >
            <UserCheck className="w-3.5 h-3.5" /> Change Owner
            {selectedIds.size > 0 ? ` (${selectedIds.size})` : ""}
          </Button>
          {(() => {
            const selectedLeads = leads.filter((l) => selectedIds.has(l.id));
            const singleConvertible =
              selectedLeads.length === 1 && !selectedLeads[0]!.isConverted
                ? selectedLeads[0]!
                : null;
            return (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs gap-1.5"
                  disabled={!singleConvertible}
                  onClick={() => {
                    if (singleConvertible) {
                      setConvertingId({
                        id: singleConvertible.id,
                        name: `${singleConvertible.firstName} ${singleConvertible.lastName}`,
                        company: singleConvertible.company,
                      });
                    }
                  }}
                  title={
                    selectedLeads.length === 0
                      ? "Select a lead to convert"
                      : selectedLeads.length > 1
                      ? "Select only one lead to convert"
                      : selectedLeads[0]!.isConverted
                      ? "Lead is already converted"
                      : "Convert lead"
                  }
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" /> Convert
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-8 text-xs gap-1.5"
                  disabled={selectedIds.size === 0}
                  onClick={() => setBulkDeleteOpen(true)}
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                  {selectedIds.size > 0 ? ` (${selectedIds.size})` : ""}
                </Button>
              </>
            );
          })()}
        </ListPageHeader>

        {/* Table */}
        <div className="bg-card rounded-md overflow-hidden shadow-sm">
          <div className="px-3 py-1 border-b border-border bg-muted/20 flex items-center justify-end gap-3">
            <TablePagination
              variant="inline"
              page={leadsPagination.page}
              totalPages={leadsPagination.totalPages}
              pageSize={leadsPagination.pageSize}
              total={leadsPagination.total}
              pageStart={leadsPagination.pageStart}
              pageEnd={leadsPagination.pageEnd}
              onPageChange={leadsPagination.setPage}
              onPageSizeChange={leadsPagination.setPageSize}
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                  title="Show or hide columns"
                >
                  <Columns3 className="w-3.5 h-3.5" />
                  Columns
                  <ChevronDown className="w-3 h-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="text-xs">Toggle columns</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {LEAD_TOGGLEABLE_COLS.map((c) => (
                  <DropdownMenuCheckboxItem
                    key={c.key}
                    checked={visibleCols.has(c.key)}
                    onCheckedChange={() => toggleCol(c.key)}
                    onSelect={(e) => e.preventDefault()}
                    className="text-sm cursor-pointer"
                  >
                    {c.label}
                  </DropdownMenuCheckboxItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setVisibleCols(new Set(LEAD_TOGGLEABLE_COLS.map((c) => c.key)))}
                  className="text-xs cursor-pointer"
                >
                  Show all
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <button
              type="button"
              onClick={resetColWidths}
              className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              title="Reset column widths to defaults"
            >
              Reset column widths
            </button>
          </div>
          <div className="overflow-auto max-h-[calc(100vh-340px)]">
            <table className="text-sm [&_tbody_td]:truncate" style={{ tableLayout: "fixed", width: "max-content", minWidth: "100%" }}>
              <colgroup>
                {LEAD_COL_ORDER.filter((k) => k === "select" || k === "actions" || isColVisible(k as LeadToggleableCol)).map((k) => (
                  <col key={k} style={{ width: `${colWidths[k]}px` }} />
                ))}
              </colgroup>
              <thead className="sticky top-0 z-30">
                <tr className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800 border-b border-blue-800 divide-x divide-blue-500/40">
                  <th className="px-2 py-1 text-center">
                    <Checkbox
                      checked={allVisibleSelected ? true : someVisibleSelected ? "indeterminate" : false}
                      onCheckedChange={toggleSelectAll}
                      aria-label="Select all leads"
                      className="border-white/70 data-[state=checked]:bg-white data-[state=checked]:text-blue-700"
                    />
                  </th>
                  {isColVisible("name") && <th className="relative px-2 py-1 text-left [&_*]:!whitespace-nowrap"><SortHeader field="name">Name</SortHeader><ColResizeHandle onMouseDown={startColResize("name")} /></th>}
                  {isColVisible("company") && <th className="relative px-2 py-1 text-left [&_*]:!whitespace-nowrap"><SortHeader field="company">Company</SortHeader><ColResizeHandle onMouseDown={startColResize("company")} /></th>}
                  {isColVisible("phone") && <th className="relative px-2 py-1 text-left [&_*]:!whitespace-nowrap"><SortHeader field="phone">Phone</SortHeader><ColResizeHandle onMouseDown={startColResize("phone")} /></th>}
                  {isColVisible("email") && <th className="relative px-2 py-1 text-left [&_*]:!whitespace-nowrap"><SortHeader field="email">Email</SortHeader><ColResizeHandle onMouseDown={startColResize("email")} /></th>}
                  {isColVisible("website") && <th className="relative px-2 py-1 text-left [&_*]:!whitespace-nowrap"><SortHeader field="website">Website</SortHeader><ColResizeHandle onMouseDown={startColResize("website")} /></th>}
                  {isColVisible("status") && <th className="relative px-2 py-1 text-left [&_*]:!whitespace-nowrap"><SortHeader field="status">Lead Status</SortHeader><ColResizeHandle onMouseDown={startColResize("status")} /></th>}
                  {isColVisible("score") && <th className="relative px-2 py-1 text-center [&_*]:!whitespace-nowrap"><SortHeader field="score" align="center">Score</SortHeader><ColResizeHandle onMouseDown={startColResize("score")} /></th>}
                  {isColVisible("createdAt") && <th className="relative px-2 py-1 text-left [&_*]:!whitespace-nowrap"><SortHeader field="createdAt">Created Date</SortHeader><ColResizeHandle onMouseDown={startColResize("createdAt")} /></th>}
                  {isColVisible("owner") && <th className="relative px-2 py-1 text-left [&_*]:!whitespace-nowrap"><SortHeader field="owner">Owner</SortHeader><ColResizeHandle onMouseDown={startColResize("owner")} /></th>}
                  <th className="relative px-2 py-1 text-right text-xs font-semibold uppercase tracking-wide text-white whitespace-nowrap sticky right-0 z-40 bg-blue-700 dark:bg-blue-800 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.25)]">Actions<ColResizeHandle onMouseDown={startColResize("actions")} /></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={visibleColCount} className="px-4 py-8 text-center text-muted-foreground text-sm">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                        Loading leads...
                      </div>
                    </td>
                  </tr>
                ) : leads.length === 0 ? (
                  <tr>
                    <td colSpan={visibleColCount} className="px-4 py-12 text-center">
                      <div className="text-muted-foreground text-sm mb-3">No leads found.</div>
                      <Button size="sm" onClick={() => setIsCreateOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                        <Plus className="w-3.5 h-3.5 mr-1.5" /> Create your first lead
                      </Button>
                    </td>
                  </tr>
                ) : (
                  leadsPagination.paged.map((lead) => (
                    <tr key={lead.id} className="hover:bg-muted/30 transition-colors group">
                      <td className="px-3 py-1 text-center">
                        <Checkbox
                          checked={selectedIds.has(lead.id)}
                          onCheckedChange={() => toggleSelect(lead.id)}
                          aria-label={`Select ${lead.firstName} ${lead.lastName}`}
                        />
                      </td>
                      {isColVisible("name") && (
                        <td className="px-3 py-1">
                          <Link href={`/leads/${lead.id}`}>
                            <div className="font-medium text-primary hover:text-primary/80 cursor-pointer flex items-center gap-1">
                              {lead.firstName} {lead.lastName}
                              <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity" />
                            </div>
                          </Link>
                        </td>
                      )}
                      {isColVisible("company") && (
                        <td className="px-3 py-1 text-sm text-foreground">{lead.company ?? <span className="text-muted-foreground">—</span>}</td>
                      )}
                      {isColVisible("phone") && (
                        <td className="px-3 py-1 text-sm text-foreground whitespace-nowrap">{lead.phone ?? <span className="text-muted-foreground">—</span>}</td>
                      )}
                      {isColVisible("email") && (
                        <td className="px-3 py-1 text-sm text-foreground">{lead.email ?? <span className="text-muted-foreground">—</span>}</td>
                      )}
                      {isColVisible("website") && (
                        <td className="px-3 py-1 text-sm text-foreground">
                          {(lead as any).website
                            ? <a href={(lead as any).website} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline truncate block max-w-[200px]">{(lead as any).website}</a>
                            : <span className="text-muted-foreground">—</span>}
                        </td>
                      )}
                      {isColVisible("status") && (
                        <td className="px-3 py-1">
                          <span
                            className={cn(
                              "inline-flex items-center justify-center text-xs font-semibold capitalize pl-2.5 pr-4 py-0 whitespace-nowrap w-[130px]",
                              STATUS_BADGE_COLORS[lead.status] ?? "bg-gray-500 text-white border-gray-500"
                            )}
                            style={{ clipPath: "polygon(0 0, calc(100% - 8px) 0, 100% 50%, calc(100% - 8px) 100%, 0 100%)" }}
                          >
                            {lead.status}
                          </span>
                        </td>
                      )}
                      {isColVisible("score") && (
                        <td className="px-3 py-1 text-center">
                          {lead.score != null ? (() => {
                            const meta = SCORE_META(lead.score);
                            return (
                              <div className="flex flex-col items-center gap-0.5">
                                <span className={cn("inline-flex items-center justify-center w-7 h-5 rounded-md border text-[10px] font-bold", meta.classes)}>
                                  {lead.score}
                                </span>
                                <span className={cn("text-[9px] font-semibold leading-none px-1 rounded", meta.classes)}>
                                  {meta.label}
                                </span>
                                {(lead as unknown as { buyerClassification?: string }).buyerClassification && (
                                  <span className={cn("text-[9px] px-1 rounded border mt-0.5", BUYER_CLASS_COLORS[(lead as unknown as { buyerClassification: string }).buyerClassification] ?? "")}>
                                    {BUYER_CLASS_LABELS[(lead as unknown as { buyerClassification: string }).buyerClassification] ?? ""}
                                  </span>
                                )}
                              </div>
                            );
                          })() : <span className="text-muted-foreground">—</span>}
                        </td>
                      )}
                      {isColVisible("createdAt") && (
                        <td className="px-3 py-1 text-xs text-muted-foreground">
                          {lead.createdAt ? format(new Date(lead.createdAt), "MMM d, yyyy") : "—"}
                        </td>
                      )}
                      {isColVisible("owner") && (
                        <td className="px-3 py-1 text-xs text-muted-foreground">
                          {lead.assignedToName ?? <span className="italic">Unassigned</span>}
                        </td>
                      )}
                      <td className="px-3 py-1 sticky right-0 z-10 bg-card group-hover:bg-muted/30 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.08)]">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-1.5 text-xs gap-1 text-muted-foreground hover:text-foreground"
                            onClick={() => setEditingLead({
                              id: lead.id,
                              firstName: lead.firstName,
                              lastName: lead.lastName,
                              email: lead.email ?? "",
                              phone: lead.phone ?? "",
                              website: (lead as any).website ?? "",
                              company: lead.company ?? "",
                              title: lead.title ?? "",
                              source: lead.source ?? "",
                              status: lead.status,
                              assignedTo: (lead.assignedTo?.toString()) ?? "",
                              score: (lead.score?.toString()) ?? "",
                              industry: lead.industry ?? "",
                              employees: (lead.employees ?? "").toString(),
                              annualRevenue: (lead.annualRevenue ?? "").toString(),
                              description: lead.description ?? "",
                            })}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-1.5 text-xs gap-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setDeletingId(lead.id)}
                            aria-label={`Delete ${lead.firstName} ${lead.lastName}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                                aria-label={`More actions for ${lead.firstName} ${lead.lastName}`}
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuItem asChild>
                                <Link href={`/leads/${lead.id}`} className="flex items-center gap-2 cursor-pointer">
                                  <Eye className="w-4 h-4" />
                                  View Details
                                </Link>
                              </DropdownMenuItem>
                              {!lead.isConverted && (
                                <DropdownMenuItem
                                  onClick={() => setConvertingId({ id: lead.id, name: `${lead.firstName} ${lead.lastName}`, company: lead.company })}
                                  className="cursor-pointer"
                                >
                                  <ArrowRightLeft className="w-4 h-4 mr-2" />
                                  Convert
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setDeletingId(lead.id)}
                                className="text-destructive focus:text-destructive cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {/* Table Footer */}
          {false && leads.length > 0 && (
            <div className="px-3 py-1 border-t border-border bg-muted/20 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{total} record{total !== 1 ? "s" : ""}</span>
              <span className="text-xs text-muted-foreground">Showing all {total} leads</span>
            </div>
          )}
        </div>
      </div>

      <LeadFormDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} mode="create" />
      <LeadFormDialog
        open={!!editingLead}
        onOpenChange={(o) => { if (!o) setEditingLead(null); }}
        mode="edit"
        initialData={editingLead ?? undefined}
      />
      <ConvertLeadDialog
        open={!!convertingId}
        onOpenChange={(o) => { if (!o) setConvertingId(null); }}
        lead={convertingId ?? undefined}
      />
      <EmailCompose
        open={emailOpen}
        onOpenChange={setEmailOpen}
        defaultSubject="Reaching out from arbormind.in"
      />
      <AlertDialog open={deletingId !== null} onOpenChange={(o) => { if (!o) setDeletingId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lead?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <DeleteLeadAction id={deletingId} onDone={() => setDeletingId(null)} />
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} lead{selectedIds.size !== 1 ? "s" : ""}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the selected leads. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <BulkDeleteLeadsAction
              ids={Array.from(selectedIds)}
              onDone={() => { setBulkDeleteOpen(false); setSelectedIds(new Set()); }}
            />
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Dialog open={changeOwnerOpen} onOpenChange={(o) => { if (!changeOwnerBusy) setChangeOwnerOpen(o); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              Change Owner ({selectedIds.size} lead{selectedIds.size !== 1 ? "s" : ""})
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label className="text-xs font-medium">New owner</Label>
            <select
              value={newOwnerId}
              onChange={(e) => setNewOwnerId(e.target.value)}
              className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              disabled={changeOwnerBusy}
            >
              <option value="">— Unassigned —</option>
              {ownerUsersData?.data?.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              The selected leads will be reassigned to this owner.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" disabled={changeOwnerBusy} onClick={() => setChangeOwnerOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
              disabled={changeOwnerBusy || selectedIds.size === 0}
              onClick={async () => {
                setChangeOwnerBusy(true);
                const targets = leads.filter((l) => selectedIds.has(l.id));
                const ownerVal = newOwnerId ? parseInt(newOwnerId) : null;
                const results = await Promise.allSettled(
                  targets.map((l) =>
                    ownerUpdateMutation.mutateAsync({
                      id: l.id,
                      data: {
                        firstName: l.firstName,
                        lastName: l.lastName,
                        email: l.email ?? undefined,
                        phone: l.phone ?? undefined,
                        company: l.company ?? undefined,
                        title: l.title ?? undefined,
                        status: l.status as "new" | "contacted" | "qualified" | "unqualified" | "converted",
                        source: l.source ?? undefined,
                        score: l.score ?? undefined,
                        industry: l.industry ?? undefined,
                        description: l.description ?? undefined,
                        employees: l.employees ?? undefined,
                        annualRevenue: l.annualRevenue ?? undefined,
                        assignedTo: ownerVal,
                      },
                    })
                  )
                );
                const ok = results.filter((r) => r.status === "fulfilled").length;
                const fail = results.length - ok;
                pageQueryClient.invalidateQueries({ queryKey: getListLeadsQueryKey() });
                pageToast({
                  title: fail === 0 ? "Owner updated" : "Some updates failed",
                  description: `${ok} succeeded${fail ? `, ${fail} failed` : ""}.`,
                  variant: fail === 0 ? "default" : "destructive",
                });
                setChangeOwnerBusy(false);
                setChangeOwnerOpen(false);
                setSelectedIds(new Set());
              }}
            >
              {changeOwnerBusy ? "Updating..." : "Apply"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

function BulkDeleteLeadsAction({ ids, onDone }: { ids: number[]; onDone: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const deleteMutation = useDeleteLead();

  return (
    <AlertDialogAction
      onClick={async () => {
        if (ids.length === 0) return;
        const results = await Promise.allSettled(
          ids.map((id) => deleteMutation.mutateAsync({ id }))
        );
        const ok = results.filter((r) => r.status === "fulfilled").length;
        const failed = results.length - ok;
        queryClient.invalidateQueries({ queryKey: getListLeadsQueryKey() });
        if (failed === 0) {
          toast({ title: `Deleted ${ok} lead${ok !== 1 ? "s" : ""}` });
        } else {
          toast({
            title: `Deleted ${ok}, failed ${failed}`,
            description: "Some leads could not be deleted.",
            variant: "destructive",
          });
        }
        onDone();
      }}
      className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
    >
      Delete {ids.length}
    </AlertDialogAction>
  );
}

function DeleteLeadAction({ id, onDone }: { id: number | null; onDone: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const deleteMutation = useDeleteLead();

  return (
    <AlertDialogAction
      onClick={() => {
        if (id === null) return;
        deleteMutation.mutate({ id }, {
          onSuccess: () => {
            toast({ title: "Lead deleted" });
            queryClient.invalidateQueries({ queryKey: getListLeadsQueryKey() });
            onDone();
          },
          onError: () => toast({ title: "Error", description: "Failed to delete lead.", variant: "destructive" }),
        });
      }}
      className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
    >
      Delete
    </AlertDialogAction>
  );
}

function LeadFormDialog({
  open, onOpenChange, mode, initialData,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  initialData?: { id: number } & LeadFormData;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createMutation = useCreateLead();
  const updateMutation = useUpdateLead();
  const { data: usersData } = useListUsers({ limit: 50 });
  const [formData, setFormData] = useState<LeadFormData>(initialData ?? defaultFormData);

  React.useEffect(() => {
    if (open) setFormData(initialData ?? defaultFormData);
  }, [open, initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      status: formData.status as CreateLeadInputStatus,
      assignedTo: formData.assignedTo ? parseInt(formData.assignedTo) : undefined,
      score: formData.score ? parseInt(formData.score) : undefined,
      employees: formData.employees ? parseInt(formData.employees) : undefined,
      annualRevenue: formData.annualRevenue ? parseFloat(formData.annualRevenue.replace(/[^0-9.]/g, "")) : undefined,
      title: formData.title || undefined,
      industry: formData.industry || undefined,
      description: formData.description || undefined,
    };
    const invalidate = () => queryClient.invalidateQueries({ queryKey: getListLeadsQueryKey() });
    if (mode === "create") {
      createMutation.mutate({ data: payload }, {
        onSuccess: () => { toast({ title: "Lead created" }); invalidate(); onOpenChange(false); },
        onError: () => toast({ title: "Error", description: "Failed to create lead.", variant: "destructive" }),
      });
    } else if (initialData) {
      updateMutation.mutate({ id: initialData.id, data: payload }, {
        onSuccess: () => { toast({ title: "Lead updated" }); invalidate(); onOpenChange(false); },
        onError: () => toast({ title: "Error", description: "Failed to update lead.", variant: "destructive" }),
      });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;
  const f = (field: keyof LeadFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setFormData({ ...formData, [field]: e.target.value });

  const selectClass = "w-full bg-card border border-border rounded-md px-3 py-1 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b border-border pb-3">
          <DialogTitle className="text-base font-semibold">
            {mode === "create" ? "New Lead" : "Edit Lead"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-3">
          {/* About section */}
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/40 -mx-6 px-6 py-2 border-y border-border">
            About
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium">Lead Status</Label>
            <select className={selectClass} value={formData.status} onChange={f("status")}>
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="qualified">Qualified</option>
              <option value="unqualified">Unqualified</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs font-medium">First Name *</Label>
              <Input required value={formData.firstName} onChange={f("firstName")} className="h-8 text-sm" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">Last Name *</Label>
              <Input required value={formData.lastName} onChange={f("lastName")} className="h-8 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs font-medium">Company</Label>
              <Input value={formData.company} onChange={f("company")} className="h-8 text-sm" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">Title</Label>
              <Input value={formData.title} onChange={f("title")} placeholder="e.g. VP of Sales" className="h-8 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs font-medium">Industry</Label>
              <select className={selectClass} value={formData.industry} onChange={f("industry")}>
                <option value="">—None—</option>
                <option value="technology">Technology</option>
                <option value="finance">Finance</option>
                <option value="healthcare">Healthcare</option>
                <option value="manufacturing">Manufacturing</option>
                <option value="retail">Retail</option>
                <option value="education">Education</option>
                <option value="consulting">Consulting</option>
                <option value="real_estate">Real Estate</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">Employees</Label>
              <Input type="number" min="0" value={formData.employees} onChange={f("employees")} placeholder="e.g. 50" className="h-8 text-sm" />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium">Annual Revenue</Label>
            <Input value={formData.annualRevenue} onChange={f("annualRevenue")} placeholder="e.g. $1M" className="h-8 text-sm" />
          </div>

          {/* Contact section */}
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/40 -mx-6 px-6 py-2 border-y border-border mt-4">
            Contact Information
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs font-medium">Email</Label>
              <Input type="email" value={formData.email} onChange={f("email")} className="h-8 text-sm" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">Phone</Label>
              <Input value={formData.phone} onChange={f("phone")} className="h-8 text-sm" />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium">Website</Label>
            <Input type="url" value={formData.website} onChange={f("website")} placeholder="https://example.com" className="h-8 text-sm" />
          </div>

          {/* Lead Details section */}
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/40 -mx-6 px-6 py-2 border-y border-border mt-4">
            Lead Details
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs font-medium">Source</Label>
              <select className={selectClass} value={formData.source} onChange={f("source")}>
                <option value="">—None—</option>
                <option value="website">Website</option>
                <option value="referral">Referral</option>
                <option value="linkedin">LinkedIn</option>
                <option value="email_campaign">Email Campaign</option>
                <option value="trade_show">Trade Show</option>
                <option value="cold_call">Cold Call</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">Lead Score (0–100)</Label>
              <Input
                type="number" min="0" max="100"
                value={formData.score}
                onChange={f("score")}
                placeholder="Auto-calculated"
                className="h-8 text-sm"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium">Assign To Rep</Label>
            <select className={selectClass} value={formData.assignedTo} onChange={f("assignedTo")}>
              <option value="">—Unassigned—</option>
              {usersData?.data?.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>

          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/40 -mx-6 px-6 py-2 border-y border-border mt-4">
            Description
          </div>
          <div className="space-y-2">
            <textarea
              className="w-full bg-card border border-border rounded-md px-3 py-1 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 min-h-[80px] resize-y"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Additional notes about this lead..."
              rows={3}
            />
          </div>

          <DialogFooter className="pt-3 border-t border-border gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" size="sm" disabled={isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {isPending ? "Saving..." : mode === "create" ? "Save" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ConvertLeadDialog({
  open, onOpenChange, lead,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead?: { id: number; name: string; company?: string | null };
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const mutation = useConvertLead();
  const [accountMode, setAccountMode] = useState<"new" | "existing">("new");
  const [contactMode, setContactMode] = useState<"new" | "existing">("new");
  const [existingAccountId, setExistingAccountId] = useState("");
  const [selectedContactIds, setSelectedContactIds] = useState<number[]>([]);
  const [accountSearch, setAccountSearch] = useState("");
  const [contactSearch, setContactSearch] = useState("");
  const [oppName, setOppName] = useState("");
  const [createOpp, setCreateOpp] = useState(true);

  const { data: accountsData } = useListAccounts({ limit: 100 });
  const { data: contactsData } = useListContacts({ limit: 100 });
  const accounts = accountsData?.data ?? [];
  const contacts = contactsData?.data ?? [];

  React.useEffect(() => {
    if (open && lead) {
      setAccountMode("new");
      setContactMode("new");
      setExistingAccountId("");
      setSelectedContactIds([]);
      setAccountSearch("");
      setContactSearch("");
      setOppName(`${lead.name} Deal`);
      setCreateOpp(true);
    }
  }, [open, lead]);

  const toggleContactId = (id: number) => {
    setSelectedContactIds((prev) =>
      prev.includes(id) ? prev.filter((cid) => cid !== id) : [...prev, id]
    );
  };

  interface AccountOption { id: number; name: string }
  interface ContactOption { id: number; firstName: string; lastName: string }
  const typedAccounts: AccountOption[] = accounts as AccountOption[];
  const typedContacts: ContactOption[] = contacts as ContactOption[];
  const filteredAccounts = accountSearch
    ? typedAccounts.filter((a) => a.name.toLowerCase().includes(accountSearch.toLowerCase()))
    : typedAccounts;
  const filteredContacts = contactSearch
    ? typedContacts.filter((c) => `${c.firstName} ${c.lastName}`.toLowerCase().includes(contactSearch.toLowerCase()))
    : typedContacts;

  const handleConvert = () => {
    if (!lead) return;
    const data: ConvertLeadInput = {
      createOpportunity: createOpp,
      opportunityName: oppName || `${lead.name} Deal`,
      opportunityAmount: 0,
      createAccount: accountMode === "existing" ? false : true,
      createContact: contactMode === "existing" ? false : true,
      existingAccountId: accountMode === "existing" && existingAccountId ? parseInt(existingAccountId) : undefined,
      existingContactIds: contactMode === "existing" && selectedContactIds.length > 0 ? selectedContactIds : undefined,
    };

    mutation.mutate({ id: lead.id, data }, {
      onSuccess: () => {
        toast({ title: "Lead Converted!", description: "Created Contact, Account, and Opportunity." });
        queryClient.invalidateQueries({ queryKey: getListLeadsQueryKey() });
        onOpenChange(false);
      },
      onError: () => toast({ title: "Error", description: "Failed to convert lead.", variant: "destructive" }),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="border-b border-border pb-3">
          <DialogTitle className="text-base font-semibold">Convert Lead</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Converting <strong className="text-foreground">{lead?.name}</strong>
          </p>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Account</Label>
            <div className="flex gap-2 mb-2">
              <Button type="button" size="sm" variant={accountMode === "new" ? "default" : "outline"} className="text-xs h-7 flex-1" onClick={() => setAccountMode("new")}>Create New</Button>
              <Button type="button" size="sm" variant={accountMode === "existing" ? "default" : "outline"} className="text-xs h-7 flex-1" onClick={() => setAccountMode("existing")}>Use Existing</Button>
            </div>
            {accountMode === "existing" && (
              <div className="space-y-1">
                <Input
                  placeholder="Search accounts..."
                  className="h-8 text-sm"
                  value={accountSearch}
                  onChange={(e) => { setAccountSearch(e.target.value); setExistingAccountId(""); }}
                />
                <div className="max-h-32 overflow-y-auto border border-border rounded-md bg-card">
                  {filteredAccounts.length === 0 ? (
                    <div className="px-3 py-1 text-xs text-muted-foreground">No accounts found</div>
                  ) : filteredAccounts.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      className={`w-full text-left px-3 py-1 text-sm hover:bg-primary/10 transition-colors ${
                        existingAccountId === String(a.id) ? "bg-primary/15 text-primary font-medium" : "text-foreground"
                      }`}
                      onClick={() => { setExistingAccountId(String(a.id)); setAccountSearch(a.name); }}
                    >
                      {a.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contact</Label>
            <div className="flex gap-2 mb-2">
              <Button type="button" size="sm" variant={contactMode === "new" ? "default" : "outline"} className="text-xs h-7 flex-1" onClick={() => setContactMode("new")}>Create New</Button>
              <Button type="button" size="sm" variant={contactMode === "existing" ? "default" : "outline"} className="text-xs h-7 flex-1" onClick={() => setContactMode("existing")}>Use Existing</Button>
            </div>
            {contactMode === "existing" && (
              <div className="space-y-1">
                <Input
                  placeholder="Search contacts..."
                  className="h-8 text-sm"
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                />
                {selectedContactIds.length > 0 && (
                  <p className="text-xs text-muted-foreground">{selectedContactIds.length} contact(s) selected</p>
                )}
                <div className="max-h-32 overflow-y-auto border border-border rounded-md bg-card">
                  {filteredContacts.length === 0 ? (
                    <div className="px-3 py-1 text-xs text-muted-foreground">No contacts found</div>
                  ) : filteredContacts.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className={`w-full text-left px-3 py-1 text-sm hover:bg-primary/10 transition-colors flex items-center gap-2 ${
                        selectedContactIds.includes(c.id) ? "bg-primary/15 text-primary font-medium" : "text-foreground"
                      }`}
                      onClick={() => toggleContactId(c.id)}
                    >
                      <input type="checkbox" checked={selectedContactIds.includes(c.id)} readOnly className="rounded border-border pointer-events-none" />
                      {c.firstName} {c.lastName}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <input type="checkbox" id="createOppList" checked={createOpp} onChange={(e) => setCreateOpp(e.target.checked)} className="rounded border-border" />
              <Label htmlFor="createOppList" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground cursor-pointer">Create Opportunity</Label>
            </div>
            {createOpp && (
              <Input placeholder="Opportunity name" className="h-8 text-sm" value={oppName} onChange={(e) => setOppName(e.target.value)} />
            )}
          </div>

          <div className="p-3 rounded-md bg-amber-50 border border-amber-200">
            <p className="text-xs text-amber-700">The lead will be marked as <strong>converted</strong> and linked to the selected records.</p>
          </div>
        </div>
        <DialogFooter className="border-t border-border pt-3 gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" onClick={handleConvert} disabled={mutation.isPending || (accountMode === "existing" && !existingAccountId) || (contactMode === "existing" && selectedContactIds.length === 0)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            {mutation.isPending ? "Converting..." : "Convert Lead"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
