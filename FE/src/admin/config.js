import {
  BarChart3,
  BookOpen,
  Boxes,
  LayoutDashboard,
  ReceiptText,
  ShieldCheck,
  ShoppingBag,
  TicketPercent,
  Users,
  UserSquare2,
  WandSparkles,
} from 'lucide-react';

export const ADMIN_NAV_GROUPS = [
  {
    id: 'operations',
    label: 'Operations',
    items: [
      { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/admin/rent-orders', label: 'Rent Orders', icon: ReceiptText, permission: 'orders_rent.order.list' },
      { to: '/admin/sale-orders', label: 'Sale Orders', icon: ShoppingBag },
      { to: '/admin/inventory', label: 'Inventory', icon: Boxes, permission: 'inventory.item.read' },
      { to: '/admin/blog', label: 'Blog', icon: BookOpen, roles: ['owner', 'staff'] },
      { to: '/admin/fitting-bookings', label: 'Fitting Bookings', icon: WandSparkles, roles: ['owner', 'staff'] },
    ],
  },
  {
    id: 'management',
    label: 'Management',
    items: [
      { to: '/admin/users', label: 'Users', icon: Users, roles: ['owner'] },
      { to: '/admin/staff-management', label: 'Staff Management', icon: UserSquare2, roles: ['owner'] },
      { to: '/admin/vouchers', label: 'Vouchers', icon: TicketPercent, roles: ['owner'] },
      { to: '/admin/membership', label: 'Membership', icon: ShieldCheck, roles: ['owner'] },
      { to: '/admin/analytics', label: 'Analytics', icon: BarChart3, permission: 'analytics.revenue.read' },
    ],
  },
];

export const PAGE_TITLES = {
  '/admin/dashboard': 'Dashboard',
  '/admin/rent-orders': 'Rent Orders',
  '/admin/sale-orders': 'Sale Orders',
  '/admin/inventory': 'Inventory',
  '/admin/blog': 'Blog CMS',
  '/admin/fitting-bookings': 'Fitting Bookings',
  '/admin/users': 'Users',
  '/admin/staff-management': 'Staff Management',
  '/admin/vouchers': 'Vouchers',
  '/admin/membership': 'Membership',
  '/admin/analytics': 'Analytics',
};

export const ORDER_STATUS_OPTIONS = [
  'All',
  'PendingDeposit',
  'Deposited',
  'Confirmed',
  'Renting',
  'Returned',
  'Late',
  'NoShow',
];
