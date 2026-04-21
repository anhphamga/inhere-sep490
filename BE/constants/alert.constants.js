const ALERT_TYPES = Object.freeze({
  ORDER_NEW: 'OrderNew',
  ORDER_CANCELLED: 'OrderCancelled',
  RENT_PICKUP_SOON: 'RentPickupSoon',
  STOCK_LOW: 'StockLow',
  VOUCHER_EXPIRING: 'VoucherExpiring',
  SYSTEM: 'System',
  PICKUP_SOON: 'PickupSoon',
  RETURN_SOON: 'ReturnSoon',
  LATE: 'Late',
  NO_SHOW: 'NoShow',
  COMPENSATION: 'Compensation',
  TASK: 'Task',
});

const ALERT_PRIORITY = Object.freeze({
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
});

const ALERT_STATUS = Object.freeze({
  NEW: 'New',
  SEEN: 'Seen',
  DONE: 'Done',
});

const ALERT_TARGET_TYPES = Object.freeze({
  RENT_ORDER: 'RentOrder',
  SALE_ORDER: 'SaleOrder',
  PRODUCT: 'Product',
  FITTING_BOOKING: 'FittingBooking',
  VOUCHER: 'Voucher',
});

module.exports = {
  ALERT_TYPES,
  ALERT_PRIORITY,
  ALERT_STATUS,
  ALERT_TARGET_TYPES,
};
