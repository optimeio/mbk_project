import { useQuery } from "@tanstack/react-query";

import { normalizeScheduleAssociations } from "@/modules/schedules";
import { api, readApiCache } from "@/services/api";
import scheduleService from "@/services/scheduleService";
import { QUERY_GC_TIMES, QUERY_STALE_TIMES } from "@/shared/config/queryPolicies";

export const DASHBOARD_QUERY_KEYS = {
  superAdmin: ["dashboard", "super-admin"],
  spoc: ["dashboard", "spoc"],
};

export const useSuperAdminDashboardQuery = ({ enabled = true } = {}) =>
  useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.superAdmin,
    staleTime: QUERY_STALE_TIMES.DASHBOARD_STATS,
    gcTime: QUERY_GC_TIMES.STANDARD,
    refetchOnWindowFocus: false,
    // Paint instantly from the bundle-primed cache; fresh data replaces it.
    placeholderData: () => {
      const cached = readApiCache("/dashboard/super-admin");
      if (!cached) return undefined;
      return cached?.data || cached;
    },
    queryFn: async () => {
      const response = await api.get("/dashboard/super-admin", {
        skipCache: true,
      });
      return response?.data || response || {};
    },
    enabled,
  });

export const useSpocDashboardQuery = ({ enabled = true } = {}) =>
  useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.spoc,
    staleTime: QUERY_STALE_TIMES.LIVE_VIEW,
    gcTime: QUERY_GC_TIMES.STANDARD,
    refetchOnWindowFocus: false,
    // Paint instantly from the bundle-primed cache; fresh data replaces it.
    placeholderData: () => {
      const liveDashboard = readApiCache("/schedules/live-dashboard");
      const cachedAssociations = readApiCache("/schedules/associations/all");
      if (!liveDashboard && !cachedAssociations) return undefined;
      const associations = cachedAssociations
        ? {
          ...(typeof cachedAssociations === "object" ? cachedAssociations : {}),
          data: normalizeScheduleAssociations(cachedAssociations),
        }
        : undefined;
      return {
        fetchedAt: 0,
        resourceMap: {
          "/schedules/live-dashboard": liveDashboard,
          "/schedules/associations/all": associations,
        },
      };
    },
    queryFn: async () => {
      const [liveDashboard, associationsResponse] = await Promise.all([
        scheduleService.getLiveDashboard({ skipCache: true }),
        scheduleService.getAssociations({ skipCache: true }),
      ]);
      const normalizedAssociations = normalizeScheduleAssociations(
        associationsResponse,
      );
      const associations =
        associationsResponse
        && typeof associationsResponse === "object"
        && (Object.prototype.hasOwnProperty.call(associationsResponse, "success")
          || Object.prototype.hasOwnProperty.call(associationsResponse, "data")
          || Object.prototype.hasOwnProperty.call(associationsResponse, "message")
          || Object.prototype.hasOwnProperty.call(associationsResponse, "error"))
          ? {
            ...associationsResponse,
            data: normalizedAssociations,
          }
          : {
            success: true,
            data: normalizedAssociations,
          };

      return {
        fetchedAt: Date.now(),
        resourceMap: {
          "/schedules/live-dashboard": liveDashboard,
          "/schedules/associations/all": associations,
        },
      };
    },
    enabled,
  });
