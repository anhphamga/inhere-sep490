const jwt = require('jsonwebtoken');

const getJwtSecret = () => process.env.JWT_SECRET || 'dev_secret_change_me';
const getJwtExpiresIn = () => process.env.JWT_EXPIRES_IN || '7d';

const signAccessToken = (payload) => {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: getJwtExpiresIn() });
};

const signGuestVerificationToken = (payload) => {
  const expiresIn = process.env.GUEST_VERIFICATION_TOKEN_EXPIRES_IN || '15m';
  return jwt.sign({ ...payload, scope: 'guest-checkout' }, getJwtSecret(), { expiresIn });
};

const verifyAccessToken = (token) => {
  return jwt.verify(token, getJwtSecret());
};

const verifyGuestVerificationToken = (token) => {
  const payload = jwt.verify(token, getJwtSecret());
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
  signGuestVerificationToken,
  verifyAccessToken,
  verifyGuestVerificationToken,
  extractBearerToken
};
