import { useCallback, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Sparkles, RefreshCw, Phone, Mail, Calendar, CheckSquare, FileText, ArrowRight } from "lucide-react";

interface Action {
  title: string;
  reason: string;
  type: "call" | "email" | "meeting" | "task" | "note" | "stage_change";
  priority: "high" | "medium" | "low";
}

interface Props {
  entityType: "lead" | "opportunity" | "contact" | "account";
  entityId: number;
}

const TYPE_ICON: Record<Action["type"], React.ComponentType<{ className?: string }>> = {
  call: Phone, email: Mail, meeting: Calendar, task: CheckSquare, note: FileText, stage_change: ArrowRight,
};

const PRIORITY_COLOR: Record<Action["priority"], string> = {
  high: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30",
  medium: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  low: "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30",
};

export function AINextActions({ entityType, entityId }: Props) {
  const [actions, setActions] = useState<Action[] | null>(null);
  const [daysSince, setDaysSince] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchActions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/next-actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ entityType, id: entityId }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { actions: Action[]; daysSinceLastActivity: number | null };
      setActions(Array.isArray(data.actions) ? data.actions : []);
      setDaysSince(data.daysSinceLastActivity);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load suggestions");
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId]);

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">Next Best Actions</h3>
            {daysSince !== null && (
              <span className="text-xs text-muted-foreground">
                {daysSince === 0 ? "active today" : `${daysSince}d since last activity`}
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchActions}
            disabled={loading}
            data-testid="button-next-actions-refresh"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            {actions ? "Refresh" : "Suggest"}
          </Button>
        </div>

        {loading && !actions && (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        )}

        {error && <p className="text-xs text-destructive">{error}</p>}

        {!loading && !actions && !error && (
          <p className="text-xs text-muted-foreground">
            Get AI suggestions for what to do next with this {entityType}.
          </p>
        )}

        {actions && actions.length === 0 && (
          <p className="text-xs text-muted-foreground">No suggestions returned. Try refreshing.</p>
        )}

        {actions && actions.length > 0 && (
          <ul className="space-y-2">
            {actions.map((a, i) => {
              const Icon = TYPE_ICON[a.type] ?? CheckSquare;
              return (
                <li
                  key={i}
                  className="flex items-start gap-3 p-2.5 rounded-md bg-card border hover-elevate"
                  data-testid={`row-next-action-${i}`}
                >
                  <Icon className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{a.title}</span>
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${PRIORITY_COLOR[a.priority] ?? ""}`}>
                        {a.priority}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{a.reason}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
