'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  deferRouterAction,
  safeRouterPrefetch,
  safeRouterPush,
  safeRouterReplace,
  waitForAppRouterReady,
} from '@/utils/safeRouterNavigation';

/**
 * Client-only router wrapper that waits for hydration before navigating.
 */
export function useSafeRouter() {
  const router = useRouter();
  const [isRouterReady, setIsRouterReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void waitForAppRouterReady().then(() => {
      if (!cancelled) {
        setIsRouterReady(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const safeReplace = useCallback(
    (href) => safeRouterReplace(router, href),
    [router],
  );

  const safePush = useCallback(
    (href) => safeRouterPush(router, href),
    [router],
  );

  const safePrefetch = useCallback(
    (href) => safeRouterPrefetch(router, href),
    [router],
  );

  const runWhenReady = useCallback(
    (action) => {
      if (!isRouterReady) {
        return;
      }
      deferRouterAction(action);
    },
    [isRouterReady],
  );

  return {
    router,
    isRouterReady,
    safeReplace,
    safePush,
    safePrefetch,
    runWhenReady,
  };
}
