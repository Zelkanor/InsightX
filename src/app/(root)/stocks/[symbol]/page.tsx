import { notFound } from "next/navigation";
import TradingViewWidget from "@/components/TradingViewWidget";
import WatchlistButton from "@/components/watchlist/WatchlistButton";
import type { IWatchlistItem } from "@/database/models/watchlist.model";
import { getStocksDetails } from "@/lib/actions/finnhub.action";
import { getUserWatchlist } from "@/lib/actions/watchlist.action";
import {
  BASELINE_WIDGET_CONFIG,
  CANDLE_CHART_WIDGET_CONFIG,
  COMPANY_FINANCIALS_WIDGET_CONFIG,
  COMPANY_PROFILE_WIDGET_CONFIG,
  SYMBOL_INFO_WIDGET_CONFIG,
  TECHNICAL_ANALYSIS_WIDGET_CONFIG,
} from "@/lib/constants";
import { RateLimitError } from "@/lib/utils";

export default async function StockDetails({ params }: StockDetailsPageProps) {
  const { symbol } = await params;
  const scriptUrl = `https://s3.tradingview.com/external-embedding/embed-widget-`;

  let stockData: Awaited<ReturnType<typeof getStocksDetails>> = null;
  try {
    stockData = await getStocksDetails(symbol.toUpperCase());
  } catch (error) {
    if (error instanceof RateLimitError) {
      return (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4 max-w-md px-4">
            <h2 className="text-xl font-semibold text-yellow-400">
              API Rate Limit Exceeded
            </h2>
            <p className="text-gray-400">
              Too many requests. Please try again in a few minutes.
            </p>
          </div>
        </div>
      );
    }
    throw error;
  }

  if (!stockData || !stockData.symbol) notFound();

  const watchlist = await getUserWatchlist();

  const isInWatchlist = watchlist.some(
    (item: IWatchlistItem) => item.symbol === symbol.toUpperCase(),
  );

  return (
    <div className="flex min-h-screen p-4 md:p-6 lg:p-8">
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
        {/* Left column */}
        <div className="flex flex-col gap-6">
          <TradingViewWidget
            scriptUrl={`${scriptUrl}symbol-info.js`}
            config={SYMBOL_INFO_WIDGET_CONFIG(symbol)}
            height={170}
          />

          <TradingViewWidget
            scriptUrl={`${scriptUrl}advanced-chart.js`}
            config={CANDLE_CHART_WIDGET_CONFIG(symbol)}
            className="custom-chart"
            height={600}
          />

          <TradingViewWidget
            scriptUrl={`${scriptUrl}advanced-chart.js`}
            config={BASELINE_WIDGET_CONFIG(symbol)}
            className="custom-chart"
            height={600}
          />
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <WatchlistButton
              symbol={symbol}
              company={stockData.company || symbol.toUpperCase()}
              isInWatchlist={isInWatchlist}
              type="button"
            />
          </div>

          <TradingViewWidget
            scriptUrl={`${scriptUrl}technical-analysis.js`}
            config={TECHNICAL_ANALYSIS_WIDGET_CONFIG(symbol)}
            height={400}
          />

          <TradingViewWidget
            scriptUrl={`${scriptUrl}company-profile.js`}
            config={COMPANY_PROFILE_WIDGET_CONFIG(symbol)}
            height={440}
          />

          <TradingViewWidget
            scriptUrl={`${scriptUrl}financials.js`}
            config={COMPANY_FINANCIALS_WIDGET_CONFIG(symbol)}
            height={464}
          />
        </div>
      </section>
    </div>
  );
}
