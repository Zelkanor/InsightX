"use client";

import ErrorBoundary from "@/components/ErrorBoundary";

export default function StockError({
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
      fallbackMessage="Failed to load stock details."
    />
  );
}
