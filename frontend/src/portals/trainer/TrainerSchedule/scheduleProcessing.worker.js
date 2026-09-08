import {
  buildPendingSchedules,
  prepareCollegeStudents,
  transformScheduleRecords,
} from "./scheduleProcessing";

const workerScope = self;

workerScope.onmessage = (event) => {
  const { payload, requestId, type } = event.data || {};

  try {
    let result;

    switch (type) {
      case "currentSchedules":
        result = transformScheduleRecords(payload?.schedules || [], {
          currentTrainerId: payload?.currentTrainerId || "",
          referenceDate: payload?.referenceDate,
        });
        break;
      case "pendingSchedules":
        result = buildPendingSchedules(payload?.schedules || [], {
          currentTrainerId: payload?.currentTrainerId || "",
          referenceDate: payload?.referenceDate,
        });
        break;
      case "collegeStudents":
        result = prepareCollegeStudents(payload?.students || []);
        break;
      default:
        throw new Error(`Unknown schedule processor task: ${type}`);
    }

    workerScope.postMessage({ requestId, result });
  } catch (error) {
    workerScope.postMessage({
      requestId,
      error: error instanceof Error ? error.message : "Schedule processor worker failed.",
    });
  }
};
