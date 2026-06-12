"use client";

import { Profiler, useMemo } from "react";
import {
  LONG_RENDER_THRESHOLD_MS,
  createProfilerCallback,
} from "@/shared/lib/renderProfiler";

const DEFAULT_ENABLED = process.env.NODE_ENV !== "production";

export default function RenderProfiler({
  id,
  thresholdMs = LONG_RENDER_THRESHOLD_MS,
  enabled = DEFAULT_ENABLED,
  children,
}) {
  const onRender = useMemo(
    () => createProfilerCallback({ id, thresholdMs }),
    [id, thresholdMs],
  );

  if (!enabled) {
    return children;
  }

  return (
    <Profiler id={id || "RenderProfiler"} onRender={onRender}>
      {children}
    </Profiler>
  );
}

