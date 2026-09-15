"use client";

import { useQuery } from "@tanstack/react-query";

import {
  listTrainerActivity,
  TRAINER_OVERALL_ATTENDANCE_QUERY_KEY,
} from "@/modules/attendance/api/attendanceApi";
import { QUERY_GC_TIMES, QUERY_STALE_TIMES } from "@/shared/config/queryPolicies";

export const buildTrainerOverallAttendanceQueryKey = ({
  page = 1,
  limit = 25,
  searchText = "",
  startDate = "",
  endDate = "",
  date = "",
  trainerId = "",
  collegeId = "",
  dayNumber = "",
} = {}) => [
  ...TRAINER_OVERALL_ATTENDANCE_QUERY_KEY,
  {
    page,
    limit,
    searchText: String(searchText || "").trim().toLowerCase(),
    startDate: String(startDate || "").trim(),
    endDate: String(endDate || "").trim(),
    date: String(date || "").trim(),
    trainerId: String(trainerId || "").trim(),
    collegeId: String(collegeId || "").trim(),
    dayNumber: dayNumber || "",
  },
];

export const getTrainerOverallAttendanceQueryOptions = ({
  page = 1,
  limit = 25,
  searchText = "",
  startDate = "",
  endDate = "",
  date = "",
  trainerId = "",
  collegeId = "",
  dayNumber = "",
} = {}) => ({
  queryKey: buildTrainerOverallAttendanceQueryKey({
    page,
    limit,
    searchText,
    startDate,
    endDate,
    date,
    trainerId,
    collegeId,
    dayNumber,
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
        date,
        trainerId,
        collegeId,
        dayNumber,
      },
      { signal },
    ),
});

export default function useTrainerOverallAttendanceQuery({
  page = 1,
  limit = 25,
  searchText = "",
  startDate = "",
  endDate = "",
  date = "",
  trainerId = "",
  collegeId = "",
  dayNumber = "",
} = {}) {
  return useQuery(
    getTrainerOverallAttendanceQueryOptions({
      page,
      limit,
      searchText,
      startDate,
      endDate,
      date,
      trainerId,
      collegeId,
      dayNumber,
    }),
  );
}
