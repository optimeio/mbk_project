"use client";

import { useCallback, useEffect, useRef } from "react";

import { mapInBatches } from "@/shared/lib/mainThread";

import {
  transformSingleListExcelRow,
  transformSingleListPdfRow,
  transformSingleLiveExcelRow,
  transformSingleLivePdfRow,
} from "./schedulerExportTransforms";

const runFallbackTransform = async (type, payload) => {
  switch (type) {
    case "live-excel":
      return mapInBatches(payload?.liveSchedules || [], (schedule) =>
        transformSingleLiveExcelRow(schedule), { batchSize: 300 });
    case "live-pdf":
      return mapInBatches(payload?.liveSchedules || [], (schedule) =>
        transformSingleLivePdfRow(schedule), { batchSize: 300 });
    case "list-excel":
      return mapInBatches(payload?.schedules || [], (schedule) =>
        transformSingleListExcelRow(schedule), { batchSize: 300 });
    case "list-pdf":
      return mapInBatches(payload?.schedules || [], (schedule) =>
        transformSingleListPdfRow(schedule), { batchSize: 300 });
    default:
      throw new Error(`Unknown scheduler export task: ${type}`);
  }
};

export default function useSchedulerExportWorker() {
  const workerRef = useRef(null);
  const pendingRequestsRef = useRef(new Map());
  const requestCounterRef = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined" || typeof Worker === "undefined") {
      return undefined;
    }

    let worker;
    try {
      worker = new Worker(new URL("./schedulerExport.worker.js", import.meta.url), {
        type: "module",
      });
    } catch (error) {
      console.warn("Scheduler export worker could not start; using fallback.", error);
      return undefined;
    }

    worker.onmessage = (event) => {
      const { error, requestId, result } = event.data || {};
      const pending = pendingRequestsRef.current.get(requestId);
      if (!pending) return;

      pendingRequestsRef.current.delete(requestId);
      if (error) {
        pending.reject(new Error(error));
        return;
      }

      pending.resolve(result);
    };

    worker.onerror = (event) => {
      const workerError = new Error(event?.message || "Scheduler export worker failed.");
      pendingRequestsRef.current.forEach(({ reject }) => reject(workerError));
      pendingRequestsRef.current.clear();
      workerRef.current = null;
    };

    workerRef.current = worker;

    return () => {
      worker.onmessage = null;
      worker.onerror = null;
      worker.terminate();
      workerRef.current = null;
      pendingRequestsRef.current.forEach(({ reject }) =>
        reject(new Error("Scheduler export worker stopped.")));
      pendingRequestsRef.current.clear();
    };
  }, []);

  const runTransform = useCallback(async (type, payload) => {
    const worker = workerRef.current;
    if (!worker) {
      return runFallbackTransform(type, payload);
    }

    return new Promise((resolve, reject) => {
      const requestId = requestCounterRef.current + 1;
      requestCounterRef.current = requestId;
      pendingRequestsRef.current.set(requestId, { resolve, reject });
      worker.postMessage({ requestId, type, payload });
    });
  }, []);

  const transformLiveExcel = useCallback(
    (liveSchedules) => runTransform("live-excel", { liveSchedules }),
    [runTransform],
  );

  const transformLivePdf = useCallback(
    (liveSchedules) => runTransform("live-pdf", { liveSchedules }),
    [runTransform],
  );

  const transformListExcel = useCallback(
    (schedules) => runTransform("list-excel", { schedules }),
    [runTransform],
  );

  const transformListPdf = useCallback(
    (schedules) => runTransform("list-pdf", { schedules }),
    [runTransform],
  );

  return {
    transformLiveExcel,
    transformLivePdf,
    transformListExcel,
    transformListPdf,
  };
}
