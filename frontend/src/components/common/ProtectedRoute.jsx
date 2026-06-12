'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

import { useAuth } from '@/context/AuthContext';
import authService from '@/services/authService';
import { getDashboardRouteByRole } from '@/utils/authRoles';

/**
 * Client-side auth guard for Next.js App Router.
 *
 * Usage:
 *   <ProtectedRoute allowedRoles={['student']}>
 *     <StudentDashboard />
 *   </ProtectedRoute>
 *
 * - Waits for AuthContext to finish restoring the session (no logout on refresh).
 * - Unauthenticated users → /login?redirect=<current path>.
 * - Authenticated users with the wrong role → their own dashboard (no loops).
 * - Role comparison is case-insensitive (student / Student / STUDENT).
 */
const ProtectedRoute = ({ allowedRoles, children }) => {
  const { currentUser, loading, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const role = currentUser?.role || '';
  const hasToken = Boolean(authService.getToken());
  const roleAllowed =
    !allowedRoles ||
    allowedRoles.some((r) => r.toLowerCase() === role.toLowerCase());

  useEffect(() => {
    if (loading) return;

    if (!isAuthenticated || !currentUser || !hasToken) {
      console.debug('[AUTH] ProtectedRoute: unauthenticated, redirecting to /login', { from: pathname });
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}&reason=unauthenticated`);
      return;
    }

    if (!roleAllowed) {
      const home = getDashboardRouteByRole(role, currentUser.email);
      console.warn(`[AUTH] Role mismatch: user has "${role}", required one of [${allowedRoles.join(', ')}]. Redirecting to ${home}`);
      router.replace(home);
    }
  }, [loading, isAuthenticated, currentUser, hasToken, roleAllowed, pathname, router]);

  if (loading) {
    return (
      <div style={{ minHeight: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
        Checking your session...
      </div>
    );
  }

  if (!isAuthenticated || !currentUser || !hasToken || !roleAllowed) {
    return null; // redirect in flight
  }

  return children;
};

export default ProtectedRoute;
