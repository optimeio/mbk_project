/**
 * Metrics & Monitoring Routes
 * Exposes performance metrics for Prometheus / Datadog / Grafana
 * Protected by API key in production
 */

const express = require('express');
const os = require('os');
const mongoose = require('mongoose');
const { isAvailable: isRedisAvailable, redis } = require('../config/redis');

const router = express.Router();

// In-memory performance counters (per-process; aggregate via PM2 or separate collector)
const counters = {
  requests: { total: 0, success: 0, error4xx: 0, error5xx: 0 },
  api: new Map(), // path → { count, totalMs, errors }
  lastReset: Date.now(),
};

// Middleware to count requests (attach to app, not just metrics router)
const requestCounterMiddleware = (req, res, next) => {
  counters.requests.total++;
  const start = Date.now();

  res.on('finish', () => {
    const ms = Date.now() - start;
    const { statusCode } = res;

    if (statusCode >= 500) counters.requests.error5xx++;
    else if (statusCode >= 400) counters.requests.error4xx++;
    else counters.requests.success++;

    // Track slowest endpoints
    const key = `${req.method} ${req.route?.path || req.path.replace(/\/[0-9a-f]{24}/g, '/:id')}`;
    if (!counters.api.has(key)) {
      counters.api.set(key, { count: 0, totalMs: 0, errors: 0, maxMs: 0 });
    }
    const stat = counters.api.get(key);
    stat.count++;
    stat.totalMs += ms;
    if (ms > stat.maxMs) stat.maxMs = ms;
    if (statusCode >= 400) stat.errors++;
  });

  next();
};

// ── Protect metrics endpoint in production ────────────────────────────────────
const metricsAuth = (req, res, next) => {
  if (process.env.NODE_ENV !== 'production') return next();
  const key = req.headers['x-metrics-key'] || req.query.key;
  if (!key || key !== process.env.METRICS_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// ── GET /api/metrics — JSON metrics ────────────────────────────────────────────
router.get('/', metricsAuth, async (req, res) => {
  const memUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();

  // DB stats
  let dbStats = null;
  try {
    if (mongoose.connection.readyState === 1) {
      dbStats = await mongoose.connection.db.stats();
    }
  } catch { /* ignore */ }

  // Redis info
  let redisInfo = null;
  if (isRedisAvailable()) {
    try {
      const info = await redis.info('memory');
      const usedMem = info.match(/used_memory_human:(\S+)/)?.[1] || 'n/a';
      const connClients = info.match(/connected_clients:(\d+)/)?.[1] || 'n/a';
      redisInfo = { usedMemory: usedMem, connectedClients: connClients };
    } catch { /* ignore */ }
  }

  // Top 10 slowest routes
  const topSlowRoutes = Array.from(counters.api.entries())
    .map(([path, stat]) => ({
      path,
      count: stat.count,
      avgMs: stat.count > 0 ? Math.round(stat.totalMs / stat.count) : 0,
      maxMs: stat.maxMs,
      errorRate: stat.count > 0 ? ((stat.errors / stat.count) * 100).toFixed(1) + '%' : '0%',
    }))
    .sort((a, b) => b.avgMs - a.avgMs)
    .slice(0, 10);

  const windowSeconds = Math.floor((Date.now() - counters.lastReset) / 1000);

  res.json({
    timestamp: new Date().toISOString(),
    process: {
      pid: process.pid,
      uptime: Math.floor(process.uptime()),
      version: process.version,
      nodeEnv: process.env.NODE_ENV,
    },
    memory: {
      rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
      external: `${Math.round(memUsage.external / 1024 / 1024)}MB`,
      heapUsedPercent: `${Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100)}%`,
    },
    cpu: {
      user: Math.round(cpuUsage.user / 1000),
      system: Math.round(cpuUsage.system / 1000),
      loadAvg: os.loadavg().map((l) => l.toFixed(2)),
      cores: os.cpus().length,
    },
    requests: {
      windowSeconds,
      total: counters.requests.total,
      success: counters.requests.success,
      error4xx: counters.requests.error4xx,
      error5xx: counters.requests.error5xx,
      rps: windowSeconds > 0 ? (counters.requests.total / windowSeconds).toFixed(2) : 0,
    },
    database: dbStats
      ? {
          status: 'connected',
          dbName: dbStats.db,
          collections: dbStats.collections,
          documents: dbStats.objects,
          storageSize: `${Math.round(dbStats.storageSize / 1024 / 1024)}MB`,
          indexSize: `${Math.round(dbStats.indexSize / 1024 / 1024)}MB`,
          connections: mongoose.connection.db?.serverConfig?.connections?.().length,
        }
      : { status: 'disconnected' },
    redis: isRedisAvailable()
      ? { status: 'connected', ...redisInfo }
      : { status: 'unavailable' },
    topSlowRoutes,
  });
});

// ── GET /api/metrics/prometheus — Prometheus text format ────────────────────
router.get('/prometheus', metricsAuth, (req, res) => {
  const mem = process.memoryUsage();
  const uptime = Math.floor(process.uptime());

  const lines = [
    `# HELP mbk_process_uptime_seconds Server uptime in seconds`,
    `# TYPE mbk_process_uptime_seconds gauge`,
    `mbk_process_uptime_seconds ${uptime}`,
    ``,
    `# HELP mbk_memory_rss_bytes Process RSS memory in bytes`,
    `# TYPE mbk_memory_rss_bytes gauge`,
    `mbk_memory_rss_bytes ${mem.rss}`,
    ``,
    `# HELP mbk_memory_heap_used_bytes Heap memory used in bytes`,
    `# TYPE mbk_memory_heap_used_bytes gauge`,
    `mbk_memory_heap_used_bytes ${mem.heapUsed}`,
    ``,
    `# HELP mbk_requests_total Total HTTP requests`,
    `# TYPE mbk_requests_total counter`,
    `mbk_requests_total{status="success"} ${counters.requests.success}`,
    `mbk_requests_total{status="4xx"} ${counters.requests.error4xx}`,
    `mbk_requests_total{status="5xx"} ${counters.requests.error5xx}`,
    ``,
    `# HELP mbk_mongodb_connected MongoDB connection status`,
    `# TYPE mbk_mongodb_connected gauge`,
    `mbk_mongodb_connected ${mongoose.connection.readyState === 1 ? 1 : 0}`,
    ``,
    `# HELP mbk_redis_connected Redis connection status`,
    `# TYPE mbk_redis_connected gauge`,
    `mbk_redis_connected ${isRedisAvailable() ? 1 : 0}`,
  ];

  res.set('Content-Type', 'text/plain; version=0.0.4');
  res.send(lines.join('\n'));
});

// ── POST /api/metrics/reset — Reset counters (dev only) ───────────────────────
router.post('/reset', (req, res) => {
  if (process.env.NODE_ENV === 'production') return res.status(403).json({ error: 'Forbidden' });
  counters.requests = { total: 0, success: 0, error4xx: 0, error5xx: 0 };
  counters.api.clear();
  counters.lastReset = Date.now();
  res.json({ message: 'Counters reset.' });
});

module.exports = { router, requestCounterMiddleware };
