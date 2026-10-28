const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

async function requireAuth(request, response, next) {
  const token = request.headers.authorization?.startsWith('Bearer ')
    ? request.headers.authorization.slice(7)
    : null;
  if (!token) return response.status(401).json({ message: 'Sign in to continue.' });

  try {
    request.user = jwt.verify(token, process.env.JWT_SECRET);
    if (['admin', 'superadmin'].includes(request.user.role)) {
      const admin = await Admin.findById(request.user.sub).select('role roleName permissions isActive');
      if (!admin || !admin.isActive) return response.status(401).json({ message: 'This staff account is inactive. Contact a Super Admin.' });
      request.user.role = admin.role;
      request.user.permissions = admin.permissions;
      request.user.roleName = admin.roleName;
    }
    next();
  } catch (_error) {
    response.status(401).json({ message: 'Your session is invalid or expired. Please sign in again.' });
  }
}

function requireAdmin(request, response, next) {
  if (!['admin', 'superadmin'].includes(request.user?.role)) return response.status(403).json({ message: 'Administrator access is required.' });
  next();
}

function requirePermission(permission) {
  return (request, response, next) => {
    if (request.user?.role === 'superadmin' || request.user?.permissions?.includes(permission)) return next();
    return response.status(403).json({ message: 'You do not have permission to perform this action.' });
  };
}

module.exports = { requireAuth, requireAdmin, requirePermission };
