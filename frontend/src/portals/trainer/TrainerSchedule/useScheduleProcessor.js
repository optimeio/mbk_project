"use client";

import { useCallback, useEffect, useRef } from "react";

import {
  buildPendingSchedules,
  prepareCollegeStudents,
  transformScheduleRecords,
} from "./scheduleProcessing";

const MAIN_THREAD_YIELD_MS = 0;
const SCHEDULE_PROCESSOR_ABORT_CODE = "SCHEDULE_PROCESSOR_ABORTED";

const createScheduleProcessorAbortError = () => {
  const error = new Error("Schedule processor worker stopped.");
  error.name = "AbortError";
  error.code = SCHEDULE_PROCESSOR_ABORT_CODE;
  return error;
};

export const isScheduleProcessorCancellationError = (error) =>
  error?.name === "AbortError" || error?.code === SCHEDULE_PROCESSOR_ABORT_CODE;

const yieldToBrowser = () =>
  new Promise((resolve) => {
    window.setTimeout(resolve, MAIN_THREAD_YIELD_MS);
  });

const runTaskOnMainThread = async (type, payload) => {
  await yieldToBrowser();

  switch (type) {
    case "currentSchedules":
      return transformScheduleRecords(payload?.schedules || [], {
        currentTrainerId: payload?.currentTrainerId || "",
        referenceDate: payload?.referenceDate,
      });
    case "pendingSchedules":
      return buildPendingSchedules(payload?.schedules || [], {
        currentTrainerId: payload?.currentTrainerId || "",
        referenceDate: payload?.referenceDate,
      });
    case "collegeStudents":
      return prepareCollegeStudents(payload?.students || []);
    default:
      throw new Error(`Unknown schedule processor task: ${type}`);
  }
};

export default function useScheduleProcessor() {
  const workerRef = useRef(null);
  const pendingRequestsRef = useRef(new Map());
  const nextRequestIdRef = useRef(0);
  const isCleaningUpRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof Worker === "undefined") {
      return undefined;
    }

    isCleaningUpRef.current = false;
    let worker;

    try {
      worker = new Worker(new URL("./scheduleProcessing.worker.js", import.meta.url), {
        type: "module",
      });
    } catch (error) {
      console.warn("Schedule processor worker could not start; using main-thread fallback.", error);
      return undefined;
    }

    worker.onmessage = (event) => {
      const { error, requestId, result } = event.data || {};
      const pendingRequest = pendingRequestsRef.current.get(requestId);
      if (!pendingRequest) {
        return;
      }

      pendingRequestsRef.current.delete(requestId);

      if (error) {
        pendingRequest.reject(new Error(error));
        return;
      }

      pendingRequest.resolve(result);
    };

    worker.onerror = (event) => {
      if (isCleaningUpRef.current) {
        return;
      }
      const workerError = new Error(event.message || "Schedule processor worker failed.");
      pendingRequestsRef.current.forEach(({ reject }) => reject(workerError));
      pendingRequestsRef.current.clear();
      workerRef.current = null;
    };

    workerRef.current = worker;

    return () => {
      isCleaningUpRef.current = true;
      worker.onmessage = null;
      worker.onerror = null;
      worker.terminate();
      workerRef.current = null;
      pendingRequestsRef.current.forEach(({ reject }) =>
        reject(createScheduleProcessorAbortError()));
      pendingRequestsRef.current.clear();
    };
  }, []);

  const runTask = useCallback(async (type, payload) => {
    const worker = workerRef.current;

    if (!worker) {
      return runTaskOnMainThread(type, payload);
    }

    return new Promise((resolve, reject) => {
      const requestId = nextRequestIdRef.current + 1;
      nextRequestIdRef.current = requestId;
      pendingRequestsRef.current.set(requestId, { resolve, reject });
      worker.postMessage({ requestId, type, payload });
    });
  }, []);

  const buildReferencePayload = useCallback(() => ({
    referenceDate: new Date().toISOString(),
  }), []);

  const processCurrentSchedules = useCallback((schedules, currentTrainerId) =>
    runTask("currentSchedules", {
      schedules,
      currentTrainerId,
      ...buildReferencePayload(),
    }), [buildReferencePayload, runTask]);

  const processPendingSchedules = useCallback((schedules, currentTrainerId) =>
    runTask("pendingSchedules", {
      schedules,
      currentTrainerId,
      ...buildReferencePayload(),
    }), [buildReferencePayload, runTask]);

  const processCollegeStudents = useCallback((students) =>
    runTask("collegeStudents", { students }), [runTask]);

  return {
    processCollegeStudents,
    processCurrentSchedules,
    processPendingSchedules,
  };
}
