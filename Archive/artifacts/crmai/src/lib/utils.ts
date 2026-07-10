import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** True when `date` falls within the last `days` (default 30) days. */
export function isRecentlyCreated(date?: string | null, days = 30): boolean {
  if (!date) return false
  const t = new Date(date).getTime()
  if (Number.isNaN(t)) return false
  return Date.now() - t < days * 86_400_000
}
