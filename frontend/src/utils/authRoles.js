export const AUTH_ROLES = {
  SUPER_ADMIN: "SuperAdmin",
  SPOC: "SPOCAdmin",
  TRAINER: "Trainer",
  // Lowercase to match the role claim issued by /api/simple-auth JWTs and
  // the `userRole === 'student' / 'company'` checks in the dashboards.
  STUDENT: "student",
  COMPANY: "company",
  ACCOUNTANT: "accountant",
};

const normalizeToken = (value = "") =>
  String(value).trim().toLowerCase().replace(/[\s_-]+/g, "");

export const normalizeAuthRole = (role) => {
  const token = normalizeToken(role);

  // Handles "student" / "Student" / "STUDENT" and company equivalents.
  if (token === "student") return AUTH_ROLES.STUDENT;
  if (token === "company") return AUTH_ROLES.COMPANY;
  if (token === "accountant" || token === "accountnt") return AUTH_ROLES.ACCOUNTANT;

  if (token.includes("superadmin")) return AUTH_ROLES.SUPER_ADMIN;
  if (token.includes("spocadmin") || token === "spoc") return AUTH_ROLES.SPOC;
  if (token.includes("trainer")) return AUTH_ROLES.TRAINER;

  // Legacy/system mappings into the role model.
  if (token.includes("collegeadmin") || token.includes("companyadmin")) return AUTH_ROLES.SPOC;
  if (token === "admin") return AUTH_ROLES.SUPER_ADMIN;

  return null;
};

export const isKnownPortalRole = (role) =>
  Boolean(normalizeAuthRole(role));

export const normalizeAuthUser = (user) => {
  if (!user || typeof user !== "object") return user;
  const email = user.email || user.mail || "";
  const roleCandidate =
    user.role ||
    user.portalRole ||
    user.portal_role ||
    user.portalRoleLabel ||
    user.roleLabel ||
    "";
  const normalizedRole = normalizeAuthRole(roleCandidate);
  return {
    ...user,
    role: normalizedRole,
  };
};

export const isTrainerRole = (role) =>
  normalizeAuthRole(role) === AUTH_ROLES.TRAINER;

export const getDashboardRouteByRole = (role) => {
  const normalized = normalizeAuthRole(role);
  if (!normalized) {
    return "/login?reason=unknown_role";
  }

  let route = "/dashboard";
  if (normalized === AUTH_ROLES.STUDENT) route = "/student/dashboard";
  else if (normalized === AUTH_ROLES.COMPANY) route = "/company/dashboard";
  else if (normalized === AUTH_ROLES.TRAINER) route = "/trainer/dashboard";
  else if (normalized === AUTH_ROLES.SPOC) route = "/spoc/dashboard";
  else if (normalized === AUTH_ROLES.ACCOUNTANT) route = "/accountant/dashboard";
  console.debug("[AUTH] dashboard route resolved:", { role, normalized, route });
  return route;
};

export const roleToLoginType = (role) => {
  const normalized = normalizeAuthRole(role);
  if (!normalized) return "trainer";
  if (normalized === AUTH_ROLES.SUPER_ADMIN) return "admin";
  if (normalized === AUTH_ROLES.SPOC) return "spoc";
  if (normalized === AUTH_ROLES.STUDENT) return "student";
  if (normalized === AUTH_ROLES.COMPANY) return "company";
  if (normalized === AUTH_ROLES.ACCOUNTANT) return "admin";
  return "trainer";
};

export const loginTypeToAuthRole = (loginType = "") => {
  const token = normalizeToken(loginType);
  if (token === "admin") return AUTH_ROLES.SUPER_ADMIN;
  if (token === "spoc") return AUTH_ROLES.SPOC;
  if (token === "trainer") return AUTH_ROLES.TRAINER;
  if (token === "student") return AUTH_ROLES.STUDENT;
  if (token === "company") return AUTH_ROLES.COMPANY;
  return null;
};

export const loginTypeMatchesUser = (loginType, userRole) => {
  if (!loginType) return true;
  const expectedRole = loginTypeToAuthRole(loginType);
  const normalizedUserRole = normalizeAuthRole(userRole);
  if (!expectedRole || !normalizedUserRole) return false;
  return normalizedUserRole === expectedRole;
};

