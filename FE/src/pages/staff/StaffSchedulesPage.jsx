import React, { useMemo, useState } from 'react'
import { useShiftSchedules } from '../../hooks/useShiftSchedules'
import ShiftCardStaff from '../../components/shift/ShiftCardStaff'

const todayInput = () => {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export default function StaffSchedulesPage() {
  const {
    selectedDate,
    setSelectedDate,
    shifts,
    loading,
    error,
    actionLoadingMap,
    registerShift,
    checkIn,
    checkOut,
    undoCheckOut,
    myRegistrationByShiftId,
    currentShift,
    refresh,
  } = useShiftSchedules({ initialDate: todayInput() })

  const [toast, setToast] = useState('')

  const showToast = (msg) => {
    setToast(msg)
    if (!msg) return
    setTimeout(() => setToast(''), 3500)
  }

  const handleRegister = async (shiftId) => {
    try {
      const res = await registerShift(shiftId)
      showToast(res?.message || 'Đã gửi đăng ký ca.')
    } catch (err) {
      showToast(err?.response?.data?.message || 'Không thể đăng ký ca.')
    }
  }

  const handleCheckIn = async (shiftId) => {
    try {
      const res = await checkIn(shiftId)
      showToast(res?.message || 'Check-in thành công.')
    } catch (err) {
      showToast(err?.response?.data?.message || 'Không thể check-in.')
    }
  }

  const handleCheckOut = async (shiftId) => {
    try {
      const res = await checkOut(shiftId)
      showToast(res?.message || 'Check-out thành công.')
    } catch (err) {
      showToast(err?.response?.data?.message || 'Không thể check-out.')
    }
  }

  const handleUndoCheckOut = async (shiftId) => {
    try {
      const res = await undoCheckOut(shiftId)
      showToast(res?.message || 'Hoàn tác check-out thành công.')
    } catch (err) {
      showToast(err?.response?.data?.message || 'Không thể hoàn tác check-out.')
    }
  }

  const empty = !loading && shifts.length === 0

  const sortedShifts = useMemo(() => {
    return [...shifts].sort((a, b) => String(a?.startTime || '').localeCompare(String(b?.startTime || '')))
  }, [shifts])

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Lịch làm</h1>
          <p className="mt-1 text-sm text-slate-600">Xem ca theo ngày, đăng ký và check-in/check-out khi được duyệt.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
          <button
            type="button"
            onClick={() => refresh()}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Làm mới
          </button>
        </div>
      </div>

      {currentShift?.shift ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          🟢 Bạn đang trong ca: {currentShift.shift.startTime} - {currentShift.shift.endTime}
        </div>
      ) : (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          🔴 Bạn chưa check-in hoặc đã check-out
        </div>
      )}

      {toast ? (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm font-medium text-indigo-800">
          {toast}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500">Đang tải ca làm...</div>
      ) : null}

      {empty ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
          <p className="text-sm text-slate-600">Chưa có ca làm trong ngày này.</p>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4">
        {sortedShifts.map((shift) => {
          const shiftId = String(shift?._id || '')
          const registration = myRegistrationByShiftId[shiftId]
          return (
            <ShiftCardStaff
              key={shiftId}
              shift={shift}
              registration={registration}
              loadingMap={actionLoadingMap}
              onRegister={handleRegister}
              onCheckIn={handleCheckIn}
              onCheckOut={handleCheckOut}
              onUndoCheckOut={handleUndoCheckOut}
            />
          )
        })}
      </div>
    </div>
  )
}
