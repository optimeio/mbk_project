"use client";

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import axios from 'axios';

export default function AnalyticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchKey = searchParams?.toString() ?? '';

  useEffect(() => {
    const fullPath = searchKey ? `${pathname}?${searchKey}` : pathname;

    const storageKey = `mbk-track:${fullPath}`;
    const lastTrackedAt = Number(sessionStorage.getItem(storageKey) || 0);
    if (Date.now() - lastTrackedAt < 15000) {
      return undefined;
    }

    const trackPageView = () => {
      axios.post('/api/web/track', {
        eventType: 'page_view',
        path: fullPath,
        metadata: {
          referrer: document.referrer,
          screen: `${window.innerWidth}x${window.innerHeight}`,
        },
      }).then(() => {
        sessionStorage.setItem(storageKey, String(Date.now()));
      }).catch(() => {
        // Analytics is best-effort
      });
    };

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      const idleId = window.requestIdleCallback(trackPageView, { timeout: 1500 });
      return () => window.cancelIdleCallback(idleId);
    }

    const timer = window.setTimeout(trackPageView, 0);
    return () => window.clearTimeout(timer);
  }, [pathname, searchKey]);

  return null; // This component doesn't render anything
}
