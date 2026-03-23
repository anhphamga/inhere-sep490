export const mockCurrentUserByRole = {
  owner: {
    id: 'u-owner',
    name: 'Linh Nguyen',
    email: 'owner@inhere.vn',
    role: 'owner',
    avatarUrl: '',
    permissions: [
      'orders_rent.order.list',
      'orders_rent.order.confirm',
      'orders_rent.pickup.complete',
      'orders_rent.return.process',
      'orders_rent.return.finalize',
      'orders_rent.order.finalize',
      'orders_rent.penalty.apply',
      'orders_rent.no_show.mark',
      'orders_rent.washing.complete',
      'inventory.item.read',
      'inventory.item.create',
      'inventory.item.update',
      'inventory.item.update_condition',
      'inventory.item.update_lifecycle',
      'inventory.item.delete',
      'analytics.revenue.read',
      'customers.contact.read_full',
    ],
  },
  staff: {
    id: 'u-staff-1',
    name: 'An Tran',
    email: 'staff@inhere.vn',
    role: 'staff',
    avatarUrl: '',
    permissions: [
      'orders_rent.order.list',
      'orders_rent.order.confirm',
      'orders_rent.pickup.complete',
      'orders_rent.return.process',
      'orders_rent.no_show.mark',
      'orders_rent.washing.complete',
      'inventory.item.read',
      'inventory.item.update',
      'inventory.item.update_condition',
      'inventory.item.update_lifecycle',
      'customers.contact.read_masked',
    ],
  },
};

export const dashboardStats = {
  owner: {
    dailyRevenue: 24850000,
    monthlyRevenue: 612400000,
    totalOrders: 482,
    activeRentals: 96,
    topProducts: [
      { id: 'p1', name: 'Imperial Scarlet Gown', rentals: 34, utilization: 92 },
      { id: 'p2', name: 'Moonlit Ivory Hanbok', rentals: 28, utilization: 84 },
      { id: 'p3', name: 'Velvet Noir Tuxedo', rentals: 22, utilization: 77 },
      { id: 'p4', name: 'Golden Dynasty Cape', rentals: 20, utilization: 73 },
    ],
    inventoryChart: [
      { label: 'Available', value: 136, tone: 'bg-emerald-400' },
      { label: 'Renting', value: 58, tone: 'bg-sky-400' },
      { label: 'Washing', value: 17, tone: 'bg-amber-400' },
      { label: 'Repair', value: 8, tone: 'bg-rose-400' },
    ],
  },
  staff: {
    todayTasks: [
      { id: 't1', title: 'Orders to confirm', count: 6, permission: 'orders_rent.order.confirm', accent: 'from-sky-500 to-cyan-400' },
      { id: 't2', title: 'Orders to pickup', count: 4, permission: 'orders_rent.pickup.complete', accent: 'from-emerald-500 to-lime-400' },
      { id: 't3', title: 'Orders to return', count: 9, permission: 'orders_rent.return.process', accent: 'from-amber-500 to-orange-400' },
    ],
    quickActions: [
      { id: 'qa1', title: 'Confirm queued orders', description: 'Assigned rentals waiting for verification', permission: 'orders_rent.order.confirm' },
      { id: 'qa2', title: 'Update item condition', description: 'Refresh wear and laundry state', permission: 'inventory.item.update_condition' },
      { id: 'qa3', title: 'Process returns', description: 'Close today return desk queue', permission: 'orders_rent.return.process' },
    ],
  },
};

export const mockRentOrders = [
  {
    id: 'RO-240310-128',
    customerName: 'Ngoc Mai',
    customerPhone: '0901234567',
    customerEmail: 'mai.ngoc@gmail.com',
    rentalPeriod: '20 Mar - 23 Mar',
    rentStartDate: '2026-03-20',
    rentEndDate: '2026-03-23',
    deposit: 1200000,
    remaining: 1200000,
    totalAmount: 2400000,
    status: 'Deposited',
    assignedStaff: 'An Tran',
    assignedStaffId: 'u-staff-1',
    items: 2,
  },
  {
    id: 'RO-240311-204',
    customerName: 'Thanh Vy',
    customerPhone: '0938456123',
    customerEmail: 'thanhvy@gmail.com',
    rentalPeriod: '19 Mar - 22 Mar',
    rentStartDate: '2026-03-19',
    rentEndDate: '2026-03-22',
    deposit: 1750000,
    remaining: 1750000,
    totalAmount: 3500000,
    status: 'Confirmed',
    assignedStaff: 'An Tran',
    assignedStaffId: 'u-staff-1',
    items: 3,
  },
  {
    id: 'RO-240312-335',
    customerName: 'Bich Tram',
    customerPhone: '0918883456',
    customerEmail: 'tram.bich@gmail.com',
    rentalPeriod: '15 Mar - 20 Mar',
    rentStartDate: '2026-03-15',
    rentEndDate: '2026-03-20',
    deposit: 950000,
    remaining: 950000,
    totalAmount: 1900000,
    status: 'Renting',
    assignedStaff: 'Duc Le',
    assignedStaffId: 'u-staff-2',
    items: 1,
  },
  {
    id: 'RO-240313-412',
    customerName: 'Gia Han',
    customerPhone: '0987665123',
    customerEmail: 'g.han@gmail.com',
    rentalPeriod: '10 Mar - 17 Mar',
    rentStartDate: '2026-03-10',
    rentEndDate: '2026-03-17',
    deposit: 2100000,
    remaining: 2100000,
    totalAmount: 4200000,
    status: 'Late',
    assignedStaff: 'An Tran',
    assignedStaffId: 'u-staff-1',
    items: 4,
  },
  {
    id: 'RO-240314-587',
    customerName: 'Hoang Linh',
    customerPhone: '0943211678',
    customerEmail: 'linh.hoang@gmail.com',
    rentalPeriod: '12 Mar - 15 Mar',
    rentStartDate: '2026-03-12',
    rentEndDate: '2026-03-15',
    deposit: 800000,
    remaining: 800000,
    totalAmount: 1600000,
    status: 'NoShow',
    assignedStaff: 'An Tran',
    assignedStaffId: 'u-staff-1',
    items: 1,
  },
  {
    id: 'RO-240315-621',
    customerName: 'Nhat Quang',
    customerPhone: '0970011122',
    customerEmail: 'nhatquang@gmail.com',
    rentalPeriod: '16 Mar - 19 Mar',
    rentStartDate: '2026-03-16',
    rentEndDate: '2026-03-19',
    deposit: 1350000,
    remaining: 1350000,
    totalAmount: 2700000,
    status: 'Returned',
    assignedStaff: 'Duc Le',
    assignedStaffId: 'u-staff-2',
    items: 2,
  },
];

