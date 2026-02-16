"use client";

import { Star, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/useDebounce";
import {
  addToWatchlist,
  removeFromWatchlist,
} from "@/lib/actions/watchlist.action";

const WatchlistButton = ({
  symbol,
  company,
  isInWatchlist,
  showTrashIcon = false,
  type = "button",
  onWatchlistChange,
}: WatchlistButtonProps) => {
  const [added, setAdded] = useState<boolean>(!!isInWatchlist);

  const label = useMemo(() => {
    if (type === "icon") return added ? "" : "";
    return added ? "Remove from Watchlist" : "Add to Watchlist";
  }, [added, type]);

  const toggleWatchlist = async (nextAdded: boolean) => {
    const previous = !nextAdded;
    try {
      const result = nextAdded
        ? await addToWatchlist(symbol, company)
        : await removeFromWatchlist(symbol);

      if (!result.success) {
        setAdded(previous);
        toast.error("Failed to update watchlist");
        return;
      }

      toast.success(
        nextAdded ? "Added to Watchlist" : "Removed from Watchlist",
        {
          description: `${company} ${
            nextAdded ? "added to" : "removed from"
          } your watchlist`,
        },
      );

      onWatchlistChange?.(symbol, nextAdded);
    } catch {
      setAdded(previous);
      toast.error("Something went wrong. Please try again.");
    }
  };

  // Debounce the toggle function to prevent rapid API calls (300ms delay)
  const debouncedToggle = useDebounce(toggleWatchlist, 300);

  // Click handler that provides optimistic UI updates
  const handleClick = (e: React.MouseEvent) => {
    // Prevent event bubbling and default behavior
    e.stopPropagation();
    e.preventDefault();

    const nextAdded = !added;
    setAdded(nextAdded);
    debouncedToggle(nextAdded);
  };

  if (type === "icon") {
    return (
      <button
        type="button"
        title={
          added
            ? `Remove ${symbol} from watchlist`
            : `Add ${symbol} to watchlist`
        }
        aria-label={
          added
            ? `Remove ${symbol} from watchlist`
            : `Add ${symbol} to watchlist`
        }
        className={`watchlist-icon-btn ${added ? "watchlist-icon-added" : ""}`}
        onClick={handleClick}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <Star fill={added ? "currentColor" : "none"} />
      </button>
    );
  }

  return (
    <button
      type="button"
      className={`watchlist-btn ${added ? "watchlist-remove" : ""}`}
      onClick={handleClick}
      onKeyDown={(e) => e.stopPropagation()}
    >
      {showTrashIcon && added ? <Trash2 className="w-5 h-5 mr-2" /> : null}
      <span>{label}</span>
    </button>
  );
};

export default WatchlistButton;
