import { getFinancialRecords, getFinancialStats } from "@/services/financialService";

export const FINANCIAL_DEFAULT_PAGE_SIZE = 25;

const unwrapEnvelope = (response) => {
  if (
    response
    && typeof response === "object"
    && Object.prototype.hasOwnProperty.call(response, "success")
    && Object.prototype.hasOwnProperty.call(response, "data")
  ) {
    return response.data;
  }

  return response;
};

export const normalizeFinancialRecordsPayload = (
  response,
  { fallbackPage = 1, fallbackLimit = FINANCIAL_DEFAULT_PAGE_SIZE } = {},
) => {
  const payload = unwrapEnvelope(response);

  if (Array.isArray(payload)) {
    const total = payload.length;
    const totalPages = total > 0 ? 1 : 0;

    return {
      records: payload,
      pagination: {
        page: fallbackPage,
        limit: fallbackLimit,
        total,
        totalPages,
        hasNextPage: false,
        hasPrevPage: fallbackPage > 1,
      },
    };
  }

  const records = Array.isArray(payload?.data) ? payload.data : [];
  const pagination = payload?.pagination || {};

  return {
    records,
    pagination: {
      page: Number(pagination?.page || fallbackPage),
      limit: Number(pagination?.limit || fallbackLimit),
      total: Number(pagination?.total || 0),
      totalPages: Number(pagination?.totalPages || 0),
      hasNextPage: Boolean(pagination?.hasNextPage),
      hasPrevPage: Boolean(pagination?.hasPrevPage),
    },
  };
};

export const fetchFinancialRecords = async ({
  page = 1,
  limit = FINANCIAL_DEFAULT_PAGE_SIZE,
  search = "",
  status = "",
  type = "",
  startDate = "",
  endDate = "",
  signal,
} = {}) => {
  const response = await getFinancialRecords(
    {
      page,
      limit,
      search,
      status,
      type,
      startDate,
      endDate,
    },
    { signal, skipCache: true },
  );

  return normalizeFinancialRecordsPayload(response, {
    fallbackPage: page,
    fallbackLimit: limit,
  });
};

export const normalizeFinancialStatsPayload = (response) => {
  const payload = unwrapEnvelope(response);

  return {
    totalAmount: Number(payload?.totalAmount || 0),
    successAmount: Number(payload?.successAmount || 0),
    pendingAmount: Number(payload?.pendingAmount || 0),
    totalRecords: Number(payload?.totalRecords || 0),
    byStatus: payload?.byStatus || {},
  };
};

export const fetchFinancialStats = async ({ signal } = {}) => {
  const response = await getFinancialStats({ signal, skipCache: true });
  return normalizeFinancialStatsPayload(response);
};
