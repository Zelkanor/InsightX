"use client";

import ErrorBoundary from "@/components/ErrorBoundary";

export default function WatchlistError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorBoundary
      error={error}
      reset={reset}
      fallbackMessage="Failed to load watchlist."
    />
  );
}
