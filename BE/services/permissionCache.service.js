const DEFAULT_TTL_MS = Number(process.env.PERMISSION_CACHE_TTL_MS || 5 * 60 * 1000);

const cache = new Map();

const makeKey = (userId) => String(userId || '');

const getCachedPermissions = (userId) => {
  const key = makeKey(userId);
  const entry = cache.get(key);

  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }

  return entry.value;
};

const setCachedPermissions = (userId, value, ttlMs = DEFAULT_TTL_MS) => {
  const key = makeKey(userId);
  if (!key) return value;

  cache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });

  return value;
};

const clearCachedPermissions = (userId) => {
  cache.delete(makeKey(userId));
};

module.exports = {
  getCachedPermissions,
  setCachedPermissions,
  clearCachedPermissions,
};
