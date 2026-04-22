/**
 * OWNER MANAGEMENT - Constants
 * Centralized configuration for Owner dashboard, products, orders, inventory
 */

// ============================================================================
// PAGINATION CONFIG
// ============================================================================
export const OWNER_PAGINATION = {
  ORDERS_PAGE_SIZE: 10,
  PRODUCTS_PAGE_SIZE: 10,
  INVENTORY_PAGE_SIZE: 20,
  STAFF_PAGE_SIZE: 10,
  DEFAULT_PAGE: 1,
  MAX_PAGINATION: 50
}

// ============================================================================
// ORDER STATUSES
// ============================================================================
export const SALE_ORDER_STATUSES = {
  PENDING_CONFIRMATION: 'PendingConfirmation',
  CONFIRMED: 'Confirmed',
  PROCESSING: 'Processing',
  SHIPPING: 'Shipping',
  DELIVERED: 'Delivered',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  REFUNDED: 'Refunded',
  RETURNED: 'Returned'
}

export const SALE_ORDER_STATUS_LABELS = {
  [SALE_ORDER_STATUSES.PENDING_CONFIRMATION]: 'Chờ xác nhận',
  [SALE_ORDER_STATUSES.CONFIRMED]: 'Đã xác nhận',
  [SALE_ORDER_STATUSES.PROCESSING]: 'Đang xử lý',
  [SALE_ORDER_STATUSES.SHIPPING]: 'Đang giao',
  [SALE_ORDER_STATUSES.DELIVERED]: 'Đã giao',
  [SALE_ORDER_STATUSES.COMPLETED]: 'Hoàn tất',
  [SALE_ORDER_STATUSES.CANCELLED]: 'Đã hủy',
  [SALE_ORDER_STATUSES.REFUNDED]: 'Đã hoàn tiền',
  [SALE_ORDER_STATUSES.RETURNED]: 'Đã trả hàng'
}

export const SALE_ORDER_STATUS_BADGES = {
  [SALE_ORDER_STATUSES.PENDING_CONFIRMATION]: 'bg-amber-100 text-amber-800',
  [SALE_ORDER_STATUSES.CONFIRMED]: 'bg-blue-100 text-blue-800',
  [SALE_ORDER_STATUSES.PROCESSING]: 'bg-purple-100 text-purple-800',
  [SALE_ORDER_STATUSES.SHIPPING]: 'bg-indigo-100 text-indigo-800',
  [SALE_ORDER_STATUSES.DELIVERED]: 'bg-cyan-100 text-cyan-800',
  [SALE_ORDER_STATUSES.COMPLETED]: 'bg-green-100 text-green-800',
  [SALE_ORDER_STATUSES.CANCELLED]: 'bg-red-100 text-red-800',
  [SALE_ORDER_STATUSES.REFUNDED]: 'bg-orange-100 text-orange-800',
  [SALE_ORDER_STATUSES.RETURNED]: 'bg-slate-100 text-slate-700'
}

export const RENT_ORDER_STATUSES = {
  PENDING_DEPOSIT: 'PendingDeposit',
  DEPOSITED: 'Deposited',
  CONFIRMED: 'Confirmed',
  WAITING_PICKUP: 'WaitingPickup',
  RENTING: 'Renting',
  WAITING_RETURN: 'WaitingReturn',
  LATE: 'Late',
  RETURNED: 'Returned',
  CANCELLED: 'Cancelled',
  NO_SHOW: 'NoShow',
  COMPENSATION: 'Compensation',
  COMPLETED: 'Completed'
}

export const RENT_ORDER_STATUS_LABELS = {
  [RENT_ORDER_STATUSES.PENDING_DEPOSIT]: 'Chờ đặt cọc',
  [RENT_ORDER_STATUSES.DEPOSITED]: 'Đã đặt cọc',
  [RENT_ORDER_STATUSES.CONFIRMED]: 'Đã xác nhận',
  [RENT_ORDER_STATUSES.WAITING_PICKUP]: 'Chờ lấy đồ',
  [RENT_ORDER_STATUSES.RENTING]: 'Đang thuê',
  [RENT_ORDER_STATUSES.WAITING_RETURN]: 'Chờ trả đồ',
  [RENT_ORDER_STATUSES.LATE]: 'Trễ hạn',
  [RENT_ORDER_STATUSES.RETURNED]: 'Đã trả đồ',
  [RENT_ORDER_STATUSES.CANCELLED]: 'Đã hủy',
  [RENT_ORDER_STATUSES.NO_SHOW]: 'Khách không đến',
  [RENT_ORDER_STATUSES.COMPENSATION]: 'Bồi thường',
  [RENT_ORDER_STATUSES.COMPLETED]: 'Hoàn tất'
}

export const RENT_ORDER_REVENUE_STATUSES = [
  RENT_ORDER_STATUSES.RENTING,
  RENT_ORDER_STATUSES.WAITING_RETURN,
  RENT_ORDER_STATUSES.LATE,
  RENT_ORDER_STATUSES.RETURNED,
  RENT_ORDER_STATUSES.COMPLETED
]

