import React, { useMemo, useState } from 'react'
import ShiftCreateForm from '../../components/shift/ShiftCreateForm'
import ShiftStatusPill from '../../components/shift/ShiftStatusPill'
import ShiftRegistrationsPanel from '../../components/shift/ShiftRegistrationsPanel'
import { useShiftSchedules } from '../../hooks/useShiftSchedules'

const formatDate = (value) => (value ? new Date(value).toLocaleDateString('vi-VN') : 'N/A')

const getAssignedCount = (shift) => {
  if (typeof shift?.assignedStaffCount === 'number') return shift.assignedStaffCount
  if (Array.isArray(shift?.assignedStaffIds)) return shift.assignedStaffIds.length
  return 0
}

export default function OwnerShiftSchedulesPage() {
  const {
    selectedDate,
    setSelectedDate,
    shifts,
    loading,
    error,
    actionLoadingMap,
    createShift,
    refresh,
    fetchRegistrationsForShift,
    registrationsByShiftId,
    approveRegistration,
    rejectRegistration,
    closeShift,
  } = useShiftSchedules()

  const [toast, setToast] = useState('')
  const [expandedShiftId, setExpandedShiftId] = useState('')
  const [registrationErrorMap, setRegistrationErrorMap] = useState({})

  const showToast = (msg) => {
    setToast(msg)
    if (!msg) return
    setTimeout(() => setToast(''), 3500)
  }

  const handleCreate = async (payload) => {
    try {
      const res = await createShift(payload)
      showToast(res?.message || 'Tạo ca thành công.')
    } catch (err) {
      showToast(err?.response?.data?.message || 'Không thể tạo ca.')
    }
  }

  const sortedShifts = useMemo(() => {
    return [...shifts].sort((a, b) => String(a?.startTime || '').localeCompare(String(b?.startTime || '')))
  }, [shifts])

  const toggleRegistrations = async (shiftId) => {
    if (expandedShiftId === shiftId) {
      setExpandedShiftId('')
      return
    }
    setExpandedShiftId(shiftId)
    setRegistrationErrorMap((prev) => ({ ...prev, [shiftId]: '' }))
    try {
      await fetchRegistrationsForShift(shiftId)
    } catch (e) {
      setRegistrationErrorMap((prev) => ({ ...prev, [shiftId]: e?.response?.data?.message || 'Không thể tải đăng ký.' }))
    }
  }

  const handleApprove = async (registrationId, shiftId) => {
    try {
      const res = await approveRegistration(registrationId, shiftId)
      showToast(res?.message || 'Đã duyệt.')
    } catch (err) {
      showToast(err?.response?.data?.message || 'Không thể duyệt.')
    }
  }

  const handleReject = async (registrationId, shiftId) => {
    try {
      const res = await rejectRegistration(registrationId, shiftId)
      showToast(res?.message || 'Đã từ chối.')
    } catch (err) {
      showToast(err?.response?.data?.message || 'Không thể từ chối.')
    }
  }

  const handleCloseShift = async (shiftId, status) => {
    if (String(status || '').toUpperCase() === 'CLOSED') return
    const ok = window.confirm('Bạn chắc chắn muốn đóng ca này? Sau khi đóng, nhân viên không thể đăng ký/duyệt/check-in/check-out.')
    if (!ok) return
    try {
      const res = await closeShift(shiftId)
      showToast(res?.message || 'Đã đóng ca.')
    } catch (err) {
      showToast(err?.response?.data?.message || 'Không thể đóng ca.')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quản lý ca làm</h1>
          <p className="mt-1 text-sm text-slate-600">Tạo ca, theo dõi đăng ký và duyệt/từ chối nhân sự.</p>
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

      <ShiftCreateForm
        onSubmit={handleCreate}
        loading={Boolean(actionLoadingMap.createShift)}
        errorMessage={error}
      />

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500">Đang tải ca làm...</div>
      ) : null}

      <div className="space-y-4">
        {sortedShifts.map((shift) => {
          const shiftId = String(shift?._id || '')
          const assignedCount = getAssignedCount(shift)
          const requiredStaff = Number(shift?.requiredStaff || 0)
          const regLoadingKey = `registrations:${shiftId}`
          const regLoading = Boolean(actionLoadingMap[regLoadingKey])
          const regItems = registrationsByShiftId[shiftId] || []
          const regError = registrationErrorMap[shiftId] || ''
          const closeLoadingKey = `close:${shiftId}`
          const closeLoading = Boolean(actionLoadingMap[closeLoadingKey])
          const isClosed = String(shift?.status || '').toUpperCase() === 'CLOSED'
          return (
            <div key={shiftId} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold text-slate-900">Ca {shift?.startTime} - {shift?.endTime}</h3>
                    <ShiftStatusPill status={shift?.status} />
                  </div>
                  <div className="mt-2 grid grid-cols-1 gap-1 text-sm text-slate-600 sm:grid-cols-2">
                    <div><span className="font-medium text-slate-800">Ngày:</span> {formatDate(shift?.date)}</div>
                    <div><span className="font-medium text-slate-800">Nhân sự:</span> {assignedCount}/{requiredStaff}</div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleRegistrations(shiftId)}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    {expandedShiftId === shiftId ? 'Ẩn đăng ký' : 'Xem đăng ký'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCloseShift(shiftId, shift?.status)}
                    disabled={isClosed || closeLoading}
                    className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:opacity-50"
                  >
                    {closeLoading ? 'Đang đóng...' : 'Đóng ca'}
                  </button>
                </div>
              </div>

              {expandedShiftId === shiftId ? (
                <div className="mt-4">
                  <ShiftRegistrationsPanel
                    shiftId={shiftId}
                    items={regItems}
                    loading={regLoading}
                    errorMessage={regError}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    actionLoadingMap={actionLoadingMap}
                  />
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}
