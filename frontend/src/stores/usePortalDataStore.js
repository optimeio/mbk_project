"use client";

import { create } from "zustand";

import {
  getWarmPortalDataBundle,
  warmPortalDataBundle,
} from "@/utils/portalDataPrefetch";

const EMPTY_RESOURCE_MAP = Object.freeze({});

const buildPortalDataState = (portalData) => ({
  portalData: portalData || null,
  portalRole: portalData?.role || null,
  dashboardData: portalData?.dashboard || null,
  resourceMap: portalData?.resources || EMPTY_RESOURCE_MAP,
});

const buildInitialState = () => ({
  ...buildPortalDataState(getWarmPortalDataBundle()),
  loading: false,
  error: "",
});

export const usePortalDataStore = create((set, get) => ({
  ...buildInitialState(),
  setPortalData: (portalData) => {
    // 1. Immediate update for critical dashboard views
    const coreState = buildPortalDataState(portalData);
    set({
      ...coreState,
      resourceMap: EMPTY_RESOURCE_MAP, // Reset while waiting for idle hydration
      loading: false,
      error: "",
    });

    // 2. Idle hydration for the massive resource mapping (avoids 4s main-thread lock)
    if (portalData?.resources) {
      const hydrateResources = () => {
        set({ resourceMap: portalData.resources });
      };

      if (typeof window !== "undefined" && "requestIdleCallback" in window) {
        window.requestIdleCallback(hydrateResources, { timeout: 2000 });
      } else {
        setTimeout(hydrateResources, 500);
      }
    }
  },
  setLoading: (loading) => set({ loading: Boolean(loading) }),
  setError: (error) => set({ error: error ? String(error) : "" }),
  clearPortalState: () =>
    set({
      ...buildPortalDataState(null),
      loading: false,
      error: "",
    }),
  getResource: (endpoint) => get().resourceMap?.[endpoint] || null,
  hydratePortalData: async (options = {}) => {
    set({ loading: true, error: "" });

    try {
      const bundle = await warmPortalDataBundle(options);
      // use the new incremental setter
      get().setPortalData(bundle);
      return bundle;
    } catch (error) {
      set({
        loading: false,
        error: error?.message || "Failed to load portal data.",
      });
      throw error;
    }
  },
  refreshPortalData: async () => get().hydratePortalData({ force: true }),
}));

export const selectPortalDataApi = (state) => ({
  portalData: state.portalData,
  loading: state.loading,
  error: state.error,
  refreshPortalData: state.refreshPortalData,
  portalRole: state.portalRole,
  dashboardData: state.dashboardData,
  resourceMap: state.resourceMap,
  getResource: state.getResource,
});

export const resetPortalDataStore = () => {
  usePortalDataStore.setState({
    ...buildPortalDataState(null),
    loading: false,
    error: "",
  });
};
