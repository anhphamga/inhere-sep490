const jwt = require('jsonwebtoken');

const getAccessTokenSecret = () => process.env.JWT_ACCESS_SECRET || 'dev_access_secret_change_me';
const getRefreshTokenSecret = () => process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret_change_me';

const signAccessToken = (payload) => {
  return jwt.sign(payload, getAccessTokenSecret(), { expiresIn: '15m' });
};

const signRefreshToken = (payload) => {
  return jwt.sign(payload, getRefreshTokenSecret(), { expiresIn: '7d' });
};

const signGuestVerificationToken = (payload) => {
  const expiresIn = process.env.GUEST_VERIFICATION_TOKEN_EXPIRES_IN || '15m';
  return jwt.sign({ ...payload, scope: 'guest-checkout' }, getAccessTokenSecret(), { expiresIn });
};

const verifyAccessToken = (token) => {
  return jwt.verify(token, getAccessTokenSecret());
};

const verifyRefreshToken = (token) => {
  return jwt.verify(token, getRefreshTokenSecret());
};

const verifyGuestVerificationToken = (token) => {
  const payload = jwt.verify(token, getAccessTokenSecret());
  if (payload?.scope !== 'guest-checkout') {
    throw new Error('Invalid guest verification token');
  }
  return payload;
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
  signRefreshToken,
  signGuestVerificationToken,
  verifyAccessToken,
  verifyRefreshToken,
  verifyGuestVerificationToken,
  extractBearerToken
};
