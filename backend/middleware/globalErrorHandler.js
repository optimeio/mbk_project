/**
 * globalErrorHandler.js
 * ─────────────────────
 * Global error handling middleware - catches ALL errors and formats responses.
 * Integrates with errorTracker for critical alerts.
 *
 * Usage: Add at the END of middleware stack
 *   app.use(globalErrorHandler);
 */

import errorTracker from './errorTracker.js';

const globalErrorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || err.status || 500;
  const isServerError = statusCode >= 500;

  // Sanitized error message (don't leak internals)
  const message = isServerError 
    ? 'Internal server error. Please try again.' 
    : err.message || 'An error occurred';

  const errorId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Log with context
  const errorLog = {
    errorId,
    statusCode,
    message: err.message,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
    userAgent: req.get('user-agent'),
    ip: req.ip,
    stack: err.stack,
  };

  console.error('❌ ERROR:', JSON.stringify(errorLog, null, 2));

  // Track critical errors (5xx)
  if (isServerError && typeof errorTracker?.trackError === 'function') {
    try {
      errorTracker.trackError({
        title: `🚨 ${statusCode} Error on ${req.method} ${req.path}`,
        description: err.message,
        details: errorLog,
        severity: 'critical',
      });
    } catch (e) {
      console.error('Failed to track error:', e.message);
    }
  }

  // Send response with error ID for support
  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { error: err.message, errorId, stack: err.stack }),
    ...(!process.env.NODE_ENV === 'development' && { errorId }), // For user support
  });
};

export default globalErrorHandler;
