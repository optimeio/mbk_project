'use client';

import { memo, useEffect, useMemo, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import authService from '@/services/authService';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { getUnauthenticatedLoginPath } from '@/utils/authRedirects';
import { getTokenRole } from '@/utils/authJwt';
import {
  getDashboardRouteByRole,
  loginTypeToAuthRole,
  normalizeAuthRole,
  isKnownPortalRole,
} from '@/utils/authRoles';

const roleMatchesAllowed = (userRole, email, allowedRoles = []) => {
  if (!allowedRoles.length) return true;

  const normalizedUser = normalizeAuthRole(userRole, email);
  if (!normalizedUser) return false;

  return allowedRoles.some((allowed) => {
    const mappedRole = loginTypeToAuthRole(allowed);
    const normalizedAllowed = normalizeAuthRole(
      mappedRole || allowed,
      email,
    );
    if (!normalizedAllowed) return false;
    return normalizedAllowed.toLowerCase() === normalizedUser.toLowerCase();
  });
};

const ProtectedRoute = ({ allowedRoles, children }) => {
  const { currentUser, loading, isAuthenticated } = useAuth();
  const { safeReplace, isRouterReady } = useSafeRouter();
  const pathname = usePathname();

  const validToken = authService.getValidToken();
  const tokenRole = useMemo(() => getTokenRole(validToken), [validToken]);
  const role = (isAuthenticated && currentUser?.role) || tokenRole || '';
  const hasValidToken = Boolean(validToken);
  const hasKnownRole = isKnownPortalRole(role, currentUser?.email);
  const roleAllowed = hasKnownRole && roleMatchesAllowed(role, currentUser?.email, allowedRoles);
  const canRenderOptimistically = hasValidToken && roleAllowed;
  const lastRedirectRef = useRef('');

  useEffect(() => {
    lastRedirectRef.current = '';
  }, [pathname]);

  useEffect(() => {
    if (!isRouterReady || (loading && !canRenderOptimistically)) return;

    let target = '';

    if (!hasValidToken || !hasKnownRole || (!isAuthenticated && !canRenderOptimistically)) {
      target = getUnauthenticatedLoginPath(pathname, 'unauthenticated');
    } else if (!roleAllowed) {
      target = getDashboardRouteByRole(role);
    }

    if (!target || lastRedirectRef.current === target) {
      return;
    }

    lastRedirectRef.current = target;
    safeReplace(target);

    const hardRedirectTimer = window.setTimeout(() => {
      if (!authService.getValidToken()) {
        window.location.replace(target);
      }
    }, 2000);

    return () => window.clearTimeout(hardRedirectTimer);
  }, [
    canRenderOptimistically,
    hasKnownRole,
    hasValidToken,
    isAuthenticated,
    isRouterReady,
    loading,
    pathname,
    role,
    roleAllowed,
    safeReplace,
  ]);

  if (loading && !canRenderOptimistically) {
    return (
      <div className="flex min-h-[12rem] items-center justify-center p-6">
        <p className="text-sm text-slate-500">Checking your session…</p>
      </div>
    );
  }

  if (!canRenderOptimistically || !roleAllowed) {
    return (
      <div className="flex min-h-[12rem] items-center justify-center p-6">
        <p className="text-sm text-slate-500">Redirecting to sign in…</p>
      </div>
    );
  }

  return children;
};

export default memo(ProtectedRoute);
