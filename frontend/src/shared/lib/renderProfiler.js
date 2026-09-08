export const LONG_RENDER_THRESHOLD_MS = 50;
const LOG_THROTTLE_WINDOW_MS = 1500;

const toRoundedDuration = (value) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return 0;
  }
  return Number(numericValue.toFixed(2));
};

export const shouldFlagLongRender = (
  actualDuration,
  thresholdMs = LONG_RENDER_THRESHOLD_MS,
) => {
  const duration = Number(actualDuration);
  return Number.isFinite(duration) && duration > Number(thresholdMs);
};

export const createProfilerCallback = ({
  id,
  thresholdMs = LONG_RENDER_THRESHOLD_MS,
  logger = console.warn,
  now = () => Date.now(),
} = {}) => {
  let lastLoggedAt = 0;

  return (
    profilerId,
    phase,
    actualDuration,
    baseDuration,
    startTime,
    commitTime,
  ) => {
    if (!shouldFlagLongRender(actualDuration, thresholdMs)) {
      return;
    }

    const timestamp = now();
    if (timestamp - lastLoggedAt < LOG_THROTTLE_WINDOW_MS) {
      return;
    }
    lastLoggedAt = timestamp;

    const componentId = id || profilerId || "UnknownComponent";
    const roundedDuration = toRoundedDuration(actualDuration);
    const roundedBaseDuration = toRoundedDuration(baseDuration);

    logger(
      `[render-profiler] ${componentId} ${phase} render took ${roundedDuration}ms (> ${thresholdMs}ms threshold)`,
      {
        id: componentId,
        phase,
        actualDurationMs: roundedDuration,
        baseDurationMs: roundedBaseDuration,
        startTimeMs: toRoundedDuration(startTime),
        commitTimeMs: toRoundedDuration(commitTime),
      },
    );
  };
};

