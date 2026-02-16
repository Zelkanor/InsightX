"use client";

import { Bell, Pencil, Trash2 } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";
import { deleteAlert } from "@/lib/actions/alerts.action";
import { formatPrice } from "@/lib/utils";
import AlertDialog from "./AlertDialog";

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

export const AlertsSidebar = ({
  alertData,
  watchlistStocks,
}: AlertsListProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAlert, setEditingAlert] = useState<Alert | undefined>();
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  const handleCreate = () => {
    setEditingAlert(undefined);
    setDialogOpen(true);
  };

  const handleEdit = (alert: Alert) => {
    setEditingAlert(alert);
    setDialogOpen(true);
  };

  const handleDelete = async (alertId: string) => {
    const result = await deleteAlert(alertId);
    if (result.success) {
      toast.success("Alert deleted");
    } else {
      toast.error(result.error || "Failed to delete alert");
    }
  };

  return (
    <>
      <div className="flex items-center justify-between w-full">
        <h2 className="watchlist-title">Alerts</h2>
        <button type="button" className="search-btn" onClick={handleCreate}>
          <Bell className="h-3.5 w-3.5" />
          Create Alert
        </button>
      </div>

      {alertData && alertData.length > 0 ? (
        <div className="alert-list scrollbar-hide-default">
          {alertData.map((alert) => {
            const condition = alert.condition === "above" ? ">" : "<";
            const bgColor = SYMBOL_COLORS[alert.symbol] ?? "bg-gray-600";

            return (
              <div key={alert.id} className="alert-item">
                {/* Header: icon + company + symbol */}
                <div className="alert-details">
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold overflow-hidden ${bgColor}`}
                    >
                      {!imgErrors[alert.symbol] ? (
                        <Image
                          src={`https://assets.parqet.com/logos/symbol/${alert.symbol}?format=png`}
                          alt={alert.symbol}
                          width={40}
                          height={40}
                          className="w-full h-full object-cover"
                          onError={() =>
                            setImgErrors((prev) => ({
                              ...prev,
                              [alert.symbol]: true,
                            }))
                          }
                        />
                      ) : (
                        alert.symbol.charAt(0)
                      )}
                    </span>
                    <div>
                      <p className="alert-company">{alert.companyName}</p>
                      <p className="text-sm font-mono text-gray-400">
                        {alert.symbol}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-xs px-2 py-1 rounded ${alert.isActive ? "bg-green-500/20 text-green-400" : "bg-gray-600/50 text-gray-500"}`}
                    >
                      {alert.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>

                {/* Alert details + actions */}
                <div className="alert-actions">
                  <div>
                    <p className="text-sm font-medium text-gray-300">
                      Price {condition} {formatPrice(alert.threshold)}
                    </p>
                    <span className="text-xs px-2 py-0.5 rounded bg-gray-600/50 text-gray-400">
                      {FREQUENCY_LABELS[alert.frequency] ?? alert.frequency}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="alert-update-btn p-1.5"
                      title="Edit alert"
                      onClick={() => handleEdit(alert)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      className="alert-delete-btn p-1.5"
                      title="Delete alert"
                      onClick={() => handleDelete(alert.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="alert-list">
          <div className="alert-empty text-center flex flex-col items-center">
            <Bell className="h-5 w-5 mb-2" />
            <h2 className="empty-title">Your alerts are empty</h2>
            <p className="empty-description">
              No alerts yet. Create one to get started.
            </p>
          </div>
        </div>
      )}

      <AlertDialog
        open={dialogOpen}
        setOpen={setDialogOpen}
        editAlert={editingAlert}
        watchlistStocks={watchlistStocks}
      />
    </>
  );
};
