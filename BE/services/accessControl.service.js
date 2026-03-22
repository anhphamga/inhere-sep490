const Role = require('../model/Role.model');
const { DEFAULT_ROLES, ROLE_LEVELS } = require('../access-control/roles');
const {
  ALL_PERMISSIONS,
  expandPermissionAliases,
  normalizePermission,
} = require('../access-control/permissions');
const {
  getCachedPermissions,
  setCachedPermissions,
  clearCachedPermissions,
} = require('./permissionCache.service');

const defaultRoleList = Object.values(DEFAULT_ROLES);

const getDefaultRoleByName = (roleName) => {
  const normalized = String(roleName || '').trim().toLowerCase();
  return defaultRoleList.find((role) => role.name === normalized) || null;
};

const syncDefaultRoles = async () => {
  await Promise.all(defaultRoleList.map((role) => (
    Role.findOneAndUpdate(
      { name: role.name },
      {
        $setOnInsert: {
          name: role.name,
          isSystem: true,
        },
        $set: {
          level: role.level,
          inherits: role.inherits,
          permissions: role.permissions,
        },
      },
      {
        new: true,
        upsert: true,
      }
    )
  )));
};

const collectRolePermissions = (roleMap, roleName, visited = new Set()) => {
  const normalizedRoleName = String(roleName || '').trim().toLowerCase();
  if (!normalizedRoleName || visited.has(normalizedRoleName)) return [];

  visited.add(normalizedRoleName);
  const role = roleMap.get(normalizedRoleName) || getDefaultRoleByName(normalizedRoleName);
  if (!role) return [];

  const inheritedPermissions = (role.inherits || []).flatMap((parentRole) => (
    collectRolePermissions(roleMap, parentRole, visited)
  ));

  return [...(role.permissions || []), ...inheritedPermissions];
};

const loadRoleMap = async () => {
  const roles = await Role.find({}).lean();
  const roleMap = new Map();

  roles.forEach((role) => {
    roleMap.set(String(role.name || '').toLowerCase(), role);
  });

  defaultRoleList.forEach((role) => {
    if (!roleMap.has(role.name)) {
      roleMap.set(role.name, role);
    }
  });

  return roleMap;
};

const resolveUserAccess = async (user) => {
  const userId = user?._id?.toString?.() || user?.id?.toString?.();
  const cached = userId ? getCachedPermissions(userId) : null;
  if (cached) return cached;

  const roleName = String(user?.role || 'customer').toLowerCase();
  const roleMap = await loadRoleMap();
  const role = roleMap.get(roleName) || getDefaultRoleByName(roleName) || getDefaultRoleByName('customer');
  const inheritedPermissions = collectRolePermissions(roleMap, roleName);
  const directPermissions = Array.isArray(user?.directPermissions) ? user.directPermissions : [];
  const deniedPermissions = new Set(Array.isArray(user?.deniedPermissions) ? user.deniedPermissions.map(normalizePermission) : []);
  const permissions = Array.from(new Set(
    [...inheritedPermissions, ...directPermissions]
      .flatMap(expandPermissionAliases)
      .map(normalizePermission)
      .filter((permission) => permission && !deniedPermissions.has(permission))
  ));

  const access = {
    role: roleName,
    roleLevel: Number(user?.roleLevel ?? role?.level ?? ROLE_LEVELS[roleName] ?? 0),
    permissions,
  };

  if (userId) {
    setCachedPermissions(userId, access);
  }

  return access;
};

const hasPermission = (access, permission) => {
  const requestedPermissions = expandPermissionAliases(permission);
  if (requestedPermissions.length === 0) return false;

  const permissionSet = new Set((access?.permissions || []).map(normalizePermission));
  return requestedPermissions.some((item) => permissionSet.has(item));
};

const hasAnyPermission = (access, permissions = []) => (
  permissions.some((permission) => hasPermission(access, permission))
);

const hasRoleLevel = (access, minimumRole) => {
  const minLevel = ROLE_LEVELS[String(minimumRole || '').toLowerCase()];
  if (minLevel === undefined) return false;
  return Number(access?.roleLevel || 0) >= minLevel;
};

const listAllPermissions = () => ALL_PERMISSIONS.slice();

module.exports = {
  clearCachedPermissions,
  hasAnyPermission,
  hasPermission,
  hasRoleLevel,
  listAllPermissions,
  resolveUserAccess,
  syncDefaultRoles,
};
