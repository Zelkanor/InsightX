import { Star } from "lucide-react";
import SearchCommand from "@/components/SearchCommand";
import { AlertsSidebar } from "@/components/watchlist/AlertsSidebar";
import { WatchlistNews } from "@/components/watchlist/WatchlistNews";
import { WatchlistTable } from "@/components/watchlist/WatchlistTable";
import { getUserAlerts } from "@/lib/actions/alerts.action";
import { searchStocks } from "@/lib/actions/finnhub.action";
import { getWatchlistNews } from "@/lib/actions/news.action";
import { getWatchlistWithData } from "@/lib/actions/watchlist.action";

export default async function WatchlistPage() {
  const [watchlist, alerts, initialStocks, news] = await Promise.all([
    getWatchlistWithData(),
    getUserAlerts(),
    searchStocks(),
    getWatchlistNews(),
  ]);

  if (watchlist.length === 0) {
    return (
      <section className="flex watchlist-empty-container">
        <div className="watchlist-empty">
          <Star className="watchlist-star" />
          <h2 className="empty-title">Your watchlist is empty</h2>
          <p className="empty-description">
            Start building your watchlist by searching for stocks and clicking
            the star icon to add them.
          </p>
        </div>
        <SearchCommand initialStocks={initialStocks} />
      </section>
    );
  }

  return (
    <div className="space-y-10">
      {/* Top: Watchlist + Alerts */}
      <div className="watchlist-container">
        {/* Watchlist Table */}
        <div className="watchlist">
          <div className="flex items-center justify-between">
            <h1 className="watchlist-title">Watchlist</h1>
            <SearchCommand
              renderAs="button"
              label="Add Stock"
              initialStocks={initialStocks}
            />
          </div>
          <WatchlistTable watchlist={watchlist} />
        </div>

        {/* Alerts Sidebar */}
        <div className="watchlist-alerts flex">
          <AlertsSidebar
            alertData={alerts}
            watchlistStocks={watchlist.map((w: StockWithData) => ({
              symbol: w.symbol,
              company: w.company,
            }))}
          />
        </div>
      </div>

      {/* Bottom: News */}
      <WatchlistNews news={news} />
    </div>
  );
}
