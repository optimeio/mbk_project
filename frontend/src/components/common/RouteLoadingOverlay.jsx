"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import GlobalLoadingScreen from "@/components/common/GlobalLoadingScreen";

// Keep the overlay visible only long enough to avoid a flash, not to block clicks.
const MIN_VISIBLE_MS = 0;
// Maximum fallback timeout to ensure overlay does not stay forever (ms)
const MAX_TIMEOUT_MS = 8000;

const RouteLoadingOverlay = () => {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef(null);
  const maxTimeoutRef = useRef(null);
  const prevPathRef = useRef(pathname);

  useEffect(() => {
    // Detect route change
    if (prevPathRef.current !== pathname) {
      // Show overlay immediately on navigation start
      setVisible(true);

      // Clear any existing timers
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (maxTimeoutRef.current) clearTimeout(maxTimeoutRef.current);

      // Hide after a short minimum visible time
      timeoutRef.current = window.setTimeout(() => {
        setVisible(false);
      }, MIN_VISIBLE_MS);

      // Safety fallback: force hide after max timeout
      maxTimeoutRef.current = window.setTimeout(() => {
        setVisible(false);
      }, MAX_TIMEOUT_MS);

      prevPathRef.current = pathname;
    }
  }, [pathname]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (maxTimeoutRef.current) clearTimeout(maxTimeoutRef.current);
    };
  }, []);

  if (!visible) return null;

  return (
    <GlobalLoadingScreen
      overlay
      title="Loading page"
      subtitle=""
    />
  );
};

export default RouteLoadingOverlay;
