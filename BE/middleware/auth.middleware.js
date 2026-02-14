const User = require('../model/User.model');
const { extractBearerToken, verifyAccessToken } = require('../utils/jwt');

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
      email: user.email
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
};

module.exports = {
  requireAuth
};
