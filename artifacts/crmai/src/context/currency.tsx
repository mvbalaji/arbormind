import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  BASE_CURRENCY, SUPPORTED_CURRENCIES, type CurrencyCode, type Rates,
  formatMoney, isCurrencyCode,
} from "@/lib/currency";

const STORAGE_KEY = "crm-display-currency";

interface RatesResponse {
  base: string;
  rates: Rates;
  fetchedAt: number;
  stale: boolean;
}

interface CurrencyContextValue {
  displayCurrency: CurrencyCode;
  setDisplayCurrency: (code: CurrencyCode) => void;
  supported: CurrencyCode[];
  rates: Rates;
  isStale: boolean;
  /** Format a base-currency (GBP) amount in the active display currency. */
  format: (baseAmount: number | null | undefined, options?: { maximumFractionDigits?: number; minimumFractionDigits?: number }) => string;
}

const CurrencyContext = createContext<CurrencyContextValue>({
  displayCurrency: BASE_CURRENCY as CurrencyCode,
  setDisplayCurrency: () => {},
  supported: SUPPORTED_CURRENCIES,
  rates: { GBP: 1, USD: 1 },
  isStale: false,
  format: (amount) => `£${Number(amount ?? 0).toFixed(2)}`,
});

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [displayCurrency, setDisplayCurrencyState] = useState<CurrencyCode>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isCurrencyCode(stored) ? stored : (BASE_CURRENCY as CurrencyCode);
  });
  const [rates, setRates] = useState<Rates>({ GBP: 1, USD: 1 });
  const [isStale, setIsStale] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const base = import.meta.env.BASE_URL;
    const loadRates = () => {
      fetch(`${base}api/exchange-rates`, { credentials: "include" })
        .then((res) => (res.ok ? (res.json() as Promise<RatesResponse>) : Promise.reject(new Error("rates fetch failed"))))
        .then((data) => {
          if (cancelled) return;
          if (data?.rates) setRates(data.rates);
          setIsStale(!!data?.stale);
        })
        .catch(() => {
          // Keep the safe defaults; conversion falls back to base amounts.
          if (!cancelled) setIsStale(true);
        });
    };
    loadRates();
    // Keep long-lived sessions reasonably fresh without a page reload.
    const interval = setInterval(loadRates, 60 * 60 * 1000); // hourly
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  const setDisplayCurrency = (code: CurrencyCode) => {
    setDisplayCurrencyState(code);
    localStorage.setItem(STORAGE_KEY, code);
  };

  const value = useMemo<CurrencyContextValue>(() => ({
    displayCurrency,
    setDisplayCurrency,
    supported: SUPPORTED_CURRENCIES,
    rates,
    isStale,
    format: (amount, options) => formatMoney(amount, displayCurrency, rates, options),
  }), [displayCurrency, rates, isStale]);

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export const useCurrency = () => useContext(CurrencyContext);
