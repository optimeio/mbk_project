const mongoose = require('mongoose');
const os = require('os');
const { isAvailable } = require('../config/redis');

/**
 * Measure Node.js event loop lag in milliseconds.
 * A high lag (>100ms) indicates the process is CPU-bound / has a bottleneck.
 */
const measureEventLoopLag = () =>
  new Promise((resolve) => {
    const start = process.hrtime.bigint();
    setImmediate(() => {
      const lagNs = Number(process.hrtime.bigint() - start);
      resolve(Math.round(lagNs / 1_000_000)); // convert ns → ms
    });
  });

const checkHealth = async (req, res) => {
  const path = req.path.toLowerCase();

  // ── 1. Deep / Detailed health metrics ─────────────────────────────────
  if (path.includes('/deep')) {
    const start = Date.now();

    // DB ping
    let dbStatus = 'disconnected';
    try {
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.db.admin().ping();
        dbStatus = 'healthy';
      }
    } catch {
      dbStatus = 'unhealthy';
    }

    const [eventLoopLagMs] = await Promise.all([measureEventLoopLag()]);
    const redisStatus = isAvailable() ? 'healthy' : 'unhealthy';
    const duration = Date.now() - start;
    const mem = process.memoryUsage();
    const cpuLoad = os.loadavg(); // [1min, 5min, 15min] load averages

    // Count active connections (requires server reference — optional)
    let activeConnections = null;
    if (req.app._server) {
      activeConnections = await new Promise((resolve) => {
        req.app._server.getConnections((err, count) => resolve(err ? null : count));
      });
    }

    const overallStatus =
      dbStatus === 'healthy' && redisStatus === 'healthy' && eventLoopLagMs < 200
        ? 'healthy'
        : 'degraded';

    return res.json({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      latencyMs: duration,
      eventLoopLagMs,
      uptime: Math.floor(process.uptime()),
      db: dbStatus,
      redis: redisStatus,
      memory: {
        rss: `${Math.round(mem.rss / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(mem.heapTotal / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(mem.heapUsed / 1024 / 1024)}MB`,
        external: `${Math.round(mem.external / 1024 / 1024)}MB`,
      },
      cpu: {
        load1: cpuLoad[0].toFixed(2),
        load5: cpuLoad[1].toFixed(2),
        load15: cpuLoad[2].toFixed(2),
        cores: os.cpus().length,
      },
      ...(activeConnections !== null && { activeConnections }),
    });
  }

  // ── 2. Readiness check (checks if DB + Redis are connected) ───────────
  if (path.includes('/ready')) {
    const isDbConnected = mongoose.connection.readyState === 1;
    const isRedisConnected = isAvailable();
    const allowRedisOptional =
      String(process.env.DISABLE_REDIS || "").trim() === "1" ||
      process.env.NODE_ENV !== 'production';
    const redisStatus = isRedisConnected ? 'connected' : allowRedisOptional ? 'optional' : 'disconnected';

    if (!isDbConnected) {
      return res.status(503).json({
        status: 'unready',
        reason: 'Database not connected',
        db: 'disconnected',
        redis: redisStatus,
      });
    }

    return res.json({
      status: 'ready',
      db: 'connected',
      redis: redisStatus,
      redisOptional: allowRedisOptional,
    });
  }

  // ── 3. Liveness check (quick liveness for load balancers) ─────────────
  return res.json({
    status: 'alive',
    uptime: Math.floor(process.uptime()),
    pid: process.pid,
  });
};

module.exports = checkHealth;
