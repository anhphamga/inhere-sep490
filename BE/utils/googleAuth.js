const { OAuth2Client } = require('google-auth-library');

const googleClient = new OAuth2Client();

const getGoogleClientId = () => process.env.GOOGLE_CLIENT_ID?.trim();

const hasGoogleClientId = () => Boolean(getGoogleClientId());

const verifyGoogleIdToken = async (idToken) => {
  const googleClientId = getGoogleClientId();

  if (!googleClientId) {
    throw new Error('GOOGLE_CLIENT_ID is not configured');
  }

  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: googleClientId
  });

  return ticket.getPayload();
};

module.exports = {
  hasGoogleClientId,
  verifyGoogleIdToken
};
