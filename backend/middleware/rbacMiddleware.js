// backend/middleware/rbacMiddleware.js
/**
 * Role-Based Access Control (RBAC) Middleware
 *
 * Provides role definitions, permission constants, and helper functions:
 *   - authorize(requiredRole): verifies that the authenticated user has at least the required role.
 *   - checkPermission(permission): verifies that the user possesses the given permission.
 *
 * Usage (Express):
 *   const { authorize, checkPermission, PERMISSIONS } = require('./rbacMiddleware');
 *   router.post('/trainers', authorize('SUPER_ADMIN'), checkPermission(PERMISSIONS.TRAINER_CREATE), handler);
 *
 * Assumes that authentication middleware has already populated `req.user` with:
 *   { id, role, companyId, ... }
 */

// ----- Role Definitions -----
const ROLES = Object.freeze({
  SUPER_ADMIN: 'SUPER_ADMIN',
  COMPANY_ADMIN: 'COMPANY_ADMIN',
  TRAINER: 'TRAINER',
});

// ----- Permission Constants -----
const PERMISSIONS = Object.freeze({
  // Trainer permissions
  TRAINER_CREATE: 'TRAINER_CREATE',
  TRAINER_READ: 'TRAINER_READ',
  TRAINER_UPDATE: 'TRAINER_UPDATE',
  TRAINER_DELETE: 'TRAINER_DELETE',
  TRAINER_ASSIGN: 'TRAINER_ASSIGN',

  // Schedule permissions
  SCHEDULE_CREATE: 'SCHEDULE_CREATE',
  SCHEDULE_READ: 'SCHEDULE_READ',
  SCHEDULE_UPDATE: 'SCHEDULE_UPDATE', // generic update (e.g., edit details)
  SCHEDULE_DELETE: 'SCHEDULE_DELETE',
  SCHEDULE_RESCHEDULE: 'SCHEDULE_RESCHEDULE',

  // Activity & Report permissions
  ACTIVITY_READ: 'ACTIVITY_READ',
  REPORT_READ: 'REPORT_READ',
});

// ----- Role -> Permission Mapping -----
const rolePermissions = {
  [ROLES.SUPER_ADMIN]: Object.values(PERMISSIONS), // all permissions
  [ROLES.COMPANY_ADMIN]: [
    PERMISSIONS.TRAINER_READ,
    PERMISSIONS.TRAINER_ASSIGN,
    PERMISSIONS.SCHEDULE_CREATE,
    PERMISSIONS.SCHEDULE_READ,
    PERMISSIONS.SCHEDULE_RESCHEDULE,
    PERMISSIONS.ACTIVITY_READ,
    PERMISSIONS.REPORT_READ,
  ],
  [ROLES.TRAINER]: [
    PERMISSIONS.TRAINER_READ, // own profile (handled in route logic)
    PERMISSIONS.SCHEDULE_READ,
    PERMISSIONS.SCHEDULE_UPDATE, // for updating own training status
    PERMISSIONS.ACTIVITY_READ,
    PERMISSIONS.REPORT_READ,
  ],
};

/**
 * Middleware to ensure the authenticated user has at least the required role.
 * If the user lacks the role, responds with 403 Forbidden.
 */
function authorize(requiredRole) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthenticated' });
    }
    const userRole = req.user.role;
    // Super Admin automatically satisfies any role requirement
    if (userRole === ROLES.SUPER_ADMIN) {
      return next();
    }
    if (userRole !== requiredRole) {
      return res.status(403).json({ message: 'Forbidden: insufficient role' });
    }
    next();
  };
}

/**
 * Middleware to check if the user has a specific permission.
 * Returns 403 if permission is missing.
 */
function checkPermission(permission) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthenticated' });
    }
    const userRole = req.user.role;
    // Super Admin has all permissions
    if (userRole === ROLES.SUPER_ADMIN) {
      return next();
    }
    const granted = rolePermissions[userRole] || [];
    if (!granted.includes(permission)) {
      return res.status(403).json({ message: `Forbidden: missing permission ${permission}` });
    }
    next();
  };
}

module.exports = {
  ROLES,
  PERMISSIONS,
  authorize,
  checkPermission,
};
