"use client";

import { useCallback, useMemo } from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  assignSchedulerSchedule,
  deleteSchedulerSchedule,
  fetchSchedulerLiveDashboard,
  fetchSchedulerSchedulesPage,
  fetchSchedulerTrainers,
} from "@/modules/schedules/api/schedulesApi";
import { useScheduleAssociationsQuery } from "@/modules/schedules/hooks/useScheduleAssociationsQuery";
import useDebouncedValue from "@/hooks/useDebouncedValue";
import {
  QUERY_GC_TIMES,
  QUERY_STALE_TIMES,
} from "@/shared/config/queryPolicies";

export const SCHEDULER_SCHEDULES_PAGE_SIZE = 50;
export const SCHEDULER_TRAINERS_PAGE_SIZE = 250;

export const buildSchedulerSchedulesQueryKey = ({ viewMode } = {}) => [
  "spoc",
  "scheduler",
  "schedules",
  viewMode,
];

export const buildSchedulerSchedulesQueryKeyPrefix = () => [
  "spoc",
  "scheduler",
  "schedules",
];

export const buildSchedulerTrainersQueryKey = ({ search = "" } = {}) => [
  "spoc",
  "scheduler",
  "trainers",
  String(search || "").trim(),
];

export const buildSchedulerLiveDashboardQueryKey = () => [
  "spoc",
  "scheduler",
  "live-dashboard",
];

export const getSchedulerSchedulesInfiniteQueryOptions = ({
  viewMode,
  pageSize = SCHEDULER_SCHEDULES_PAGE_SIZE,
} = {}) => ({
  queryKey: buildSchedulerSchedulesQueryKey({ viewMode }),
  enabled: viewMode !== "dashboard",
  staleTime: QUERY_STALE_TIMES.HIGH_CHURN_LIST,
  gcTime: QUERY_GC_TIMES.STANDARD,
  refetchOnWindowFocus: false,
  initialPageParam: 1,
  queryFn: ({ pageParam, signal }) =>
    fetchSchedulerSchedulesPage({
      page: pageParam,
      limit: pageSize,
      signal,
    }),
  getNextPageParam: (lastPage) => {
    if (!lastPage?.pagination?.hasNextPage) {
      return undefined;
    }
    return Number(lastPage?.pagination?.page || 1) + 1;
  },
  placeholderData: (previousData) => previousData,
});

export const getSchedulerTrainersQueryOptions = ({
  enabled = true,
  search = "",
  pageSize = SCHEDULER_TRAINERS_PAGE_SIZE,
} = {}) => ({
  queryKey: buildSchedulerTrainersQueryKey({ search }),
  enabled,
  staleTime: 5000, // Fetch freshly registered trainers quickly
  gcTime: QUERY_GC_TIMES.STANDARD,
  refetchOnWindowFocus: false,
  queryFn: () =>
    fetchSchedulerTrainers({
      page: 1,
      limit: pageSize,
      search,
    }),
  placeholderData: (previousData) => previousData,
});

export const getSchedulerLiveDashboardQueryOptions = ({
  viewMode,
} = {}) => ({
  queryKey: buildSchedulerLiveDashboardQueryKey(),
  enabled: viewMode === "dashboard",
  refetchInterval: viewMode === "dashboard" ? 30_000 : false,
  refetchIntervalInBackground: false,
  staleTime: QUERY_STALE_TIMES.LIVE_VIEW,
  gcTime: QUERY_GC_TIMES.STANDARD,
  refetchOnWindowFocus: false,
  queryFn: ({ signal }) => fetchSchedulerLiveDashboard({ signal }),
  placeholderData: (previousData) => previousData,
});

