import { useCallback, useEffect, useMemo, useState } from "react";

export function useTabOrder<T extends string>(storageKey: string, defaultOrder: readonly T[]) {
  const [order, setOrder] = useState<T[]>(() => {
    if (typeof window === "undefined") return [...defaultOrder];
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return [...defaultOrder];
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return [...defaultOrder];
      const seen = new Set<string>();
      const filtered: T[] = [];
      for (const x of parsed) {
        if ((defaultOrder as readonly string[]).includes(x as string) && !seen.has(x as string)) {
          seen.add(x as string);
          filtered.push(x as T);
        }
      }
      const missing = defaultOrder.filter((x) => !seen.has(x));
      return [...filtered, ...missing] as T[];
    } catch {
      return [...defaultOrder];
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(order));
    } catch { /* ignore */ }
  }, [storageKey, order]);

  const move = useCallback((fromId: T, toId: T) => {
    setOrder((prev) => {
      if (fromId === toId) return prev;
      const next = [...prev];
      const fromIdx = next.indexOf(fromId);
      const toIdx = next.indexOf(toId);
      if (fromIdx < 0 || toIdx < 0) return prev;
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
  }, []);

  const reset = useCallback(() => setOrder([...defaultOrder]), [defaultOrder]);

  return useMemo(() => ({ order, move, reset, setOrder }), [order, move, reset]);
}
