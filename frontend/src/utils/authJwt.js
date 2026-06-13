/**
 * Lightweight JWT helpers shared by proxy and client-side guards.
 */

export function decodeJwtPayload(token) {
  try {
    const parts = String(token || '').split('.');
    if (parts.length !== 3) return null;

    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);

    if (typeof atob === 'function') {
      return JSON.parse(atob(padded));
    }

    if (typeof Buffer !== 'undefined') {
      return JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
    }

    return null;
  } catch {
    return null;
  }
}

export function isTokenExpired(payload) {
  if (!payload?.exp) return true;
  return Date.now() / 1000 > payload.exp;
}

export function isValidAuthToken(token) {
  if (!token) return false;
  const payload = decodeJwtPayload(token);
  return Boolean(payload && !isTokenExpired(payload));
}

export function getTokenRole(token) {
  if (!isValidAuthToken(token)) return null;
  const payload = decodeJwtPayload(token);
  return payload?.role || payload?.userRole || null;
}

export function getTokenFromCookieHeader(cookieHeader = '') {
  if (!cookieHeader) return null;

  const entries = cookieHeader.split(';');
  for (const entry of entries) {
    const trimmed = entry.trim();
    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex <= 0) continue;

    const name = trimmed.slice(0, separatorIndex).trim();
    if (!['token', 'accessToken', 'mbk_token'].includes(name)) continue;

    const value = decodeURIComponent(trimmed.slice(separatorIndex + 1)).trim();
    if (value) return value;
  }

  return null;
}
