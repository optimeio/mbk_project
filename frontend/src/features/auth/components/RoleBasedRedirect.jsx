"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { AUTH_ROLES, getDashboardRouteByRole, normalizeAuthRole } from "@/utils/authRoles";
import { prefetchPortalRoutes } from "@/utils/portalPrefetch";
import { warmPortalDataBundle } from "@/utils/portalDataPrefetch";

const RoleBasedRedirect = () => {
  const { currentUser, loading, setAuthUser } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!currentUser) {
      router.replace("/?login=true");
      return;
    }
    const accessToken =
      typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    if (!accessToken) {
      setAuthUser?.(null);
      router.replace("/?login=true");
      return;
    }

    const expectedType = searchParams.get("type");
    const actualRole = normalizeAuthRole(currentUser.role, currentUser.email);
    const expectedRole =
      expectedType === "admin"
        ? AUTH_ROLES.SUPER_ADMIN
        : expectedType === "spoc"
          ? AUTH_ROLES.SPOC
          : expectedType === "trainer"
            ? AUTH_ROLES.TRAINER
            : null;

    if (expectedRole && expectedRole !== actualRole) {
      alert(
        `Redirected to your correct dashboard. You logged in as ${actualRole} but selected ${expectedType.toUpperCase()} login.`
      );
    }

    const targetRoute = getDashboardRouteByRole(actualRole, currentUser.email);
    prefetchPortalRoutes(router, actualRole, currentUser.email);

    void (async () => {
      try {
        await warmPortalDataBundle();
      } catch (error) {
        console.warn("Portal data warmup failed before navigation:", error);
      }
      router.replace(targetRoute);
    })();
  }, [loading, currentUser, searchParams, router, setAuthUser]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
    </div>
  );
};

export default RoleBasedRedirect;
