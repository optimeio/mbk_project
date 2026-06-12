"use client";



import { useEffect } from "react";

import { usePathname, useRouter } from "next/navigation";

import { useAuth } from "@/context/AuthContext";

import authService from "@/services/authService";

import { getDashboardRouteByRole } from "@/utils/authRoles";



export function usePortalRoleGuard(expectedRole) {

  const router = useRouter();

  const pathname = usePathname();

  const { isAuthenticated, userRole, loading, currentUser } = useAuth();

  const hasToken = Boolean(authService.getToken());

  const normalizedExpected = String(expectedRole || "").toLowerCase();

  const normalizedRole = String(userRole || "").toLowerCase();

  const roleMatches = normalizedRole === normalizedExpected;

  const allowed = isAuthenticated && hasToken && roleMatches;



  useEffect(() => {

    if (loading) return;



    if (!hasToken || !isAuthenticated) {

      router.replace(

        `/login?redirect=${encodeURIComponent(pathname)}&reason=unauthenticated`,

      );

      return;

    }



    if (!roleMatches) {

      router.replace(getDashboardRouteByRole(userRole, currentUser?.email));

    }

  }, [

    currentUser?.email,

    hasToken,

    isAuthenticated,

    loading,

    pathname,

    roleMatches,

    router,

    userRole,

  ]);



  return { allowed, loading, userRole: normalizedRole };

}



