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

    if (!user || user.status === 'locked') {
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
  if (!req.user || req.user.role !== 'owner') {
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
      return forbidden(res, 'Forbidden - missing permission');
    }

    const allowed = await conditionFn(req, req.user, req.access);
    if (!allowed) {
      return forbidden(res, 'Forbidden - condition rejected');
    }

    return next();
  };
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.map(r => r.toLowerCase()).includes(req.user.role.toLowerCase())) {
      return forbidden(res, 'Forbidden - Báº¡n khÃ´ng cÃ³ quyá»n thá»±c hiá»‡n thao tÃ¡c nÃ y');
    }
    return next();
  };
};

module.exports = {
  requireAuth,
  requireOwner,
  authenticate: requireAuth,
  authorize,
  authorizeAnyPermission,
  authorizePermission,
  authorizeRoleLevel,
  authorizeWithCondition,
};
