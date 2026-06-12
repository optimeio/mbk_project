/**
 * rateLimiter.js
 * ──────────────
 * Redis-backed rate limiter with in-memory fallback.
 *
 * Limits per IP:
 *   auth     — 5  req / 15 min  (brute-force protection)
 *   upload   — 10 req / 15 min  (heavy traffic protection)
 *   general  — 300 req / 15 min (supports 70K+ concurrent users)
 *
 * Standard response headers:
 *   X-RateLimit-Limit      – max allowed requests in window
 *   X-RateLimit-Remaining  – requests remaining in current window
 *   X-RateLimit-Reset      – epoch seconds when window resets
 */

const { redis, isAvailable } = require('../config/redis');

// In-memory fallback store
const memoryStore = new Map();

// Cleanup memory store every 5 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of memoryStore.entries()) {
    if (value.expiry < now) {
      memoryStore.delete(key);
    }
  }
}, 5 * 60 * 1000).unref();

const RATE_LIMIT_RULES = {
  auth: {
    windowMs: 15 * 60 * 1000,
    max: 5,
    patterns: ['/auth/login', '/auth/signup', '/auth/otp', '/auth/verify', '/auth/reset'],
  },
  upload: {
    windowMs: 15 * 60 * 1000,
    max: 10,
    patterns: ['/upload'],
  },
  dashboard: {
    windowMs: 15 * 60 * 1000,
    max: 500,
    patterns: ['/dashboard', '/dashboard-data'],
  },
  general: {
    windowMs: 15 * 60 * 1000,
    max: 300, // Supports 70K users at ~1 req/3s per user
  },
};

const getLimitRules = (path) => {
  const p = path.toLowerCase();

  if (RATE_LIMIT_RULES.auth.patterns.some((pat) => p.includes(pat))) {
    return { ...RATE_LIMIT_RULES.auth, type: 'auth' };
  }
  if (RATE_LIMIT_RULES.upload.patterns.some((pat) => p.includes(pat))) {
    return { ...RATE_LIMIT_RULES.upload, type: 'upload' };
  }
  if (RATE_LIMIT_RULES.dashboard.patterns.some((pat) => p.includes(pat))) {
    return { ...RATE_LIMIT_RULES.dashboard, type: 'dashboard' };
  }
  return { ...RATE_LIMIT_RULES.general, type: 'general' };
};

const setRateLimitHeaders = (res, { max, remaining, resetEpoch }) => {
  res.setHeader('X-RateLimit-Limit', max);
  res.setHeader('X-RateLimit-Remaining', Math.max(0, remaining));
  res.setHeader('X-RateLimit-Reset', resetEpoch);
};

const rateLimiter = async (req, res, next) => {
  // Allow bypassing rate limit in development if needed
  if (process.env.DISABLE_RATE_LIMITER === '1') {
    return next();
  }

  const requestPath = String(req.path || req.originalUrl || '').toLowerCase();
  if (req.method === 'GET' && requestPath.includes('/captcha')) {
    return next();
  }

  // Extract client IP — respects X-Forwarded-For behind load balancer
  const ip =
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.ip ||
    req.socket.remoteAddress ||
    'unknown';

  const { windowMs, max, type } = getLimitRules(req.path);
  const key = `ratelimit:${type}:${ip}`;
  const windowSec = Math.ceil(windowMs / 1000);

  // ── Redis path ──────────────────────────────────────────────────────
  if (isAvailable()) {
    try {
      // Atomic increment: returns new count and TTL in one pipeline
      const [incrResult, ttlResult] = await redis
        .multi()
        .incr(key)
        .ttl(key)
        .exec();

      const count = incrResult[1];
      let ttl = ttlResult[1];

      // First request in window: set the expiry
      if (count === 1 || ttl < 0) {
        await redis.expire(key, windowSec);
        ttl = windowSec;
      }

      const resetEpoch = Math.floor(Date.now() / 1000) + ttl;

      if (count > max) {
        setRateLimitHeaders(res, { max, remaining: 0, resetEpoch });
        res.setHeader('Retry-After', ttl > 0 ? ttl : 60);
        return res.status(429).json({
          success: false,
          message: 'Too many requests, please try again later.',
          retryAfterSeconds: ttl > 0 ? ttl : 60,
        });
      }

      setRateLimitHeaders(res, { max, remaining: max - count, resetEpoch });
      return next();
    } catch (err) {
      console.error('[RateLimiter] Redis error, falling back to memory:', err.message);
      // Fall through to memory store
    }
  }

  // ── Memory fallback path ────────────────────────────────────────────
  const now = Date.now();
  const record = memoryStore.get(key);

  if (record) {
    if (record.expiry < now) {
      // Window expired – reset
      const newRecord = { count: 1, expiry: now + windowMs };
      memoryStore.set(key, newRecord);
      setRateLimitHeaders(res, { max, remaining: max - 1, resetEpoch: Math.floor(newRecord.expiry / 1000) });
      return next();
    }

    if (record.count >= max) {
      const remainingSeconds = Math.ceil((record.expiry - now) / 1000);
      setRateLimitHeaders(res, { max, remaining: 0, resetEpoch: Math.floor(record.expiry / 1000) });
      res.setHeader('Retry-After', remainingSeconds);
      return res.status(429).json({
        success: false,
        message: 'Too many requests, please try again later.',
        retryAfterSeconds: remainingSeconds,
      });
    }

    record.count += 1;
    memoryStore.set(key, record);
    setRateLimitHeaders(res, { max, remaining: max - record.count, resetEpoch: Math.floor(record.expiry / 1000) });
  } else {
    const newRecord = { count: 1, expiry: now + windowMs };
    memoryStore.set(key, newRecord);
    setRateLimitHeaders(res, { max, remaining: max - 1, resetEpoch: Math.floor(newRecord.expiry / 1000) });
  }

  next();
};

module.exports = rateLimiter;
