import React, { useState, useMemo, useEffect } from "react";
import {
  useListLeads, useListOpportunities, useListAccounts,
  useListContacts, useListActivities, useListCases,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus, Trash2, Play, Save, Download, FolderOpen, X, Filter as FilterIcon, Database,
} from "lucide-react";
import { useAuth } from "@/context/auth";
import { useToast } from "@/hooks/use-toast";
import { format as fmtDate, parseISO, isValid as isValidDate, subDays } from "date-fns";
import { useCurrency } from "@/context/currency";

/* ---------- Field definitions ---------- */

type FieldType = "text" | "number" | "date" | "select" | "boolean";
type FieldDef = {
  key: string;
  label: string;
  type: FieldType;
  options?: { value: string; label: string }[];
};

type DatasetDef = {
  id: string;
  label: string;
  fields: FieldDef[];
};

const STAGE_OPTS = [
  { value: "prospecting", label: "Prospecting" },
  { value: "qualification", label: "Qualification" },
  { value: "proposal", label: "Proposal" },
  { value: "negotiation", label: "Negotiation" },
  { value: "closed_won", label: "Closed Won" },
  { value: "closed_lost", label: "Closed Lost" },
];

const DATASETS: Record<string, DatasetDef> = {
  leads: {
    id: "leads", label: "Leads",
    fields: [
      { key: "id", label: "ID", type: "number" },
      { key: "firstName", label: "First Name", type: "text" },
      { key: "lastName", label: "Last Name", type: "text" },
      { key: "email", label: "Email", type: "text" },
      { key: "phone", label: "Phone", type: "text" },
      { key: "company", label: "Company", type: "text" },
      { key: "title", label: "Title", type: "text" },
      { key: "status", label: "Status", type: "select", options: [
        { value: "new", label: "New" }, { value: "contacted", label: "Contacted" },
        { value: "qualified", label: "Qualified" }, { value: "unqualified", label: "Unqualified" },
        { value: "converted", label: "Converted" },
      ]},
      { key: "source", label: "Source", type: "text" },
      { key: "score", label: "Score", type: "number" },
      { key: "annualRevenue", label: "Annual Revenue (£)", type: "number" },
      { key: "employees", label: "Employees", type: "number" },
      { key: "industry", label: "Industry", type: "text" },
      { key: "assignedToName", label: "Owner", type: "text" },
      { key: "isConverted", label: "Converted?", type: "boolean" },
      { key: "createdAt", label: "Created At", type: "date" },
      { key: "updatedAt", label: "Updated At", type: "date" },
    ],
  },
  opportunities: {
    id: "opportunities", label: "Opportunities",
    fields: [
      { key: "id", label: "ID", type: "number" },
      { key: "name", label: "Name", type: "text" },
      { key: "accountName", label: "Account", type: "text" },
      { key: "contactName", label: "Contact", type: "text" },
      { key: "stage", label: "Stage", type: "select", options: STAGE_OPTS },
      { key: "amount", label: "Amount (£)", type: "number" },
      { key: "probability", label: "Probability %", type: "number" },
      { key: "closeDate", label: "Close Date", type: "date" },
      { key: "leadSource", label: "Lead Source", type: "text" },
      { key: "assignedToName", label: "Owner", type: "text" },
      { key: "createdAt", label: "Created At", type: "date" },
    ],
  },
  accounts: {
    id: "accounts", label: "Accounts",
    fields: [
      { key: "id", label: "ID", type: "number" },
      { key: "name", label: "Name", type: "text" },
      { key: "industry", label: "Industry", type: "text" },
      { key: "city", label: "City", type: "text" },
      { key: "country", label: "Country", type: "text" },
      { key: "employees", label: "Employees", type: "number" },
      { key: "annualRevenue", label: "Annual Revenue (£)", type: "number" },
      { key: "contactCount", label: "# Contacts", type: "number" },
      { key: "dealCount", label: "# Deals", type: "number" },
      { key: "ownerName", label: "Owner", type: "text" },
      { key: "createdAt", label: "Created At", type: "date" },
    ],
  },
  contacts: {
    id: "contacts", label: "Contacts",
    fields: [
      { key: "id", label: "ID", type: "number" },
      { key: "firstName", label: "First Name", type: "text" },
      { key: "lastName", label: "Last Name", type: "text" },
      { key: "email", label: "Email", type: "text" },
      { key: "phone", label: "Phone", type: "text" },
      { key: "title", label: "Title", type: "text" },
      { key: "department", label: "Department", type: "text" },
      { key: "accountName", label: "Account", type: "text" },
      { key: "city", label: "City", type: "text" },
      { key: "country", label: "Country", type: "text" },
      { key: "leadSource", label: "Lead Source", type: "text" },
      { key: "ownerName", label: "Owner", type: "text" },
      { key: "createdAt", label: "Created At", type: "date" },
    ],
  },
  activities: {
    id: "activities", label: "Activities",
    fields: [
      { key: "id", label: "ID", type: "number" },
      { key: "type", label: "Type", type: "select", options: [
        { value: "call", label: "Call" }, { value: "email", label: "Email" },
        { value: "meeting", label: "Meeting" }, { value: "task", label: "Task" },
        { value: "note", label: "Note" },
      ]},
      { key: "subject", label: "Subject", type: "text" },
      { key: "status", label: "Status", type: "select", options: [
        { value: "planned", label: "Planned" }, { value: "completed", label: "Completed" },
        { value: "cancelled", label: "Cancelled" },
      ]},
      { key: "dueDate", label: "Due Date", type: "date" },
      { key: "completedAt", label: "Completed At", type: "date" },
      { key: "contactName", label: "Contact", type: "text" },
      { key: "accountName", label: "Account", type: "text" },
      { key: "opportunityName", label: "Opportunity", type: "text" },
      { key: "assignedToName", label: "Owner", type: "text" },
      { key: "createdAt", label: "Created At", type: "date" },
    ],
  },
  cases: {
    id: "cases", label: "Cases",
    fields: [
      { key: "id", label: "ID", type: "number" },
      { key: "caseNumber", label: "Case #", type: "text" },
      { key: "subject", label: "Subject", type: "text" },
      { key: "status", label: "Status", type: "select", options: [
        { value: "new", label: "New" }, { value: "in_progress", label: "In Progress" },
        { value: "pending", label: "Pending" }, { value: "resolved", label: "Resolved" },
        { value: "closed", label: "Closed" },
      ]},
      { key: "priority", label: "Priority", type: "select", options: [
        { value: "low", label: "Low" }, { value: "medium", label: "Medium" },
        { value: "high", label: "High" }, { value: "critical", label: "Critical" },
      ]},
      { key: "type", label: "Type", type: "text" },
      { key: "origin", label: "Origin", type: "text" },
      { key: "contactName", label: "Contact", type: "text" },
      { key: "accountName", label: "Account", type: "text" },
      { key: "assignedToName", label: "Owner", type: "text" },
      { key: "createdAt", label: "Created At", type: "date" },
    ],
  },
};

