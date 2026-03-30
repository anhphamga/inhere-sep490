const { hasPermission } = require('../services/accessControl.service');

const deleteByPath = (target, path) => {
  const segments = String(path || '').split('.').filter(Boolean);
  if (segments.length === 0 || !target || typeof target !== 'object') return;

  const lastKey = segments[segments.length - 1];
  const parent = segments.slice(0, -1).reduce((current, segment) => {
    if (!current || typeof current !== 'object') return null;
    return current[segment];
  }, target);

  if (parent && typeof parent === 'object') {
    delete parent[lastKey];
  }
};

const setByPath = (target, path, value) => {
  const segments = String(path || '').split('.').filter(Boolean);
  if (segments.length === 0 || !target || typeof target !== 'object') return;

  const lastKey = segments[segments.length - 1];
  const parent = segments.slice(0, -1).reduce((current, segment) => {
    if (!current || typeof current !== 'object') return null;
    return current[segment];
  }, target);

  if (parent && typeof parent === 'object' && Object.prototype.hasOwnProperty.call(parent, lastKey)) {
    parent[lastKey] = value(parent[lastKey]);
  }
};

const applyRules = (payload, rules, access) => {
  if (Array.isArray(payload)) {
    payload.forEach((item) => applyRules(item, rules, access));
    return payload;
  }

  if (!payload || typeof payload !== 'object') return payload;

  rules.forEach((rule) => {
    if (hasPermission(access, rule.permission)) return;

    if (rule.type === 'mask' && typeof rule.mask === 'function') {
      setByPath(payload, rule.path, rule.mask);
      return;
    }

    deleteByPath(payload, rule.path);
  });

  Object.values(payload).forEach((value) => applyRules(value, rules, access));
  return payload;
};

const createFieldAccessMiddleware = (rules = []) => {
  return (req, res, next) => {
    const originalJson = res.json.bind(res);

    res.json = (payload) => {
      if (payload && typeof payload === 'object') {
        applyRules(payload, rules, req.access || req.user?.access);
      }

      return originalJson(payload);
    };

    next();
  };
};

module.exports = {
  createFieldAccessMiddleware,
};
