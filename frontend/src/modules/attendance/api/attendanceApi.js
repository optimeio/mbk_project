import { api } from "@/shared/lib/apiClient";

export const ATTENDANCE_VERIFICATION_QUERY_KEY = [
  "spoc",
  "attendance-verification",
  "submissions",
];

export const GEO_VERIFICATION_QUERY_KEY = [
  "spoc",
  "geo-verification",
  "submissions",
];

export const TRAINER_ACTIVITY_QUERY_KEY = [
  "admin",
  "trainer-activity",
  "logs",
];

export const TRAINER_OVERALL_ATTENDANCE_QUERY_KEY = [
  "admin",
  "trainer-overall-attendance",
  "logs",
];

export const DEFAULT_ATTENDANCE_PAGINATION = Object.freeze({
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 0,
  hasNextPage: false,
  hasPrevPage: false,
});

export const unwrapAttendanceCollection = (response) => {
  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response?.data)) {
    return response.data;
  }

  if (Array.isArray(response?.data?.data)) {
    return response.data.data;
  }

  if (Array.isArray(response?.data?.items)) {
    return response.data.items;
  }

  return [];
};

const resolveAttendancePagination = (response, fallbackPage, fallbackLimit) => {
  const fromTopLevel = response?.pagination;
  const fromV1Envelope = response?.data?.pagination;

  const pagination = fromV1Envelope || fromTopLevel || {};

  return {
    page: pagination?.page || fallbackPage,
    limit: pagination?.limit || fallbackLimit,
    total: pagination?.total || 0,
    totalPages: pagination?.totalPages || 0,
    hasNextPage: Boolean(pagination?.hasNextPage),
    hasPrevPage: Boolean(pagination?.hasPrevPage),
  };
};

export const listAttendanceSubmissions = async (
  {
    page = 1,
    limit = 20,
    verificationStatus,
    geoVerificationStatus,
    checkOutVerificationStatus,
    search = "",
    view,
  } = {},
  requestOptions = {},
) => {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (view) {
    params.set("view", view);
  }

  if (verificationStatus) {
    params.set("verificationStatus", verificationStatus);
  }

  if (geoVerificationStatus) {
    params.set("geoVerificationStatus", geoVerificationStatus);
  }

  if (checkOutVerificationStatus) {
    params.set("checkOutVerificationStatus", checkOutVerificationStatus);
  }

  const normalizedSearch = String(search || "").trim();
  if (normalizedSearch) {
    params.set("search", normalizedSearch);
  }

  const response = await api.get(`/v1/attendance?${params.toString()}`, {
    ...requestOptions,
    skipCache: true,
  });

  if (response?.success === false) {
    throw new Error(response?.message || "Failed to load attendance submissions.");
  }

  return {
    submissions: unwrapAttendanceCollection(response),
    pagination: resolveAttendancePagination(response, page, limit),
  };
};

export const listTrainerActivity = async (
  {
    page = 1,
    limit = 10,
    searchText = "",
    startDate = "",
    endDate = "",
  } = {},
  requestOptions = {},
) => {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  const normalizedSearch = String(searchText || "").trim();
  if (normalizedSearch) {
    params.set("search", normalizedSearch);
  }

  const normalizedStartDate = String(startDate || "").trim();
  if (normalizedStartDate) {
    params.set("startDate", normalizedStartDate);
  }

  const normalizedEndDate = String(endDate || "").trim();
  if (normalizedEndDate) {
    params.set("endDate", normalizedEndDate);
  }

  const response = await api.get(`/attendance?${params.toString()}`, {
    ...requestOptions,
    skipCache: true,
  });

  if (response?.success === false) {
    throw new Error(response?.message || "Failed to load trainer activity.");
  }

  return {
    rows: unwrapAttendanceCollection(response),
    pagination: resolveAttendancePagination(response, page, limit),
  };
};

export const getAttendanceSubmissionDetails = async (
  submissionId,
  requestOptions = {},
) => {
  const normalizedId = String(submissionId || "").trim();
  if (!normalizedId) {
    return null;
  }

  const response = await api.get(`/v1/attendance/${normalizedId}/details`, {
    ...requestOptions,
    skipCache: true,
  });

  if (!response?.success) {
    return null;
  }

  if (response?.data?.data && typeof response.data.data === "object") {
    return response.data.data;
  }

  return response?.data || null;
};

export const verifyAttendanceSubmission = async ({
  submissionId,
  status,
  comment,
  approvedBy,
}) => {
  const normalizedId = String(submissionId || "").trim();
  if (!normalizedId) {
    throw new Error("Attendance submission ID is required.");
  }

  // Keep legacy verify path until v1 verify side-effects are fully parity tested.
  return api.put(`/attendance/${normalizedId}/verify`, {
    status,
    comment,
    approvedBy,
  });
};
