"use client";

import { useQuery } from "@tanstack/react-query";

import {
  COMPLAINT_DEFAULT_PAGE_SIZE,
  fetchComplaintList,
} from "@/modules/complaints/api/complaintsApi";
import { QUERY_GC_TIMES, QUERY_STALE_TIMES } from "@/shared/config/queryPolicies";

export const buildComplaintListQueryKey = ({
  page = 1,
  limit = COMPLAINT_DEFAULT_PAGE_SIZE,
  status = "",
  category = "",
  search = "",
  date = "",
} = {}) => [
  "complaints",
  "list",
  {
    page,
    limit,
    status: String(status || "").trim(),
    category: String(category || "").trim(),
    search: String(search || "").trim().toLowerCase(),
    date: String(date || "").trim(),
  },
];

export const getComplaintListQueryOptions = ({
  page = 1,
  limit = COMPLAINT_DEFAULT_PAGE_SIZE,
  status = "",
  category = "",
  search = "",
  date = "",
} = {}) => ({
  queryKey: buildComplaintListQueryKey({
    page,
    limit,
    status,
    category,
    search,
    date,
  }),
  staleTime: QUERY_STALE_TIMES.HIGH_CHURN_LIST,
  gcTime: QUERY_GC_TIMES.STANDARD,
  queryFn: ({ signal }) =>
    fetchComplaintList({
      page,
      limit,
      status,
      category,
      search,
      date,
      signal,
    }),
  placeholderData: (previousData) => previousData,
});

export const useComplaintListQuery = ({
  page = 1,
  limit = COMPLAINT_DEFAULT_PAGE_SIZE,
  status = "",
  category = "",
  search = "",
  date = "",
} = {}) =>
  useQuery(
    getComplaintListQueryOptions({
      page,
      limit,
      status,
      category,
      search,
      date,
    }),
  );
