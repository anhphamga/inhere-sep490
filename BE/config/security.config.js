const getRequiredEnv = (name) => {
  const value = process.env[name];
  if (!value || !String(value).trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

const jwtAccessSecret = getRequiredEnv('JWT_ACCESS_SECRET');
const jwtRefreshSecret = getRequiredEnv('JWT_REFRESH_SECRET');

module.exports = {
  jwtAccessSecret,
  jwtRefreshSecret,
};
