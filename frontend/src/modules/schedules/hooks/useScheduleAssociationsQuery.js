"use client";

import { useQuery } from "@tanstack/react-query";

import {
  fetchScheduleAssociations,
  SCHEDULE_ASSOCIATIONS_QUERY_KEY_PREFIX,
} from "@/modules/schedules/api/schedulesApi";
import { QUERY_GC_TIMES, QUERY_STALE_TIMES } from "@/shared/config/queryPolicies";

export const buildScheduleAssociationsQueryKey = () => [
  ...SCHEDULE_ASSOCIATIONS_QUERY_KEY_PREFIX,
];

export const getScheduleAssociationsQueryOptions = ({ enabled = true } = {}) => ({
  queryKey: buildScheduleAssociationsQueryKey(),
  enabled,
  staleTime: QUERY_STALE_TIMES.MASTER_DATA,
  gcTime: QUERY_GC_TIMES.LONG,
  refetchOnWindowFocus: false,
  queryFn: ({ signal }) => fetchScheduleAssociations({ signal }),
  placeholderData: (previousData) => previousData,
});

export const useScheduleAssociationsQuery = ({ enabled = true } = {}) =>
  useQuery(getScheduleAssociationsQueryOptions({ enabled }));

export default useScheduleAssociationsQuery;
