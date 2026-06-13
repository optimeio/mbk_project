/**
 * Single source of truth for proxy + client route protection.
 * Keep in sync with proxy.js (proxy imports this module).
 */

export const PROTECTED_ROUTES = [
  { prefix: '/dashboard', roles: ['superadmin', 'admin'] },
  { prefix: '/admin', roles: ['superadmin', 'admin'] },
  { prefix: '/spoc', roles: ['spocadmin', 'collegeadmin', 'superadmin'] },
  { prefix: '/trainer', roles: ['trainer', 'superadmin'] },
  { prefix: '/student', roles: ['student'] },
  { prefix: '/company', roles: ['company', 'companyadmin'] },
  { prefix: '/accountant', roles: ['accountant', 'accountnt', 'superadmin'] },
  {
    prefix: '/chat',
    roles: [
      'superadmin',
      'spocadmin',
      'collegeadmin',
      'trainer',
      'accountant',
      'accountnt',
      'student',
      'company',
      'companyadmin',
    ],
  },
];

export const PUBLIC_PREFIXES = [
  '/_next/',
  '/api/',
  '/uploads/',
  '/logos/',
  '/favicon',
  '/robots.txt',
  '/sitemap',
];

export const PUBLIC_PATHS = new Set([
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

export const AUTH_ENTRY_PATHS = new Set([
  '/login',
  '/signup',
  '/student/auth',
  '/company/auth',
]);

export const ROLE_HOME = {
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

export const isTrainerSignupPath = (pathname = '') =>
  pathname === '/trainer-signup' || pathname.startsWith('/trainer-signup/');

export const isPublicPath = (pathname = '') =>
  PUBLIC_PATHS.has(pathname) || isTrainerSignupPath(pathname);

export const isPortalPath = (pathname = '') =>
  PROTECTED_ROUTES.some((route) => {
    if (route.prefix === '/trainer' && isTrainerSignupPath(pathname)) {
      return false;
    }
    return pathname.startsWith(route.prefix);
  });

export const roleHome = (role) =>
  ROLE_HOME[String(role || '').toLowerCase()] || null;

export const normalizePortalRole = (role) => {
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
};

export const roleAllowedForRoute = (userRole, allowedRoles) => {
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
};

export const matchProtectedRoute = (pathname = '') =>
  PROTECTED_ROUTES.find((route) => {
    if (route.prefix === '/trainer' && isTrainerSignupPath(pathname)) {
      return false;
    }
    return pathname.startsWith(route.prefix);
  }) || null;
