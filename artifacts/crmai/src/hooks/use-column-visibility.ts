import { useEffect, useState } from "react";

export type ColumnDef<K extends string> = { key: K; label: string };

export function useColumnVisibility<K extends string>(
  storageKey: string,
  columns: ReadonlyArray<ColumnDef<K>>,
) {
  const allKeys = (): Set<K> => new Set(columns.map((c) => c.key));

  const load = (): Set<K> => {
    if (typeof window === "undefined") return allKeys();
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return allKeys();
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return allKeys();
      const valid = new Set(columns.map((c) => c.key as string));
      const filtered = (parsed as string[]).filter((k) => valid.has(k)) as K[];
      if (filtered.length === 0) return allKeys();
      return new Set(filtered);
    } catch {
      return allKeys();
    }
  };

  const [visible, setVisible] = useState<Set<K>>(() => load());

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(Array.from(visible)));
    } catch {
      // ignore quota errors
    }
  }, [storageKey, visible]);

  const toggle = (key: K) => {
    setVisible((prev) => {
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

  const isVisible = (key: K) => visible.has(key);
  const showAll = () => setVisible(allKeys());

  return { visible, isVisible, toggle, showAll, columns };
}
