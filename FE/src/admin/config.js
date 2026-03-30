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
    labelKey: 'sidebar.operations',
    items: [
      { to: '/admin/dashboard', labelKey: 'sidebar.dashboard', icon: LayoutDashboard },
      { to: '/admin/rent-orders', labelKey: 'sidebar.rentOrders', icon: ReceiptText, permission: 'orders_rent.order.list' },
      { to: '/admin/sale-orders', labelKey: 'sidebar.saleOrders', icon: ShoppingBag },
      { to: '/admin/inventory', labelKey: 'sidebar.inventory', icon: Boxes, permission: 'inventory.item.read' },
      { to: '/admin/blog', labelKey: 'sidebar.blog', icon: BookOpen, roles: ['owner', 'staff'] },
      { to: '/admin/fitting-bookings', labelKey: 'sidebar.fittingBookings', icon: WandSparkles, roles: ['owner', 'staff'] },
    ],
  },
  {
    id: 'management',
    labelKey: 'sidebar.management',
    items: [
      { to: '/admin/users', labelKey: 'sidebar.users', icon: Users, roles: ['owner'] },
      { to: '/admin/staff-management', labelKey: 'sidebar.staffManagement', icon: UserSquare2, roles: ['owner'] },
      { to: '/admin/vouchers', labelKey: 'sidebar.vouchers', icon: TicketPercent, roles: ['owner'] },
      { to: '/admin/membership', labelKey: 'sidebar.membership', icon: ShieldCheck, roles: ['owner'] },
      { to: '/admin/analytics', labelKey: 'sidebar.analytics', icon: BarChart3, permission: 'analytics.revenue.read' },
    ],
  },
];

export const PAGE_TITLES = {
  '/admin/dashboard': 'pageTitles.adminDashboard',
  '/admin/rent-orders': 'pageTitles.rentOrders',
  '/admin/sale-orders': 'pageTitles.saleOrders',
  '/admin/inventory': 'pageTitles.inventory',
  '/admin/blog': 'pageTitles.blog',
  '/admin/fitting-bookings': 'pageTitles.fittingBookings',
  '/admin/users': 'pageTitles.users',
  '/admin/staff-management': 'pageTitles.staffManagement',
  '/admin/vouchers': 'pageTitles.vouchers',
  '/admin/membership': 'pageTitles.membership',
  '/admin/analytics': 'pageTitles.analytics',
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
