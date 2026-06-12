"use client";

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { AuthProvider } from '@/context/AuthContext';
import { PortalDataProvider } from '@/context/PortalDataContext';
import RouteLoadingOverlay from '@/components/common/RouteLoadingOverlay';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import AppToaster from './AppToaster';
import QueryProvider from './QueryProvider';
import AnalyticsTracker from '@/components/common/AnalyticsTracker';
import ResponsiveAppShell from '@/components/common/ResponsiveAppShell';
import PageTransition from './PageTransition';

const HeavyProviders = dynamic(() => import('./HeavyProviders'), {
  loading: () => <RouteLoadingOverlay />,
  ssr: false,
});

const PUBLIC_ROUTES = new Set([
  '/',
  '/login',
  '/signup',
  '/forgot-password',
  '/trainer-signup',
  '/student/auth',
  '/company/auth',
  '/verify-account',
  '/verify-email',
]);

const REALTIME_ROUTE_PATTERNS = [
  /^\/chat(?:\/|$)/,
  /^\/spoc\/trainers\/[^/]+\/analytics(?:\/|$)/,
];

export default function Providers({ children }) {
  const pathname = usePathname();
  const resolvedPathname =
    pathname
    || (typeof window !== "undefined" ? window.location.pathname : "/");
  const isPublicRoute =
    PUBLIC_ROUTES.has(resolvedPathname) || resolvedPathname.startsWith('/trainer-signup/');
  const isPortalRoute =
    resolvedPathname.startsWith('/dashboard')
    || resolvedPathname.startsWith('/spoc')
    || resolvedPathname.startsWith('/trainer')
    || resolvedPathname.startsWith('/chat')
    || resolvedPathname.startsWith('/accountant');
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

  return (
    <QueryProvider>
      <ErrorBoundary>
        <AuthProvider>
          <PortalDataProvider>
            <AnalyticsTracker />
            <AppToaster />
            {isPublicRoute || !requiresRealtimeProvider ? (
              appContent
            ) : (
              <HeavyProviders>{appContent}</HeavyProviders>
            )}
          </PortalDataProvider>
        </AuthProvider>
      </ErrorBoundary>
    </QueryProvider>
  );
}