/* ---------- Operators ---------- */

type Operator =
  | "contains" | "not_contains" | "equals" | "not_equals" | "starts_with"
  | "gt" | "gte" | "lt" | "lte" | "between"
  | "on" | "before" | "after" | "last_n_days"
  | "is_empty" | "is_not_empty"
  | "is_true" | "is_false";

const OPS_BY_TYPE: Record<FieldType, { value: Operator; label: string; needsValue?: boolean; needs2?: boolean }[]> = {
  text: [
    { value: "contains", label: "contains", needsValue: true },
    { value: "not_contains", label: "does not contain", needsValue: true },
    { value: "equals", label: "equals", needsValue: true },
    { value: "starts_with", label: "starts with", needsValue: true },
    { value: "is_empty", label: "is empty" },
    { value: "is_not_empty", label: "is not empty" },
  ],
  number: [
    { value: "equals", label: "=", needsValue: true },
    { value: "not_equals", label: "≠", needsValue: true },
    { value: "gt", label: ">", needsValue: true },
    { value: "gte", label: "≥", needsValue: true },
    { value: "lt", label: "<", needsValue: true },
    { value: "lte", label: "≤", needsValue: true },
    { value: "between", label: "between", needsValue: true, needs2: true },
    { value: "is_empty", label: "is empty" },
    { value: "is_not_empty", label: "is not empty" },
  ],
  date: [
    { value: "on", label: "on", needsValue: true },
    { value: "before", label: "before", needsValue: true },
    { value: "after", label: "after", needsValue: true },
    { value: "between", label: "between", needsValue: true, needs2: true },
    { value: "last_n_days", label: "in the last N days", needsValue: true },
    { value: "is_empty", label: "is empty" },
    { value: "is_not_empty", label: "is not empty" },
  ],
  select: [
    { value: "equals", label: "is", needsValue: true },
    { value: "not_equals", label: "is not", needsValue: true },
    { value: "is_empty", label: "is empty" },
    { value: "is_not_empty", label: "is not empty" },
  ],
  boolean: [
    { value: "is_true", label: "is true" },
    { value: "is_false", label: "is false" },
  ],
};

