export const SHIFT_PRESETS = [
  {
    key: 'morning',
    buttonLabel: 'Morning shift',
    defaultName: 'Ca sang',
    quickCreateName: 'Ca 1',
    startTime: '08:30',
    endTime: '16:30',
  },
  {
    key: 'evening',
    buttonLabel: 'Evening shift',
    defaultName: 'Ca toi',
    quickCreateName: 'Ca 2',
    startTime: '14:30',
    endTime: '22:30',
  },
]

export const DEFAULT_SHIFT_PRESET = SHIFT_PRESETS[0]

export const SHIFT_DASHBOARD_PAGINATION = {
  limit: 200,
  maxPages: 50,
}

export const SHIFT_MANAGEMENT_PAGINATION = {
  staffLimit: 200,
}

export const SHIFT_KPI_STATUS_GROUPS = {
  successOrder: ['WaitingPickup', 'Renting', 'WaitingReturn', 'Returned', 'Completed'],
  finishedOrder: ['Completed', 'Cancelled'],
  rentingFlow: ['Renting', 'WaitingReturn', 'Late'],
  salePaid: ['Paid', 'PendingConfirmation', 'Confirmed', 'Shipping', 'Completed', 'Returned', 'Refunded'],
  pickupQueue: ['Confirmed', 'WaitingPickup'],
  issueOrder: ['Compensation', 'NoShow', 'Cancelled'],
  inventoryReady: ['Confirmed', 'WaitingPickup'],
  inventoryRenting: ['Renting', 'WaitingReturn', 'Late'],
  inventoryLaundry: ['Returned'],
  inventoryRepair: ['Compensation'],
}

export const SHIFT_KPI_STATUS_VALUES = {
  renting: 'Renting',
  waitingReturn: 'WaitingReturn',
  late: 'Late',
  bookingPending: 'pending',
}

export const SHIFT_DASHBOARD_INTERVAL = {
  autoRefreshMs: 30000,
}

export const STAFF_SHIFT_ROUTES = {
  rentOrders: '/staff/rent-orders',
  returnOrders: '/staff/return',
  saleOrders: '/staff/sale-order',
  bookings: '/staff/bookings',
}