export const useSchedulerData = ({
  viewMode = "dashboard",
  trainerSearch = "",
  shouldLoadInteractiveData = false,
  schedulesPageSize = SCHEDULER_SCHEDULES_PAGE_SIZE,
  trainersPageSize = SCHEDULER_TRAINERS_PAGE_SIZE,
} = {}) => {
  const queryClient = useQueryClient();
  const debouncedTrainerSearch = useDebouncedValue(trainerSearch, 300);

  const associationsQuery = useScheduleAssociationsQuery();
  const schedulesQuery = useInfiniteQuery(
    getSchedulerSchedulesInfiniteQueryOptions({
      viewMode,
      pageSize: schedulesPageSize,
    }),
  );
  const trainersQuery = useQuery(
    getSchedulerTrainersQueryOptions({
      enabled: shouldLoadInteractiveData,
      search: debouncedTrainerSearch,
      pageSize: trainersPageSize,
    }),
  );
  const liveDashboardQuery = useQuery(
    getSchedulerLiveDashboardQueryOptions({ viewMode }),
  );

  const schedules = useMemo(
    () =>
      (schedulesQuery.data?.pages || [])
        .flatMap((page) => (Array.isArray(page?.rows) ? page.rows : []))
        .sort((a, b) => {
          const dateA = new Date(a.scheduledDate || 0);
          const dateB = new Date(b.scheduledDate || 0);
          return dateA - dateB;
        }),
    [schedulesQuery.data?.pages],
  );

  const schedulesPagination = schedulesQuery.data?.pages?.[
    schedulesQuery.data.pages.length - 1
  ]?.pagination || null;

  const trainers = trainersQuery.data || [];
  const filteredTrainers = useMemo(() => {
    const normalizedSearch = String(trainerSearch || "").trim().toLowerCase();
    if (!normalizedSearch) return trainers;
    return trainers.filter(
      (trainer) =>
        trainer.userId?.name?.toLowerCase().includes(normalizedSearch)
        || trainer.specialization?.toLowerCase().includes(normalizedSearch),
    );
  }, [trainerSearch, trainers]);

  const liveSchedules = liveDashboardQuery.data || [];
  const lastUpdated = liveDashboardQuery.dataUpdatedAt
    ? new Date(liveDashboardQuery.dataUpdatedAt)
    : new Date();

  const loading = associationsQuery.isPending
    || (viewMode === "dashboard" && liveDashboardQuery.isPending)
    || (viewMode !== "dashboard" && schedulesQuery.isPending)
    || (shouldLoadInteractiveData && trainersQuery.isPending);

  const invalidateSchedulerFeeds = useCallback(
    async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: buildSchedulerSchedulesQueryKeyPrefix(),
        }),
        queryClient.invalidateQueries({
          queryKey: buildSchedulerLiveDashboardQueryKey(),
        }),
      ]);
    },
    [queryClient],
  );

  const assignMutation = useMutation({
    mutationFn: ({ scheduleId, assignPayload }) =>
      assignSchedulerSchedule({ scheduleId, assignPayload }),
  });

  const deleteMutation = useMutation({
    mutationFn: ({ scheduleId, reason }) =>
      deleteSchedulerSchedule({ scheduleId, reason }),
  });

  const assignSchedule = useCallback(
    async ({ scheduleId, assignPayload }) => {
      const payload = await assignMutation.mutateAsync({
        scheduleId,
        assignPayload,
      });
      if (payload?.success !== false) {
        await invalidateSchedulerFeeds();
      }
      return payload;
    },
    [assignMutation.mutateAsync, invalidateSchedulerFeeds],
  );

  const deleteSchedule = useCallback(
    async ({ scheduleId, reason }) => {
      const payload = await deleteMutation.mutateAsync({
        scheduleId,
        reason,
      });
      if (payload?.success !== false) {
        await invalidateSchedulerFeeds();
      }
      return payload;
    },
    [deleteMutation.mutateAsync, invalidateSchedulerFeeds],
  );

  const loadMoreSchedules = useCallback(() => {
    if (!schedulesQuery.hasNextPage || schedulesQuery.isFetchingNextPage) {
      return;
    }
    void schedulesQuery.fetchNextPage();
  }, [
    schedulesQuery.fetchNextPage,
    schedulesQuery.hasNextPage,
    schedulesQuery.isFetchingNextPage,
  ]);

  const refreshSchedules = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: buildSchedulerSchedulesQueryKeyPrefix(),
    });
  }, [queryClient]);

  return {
    associationsQuery,
    schedulesQuery,
    trainersQuery,
    liveDashboardQuery,
    companies: associationsQuery.data?.companies || [],
    courses: associationsQuery.data?.courses || [],
    colleges: associationsQuery.data?.colleges || [],
    schedules,
    schedulesPagination,
    trainers,
    filteredTrainers,
    liveSchedules,
    lastUpdated,
    loading,
    loadMoreSchedules,
    assignSchedule,
    deleteSchedule,
    refreshSchedules,
    isAssigning: assignMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};

export default useSchedulerData;
