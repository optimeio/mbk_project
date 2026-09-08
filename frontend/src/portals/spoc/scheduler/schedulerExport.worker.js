import {
  transformListExcelRows,
  transformListPdfRows,
  transformLiveExcelRows,
  transformLivePdfRows,
} from "./schedulerExportTransforms";

const workerScope = self;

const transformByType = (type, payload) => {
  switch (type) {
    case "live-excel":
      return transformLiveExcelRows(payload?.liveSchedules || []);
    case "live-pdf":
      return transformLivePdfRows(payload?.liveSchedules || []);
    case "list-excel":
      return transformListExcelRows(payload?.schedules || []);
    case "list-pdf":
      return transformListPdfRows(payload?.schedules || []);
    default:
      throw new Error(`Unknown scheduler export task: ${type}`);
  }
};

workerScope.onmessage = (event) => {
  const { payload, requestId, type } = event.data || {};

  try {
    const result = transformByType(type, payload);
    workerScope.postMessage({ requestId, result });
  } catch (error) {
    workerScope.postMessage({
      requestId,
      error: error instanceof Error ? error.message : "Scheduler export worker failed.",
    });
  }
};
