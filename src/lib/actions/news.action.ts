"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/better-auth/auth";
import { getNews } from "./finnhub.action";
import { getWatchlistSymbolsByEmail } from "./watchlist.action";

const MAX_NEWS_ARTICLES = 6;

/**
 * Fetch news for the authenticated user's watchlist symbols.
 * Falls back to popular/general market news when the watchlist
 * is empty or no symbol-specific articles are found.
 * Returns at most 6 articles.
 */
export async function getWatchlistNews(): Promise<MarketNewsArticle[]> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user) redirect("/sign-in");

  try {
    const symbols = await getWatchlistSymbolsByEmail(session.user.email);

    const articles = await getNews(
      symbols.length > 0 ? symbols : undefined,
      MAX_NEWS_ARTICLES,
    );

    return articles.slice(0, MAX_NEWS_ARTICLES);
  } catch (error) {
    console.error("getWatchlistNews error:", error);
    return [];
  }
}
