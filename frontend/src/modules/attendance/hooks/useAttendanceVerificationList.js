import { useQuery } from "@tanstack/react-query";

import {
  ATTENDANCE_VERIFICATION_QUERY_KEY,
  listAttendanceSubmissions,
} from "@/modules/attendance/api/attendanceApi";
import { QUERY_GC_TIMES, QUERY_STALE_TIMES } from "@/shared/config/queryPolicies";

export const buildAttendanceVerificationListQueryKey = ({
  verificationStatus = "pending",
  page = 1,
  limit = 20,
  search = "",
} = {}) => [
  ...ATTENDANCE_VERIFICATION_QUERY_KEY,
  verificationStatus,
  page,
  limit,
  String(search || "").trim().toLowerCase(),
];

export const getAttendanceVerificationListQueryOptions = ({
  verificationStatus = "pending",
  page = 1,
  limit = 20,
  search = "",
} = {}) => {
  const normalizedSearch = String(search || "").trim();

  return {
    queryKey: buildAttendanceVerificationListQueryKey({
      verificationStatus,
      page,
      limit,
      search: normalizedSearch,
    }),
    staleTime: QUERY_STALE_TIMES.HIGH_CHURN_LIST,
    gcTime: QUERY_GC_TIMES.SHORT,
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData,
    queryFn: ({ signal }) =>
      listAttendanceSubmissions(
        {
          page,
          limit,
          verificationStatus,
          search: normalizedSearch,
        },
        { signal },
      ),
  };
};

export default function useAttendanceVerificationList({
  verificationStatus = "pending",
  page = 1,
  limit = 20,
  search = "",
}) {
  return useQuery(
    getAttendanceVerificationListQueryOptions({
      verificationStatus,
      page,
      limit,
      search,
    }),
  );
}
