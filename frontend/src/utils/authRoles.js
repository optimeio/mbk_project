export const AUTH_ROLES = {
  SUPER_ADMIN: "SuperAdmin",
  SPOC: "SPOCAdmin",
  TRAINER: "Trainer",
  // Lowercase to match the role claim issued by /api/simple-auth JWTs and
  // the `userRole === 'student' / 'company'` checks in the dashboards.
  STUDENT: "student",
  COMPANY: "company",
};

const normalizeToken = (value = "") =>
  String(value).trim().toLowerCase().replace(/[\s_-]+/g, "");

const inferRoleFromEmail = (email = "") => {
  const token = normalizeToken(email.split("@")[0] || email);
  if (!token) return null;
  if (token.includes("superadmin") || token.startsWith("super")) return AUTH_ROLES.SUPER_ADMIN;
  if (token.includes("spoc")) return AUTH_ROLES.SPOC;
  if (token.includes("trainer")) return AUTH_ROLES.TRAINER;
  return null;
};

export const normalizeAuthRole = (role, email = "") => {
  const token = normalizeToken(role);

  // Handles "student" / "Student" / "STUDENT" and company equivalents.
  if (token === "student") return AUTH_ROLES.STUDENT;
  if (token === "company") return AUTH_ROLES.COMPANY;

  if (token.includes("superadmin")) return AUTH_ROLES.SUPER_ADMIN;
  if (token.includes("spocadmin") || token === "spoc") return AUTH_ROLES.SPOC;
  if (token.includes("trainer")) return AUTH_ROLES.TRAINER;

  // Legacy/system mappings into the role model.
  if (token.includes("collegeadmin") || token.includes("companyadmin")) return AUTH_ROLES.SPOC;
  if (token.includes("accountant") || token === "admin") return AUTH_ROLES.SUPER_ADMIN;

  const inferred = inferRoleFromEmail(email);
  return inferred || AUTH_ROLES.TRAINER;
};

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
  return {
    ...user,
    role: normalizeAuthRole(roleCandidate, email),
  };
};

export const isTrainerRole = (role, email = "") =>
  normalizeAuthRole(role, email) === AUTH_ROLES.TRAINER;

export const getDashboardRouteByRole = (role, email = "") => {
  const normalized = normalizeAuthRole(role, email);
  let route = "/dashboard";
  if (normalized === AUTH_ROLES.STUDENT) route = "/student/dashboard";
  else if (normalized === AUTH_ROLES.COMPANY) route = "/company/dashboard";
  else if (normalized === AUTH_ROLES.TRAINER) route = "/trainer/dashboard";
  else if (normalized === AUTH_ROLES.SPOC) route = "/spoc/dashboard";
  console.debug("[AUTH] dashboard route resolved:", { role, normalized, route });
  return route;
};

export const roleToLoginType = (role, email = "") => {
  const normalized = normalizeAuthRole(role, email);
  if (normalized === AUTH_ROLES.SUPER_ADMIN) return "admin";
  if (normalized === AUTH_ROLES.SPOC) return "spoc";
  if (normalized === AUTH_ROLES.STUDENT) return "student";
  if (normalized === AUTH_ROLES.COMPANY) return "company";
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

export const loginTypeMatchesUser = (loginType, userRole, email = "") => {
  if (!loginType) return true;
  const expectedRole = loginTypeToAuthRole(loginType);
  if (!expectedRole) return true;
  return normalizeAuthRole(userRole, email) === expectedRole;
};