export const SALE_ORDER_REVENUE_STATUSES = [
  SALE_ORDER_STATUSES.COMPLETED,
  SALE_ORDER_STATUSES.DELIVERED
]

// ============================================================================
// PRODUCT INSTANCE LIFECYCLE
// ============================================================================
export const PRODUCT_LIFECYCLE_STATUSES = {
  AVAILABLE: 'Available',
  RESERVED: 'Reserved',
  RENTED: 'Rented',
  WASHING: 'Washing',
  REPAIR: 'Repair',
  LOST: 'Lost',
  SOLD: 'Sold'
}

export const PRODUCT_LIFECYCLE_STATUS_LABELS = {
  [PRODUCT_LIFECYCLE_STATUSES.AVAILABLE]: 'Có sẵn',
  [PRODUCT_LIFECYCLE_STATUSES.RESERVED]: 'Đang giữ đồ',
  [PRODUCT_LIFECYCLE_STATUSES.RENTED]: 'Đang thuê',
  [PRODUCT_LIFECYCLE_STATUSES.WASHING]: 'Đang giặt',
  [PRODUCT_LIFECYCLE_STATUSES.REPAIR]: 'Đang sửa',
  [PRODUCT_LIFECYCLE_STATUSES.LOST]: 'Mất',
  [PRODUCT_LIFECYCLE_STATUSES.SOLD]: 'Đã bán'
}

export const PRODUCT_LIFECYCLE_STATUS_BADGES = {
  [PRODUCT_LIFECYCLE_STATUSES.AVAILABLE]: 'bg-green-100 text-green-800',
  [PRODUCT_LIFECYCLE_STATUSES.RESERVED]: 'bg-amber-100 text-amber-800',
  [PRODUCT_LIFECYCLE_STATUSES.RENTED]: 'bg-purple-100 text-purple-800',
  [PRODUCT_LIFECYCLE_STATUSES.WASHING]: 'bg-cyan-100 text-cyan-800',
  [PRODUCT_LIFECYCLE_STATUSES.REPAIR]: 'bg-orange-100 text-orange-800',
  [PRODUCT_LIFECYCLE_STATUSES.LOST]: 'bg-red-100 text-red-800',
  [PRODUCT_LIFECYCLE_STATUSES.SOLD]: 'bg-slate-100 text-slate-700'
}

// ============================================================================
// PRODUCT CONDITION LEVELS
// ============================================================================
export const PRODUCT_CONDITION_SCORES = [0, 25, 50, 75, 100]

export const PRODUCT_CONDITION_LEVELS = {
  NEW: 'New',
  USED: 'Used'
}

export const PRODUCT_CONDITION_LABELS = {
  [PRODUCT_CONDITION_LEVELS.NEW]: 'Sản phẩm mới',
  [PRODUCT_CONDITION_LEVELS.USED]: 'Sản phẩm cũ'
}

// ============================================================================
// ORDER TYPES
// ============================================================================
export const ORDER_TYPES = {
  SALE: 'sale',
  RENT: 'rent'
}

// ============================================================================
// DASHBOARD DATE PRESETS
// ============================================================================
export const DASHBOARD_DATE_PRESETS = {
  TODAY: 'today',
  SEVEN_DAYS: '7days',
  THIRTY_DAYS: '30days',
  CUSTOM: 'custom'
}

// ============================================================================
// INVENTORY FILTER OPTIONS
// ============================================================================
export const INVENTORY_SMART_FILTERS = {
  ALL: 'all',
  LOW_STOCK: 'low',
  OUT_OF_STOCK: 'out',
  HOT_ITEMS: 'hot',
  SLOW_ITEMS: 'slow'
}

export const INVENTORY_SMART_FILTER_LABELS = {
  [INVENTORY_SMART_FILTERS.ALL]: 'Tất cả',
  [INVENTORY_SMART_FILTERS.LOW_STOCK]: 'Sắp hết hàng',
  [INVENTORY_SMART_FILTERS.OUT_OF_STOCK]: 'Các sản phẩm hết hàng',
  [INVENTORY_SMART_FILTERS.HOT_ITEMS]: 'Bán chạy',
  [INVENTORY_SMART_FILTERS.SLOW_ITEMS]: 'Ít bán'
}

// ============================================================================
// LIMITS & THRESHOLDS
// ============================================================================
export const OWNER_LIMITS = {
  LOW_STOCK_THRESHOLD: 3,
  IMPORT_LIMIT: 20,
  TOP_PRODUCTS_LIMIT: 5,
  SEARCH_DEBOUNCE_MS: 250,
  API_TIMEOUT_MS: 30000
}

// ============================================================================
// DEFAULT VALUES
// ============================================================================
export const OWNER_DEFAULTS = {
  DEFAULT_STATUS_BADGE: 'bg-slate-100 text-slate-700',
  DEFAULT_CONDITION_SCORE: 100,
  DEFAULT_IMAGE_FALLBACK: '/placeholder.png'
}
