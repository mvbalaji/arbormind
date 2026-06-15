import { useEffect, useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import {
  Globe,
  Monitor,
  Smartphone,
  Tablet,
  Users,
  Eye,
  CalendarClock,
  ExternalLink,
  UserPlus,
  ChevronRight,
  ChevronDown,
  Network,
  Clock,
  LayoutList,
} from "lucide-react";
import { Layout } from "@/components/layout";
import { ListPageHeader } from "@/components/list-page-header";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TablePagination } from "@/components/table-pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { type PageSize } from "@/hooks/use-pagination";
import { format, formatDistanceToNow } from "date-fns";
import { useCreateLead } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const API_BASE = import.meta.env.BASE_URL;

// ─── Types ────────────────────────────────────────────────────────────────────

interface WebsiteVisit {
  id: number;
  sessionId: string | null;
  path: string | null;
  referrer: string | null;
  userAgent: string | null;
  ipAddress: string | null;
  visitedAt: string;
}

interface VisitStats {
  total: number;
  unique: number;
  today: number;
}

interface SessionRow {
  sessionId: string | null;
  visitCount: number;
  firstSeen: string;
  lastSeen: string;
  ipAddress: string | null;
  userAgent: string | null;
  referrer: string | null;
  paths: (string | null)[];
}

