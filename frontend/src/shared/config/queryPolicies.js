export const QUERY_STALE_TIMES = Object.freeze({
  DASHBOARD_STATS: 30_000,
  HIGH_CHURN_LIST: 60_000,
  MASTER_DATA: 10 * 60_000,
  DETAIL: 2 * 60_000,
  LIVE_VIEW: 20_000,
});

export const QUERY_GC_TIMES = Object.freeze({
  SHORT: 10 * 60_000,
  STANDARD: 15 * 60_000,
  LONG: 30 * 60_000,
});

export const withQueryPolicy = ({
  staleTime = QUERY_STALE_TIMES.HIGH_CHURN_LIST,
  gcTime = QUERY_GC_TIMES.STANDARD,
  ...rest
} = {}) => ({
  staleTime,
  gcTime,
  ...rest,
});

