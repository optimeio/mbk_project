const { randomUUID } = require('crypto');

// Lazily load the logger to avoid circular deps
let _logger = null;
const getLogger = () => {
  if (!_logger) {
    try {
      _logger = require('../config/logger').logger;
    } catch {
      _logger = console;
    }
  }
  return _logger;
};

const SLOW_REQUEST_THRESHOLD_MS = Number(process.env.SLOW_REQUEST_THRESHOLD_MS) || 1000;

const SKIP_PATHS = new Set([
  '/api/health',
  '/api/health/ready',
  '/api/health/deep',
]);

const requestLogger = (req, res, next) => {
  if (SKIP_PATHS.has(req.path)) return next();

  const requestId = req.headers['x-request-id'] || randomUUID();
  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);

  const start = Date.now();

  res.on('finish', () => {
    const durationMs = Date.now() - start;
    const logger = getLogger();
    const meta = {
      requestId,
      method: req.method,
      path: req.originalUrl || req.path,
      status: res.statusCode,
      durationMs,
      ip: (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.ip || req.socket?.remoteAddress,
      userAgent: req.headers['user-agent'],
      userId: req.user?.id || req.user?._id || null,
      role: req.user?.role || null,
    };

    if (durationMs > SLOW_REQUEST_THRESHOLD_MS) {
      logger.warn?.(`SLOW ${req.method} ${req.originalUrl} (${durationMs}ms)`, meta) ||
        console.warn(JSON.stringify({ level: 'SLOW_REQUEST', ...meta }));
    } else if (res.statusCode >= 500) {
      logger.error?.(`${req.method} ${req.originalUrl} → ${res.statusCode}`, meta) ||
        console.error(JSON.stringify({ level: 'ERROR', ...meta }));
    } else if (res.statusCode >= 400) {
      logger.warn?.(`${req.method} ${req.originalUrl} → ${res.statusCode}`, meta) ||
        console.warn(JSON.stringify({ level: 'WARN', ...meta }));
    } else {
      logger.http?.(`${req.method} ${req.originalUrl} → ${res.statusCode} (${durationMs}ms)`, meta) ||
        console.log(JSON.stringify({ level: 'INFO', ...meta }));
    }
  });

  next();
};

module.exports = requestLogger;
