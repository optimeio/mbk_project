/**
 * errorTracker.js
 * ───────────────
 * Centralized error tracking middleware.
 *
 * Features:
 *  - Captures structured error context (request, user, memory)
 *  - Sends critical 5xx alerts to Google Chat Webhook
 *  - Deduplicates rapid repeat errors (10s cooldown per fingerprint)
 *  - Sentry-compatible payload structure (easy to upgrade later)
 *
 * Usage:
 *   // Place AFTER all routes, BEFORE the 404 handler in server.mjs
 *   import errorTracker from './middleware/errorTracker.js';
 *   app.use(errorTracker);
 */

const os = require('os');

// --- Alert deduplication ---------------------------------------------------
const ALERT_COOLDOWN_MS = 10_000; // 10 seconds
const recentAlerts = new Map();

const shouldAlert = (fingerprint) => {
  const now = Date.now();
  const lastSent = recentAlerts.get(fingerprint) || 0;
  if (now - lastSent < ALERT_COOLDOWN_MS) return false;
  recentAlerts.set(fingerprint, now);
  return true;
};

// Prune old fingerprints every minute
setInterval(() => {
  const cutoff = Date.now() - ALERT_COOLDOWN_MS * 10;
  for (const [key, ts] of recentAlerts.entries()) {
    if (ts < cutoff) recentAlerts.delete(key);
  }
}, 60_000).unref();

// --- Google Chat Webhook alert --------------------------------------------
const sendAlertToGoogleChat = async (errorContext) => {
  const webhookUrl = process.env.GOOGLE_CHAT_WEBHOOK_URL;
  if (!webhookUrl) return;

  const { status, message, path, method, requestId, userId } = errorContext;
  const env = process.env.NODE_ENV || 'development';

  const card = {
    cardsV2: [{
      cardId: 'error-alert',
      card: {
        header: {
          title: `🚨 [${env.toUpperCase()}] Server Error ${status}`,
          subtitle: `${method} ${path}`,
        },
        sections: [{
          widgets: [
            { textParagraph: { text: `<b>Error:</b> ${message}` } },
            { textParagraph: { text: `<b>Request ID:</b> ${requestId || 'N/A'}` } },
            { textParagraph: { text: `<b>User ID:</b> ${userId || 'anonymous'}` } },
            { textParagraph: { text: `<b>Time:</b> ${new Date().toISOString()}` } },
          ],
        }],
      },
    }],
  };

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(card),
    });
  } catch {
    // Never let alert failures break the error handler
  }
};

// --- Middleware -----------------------------------------------------------
const errorTracker = (err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  const message = status === 500 ? 'Internal Server Error' : (err.message || 'Unknown error');
  const fingerprint = `${status}:${err.message || ''}:${req.path}`;

  // Build structured error context
  const mem = process.memoryUsage();
  const errorContext = {
    requestId: req.requestId || req.headers['x-request-id'] || null,
    timestamp: new Date().toISOString(),
    status,
    message: err.message,
    stack: err.stack,
    method: req.method,
    path: req.originalUrl || req.path,
    ip: (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.ip,
    userId: req.user?.id || req.user?._id || null,
    body: process.env.NODE_ENV !== 'production' ? req.body : undefined,
    memory: {
      rss: `${Math.round(mem.rss / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(mem.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(mem.heapTotal / 1024 / 1024)}MB`,
    },
    loadAvg: os.loadavg(),
  };

  // Log at appropriate level
  if (status >= 500) {
    console.error('[ErrorTracker]', JSON.stringify(errorContext));
    // Send async alert for 5xx errors (deduplicated)
    if (shouldAlert(fingerprint)) {
      sendAlertToGoogleChat(errorContext).catch(() => {});
    }
  } else if (status >= 400) {
    console.warn('[ErrorTracker]', JSON.stringify({ ...errorContext, stack: undefined }));
  }

  // Send structured response
  if (res.headersSent) return next(err);

  res.status(status).json({
    success: false,
    message,
    requestId: errorContext.requestId,
    ...(process.env.NODE_ENV !== 'production' && {
      stack: err.stack,
      detail: err.message,
    }),
  });
};

module.exports = errorTracker;
