import { useEffect, useMemo, useState } from 'react'
import {
  Bell,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  Info,
  User,
} from 'lucide-react'
import { getAlertsApi, updateAlertStatusApi } from '../../services/alert.service'
import { cn } from '../../utils/ui.utils'

const LIMIT = 10
const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'New', label: 'Mới' },
  { value: 'Seen', label: 'Đã xem' },
  { value: 'Done', label: 'Đã xử lý' },
]

const typeLabelMap = {
  PickupSoon: 'Sắp đến giờ lấy đồ',
  ReturnSoon: 'Sắp đến giờ trả đồ',
  Late: 'Trễ hạn',
  NoShow: 'Khách không đến',
  Compensation: 'Bồi thường',
  Task: 'Công việc',
}

const statusStyleMap = {
  New: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Seen: 'bg-amber-50 text-amber-700 border-amber-200',
  Done: 'bg-slate-100 text-slate-700 border-slate-200',
}

const formatDateTime = (value) => {
  if (!value) return 'N/A'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'N/A'
  return parsed.toLocaleString('vi-VN')
}

const getActorLabel = (actor, actorRole) => {
  const name = actor?.name || actor?.email || ''
  if (!name) return actorRole ? `Tài khoản ${actorRole}` : 'Hệ thống'
  return actorRole ? `${name} (${actorRole})` : name
}

export default function AlertsList() {
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pagination, setPagination] = useState({ page: 1, limit: LIMIT, total: 0, pages: 1 })
  const [updatingId, setUpdatingId] = useState('')
  const [expandedId, setExpandedId] = useState('')

  const fetchAlerts = async ({ page = currentPage, status = statusFilter } = {}) => {
    try {
      setLoading(true)
      setError('')
      const response = await getAlertsApi({ page, limit: LIMIT, status: status || undefined })
      setAlerts(Array.isArray(response?.data) ? response.data : [])
      setPagination(response?.pagination || { page: 1, limit: LIMIT, total: 0, pages: 1 })
      setCurrentPage(Number(response?.pagination?.page || page || 1))
    } catch (apiError) {
      setError(apiError?.response?.data?.message || 'Không thể tải danh sách thông báo')
      setAlerts([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAlerts({ page: 1, status: statusFilter })
  }, [statusFilter])

  const totalPages = Math.max(1, Number(pagination?.pages || 1))

  const newCount = useMemo(() => alerts.filter((item) => item?.status === 'New').length, [alerts])

  const handleUpdateStatus = async (alertId, nextStatus) => {
    try {
      setUpdatingId(alertId)
      setError('')
      await updateAlertStatusApi(alertId, nextStatus)
      await fetchAlerts({ page: currentPage, status: statusFilter })
    } catch (apiError) {
      setError(apiError?.response?.data?.message || 'Không thể cập nhật trạng thái thông báo')
    } finally {
      setUpdatingId('')
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-[#1975d2]/10 p-2 rounded-lg text-[#1975d2]">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-slate-900">Ghi nhận hoạt động thông báo</h2>
            <p className="text-xs text-slate-500">Theo dõi tài khoản đã tạo và xử lý từng thông báo</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
            Mới: {newCount}
          </span>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value || 'all'} value={option.value}>{option.label}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => fetchAlerts({ page: currentPage, status: statusFilter })}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Làm mới
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">Đang tải thông báo...</div>
      ) : null}

      {!loading && alerts.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          Không có thông báo nào phù hợp.
        </div>
      ) : null}

      {!loading ? (
        <div className="space-y-4">
          {alerts.map((alert) => {
            const status = alert?.status || 'New'
            const activityLogs = Array.isArray(alert?.activityLogs) ? alert.activityLogs : []
            const isExpanded = expandedId === alert?._id
            return (
              <article key={alert?._id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                        {typeLabelMap[alert?.type] || alert?.type || 'Thông báo'}
                      </span>
                      <span className={cn('rounded-full border px-2.5 py-1 text-xs font-semibold', statusStyleMap[status] || statusStyleMap.New)}>
                        {status}
                      </span>
                      {alert?.actionRequired ? (
                        <span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">Cần xử lý</span>
                      ) : null}
                    </div>

                    <p className="text-sm text-slate-800">{alert?.message || 'Không có nội dung thông báo'}</p>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <Clock3 className="h-3.5 w-3.5" />
                        Tạo lúc: {formatDateTime(alert?.createdAt)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <User className="h-3.5 w-3.5" />
                        Tài khoản tạo: {getActorLabel(alert?.createdBy, alert?.createdBy?.role)}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {status !== 'Seen' ? (
                      <button
                        type="button"
                        disabled={updatingId === alert?._id}
                        onClick={() => handleUpdateStatus(alert?._id, 'Seen')}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Đánh dấu đã xem
                      </button>
                    ) : null}
                    {status !== 'Done' ? (
                      <button
                        type="button"
                        disabled={updatingId === alert?._id}
                        onClick={() => handleUpdateStatus(alert?._id, 'Done')}
                        className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Đánh dấu đã xử lý
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? '' : alert?._id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <Info className="h-3.5 w-3.5" />
                      {isExpanded ? 'Ẩn nhật ký' : 'Xem nhật ký'}
                    </button>
                  </div>
                </div>

                {isExpanded ? (
                  <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Lịch sử hoạt động</p>
                    {activityLogs.length === 0 ? (
                      <p className="text-sm text-slate-500">Chưa có ghi nhận hoạt động.</p>
                    ) : (
                      <div className="space-y-2">
                        {activityLogs
                          .slice()
                          .sort((a, b) => new Date(b?.at || 0).getTime() - new Date(a?.at || 0).getTime())
                          .map((log, index) => (
                            <div key={`${alert?._id}-log-${index}`} className="rounded-md bg-white border border-slate-200 px-3 py-2">
                              <p className="text-xs font-semibold text-slate-700">
                                {log?.action || 'ACTION'} - {formatDateTime(log?.at)}
                              </p>
                              <p className="mt-1 text-sm text-slate-600">{log?.note || 'Không có ghi chú'}</p>
                              <p className="mt-1 text-xs text-slate-500">
                                Tài khoản: {getActorLabel(log?.actor, log?.actorRole)}
                                {log?.fromStatus || log?.toStatus ? ` | Trạng thái: ${log?.fromStatus || 'N/A'} -> ${log?.toStatus || 'N/A'}` : ''}
                              </p>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                ) : null}
              </article>
            )
          })}
        </div>
      ) : null}

      {!loading ? (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <p className="text-sm text-slate-600">
            Hiển thị trang {currentPage}/{totalPages} - Tổng {pagination?.total || 0} thông báo
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50"
              onClick={() => fetchAlerts({ page: Math.max(1, currentPage - 1), status: statusFilter })}
              disabled={currentPage <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50"
              onClick={() => fetchAlerts({ page: Math.min(totalPages, currentPage + 1), status: statusFilter })}
              disabled={currentPage >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
