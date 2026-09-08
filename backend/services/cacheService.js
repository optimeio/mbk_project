/**
 * Enterprise Cache Service
 * Circuit breaker + tiered caching (Redis L2 + in-memory L1)
 * Prevents cache stampede, thundering herd, and Redis outage cascades
 */

const NodeCache = require('node-cache');
const { redis, isAvailable, withCache: redisWithCache } = require('../config/redis');

// ── L1: In-memory cache (process-local, zero latency) ─────────────────────
const l1Cache = new NodeCache({
  stdTTL: 60,          // Default 60s TTL
  checkperiod: 30,     // Eviction check every 30s
  useClones: false,    // Avoid memory waste — return references for read-only data
  maxKeys: 5000,       // Limit to 5000 keys before LRU eviction
  deleteOnExpire: true,
});

// ── Circuit Breaker State ──────────────────────────────────────────────────
const circuitBreaker = {
  state: 'closed', // closed | open | half-open
  failureCount: 0,
  successCount: 0,
  lastFailure: null,
  openUntil: null,

  FAILURE_THRESHOLD: 5,  // Open circuit after 5 consecutive Redis failures
  HALF_OPEN_AFTER: 30000, // Try Redis again after 30s
  HALF_OPEN_MAX_CALLS: 3,
};

const isRedisCircuitOpen = () => {
  if (circuitBreaker.state === 'closed') return false;
  if (circuitBreaker.state === 'open') {
    if (Date.now() >= circuitBreaker.openUntil) {
      circuitBreaker.state = 'half-open';
      circuitBreaker.successCount = 0;
      return false;
    }
    return true;
  }
  // half-open: allow limited calls
  return false;
};

const recordSuccess = () => {
  circuitBreaker.failureCount = 0;
  if (circuitBreaker.state === 'half-open') {
    circuitBreaker.successCount++;
    if (circuitBreaker.successCount >= circuitBreaker.HALF_OPEN_MAX_CALLS) {
      circuitBreaker.state = 'closed';
      console.log('[CacheService] Circuit breaker closed — Redis healthy.');
    }
  }
};

const recordFailure = () => {
  circuitBreaker.failureCount++;
  circuitBreaker.lastFailure = Date.now();
  if (circuitBreaker.failureCount >= circuitBreaker.FAILURE_THRESHOLD) {
    circuitBreaker.state = 'open';
    circuitBreaker.openUntil = Date.now() + circuitBreaker.HALF_OPEN_AFTER;
    console.warn('[CacheService] Circuit breaker OPEN — falling back to L1 cache only.');
  }
};

// ── Cache operations ───────────────────────────────────────────────────────

/**
 * Multi-tier get:  L1 (memory) → L2 (Redis) → origin fetch
 *
 * @param {string} key
 * @param {Function} fetchFn   - Async function that fetches origin data
 * @param {Object} opts
 * @param {number} opts.l1Ttl  - L1 (memory) TTL in seconds (default: 30)
 * @param {number} opts.l2Ttl  - L2 (Redis) TTL in seconds (default: 300)
 * @param {boolean} opts.skipL1 - Skip L1 cache (for shared cross-process data)
 * @param {boolean} opts.skipL2 - Skip L2 cache (for user-specific data)
 */
const get = async (key, fetchFn, opts = {}) => {
  const { l1Ttl = 30, l2Ttl = 300, skipL1 = false, skipL2 = false } = opts;

  // ── L1 check ──────────────────────────────────────────────────────────
  if (!skipL1) {
    const l1Value = l1Cache.get(key);
    if (l1Value !== undefined) return l1Value;
  }

  // ── L2 check (Redis with circuit breaker) ────────────────────────────
  if (!skipL2 && isAvailable() && !isRedisCircuitOpen()) {
    try {
      const cached = await redis.get(key);
      if (cached !== null) {
        const parsed = JSON.parse(cached);
        if (!skipL1) l1Cache.set(key, parsed, l1Ttl);
        recordSuccess();
        return parsed;
      }
      recordSuccess();
    } catch (err) {
      recordFailure();
      console.warn(`[CacheService] Redis get failed for key "${key}": ${err.message}`);
    }
  }

  // ── Origin fetch ─────────────────────────────────────────────────────
  const result = await fetchFn();

  if (result != null) {
    // Write to both caches
    if (!skipL1) l1Cache.set(key, result, l1Ttl);
    if (!skipL2 && isAvailable() && !isRedisCircuitOpen()) {
      try {
        await redis.setex(key, l2Ttl, JSON.stringify(result));
        recordSuccess();
      } catch (err) {
        recordFailure();
      }
    }
  }

  return result;
};

