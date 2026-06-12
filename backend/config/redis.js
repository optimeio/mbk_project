const Redis = require("ioredis");

const rawRedisUrl = String(process.env.REDIS_URL || "").trim();
const redisUrl = rawRedisUrl || "redis://localhost:6379";
const shouldDisableRedis =
  String(process.env.DISABLE_REDIS || "").trim() === "1" ||
  (!rawRedisUrl && process.env.NODE_ENV !== "production");
const TRANSIENT_ERROR_CODES = new Set([
  "ECONNRESET",
  "ENOTFOUND",
  "EAI_AGAIN",
  "ETIMEDOUT",
  "ECONNREFUSED",
]);

let isRedisConnected = false;
let reconnectAttempt = 0;
let fallbackLogShown = false;
let lastErrorFingerprint = null;
let lastErrorAt = 0;

const redis = shouldDisableRedis
  ? {
    get: async () => null,
    set: async () => "OK",
    smembers: async () => [],
    del: async () => 0,
    multi: () => ({
      set() { return this; },
      sadd() { return this; },
      expire() { return this; },
      exec: async () => [],
    }),
    on: () => {},
  }
  : new Redis(redisUrl, {
    maxRetriesPerRequest: 1, // Fail fast if no Redis
    connectTimeout: 10000,
    retryStrategy: (times) => {
      reconnectAttempt = times;
      isRedisConnected = false;

      if (!fallbackLogShown) {
        console.warn("[Redis] Unavailable, using in-memory fallback until reconnect.");
        fallbackLogShown = true;
      }

      // Exponential backoff up to 30s. Keep retrying for transient network issues.
      return Math.min(250 * (2 ** Math.min(times, 8)), 30000);
    },
    reconnectOnError: (err) => err?.code === "ECONNRESET",
    enableOfflineQueue: false,
  });

if (!shouldDisableRedis) {
  redis.on("ready", () => {
    const wasDisconnected = !isRedisConnected || reconnectAttempt > 0;
    isRedisConnected = true;
    reconnectAttempt = 0;
    fallbackLogShown = false;

    if (wasDisconnected) {
      console.log("[Redis] Connected");
    } else {
      console.log("[Redis] Ready");
    }
  });

  redis.on("error", (err) => {
    const code = err?.code || "UNKNOWN";
    const message = err?.message || "Unknown Redis error";
    const fingerprint = `${code}:${message}`;
    const now = Date.now();
    const isDuplicate = fingerprint === lastErrorFingerprint && (now - lastErrorAt) < 10000;

    if (isDuplicate) {
      return;
    }

    lastErrorFingerprint = fingerprint;
    lastErrorAt = now;

    if (TRANSIENT_ERROR_CODES.has(code)) {
      console.warn(`[Redis] Transient error [${code}]: ${message}`);
      return;
    }

    console.error(`[Redis] Error [${code}]: ${message}`);
  });

  redis.on("close", () => {
    if (isRedisConnected) {
      console.warn("[Redis] Connection closed, using in-memory fallback.");
    }
    isRedisConnected = false;
  });

  redis.on("end", () => {
    isRedisConnected = false;
  });
} else {
  isRedisConnected = false;
}

const withCache = async (key, ttlSec, fetchFn) => {
  if (isRedisConnected && !shouldDisableRedis) {
    try {
      const cached = await redis.get(key);
      if (cached) return JSON.parse(cached);
    } catch (e) { /* fall through */ }
  }
  const result = await fetchFn();
  if (isRedisConnected && !shouldDisableRedis && result != null) {
    redis.set(key, JSON.stringify(result), 'EX', ttlSec).catch(() => {});
  }
  return result;
};

const invalidatePattern = async (pattern) => {
  if (!isRedisConnected || shouldDisableRedis) return;
  try {
    // Use SCAN instead of KEYS to avoid blocking the Redis event loop in production
    if (typeof redis.scanStream === 'function') {
      const stream = redis.scanStream({ match: pattern, count: 100 });
      const keys = [];
      for await (const batch of stream) {
        keys.push(...batch);
      }
      if (keys.length) await redis.del(...keys);
    } else {
      // Fallback for environments without scanStream
      const keys = await redis.keys(pattern);
      if (keys.length) await redis.del(...keys);
    }
  } catch (e) {
    console.error('[Redis] Invalidation failed:', e.message);
  }
};

/**
 * Distributed lock using SET NX EX.
 * Prevents cache stampedes: only one process fetches the origin while others wait.
 *
 * @param {string} lockKey   - Unique key for the lock (e.g. 'lock:dashboard:companyA')
 * @param {number} ttlSec    - Lock TTL in seconds (auto-release)
 * @returns {boolean}        - true if lock acquired, false if already held
 */
const acquireLock = async (lockKey, ttlSec = 10) => {
  if (!isRedisConnected || shouldDisableRedis) return true; // no-op in fallback mode
  try {
    const result = await redis.set(lockKey, '1', 'NX', 'EX', ttlSec);
    return result === 'OK';
  } catch {
    return true; // fail open
  }
};

const releaseLock = async (lockKey) => {
  if (!isRedisConnected || shouldDisableRedis) return;
  try {
    await redis.del(lockKey);
  } catch { /* ignore */ }
};

module.exports = {
  redis,
  getRedisClient: () => redis,
  isAvailable: () => isRedisConnected,
  withCache,
  invalidatePattern,
  acquireLock,
  releaseLock,
};

