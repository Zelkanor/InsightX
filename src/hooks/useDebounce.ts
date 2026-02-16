"use client";

import { useCallback, useEffect, useRef } from "react";

export function useDebounce<T extends (...args: Parameters<T>) => void>(
  callback: T,
  delay: number,
) {
  const callbackRef = useRef<T>(callback);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Keep callbackRef in sync so the timeout always calls the latest callback
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Clear any pending timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(
        () => callbackRef.current?.(...args),
        delay,
      );
    },
    [delay],
  );
}
