"use client";

import { useQuery } from "@tanstack/react-query";

import {
  listTrainerActivity,
  TRAINER_ACTIVITY_QUERY_KEY,
} from "@/modules/attendance/api/attendanceApi";
import { QUERY_GC_TIMES, QUERY_STALE_TIMES } from "@/shared/config/queryPolicies";

export const buildTrainerActivityQueryKey = ({
  page = 1,
  limit = 10,
  searchText = "",
  startDate = "",
  endDate = "",
} = {}) => [
  ...TRAINER_ACTIVITY_QUERY_KEY,
  {
    page,
    limit,
    searchText: String(searchText || "").trim().toLowerCase(),
    startDate: String(startDate || "").trim(),
    endDate: String(endDate || "").trim(),
  },
];

export const getTrainerActivityQueryOptions = ({
  page = 1,
  limit = 10,
  searchText = "",
  startDate = "",
  endDate = "",
} = {}) => ({
  queryKey: buildTrainerActivityQueryKey({
    page,
    limit,
    searchText,
    startDate,
    endDate,
  }),
  staleTime: QUERY_STALE_TIMES.HIGH_CHURN_LIST,
  gcTime: QUERY_GC_TIMES.STANDARD,
  refetchOnWindowFocus: false,
  placeholderData: (previousData) => previousData,
  queryFn: ({ signal }) =>
    listTrainerActivity(
      {
        page,
        limit,
        searchText,
        startDate,
        endDate,
      },
      { signal },
    ),
});

export default function useTrainerActivityQuery({
  page = 1,
  limit = 10,
  searchText = "",
  startDate = "",
  endDate = "",
} = {}) {
  return useQuery(
    getTrainerActivityQueryOptions({
      page,
      limit,
      searchText,
      startDate,
      endDate,
    }),
  );
}
