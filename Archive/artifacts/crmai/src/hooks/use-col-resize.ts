import { useEffect, useRef, useState } from "react";

const MIN_WIDTH = 60;

export function useColResize<K extends string>(
  storageKey: string,
  keys: readonly K[],
  defaults: Record<K, number>,
) {
  const load = (): Record<K, number> => {
    if (typeof window === "undefined") return { ...defaults };
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return { ...defaults };
      const parsed = JSON.parse(raw) as Partial<Record<K, number>>;
      const merged: Record<K, number> = { ...defaults };
      for (const k of keys) {
        const v = parsed[k];
        if (typeof v === "number" && Number.isFinite(v) && v >= MIN_WIDTH) merged[k] = v;
      }
      return merged;
    } catch {
      return { ...defaults };
    }
  };

  const [widths, setWidths] = useState<Record<K, number>>(load);
  const draggingRef = useRef<{ key: K; startX: number; startWidth: number } | null>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(widths));
    } catch {
      // ignore
    }
  }, [widths, storageKey]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const d = draggingRef.current;
      if (!d) return;
      const delta = e.clientX - d.startX;
      const next = Math.max(MIN_WIDTH, d.startWidth + delta);
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

  const startResize = (key: K) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    draggingRef.current = { key, startX: e.clientX, startWidth: widths[key] };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  const resetWidths = () => setWidths({ ...defaults });

  return { widths, startResize, resetWidths };
}
