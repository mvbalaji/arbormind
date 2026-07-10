import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";

interface MatchedRule {
  name: string;
  field: string;
  operator: string;
  threshold: string | null;
  levels: number;
}

interface Props {
  entity: "account" | "opportunity" | "quote" | "order";
  snapshot: Record<string, number | string | null | undefined>;
  className?: string;
}

const OP_LABEL: Record<string, string> = {
  gt: ">", gte: "≥", lt: "<", lte: "≤", eq: "=", neq: "≠", contains: "contains",
};

const FIELD_LABEL: Record<string, string> = {
  discountPercent: "Discount %",
  discountPct: "Discount %",
  discount: "Discount %",
  marginPercent: "Margin %",
  marginPct: "Margin %",
  amount: "Amount",
  total: "Total",
  probability: "Probability",
  creditScore: "Credit score",
};

export function ApprovalWarning({ entity, snapshot, className }: Props) {
  const [matches, setMatches] = useState<MatchedRule[]>([]);
  const key = JSON.stringify(snapshot);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const res = await fetch("/api/approvals/preview", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ entity, snapshot }),
        });
        if (!res.ok) { if (!cancelled) setMatches([]); return; }
        const json = await res.json();
        if (!cancelled) setMatches(Array.isArray(json?.data) ? json.data : []);
      } catch { if (!cancelled) setMatches([]); }
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [entity, key]);

  if (matches.length === 0) return null;

  const summary = matches
    .map(m => `${m.name} (${FIELD_LABEL[m.field] ?? m.field} ${OP_LABEL[m.operator] ?? m.operator} ${m.threshold ?? ""}${m.levels > 1 ? `, ${m.levels} levels` : ""})`)
    .join("; ");

  return (
    <div
      className={`flex items-center gap-1.5 text-xs text-orange-600 dark:text-orange-400 truncate ${className ?? ""}`}
      title={summary}
    >
      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
      <span className="truncate">
        Approval required on save: <span className="font-medium">{summary}</span>
      </span>
    </div>
  );
}
