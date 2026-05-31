import { useEffect, useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { Globe, Monitor, Smartphone, Tablet, Users, Eye, CalendarClock, ExternalLink } from "lucide-react";
import { Layout } from "@/components/layout";
import { ListPageHeader } from "@/components/list-page-header";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TablePagination } from "@/components/table-pagination";
import { type PageSize } from "@/hooks/use-pagination";
import { format } from "date-fns";

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

const API_BASE = import.meta.env.BASE_URL;

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

// Only http/https referrers are safe to render as clickable links. The ingest
// endpoint is public, so referrer is untrusted — never linkify javascript:/data:
// or other schemes (stored link-injection protection).
function safeHttpUrl(u: string | null): string | null {
  if (!u) return null;
  try {
    const proto = new URL(u).protocol;
    return proto === "http:" || proto === "https:" ? u : null;
  } catch {
    return null;
  }
}

function sourceLabel(referrer: string): string {
  try {
    return new URL(referrer).hostname.replace(/^www\./, "");
  } catch {
    return referrer;
  }
}

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

export default function WebsiteVisitors() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(50);

  // Debounce search input and reset to the first page when the term changes.
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const statsQuery = useQuery({
    queryKey: ["website-visits", "stats"],
    queryFn: async (): Promise<VisitStats> => {
      const r = await fetch(`${API_BASE}api/website-visits/stats`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed to load stats");
      return r.json();
    },
  });

  const visitsQuery = useQuery({
    queryKey: ["website-visits", "list", page, pageSize, debouncedSearch],
    queryFn: async (): Promise<{ data: WebsiteVisit[]; total: number }> => {
      const params = new URLSearchParams({ page: String(page), limit: String(pageSize) });
      if (debouncedSearch) params.set("search", debouncedSearch);
      const r = await fetch(`${API_BASE}api/website-visits?${params.toString()}`, {
        credentials: "include",
      });
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

  return (
    <Layout>
      <div className="space-y-4">
        <ListPageHeader
          icon={Globe}
          title="Website Visitors"
          viewLabel="arbormind.in traffic"
          search={{
            value: search,
            onChange: setSearch,
            placeholder: "Search by page, source, device, IP…",
          }}
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatCard icon={Eye} label="Total visits" value={statsQuery.data?.total ?? 0} loading={statsQuery.isLoading} />
          <StatCard icon={Users} label="Unique visitors" value={statsQuery.data?.unique ?? 0} loading={statsQuery.isLoading} />
          <StatCard icon={CalendarClock} label="Today" value={statsQuery.data?.today ?? 0} loading={statsQuery.isLoading} />
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
                  <th className="px-3 py-2 font-medium">Visitor</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="border-b border-border">
                      {Array.from({ length: 6 }).map((__, j) => (
                        <td key={j} className="px-3 py-2">
                          <Skeleton className="h-4 w-full max-w-[140px]" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : visitsQuery.isError ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-10 text-center text-muted-foreground">
                      Could not load website visits.
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-12 text-center text-muted-foreground">
                      <Globe className="h-8 w-8 mx-auto mb-2 opacity-40" />
                      No website visits captured yet.
                    </td>
                  </tr>
                ) : (
                  rows.map((v) => {
                    const device = deviceFromUA(v.userAgent);
                    const DeviceIcon =
                      device.kind === "mobile" ? Smartphone : device.kind === "tablet" ? Tablet : Monitor;
                    const safeRef = safeHttpUrl(v.referrer);
                    return (
                      <tr key={v.id} className="border-b border-border hover:bg-muted/40">
                        <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                          {format(new Date(v.visitedAt), "d MMM yyyy, HH:mm")}
                        </td>
                        <td className="px-3 py-2 font-medium">{v.path || "/"}</td>
                        <td className="px-3 py-2">
                          {safeRef ? (
                            <a
                              href={safeRef}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-primary hover:underline"
                            >
                              {sourceLabel(safeRef)}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : v.referrer ? (
                            <span>{sourceLabel(v.referrer)}</span>
                          ) : (
                            <span className="text-muted-foreground">Direct</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <span className="inline-flex items-center gap-1.5">
                            <DeviceIcon className="h-4 w-4 text-muted-foreground" />
                            {device.label}
                            <span className="text-muted-foreground">· {browserFromUA(v.userAgent)}</span>
                          </span>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-muted-foreground tabular-nums">
                          {v.ipAddress || "—"}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-muted-foreground font-mono text-xs">
                          {v.sessionId ? v.sessionId.slice(0, 8) : "—"}
                        </td>
                      </tr>
                    );
                  })
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
            onPageSizeChange={(n) => {
              setPageSize(n);
              setPage(1);
            }}
          />
        </Card>
      </div>
    </Layout>
  );
}
