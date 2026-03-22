const { PERMISSIONS } = require('./permissions');

const ROLE_LEVELS = {
  customer: 0,
  staff: 10,
  manager: 20,
  owner: 30,
};

const DEFAULT_ROLES = {
  CUSTOMER: {
    name: 'customer',
    level: ROLE_LEVELS.customer,
    inherits: [],
    permissions: [],
  },
  STAFF: {
    name: 'staff',
    level: ROLE_LEVELS.staff,
    inherits: ['customer'],
    permissions: [
      PERMISSIONS.orders_rent.order.read,
      PERMISSIONS.orders_rent.order.list,
      PERMISSIONS.orders_rent.order.confirm,
      PERMISSIONS.orders_rent.pickup.complete,
      PERMISSIONS.orders_rent.return.process,
      PERMISSIONS.orders_rent.penalty.read,
      PERMISSIONS.orders_rent.no_show.mark,
      PERMISSIONS.orders_rent.washing.complete,
      PERMISSIONS.inventory.item.read,
      PERMISSIONS.inventory.item.update,
      PERMISSIONS.inventory.item.update_condition,
      PERMISSIONS.inventory.item.update_lifecycle,
      PERMISSIONS.customers.contact.read_masked,
    ],
  },
  MANAGER: {
    name: 'manager',
    level: ROLE_LEVELS.manager,
    inherits: ['staff'],
    permissions: [
      PERMISSIONS.orders_rent.deposit.read,
      PERMISSIONS.orders_rent.deposit.confirm,
      PERMISSIONS.orders_rent.penalty.apply,
      PERMISSIONS.orders_rent.return.finalize,
      PERMISSIONS.orders_rent.order.finalize,
      PERMISSIONS.analytics.revenue.read,
      PERMISSIONS.customers.contact.read_full,
    ],
  },
  OWNER: {
    name: 'owner',
    level: ROLE_LEVELS.owner,
    inherits: ['manager'],
    permissions: [
      PERMISSIONS.orders_rent.deposit.refund,
      PERMISSIONS.orders_rent.deposit.forfeit,
      PERMISSIONS.inventory.item.create,
      PERMISSIONS.inventory.item.delete,
    ],
  },
};

module.exports = {
  DEFAULT_ROLES,
  ROLE_LEVELS,
};
