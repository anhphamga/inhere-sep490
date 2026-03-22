const refreshTokens = new Set();

const addRefreshToken = (token) => {
  refreshTokens.add(token);
};

const hasRefreshToken = (token) => {
  return refreshTokens.has(token);
};

const removeRefreshToken = (token) => {
  refreshTokens.delete(token);
};

module.exports = {
  addRefreshToken,
  hasRefreshToken,
  removeRefreshToken
};
