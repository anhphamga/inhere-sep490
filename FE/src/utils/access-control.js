const normalizePermission = (permission) => String(permission || '').trim().toLowerCase();

const normalizePermissions = (user) => {
  if (!user) return new Set();

  const direct = Array.isArray(user.permissions) ? user.permissions : [];
  const nested = Array.isArray(user.access?.permissions) ? user.access.permissions : [];

  return new Set([...direct, ...nested].map(normalizePermission).filter(Boolean));
};

export const can = (user, permission) => {
  const permissions = normalizePermissions(user);
  return permissions.has(normalizePermission(permission));
};

export const canAny = (user, permissions = []) => (
  permissions.some((permission) => can(user, permission))
);
