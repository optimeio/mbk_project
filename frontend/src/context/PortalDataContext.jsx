"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useShallow } from "zustand/react/shallow";

import { useAuth } from "@/context/AuthContext";
import {
  clearPortalDataBundle,
  getWarmPortalDataBundle,
  warmPortalDataBundle,
} from "@/utils/portalDataPrefetch";
import {
  resetPortalDataStore,
  selectPortalDataApi,
  usePortalDataStore,
} from "@/stores/usePortalDataStore";

export const PortalDataProvider = ({ children }) => {
  const { currentUser, loading: authLoading } = useAuth();
  const pathname = usePathname() || "";
  const setError = usePortalDataStore((state) => state.setError);
  const setLoading = usePortalDataStore((state) => state.setLoading);
  const setPortalData = usePortalDataStore((state) => state.setPortalData);
  const shouldWarmPortalBundle =
    pathname === "/dashboard"
    || pathname === "/spoc/dashboard"
    || pathname === "/trainer/dashboard"
    || pathname === "/student/dashboard"
    || pathname === "/company/dashboard";

  useEffect(() => {
    const handlePortalDataReady = (event) => {
      setPortalData(event?.detail || null);
    };

    window.addEventListener("mbk:portal-data-ready", handlePortalDataReady);
    return () => {
      window.removeEventListener("mbk:portal-data-ready", handlePortalDataReady);
    };
  }, [setPortalData]);

  useEffect(() => {
    if (authLoading) {
      return undefined;
    }

    if (!currentUser) {
      clearPortalDataBundle();
      resetPortalDataStore();
      return undefined;
    }

    if (!shouldWarmPortalBundle) {
      setLoading(false);
      setError("");
      return undefined;
    }

    const cachedBundle = getWarmPortalDataBundle();
    if (cachedBundle) {
      setPortalData(cachedBundle);
      setLoading(false);
      setError("");
      return undefined;
    }

    let cancelled = false;
    let timeoutId = null;

    setLoading(true);
    setError("");

    const preloadBundle = () => {
      if (cancelled) return;

      warmPortalDataBundle()
        .then((bundle) => {
          if (cancelled) return;
          setPortalData(bundle);
        })
        .catch((bundleError) => {
          if (cancelled) return;
          console.error("Portal data preload failed:", bundleError);
          setError(bundleError.message || "Failed to preload portal data.");
        })
        .finally(() => {
          if (!cancelled) {
            setLoading(false);
          }
        });
    };

    // Fetch immediately: the bundle is the critical data for the dashboard,
    // and the request is network-bound so it doesn't block rendering.
    if (typeof window !== "undefined") {
      timeoutId = window.setTimeout(preloadBundle, 0);
    }

    return () => {
      cancelled = true;
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [
    authLoading,
    currentUser?.email,
    currentUser?.id,
    currentUser?.role,
    setError,
    setLoading,
    setPortalData,
    shouldWarmPortalBundle,
  ]);

  return children;
};

export const usePortalData = (selector = selectPortalDataApi) =>
  usePortalDataStore(useShallow(selector));

export default PortalDataProvider;
