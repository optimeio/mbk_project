const jwt = require("jsonwebtoken");

// Without a fallback, jwt.verify(token, undefined) always throws when
// JWT_SECRET is unset, making every protected API return 401.
const JWT_SECRET = process.env.JWT_SECRET || "your_super_secret_jwt_key_change_in_production";

const auth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) return res.status(401).json({ message: "No token" });

    const decoded = jwt.verify(token, JWT_SECRET);

    // Normalize claim names: legacy tokens/routes use `id`, jwtUtils uses `userId`
    req.user = { ...decoded, id: decoded.id || decoded.userId, userId: decoded.userId || decoded.id };
    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid token" });
  }
};

const authenticateOptional = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];

    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = { ...decoded, id: decoded.id || decoded.userId, userId: decoded.userId || decoded.id };
    }
    next();
  } catch (err) {
    // If token is invalid, we still proceed but without req.user
    next();
  }
};

const authorize = (roles = []) => {
  if (typeof roles === "string") {
    roles = [roles];
  }

  return (req, res, next) => {
    const normalizeRole = (value) => String(value || "").trim().toLowerCase();
    const userRole = normalizeRole(req.user?.role);
    const allowedRoles = roles.map(normalizeRole);

    if (!req.user || (allowedRoles.length && !allowedRoles.includes(userRole))) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
};

module.exports = { 
  auth, 
  authenticate: auth,
  authenticateOptional,
  authorize,
  checkRole: authorize
};
