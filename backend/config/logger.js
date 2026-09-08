/**
 * Winston Enterprise Logger
 * Structured JSON logging for production, colorized dev logs
 * Supports: error tracking, request correlation IDs, performance metrics
 */

const winston = require('winston');
const path = require('path');
const { format, transports, createLogger } = winston;

const LOG_DIR = path.join(__dirname, '..', 'logs');
const isProduction = process.env.NODE_ENV === 'production';

// ── Custom log levels (RFC 5424 compatible) ─────────────────────────────────
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  silly: 6,
};

const LOG_COLORS = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'cyan',
  verbose: 'magenta',
  debug: 'blue',
  silly: 'grey',
};

winston.addColors(LOG_COLORS);

// ── Formats ──────────────────────────────────────────────────────────────────
const timestampFormat = format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' });

const jsonFormat = format.combine(
  timestampFormat,
  format.errors({ stack: true }),
  format.json(),
);

const devFormat = format.combine(
  timestampFormat,
  format.colorize({ all: true }),
  format.printf(({ timestamp, level, message, service, correlationId, durationMs, ...meta }) => {
    const prefix = `[${timestamp}] [${level}]${service ? ` [${service}]` : ''}`;
    const corrId = correlationId ? ` (${correlationId})` : '';
    const duration = durationMs != null ? ` ${durationMs}ms` : '';
    const metaStr = Object.keys(meta).length ? `\n  ${JSON.stringify(meta, null, 2)}` : '';
    return `${prefix}${corrId}${duration} ${message}${metaStr}`;
  }),
);

// ── Transport configuration ───────────────────────────────────────────────────
const getTransports = () => {
  const list = [];

  if (isProduction) {
    // Rotating file transport for production
    list.push(
      new transports.File({
        filename: path.join(LOG_DIR, 'error.log'),
        level: 'error',
        format: jsonFormat,
        maxsize: 50 * 1024 * 1024, // 50 MB
        maxFiles: 14,
        tailable: true,
      }),
      new transports.File({
        filename: path.join(LOG_DIR, 'combined.log'),
        format: jsonFormat,
        maxsize: 100 * 1024 * 1024, // 100 MB
        maxFiles: 7,
        tailable: true,
      }),
      new transports.File({
        filename: path.join(LOG_DIR, 'http.log'),
        level: 'http',
        format: jsonFormat,
        maxsize: 50 * 1024 * 1024,
        maxFiles: 7,
        tailable: true,
      }),
    );
  }

  // Console is always on — structured JSON in prod, colored in dev
  list.push(
    new transports.Console({
      format: isProduction ? jsonFormat : devFormat,
    }),
  );

  return list;
};

// ── Create core logger ────────────────────────────────────────────────────────
const logger = createLogger({
  levels: LOG_LEVELS,
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  defaultMeta: {
    service: 'mbk-api',
    env: process.env.NODE_ENV || 'development',
    pid: process.pid,
  },
  transports: getTransports(),
  exitOnError: false,
  silent: process.env.SILENT_LOGS === '1',
});

// ── Request logger middleware (replaces morgan) ───────────────────────────────
const requestLogger = (req, res, next) => {
  const start = Date.now();
  const correlationId = req.headers['x-correlation-id'] || req.headers['x-request-id'] ||
    `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  req.correlationId = correlationId;
  res.setHeader('X-Correlation-Id', correlationId);

  res.on('finish', () => {
    const durationMs = Date.now() - start;
    const level = res.statusCode >= 500 ? 'error' :
                  res.statusCode >= 400 ? 'warn' : 'http';

    logger[level](`${req.method} ${req.originalUrl}`, {
      correlationId,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      durationMs,
      contentLength: res.get('Content-Length'),
      userAgent: req.get('User-Agent'),
      ip: (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.ip,
      userId: req.user?.id,
      role: req.user?.role,
    });

    // Performance alert: warn if >500ms, error if >2000ms
    if (durationMs > 2000) {
      logger.error(`SLOW API: ${req.method} ${req.originalUrl} took ${durationMs}ms`, {
        correlationId, durationMs, threshold: 2000,
      });
    } else if (durationMs > 500) {
      logger.warn(`SLOW API: ${req.method} ${req.originalUrl} took ${durationMs}ms`, {
        correlationId, durationMs, threshold: 500,
      });
    }
  });

  next();
};

// ── Scoped child logger factory ───────────────────────────────────────────────
const createServiceLogger = (service) =>
  logger.child({ service });

// ── Stream for Morgan compatibility ──────────────────────────────────────────
const morganStream = {
  write: (message) => logger.http(message.trimEnd()),
};

// ── Convenience log helper ────────────────────────────────────────────────────
const log = {
  info: (...args) => logger.info(...args),
  warn: (...args) => logger.warn(...args),
  error: (...args) => logger.error(...args),
  debug: (...args) => logger.debug(...args),
  http: (...args) => logger.http(...args),
  verbose: (...args) => logger.verbose(...args),
  service: createServiceLogger,
  request: requestLogger,
  stream: morganStream,
};

module.exports = { logger, log, createServiceLogger, requestLogger, morganStream };
