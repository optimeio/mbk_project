"use client";

import { useQuery } from "@tanstack/react-query";

import { isPortalRecord } from "@/utils/portalUserDisplay";
import { getTrainerProfile } from "@/services/trainerService";

export const TRAINER_PORTAL_PROFILE_KEY = ["trainer", "portal-profile", "me"];

export const normalizeTrainerPortalProfile = (response) => {
  const candidate =
    response?.data?.trainer
    ?? response?.data
    ?? response?.trainer
    ?? response;

  return isPortalRecord(candidate) ? candidate : null;
};

const shouldRetryTrainerProfile = (failureCount, error) => {
  const status = Number(error?.status || error?.response?.status || 0);
  if (status === 401 || status === 403 || status === 404) {
    return false;
  }
  return failureCount < 1;
};

export default function useTrainerPortalProfile({ enabled = false } = {}) {
  return useQuery({
    queryKey: TRAINER_PORTAL_PROFILE_KEY,
    enabled: Boolean(enabled),
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
    throwOnError: false,
    retry: shouldRetryTrainerProfile,
    placeholderData: null,
    queryFn: async () => {
      try {
        const response = await getTrainerProfile();
        return normalizeTrainerPortalProfile(response);
      } catch (error) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("[useTrainerPortalProfile] fetch failed:", error);
        }
        return null;
      }
    },
  });
}
