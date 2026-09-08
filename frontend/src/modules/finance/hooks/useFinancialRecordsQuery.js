"use client";

import { useQuery } from "@tanstack/react-query";

import {
  fetchFinancialRecords,
  FINANCIAL_DEFAULT_PAGE_SIZE,
  fetchFinancialStats,
} from "@/modules/finance/api/financeApi";
import { QUERY_GC_TIMES, QUERY_STALE_TIMES } from "@/shared/config/queryPolicies";

export const useFinancialRecordsQuery = ({
  page = 1,
  limit = FINANCIAL_DEFAULT_PAGE_SIZE,
  search = "",
  status = "",
  type = "",
  startDate = "",
  endDate = "",
} = {}) =>
  useQuery({
    queryKey: [
      "finance",
      "records",
      {
        page,
        limit,
        search: String(search || "").trim().toLowerCase(),
        status,
        type,
        startDate,
        endDate,
      },
    ],
    staleTime: QUERY_STALE_TIMES.HIGH_CHURN_LIST,
    gcTime: QUERY_GC_TIMES.STANDARD,
    queryFn: ({ signal }) =>
      fetchFinancialRecords({
        page,
        limit,
        search,
        status,
        type,
        startDate,
        endDate,
        signal,
      }),
    placeholderData: (previousData) => previousData,
  });

export const useFinancialStatsQuery = () =>
  useQuery({
    queryKey: ["finance", "stats"],
    staleTime: QUERY_STALE_TIMES.DASHBOARD_STATS,
    gcTime: QUERY_GC_TIMES.STANDARD,
    queryFn: ({ signal }) => fetchFinancialStats({ signal }),
  });