type FilterRow = { id: string; field: string; op: Operator; value: string; value2?: string };

type GroupAgg = "none" | "count" | "sum" | "avg" | "min" | "max";

type ReportDef = {
  id: string;
  name: string;
  dataset: string;
  match: "AND" | "OR";
  filters: FilterRow[];
  columns: string[];
  groupBy: string;
  agg: GroupAgg;
  aggField: string;
  sortBy: string;
  sortDir: "asc" | "desc";
};

/* ---------- Helpers ---------- */

function uid() { return Math.random().toString(36).slice(2, 10); }

function newReport(dataset = "leads"): ReportDef {
  const ds = DATASETS[dataset]!;
  return {
    id: uid(), name: "Untitled Report", dataset,
    match: "AND", filters: [],
    columns: ds.fields.slice(0, 6).map((f) => f.key),
    groupBy: "", agg: "none", aggField: "",
    sortBy: ds.fields[0]!.key, sortDir: "asc",
  };
}

function fieldDef(dataset: string, key: string): FieldDef | undefined {
  return DATASETS[dataset]?.fields.find((f) => f.key === key);
}

function fmtCell(v: unknown, type?: FieldType): string {
  if (v === null || v === undefined || v === "") return "—";
  if (type === "boolean") return v ? "Yes" : "No";
  if (type === "date" && typeof v === "string") {
    const d = parseISO(v); return isValidDate(d) ? fmtDate(d, "d MMM yyyy") : String(v);
  }
  if (type === "number") {
    const n = Number(v);
    return Number.isFinite(n) ? n.toLocaleString("en-GB") : String(v);
  }
  return String(v);
}

function passFilter(row: Record<string, unknown>, f: FilterRow, type: FieldType): boolean {
  const raw = row[f.field];
  const isEmpty = raw === null || raw === undefined || raw === "";
  if (f.op === "is_empty") return isEmpty;
  if (f.op === "is_not_empty") return !isEmpty;
  if (f.op === "is_true") return Boolean(raw) === true;
  if (f.op === "is_false") return Boolean(raw) === false;
  if (isEmpty) return false;

  if (type === "number") {
    const n = Number(raw); const v = Number(f.value); const v2 = Number(f.value2 ?? "");
    if (!Number.isFinite(n)) return false;
    switch (f.op) {
      case "equals": return n === v;
      case "not_equals": return n !== v;
      case "gt": return n > v;
      case "gte": return n >= v;
      case "lt": return n < v;
      case "lte": return n <= v;
      case "between": return n >= v && n <= v2;
      default: return false;
    }
  }
  if (type === "date") {
    const d = typeof raw === "string" ? parseISO(raw) : null;
    if (!d || !isValidDate(d)) return false;
    if (f.op === "last_n_days") {
      const n = Number(f.value);
      if (!Number.isFinite(n) || n <= 0) return false;
      return d >= subDays(new Date(), n);
    }
    const v = f.value ? parseISO(f.value) : null;
    if (!v || !isValidDate(v)) return false;
    const dDay = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const vDay = new Date(v.getFullYear(), v.getMonth(), v.getDate()).getTime();
    switch (f.op) {
      case "on": return dDay === vDay;
      case "before": return dDay < vDay;
      case "after": return dDay > vDay;
      case "between": {
        if (!f.value2) return false;
        const v2 = parseISO(f.value2);
        if (!isValidDate(v2)) return false;
        const v2Day = new Date(v2.getFullYear(), v2.getMonth(), v2.getDate()).getTime();
        return dDay >= vDay && dDay <= v2Day;
      }
      default: return false;
    }
  }
  // text / select
  const s = String(raw).toLowerCase(); const v = String(f.value).toLowerCase();
  switch (f.op) {
    case "contains": return s.includes(v);
    case "not_contains": return !s.includes(v);
    case "equals": return s === v;
    case "not_equals": return s !== v;
    case "starts_with": return s.startsWith(v);
    default: return false;
  }
}

