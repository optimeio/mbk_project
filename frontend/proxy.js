/**
 * Next.js 16 App Router Proxy — RBAC route protection.
 * Runs before route handling; redirects unauthorized users before page render.
 */

import { NextResponse } from 'next/server';
import {
  AUTH_ENTRY_PATHS,
  PUBLIC_PREFIXES,
  isPublicPath,
  isTrainerSignupPath,
  matchProtectedRoute,
  normalizePortalRole,
  roleAllowedForRoute,
  roleHome,
} from './src/shared/config/routeProtection.js';
import { decodeJwtPayload, getTokenFromCookieHeader, isTokenExpired } from './src/utils/authJwt.js';

function getTokenFromRequest(req) {
  const cookieToken =
    req.cookies.get('token')?.value
    || req.cookies.get('accessToken')?.value
    || req.cookies.get('mbk_token')?.value;
  if (cookieToken) return cookieToken;

  const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7);

  return getTokenFromCookieHeader(req.headers.get('cookie') || '');
}

function getUnauthenticatedLoginPath(pathname = '/', reason = 'unauthenticated') {
  const safePath = pathname.startsWith('/') ? pathname : '/';
  const params = new URLSearchParams({ redirect: safePath, reason });

  if (safePath.startsWith('/student')) {
    return `/student/auth?${params.toString()}`;
  }
  if (safePath.startsWith('/company')) {
    return `/company/auth?${params.toString()}`;
  }
  if (safePath.startsWith('/dashboard') || safePath.startsWith('/accountant')) {
    params.set('type', 'admin');
    return `/login?${params.toString()}`;
  }
  if (safePath.startsWith('/spoc')) {
    params.set('type', 'spoc');
  } else if (safePath.startsWith('/trainer')) {
    params.set('type', 'trainer');
  }

  return `/login?${params.toString()}`;
}

function buildUnauthenticatedRedirect(req, pathname, reason) {
  return new URL(getUnauthenticatedLoginPath(pathname, reason), req.url);
}

function clearAuthCookies(response) {
  response.cookies.delete('token');
  response.cookies.delete('accessToken');
  response.cookies.delete('mbk_token');
}

export function proxy(req) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  if (isPublicPath(pathname)) {
    const token = getTokenFromRequest(req);
    if (token && AUTH_ENTRY_PATHS.has(pathname)) {
      const payload = decodeJwtPayload(token);
      if (payload && !isTokenExpired(payload)) {
        const normalizedRole = normalizePortalRole(payload.role || payload.userRole);
        const home = roleHome(normalizedRole);
        if (home && normalizedRole) {
          return NextResponse.redirect(new URL(home, req.url));
        }
      } else if (token) {
        const response = NextResponse.next();
        clearAuthCookies(response);
        return response;
      }
    }

    return NextResponse.next();
  }

  const matchedRoute = matchProtectedRoute(pathname);
  if (!matchedRoute) {
    return NextResponse.next();
  }

  const token = getTokenFromRequest(req);
  if (!token) {
    return NextResponse.redirect(
      buildUnauthenticatedRedirect(req, pathname, 'unauthenticated'),
    );
  }

  const payload = decodeJwtPayload(token);
  if (!payload) {
    const response = NextResponse.redirect(
      buildUnauthenticatedRedirect(req, pathname, 'invalid_token'),
    );
    clearAuthCookies(response);
    return response;
  }

  if (isTokenExpired(payload)) {
    const response = NextResponse.redirect(
      buildUnauthenticatedRedirect(req, pathname, 'token_expired'),
    );
    clearAuthCookies(response);
    return response;
  }

  const userRole = String(payload.role || payload.userRole || '');
  if (!userRole.trim()) {
    const response = NextResponse.redirect(
      buildUnauthenticatedRedirect(req, pathname, 'invalid_token'),
    );
    clearAuthCookies(response);
    return response;
  }

  if (!roleAllowedForRoute(userRole, matchedRoute.roles)) {
    const home = roleHome(normalizePortalRole(userRole)) || '/login';
    return NextResponse.redirect(new URL(home, req.url));
  }

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-user-id', String(payload.id || payload.userId || payload.sub || ''));
  requestHeaders.set('x-user-role', userRole);
  requestHeaders.set('x-user-email', payload.email || '');

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export default proxy;

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)',
  ],
};
