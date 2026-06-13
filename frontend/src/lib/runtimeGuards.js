const RECENT_REJECTION_WINDOW_MS = 10_000;
const CHUNK_RELOAD_KEY = 'mbk-chunk-reload';
const CHUNK_RELOAD_COOLDOWN_MS = 15_000;
const recentRejections = new Map();

export const isChunkLoadError = (reason) => {
  const message = String(reason?.message || reason || '');
  const name = String(reason?.name || '');
  return (
    name === 'ChunkLoadError'
    || message.includes('ChunkLoadError')
    || message.includes('Failed to load chunk')
    || message.includes('Loading chunk')
  );
};

const isBenignDevRouterError = (reason) => {
  const message =
    reason instanceof Error ? reason.message : String(reason ?? "");
  return (
    message.includes("Router action dispatched before initialization")
    || /Both middleware file .* and proxy file .* are detected/i.test(message)
    || /middleware file convention is deprecated/i.test(message)
  );
};

const shouldLogRejection = (reason) => {
  const key =
    reason instanceof Error
      ? `${reason.name}:${reason.message}`
      : String(reason ?? "unknown");

  const now = Date.now();
  const lastLoggedAt = recentRejections.get(key) || 0;
  if (now - lastLoggedAt < RECENT_REJECTION_WINDOW_MS) {
    return false;
  }

  recentRejections.set(key, now);
  return true;
};

const reloadOnceForStaleChunk = () => {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const lastReloadAt = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) || 0);
    if (lastReloadAt && Date.now() - lastReloadAt < CHUNK_RELOAD_COOLDOWN_MS) {
      return false;
    }

    sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()));
    window.location.reload();
    return true;
  } catch {
    window.location.reload();
    return true;
  }
};

const handleRuntimeFailure = (reason, event) => {
  if (isChunkLoadError(reason)) {
    if (reloadOnceForStaleChunk()) {
      event?.preventDefault?.();
    }
    return true;
  }

  if (isBenignDevRouterError(reason)) {
    event?.preventDefault?.();
    return true;
  }

  return false;
};

let guardsInstalled = false;

export const installClientRuntimeGuards = () => {
  if (guardsInstalled || typeof window === "undefined") {
    return;
  }

  guardsInstalled = true;

  window.addEventListener("unhandledrejection", (event) => {
    if (handleRuntimeFailure(event.reason, event)) {
      return;
    }

    if (!shouldLogRejection(event.reason)) {
      return;
    }

    console.error("[runtime] Unhandled promise rejection:", event.reason);
  });

  window.addEventListener("error", (event) => {
    if (!event.error && !event.message) {
      return;
    }

    const reason = event.error || event.message;
    if (handleRuntimeFailure(reason, event)) {
      return;
    }

    if (!shouldLogRejection(reason)) {
      return;
    }

    console.error("[runtime] Uncaught error:", reason);
  });
};
