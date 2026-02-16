"use client";

import { useEffect } from "react";
import { toast } from "sonner";

export default function WatchlistError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    toast.error(
      error.message.includes("rate limit") || error.message.includes("Rate")
        ? "API rate limit exceeded. Try again later."
        : "Failed to load watchlist.",
    );
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-4 max-w-md px-4">
        <h2 className="text-xl font-semibold text-red-400">
          Something went wrong
        </h2>
        <p className="text-gray-400">{error.message}</p>
        <button
          type="button"
          onClick={reset}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
