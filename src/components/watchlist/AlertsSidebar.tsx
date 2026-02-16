"use client";

import { Bell, Pencil, Trash2 } from "lucide-react";
import { formatPrice } from "@/lib/utils";

const FREQUENCY_LABELS: Record<string, string> = {
  once: "Once",
  once_per_minute: "Once per minute",
  once_per_hour: "Once per hour",
  once_per_day: "Once per day",
};

// Color mapping for stock symbol badges
const SYMBOL_COLORS: Record<string, string> = {
  AAPL: "bg-gray-600",
  TSLA: "bg-red-500/20",
  META: "bg-blue-500/20",
  MSFT: "bg-green-500/20",
  GOOGL: "bg-yellow-500/20",
  AMZN: "bg-orange-500/20",
  NVDA: "bg-teal-400/20",
};

export const AlertsSidebar = ({ alertData }: AlertsListProps) => {
  return (
    <>
      <div className="flex items-center justify-between w-full ">
        <h2 className="watchlist-title">Alerts</h2>
        <button type="button" className="search-btn">
          <Bell className="h-3.5 w-3.5" />
          Create Alert
        </button>
      </div>

      {alertData && alertData.length > 0 ? (
        <div className="alert-list scrollbar-hide-default">
          {alertData.map((alert) => {
            const isPositive = (alert.changePercent ?? 0) >= 0;
            const condition = alert.condition === "above" ? ">" : "<";
            const bgColor = SYMBOL_COLORS[alert.symbol] ?? "bg-gray-600";

            return (
              <div key={alert.id} className="alert-item">
                {/* Header: icon + company + symbol + change */}
                <div className="alert-details">
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${bgColor}`}
                    >
                      {alert.symbol.charAt(0)}
                    </span>
                    <div>
                      <p className="alert-company">{alert.companyName}</p>
                      <p className="alert-price">
                        {alert.currentPrice
                          ? formatPrice(alert.currentPrice)
                          : "—"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono text-gray-400">
                      {alert.symbol}
                    </p>
                    <p
                      className={`text-sm font-semibold ${
                        isPositive ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {isPositive ? "+" : ""}
                      {alert.changePercent?.toFixed(2) ?? "0.00"}%
                    </p>
                  </div>
                </div>

                {/* Alert details + actions */}
                <div className="alert-actions">
                  <div>
                    <p className="text-sm text-gray-500">{alert.alertName}:</p>
                    <p className="text-sm font-medium text-gray-300">
                      Price {condition} {formatPrice(alert.threshold)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div>
                      <button
                        type="button"
                        className="alert-update-btn p-1.5"
                        title="Edit alert"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        className="alert-delete-btn p-1.5"
                        title="Delete alert"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <span className="ml-2 text-xs px-2 py-1 rounded bg-gray-600/50 text-gray-400 whitespace-nowrap">
                      {FREQUENCY_LABELS.once_per_day}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="alert-list">
          <div className="alert-empty">
            <Bell className="h-5 w-5" />
            <h2 className="empty-title">Your alerts are empty</h2>
            <p className="empty-description">
              No alerts yet. Create one to get started.
            </p>
          </div>
        </div>
      )}
    </>
  );
};