export const mockSaleOrders = [
  { id: 'SO-9921', customer: 'Minh Chau', total: 1850000, status: 'Paid', channel: 'Store' },
  { id: 'SO-9922', customer: 'Kim Anh', total: 920000, status: 'Packing', channel: 'Online' },
  { id: 'SO-9923', customer: 'Bao Ngoc', total: 1240000, status: 'Delivered', channel: 'Online' },
];

export const mockInventory = [
  {
    id: 'PI-001',
    image: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=400&q=80',
    name: 'Imperial Scarlet Gown',
    sku: 'INH-GOWN-001',
    condition: 'Good',
    lifecycleStatus: 'Available',
    size: 'M',
    updatedAt: '2h ago',
  },
  {
    id: 'PI-002',
    image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=400&q=80',
    name: 'Moonlit Ivory Hanbok',
    sku: 'INH-HAN-002',
    condition: 'New',
    lifecycleStatus: 'Renting',
    size: 'S',
    updatedAt: '15m ago',
  },
  {
    id: 'PI-003',
    image: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=400&q=80',
    name: 'Velvet Noir Tuxedo',
    sku: 'INH-TUX-003',
    condition: 'Used',
    lifecycleStatus: 'Washing',
    size: 'L',
    updatedAt: '1d ago',
  },
  {
    id: 'PI-004',
    image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=400&q=80',
    name: 'Golden Dynasty Cape',
    sku: 'INH-CAPE-004',
    condition: 'Damaged',
    lifecycleStatus: 'Repair',
    size: 'Free',
    updatedAt: '3d ago',
  },
];

export const mockUsers = [
  { id: 'U-001', name: 'Linh Nguyen', email: 'owner@inhere.vn', role: 'owner', status: 'active', joinedAt: '2025-01-14', orders: 0 },
  { id: 'U-002', name: 'An Tran', email: 'staff@inhere.vn', role: 'staff', status: 'active', joinedAt: '2025-03-03', orders: 0 },
  { id: 'U-003', name: 'Ngoc Mai', email: 'mai.ngoc@gmail.com', role: 'customer', status: 'active', joinedAt: '2025-12-09', orders: 8 },
  { id: 'U-004', name: 'Gia Han', email: 'g.han@gmail.com', role: 'customer', status: 'locked', joinedAt: '2025-11-21', orders: 3 },
];

export const mockStaff = [
  { id: 'u-staff-1', name: 'An Tran', shift: 'Morning', schedule: '08:00 - 16:00', tasks: 7, status: 'On duty' },
  { id: 'u-staff-2', name: 'Duc Le', shift: 'Evening', schedule: '14:00 - 22:00', tasks: 5, status: 'On duty' },
  { id: 'u-staff-3', name: 'Ha Pham', shift: 'Weekend', schedule: '09:00 - 18:00', tasks: 3, status: 'Off today' },
];

export const mockVouchers = [
  { id: 'VC-01', code: 'SPRING15', value: '15%', status: 'Enabled', used: 126, limit: 250, expiresAt: '2026-04-15' },
  { id: 'VC-02', code: 'VIP350K', value: '350.000đ', status: 'Disabled', used: 42, limit: 80, expiresAt: '2026-03-31' },
];

export const mockMembershipPlans = [
  { id: 'MB-01', name: 'Silver Circle', price: '299.000đ/mo', users: 82, perks: 'Priority booking, 5% savings' },
  { id: 'MB-02', name: 'Gold Atelier', price: '599.000đ/mo', users: 34, perks: 'Express support, 12% savings' },
];

export const mockBlogs = [
  { id: 'BL-01', title: 'Styling Ao Dai for Spring Ceremonies', author: 'An Tran', status: 'Published', updatedAt: 'Today' },
  { id: 'BL-02', title: 'Behind the Scenes of Costume Restoration', author: 'Linh Nguyen', status: 'Draft', updatedAt: 'Yesterday' },
];

export const mockBookings = [
  { id: 'FB-901', customer: 'Ngoc Mai', time: '10:00', stylist: 'An Tran', status: 'Confirmed' },
  { id: 'FB-902', customer: 'Bao Ngoc', time: '14:30', stylist: 'Ha Pham', status: 'Pending' },
];