function aggregate(rows: Record<string, unknown>[], agg: GroupAgg, field: string): number {
  if (agg === "count" || !field) return rows.length;
  const nums = rows.map((r) => Number(r[field])).filter((n) => Number.isFinite(n));
  if (nums.length === 0) return 0;
  switch (agg) {
    case "sum": return nums.reduce((a, b) => a + b, 0);
    case "avg": return nums.reduce((a, b) => a + b, 0) / nums.length;
    case "min": return Math.min(...nums);
    case "max": return Math.max(...nums);
    default: return rows.length;
  }
}

function toCSV(rows: Record<string, unknown>[], cols: string[], dataset: string): string {
  const escape = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = cols.map((k) => fieldDef(dataset, k)?.label ?? k).join(",");
  const body = rows.map((r) => cols.map((k) => escape(r[k])).join(",")).join("\n");
  return header + "\n" + body;
}

function downloadFile(name: string, content: string, mime = "text/csv") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ---------- Component ---------- */

export function CustomReportBuilder() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { format: fmtMoney } = useCurrency();
  const gbp = (n: number) => fmtMoney(n || 0, { maximumFractionDigits: 0, minimumFractionDigits: 0 });
  const storageKey = `crmai.customReports.${user?.id ?? "anon"}`;

  const [report, setReport] = useState<ReportDef>(() => newReport("leads"));
  const [saved, setSaved] = useState<ReportDef[]>([]);
  const [loadOpen, setLoadOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) setSaved(JSON.parse(raw));
    } catch { /* ignore */ }
  }, [storageKey]);

  const persist = (next: ReportDef[]) => {
    setSaved(next);
    try { window.localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* ignore */ }
  };

  /* Fetch all datasets — only the chosen one is used, others are idle */
  const leadsQ = useListLeads({ limit: 500 });
  const oppsQ = useListOpportunities({ limit: 500 });
  const accQ = useListAccounts({ limit: 500 });
  const conQ = useListContacts({ limit: 500 });
  const actQ = useListActivities({ limit: 500 });
  const casQ = useListCases({ limit: 500 });

  const rawRows: Record<string, unknown>[] = useMemo(() => {
    const sel: Record<string, { data?: { data?: unknown[] } }> = {
      leads: leadsQ, opportunities: oppsQ, accounts: accQ,
      contacts: conQ, activities: actQ, cases: casQ,
    };
    return (sel[report.dataset]?.data?.data ?? []) as Record<string, unknown>[];
  }, [report.dataset, leadsQ.data, oppsQ.data, accQ.data, conQ.data, actQ.data, casQ.data]);

  const isLoading =
    (report.dataset === "leads" && leadsQ.isLoading) ||
    (report.dataset === "opportunities" && oppsQ.isLoading) ||
    (report.dataset === "accounts" && accQ.isLoading) ||
    (report.dataset === "contacts" && conQ.isLoading) ||
    (report.dataset === "activities" && actQ.isLoading) ||
    (report.dataset === "cases" && casQ.isLoading);

  const ds = DATASETS[report.dataset]!;

  /* Apply filters */
  const filteredRows = useMemo(() => {
    if (report.filters.length === 0) return rawRows;
    return rawRows.filter((row) => {
      const checks = report.filters.map((f) => {
        const def = fieldDef(report.dataset, f.field);
        if (!def) return true;
        return passFilter(row, f, def.type);
      });
      return report.match === "AND" ? checks.every(Boolean) : checks.some(Boolean);
    });
  }, [rawRows, report.filters, report.match, report.dataset]);

  /* Group + aggregate, or flat sorted rows */
  type DisplayRow = { __group?: string; __isAgg?: boolean } & Record<string, unknown>;
  const displayRows: DisplayRow[] = useMemo(() => {
    const cmp = (a: unknown, b: unknown) => {
      const na = Number(a), nb = Number(b);
      if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
      return String(a ?? "").localeCompare(String(b ?? ""));
    };
    const sortIt = (rows: DisplayRow[]) => {
      const sf = report.sortBy;
      if (!sf) return rows;
      const sorted = [...rows].sort((a, b) => cmp(a[sf], b[sf]));
      return report.sortDir === "asc" ? sorted : sorted.reverse();
    };
    if (report.groupBy) {
      const groups = new Map<string, DisplayRow[]>();
      for (const r of filteredRows) {
        const key = String(r[report.groupBy] ?? "—");
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(r);
      }
      const out: DisplayRow[] = [];
      [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).forEach(([key, rows]) => {
        const aggVal = aggregate(rows, report.agg === "none" ? "count" : report.agg, report.aggField);
        out.push({
          __group: key, __isAgg: true,
          [report.groupBy]: key,
          [`__agg__`]: aggVal,
        });
        sortIt(rows as DisplayRow[]).forEach((row) => out.push(row));
      });
      return out;
    }
    return sortIt(filteredRows as DisplayRow[]);
  }, [filteredRows, report.groupBy, report.agg, report.aggField, report.sortBy, report.sortDir]);

  /* Totals for numeric columns */
  const totals = useMemo(() => {
    const t: Record<string, number> = {};
    for (const c of report.columns) {
      const def = fieldDef(report.dataset, c);
      if (def?.type === "number") {
        t[c] = filteredRows.reduce((sum, r) => sum + (Number(r[c]) || 0), 0);
      }
    }
    return t;
  }, [filteredRows, report.columns, report.dataset]);

  /* Handlers */
  const update = <K extends keyof ReportDef>(k: K, v: ReportDef[K]) =>
    setReport((r) => ({ ...r, [k]: v }));

  const addFilter = () => {
    const def = ds.fields[0]!;
    const ops = OPS_BY_TYPE[def.type];
    setReport((r) => ({
      ...r,
      filters: [...r.filters, { id: uid(), field: def.key, op: ops[0]!.value, value: "" }],
    }));
  };

  const updateFilter = (id: string, patch: Partial<FilterRow>) => {
    setReport((r) => ({
      ...r,
      filters: r.filters.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    }));
  };

  const onDatasetChange = (id: string) => {
    setReport(newReport(id));
  };

  const saveReport = () => {
    const name = window.prompt("Report name:", report.name === "Untitled Report" ? "" : report.name)?.trim();
    if (!name) return;
    const toSave: ReportDef = { ...report, name, id: report.id || uid() };
    const exists = saved.find((s) => s.name === name);
    const next = exists
      ? saved.map((s) => (s.name === name ? toSave : s))
      : [...saved, toSave];
    persist(next);
    setReport(toSave);
    toast({ title: "Report saved", description: name });
  };

  const loadReport = (def: ReportDef) => {
    setReport({ ...def });
    setLoadOpen(false);
    toast({ title: "Report loaded", description: def.name });
  };

  const deleteReport = (id: string) => {
    persist(saved.filter((s) => s.id !== id));
    setPendingDeleteId(null);
    toast({ title: "Report deleted" });
  };

  const exportCSV = () => {
    if (filteredRows.length === 0) {
      toast({ title: "Nothing to export", variant: "destructive" });
      return;
    }
    const csv = toCSV(filteredRows, report.columns, report.dataset);
    const file = `${report.name.replace(/[^a-z0-9-_]+/gi, "_")}.csv`;
    downloadFile(file, csv);
  };

  /* ---------- Render ---------- */

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <Card className="border-border">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1 min-w-[180px]">
              <Label className="text-xs flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5" /> Data Source
              </Label>
              <select
                value={report.dataset}
                onChange={(e) => onDatasetChange(e.target.value)}
                className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
              >
                {Object.values(DATASETS).map((d) => (
                  <option key={d.id} value={d.id}>{d.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1 flex-1 min-w-[200px]">
              <Label className="text-xs">Report Name</Label>
              <Input
                value={report.name}
                onChange={(e) => update("name", e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => setReport(newReport(report.dataset))}>
                <X className="w-3.5 h-3.5" /> Clear
              </Button>
              <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={saveReport}>
                <Save className="w-3.5 h-3.5" /> Save
              </Button>
              <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={exportCSV}>
                <Download className="w-3.5 h-3.5" /> Export CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* My Reports */}
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5">
              <FolderOpen className="w-4 h-4 text-primary" /> My Reports
              <Badge variant="outline" className="text-[10px] ml-1">{saved.length}</Badge>
            </span>
            {saved.length > 0 && (
              <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={() => setLoadOpen(true)}>
                Manage
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {saved.length === 0 ? (
            <p className="text-xs text-muted-foreground py-3 text-center">
              No saved reports yet. Configure filters and columns below, then click <span className="font-semibold">Save</span> to add one here.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
              {saved.map((s) => {
                const isActive = s.id === report.id;
                return (
                  <div key={s.id}
                       className={`group rounded-md border p-2.5 transition-colors cursor-pointer ${
                         isActive ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"
                       }`}
                       onClick={() => loadReport(s)}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate" title={s.name}>{s.name}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          {DATASETS[s.dataset]?.label ?? s.dataset}
                        </div>
                      </div>
                      <Button size="sm" variant="ghost"
                        className="h-6 w-6 p-0 text-destructive opacity-0 group-hover:opacity-100 shrink-0"
                        onClick={(e) => { e.stopPropagation(); setPendingDeleteId(s.id); }}
                        title="Delete report">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      <Badge variant="outline" className="text-[10px]">{s.filters.length} filter{s.filters.length !== 1 ? "s" : ""}</Badge>
                      <Badge variant="outline" className="text-[10px]">{s.columns.length} cols</Badge>
                      {s.groupBy && <Badge variant="outline" className="text-[10px]">grouped</Badge>}
                      {isActive && <Badge className="text-[10px] bg-primary text-primary-foreground">active</Badge>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-[340px_1fr] gap-4">
        {/* Builder panel */}
        <div className="space-y-4">
          {/* Filters */}
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5"><FilterIcon className="w-4 h-4" /> Filters</span>
                <div className="flex items-center gap-1">
                  <select
                    value={report.match}
                    onChange={(e) => update("match", e.target.value as "AND" | "OR")}
                    className="h-7 rounded border border-input bg-background px-2 text-[11px] font-medium"
                    title="Combine filters with"
                  >
                    <option value="AND">Match ALL</option>
                    <option value="OR">Match ANY</option>
                  </select>
                  <Button size="sm" variant="ghost" className="h-7 px-2" onClick={addFilter} title="Add filter">
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {report.filters.length === 0 && (
                <p className="text-xs text-muted-foreground py-2">No filters — showing all records.</p>
              )}
              {report.filters.map((f) => {
                const def = fieldDef(report.dataset, f.field)!;
                const ops = OPS_BY_TYPE[def.type];
                const opDef = ops.find((o) => o.value === f.op) ?? ops[0]!;
                return (
                  <div key={f.id} className="rounded-md border border-border p-2 space-y-1.5 bg-muted/20">
                    <div className="flex items-center gap-1.5">
                      <select
                        value={f.field}
                        onChange={(e) => {
                          const newDef = fieldDef(report.dataset, e.target.value)!;
                          updateFilter(f.id, {
                            field: e.target.value,
                            op: OPS_BY_TYPE[newDef.type][0]!.value,
                            value: "", value2: "",
                          });
                        }}
                        className="flex-1 min-w-0 h-7 rounded border border-input bg-background px-2 text-xs"
                      >
                        {ds.fields.map((fd) => (
                          <option key={fd.key} value={fd.key}>{fd.label}</option>
                        ))}
                      </select>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive"
                        onClick={() => update("filters", report.filters.filter((x) => x.id !== f.id))}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    <select
                      value={f.op}
                      onChange={(e) => updateFilter(f.id, { op: e.target.value as Operator, value: "", value2: "" })}
                      className="w-full h-7 rounded border border-input bg-background px-2 text-xs"
                    >
                      {ops.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    {opDef.needsValue && (
                      <div className="flex items-center gap-1.5">
                        {renderValueInput(def, f.value, (v) => updateFilter(f.id, { value: v }))}
                        {opDef.needs2 && (
                          <>
                            <span className="text-[10px] text-muted-foreground">to</span>
                            {renderValueInput(def, f.value2 ?? "", (v) => updateFilter(f.id, { value2: v }))}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Columns */}
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Columns ({report.columns.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 max-h-[260px] overflow-y-auto">
              {ds.fields.map((f) => {
                const checked = report.columns.includes(f.key);
                return (
                  <label key={f.key} className="flex items-center gap-2 text-xs py-0.5 cursor-pointer">
                    <input
                      type="checkbox" checked={checked}
                      onChange={() => {
                        update("columns", checked
                          ? report.columns.filter((c) => c !== f.key)
                          : [...report.columns, f.key]);
                      }}
                    />
                    <span>{f.label}</span>
                    <span className="ml-auto text-[10px] text-muted-foreground uppercase">{f.type}</span>
                  </label>
                );
              })}
            </CardContent>
          </Card>

          {/* Group + Sort */}
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Group &amp; Sort</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="space-y-1">
                <Label className="text-xs">Group by</Label>
                <select
                  value={report.groupBy}
                  onChange={(e) => update("groupBy", e.target.value)}
                  className="w-full h-8 rounded border border-input bg-background px-2 text-xs"
                >
                  <option value="">— None —</option>
                  {ds.fields.filter((f) => f.type !== "number" || f.key === "id").map((f) => (
                    <option key={f.key} value={f.key}>{f.label}</option>
                  ))}
                </select>
              </div>
              {report.groupBy && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Aggregate</Label>
                    <select
                      value={report.agg}
                      onChange={(e) => update("agg", e.target.value as GroupAgg)}
                      className="w-full h-8 rounded border border-input bg-background px-2 text-xs"
                    >
                      <option value="count">Count</option>
                      <option value="sum">Sum</option>
                      <option value="avg">Average</option>
                      <option value="min">Min</option>
                      <option value="max">Max</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Of field</Label>
                    <select
                      value={report.aggField}
                      onChange={(e) => update("aggField", e.target.value)}
                      disabled={report.agg === "count"}
                      className="w-full h-8 rounded border border-input bg-background px-2 text-xs disabled:opacity-50"
                    >
                      <option value="">—</option>
                      {ds.fields.filter((f) => f.type === "number").map((f) => (
                        <option key={f.key} value={f.key}>{f.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Sort by</Label>
                  <select
                    value={report.sortBy}
                    onChange={(e) => update("sortBy", e.target.value)}
                    className="w-full h-8 rounded border border-input bg-background px-2 text-xs"
                  >
                    {ds.fields.map((f) => (
                      <option key={f.key} value={f.key}>{f.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Direction</Label>
                  <select
                    value={report.sortDir}
                    onChange={(e) => update("sortDir", e.target.value as "asc" | "desc")}
                    className="w-full h-8 rounded border border-input bg-background px-2 text-xs"
                  >
                    <option value="asc">Ascending</option>
                    <option value="desc">Descending</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Results */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Play className="w-4 h-4 text-primary" /> Results
              </span>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">
                  {isLoading ? "Loading…" : `${filteredRows.length} of ${rawRows.length} rows`}
                </Badge>
                {report.groupBy && (
                  <Badge variant="outline" className="text-[10px]">
                    Grouped by {fieldDef(report.dataset, report.groupBy)?.label}
                  </Badge>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gradient-to-r from-blue-700 to-blue-600 text-white">
                  <tr>
                    {report.columns.map((c) => {
                      const def = fieldDef(report.dataset, c);
                      return (
                        <th key={c} className="text-left px-3 py-2 font-semibold uppercase tracking-wider text-[10px] whitespace-nowrap">
                          {def?.label ?? c}
                        </th>
                      );
                    })}
                    {report.groupBy && (
                      <th className="text-right px-3 py-2 font-semibold uppercase tracking-wider text-[10px] whitespace-nowrap">
                        {report.agg === "count" ? "Count" : `${report.agg.toUpperCase()}(${fieldDef(report.dataset, report.aggField)?.label ?? "—"})`}
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {displayRows.length === 0 && !isLoading && (
                    <tr>
                      <td colSpan={report.columns.length + (report.groupBy ? 1 : 0)}
                          className="text-center text-muted-foreground py-8">
                        No records match your filters.
                      </td>
                    </tr>
                  )}
                  {displayRows.map((row, idx) => {
                    if (row.__isAgg) {
                      return (
                        <tr key={`g-${idx}`} className="bg-primary/5 border-y border-primary/20">
                          <td colSpan={report.columns.length} className="px-3 py-1.5 font-semibold">
                            {fieldDef(report.dataset, report.groupBy)?.label}: {row.__group}
                          </td>
                          {report.groupBy && (
                            <td className="px-3 py-1.5 text-right font-bold tabular-nums">
                              {report.agg === "sum" && report.aggField === "amount" ? gbp(Number(row.__agg__)) : Number(row.__agg__).toLocaleString("en-GB", { maximumFractionDigits: 2 })}
                            </td>
                          )}
                        </tr>
                      );
                    }
                    return (
                      <tr key={idx} className="border-b border-border hover:bg-muted/30">
                        {report.columns.map((c) => {
                          const def = fieldDef(report.dataset, c);
                          const isMoney = c === "amount" || c === "annualRevenue";
                          const v = row[c];
                          return (
                            <td key={c} className={`px-3 py-1.5 ${def?.type === "number" ? "text-right tabular-nums" : ""}`}>
                              {isMoney && v !== null && v !== undefined && v !== "" ? gbp(Number(v)) : fmtCell(v, def?.type)}
                            </td>
                          );
                        })}
                        {report.groupBy && <td />}
                      </tr>
                    );
                  })}
                </tbody>
                {Object.keys(totals).length > 0 && filteredRows.length > 0 && (
                  <tfoot className="bg-muted/40 border-t-2 border-border">
                    <tr>
                      {report.columns.map((c) => {
                        const def = fieldDef(report.dataset, c);
                        const isMoney = c === "amount" || c === "annualRevenue";
                        if (def?.type !== "number") {
                          return <td key={c} className="px-3 py-1.5 text-[11px] uppercase font-semibold text-muted-foreground">
                            {c === report.columns[0] ? "Totals" : ""}
                          </td>;
                        }
                        return (
                          <td key={c} className="px-3 py-1.5 text-right font-bold tabular-nums">
                            {isMoney ? gbp(totals[c] ?? 0) : (totals[c] ?? 0).toLocaleString("en-GB")}
                          </td>
                        );
                      })}
                      {report.groupBy && <td />}
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Saved reports dialog */}
      <AlertDialog open={loadOpen} onOpenChange={setLoadOpen}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Saved Reports</AlertDialogTitle>
            <AlertDialogDescription>
              Your saved report definitions are stored in your browser, scoped to your user.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="max-h-[400px] overflow-y-auto -mx-2 px-2 space-y-1.5">
            {saved.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No saved reports yet.</p>
            ) : saved.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-3 rounded-md border border-border p-2 hover:bg-muted/30">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{s.name}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {DATASETS[s.dataset]?.label} · {s.filters.length} filter(s) · {s.columns.length} columns
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => loadReport(s)}>Load</Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive"
                    onClick={() => setPendingDeleteId(s.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!pendingDeleteId} onOpenChange={(o) => { if (!o) setPendingDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this saved report?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => pendingDeleteId && deleteReport(pendingDeleteId)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function renderValueInput(def: FieldDef, value: string, onChange: (v: string) => void) {
  if (def.type === "select" && def.options) {
    return (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 min-w-0 h-7 rounded border border-input bg-background px-2 text-xs"
      >
        <option value="">— select —</option>
        {def.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    );
  }
  if (def.type === "date") {
    return (
      <Input type="date" value={value} onChange={(e) => onChange(e.target.value)}
        className="flex-1 min-w-0 h-7 text-xs" />
    );
  }
  if (def.type === "number") {
    return (
      <Input type="number" value={value} onChange={(e) => onChange(e.target.value)}
        className="flex-1 min-w-0 h-7 text-xs" placeholder="0" />
    );
  }
  return (
    <Input value={value} onChange={(e) => onChange(e.target.value)}
      className="flex-1 min-w-0 h-7 text-xs" placeholder="value" />
  );
}
