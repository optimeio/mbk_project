const buildTrainerLabel = (schedule = {}) =>
  schedule?.trainerId?.name || schedule?.trainerId?.userId?.name || "Unassigned";

const buildTrainerCode = (schedule = {}) =>
  schedule?.trainerId?.trainerId || schedule?.trainerId?._id?.slice(-6)?.toUpperCase() || "-";

const buildLiveStatus = (schedule = {}) =>
  schedule?.liveStatus?.status || schedule?.status || "Pending";

export const transformSingleLiveExcelRow = (schedule = {}) => ({
  Time: `${schedule?.startTime} - ${schedule?.endTime}`,
  College: schedule?.collegeId?.name,
  Course: schedule?.courseId?.title,
  Company: schedule?.companyId?.name,
  Trainer: buildTrainerLabel(schedule),
  TrainerID: buildTrainerCode(schedule),
  Status: buildLiveStatus(schedule),
});

export const transformLiveExcelRows = (liveSchedules = []) =>
  (Array.isArray(liveSchedules) ? liveSchedules : []).map(transformSingleLiveExcelRow);

export const transformSingleLivePdfRow = (schedule = {}) => {
  const row = transformSingleLiveExcelRow(schedule);
  return [
    row.Time,
    row.College || "",
    row.Course || "",
    row.Company || "",
    row.Trainer || "",
    row.TrainerID || "-",
    row.Status || "Pending",
  ];
};

export const transformLivePdfRows = (liveSchedules = []) =>
  (Array.isArray(liveSchedules) ? liveSchedules : []).map(transformSingleLivePdfRow);

export const transformSingleListExcelRow = (schedule = {}) => ({
  College: schedule?.collegeId?.name || "",
  Course: schedule?.courseId?.title || "",
  Date: schedule?.scheduledDate ? new Date(schedule.scheduledDate).toLocaleDateString() : "Unscheduled",
  Time: `${schedule?.startTime} - ${schedule?.endTime}`,
  Trainer: buildTrainerLabel(schedule),
  TrainerID: buildTrainerCode(schedule),
  Status: schedule?.status || "Pending",
});

export const transformListExcelRows = (schedules = []) =>
  (Array.isArray(schedules) ? schedules : []).map(transformSingleListExcelRow);

export const transformSingleListPdfRow = (schedule = {}) => {
  const row = transformSingleListExcelRow(schedule);
  return [
    row.College || "",
    row.Course || "",
    row.Date || "Unscheduled",
    row.Time || "",
    row.Trainer || "Unassigned",
    row.TrainerID || "-",
    row.Status || "Pending",
  ];
};

export const transformListPdfRows = (schedules = []) =>
  (Array.isArray(schedules) ? schedules : []).map(transformSingleListPdfRow);
