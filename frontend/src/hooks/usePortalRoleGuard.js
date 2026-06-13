"use client";



import { useEffect } from "react";

import { usePathname } from "next/navigation";

import { useAuth } from "@/context/AuthContext";

import authService from "@/services/authService";

import { getUnauthenticatedLoginPath } from "@/utils/authRedirects";
import { getDashboardRouteByRole } from "@/utils/authRoles";
import { useSafeRouter } from "@/hooks/useSafeRouter";



export function usePortalRoleGuard(expectedRole) {

  const { safeReplace, isRouterReady } = useSafeRouter();

  const pathname = usePathname();

  const { isAuthenticated, userRole, loading, currentUser } = useAuth();

  const hasToken = Boolean(authService.getValidToken());

  const normalizedExpected = String(expectedRole || "").toLowerCase();

  const normalizedRole = String(userRole || "").toLowerCase();

  const roleMatches = normalizedRole === normalizedExpected;

  const allowed = isAuthenticated && hasToken && roleMatches;



  useEffect(() => {

    if (!isRouterReady || loading) return;

    if (!hasToken || !isAuthenticated) {
      safeReplace(getUnauthenticatedLoginPath(pathname, "unauthenticated"));
      return;
    }

    if (!roleMatches) {
      safeReplace(getDashboardRouteByRole(userRole, currentUser?.email));
    }

  }, [
    currentUser?.email,
    hasToken,
    isAuthenticated,
    isRouterReady,
    loading,
    pathname,
    roleMatches,
    safeReplace,
    userRole,
  ]);



  return { allowed, loading, userRole: normalizedRole };

}



