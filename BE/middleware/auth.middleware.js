const User = require('../model/User.model');
const { extractBearerToken, verifyAccessToken } = require('../utils/jwt');
const {
  hasAnyPermission,
  hasPermission,
  hasRoleLevel,
  resolveUserAccess,
} = require('../services/accessControl.service');

const forbidden = (res, message = 'Forbidden') => (
  res.status(403).json({
    success: false,
    message,
  })
);

const normalizeRole = (role) => String(role || '').trim().toLowerCase();

const requireAuth = async (req, res, next) => {
  try {
    const token = extractBearerToken(req.headers.authorization);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.userId);

    if (!user || user.status !== 'active') {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    req.user = {
      id: user._id.toString(),
      role: user.role,
      email: user.email,
      roleLevel: user.roleLevel,
      directPermissions: user.directPermissions,
      deniedPermissions: user.deniedPermissions,
    };
    req.access = await resolveUserAccess(user);
    req.user.permissions = req.access.permissions;
    req.user.access = req.access;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
};

const requireOwner = (req, res, next) => {
  if (!req.user || normalizeRole(req.user.role) !== 'owner') {
    return forbidden(res);
  }

  return next();
};

const authorizePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user || !hasPermission(req.access, permission)) {
      return forbidden(res, 'Forbidden - missing permission');
    }

    return next();
  };
};

const authorizeAnyPermission = (permissions = []) => {
  return (req, res, next) => {
    if (!req.user || !hasAnyPermission(req.access, permissions)) {
      return forbidden(res, 'Forbidden - missing permission');
    }

    return next();
  };
};

const authorizeRoleLevel = (minimumRole) => {
  return (req, res, next) => {
    if (!req.user || !hasRoleLevel(req.access, minimumRole)) {
      return forbidden(res, 'Forbidden - insufficient role level');
    }

    return next();
  };
};

const authorizeWithCondition = (permission, conditionFn) => {
  return async (req, res, next) => {
    if (!req.user || !hasPermission(req.access, permission)) {
      return forbidden(res, 'Bạn không có quyền thực hiện thao tác này');
    }

    try {
      const allowed = await conditionFn(req, req.user, req.access);
      if (!allowed) {
        return forbidden(res, 'Bạn không có quyền thao tác đơn này');
      }
    } catch (conditionError) {
      // conditionFn có thể throw Error với message mô tả lý do cụ thể
      return forbidden(res, conditionError.message || 'Bạn không có quyền thao tác đơn này');
    }

    return next();
  };
};

const authorize = (...roles) => {
  const allowedRoles = roles.map((role) => normalizeRole(role));
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(normalizeRole(req.user.role))) {
      return forbidden(res, 'Forbidden - Bạn không có quyền thực hiện thao tác này');
    }
    return next();
  };
};

const checkRole = (...roles) => authorize(...roles);
const checkPermission = (permission) => authorizePermission(permission);

module.exports = {
  requireAuth,
  checkPermission,
  checkRole,
  requireOwner,
  authenticate: requireAuth,
  authorize,
  authorizeAnyPermission,
  authorizePermission,
  authorizeRoleLevel,
  authorizeWithCondition,
};
