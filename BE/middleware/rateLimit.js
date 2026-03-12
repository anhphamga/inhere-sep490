function createRateLimiter({ windowMs = 60_000, max = 60 } = {}) {
  const bucket = new Map();

  return (req, res, next) => {
    const ip =
      req.headers['x-forwarded-for']?.toString().split(',')[0].trim() ||
      req.ip ||
      req.socket?.remoteAddress ||
      'unknown';

    const now = Date.now();
    const state = bucket.get(ip);

    if (!state || state.resetAt <= now) {
      bucket.set(ip, { count: 1, resetAt: now + windowMs });
      return next();
    }

    state.count += 1;
    if (state.count > max) {
      const retryAfterSeconds = Math.ceil((state.resetAt - now) / 1000);
      res.setHeader('Retry-After', String(Math.max(retryAfterSeconds, 1)));
      return res.status(429).json({
        success: false,
        message: 'Too many requests',
      });
    }

    return next();
  };
}

module.exports = {
  createRateLimiter,
};
