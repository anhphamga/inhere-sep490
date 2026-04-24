import React, { useMemo } from 'react'
import RegistrationStatusPill from './RegistrationStatusPill'

const formatDateTime = (value) => (value ? new Date(value).toLocaleString('vi-VN') : '')

const groupByStatus = (items = []) => {
  const groups = { PENDING: [], APPROVED: [], REJECTED: [] }
  for (const item of items) {
    const key = String(item?.status || '').toUpperCase()
    if (groups[key]) groups[key].push(item)
  }
  return groups
}

const StaffCell = ({ staff }) => {
  if (!staff) return <span className="text-slate-500">N/A</span>
  const name = staff?.name || 'Nhân sự'
  const email = staff?.email || ''
  const phone = staff?.phone || ''
  return (
    <div className="min-w-0">
      <div className="truncate font-semibold text-slate-900">{name}</div>
      <div className="truncate text-xs text-slate-500">{phone || email}</div>
    </div>
  )
}

export default function ShiftRegistrationsPanel({
  items = [],
  loading,
  errorMessage = '',
  onApprove,
  onReject,
  actionLoadingMap = {},
  shiftId,
}) {
  const groups = useMemo(() => groupByStatus(items), [items])

  const renderTable = (title, rows, showActions) => {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
          <span className="text-xs font-semibold text-slate-500">{rows.length}</span>
        </div>
        {rows.length === 0 ? (
          <div className="text-sm text-slate-500">Chưa có đăng ký.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-semibold text-slate-500">
                  <th className="py-2 pr-3">Nhân sự</th>
                  <th className="py-2 pr-3">Trạng thái</th>
                  <th className="py-2 pr-3">Check-in</th>
                  <th className="py-2 pr-3">Check-out</th>
                  {showActions ? <th className="py-2 text-right">Thao tác</th> : null}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const id = String(r?._id || '')
                  const approveKey = `approve:${id}`
                  const rejectKey = `reject:${id}`
                  const busy = Boolean(actionLoadingMap[approveKey] || actionLoadingMap[rejectKey])
                  return (
                    <tr key={id} className="border-b border-slate-50 last:border-0">
                      <td className="py-2 pr-3"><StaffCell staff={r?.staffId} /></td>
                      <td className="py-2 pr-3"><RegistrationStatusPill status={r?.status} /></td>
                      <td className="py-2 pr-3 text-xs text-slate-600">{formatDateTime(r?.checkInAt)}</td>
                      <td className="py-2 pr-3 text-xs text-slate-600">{formatDateTime(r?.checkOutAt)}</td>
                      {showActions ? (
                        <td className="py-2 text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => onApprove?.(id, shiftId)}
                              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {actionLoadingMap[approveKey] ? 'Đang duyệt...' : 'Duyệt'}
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => onReject?.(id, shiftId)}
                              className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {actionLoadingMap[rejectKey] ? 'Đang xử lý...' : 'Từ chối'}
                            </button>
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
        Đang tải danh sách đăng ký...
      </div>
    )
  }

  if (errorMessage) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">
        {errorMessage}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {renderTable('Chờ duyệt', groups.PENDING, true)}
      {renderTable('Đã duyệt', groups.APPROVED, false)}
      {renderTable('Đã từ chối', groups.REJECTED, false)}
    </div>
  )
}

