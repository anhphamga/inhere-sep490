const PERMISSIONS = {
  blog: {
    post: {
      create: 'CREATE_POST',
      update: 'UPDATE_POST',
      delete: 'DELETE_POST',
      submit: 'SUBMIT_POST',
      approve: 'APPROVE_POST',
      publish: 'PUBLISH_POST',
      view: 'VIEW_POST',
    },
  },
  orders_rent: {
    order: {
      read: 'orders_rent.order.read',
      list: 'orders_rent.order.list',
      confirm: 'orders_rent.order.confirm',
      cancel: 'orders_rent.order.cancel',
      finalize: 'orders_rent.order.finalize',
    },
    deposit: {
      read: 'orders_rent.deposit.read',
      confirm: 'orders_rent.deposit.confirm',
      refund: 'orders_rent.deposit.refund',
      forfeit: 'orders_rent.deposit.forfeit',
    },
    pickup: {
      complete: 'orders_rent.pickup.complete',
    },
    return: {
      process: 'orders_rent.return.process',
      finalize: 'orders_rent.return.finalize',
    },
    penalty: {
      apply: 'orders_rent.penalty.apply',
      read: 'orders_rent.penalty.read',
    },
    no_show: {
      mark: 'orders_rent.no_show.mark',
    },
    washing: {
      complete: 'orders_rent.washing.complete',
    },
  },
  inventory: {
    item: {
      read: 'inventory.item.read',
      create: 'inventory.item.create',
      update: 'inventory.item.update',
      update_condition: 'inventory.item.update_condition',
      update_lifecycle: 'inventory.item.update_lifecycle',
      delete: 'inventory.item.delete',
    },
  },
  analytics: {
    revenue: {
      read: 'analytics.revenue.read',
    },
  },
  customers: {
    contact: {
      read_masked: 'customers.contact.read_masked',
      read_full: 'customers.contact.read_full',
    },
  },
};

const LEGACY_PERMISSION_ALIASES = {
  create_post: ['create_post'],
  update_post: ['update_post'],
  delete_post: ['delete_post'],
  submit_post: ['submit_post'],
  approve_post: ['approve_post'],
  publish_post: ['publish_post'],
  view_post: ['view_post'],
  'orders_rent.confirm': ['orders_rent.order.confirm'],
  'orders_rent.deposit': ['orders_rent.deposit.confirm'],
  'orders_rent.pickup': ['orders_rent.pickup.complete'],
  'orders_rent.return': ['orders_rent.return.process'],
  'orders_rent.penalty': ['orders_rent.penalty.apply'],
  'orders_rent.finalize': ['orders_rent.order.finalize'],
  'orders_rent.complete': ['orders_rent.washing.complete'],
  'inventory.update': ['inventory.item.update', 'inventory.item.update_condition'],
  'inventory.read': ['inventory.item.read'],
};

const flattenPermissions = (node, output = []) => {
  if (!node || typeof node !== 'object') return output;

  Object.values(node).forEach((value) => {
    if (typeof value === 'string') {
      output.push(value);
      return;
    }

    flattenPermissions(value, output);
  });

  return output;
};

const ALL_PERMISSIONS = Array.from(new Set(flattenPermissions(PERMISSIONS)));

const normalizePermission = (permission) => String(permission || '').trim().toLowerCase();

const expandPermissionAliases = (permission) => {
  const normalized = normalizePermission(permission);
  if (!normalized) return [];

  const aliases = LEGACY_PERMISSION_ALIASES[normalized] || [];
  return Array.from(new Set([normalized, ...aliases.map(normalizePermission)]));
};

module.exports = {
  PERMISSIONS,
  ALL_PERMISSIONS,
  LEGACY_PERMISSION_ALIASES,
  expandPermissionAliases,
  normalizePermission,
};
