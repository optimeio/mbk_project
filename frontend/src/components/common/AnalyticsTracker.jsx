"use client";

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import axios from 'axios';

export default function AnalyticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const trackPageView = async () => {
      try {
        const fullPath = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '');
        await axios.post('/api/web/track', {
          eventType: 'page_view',
          path: fullPath,
          metadata: {
            referrer: document.referrer,
            screen: `${window.innerWidth}x${window.innerHeight}`
          }
        });
      } catch (err) {
        // Silent error for analytics
      }
    };

    trackPageView();
  }, [pathname, searchParams]);

  return null; // This component doesn't render anything
}
