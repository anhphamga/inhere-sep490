export const SHIFT_STATUS = {
  OPEN: 'OPEN',
  FULL: 'FULL',
  LOCKED: 'LOCKED',
  DONE: 'DONE',
  CANCELLED: 'CANCELLED',
}

export const SHIFT_STATUS_OPTIONS = [
  { value: SHIFT_STATUS.OPEN, label: 'Đang mở', className: 'bg-emerald-100 text-emerald-700' },
  { value: SHIFT_STATUS.FULL, label: 'Đã đầy', className: 'bg-blue-100 text-blue-700' },
  { value: SHIFT_STATUS.LOCKED, label: 'Đã khóa', className: 'bg-amber-100 text-amber-700' },
  { value: SHIFT_STATUS.DONE, label: 'Hoàn tất', className: 'bg-slate-200 text-slate-700' },
  { value: SHIFT_STATUS.CANCELLED, label: 'Đã hủy', className: 'bg-rose-100 text-rose-700' },
]

export const REGISTRATION_FILTER_OPTIONS = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'ALLOW', label: 'Cho phép' },
  { value: 'BLOCK', label: 'Không cho phép' },
]

export const STATUS_FILTER_OPTIONS = [
  { value: 'ALL', label: 'Tất cả trạng thái' },
  ...SHIFT_STATUS_OPTIONS.map((item) => ({ value: item.value, label: item.label })),
]

export const getShiftStatusMeta = (status) => {
  return SHIFT_STATUS_OPTIONS.find((item) => item.value === status) || {
    value: status,
    label: status || 'Không xác định',
    className: 'bg-slate-100 text-slate-600',
  }
}
