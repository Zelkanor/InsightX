"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { POPULAR_STOCK_SYMBOLS } from "@/lib/constants";
import {
  formatArticle,
  formatChangePercent,
  formatMarketCapValue,
  formatPrice,
  getDateRange,
  type ValidatedArticle,
  validateArticle,
} from "@/lib/utils";
import { auth } from "../better-auth/auth";
import { getWatchlistSymbolsByEmail } from "./watchlist.action";

const FINNHUB_BASE_URL = "https://finnhub.io/api/v1";

// ── Rate-limit error ────────────────────────────────────────────────
export class RateLimitError extends Error {
  constructor(message = "API rate limit exceeded. Please try again later.") {
    super(message);
    this.name = "RateLimitError";
  }
}

// ── Concurrency limiter (p-limit style) ─────────────────────────────
function createConcurrencyLimiter(concurrency: number) {
  let active = 0;
  const queue: Array<() => void> = [];

  function next() {
    if (queue.length > 0 && active < concurrency) {
      active++;
      const run = queue.shift();
      if (run) run();
    }
  }

  return function limit<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      queue.push(() => {
        fn()
          .then(resolve)
          .catch(reject)
          .finally(() => {
            active--;
            next();
          });
      });
      next();
    });
  };
}

// Shared limiter for Finnhub requests (max 8 concurrent)
const finnhubLimit = createConcurrencyLimiter(8);

// ── In-memory quote cache (30s TTL) ─────────────────────────────────
const quoteCache = new Map<string, { data: QuoteData; expiresAt: number }>();
const QUOTE_CACHE_TTL_MS = 30_000;

function getCachedQuote(symbol: string): QuoteData | null {
  const entry = quoteCache.get(symbol);
  if (entry && Date.now() < entry.expiresAt) return entry.data;
  if (entry) quoteCache.delete(symbol);
  return null;
}

function setCachedQuote(symbol: string, data: QuoteData): void {
  quoteCache.set(symbol, { data, expiresAt: Date.now() + QUOTE_CACHE_TTL_MS });
}

type FinnhubProfile = {
  name?: string;
  ticker?: string;
  exchange?: string;
} | null;

type FinnhubSearchResultWithExchange = FinnhubSearchResult & {
  __exchange?: string;
};

