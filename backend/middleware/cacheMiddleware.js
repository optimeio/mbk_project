/**
 * cacheMiddleware.js
 * ──────────────────
 * Generic HTTP response cache backed by Redis (with in-memory fallback).
 *
 * Features:
 *  - Per-route configurable TTL
 *  - Automatic cache bypass for non-GET and authenticated-mutation routes
 *  - X-Cache: HIT / MISS header for CDN & observability
 *  - Stampede prevention: concurrent requests to the same cold key share one fetch
 *  - Respects Cache-Control: no-cache request header (forced refresh)
 *
 * Usage:
 *   const cache = require('./middleware/cacheMiddleware');
 *
 *   // Cache for 60 seconds:
 *   router.get('/cities', cache(60), cityController.list);
 *
 *   // Cache for 5 minutes with a custom key prefix:
 *   router.get('/dashboard', cache(300, { prefix: 'dash' }), dashController.get);
 *
 *   // Bypass cache (pass 0 or omit):
 *   router.get('/me', cache(0), authController.me);
 */

const { redis, isAvailable } = require('../config/redis');

// In-memory fallback store (LRU-like with expiry)
const memCache = new Map();

// Pending-request registry — prevents cache stampede
const inFlight = new Map();

// Cleanup memory cache every 2 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of memCache.entries()) {
    if (entry.expiresAt < now) memCache.delete(key);
  }
}, 2 * 60 * 1000).unref();

/**
 * Build a stable cache key for the request.
 * Includes prefix, pathname, and sorted query-string params.
 */
const buildCacheKey = (req, prefix = 'api') => {
  const pathname = req.path.toLowerCase().replace(/\/+$/, '');
  const query = Object.keys(req.query)
    .sort()
    .map((k) => `${k}=${req.query[k]}`)
    .join('&');
  return `${prefix}:${pathname}${query ? `?${query}` : ''}`;
};

/**
 * Returns Express middleware that caches GET responses.
 *
 * @param {number} ttlSeconds  - Cache TTL in seconds. Pass 0 to bypass.
 * @param {object} [options]
 * @param {string} [options.prefix='api']  - Redis key namespace prefix.
 */
const cache = (ttlSeconds = 60, options = {}) => {
  const { prefix = 'api' } = options;

  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET' || ttlSeconds <= 0) {
      res.setHeader('X-Cache', 'BYPASS');
      return next();
    }

    // Respect Cache-Control: no-cache from client (forced refresh)
    const ccHeader = req.headers['cache-control'] || '';
    if (ccHeader.includes('no-cache')) {
      res.setHeader('X-Cache', 'BYPASS');
      return next();
    }

    const key = buildCacheKey(req, prefix);

    // ── 1. Try Redis ──────────────────────────────────────────────────
    if (isAvailable()) {
      try {
        const cached = await redis.get(key);
        if (cached) {
          const { body, contentType, statusCode } = JSON.parse(cached);
          res.setHeader('X-Cache', 'HIT');
          res.setHeader('Content-Type', contentType || 'application/json');
          return res.status(statusCode || 200).send(body);
        }
      } catch (err) {
        console.warn(`[CacheMiddleware] Redis read failed for key "${key}":`, err.message);
        // Fall through to origin
      }
    }

    // ── 2. Try in-memory fallback ─────────────────────────────────────
    const memEntry = memCache.get(key);
    if (memEntry && memEntry.expiresAt > Date.now()) {
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('Content-Type', memEntry.contentType || 'application/json');
      return res.status(memEntry.statusCode || 200).send(memEntry.body);
    }

    // ── 3. Stampede guard ─────────────────────────────────────────────
    if (inFlight.has(key)) {
      // Attach to the existing pending promise
      try {
        const { body, contentType, statusCode } = await inFlight.get(key);
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('Content-Type', contentType || 'application/json');
        return res.status(statusCode || 200).send(body);
      } catch (_err) {
        // Pending request failed; let this request go to origin
      }
    }

    // ── 4. Cache MISS – intercept response and store ──────────────────
    res.setHeader('X-Cache', 'MISS');

    const originPromise = new Promise((resolve, reject) => {
      const originalSend = res.send.bind(res);

      res.send = function (body) {
        // Only cache 2xx JSON responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const contentType = res.getHeader('Content-Type') || 'application/json';
          const payload = { body, contentType, statusCode: res.statusCode };

          // Write to Redis
          if (isAvailable()) {
            redis
              .set(key, JSON.stringify(payload), 'EX', ttlSeconds)
              .catch((err) => {
                console.warn(`[CacheMiddleware] Redis write failed for key "${key}":`, err.message);
              });
          }

          // Write to memory fallback
          memCache.set(key, { ...payload, expiresAt: Date.now() + ttlSeconds * 1000 });

          resolve(payload);
        } else {
          reject(new Error(`Non-2xx status: ${res.statusCode}`));
        }

        return originalSend(body);
      };
    });

    inFlight.set(key, originPromise);
    originPromise.finally(() => inFlight.delete(key));

    next();
  };
};

/**
 * Invalidate all cached keys matching a prefix pattern.
 * Uses SCAN instead of KEYS to avoid blocking the Redis event loop.
 *
 * @param {string} pattern  - e.g. 'api:/cities*'
 */
const invalidateCache = async (pattern) => {
  if (isAvailable()) {
    try {
      // Use scanStream if available (ioredis), else fall back to KEYS
      if (typeof redis.scanStream === 'function') {
        const stream = redis.scanStream({ match: pattern, count: 100 });
        const keys = [];
        for await (const batch of stream) {
          keys.push(...batch);
        }
        if (keys.length) await redis.del(...keys);
      } else {
        const keys = await redis.keys(pattern);
        if (keys.length) await redis.del(...keys);
      }
    } catch (err) {
      console.error('[CacheMiddleware] Invalidation error:', err.message);
    }
  }
  // Clear memory cache by prefix
  for (const key of memCache.keys()) {
    if (key.startsWith(pattern.replace('*', ''))) memCache.delete(key);
  }
};

module.exports = { cache, invalidateCache };
