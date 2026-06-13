"use client";

import { useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { safeRouterPush } from "@/utils/safeRouterNavigation";

const NAV_DEBOUNCE_MS = 100;

/**
 * Prevents duplicate navigations when users rapidly click the same sidebar item.
 */
export default function useDebouncedNavigate() {
  const router = useRouter();
  const lastNavigationRef = useRef({ href: "", at: 0 });

  const navigate = useCallback(
    (href) => {
      if (!href) {
        return;
      }

      const now = Date.now();
      const last = lastNavigationRef.current;
      if (last.href === href && now - last.at < NAV_DEBOUNCE_MS) {
        return;
      }

      lastNavigationRef.current = { href, at: now };
      safeRouterPush(router, href);
    },
    [router],
  );

  return navigate;
}
