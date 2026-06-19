/**
 * Centralized auth error message resolution for Student, Trainer, and Company login flows.
 * Maps HTTP status codes, network failures, and backend flags to user-friendly messages.
 */

export const AUTH_ERROR_MESSAGES = {
  TOO_MANY_REQUESTS: "Too many requests. Please try again later.",
  CONNECTION_TIMEOUT:
    "Connection timed out. Please check your internet connection and try again.",
  INVALID_CREDENTIALS: "Invalid email or password.",
  SERVER_UNAVAILABLE: "Server temporarily unavailable.",
  UNAUTHORIZED_ACCESS: "Unauthorized account access.",
  NETWORK_ERROR:
    "Unable to reach the server. Please check your internet connection and try again.",
  OFFLINE: "You appear to be offline. Please check your internet connection.",
};

const isTimeoutError = (error) =>
  error?.code === "ETIMEDOUT" ||
  /timed out|timeout/i.test(String(error?.message || ""));

const isNetworkError = (error) =>
  !Number.isFinite(Number(error?.status)) &&
  (error?.code === "ERR_NETWORK" ||
    /network error|failed to fetch|fetch failed|networkerror/i.test(
      String(error?.message || ""),
    ));

export const resolveAuthErrorMessage = (error, fallback = AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS) => {
  if (!error) return fallback;

  const status = Number(error?.status || error?.response?.status || 0);
  const data = error?.response?.data || error?.response || error?.data || {};
  const serverMessage = String(
    error?.message ||
      data?.message ||
      error?.response?.message ||
      "",
  ).trim();

  if (status === 429 || data?.retryAfterSeconds) {
    return AUTH_ERROR_MESSAGES.TOO_MANY_REQUESTS;
  }

  if (isTimeoutError(error) || /connection timed out/i.test(serverMessage)) {
    return AUTH_ERROR_MESSAGES.CONNECTION_TIMEOUT;
  }

  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return AUTH_ERROR_MESSAGES.OFFLINE;
  }

  if (isNetworkError(error) || /network error to/i.test(serverMessage)) {
    return AUTH_ERROR_MESSAGES.NETWORK_ERROR;
  }

  if (/unexpected token|is not valid json/i.test(serverMessage)) {
    return AUTH_ERROR_MESSAGES.SERVER_UNAVAILABLE;
  }

  // Non-JSON response body (set by parseApiJsonResponse)
  if (error?.nonJsonBody !== undefined) {
    return AUTH_ERROR_MESSAGES.SERVER_UNAVAILABLE;
  }

  if (status >= 500) {
    return AUTH_ERROR_MESSAGES.SERVER_UNAVAILABLE;
  }

  if (
    data?.roleMismatch ||
    error?.roleMismatch ||
    data?.accountDeactivated ||
    error?.accountDeactivated ||
    data?.locked ||
    error?.locked ||
    data?.requiresEmailVerification ||
    error?.requiresEmailVerification ||
    data?.pendingApproval ||
    error?.pendingApproval
  ) {
    if (serverMessage && !/fetch failed|network error/i.test(serverMessage)) {
      return serverMessage;
    }
    return AUTH_ERROR_MESSAGES.UNAUTHORIZED_ACCESS;
  }

  if (status === 401 || status === 403) {
    if (serverMessage && !/fetch failed|network error/i.test(serverMessage)) {
      return serverMessage;
    }
    return status === 401
      ? AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS
      : AUTH_ERROR_MESSAGES.UNAUTHORIZED_ACCESS;
  }

  if (serverMessage && !/fetch failed|network error to/i.test(serverMessage)) {
    return serverMessage;
  }

  return fallback;
};

export const normalizeAuthResponseError = (response = {}, fallbackStatus = 0) => {
  const status = Number(response?.status || fallbackStatus || 0);
  const err = new Error(
    resolveAuthErrorMessage(
      { status, message: response?.message, response: { data: response } },
      response?.message || AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS,
    ),
  );
  err.status = status;
  err.retryAfterSeconds = response?.retryAfterSeconds;
  err.roleMismatch = response?.roleMismatch;
  err.accountDeactivated = response?.accountDeactivated;
  err.requiresEmailVerification = response?.requiresEmailVerification;
  err.pendingApproval = response?.pendingApproval;
  err.locked = response?.locked;
  return err;
};

/**
 * Safely parse a fetch Response as JSON.
 * Next.js proxy failures often return plain text ("Internal Server Error")
 * or HTML pages. Treat any non-JSON body as a server/proxy error.
 */
export const parseApiJsonResponse = async (response) => {
  // Capture response status for error context
  const status = Number(response?.status ?? 0);
  const text = await response.text();

  // If body is empty, return empty object
  if (!text) return {};

  try {
    // Attempt to parse JSON normally
    return JSON.parse(text);
  } catch (e) {
    // Non-JSON body: if the response failed, let the caller use status-based error handling.
    const preview = text.slice(0, 200);
    if (!response.ok) {
      if (typeof process !== "undefined" && process?.env?.NODE_ENV !== "production") {
        console.warn("Non-JSON response body:", text);
      }
      return {
        nonJsonBody: preview,
        message: AUTH_ERROR_MESSAGES.SERVER_UNAVAILABLE,
      };
    }

    const err = new Error(`${AUTH_ERROR_MESSAGES.SERVER_UNAVAILABLE} (Status ${status}): ${preview}`);
    err.status = status;
    err.nonJsonBody = preview;
    // Log the full body for debugging in non-production environments
    if (typeof process !== "undefined" && process?.env?.NODE_ENV !== "production") {
      console.warn("Non-JSON response body:", text);
    }
    throw err;
  }
};

export default resolveAuthErrorMessage;
