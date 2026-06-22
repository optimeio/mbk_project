"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { QUERY_GC_TIMES, QUERY_STALE_TIMES } from "@/shared/config/queryPolicies";

const getErrorStatusCode = (error) =>
  Number(error?.status || error?.response?.status || 0) || 0;

const shouldRetryQuery = (failureCount, error) => {
  const statusCode = getErrorStatusCode(error);

  // Do not retry auth/permission/not-found/rate-limit failures.
  if (
    statusCode === 401 ||
    statusCode === 403 ||
    statusCode === 404 ||
    statusCode === 429
  ) {
    return false;
  }

  // INCREASED: Retry up to 3 times (was 1) with exponential backoff
  return failureCount < 3;
};

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: QUERY_STALE_TIMES.HIGH_CHURN_LIST,
        gcTime: QUERY_GC_TIMES.STANDARD,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        // Use cached data during rapid sidebar navigation; refetch only when stale.
        refetchOnMount: false,
        retry: shouldRetryQuery,
        networkMode: 'offlineFirst', // Use cache while offline
      },
      mutations: {
        retry: shouldRetryQuery,
      },
    },
  });

export default function QueryProvider({ children }) {
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