interface IpRow {
  ipAddress: string | null;
  visitCount: number;
  sessionCount: number;
  firstSeen: string;
  lastSeen: string;
  referrer: string | null;
  userAgent: string | null;
  paths: (string | null)[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function deviceFromUA(ua: string | null): { kind: "desktop" | "mobile" | "tablet"; label: string } {
  const s = (ua ?? "").toLowerCase();
  if (/ipad|tablet/.test(s)) return { kind: "tablet", label: "Tablet" };
  if (/mobi|iphone|android/.test(s)) return { kind: "mobile", label: "Mobile" };
  return { kind: "desktop", label: "Desktop" };
}

function browserFromUA(ua: string | null): string {
  const s = ua ?? "";
  if (/edg\//i.test(s)) return "Edge";
  if (/chrome|crios/i.test(s) && !/edg\//i.test(s)) return "Chrome";
  if (/firefox|fxios/i.test(s)) return "Firefox";
  if (/safari/i.test(s) && !/chrome|crios/i.test(s)) return "Safari";
  return "Unknown";
}

function safeHttpUrl(u: string | null): string | null {
  if (!u) return null;
  try {
    const proto = new URL(u).protocol;
    return proto === "http:" || proto === "https:" ? u : null;
  } catch {
    return null;
  }
}

function sourceLabel(referrer: string | null): string {
  if (!referrer) return "Direct";
  try {
    return new URL(referrer).hostname.replace(/^www\./, "");
  } catch {
    return referrer;
  }
}

function shortSession(id: string | null): string {
  return id ? id.slice(0, 8) : "—";
}

function buildVisitDescription(params: {
  path: string | null;
  paths?: (string | null)[];
  referrer: string | null;
  ipAddress: string | null;
  visitedAt?: string;
}): string {
  const page = params.path ?? params.paths?.[0] ?? "/";
  const allPages = params.paths ? [...new Set(params.paths.filter(Boolean))].join(", ") : page;
  const parts: string[] = [`Visited website via ${sourceLabel(params.referrer)}.`];
  if (allPages) parts.push(`Pages: ${allPages}.`);
  if (params.ipAddress) parts.push(`IP: ${params.ipAddress}.`);
  return parts.join(" ");
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  loading,
}: {
  icon: typeof Eye;
  label: string;
  value: number;
  loading: boolean;
}) {
  return (
    <Card className="p-4 flex items-center gap-3">
      <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        {loading ? (
          <Skeleton className="h-6 w-12 mt-1" />
        ) : (
          <div className="text-2xl font-semibold tabular-nums">{value.toLocaleString()}</div>
        )}
      </div>
    </Card>
  );
}

function SessionBadge({ id }: { id: string | null }) {
  if (!id) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-mono bg-muted text-muted-foreground select-all">
      {shortSession(id)}
    </span>
  );
}

function SourceCell({ referrer }: { referrer: string | null }) {
  const safeRef = safeHttpUrl(referrer);
  if (safeRef) {
    return (
      <a
        href={safeRef}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 text-primary hover:underline"
      >
        {sourceLabel(safeRef)}
        <ExternalLink className="h-3 w-3" />
      </a>
    );
  }
  if (referrer) return <span>{sourceLabel(referrer)}</span>;
  return <span className="text-muted-foreground">Direct</span>;
}

function DeviceCell({ ua }: { ua: string | null }) {
  const device = deviceFromUA(ua);
  const DeviceIcon = device.kind === "mobile" ? Smartphone : device.kind === "tablet" ? Tablet : Monitor;
  return (
    <span className="inline-flex items-center gap-1.5">
      <DeviceIcon className="h-4 w-4 text-muted-foreground" />
      {device.label}
      <span className="text-muted-foreground">· {browserFromUA(ua)}</span>
    </span>
  );
}

function PathPills({ paths }: { paths: (string | null)[] }) {
  const unique = [...new Set(paths.filter(Boolean))] as string[];
  return (
    <div className="flex flex-wrap gap-1">
      {unique.map((p, i) => (
        <span key={i} className="inline-block rounded bg-muted px-1.5 py-0.5 text-xs font-mono text-foreground">
          {p}
        </span>
      ))}
      {unique.length === 0 && <span className="text-muted-foreground text-xs">—</span>}
    </div>
  );
}

// ─── Create Lead Dialog ───────────────────────────────────────────────────────

interface LeadPrefill {
  referrer: string | null;
  ipAddress: string | null;
  paths?: (string | null)[];
  path?: string | null;
  userAgent?: string | null;
}

function CreateLeadDialog({ open, onOpenChange, prefill }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  prefill: LeadPrefill | null;
}) {
  const { toast } = useToast();
  const createMutation = useCreateLead();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    company: "",
    title: "",
  });

  useEffect(() => {
    if (open) {
      setForm({ firstName: "", lastName: "", email: "", phone: "", company: "", title: "" });
    }
  }, [open]);

  const f = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim()) return;
    createMutation.mutate(
      {
        data: {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim() || undefined,
          phone: form.phone.trim() || undefined,
          company: form.company.trim() || undefined,
          title: form.title.trim() || undefined,
          source: "website",
          status: "new",
          description: buildVisitDescription({
            path: prefill?.path ?? null,
            paths: prefill?.paths,
            referrer: prefill?.referrer ?? null,
            ipAddress: prefill?.ipAddress ?? null,
          }),
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Lead created", description: `${form.firstName} ${form.lastName} added as a new lead.` });
          onOpenChange(false);
        },
        onError: () => toast({ title: "Error", description: "Failed to create lead.", variant: "destructive" }),
      },
    );
  };

  const inp = "w-full h-9 px-3 rounded-md bg-card border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader className="border-b border-border pb-3">
          <DialogTitle className="text-base font-semibold">Create Lead from Visit</DialogTitle>
        </DialogHeader>

        {prefill && (
          <div className="rounded-md bg-muted/50 border border-border p-3 text-xs text-muted-foreground space-y-1">
            {(prefill.paths ?? [prefill.path]).filter(Boolean).length > 0 && (
              <div><span className="font-medium text-foreground">Pages:</span>{" "}
                {[...new Set((prefill.paths ?? [prefill.path]).filter(Boolean))].join(", ")}
              </div>
            )}
            {prefill.referrer && (
              <div><span className="font-medium text-foreground">Source:</span> {sourceLabel(prefill.referrer)}</div>
            )}
            {prefill.ipAddress && (
              <div><span className="font-medium text-foreground">IP:</span> {prefill.ipAddress}</div>
            )}
            {prefill.userAgent && (
              <div><span className="font-medium text-foreground">Device:</span>{" "}
                {deviceFromUA(prefill.userAgent).label} · {browserFromUA(prefill.userAgent)}
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">First Name *</Label>
              <input required className={inp} value={form.firstName} onChange={f("firstName")} autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Last Name *</Label>
              <input required className={inp} value={form.lastName} onChange={f("lastName")} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Email</Label>
              <input type="email" className={inp} value={form.email} onChange={f("email")} placeholder="user@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Phone</Label>
              <input className={inp} value={form.phone} onChange={f("phone")} placeholder="+91 9876543210" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Company</Label>
              <input className={inp} value={form.company} onChange={f("company")} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Title</Label>
              <input className={inp} value={form.title} onChange={f("title")} />
            </div>
          </div>
          <DialogFooter className="pt-3 border-t border-border gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button
              type="submit"
              size="sm"
              disabled={createMutation.isPending || !form.firstName.trim() || !form.lastName.trim()}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {createMutation.isPending ? "Creating…" : "Create Lead"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Tab bar ──────────────────────────────────────────────────────────────────

type Tab = "timeline" | "sessions" | "by-ip";

function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  const tabs: { id: Tab; label: string; icon: typeof LayoutList }[] = [
    { id: "timeline", label: "Timeline", icon: LayoutList },
    { id: "sessions", label: "By Session", icon: Clock },
    { id: "by-ip", label: "By IP", icon: Network },
  ];
  return (
    <div className="flex gap-1 border-b border-border">
      {tabs.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-2 text-sm border-b-2 -mb-px transition-colors",
            active === id
              ? "border-primary text-primary font-medium"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          <Icon className="h-3.5 w-3.5" />
          {label}
        </button>
      ))}
    </div>
  );
}

// ─── Timeline Tab ─────────────────────────────────────────────────────────────

function TimelineTab() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(50);
  const [leadPrefill, setLeadPrefill] = useState<LeadPrefill | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const visitsQuery = useQuery({
    queryKey: ["website-visits", "list", page, pageSize, debouncedSearch],
    queryFn: async (): Promise<{ data: WebsiteVisit[]; total: number }> => {
      const params = new URLSearchParams({ page: String(page), limit: String(pageSize) });
      if (debouncedSearch) params.set("search", debouncedSearch);
      const r = await fetch(`${API_BASE}api/website-visits?${params.toString()}`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed to load visits");
      return r.json();
    },
    placeholderData: keepPreviousData,
  });

  const rows = visitsQuery.data?.data ?? [];
  const total = visitsQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pageStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const pageEnd = Math.min(page * pageSize, total);
  const loading = visitsQuery.isLoading;

  const openCreate = (v: WebsiteVisit) => {
    setLeadPrefill({
      referrer: v.referrer,
      ipAddress: v.ipAddress,
      path: v.path,
      userAgent: v.userAgent,
    });
    setDialogOpen(true);
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by page, source, IP…"
          className="h-8 text-sm max-w-xs"
        />
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2 font-medium">Visited</th>
                <th className="px-3 py-2 font-medium">Page</th>
                <th className="px-3 py-2 font-medium">Source</th>
                <th className="px-3 py-2 font-medium">Device</th>
                <th className="px-3 py-2 font-medium">IP</th>
                <th className="px-3 py-2 font-medium">Session</th>
                <th className="px-3 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    {Array.from({ length: 7 }).map((__, j) => (
                      <td key={j} className="px-3 py-2">
                        <Skeleton className="h-4 w-full max-w-[140px]" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : visitsQuery.isError ? (
                <tr>
                  <td colSpan={7} className="px-3 py-10 text-center text-muted-foreground">
                    Could not load website visits.
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-12 text-center text-muted-foreground">
                    <Globe className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    No website visits captured yet.
                  </td>
                </tr>
              ) : (
                rows.map((v) => (
                  <tr key={v.id} className="border-b border-border hover:bg-muted/40">
                    <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                      {format(new Date(v.visitedAt), "d MMM yyyy, HH:mm")}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs font-medium">{v.path || "/"}</td>
                    <td className="px-3 py-2"><SourceCell referrer={v.referrer} /></td>
                    <td className="px-3 py-2"><DeviceCell ua={v.userAgent} /></td>
                    <td className="px-3 py-2 whitespace-nowrap text-muted-foreground tabular-nums text-xs">
                      {v.ipAddress || "—"}
                    </td>
                    <td className="px-3 py-2"><SessionBadge id={v.sessionId} /></td>
                    <td className="px-3 py-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 gap-1 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => openCreate(v)}
                        title="Create lead from this visit"
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        Lead
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <TablePagination
          page={page}
          totalPages={totalPages}
          pageSize={pageSize}
          total={total}
          pageStart={pageStart}
          pageEnd={pageEnd}
          onPageChange={setPage}
          onPageSizeChange={(n) => { setPageSize(n); setPage(1); }}
        />
      </Card>

      <CreateLeadDialog open={dialogOpen} onOpenChange={setDialogOpen} prefill={leadPrefill} />
    </>
  );
}

// ─── Sessions Tab ─────────────────────────────────────────────────────────────

function SessionsTab() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [leadPrefill, setLeadPrefill] = useState<LeadPrefill | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const query = useQuery({
    queryKey: ["website-visits", "by-session"],
    queryFn: async (): Promise<SessionRow[]> => {
      const r = await fetch(`${API_BASE}api/website-visits/by-session`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
  });

  const rows = query.data ?? [];

  const openCreate = (s: SessionRow) => {
    setLeadPrefill({ referrer: s.referrer, ipAddress: s.ipAddress, paths: s.paths, userAgent: s.userAgent });
    setDialogOpen(true);
  };

  if (query.isLoading) {
    return (
      <Card className="overflow-hidden">
        <div className="p-4 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      </Card>
    );
  }

  if (query.isError) {
    return <Card className="p-8 text-center text-muted-foreground">Could not load session data.</Card>;
  }

  if (rows.length === 0) {
    return (
      <Card className="p-12 text-center text-muted-foreground">
        <Clock className="h-8 w-8 mx-auto mb-2 opacity-40" />
        No sessions recorded yet.
      </Card>
    );
  }

  return (
    <>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2 w-6"></th>
                <th className="px-3 py-2 font-medium">Session</th>
                <th className="px-3 py-2 font-medium">Pages</th>
                <th className="px-3 py-2 font-medium">Source</th>
                <th className="px-3 py-2 font-medium">Device</th>
                <th className="px-3 py-2 font-medium">IP</th>
                <th className="px-3 py-2 font-medium">Last seen</th>
                <th className="px-3 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s, idx) => {
                const key = s.sessionId ?? `idx-${idx}`;
                const isExpanded = expanded === key;
                return [
                  <tr
                    key={key}
                    className={cn("border-b border-border hover:bg-muted/40 cursor-pointer", isExpanded && "bg-muted/30")}
                    onClick={() => setExpanded(isExpanded ? null : key)}
                  >
                    <td className="px-3 py-2 text-muted-foreground">
                      {isExpanded
                        ? <ChevronDown className="h-3.5 w-3.5" />
                        : <ChevronRight className="h-3.5 w-3.5" />}
                    </td>
                    <td className="px-3 py-2">
                      <SessionBadge id={s.sessionId} />
                    </td>
                    <td className="px-3 py-2 tabular-nums text-muted-foreground">
                      {s.visitCount} {s.visitCount === 1 ? "page" : "pages"}
                    </td>
                    <td className="px-3 py-2"><SourceCell referrer={s.referrer} /></td>
                    <td className="px-3 py-2"><DeviceCell ua={s.userAgent} /></td>
                    <td className="px-3 py-2 text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                      {s.ipAddress || "—"}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(s.lastSeen), { addSuffix: true })}
                    </td>
                    <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 gap-1 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => openCreate(s)}
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        Lead
                      </Button>
                    </td>
                  </tr>,
                  isExpanded && (
                    <tr key={`${key}-detail`} className="border-b border-border bg-muted/20">
                      <td colSpan={8} className="px-6 py-3">
                        <div className="text-xs text-muted-foreground mb-1.5 font-medium uppercase tracking-wide">
                          Pages visited in order
                        </div>
                        <ol className="space-y-1">
                          {s.paths.map((p, i) => (
                            <li key={i} className="flex items-center gap-2 text-xs">
                              <span className="w-4 h-4 rounded-full bg-primary/15 text-primary flex items-center justify-center font-medium shrink-0">
                                {i + 1}
                              </span>
                              <span className="font-mono text-foreground">{p || "/"}</span>
                            </li>
                          ))}
                        </ol>
                        <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                          <span>First: {format(new Date(s.firstSeen), "d MMM yyyy, HH:mm")}</span>
                          <span>Last: {format(new Date(s.lastSeen), "d MMM yyyy, HH:mm")}</span>
                        </div>
                      </td>
                    </tr>
                  ),
                ];
              })}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 border-t border-border text-xs text-muted-foreground">
          {rows.length.toLocaleString()} unique sessions
        </div>
      </Card>

      <CreateLeadDialog open={dialogOpen} onOpenChange={setDialogOpen} prefill={leadPrefill} />
    </>
  );
}

// ─── By IP Tab ────────────────────────────────────────────────────────────────

function ByIpTab() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [leadPrefill, setLeadPrefill] = useState<LeadPrefill | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const query = useQuery({
    queryKey: ["website-visits", "by-ip"],
    queryFn: async (): Promise<IpRow[]> => {
      const r = await fetch(`${API_BASE}api/website-visits/by-ip`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
  });

  const rows = query.data ?? [];

  const openCreate = (row: IpRow) => {
    setLeadPrefill({ referrer: row.referrer, ipAddress: row.ipAddress, paths: row.paths, userAgent: row.userAgent });
    setDialogOpen(true);
  };

  if (query.isLoading) {
    return (
      <Card className="overflow-hidden">
        <div className="p-4 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      </Card>
    );
  }

  if (query.isError) {
    return <Card className="p-8 text-center text-muted-foreground">Could not load IP data.</Card>;
  }

  if (rows.length === 0) {
    return (
      <Card className="p-12 text-center text-muted-foreground">
        <Network className="h-8 w-8 mx-auto mb-2 opacity-40" />
        No IP data yet.
      </Card>
    );
  }

  return (
    <>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2 w-6"></th>
                <th className="px-3 py-2 font-medium">IP Address</th>
                <th className="px-3 py-2 font-medium">Visits</th>
                <th className="px-3 py-2 font-medium">Sessions</th>
                <th className="px-3 py-2 font-medium">Source</th>
                <th className="px-3 py-2 font-medium">Last seen</th>
                <th className="px-3 py-2 font-medium">Pages</th>
                <th className="px-3 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => {
                const key = row.ipAddress ?? `idx-${idx}`;
                const isExpanded = expanded === key;
                return [
                  <tr
                    key={key}
                    className={cn("border-b border-border hover:bg-muted/40 cursor-pointer", isExpanded && "bg-muted/30")}
                    onClick={() => setExpanded(isExpanded ? null : key)}
                  >
                    <td className="px-3 py-2 text-muted-foreground">
                      {isExpanded
                        ? <ChevronDown className="h-3.5 w-3.5" />
                        : <ChevronRight className="h-3.5 w-3.5" />}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs font-medium tabular-nums whitespace-nowrap">
                      {row.ipAddress || "—"}
                    </td>
                    <td className="px-3 py-2 tabular-nums text-muted-foreground">{row.visitCount}</td>
                    <td className="px-3 py-2 tabular-nums text-muted-foreground">{row.sessionCount}</td>
                    <td className="px-3 py-2"><SourceCell referrer={row.referrer} /></td>
                    <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(row.lastSeen), { addSuffix: true })}
                    </td>
                    <td className="px-3 py-2 max-w-[240px]">
                      <PathPills paths={row.paths} />
                    </td>
                    <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 gap-1 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => openCreate(row)}
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        Lead
                      </Button>
                    </td>
                  </tr>,
                  isExpanded && (
                    <tr key={`${key}-detail`} className="border-b border-border bg-muted/20">
                      <td colSpan={8} className="px-6 py-3">
                        <div className="text-xs text-muted-foreground mb-1.5 font-medium uppercase tracking-wide">
                          All pages visited from this IP
                        </div>
                        <PathPills paths={row.paths} />
                        <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                          <span>First seen: {format(new Date(row.firstSeen), "d MMM yyyy, HH:mm")}</span>
                          <span>Last seen: {format(new Date(row.lastSeen), "d MMM yyyy, HH:mm")}</span>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                          IP addresses give a rough location (city/ISP) but don't identify the person. Use "Create Lead"
                          to log this as an inbound interest and follow up manually.
                        </p>
                      </td>
                    </tr>
                  ),
                ];
              })}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 border-t border-border text-xs text-muted-foreground">
          {rows.length.toLocaleString()} unique IP addresses
        </div>
      </Card>

      <CreateLeadDialog open={dialogOpen} onOpenChange={setDialogOpen} prefill={leadPrefill} />
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WebsiteVisitors() {
  const [activeTab, setActiveTab] = useState<Tab>("timeline");

  const statsQuery = useQuery({
    queryKey: ["website-visits", "stats"],
    queryFn: async (): Promise<VisitStats> => {
      const r = await fetch(`${API_BASE}api/website-visits/stats`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed to load stats");
      return r.json();
    },
  });

  return (
    <Layout>
      <div className="space-y-4">
        <ListPageHeader
          icon={Globe}
          title="Website Visitors"
          viewLabel="arbormind.in traffic"
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatCard icon={Eye} label="Total visits" value={statsQuery.data?.total ?? 0} loading={statsQuery.isLoading} />
          <StatCard icon={Users} label="Unique sessions" value={statsQuery.data?.unique ?? 0} loading={statsQuery.isLoading} />
          <StatCard icon={CalendarClock} label="Today" value={statsQuery.data?.today ?? 0} loading={statsQuery.isLoading} />
        </div>

        <TabBar active={activeTab} onChange={setActiveTab} />

        {activeTab === "timeline" && <TimelineTab />}
        {activeTab === "sessions" && <SessionsTab />}
        {activeTab === "by-ip" && <ByIpTab />}
      </div>
    </Layout>
  );
}
