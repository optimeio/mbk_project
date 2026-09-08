"use client";

const DEFAULT_IDLE_TIMEOUT_MS = 700;
const DEFAULT_BATCH_SIZE = 250;

export const runOnIdle = (callback, timeout = DEFAULT_IDLE_TIMEOUT_MS) => {
  if (typeof window === "undefined") {
    callback();
    return () => {};
  }

  if (typeof window.requestIdleCallback === "function") {
    const handle = window.requestIdleCallback(callback, { timeout });
    return () => window.cancelIdleCallback(handle);
  }

  const handle = window.setTimeout(callback, 0);
  return () => window.clearTimeout(handle);
};

export const yieldToMainThread = ({ preferIdle = true, timeout = DEFAULT_IDLE_TIMEOUT_MS } = {}) =>
  new Promise((resolve) => {
    if (typeof window === "undefined") {
      setTimeout(resolve, 0);
      return;
    }

    if (!preferIdle) {
      window.setTimeout(resolve, 0);
      return;
    }

    runOnIdle(() => resolve(), timeout);
  });

export const mapInBatches = async (
  items,
  mapper,
  { batchSize = DEFAULT_BATCH_SIZE, preferIdle = true, timeout = DEFAULT_IDLE_TIMEOUT_MS } = {},
) => {
  const source = Array.isArray(items) ? items : [];
  const safeBatchSize = Math.max(1, Number(batchSize) || DEFAULT_BATCH_SIZE);
  const output = [];

  for (let start = 0; start < source.length; start += safeBatchSize) {
    const stop = Math.min(start + safeBatchSize, source.length);
    for (let index = start; index < stop; index += 1) {
      output.push(mapper(source[index], index));
    }

    if (stop < source.length) {
      await yieldToMainThread({ preferIdle, timeout });
    }
  }

  return output;
};
