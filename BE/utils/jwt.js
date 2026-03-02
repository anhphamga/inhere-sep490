const jwt = require('jsonwebtoken');

const getJwtSecret = () => process.env.JWT_SECRET || 'dev_secret_change_me';
const getJwtExpiresIn = () => process.env.JWT_EXPIRES_IN || '7d';

const signAccessToken = (payload) => {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: getJwtExpiresIn() });
};

const verifyAccessToken = (token) => {
  return jwt.verify(token, getJwtSecret());
};

const extractBearerToken = (authorizationHeader) => {
  if (!authorizationHeader || typeof authorizationHeader !== 'string') {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return null;
  }

  return token;
};

module.exports = {
  signAccessToken,
  verifyAccessToken,
  extractBearerToken
};
