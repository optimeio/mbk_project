"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useShallow } from "zustand/react/shallow";

import { useAuth } from "@/context/AuthContext";
import { clearPortalDataBundle, warmPortalDataBundle } from "@/utils/portalDataPrefetch";
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
    || pathname === "/trainer/dashboard";

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

    let cancelled = false;
    let timeoutId = null;
    let idleId = null;

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

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      idleId = window.requestIdleCallback(preloadBundle, { timeout: 1200 });
    } else if (typeof window !== "undefined") {
      timeoutId = window.setTimeout(preloadBundle, 200);
    }

    return () => {
      cancelled = true;
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
      if (idleId !== null && typeof window !== "undefined" && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleId);
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
