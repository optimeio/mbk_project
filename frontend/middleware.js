import { NextResponse } from 'next/server';

const PROTECTED_ROUTES = [
  { prefix: '/dashboard', roles: ['superadmin', 'admin'] },
  { prefix: '/admin', roles: ['superadmin', 'admin'] },
  { prefix: '/spoc', roles: ['spocadmin', 'collegeadmin', 'superadmin'] },
  { prefix: '/trainer', roles: ['trainer', 'superadmin'] },
  { prefix: '/student', roles: ['student'] },
  { prefix: '/company', roles: ['company', 'companyadmin'] },
  { prefix: '/accountant', roles: ['accountant', 'accountnt', 'superadmin'] },
];

const PUBLIC_PREFIXES = [
  '/_next/',
  '/api/',
  '/uploads/',
  '/logos/',
  '/favicon',
  '/robots.txt',
  '/sitemap',
];

const PUBLIC_PATHS = new Set([
  '/',
  '/login',
  '/signup',
  '/forgot-password',
  '/verify-email',
  '/verify-account',
  '/trainer-signup',
  '/student/auth',
  '/company/auth',
  '/student/forgot-password',
  '/about',
  '/contact',
  '/services',
  '/courses',
  '/lms',
]);

const AUTH_ENTRY_PATHS = new Set([
  '/login',
  '/signup',
  '/student/auth',
  '/company/auth',
]);

const ROLE_HOME = {
  superadmin: '/dashboard',
  admin: '/dashboard',
  spocadmin: '/spoc/dashboard',
  collegeadmin: '/spoc/dashboard',
  trainer: '/trainer/dashboard',
  accountant: '/accountant/dashboard',
  student: '/student/dashboard',
  company: '/company/dashboard',
  companyadmin: '/company/dashboard',
};

function isTrainerSignupPath(pathname = '') {
  return pathname === '/trainer-signup' || pathname.startsWith('/trainer-signup/');
}

function isPublicPath(pathname = '') {
  return PUBLIC_PATHS.has(pathname) || isTrainerSignupPath(pathname);
}

function matchProtectedRoute(pathname = '') {
  return PROTECTED_ROUTES.find((route) => {
    if (route.prefix === '/trainer' && isTrainerSignupPath(pathname)) {
      return false;
    }
    return pathname.startsWith(route.prefix);
  }) || null;
}

function roleHome(role) {
  return ROLE_HOME[String(role || '').toLowerCase()] || null;
}

function normalizePortalRole(role) {
  const token = String(role || '').toLowerCase();
  if (token.includes('superadmin') || token === 'admin') return 'superadmin';
  if (token.includes('accountant') || token === 'accountnt') return 'accountant';
  if (token.includes('spocadmin')) return 'spocadmin';
  if (token.includes('collegeadmin')) return 'collegeadmin';
  if (token.includes('companyadmin')) return 'companyadmin';
  if (token === 'trainer') return 'trainer';
  if (token === 'student') return 'student';
  if (token === 'company') return 'company';
  return token;
}

function roleAllowedForRoute(userRole, allowedRoles) {
  const normalizedUser = normalizePortalRole(userRole);
  return allowedRoles.some((allowed) => {
    const normalizedAllowed = normalizePortalRole(allowed);
    if (normalizedAllowed === normalizedUser) return true;
    if (
      (normalizedAllowed === 'superadmin' || normalizedAllowed === 'admin')
      && normalizedUser === 'superadmin'
    ) {
      return true;
    }
    return false;
  });
}

function decodeJwtPayload(token) {
  try {
    const parts = String(token || '').split('.');
    if (parts.length !== 3) return null;

    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);

    if (typeof atob === 'function') {
      return JSON.parse(atob(padded));
    }
    return null;
  } catch {
    return null;
  }
}

function isTokenExpired(payload) {
  if (!payload?.exp) return true;
  return Date.now() / 1000 > payload.exp;
}

function getTokenFromCookieHeader(cookieHeader = '') {
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

export function middleware(req) {
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

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)',
  ],
};
