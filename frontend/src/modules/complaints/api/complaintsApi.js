import { api } from "@/services/api";

export const COMPLAINT_DEFAULT_PAGE_SIZE = 10;

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

const buildComplaintQuery = ({
  page = 1,
  limit = COMPLAINT_DEFAULT_PAGE_SIZE,
  status = "",
  category = "",
  search = "",
  date = "",
} = {}) => {
  const query = new URLSearchParams();
  query.set("page", String(page));
  query.set("limit", String(limit));

  const normalizedStatus = String(status || "").trim();
  const normalizedCategory = String(category || "").trim();
  const normalizedSearch = String(search || "").trim();
  const normalizedDate = String(date || "").trim();

  if (normalizedStatus) query.set("status", normalizedStatus);
  if (normalizedCategory) query.set("category", normalizedCategory);
  if (normalizedSearch) query.set("search", normalizedSearch);
  if (normalizedDate) query.set("date", normalizedDate);

  return query.toString();
};

export const normalizeComplaintListPayload = (
  response,
  { fallbackPage = 1, fallbackLimit = COMPLAINT_DEFAULT_PAGE_SIZE } = {},
) => {
  const payload = unwrapEnvelope(response);
  const complaints = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload)
      ? payload
      : [];

  const pagination = payload?.pagination || {};

  return {
    complaints,
    pagination: {
      page: Number(pagination?.page || fallbackPage),
      limit: Number(pagination?.limit || fallbackLimit),
      total: Number(
        pagination?.total
          ?? payload?.count
          ?? complaints.length,
      ),
      totalPages: Number(
        pagination?.totalPages
          ?? (complaints.length > 0 ? 1 : 0),
      ),
      hasNextPage: Boolean(pagination?.hasNextPage),
      hasPrevPage: Boolean(pagination?.hasPrevPage),
    },
  };
};

export const fetchComplaintList = async ({
  page = 1,
  limit = COMPLAINT_DEFAULT_PAGE_SIZE,
  status = "",
  category = "",
  search = "",
  date = "",
  signal,
} = {}) => {
  const query = buildComplaintQuery({
    page,
    limit,
    status,
    category,
    search,
    date,
  });

  const response = await api.get(`/complaints${query ? `?${query}` : ""}`, {
    signal,
    skipCache: true,
  });

  return normalizeComplaintListPayload(response, {
    fallbackPage: page,
    fallbackLimit: limit,
  });
};
