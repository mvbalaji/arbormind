export const BASE_CURRENCY = "GBP";

export type CurrencyCode = "GBP" | "USD";

export const SUPPORTED_CURRENCIES: CurrencyCode[] = ["GBP", "USD"];

export const CURRENCY_META: Record<CurrencyCode, { symbol: string; label: string; locale: string }> = {
  GBP: { symbol: "£", label: "British Pound", locale: "en-GB" },
  USD: { symbol: "$", label: "US Dollar", locale: "en-US" },
};

export type Rates = Record<string, number>;

export function isCurrencyCode(value: string | null | undefined): value is CurrencyCode {
  return value === "GBP" || value === "USD";
}

/** Convert an amount stored in the base currency (GBP) into the target currency. */
export function convertFromBase(baseAmount: number, target: CurrencyCode, rates: Rates): number {
  const rate = rates[target];
  if (!rate || target === BASE_CURRENCY) return baseAmount;
  return baseAmount * rate;
}

interface FormatOptions {
  /** Drop the decimal portion (e.g. compact table cells). */
  maximumFractionDigits?: number;
  minimumFractionDigits?: number;
}

/**
 * Format a base-currency (GBP) amount for display in `target`, converting via `rates`.
 * Falls back to base when the rate is missing so values are never hidden.
 */
export function formatMoney(
  baseAmount: number | null | undefined,
  target: CurrencyCode,
  rates: Rates,
  options: FormatOptions = {},
): string {
  const amount = convertFromBase(Number(baseAmount ?? 0), target, rates);
  const meta = CURRENCY_META[target] ?? CURRENCY_META.GBP;
  return new Intl.NumberFormat(meta.locale, {
    style: "currency",
    currency: target,
    minimumFractionDigits: options.minimumFractionDigits ?? 2,
    maximumFractionDigits: options.maximumFractionDigits ?? 2,
  }).format(amount);
}
