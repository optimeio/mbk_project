"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import { usePathname } from "next/navigation";
import RouteLoadingOverlay from "@/components/common/RouteLoadingOverlay";
import ResponsiveAppShell from "@/components/common/ResponsiveAppShell";
import PageTransition from "./PageTransition";
import { isPortalPath, isPublicPath } from "@/shared/config/routeProtection";

const AnalyticsTracker = dynamic(
  () => import("@/components/common/AnalyticsTracker"),
  { ssr: false },
);

const HeavyProviders = dynamic(() => import("./HeavyProviders"), {
  loading: () => null,
  ssr: false,
});

const REALTIME_ROUTE_PATTERNS = [
  /^\/chat(?:\/|$)/,
  /^\/spoc\/trainers\/[^/]+\/analytics(?:\/|$)/,
];

export default function AppShell({ children, portalDataProvider: PortalDataProvider }) {
  const pathname = usePathname();
  const resolvedPathname = pathname || "/";
  const isPublicRoute = isPublicPath(resolvedPathname);
  const isPortalRoute = isPortalPath(resolvedPathname);
  const requiresRealtimeProvider = REALTIME_ROUTE_PATTERNS.some((pattern) =>
    pattern.test(resolvedPathname),
  );

  const pageContent = isPublicRoute ? children : <PageTransition>{children}</PageTransition>;

  const appContent = (
    <>
      {!isPortalRoute && !isPublicRoute ? <RouteLoadingOverlay /> : null}
      {isPortalRoute ? (
        <div className="app-shell app-shell--portal" data-responsive-shell="portal">
          {pageContent}
        </div>
      ) : isPublicRoute ? (
        pageContent
      ) : (
        <ResponsiveAppShell variant="default" as="main">
          {pageContent}
        </ResponsiveAppShell>
      )}
    </>
  );

  const wrappedContent =
    isPortalRoute && PortalDataProvider ? (
      <PortalDataProvider>{appContent}</PortalDataProvider>
    ) : (
      appContent
    );

  const realtimeContent =
    isPublicRoute || !requiresRealtimeProvider ? (
      wrappedContent
    ) : (
      <HeavyProviders>{wrappedContent}</HeavyProviders>
    );

  return (
    <>
      {!isPublicRoute ? (
        <Suspense fallback={null}>
          <AnalyticsTracker />
        </Suspense>
      ) : null}
      {realtimeContent}
    </>
  );
}
