import React, { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Zap, ChevronDown, ChevronUp, RefreshCw, Sparkles } from "lucide-react";

interface AISummaryProps {
  entityType: string;
  entityData?: Record<string, unknown>;
  context?: string;
  isLoading?: boolean;
}

export function AISummary({ entityType, entityData, context, isLoading }: AISummaryProps) {
  const [expanded, setExpanded] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);
  const [hasRequested, setHasRequested] = useState(false);

  const fetchAISummary = useCallback(async () => {
    setFetching(true);
    try {
      const res = await fetch("/api/ai/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          entityType,
          context: context ?? (entityData ? JSON.stringify(entityData) : undefined),
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setAiSummary(data.summary);
      setExpanded(true);
      setHasRequested(true);
    } catch {
      setAiSummary("Unable to generate AI summary at this time.");
      setHasRequested(true);
    } finally {
      setFetching(false);
    }
  }, [entityType, entityData, context]);

  if (isLoading) {
    return (
      <Card className="glass-panel border-primary/20 bg-primary/5">
        <CardContent className="p-4 space-y-2">
          <Skeleton className="h-4 w-24 bg-muted" />
          <Skeleton className="h-3 w-full bg-muted" />
          <Skeleton className="h-3 w-4/5 bg-muted" />
        </CardContent>
      </Card>
    );
  }

  if (!hasRequested) {
    return (
      <Card className="glass-panel border-primary/20 bg-primary/5">
        <CardContent className="p-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">AI Insights</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs border-primary/30 text-primary hover:bg-primary/10 gap-1.5"
            onClick={fetchAISummary}
            disabled={fetching}
          >
            {fetching ? (
              <>
                <RefreshCw className="w-3 h-3 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Zap className="w-3 h-3" />
                Generate Summary
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-panel border-primary/20 bg-primary/5">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-primary">AI Summary</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={fetchAISummary}
              disabled={fetching}
              className="text-muted-foreground hover:text-foreground transition-colors p-1"
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${fetching ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-muted-foreground hover:text-foreground transition-colors p-1"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>
        {expanded && aiSummary && (
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{aiSummary}</p>
        )}
        {!expanded && aiSummary && (
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">{aiSummary}</p>
        )}
      </CardContent>
    </Card>
  );
}
