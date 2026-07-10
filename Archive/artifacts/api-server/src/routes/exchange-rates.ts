import { Router, type IRouter } from "express";

const router: IRouter = Router();

const BASE_CURRENCY = "GBP";
const SUPPORTED = ["GBP", "USD"] as const;
const PROVIDER_URL = `https://open.er-api.com/v6/latest/${BASE_CURRENCY}`;
const TTL_MS = 6 * 60 * 60 * 1000; // refresh at most every 6 hours when fresh
const RETRY_TTL_MS = 5 * 60 * 1000; // retry quickly (5 min) while serving stale/fallback rates

// Static fallback so the app keeps working if the provider is unreachable
// on the very first request. Approximate GBP-based rates.
const FALLBACK_RATES: Record<string, number> = { GBP: 1, USD: 1.27 };

interface RateCache {
  base: string;
  rates: Record<string, number>;
  fetchedAt: number;
  stale: boolean;
}

let cache: RateCache | null = null;
let inFlight: Promise<RateCache> | null = null;

async function fetchRates(): Promise<RateCache> {
  const res = await fetch(PROVIDER_URL, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`rate provider responded ${res.status}`);
  const body = (await res.json()) as {
    result?: string;
    base_code?: string;
    rates?: Record<string, number>;
  };
  if (body.result !== "success" || !body.rates) {
    throw new Error("rate provider returned an unexpected payload");
  }
  const rates: Record<string, number> = {};
  for (const code of SUPPORTED) {
    rates[code] = code === BASE_CURRENCY ? 1 : body.rates[code] ?? FALLBACK_RATES[code] ?? 1;
  }
  return { base: BASE_CURRENCY, rates, fetchedAt: Date.now(), stale: false };
}

async function getRates(): Promise<RateCache> {
  // Stale/fallback caches are retried soon; good caches are honoured for the full TTL.
  const ttl = cache?.stale ? RETRY_TTL_MS : TTL_MS;
  const fresh = cache && Date.now() - cache.fetchedAt < ttl;
  if (fresh && cache) return cache;

  if (!inFlight) {
    inFlight = fetchRates()
      .then((next) => {
        cache = next;
        return next;
      })
      .catch((err) => {
        console.error("[exchange-rates] fetch failed:", err);
        // Serve last-good cache (marked stale) or static fallback.
        if (cache) {
          cache = { ...cache, stale: true };
          return cache;
        }
        cache = {
          base: BASE_CURRENCY,
          rates: { ...FALLBACK_RATES },
          fetchedAt: Date.now(),
          stale: true,
        };
        return cache;
      })
      .finally(() => {
        inFlight = null;
      });
  }
  return inFlight;
}

router.get("/exchange-rates", async (_req, res) => {
  try {
    const data = await getRates();
    res.json(data);
  } catch (err) {
    console.error("[exchange-rates] handler error:", err);
    res.json({
      base: BASE_CURRENCY,
      rates: { ...FALLBACK_RATES },
      fetchedAt: Date.now(),
      stale: true,
    });
  }
});

export default router;
