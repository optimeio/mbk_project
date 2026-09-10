"use client";

import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { usePortalData } from "@/context/PortalDataContext";
import authService from "@/services/authService";
import { getTrainerProfile } from "@/services/trainerService";

import {
  buildTrainerDashboardScheduleSummary,
  buildTrainerDashboardSnapshotKey,
  fetchTrainerDashboardScheduleSummary,
  clearTrainerDashboardScheduleSummaryCache,
  clearTrainerDashboardSnapshot,
} from "./dashboardUtils";
import { clearPortalDataBundle } from "@/utils/portalDataPrefetch";
import { api } from "@/services/api";

const EMPTY_STATS = {
  upcoming: 0,
  completed: 0,
  pending: 0,
  colleges: 0,
};
const TRAINER_DASHBOARD_SNAPSHOT_TTL_MS = 30 * 60 * 1000;

const canUseSessionStorage = () =>
  typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";

const readTrainerDashboardSnapshot = (snapshotKey) => {
  if (!snapshotKey || !canUseSessionStorage()) {
    return null;
  }

  try {
    const rawSnapshot = window.sessionStorage.getItem(snapshotKey);
    if (!rawSnapshot) return null;

    const parsedSnapshot = JSON.parse(rawSnapshot);
    const updatedAt = Number(parsedSnapshot?.updatedAt || 0);
    const isFreshSnapshot =
      Number.isFinite(updatedAt) &&
      Date.now() - updatedAt <= TRAINER_DASHBOARD_SNAPSHOT_TTL_MS;

    if (!isFreshSnapshot) {
      window.sessionStorage.removeItem(snapshotKey);
      return null;
    }

    return parsedSnapshot?.data || null;
  } catch {
    return null;
  }
};

const writeTrainerDashboardSnapshot = (snapshotKey, data) => {
  if (!snapshotKey || !canUseSessionStorage()) {
    return;
  }

  try {
    window.sessionStorage.setItem(
      snapshotKey,
      JSON.stringify({
        updatedAt: Date.now(),
        data,
      }),
    );
  } catch {
    // Ignore storage write failures and continue with in-memory state.
  }
};

const fetchTrainerDashboardData = async (currentUser, portalSchedules) => {
  const initialTrainerId =
    currentUser?.id || currentUser?._id || currentUser?.userId || null;

  const profileTask = getTrainerProfile().catch((profileError) => {
    console.warn("Trainer dashboard profile refresh failed:", profileError);
    return null;
  });

  // If portal already gave us schedules, skip refetching them and just get attendance
  const scheduleTask = portalSchedules
    ? Promise.resolve({ portalProvided: true })
    : initialTrainerId
    ? fetchTrainerDashboardScheduleSummary(initialTrainerId).catch(
        (scheduleError) => {
          console.warn(
            "Trainer dashboard initial schedule prefetch failed:",
            scheduleError,
          );
          return null;
        },
      )
    : Promise.resolve(null);

  const [profileRes, scheduleResult] = await Promise.all([
    profileTask,
    scheduleTask,
  ]);

  const trainerProfile = profileRes?.data || profileRes?.user || null;
  const trainerId = trainerProfile?.id || trainerProfile?._id || initialTrainerId;

  if (!trainerId) {
    return {
      profileData: trainerProfile,
      upcomingSchedules: [],
      recentActivities: [],
      stats: EMPTY_STATS,
    };
  }

  // If portal provided schedules, build summary with attendance records
  if (portalSchedules && scheduleResult?.portalProvided) {
    const extractArray = (raw) => {
      if (!raw) return [];
      if (Array.isArray(raw)) return raw;
      if (Array.isArray(raw.data)) return raw.data;
      if (Array.isArray(raw.data?.data)) return raw.data.data;
      return [];
    };
    const attendanceRes = await api.get(`/attendance/trainer/${trainerId}`).catch(() => null);
    const attendanceRecords = extractArray(attendanceRes);
    const summary = buildTrainerDashboardScheduleSummary(
      portalSchedules.current || [],
      portalSchedules.previous || [],
      attendanceRecords,
    );
    return {
      profileData: trainerProfile,
      upcomingSchedules: summary.upcomingSchedules || [],
      recentActivities: summary.recentActivities || [],
      stats: summary.stats || EMPTY_STATS,
    };
  }

  const scheduleSnapshot =
    scheduleResult && !scheduleResult.portalProvided && String(initialTrainerId) === String(trainerId)
      ? scheduleResult
      : await fetchTrainerDashboardScheduleSummary(trainerId);

  return {
    profileData: trainerProfile,
    upcomingSchedules: scheduleSnapshot?.upcomingSchedules || [],
    recentActivities: scheduleSnapshot?.recentActivities || [],
    stats: scheduleSnapshot?.stats || EMPTY_STATS,
  };
};

