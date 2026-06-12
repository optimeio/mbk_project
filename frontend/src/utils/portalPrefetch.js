import { complaintsLinksByRole, roleLinks } from "@/components/common/sidebar/sidebarConfig";
import { AUTH_ROLES, getDashboardRouteByRole, normalizeAuthRole } from "@/utils/authRoles";

const roleToSidebarKey = (role, email = "") => {
  const normalizedRole = normalizeAuthRole(role, email);

  if (normalizedRole === AUTH_ROLES.STUDENT) return "Student";
  if (normalizedRole === AUTH_ROLES.COMPANY) return "Company";
  if (normalizedRole === AUTH_ROLES.TRAINER) return "Trainer";
  if (normalizedRole === AUTH_ROLES.SPOC) return "SPOCAdmin";
  if (String(role || "").trim().toLowerCase() === "accountant") return "Accountant";
  return "SuperAdmin";
};

export const getPortalPrefetchRoutes = (role, email = "") => {
  const sidebarRole = roleToSidebarKey(role, email);
  const dashboardRoute = getDashboardRouteByRole(role, email);
  const sidebarRoutes = (roleLinks[sidebarRole] || []).map((item) => item.href);
  const complaintsRoute = complaintsLinksByRole[sidebarRole];

  return [...new Set([
    dashboardRoute,
    ...sidebarRoutes,
    complaintsRoute,
    "/chat",
  ].filter(Boolean))];
};

export const prefetchRoutes = (router, routes, options = {}) => {
  if (!router?.prefetch || !Array.isArray(routes) || routes.length === 0) {
    return () => {};
  }

  const excludedRoutes = new Set(options.exclude || []);
  const targets = routes.filter((route) => route && !excludedRoutes.has(route));

  if (targets.length === 0) {
    return () => {};
  }

  let cancelled = false;
  const timers = [];
  const idleCallbacks = [];

  const schedule = (callback, delay = 0) => {
    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      const idleId = window.requestIdleCallback(
        () => {
          if (!cancelled) {
            callback();
          }
        },
        { timeout: 1500 + delay },
      );
      idleCallbacks.push(idleId);
      return;
    }

    const timerId = globalThis.setTimeout(() => {
      if (!cancelled) {
        callback();
      }
    }, delay);
    timers.push(timerId);
  };

  targets.forEach((route, index) => {
    schedule(() => {
      try {
        router.prefetch(route);
      } catch (error) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("Route prefetch failed:", route, error);
        }
      }
    }, index * 60);
  });

  return () => {
    cancelled = true;
    timers.forEach((timerId) => globalThis.clearTimeout(timerId));
    if (typeof window !== "undefined" && "cancelIdleCallback" in window) {
      idleCallbacks.forEach((idleId) => window.cancelIdleCallback(idleId));
    }
  };
};

export const prefetchPortalRoutes = (router, role, email = "", options = {}) =>
  prefetchRoutes(router, getPortalPrefetchRoutes(role, email), options);
