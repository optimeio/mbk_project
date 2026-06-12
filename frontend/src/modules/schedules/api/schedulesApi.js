import { api } from "@/services/api";
import scheduleService from "@/services/scheduleService";
import { fetchTrainersPage } from "@/services/trainerService";

export const SCHEDULE_ASSOCIATIONS_QUERY_KEY_PREFIX = [
  "schedules",
  "associations",
];

const unwrapApiPayload = (response) => {
  if (
    response &&
    typeof response === "object" &&
    "data" in response &&
    typeof response.data !== "undefined" &&
    typeof response.success === "undefined"
  ) {
    return response.data;
  }

  return response;
};

export { unwrapApiPayload };

export const unwrapApiList = (response) => {
  const payload = unwrapApiPayload(response);
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

export const unwrapApiPagination = (response) => {
  const topLevel = response?.pagination;
  const envelopeLevel = response?.data?.pagination;
  return envelopeLevel || topLevel || null;
};

export const normalizeScheduleAssociations = (response) => {
  const payload = unwrapApiPayload(response);
  const associations =
    payload?.data && !Array.isArray(payload.data) ? payload.data : payload;

  return {
    companies: Array.isArray(associations?.companies)
      ? associations.companies
      : [],
    courses: Array.isArray(associations?.courses) ? associations.courses : [],
    colleges: Array.isArray(associations?.colleges)
      ? associations.colleges
      : [],
    departments: Array.isArray(associations?.departments)
      ? associations.departments
      : [],
  };
};

export const fetchScheduleAssociations = async ({ signal } = {}) => {
  const response = await api.get("/schedules/associations/all", {
    signal,
    skipCache: true,
  });

  return normalizeScheduleAssociations(response);
};

export const fetchSchedulerSchedulesPage = async ({
  page = 1,
  limit = 50,
  signal,
} = {}) => {
  const response = await scheduleService.getAllSchedules(
    { skipCache: true, signal },
    { page, limit },
  );

  return {
    rows: unwrapApiList(response),
    pagination: unwrapApiPagination(response),
  };
};

export const fetchSchedulerLiveDashboard = async ({ signal } = {}) => {
  const response = await scheduleService.getLiveDashboard({
    skipCache: true,
    signal,
  });
  return unwrapApiList(response);
};

export const fetchSchedulerTrainers = async ({
  search = "",
  page = 1,
  limit = 250,
} = {}) => {
  const response = await fetchTrainersPage({
    page,
    limit,
    search: String(search || "").trim(),
  });
  const trainersData = Array.isArray(response?.data) ? response.data : [];
  return trainersData.filter(
    (trainer) =>
      trainer.verificationStatus?.toLowerCase() === "verified"
      && trainer.userId?.isActive !== false,
  );
};

export const assignSchedulerSchedule = async ({
  scheduleId,
  assignPayload,
} = {}) => {
  const response = await api.put(`/schedules/${scheduleId}/assign`, assignPayload);
  return unwrapApiPayload(response);
};

export const deleteSchedulerSchedule = async ({
  scheduleId,
  reason = "",
} = {}) => {
  const url = reason
    ? `/schedules/${scheduleId}?reason=${encodeURIComponent(reason)}`
    : `/schedules/${scheduleId}`;
  const response = await api.delete(url);
  return unwrapApiPayload(response);
};
