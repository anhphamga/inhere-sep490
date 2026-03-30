import { useCallback, useEffect, useMemo, useState } from 'react'
import { Eye, Lock, LockOpen, Plus, RefreshCcw, SquarePen, Trash2 } from 'lucide-react'
import ShiftFormModal from '../../components/shifts/ShiftFormModal'
import ShiftDetailModal from '../../components/shifts/ShiftDetailModal'
import { ShiftRegistrationBadge, ShiftStatusBadge } from '../../components/shifts/ShiftStatusBadge'
import { STATUS_FILTER_OPTIONS, REGISTRATION_FILTER_OPTIONS, SHIFT_STATUS } from '../../constants/shiftStatus'
import {
  createOwnerShiftApi,
  deleteOwnerShiftApi,
  getOwnerShiftsApi,
  getOwnerStaffApi,
  updateOwnerShiftApi,
} from '../../services/owner.service'

const formatToday = () => new Date().toISOString().slice(0, 10)
const formatShiftTime = (shift) => `${shift.startTime} - ${shift.endTime}`
const makeShiftCode = (index, dateStr) => `CA_${index}_${dateStr.replaceAll('-', '_')}`

const toDateString = (value) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 10)
}

const toTimeString = (value) => {
  if (!value) return ''
  if (/^\d{2}:\d{2}$/.test(String(value))) return String(value)
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(11, 16)
}

const normalizeStatusWithCapacity = (shift) => {
  if (shift.status === SHIFT_STATUS.DONE || shift.status === SHIFT_STATUS.CANCELLED) return shift.status
  if (Number(shift.assignedCount || 0) >= Number(shift.maxStaff || 0)) return SHIFT_STATUS.FULL
  if (!shift.allowRegistration) return SHIFT_STATUS.LOCKED
  return SHIFT_STATUS.OPEN
}

const toApiPayload = (payload) => {
  const workDate = payload.workDate
  const startTime = payload.startTime
  const endTime = payload.endTime
  return {
    code: payload.code,
    name: payload.name,
    title: payload.name,
    workDate,
    startTime,
    endTime,
    startAt: `${workDate}T${startTime}:00`,
    endAt: `${workDate}T${endTime}:00`,
    maxStaff: Number(payload.maxStaff || 1),
    assignedCount: Number(payload.assignedCount || 0),
    status: payload.status,
    allowRegistration: payload.allowRegistration,
    note: payload.notes || '',
    notes: payload.notes || '',
  }
}

