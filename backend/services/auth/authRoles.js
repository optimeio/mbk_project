const ROLE_ALIASES = {
  student: "Student",
  trainer: "Trainer",
  company: "CompanyAdmin",
  companyadmin: "CompanyAdmin",
  admin: "SuperAdmin",
  superadmin: "SuperAdmin",
  spoc: "SPOCAdmin",
  spocadmin: "SPOCAdmin",
};

const normalizeToken = (value = "") =>
  String(value || "").trim().toLowerCase().replace(/[\s_-]+/g, "");

const normalizeRoleValue = (role = "") => {
  const token = normalizeToken(role);
  if (!token) return "";
  if (ROLE_ALIASES[token]) return ROLE_ALIASES[token];
  if (token === "collegeadmin") return "CollegeAdmin";
  return String(role || "").trim();
};

const resolveExpectedRole = (expectedRole = "") => {
  const token = normalizeToken(expectedRole);
  if (!token) return null;
  return ROLE_ALIASES[token] || normalizeRoleValue(expectedRole) || null;
};

const roleMatchesExpected = (userRole, expectedRole) => {
  const expected = resolveExpectedRole(expectedRole);
  if (!expected) return true;

  const actual = normalizeRoleValue(userRole);
  const actualToken = normalizeToken(actual);
  const expectedToken = normalizeToken(expected);

  if (expectedToken === "company" || expected === "CompanyAdmin") {
    return actualToken.includes("company");
  }
  if (expected === "Student") return actualToken === "student";
  if (expected === "Trainer") return actualToken === "trainer";
  if (expected === "SuperAdmin" || expectedToken === "admin") {
    return actualToken.includes("superadmin") || actualToken === "admin";
  }
  if (expected === "SPOCAdmin") {
    return actualToken.includes("spoc") || actualToken.includes("collegeadmin");
  }

  return normalizeToken(actual) === normalizeToken(expected);
};

module.exports = {
  ROLE_ALIASES,
  normalizeRoleValue,
  resolveExpectedRole,
  roleMatchesExpected,
};
