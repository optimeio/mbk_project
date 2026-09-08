import { useInfiniteQuery } from "@tanstack/react-query";

import {
  DEFAULT_ATTENDANCE_PAGINATION,
  GEO_VERIFICATION_QUERY_KEY,
  listAttendanceSubmissions,
} from "@/modules/attendance/api/attendanceApi";
import { resolveCheckOutStatusFilter } from "@/modules/attendance/utils/geoVerificationStatus";
import { QUERY_GC_TIMES, QUERY_STALE_TIMES } from "@/shared/config/queryPolicies";
export { resolveCheckOutStatusFilter };

export const buildGeoVerificationSubmissionsQueryKey = ({
  filterStatus = "pending",
  search = "",
} = {}) => [
  ...GEO_VERIFICATION_QUERY_KEY,
  filterStatus,
  String(search || "").trim().toLowerCase(),
];

export const getGeoVerificationSubmissionsQueryOptions = ({
  filterStatus = "pending",
  search = "",
  pageLimit = 20,
} = {}) => {
  const normalizedSearch = String(search || "").trim();
  const checkOutStatusFilter = resolveCheckOutStatusFilter(filterStatus);

  return {
    queryKey: buildGeoVerificationSubmissionsQueryKey({
      filterStatus,
      search: normalizedSearch,
    }),
    staleTime: QUERY_STALE_TIMES.HIGH_CHURN_LIST,
    gcTime: QUERY_GC_TIMES.STANDARD,
    refetchOnWindowFocus: false,
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      listAttendanceSubmissions(
        {
          page: pageParam,
          limit: pageLimit,
          view: "geo-verification",
          checkOutVerificationStatus: checkOutStatusFilter,
          search: normalizedSearch,
        },
        { signal },
      ),
    getNextPageParam: (lastPage) => {
      const pagination = lastPage?.pagination || DEFAULT_ATTENDANCE_PAGINATION;
      if (!pagination.hasNextPage) return undefined;
      return Number(pagination.page || 1) + 1;
    },
    placeholderData: (previousData) => previousData,
  };
};

export default function useGeoVerificationSubmissions({
  filterStatus = "pending",
  search = "",
  pageLimit = 20,
}) {
  const query = useInfiniteQuery(
    getGeoVerificationSubmissionsQueryOptions({
      filterStatus,
      search,
      pageLimit,
    }),
  );

  const submissions =
    query.data?.pages?.flatMap((page) => page?.submissions || []) || [];
  const pagination =
    query.data?.pages?.[query.data.pages.length - 1]?.pagination ||
    DEFAULT_ATTENDANCE_PAGINATION;

  return {
    ...query,
    submissions,
    pagination,
  };
}