export async function fetchJSON<T>(
  url: string,
  revalidateSeconds?: number,
  maxRetries = 2,
): Promise<T> {
  const options: RequestInit & { next?: { revalidate?: number } } =
    revalidateSeconds
      ? { cache: "force-cache", next: { revalidate: revalidateSeconds } }
      : { cache: "no-store" };

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await fetch(url, options);

    if (res.status === 429) {
      // On last attempt, throw rate-limit error
      if (attempt === maxRetries) {
        throw new RateLimitError();
      }
      // Exponential backoff: 1s, 2s
      const backoff = 1000 * 2 ** attempt;
      await new Promise((r) => setTimeout(r, backoff));
      continue;
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Fetch failed ${res.status}: ${text}`);
    }
    return (await res.json()) as T;
  }

  // Should not reach here, but satisfy TS
  throw new Error("fetchJSON: unexpected retry loop exit");
}

export async function getNews(
  symbols?: string[],
): Promise<MarketNewsArticle[]> {
  try {
    const range = getDateRange(5);
    const token = process.env.FINNHUB_API_KEY;
    if (!token) {
      throw new Error("FINNHUB API key is not configured");
    }
    const cleanSymbols = (symbols || [])
      .map((s) => s?.trim().toUpperCase())
      .filter((s): s is string => Boolean(s));

    const maxArticles = 6;

    // If we have symbols, try to fetch company news per symbol and round-robin select
    if (cleanSymbols.length > 0) {
      const perSymbolArticles: Record<string, RawNewsArticle[]> = {};

      await Promise.all(
        cleanSymbols.map(async (sym) => {
          try {
            const url = `${FINNHUB_BASE_URL}/company-news?symbol=${encodeURIComponent(sym)}&from=${range.from}&to=${range.to}&token=${token}`;
            const articles = await fetchJSON<RawNewsArticle[]>(url, 300);
            perSymbolArticles[sym] = (articles || []).filter(validateArticle);
          } catch (e) {
            console.error("Error fetching company news for", sym, e);
            perSymbolArticles[sym] = [];
          }
        }),
      );

      const collected: MarketNewsArticle[] = [];
      // Round-robin up to 6 picks
      for (let round = 0; round < maxArticles; round++) {
        for (let i = 0; i < cleanSymbols.length; i++) {
          const sym = cleanSymbols[i];
          const list = perSymbolArticles[sym] || [];
          if (list.length === 0) continue;
          const article = list.shift();
          if (!article || !validateArticle(article)) continue;
          collected.push(
            formatArticle(article as ValidatedArticle, true, sym, round),
          );
          if (collected.length >= maxArticles) break;
        }
        if (collected.length >= maxArticles) break;
      }

      if (collected.length > 0) {
        // Sort by datetime desc
        collected.sort((a, b) => (b.datetime || 0) - (a.datetime || 0));
        return collected.slice(0, maxArticles);
      }
      // If none collected, fall through to general news
    }

    // General market news fallback or when no symbols provided
    const generalUrl = `${FINNHUB_BASE_URL}/news?category=general&token=${token}`;
    const general = await fetchJSON<RawNewsArticle[]>(generalUrl, 300);

    const seen = new Set<string>();
    const unique: RawNewsArticle[] = [];
    for (const art of general || []) {
      if (!validateArticle(art)) continue;
      const key = `${art.id}-${art.url}-${art.headline}`;
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(art);
      if (unique.length >= 20) break; // cap early before final slicing
    }

    const formatted = unique
      .slice(0, maxArticles)
      .map((a, idx) =>
        formatArticle(a as ValidatedArticle, false, undefined, idx),
      );
    return formatted;
  } catch (err) {
    console.error("getNews error:", err);
    throw new Error("Failed to fetch news");
  }
}

export const searchStocks = cache(
  async (query?: string): Promise<StockWithWatchlistStatus[]> => {
    try {
      const session = await auth.api.getSession({
        headers: await headers(),
      });
      if (!session?.user) redirect("/sign-in");

      const userWatchlistSymbols = await getWatchlistSymbolsByEmail(
        session.user.email,
      );

      const token = process.env.FINNHUB_API_KEY;
      if (!token) {
        // If no token, log and return empty to avoid throwing per requirements
        console.error(
          "Error in stock search:",
          new Error("FINNHUB API key is not configured"),
        );
        return [];
      }

      const trimmed = typeof query === "string" ? query.trim() : "";

      let results: FinnhubSearchResult[] = [];

      if (!trimmed) {
        // Fetch top 10 popular symbols' profiles
        const top = POPULAR_STOCK_SYMBOLS.slice(0, 10);
        const profiles = await Promise.all(
          top.map(async (sym) => {
            try {
              const url = `${FINNHUB_BASE_URL}/stock/profile2?symbol=${encodeURIComponent(
                sym,
              )}&token=${token}`;
              // Revalidate every hour
              const profile = await fetchJSON<FinnhubProfile>(url, 3600);
              return { sym, profile };
            } catch (e) {
              console.error("Error fetching profile2 for", sym, e);
              return { sym, profile: null as FinnhubProfile };
            }
          }),
        );

        results = profiles
          .map(
            ({ sym, profile }): FinnhubSearchResultWithExchange | undefined => {
              const symbol = sym.toUpperCase();
              const name = profile?.name ?? profile?.ticker;
              if (!name) return undefined;
              return {
                symbol,
                description: name,
                displaySymbol: symbol,
                type: "Common Stock",
                __exchange: profile?.exchange,
              };
            },
          )
          .filter((x): x is FinnhubSearchResultWithExchange => Boolean(x));
      } else {
        const url = `${FINNHUB_BASE_URL}/search?q=${encodeURIComponent(
          trimmed,
        )}&token=${token}`;
        const data = await fetchJSON<FinnhubSearchResponse>(url, 1800);
        results = Array.isArray(data?.result) ? data.result : [];
      }

      const mapped: StockWithWatchlistStatus[] = results
        .map((r): StockWithWatchlistStatus => {
          const symbol = (r.symbol || "").toUpperCase();
          const name = r.description || symbol;
          const extendedExchange = (r as FinnhubSearchResultWithExchange)
            .__exchange;
          const exchange = extendedExchange ?? r.displaySymbol ?? "US";
          return {
            symbol,
            name,
            exchange,
            type: r.type || "Stock",
            isInWatchlist: userWatchlistSymbols.includes(symbol),
          };
        })
        .slice(0, 15);

      return mapped;
    } catch (err) {
      if (err instanceof RateLimitError) throw err;
      console.error("Error in stock search:", err);
      return [];
    }
  },
);

// Fetch stock details by symbol
export const getStocksDetails = cache(async (symbol: string) => {
  const cleanSymbol = symbol.trim().toUpperCase();

  const token = process.env.FINNHUB_API_KEY;
  if (!token) {
    // If no token, log and return empty to avoid throwing per requirements
    console.error(
      "Error in stock search:",
      new Error("FINNHUB API key is not configured"),
    );
    return null;
  }

  try {
    // Use cached quote if available
    const cachedQuote = getCachedQuote(cleanSymbol);

    const [quote, profile, financials] = await Promise.all([
      cachedQuote
        ? Promise.resolve(cachedQuote)
        : finnhubLimit(() =>
            fetchJSON<QuoteData>(
              `${FINNHUB_BASE_URL}/quote?symbol=${cleanSymbol}&token=${token}`,
            ),
          ),
      finnhubLimit(() =>
        fetchJSON<ProfileData>(
          // Company info - cache 1hr (rarely changes)
          `${FINNHUB_BASE_URL}/stock/profile2?symbol=${cleanSymbol}&token=${token}`,
          3600,
        ),
      ),
      finnhubLimit(() =>
        fetchJSON<FinancialsData>(
          // Financial metrics (P/E, etc.) - cache 30min
          `${FINNHUB_BASE_URL}/stock/metric?symbol=${cleanSymbol}&metric=all&token=${token}`,
          1800,
        ),
      ),
    ]);

    // Type cast the responses
    const quoteData = quote as QuoteData;
    const profileData = profile as ProfileData;
    const financialsData = financials as FinancialsData;

    // Cache the fresh quote
    if (!cachedQuote) setCachedQuote(cleanSymbol, quoteData);

    // Check if we got valid quote and profile data
    if (!quoteData?.c || !profileData?.name)
      throw new Error("Invalid stock data received from API");

    const changePercent = quoteData.dp || 0;
    const peRatio = financialsData?.metric?.peNormalizedAnnual || null;

    return {
      symbol: cleanSymbol,
      company: profileData?.name,
      currentPrice: quoteData.c,
      changePercent,
      priceFormatted: formatPrice(quoteData.c),
      changeFormatted: formatChangePercent(changePercent),
      peRatio: peRatio?.toFixed(1) || "—",
      marketCapFormatted: formatMarketCapValue(
        profileData?.marketCapitalization || 0,
      ),
    };
  } catch (error) {
    // Re-throw rate limit errors so callers can show appropriate UI
    if (error instanceof RateLimitError) throw error;
    console.error(`Error fetching details for ${cleanSymbol}:`, error);
    throw new Error("Failed to fetch stock details");
  }
});
