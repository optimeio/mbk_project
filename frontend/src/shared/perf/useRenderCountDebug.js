"use client";

import { useEffect, useRef } from "react";

const DEFAULT_STORAGE_KEY = "mbk_perf_profile_renders";

const isProfilingEnabled = (storageKey = DEFAULT_STORAGE_KEY) => {
  if (process.env.NODE_ENV === "production" || typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(storageKey) === "1";
};

export default function useRenderCountDebug(
  label,
  { logEvery = 10, storageKey = DEFAULT_STORAGE_KEY } = {},
) {
  const renderCountRef = useRef(0);

  useEffect(() => {
    if (!isProfilingEnabled(storageKey)) {
      return;
    }

    renderCountRef.current += 1;
    if (renderCountRef.current % Math.max(1, Number(logEvery) || 1) !== 0) {
      return;
    }

    // Dev-only render diagnostics for hotspot pages.
    console.debug(`[perf] ${label} render count:`, renderCountRef.current);
  });
}