export default function useTrainerDashboardData(currentUser) {
  const { dashboardData, portalRole, portalLoading } = usePortalData((state) => ({
    dashboardData: state.dashboardData,
    portalRole: state.portalRole,
    portalLoading: state.loading,
  }));
  const resolvedCurrentUserId =
    currentUser?.id || currentUser?._id || currentUser?.userId || "unknown";
  const dashboardSnapshotStorageKey = useMemo(
    () => buildTrainerDashboardSnapshotKey(resolvedCurrentUserId),
    [resolvedCurrentUserId],
  );
  const hasValidSession = Boolean(currentUser) && Boolean(authService.getValidToken());
  const cachedDashboardSnapshot = useMemo(
    () => (hasValidSession ? readTrainerDashboardSnapshot(dashboardSnapshotStorageKey) : null),
    [dashboardSnapshotStorageKey, hasValidSession],
  );

  const portalDashboard =
    portalRole === "Trainer" && dashboardData ? dashboardData : null;

  // Build portal schedule refs for the query if available
  // Memoized to avoid new object reference on each render causing extra refetches
  const portalSchedules = useMemo(() => portalDashboard ? {
    current: portalDashboard.currentMonthSchedule || [],
    previous: portalDashboard.previousMonthSchedule || [],
  } : null, [portalDashboard]);

  const fallbackQuery = useQuery({
    queryKey: [
      "trainer",
      "dashboard-fallback",
      resolvedCurrentUserId,
    ],
    queryFn: () => fetchTrainerDashboardData(currentUser, portalSchedules),
    enabled: hasValidSession,
    initialData: cachedDashboardSnapshot || undefined,
    staleTime: 90_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    retry: 1,
    placeholderData: (previousData) => previousData,
  });

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const refreshKey = `trainer-dashboard:refresh:${resolvedCurrentUserId}`;
    const handleStorage = (event) => {
      if (!event?.key) return;
      if (event.key === refreshKey || event.key === dashboardSnapshotStorageKey) {
        clearPortalDataBundle();
        clearTrainerDashboardSnapshot(resolvedCurrentUserId);
        clearTrainerDashboardScheduleSummaryCache(resolvedCurrentUserId);
        void fallbackQuery.refetch();
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, [dashboardSnapshotStorageKey, fallbackQuery, resolvedCurrentUserId]);

  // Always write snapshot from fallback query data (it includes real attendance statuses)
  useEffect(() => {
    if (!fallbackQuery.data) {
      return;
    }
    writeTrainerDashboardSnapshot(dashboardSnapshotStorageKey, fallbackQuery.data);
  }, [dashboardSnapshotStorageKey, fallbackQuery.data]);

  // Always use fallback query data (which is attendance-enriched, always enabled)
  const profileData = fallbackQuery.data?.profileData || portalDashboard?.profile || null;
  const upcomingSchedules = fallbackQuery.data?.upcomingSchedules || [];
  const recentActivities = fallbackQuery.data?.recentActivities || [];
  const stats = fallbackQuery.data?.stats || EMPTY_STATS;
  const hasFallbackDashboardData =
    Boolean(fallbackQuery.data?.profileData) ||
    (fallbackQuery.data?.upcomingSchedules || []).length > 0 ||
    (fallbackQuery.data?.recentActivities || []).length > 0;

  const loading = !hasFallbackDashboardData && (
    portalLoading || fallbackQuery.isPending
  );

  const error = fallbackQuery.error ? "Failed to load dashboard data." : "";

  return {
    error,
    loading,
    profileData,
    recentActivities,
    stats,
    upcomingSchedules,
  };
}
