import { useCallback, useEffect, useMemo, useState } from 'react'
import { RefreshCcw } from 'lucide-react'
import { ShiftStatusBadge, ShiftRegistrationBadge } from '../../components/shifts/ShiftStatusBadge'
import { STATUS_FILTER_OPTIONS } from '../../constants/shiftStatus'
import { getMyShiftOptionsApi, registerMyShiftApi, unregisterMyShiftApi } from '../../services/staff-shift.service'

const formatToday = () => new Date().toISOString().slice(0, 10)

export default function StaffShiftRegistration() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const [workDateFilter, setWorkDateFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [onlyRegistered, setOnlyRegistered] = useState(false)

  const loadShifts = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const response = await getMyShiftOptionsApi({})
      setRows(Array.isArray(response?.data) ? response.data : [])
    } catch (apiError) {
      setError(apiError?.response?.data?.message || apiError?.message || 'Không thể tải danh sách ca làm')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadShifts()
  }, [loadShifts])

  const filteredRows = useMemo(() => {
    return rows.filter((shift) => {
      const byDate = !workDateFilter || shift.workDate === workDateFilter
      const byStatus = statusFilter === 'ALL' || shift.status === statusFilter
      const byRegistered = !onlyRegistered || shift.isRegistered
      return byDate && byStatus && byRegistered
    })
  }, [onlyRegistered, rows, statusFilter, workDateFilter])

  const todayStats = useMemo(() => {
    const today = formatToday()
    const todayRows = rows.filter((item) => item.workDate === today)
    const myRegistered = rows.filter((item) => item.isRegistered).length
    return {
      todayCount: todayRows.length,
      myRegistered,
    }
  }, [rows])

  const handleRegister = async (shift) => {
    try {
      await registerMyShiftApi(shift.id)
      setNotice(`Đăng ký ca ${shift.code} thành công`)
      await loadShifts()
    } catch (apiError) {
      setError(apiError?.response?.data?.message || apiError?.message || 'Không thể đăng ký ca')
    }
  }

  const handleUnregister = async (shift) => {
    try {
      await unregisterMyShiftApi(shift.id)
      setNotice(`Đã hủy đăng ký ca ${shift.code}`)
      await loadShifts()
    } catch (apiError) {
      setError(apiError?.response?.data?.message || apiError?.message || 'Không thể hủy đăng ký ca')
    }
  }

  return (
    <div className="space-y-5">
      <header className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-2xl font-bold text-slate-900">Đăng ký ca làm</h2>
        <p className="mt-1 text-sm text-slate-600">Nhân viên chọn ca phù hợp và đăng ký trực tiếp trên hệ thống.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-lg bg-slate-50 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Ca hôm nay</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{todayStats.todayCount}</p>
          </div>
          <div className="rounded-lg bg-slate-50 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Ca tôi đã đăng ký</p>
            <p className="mt-1 text-2xl font-bold text-indigo-600">{todayStats.myRegistered}</p>
          </div>
        </div>
      </header>

      {notice ? (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">{notice}</div>
      ) : null}
      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      ) : null}

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid gap-3 md:grid-cols-4">
          <input
            type="date"
            value={workDateFilter}
            onChange={(event) => setWorkDateFilter(event.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300"
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300"
          >
            {STATUS_FILTER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={onlyRegistered}
              onChange={(event) => setOnlyRegistered(event.target.checked)}
            />
            Chỉ hiển thị ca đã đăng ký
          </label>
          <button
            type="button"
            onClick={loadShifts}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <RefreshCcw className="h-4 w-4" />
            Làm mới
          </button>
        </div>
      </section>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[980px] border-collapse text-left">
          <thead className="bg-slate-50">
            <tr className="border-b border-slate-200">
              <th className="px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Mã ca</th>
              <th className="px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Tên ca</th>
              <th className="px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Ngày làm</th>
              <th className="px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Giờ làm</th>
              <th className="px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Nhân sự</th>
              <th className="px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Trạng thái</th>
              <th className="px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Đăng ký</th>
              <th className="px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-8 text-sm text-slate-500" colSpan={8}>Đang tải danh sách ca làm...</td>
              </tr>
            ) : null}

            {!loading && filteredRows.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-sm text-slate-500" colSpan={8}>Không có ca làm phù hợp bộ lọc.</td>
              </tr>
            ) : null}

            {!loading && filteredRows.map((shift) => {
              const isFull = Number(shift.maxStaff || 0) > 0 && Number(shift.assignedCount || 0) >= Number(shift.maxStaff || 0)
              const canRegister = !shift.isRegistered && shift.allowRegistration && !isFull && !['DONE', 'CANCELLED'].includes(String(shift.status || '').toUpperCase())

              return (
                <tr key={shift.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70">
                  <td className="px-4 py-3 text-sm font-semibold text-indigo-600">{shift.code}</td>
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">{shift.name}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{shift.workDate}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{shift.startTime} - {shift.endTime}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{shift.assignedCount}/{shift.maxStaff}</td>
                  <td className="px-4 py-3"><ShiftStatusBadge status={shift.status} /></td>
                  <td className="px-4 py-3"><ShiftRegistrationBadge allowRegistration={shift.allowRegistration} /></td>
                  <td className="px-4 py-3">
                    {shift.isRegistered ? (
                      <button
                        type="button"
                        onClick={() => handleUnregister(shift)}
                        className="rounded-md border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50"
                      >
                        Hủy đăng ký
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={!canRegister}
                        onClick={() => handleRegister(shift)}
                        className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                          canRegister
                            ? 'border border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                            : 'cursor-not-allowed border border-slate-200 text-slate-400'
                        }`}
                      >
                        Đăng ký
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
