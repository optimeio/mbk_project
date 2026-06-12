/**
 * Next.js App Router Proxy — RBAC Route Protection
 *
 * Runs before route handling and validates lightweight auth state
 * so unauthorized users are redirected before page rendering begins.
 */

import { NextResponse } from 'next/server';

const PROTECTED_ROUTES = [
  { prefix: '/dashboard', roles: ['superadmin', 'admin'] },
  { prefix: '/spoc', roles: ['spocadmin', 'collegeadmin', 'superadmin'] },
  { prefix: '/trainer/', roles: ['trainer'] },
  { prefix: '/student/', roles: ['student'] },
  { prefix: '/company/', roles: ['company', 'companyadmin'] },
  { prefix: '/accountant', roles: ['accountant', 'superadmin'] },
  { prefix: '/chat', roles: ['superadmin', 'spocadmin', 'collegeadmin', 'trainer', 'accountant', 'student', 'company', 'companyadmin'] },
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
  '/about',
  '/contact',
  '/services',
  '/courses',
  '/lms',
]);

const AUTH_ENTRY_PATHS = new Set(['/login', '/signup', '/student/auth', '/company/auth']);

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

const roleHome = (role) => ROLE_HOME[String(role || '').toLowerCase()] || null;

function decodeJwtPayload(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const decoded = atob(padded);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

function getTokenFromRequest(req) {
  const cookieToken = req.cookies.get('token')?.value ||
    req.cookies.get('accessToken')?.value ||
    req.cookies.get('mbk_token')?.value;
  if (cookieToken) return cookieToken;

  const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7);

  return null;
}

function isTokenExpired(payload) {
  if (!payload?.exp) return true;
  return Date.now() / 1000 > payload.exp;
}

export function proxy(req) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  if (PUBLIC_PATHS.has(pathname)) {
    const token = getTokenFromRequest(req);
    if (token && AUTH_ENTRY_PATHS.has(pathname)) {
      const payload = decodeJwtPayload(token);
      if (payload && !isTokenExpired(payload)) {
        const home = roleHome(payload.role || payload.userRole);
        if (home) {
          return NextResponse.redirect(new URL(home, req.url));
        }
      }
    }

    return NextResponse.next();
  }

  const matchedRoute = PROTECTED_ROUTES.find((route) => pathname.startsWith(route.prefix));
  if (!matchedRoute) {
    return NextResponse.next();
  }

  const token = getTokenFromRequest(req);
  if (!token) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('redirect', pathname);
    loginUrl.searchParams.set('reason', 'unauthenticated');
    return NextResponse.redirect(loginUrl);
  }

  const payload = decodeJwtPayload(token);
  if (!payload) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('redirect', pathname);
    loginUrl.searchParams.set('reason', 'invalid_token');
    return NextResponse.redirect(loginUrl);
  }

  if (isTokenExpired(payload)) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('redirect', pathname);
    loginUrl.searchParams.set('reason', 'token_expired');

    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete('token');
    response.cookies.delete('accessToken');
    response.cookies.delete('mbk_token');
    return response;
  }

  const userRole = payload.role || payload.userRole || '';
  const isAllowed = matchedRoute.roles.some(
    (role) => role.toLowerCase() === userRole.toLowerCase(),
  );

  if (!isAllowed) {
    const home = roleHome(userRole) || '/login';
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
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