/**
 * Invalidate a single cache key from both L1 and L2
 */
const del = async (key) => {
  l1Cache.del(key);
  if (isAvailable() && !isRedisCircuitOpen()) {
    try {
      await redis.del(key);
    } catch (err) {
      console.warn(`[CacheService] Redis del failed for "${key}": ${err.message}`);
    }
  }
};

/**
 * Invalidate all keys matching a prefix/pattern
 * Uses SCAN in Redis to avoid blocking
 */
const invalidatePrefix = async (prefix) => {
  // L1: filter by prefix
  const l1Keys = l1Cache.keys().filter((k) => k.startsWith(prefix));
  if (l1Keys.length) l1Cache.del(l1Keys);

  // L2: SCAN for pattern
  if (isAvailable() && !isRedisCircuitOpen()) {
    try {
      const pattern = `${prefix}*`;
      if (typeof redis.scanStream === 'function') {
        const stream = redis.scanStream({ match: pattern, count: 200 });
        const keys = [];
        for await (const batch of stream) keys.push(...batch);
        if (keys.length) await redis.del(...keys);
      } else {
        const keys = await redis.keys(pattern);
        if (keys.length) await redis.del(...keys);
      }
    } catch (err) {
      console.warn(`[CacheService] Redis invalidatePrefix failed: ${err.message}`);
    }
  }
};

/**
 * Set a value directly (write-through cache)
 */
const set = async (key, value, opts = {}) => {
  const { l1Ttl = 30, l2Ttl = 300, skipL1 = false, skipL2 = false } = opts;
  if (!skipL1) l1Cache.set(key, value, l1Ttl);
  if (!skipL2 && isAvailable() && !isRedisCircuitOpen()) {
    try {
      await redis.setex(key, l2Ttl, JSON.stringify(value));
    } catch { /* ignore */ }
  }
};

/**
 * Flush all L1 cache (useful after bulk data changes)
 */
const flushL1 = () => l1Cache.flushAll();

/**
 * Distributed lock to prevent cache stampede
 * Returns true if lock acquired, false if another process holds it
 */
const acquireLock = async (key, ttlSec = 10) => {
  if (!isAvailable() || isRedisCircuitOpen()) return true; // fail open in degraded mode
  try {
    const result = await redis.set(`lock:${key}`, '1', 'NX', 'EX', ttlSec);
    return result === 'OK';
  } catch {
    return true;
  }
};

const releaseLock = async (key) => {
  if (!isAvailable() || isRedisCircuitOpen()) return;
  try {
    await redis.del(`lock:${key}`);
  } catch { /* ignore */ }
};

/**
 * Pre-defined cache key builders for consistency
 */
const keys = {
  dashboardBundle: () => 'bundle:dashboard',
  trainerList: (page, filters) => `trainers:list:${page}:${JSON.stringify(filters)}`,
  trainerProfile: (id) => `trainer:${id}:profile`,
  attendanceStats: (period) => `attendance:stats:${period}`,
  salaryList: (month, year) => `salaries:${year}-${month}`,
  collegeList: (companyId) => `colleges:company:${companyId}`,
  scheduleList: (trainerId, month) => `schedules:trainer:${trainerId}:${month}`,
  notifications: (userId) => `notifications:${userId}`,
  companyDetails: (id) => `company:${id}`,
  cityList: () => 'cities:all',
  courseList: (companyId) => `courses:company:${companyId}`,
  complaintsStats: () => 'complaints:stats',
  financialStats: () => 'financial:stats',
};

// Circuit breaker status
const getCircuitStatus = () => ({ ...circuitBreaker });

module.exports = {
  get,
  set,
  del,
  invalidatePrefix,
  flushL1,
  acquireLock,
  releaseLock,
  keys,
  getCircuitStatus,
  l1Cache,
};
