"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { QUERY_GC_TIMES, QUERY_STALE_TIMES } from "@/shared/config/queryPolicies";

const getErrorStatusCode = (error) =>
  Number(error?.status || error?.response?.status || 0) || 0;

const shouldRetryQuery = (failureCount, error) => {
  const statusCode = getErrorStatusCode(error);

  // Do not retry auth/permission/not-found failures.
  if (statusCode === 401 || statusCode === 403 || statusCode === 404) {
    return false;
  }

  return failureCount < 1;
};

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: QUERY_STALE_TIMES.HIGH_CHURN_LIST,
        gcTime: QUERY_GC_TIMES.STANDARD,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        refetchOnMount: 'always', // Ensure fresh data on navigation
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
