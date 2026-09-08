'use client';

import notify from '@/lib/toast';

/**
 * setupGlobalErrorHandlers - Catches all unhandled errors in the app
 * Should be called once at app initialization
 */
export const setupGlobalErrorHandlers = () => {
  // Aborted/cancelled requests are an expected part of normal operation
  // (React Query cancels in-flight queries on unmount/refetch, the dev-mode
  // StrictMode double-mount, route changes, request timeouts). They are NOT
  // real failures and must not be logged or surfaced to the user.
  const isAbortError = (reason) => {
    if (!reason) return false;
    const name = reason.name || reason.code;
    if (name === 'AbortError' || name === 'ABORT_ERR') return true;
    const message = String(reason.message || reason).toLowerCase();
    return message.includes('aborted') || message.includes('cancel') || message.includes('timeout') || reason.__aborted === true;
  };

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    if (isAbortError(event.reason)) {
      event.preventDefault();
      return;
    }

    console.error('❌ Unhandled Promise Rejection:', event.reason);

    const errorMessage =
      event.reason?.message || 'An unexpected error occurred';

    // Notify user
    notify.error(errorMessage);

    // Prevent default error handling (app from crashing)
    event.preventDefault();
  });

  // Handle global errors
  window.addEventListener('error', (event) => {
    // Skip script errors from CDN/third-party (too noisy)
    if (
      event.filename &&
      (event.filename.includes('cdn') ||
        event.filename.includes('third-party'))
    ) {
      return;
    }

    console.error('❌ Global Error:', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });

    // Only notify on app-critical errors
    if (event.message.includes('Cannot read') || event.message.includes('undefined')) {
      notify.error('Something went wrong. Please refresh the page.');
    }
  });

  // Monitor network requests for failures
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    try {
      const response = await originalFetch(...args);

      // Log server errors
      if (response.status >= 500) {
        console.warn(
          `⚠️ Server error ${response.status} on ${args[0]}`
        );
      }

      return response;
    } catch (error) {
      // Don't log expected aborts/cancellations (unmount, refetch, timeout).
      if (!isAbortError(error)) {
        const rawMsg = String(error?.message || '').toLowerCase();
        const isNetworkTypeError =
          error instanceof TypeError ||
          rawMsg.includes('failed to fetch') ||
          rawMsg.includes('networkerror') ||
          rawMsg.includes('load failed');

        const message = isNetworkTypeError
          ? "Unable to reach the server. Please check your internet connection and try again."
          : (error?.message || "Network request failed.");

        console.warn("⚠️ Network request failed:", message);
      }
      throw error;
    }
  };

  console.log('✅ Global error handlers installed');
};

export default setupGlobalErrorHandlers;