export default function ShiftManagementPage() {
  const [shifts, setShifts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [keyword, setKeyword] = useState('')
  const [workDateFilter, setWorkDateFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [registrationFilter, setRegistrationFilter] = useState('ALL')
  const [notice, setNotice] = useState('')

  const [formOpen, setFormOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [editingShift, setEditingShift] = useState(null)
  const [viewingShift, setViewingShift] = useState(null)

  const loadShifts = useCallback(async () => {
    try {
      setLoading(true)
      setError('')

      const [staffRes, shiftsRes] = await Promise.all([
        getOwnerStaffApi({ limit: 200 }),
        getOwnerShiftsApi({}),
      ])

      const staffRows = Array.isArray(staffRes?.data) ? staffRes.data : []
      const staffMap = staffRows.reduce((acc, staff) => {
        const key = String(staff.id || staff._id || '')
        if (key) acc[key] = staff
        return acc
      }, {})

      const rows = Array.isArray(shiftsRes?.data) ? shiftsRes.data : []
      const mapped = rows.map((item, index) => {
        const staffIds = Array.isArray(item.staffIds) ? item.staffIds : []
        const staffMembers = staffIds
          .map((staffId) => {
            const normalizedId = String(staffId?._id || staffId || '')
            const staff = staffMap[normalizedId]
            if (!staff) return null
            return {
              id: normalizedId,
              name: staff.name || 'Nhân viên',
              phone: staff.phone || '',
            }
          })
          .filter(Boolean)

        const workDate = item.workDate || toDateString(item.startAt)
        const startTime = item.startTime || toTimeString(item.startAt)
        const endTime = item.endTime || toTimeString(item.endAt)
        const maxStaff = Number(item.maxStaff || 0) > 0 ? Number(item.maxStaff) : Math.max(staffIds.length, 3)
        const assignedCount = Number(item.assignedCount || staffIds.length)

        return {
          id: String(item.id || item._id || `shift-${index}`),
          code: item.code || makeShiftCode(index + 1, workDate || formatToday()),
          name: item.name || item.title || 'Ca làm',
          workDate: workDate || formatToday(),
          startTime: startTime || '08:30',
          endTime: endTime || '16:30',
          maxStaff,
          assignedCount,
          status: item.status || SHIFT_STATUS.OPEN,
          allowRegistration: item.allowRegistration !== false,
          notes: item.notes || item.note || '',
          staffMembers,
        }
      })

      setShifts(mapped)
    } catch (apiError) {
      setError(apiError?.response?.data?.message || apiError?.message || 'Không thể tải danh sách ca làm')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadShifts()
  }, [loadShifts])

  const filteredShifts = useMemo(() => {
    const q = keyword.trim().toLowerCase()
    return shifts.filter((shift) => {
      const byKeyword = !q || shift.name.toLowerCase().includes(q) || shift.code.toLowerCase().includes(q)
      const byDate = !workDateFilter || shift.workDate === workDateFilter
      const byStatus = statusFilter === 'ALL' || normalizeStatusWithCapacity(shift) === statusFilter
      const byRegistration = registrationFilter === 'ALL'
        || (registrationFilter === 'ALLOW' && shift.allowRegistration)
        || (registrationFilter === 'BLOCK' && !shift.allowRegistration)
      return byKeyword && byDate && byStatus && byRegistration
    })
  }, [keyword, registrationFilter, shifts, statusFilter, workDateFilter])

  const stats = useMemo(() => {
    const today = formatToday()
    const todayShifts = shifts.filter((item) => item.workDate === today)
    const openCount = shifts.filter((item) => normalizeStatusWithCapacity(item) === SHIFT_STATUS.OPEN).length
    const fullCount = shifts.filter((item) => normalizeStatusWithCapacity(item) === SHIFT_STATUS.FULL).length
    const lockedCount = shifts.filter((item) => normalizeStatusWithCapacity(item) === SHIFT_STATUS.LOCKED).length
    return [
      { label: 'Tổng số ca hôm nay', value: todayShifts.length, tone: 'text-slate-900' },
      { label: 'Ca đang mở đăng ký', value: openCount, tone: 'text-emerald-600' },
      { label: 'Ca đã đầy', value: fullCount, tone: 'text-blue-600' },
      { label: 'Ca đã khóa', value: lockedCount, tone: 'text-amber-600' },
    ]
  }, [shifts])

  const openCreateModal = () => {
    setEditingShift(null)
    setFormOpen(true)
  }

  const handleCreateOrUpdate = async (payload) => {
    try {
      setError('')
      if (editingShift) {
        await updateOwnerShiftApi(editingShift.id, toApiPayload(payload))
        setNotice('Đã cập nhật ca làm thành công')
      } else {
        const duplicated = shifts.some((item) => item.code === payload.code)
        if (duplicated) {
          setNotice('Mã ca đã tồn tại, vui lòng chọn mã khác')
          return
        }
        await createOwnerShiftApi(toApiPayload(payload))
        setNotice('Đã tạo ca làm mới')
      }

      setFormOpen(false)
      setEditingShift(null)
      await loadShifts()
    } catch (apiError) {
      setError(apiError?.response?.data?.message || apiError?.message || 'Không thể lưu ca làm')
    }
  }

  const handleEdit = (shift) => {
    setEditingShift(shift)
    setFormOpen(true)
  }

  const handleView = (shift) => {
    setViewingShift(shift)
    setDetailOpen(true)
  }

  const handleDelete = async (shift) => {
    if (!window.confirm(`Bạn có chắc muốn xóa ca ${shift.code}?`)) return
    try {
      await deleteOwnerShiftApi(shift.id)
      setNotice('Đã xóa ca làm')
      await loadShifts()
    } catch (apiError) {
      setError(apiError?.response?.data?.message || apiError?.message || 'Không thể xóa ca làm')
    }
  }

  const handleToggleRegistration = async (shift) => {
    try {
      const next = { ...shift, allowRegistration: !shift.allowRegistration }
      next.status = normalizeStatusWithCapacity(next)
      await updateOwnerShiftApi(shift.id, toApiPayload(next))
      setNotice(shift.allowRegistration ? 'Đã tạm khóa đăng ký ca' : 'Đã mở đăng ký ca')
      await loadShifts()
    } catch (apiError) {
      setError(apiError?.response?.data?.message || apiError?.message || 'Không thể cập nhật trạng thái đăng ký')
    }
  }

  const handleMarkDone = async (shift) => {
    try {
      const next = { ...shift, status: SHIFT_STATUS.DONE, allowRegistration: false }
      await updateOwnerShiftApi(shift.id, toApiPayload(next))
      setNotice('Đã đánh dấu ca làm hoàn tất')
      await loadShifts()
    } catch (apiError) {
      setError(apiError?.response?.data?.message || apiError?.message || 'Không thể cập nhật ca làm')
    }
  }

  const handleQuickCreate = async () => {
    const targetDate = workDateFilter || formatToday()
    const quickShifts = [
      { index: 1, name: 'Ca 1', startTime: '08:30', endTime: '16:30' },
      { index: 2, name: 'Ca 2', startTime: '14:30', endTime: '22:30' },
    ]

    const existingCodes = new Set(shifts.map((item) => item.code))
    const payloads = quickShifts
      .map((template) => {
        const code = makeShiftCode(template.index, targetDate)
        if (existingCodes.has(code)) return null
        return {
          code,
          name: template.name,
          workDate: targetDate,
          startTime: template.startTime,
          endTime: template.endTime,
          maxStaff: 3,
          assignedCount: 0,
          status: SHIFT_STATUS.OPEN,
          allowRegistration: true,
          notes: 'Tạo nhanh từ mẫu mặc định',
        }
      })
      .filter(Boolean)

    if (payloads.length === 0) {
      setNotice('Đã tồn tại đủ 2 ca mặc định cho ngày đã chọn')
      return
    }

    try {
      await Promise.all(payloads.map((item) => createOwnerShiftApi(toApiPayload(item))))
      setNotice(`Đã tạo nhanh ${payloads.length} ca mặc định`)
      await loadShifts()
    } catch (apiError) {
      setError(apiError?.response?.data?.message || apiError?.message || 'Không thể tạo nhanh ca mặc định')
    }
  }

  const clearNotice = () => setNotice('')

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 md:flex-row md:items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Quản lý ca làm</h2>
          <p className="mt-1 text-sm text-slate-600">Theo dõi, tạo mới và điều phối ca làm cho nhân viên cửa hàng</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-lg bg-[#1975d2] px-4 py-2 text-sm font-semibold text-white hover:bg-[#155ea8]"
          >
            <Plus className="h-4 w-4" />
            Tạo ca mới
          </button>
          <button
            type="button"
            onClick={handleQuickCreate}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCcw className="h-4 w-4" />
            Tạo nhanh 2 ca mặc định
          </button>
        </div>
      </header>

      {notice ? (
        <div className="flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          <span>{notice}</span>
          <button type="button" onClick={clearNotice} className="font-semibold hover:underline">
            Đóng
          </button>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => (
          <article key={item.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{item.label}</p>
            <p className={`mt-2 text-3xl font-bold ${item.tone}`}>{item.value}</p>
          </article>
        ))}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-4">
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Tìm theo tên ca hoặc mã ca..."
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1975d2]/30"
          />
          <input
            type="date"
            value={workDateFilter}
            onChange={(e) => setWorkDateFilter(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1975d2]/30"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1975d2]/30"
          >
            {STATUS_FILTER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            value={registrationFilter}
            onChange={(e) => setRegistrationFilter(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1975d2]/30"
          >
            {REGISTRATION_FILTER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-600">Đang tải danh sách ca làm...</div>
      ) : filteredShifts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <h3 className="text-xl font-bold text-slate-900">Chưa có ca làm nào</h3>
          <p className="mx-auto mt-2 max-w-xl text-sm text-slate-600">
            Hãy tạo ca đầu tiên để bắt đầu quản lý lịch làm việc nhân viên
          </p>
          <button
            type="button"
            onClick={openCreateModal}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#1975d2] px-4 py-2 text-sm font-semibold text-white hover:bg-[#155ea8]"
          >
            <Plus className="h-4 w-4" />
            Tạo ca mới
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[1120px] border-collapse text-left">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200">
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Mã ca</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Tên ca</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Ngày làm</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Giờ làm</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Số lượng nhân viên</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Trạng thái</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Đăng ký</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Ghi chú</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredShifts.map((shift) => (
                <tr key={shift.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70">
                  <td className="px-4 py-3 text-sm font-semibold text-[#1975d2]">{shift.code}</td>
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">{shift.name}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{shift.workDate}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{formatShiftTime(shift)}</td>
                  <td className="px-4 py-3 text-sm font-medium text-slate-800">{shift.assignedCount}/{shift.maxStaff}</td>
                  <td className="px-4 py-3"><ShiftStatusBadge status={normalizeStatusWithCapacity(shift)} /></td>
                  <td className="px-4 py-3"><ShiftRegistrationBadge allowRegistration={shift.allowRegistration} /></td>
                  <td className="max-w-[220px] px-4 py-3 text-sm text-slate-600">{shift.notes || 'Không có ghi chú'}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      <button type="button" onClick={() => handleView(shift)} className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                        <span className="inline-flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> Xem</span>
                      </button>
                      <button type="button" onClick={() => handleEdit(shift)} className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                        <span className="inline-flex items-center gap-1"><SquarePen className="h-3.5 w-3.5" /> Sửa</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleRegistration(shift)}
                        className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        <span className="inline-flex items-center gap-1">
                          {shift.allowRegistration ? <Lock className="h-3.5 w-3.5" /> : <LockOpen className="h-3.5 w-3.5" />}
                          {shift.allowRegistration ? 'Khóa đăng ký' : 'Mở đăng ký'}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMarkDone(shift)}
                        className="rounded-md border border-emerald-200 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
                      >
                        Hoàn tất
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(shift)}
                        className="rounded-md border border-rose-200 px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50"
                      >
                        <span className="inline-flex items-center gap-1"><Trash2 className="h-3.5 w-3.5" /> Xóa</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ShiftFormModal
        open={formOpen}
        mode={editingShift ? 'edit' : 'create'}
        initialData={editingShift}
        onClose={() => {
          setFormOpen(false)
          setEditingShift(null)
        }}
        onSubmit={handleCreateOrUpdate}
      />

      <ShiftDetailModal
        open={detailOpen}
        shift={viewingShift}
        onClose={() => {
          setDetailOpen(false)
          setViewingShift(null)
        }}
      />
    </div>
  )
}
