export const ADMISSION_PERMISSIONS = {
  APPROVE: "admission:approve",
  REJECT: "admission:reject",
};

const normalizeRole = (role) => String(role || "").trim().toLowerCase();

const normalizePermissions = (permissions = []) =>
  (Array.isArray(permissions) ? permissions : [])
    .map((item) => String(item || "").trim().toLowerCase())
    .filter(Boolean);

export const isSuperAdminRole = (role) => normalizeRole(role) === "superadmin";

export const hasAdmissionPermission = (user = {}, permission) => {
  if (!user) return false;
  if (isSuperAdminRole(user.role)) return true;

  const normalizedPermission = String(permission || "").trim().toLowerCase();
  const userPermissions = normalizePermissions(user.permissions);

  return userPermissions.includes(normalizedPermission);
};

export const canApproveAdmission = (user) =>
  hasAdmissionPermission(user, ADMISSION_PERMISSIONS.APPROVE);

export const canRejectAdmission = (user) =>
  hasAdmissionPermission(user, ADMISSION_PERMISSIONS.REJECT);

export const canManageTrainerAdmissions = (user) =>
  canApproveAdmission(user) || canRejectAdmission(user);
