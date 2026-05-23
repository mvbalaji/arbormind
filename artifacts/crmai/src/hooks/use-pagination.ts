import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/auth";

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100, 200] as const;
export type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

const DEFAULT_PAGE_SIZE: PageSize = 25;

function storageKey(userId: number | string | null | undefined, listKey: string) {
  return `crmai:pageSize:${userId ?? "anon"}:${listKey}`;
}

function readStored(userId: number | string | null | undefined, listKey: string): PageSize {
  if (typeof window === "undefined") return DEFAULT_PAGE_SIZE;
  try {
    const raw = window.localStorage.getItem(storageKey(userId, listKey));
    const n = raw ? parseInt(raw, 10) : NaN;
    if (PAGE_SIZE_OPTIONS.includes(n as PageSize)) return n as PageSize;
  } catch {}
  return DEFAULT_PAGE_SIZE;
}

export interface UsePaginationResult<T> {
  pageSize: PageSize;
  setPageSize: (n: PageSize) => void;
  page: number;
  setPage: (n: number) => void;
  totalPages: number;
  total: number;
  pageStart: number;
  pageEnd: number;
  paged: T[];
}

/**
 * Client-side pagination with per-user, per-list page-size persistence.
 *
 * @param listKey  Stable identifier for the list (e.g. "leads", "accounts").
 * @param items    The full filtered/sorted dataset.
 */
export function usePagination<T>(listKey: string, items: T[]): UsePaginationResult<T> {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [pageSize, setPageSizeState] = useState<PageSize>(() => readStored(userId, listKey));
  const [page, setPage] = useState(1);

  // When user logs in/out, re-load the stored preference for that user.
  useEffect(() => {
    setPageSizeState(readStored(userId, listKey));
    setPage(1);
  }, [userId, listKey]);

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // If the dataset shrinks below the current page, clamp.
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const setPageSize = (n: PageSize) => {
    setPageSizeState(n);
    setPage(1);
    try { window.localStorage.setItem(storageKey(userId, listKey), String(n)); } catch {}
  };

  const { paged, pageStart, pageEnd } = useMemo(() => {
    const start = (page - 1) * pageSize;
    const end = Math.min(start + pageSize, total);
    return { paged: items.slice(start, end), pageStart: total === 0 ? 0 : start + 1, pageEnd: end };
  }, [items, page, pageSize, total]);

  return { pageSize, setPageSize, page, setPage, totalPages, total, pageStart, pageEnd, paged };
}
