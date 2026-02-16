"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createAlert, updateAlert } from "@/lib/actions/alerts.action";

const FREQUENCY_OPTIONS = [
  { value: "once", label: "Once" },
  { value: "once_per_minute", label: "Once per minute" },
  { value: "once_per_hour", label: "Once per hour" },
  { value: "once_per_day", label: "Once per day" },
];

export default function AlertDialog({
  open,
  setOpen,
  defaultSymbol = "",
  defaultCompany = "",
  defaultPrice,
  editAlert,
  watchlistStocks = [],
}: AlertDialogProps) {
  const isEditing = !!editAlert;
  const hasPresetStock = !!(editAlert?.symbol || defaultSymbol);

  const [selectedStock, setSelectedStock] = useState(
    defaultSymbol ? `${defaultSymbol}|${defaultCompany}` : "",
  );
  const [condition, setCondition] = useState<"above" | "below">(
    editAlert?.condition ?? "above",
  );
  const [targetPrice, setTargetPrice] = useState(
    editAlert?.threshold?.toString() ?? defaultPrice?.toString() ?? "",
  );
  const [frequency, setFrequency] = useState(
    editAlert?.frequency ?? "once_per_day",
  );
  const [loading, setLoading] = useState(false);

  // Reset form state when dialog opens/closes or relevant props change
  useEffect(() => {
    if (open) {
      setSelectedStock(
        editAlert?.symbol
          ? `${editAlert.symbol}|${editAlert.companyName}`
          : defaultSymbol
            ? `${defaultSymbol}|${defaultCompany}`
            : "",
      );
      setCondition(editAlert?.condition ?? "above");
      setTargetPrice(
        editAlert?.threshold?.toString() ?? defaultPrice?.toString() ?? "",
      );
      setFrequency(editAlert?.frequency ?? "once_per_day");
    } else {
      setSelectedStock("");
      setCondition("above");
      setTargetPrice("");
      setFrequency("once_per_day");
    }
  }, [open, editAlert, defaultSymbol, defaultCompany, defaultPrice]);

  // Derive symbol/company from the stock picker or props
  const getSymbolAndCompany = () => {
    if (editAlert) return { symbol: editAlert.symbol, company: editAlert.companyName };
    if (defaultSymbol) return { symbol: defaultSymbol, company: defaultCompany };
    if (selectedStock) {
      const [sym, ...rest] = selectedStock.split("|");
      return { symbol: sym, company: rest.join("|") };
    }
    return { symbol: "", company: "" };
  };

  const { symbol, company } = getSymbolAndCompany();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const price = Number.parseFloat(targetPrice);
    if (!symbol) {
      toast.error("Please select a stock.");
      return;
    }
    if (Number.isNaN(price) || price <= 0) {
      toast.error("Please enter a valid target price.");
      return;
    }

    setLoading(true);
    try {
      const result = isEditing
        ? await updateAlert(editAlert.id, {
            condition,
            targetPrice: price,
            frequency,
          })
        : await createAlert({
            symbol,
            companyName: company,
            condition,
            targetPrice: price,
            frequency,
          });

      if (!result.success) {
        toast.error(result.error || "Something went wrong.");
        return;
      }

      toast.success(isEditing ? "Alert updated" : "Alert created", {
        description: `${symbol} — notify when price goes ${condition} ${price}`,
      });
      setOpen(false);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="alert-dialog">
        <DialogHeader>
          <DialogTitle className="alert-title">
            {isEditing ? "Edit Alert" : "Create Alert"}
          </DialogTitle>
          {symbol ? (
            <p className="text-sm text-gray-400">
              {symbol} — {company}
            </p>
          ) : (
            <p className="text-sm text-gray-400">
              Select a stock from your watchlist
            </p>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Stock picker — only shown when no stock is pre-filled */}
          {!hasPresetStock && watchlistStocks.length > 0 && (
            <div className="space-y-2">
              <Label className="text-gray-300">Stock</Label>
              <Select value={selectedStock} onValueChange={setSelectedStock}>
                <SelectTrigger className="w-full bg-gray-700 border-gray-600 text-gray-100">
                  <SelectValue placeholder="Choose a stock..." />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600">
                  {watchlistStocks.map((s) => (
                    <SelectItem
                      key={s.symbol}
                      value={`${s.symbol}|${s.company}`}
                      className="text-gray-100"
                    >
                      {s.symbol} — {s.company}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Condition */}
          <div className="space-y-2">
            <Label className="text-gray-300">Condition</Label>
            <Select
              value={condition}
              onValueChange={(v) => setCondition(v as "above" | "below")}
            >
              <SelectTrigger className="w-full bg-gray-700 border-gray-600 text-gray-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-700 border-gray-600">
                <SelectItem value="above" className="text-gray-100">
                  Price goes above
                </SelectItem>
                <SelectItem value="below" className="text-gray-100">
                  Price goes below
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Target Price */}
          <div className="space-y-2">
            <Label htmlFor="targetPrice" className="text-gray-300">
              Target Price ($)
            </Label>
            <Input
              id="targetPrice"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
              className="bg-gray-700 border-gray-600 text-gray-100"
              required
            />
          </div>

          {/* Frequency */}
          <div className="space-y-2">
            <Label className="text-gray-300">Frequency</Label>
            <Select value={frequency} onValueChange={setFrequency}>
              <SelectTrigger className="w-full bg-gray-700 border-gray-600 text-gray-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-700 border-gray-600">
                {FREQUENCY_OPTIONS.map((opt) => (
                  <SelectItem
                    key={opt.value}
                    value={opt.value}
                    className="text-gray-100"
                  >
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-yellow-500 text-gray-900 hover:bg-yellow-600 font-semibold"
            >
              {loading
                ? "Saving..."
                : isEditing
                  ? "Update Alert"
                  : "Create Alert"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
