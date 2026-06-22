/**
 * asyncErrorHandler.js
 * ────────────────────
 * Wraps async route handlers and catches unhandled promise rejections.
 * Prevents server crashes and ensures all errors go to the error middleware.
 *
 * Usage:
 *   import asyncHandler from './middleware/asyncErrorHandler.js';
 *   router.post('/route', asyncHandler(async (req, res) => { ... }));
 */

const asyncErrorHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export default asyncErrorHandler;
