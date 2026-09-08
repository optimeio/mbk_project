const jwt = require('jsonwebtoken');

const attachCompanyScope = (req) => {
    const role = String(req.user?.role || '').toLowerCase();
    if (role !== 'company' && role !== 'companyadmin') {
        return false;
    }

    if (!req.user.companyId) {
        req.user.companyId = req.user.id || req.user.userId;
    }

    return Boolean(req.user.companyId);
};

// Middleware to require CompanyAdmin or simple-auth company role
const requireCompanyAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
    }

    if (!attachCompanyScope(req)) {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Company admin access required.'
        });
    }

    next();
};

// Middleware to block all editing operations for company admins
const blockCompanyEdits = (req, res, next) => {
    const role = String(req.user?.role || '').toLowerCase();
    if (role === 'companyadmin' || role === 'company') {
        if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Company admins have read-only access.'
            });
        }
    }
    next();
};

// Middleware to ensure only GET requests for company admins
const companyViewOnly = (req, res, next) => {
    const role = String(req.user?.role || '').toLowerCase();
    if (role === 'companyadmin' || role === 'company') {
        if (req.method !== 'GET') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Company admins can only view data.'
            });
        }
    }
    next();
};

module.exports = {
    requireCompanyAdmin,
    blockCompanyEdits,
    companyViewOnly
};
