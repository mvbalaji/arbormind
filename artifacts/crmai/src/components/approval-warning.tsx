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

  return (
    <div className={`flex items-start gap-2 rounded-md border border-orange-500/40 bg-orange-500/10 px-3 py-2 text-sm text-orange-700 dark:text-orange-300 ${className ?? ""}`}>
      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
      <div className="flex-1">
        <div className="font-semibold">Approval required</div>
        <ul className="mt-1 space-y-0.5 text-xs">
          {matches.map((m, i) => (
            <li key={i}>
              • <span className="font-medium">{m.name}</span>
              {" — "}
              {FIELD_LABEL[m.field] ?? m.field} {OP_LABEL[m.operator] ?? m.operator} {m.threshold ?? ""}
              {m.levels > 1 && <span className="opacity-70"> ({m.levels} levels)</span>}
            </li>
          ))}
        </ul>
        <div className="mt-1 text-xs opacity-80">An approval request will be created when you save.</div>
      </div>
    </div>
  );
}
