import React, { useMemo } from 'react'
import ShiftStatusPill from './ShiftStatusPill'
import RegistrationStatusPill from './RegistrationStatusPill'

const formatDate = (value) => (value ? new Date(value).toLocaleDateString('vi-VN') : 'N/A')
const formatDateTime = (value) => (value ? new Date(value).toLocaleString('vi-VN') : '')

const getAssignedCount = (shift) => {
  const count = Number(shift?.assignedStaffCount)
  if (Number.isFinite(count)) return count
  if (Array.isArray(shift?.assignedStaffIds)) return shift.assignedStaffIds.length
  return 0
}

export default function ShiftCardStaff({
  shift,
  registration,
  onRegister,
  onCheckIn,
  onCheckOut,
  onUndoCheckOut,
  loadingMap = {},
}) {
  const shiftId = String(shift?._id || '')
  const status = String(shift?.status || '').toUpperCase()
  const requiredStaff = Number(shift?.requiredStaff || 0)
  const assignedCount = getAssignedCount(shift)

  const regStatus = String(registration?.status || '').toUpperCase()
  const canRegister = !registration && status === 'OPEN' && assignedCount < requiredStaff
  const canCheckIn = regStatus === 'APPROVED' && !registration?.checkInAt && status !== 'CLOSED'
  const canCheckOut = regStatus === 'APPROVED' && Boolean(registration?.checkInAt) && !registration?.checkOutAt && status !== 'CLOSED'
  const canUndoCheckOut = regStatus === 'APPROVED' && Boolean(registration?.checkInAt) && Boolean(registration?.checkOutAt) && status !== 'CLOSED'

  const actionKeyRegister = `register:${shiftId}`
  const actionKeyCheckIn = `checkIn:${shiftId}`
  const actionKeyCheckOut = `checkOut:${shiftId}`
  const actionKeyUndo = `undoCheckOut:${shiftId}`
  const busy = Boolean(loadingMap[actionKeyRegister] || loadingMap[actionKeyCheckIn] || loadingMap[actionKeyCheckOut] || loadingMap[actionKeyUndo])

  const timeLabel = useMemo(() => {
    const startTime = String(shift?.startTime || '')
    const endTime = String(shift?.endTime || '')
    return startTime && endTime ? `${startTime} - ${endTime}` : 'N/A'
  }, [shift?.endTime, shift?.startTime])

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-slate-900">Ca làm</h3>
            <ShiftStatusPill status={status} />
            <RegistrationStatusPill status={registration?.status || ''} />
          </div>
          <div className="mt-2 grid grid-cols-1 gap-1 text-sm text-slate-600 sm:grid-cols-2">
            <div>
              <span className="font-medium text-slate-800">Ngày:</span> {formatDate(shift?.date)}
            </div>
            <div>
              <span className="font-medium text-slate-800">Giờ:</span> {timeLabel}
            </div>
            <div>
              <span className="font-medium text-slate-800">Yêu cầu:</span> {requiredStaff} nhân sự
            </div>
            <div>
              <span className="font-medium text-slate-800">Đã đăng ký:</span> {assignedCount}/{requiredStaff}
            </div>
          </div>

          {registration?.checkInAt ? (
            <div className="mt-2 text-sm text-slate-600">
              <span className="font-medium text-slate-800">Check-in:</span> {formatDateTime(registration.checkInAt)}
            </div>
          ) : null}
          {registration?.checkOutAt ? (
            <div className="mt-1 text-sm text-slate-600">
              <span className="font-medium text-slate-800">Check-out:</span> {formatDateTime(registration.checkOutAt)}
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-row flex-wrap gap-2 sm:flex-col sm:items-end">
          <button
            type="button"
            disabled={!canRegister || busy}
            onClick={() => onRegister?.(shiftId)}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loadingMap[actionKeyRegister] ? 'Đang đăng ký...' : 'Đăng ký'}
          </button>

          <button
            type="button"
            disabled={!canCheckIn || busy}
            onClick={() => onCheckIn?.(shiftId)}
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loadingMap[actionKeyCheckIn] ? 'Đang check-in...' : 'Check-in'}
          </button>

          <button
            type="button"
            disabled={!canCheckOut || busy}
            onClick={() => onCheckOut?.(shiftId)}
            className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loadingMap[actionKeyCheckOut] ? 'Đang check-out...' : 'Check-out'}
          </button>

          <button
            type="button"
            disabled={!canUndoCheckOut || busy}
            onClick={() => onUndoCheckOut?.(shiftId)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loadingMap[actionKeyUndo] ? 'Đang hoàn tác...' : 'Hoàn tác check-out (Tiếp tục ca)'}
          </button>
        </div>
      </div>
    </div>
  )
}
