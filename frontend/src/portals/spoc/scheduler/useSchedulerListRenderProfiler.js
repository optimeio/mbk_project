"use client";

import { useMemo } from "react";

import {
  LONG_RENDER_THRESHOLD_MS,
  createProfilerCallback,
} from "@/shared/lib/renderProfiler";

const useSchedulerListRenderProfiler = ({
  thresholdMs = LONG_RENDER_THRESHOLD_MS,
  enabled = process.env.NODE_ENV !== "production",
} = {}) => {
  const onRender = useMemo(() => {
    if (!enabled) return () => {};

    const callback = createProfilerCallback({
      id: "SchedulerListSection",
      thresholdMs,
    });

    return (...args) => callback(...args);
  }, [enabled, thresholdMs]);

  return { onRender };
};

export default useSchedulerListRenderProfiler;
