import { getShiftStatusMeta } from '../../constants/shiftStatus'

export function ShiftStatusBadge({ status }) {
  const meta = getShiftStatusMeta(status)
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${meta.className}`}>
      {meta.label}
    </span>
  )
}

export function ShiftRegistrationBadge({ allowRegistration }) {
  return allowRegistration ? (
    <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
      Cho phép đăng ký
    </span>
  ) : (
    <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
      Tạm khóa đăng ký
    </span>
  )
}
