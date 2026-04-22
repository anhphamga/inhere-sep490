export const INVENTORY_PAGE_SIZE = 10
export const LOW_STOCK_THRESHOLD = 3

export const INSTANCE_STATUS_META = {
  Available: { label: 'Có sẵn', className: 'bg-emerald-100 text-emerald-700' },
  Rented: { label: 'Đang thuê', className: 'bg-amber-100 text-amber-700' },
  Reserved: { label: 'Đã đặt', className: 'bg-blue-100 text-blue-700' },
  Washing: { label: 'Đang giặt', className: 'bg-slate-200 text-slate-700' },
  Repair: { label: 'Đang sửa', className: 'bg-orange-100 text-orange-700' },
  Lost: { label: 'Thất lạc', className: 'bg-rose-100 text-rose-700' },
  Sold: { label: 'Đã bán', className: 'bg-slate-100 text-slate-600' },
  Unknown: { label: 'Không rõ', className: 'bg-slate-100 text-slate-600' }
}

export const INSTANCE_STATUS_ORDER = {
  Available: 1,
  Reserved: 2,
  Rented: 3,
  Washing: 4,
  Repair: 5,
  Lost: 6,
  Sold: 7
}

export const INSTANCE_CONDITION_SCORE_OPTIONS = [0, 25, 50, 75, 100]

export const INSTANCE_CONDITION_FILTER_OPTIONS = [
  { value: '', label: 'Tất cả tình trạng' },
  { value: '100', label: 'Mới' },
  { value: '75', label: 'Tình trạng tốt' },
  { value: '50', label: 'Trung bình' },
  { value: '25', label: 'Cần sửa' }
]

export const INSTANCE_STATUS_FILTER_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'Available', label: 'Có sẵn' },
  { value: 'Rented', label: 'Đang thuê' },
  { value: 'Reserved', label: 'Đã đặt' },
  { value: 'Washing', label: 'Đang giặt' },
  { value: 'Repair', label: 'Đang sửa' },
  { value: 'Lost', label: 'Thất lạc' },
  { value: 'Sold', label: 'Đã bán' },
  { value: 'Unknown', label: 'Không rõ' }
]

export const INSTANCE_STATUS_EDIT_OPTIONS = [
  { value: 'Available', label: 'Có sẵn' },
  { value: 'Rented', label: 'Đang thuê' },
  { value: 'Reserved', label: 'Đã đặt' },
  { value: 'Washing', label: 'Đang giặt' },
  { value: 'Repair', label: 'Đang sửa' },
  { value: 'Lost', label: 'Thất lạc' },
  { value: 'Sold', label: 'Đã bán' }
]
