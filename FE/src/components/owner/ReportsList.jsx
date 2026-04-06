import { useEffect, useMemo, useState } from 'react'
import { Calendar, FileText, RefreshCw } from 'lucide-react'
import { getOwnerRevenueAnalyticsApi } from '../../services/owner.service'

const toArray = (value) => (Array.isArray(value) ? value : [])
const toNumber = (value) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const toPeriodLabel = (item) => (
  String(item?.label || item?.period || item?.date || item?.month || item?.name || '').trim()
)

const toRevenueValue = (item) => (
  toNumber(item?.total || item?.revenue || item?.amount || item?.value)
)

export default function ReportsList() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [rows, setRows] = useState([])

  const fetchReports = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await getOwnerRevenueAnalyticsApi({ period: 'month' })
      const source = response?.series || response?.data || response?.items || []
      setRows(toArray(source))
    } catch (apiError) {
      setError(apiError?.response?.data?.message || apiError?.message || 'Không thể tải báo cáo')
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReports()
  }, [])

  const reportRows = useMemo(() => {
    return rows
      .map((item, index) => ({
        id: String(item?._id || item?.id || `${index}`),
        period: toPeriodLabel(item) || `Kỳ ${index + 1}`,
        total: toRevenueValue(item),
        createdAt: item?.createdAt || item?.updatedAt || item?.date || null,
      }))
      .filter((item) => item.period)
  }, [rows])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-bold text-slate-900">Revenue Reports</h3>
        <button
          type="button"
          onClick={fetchReports}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw className="h-4 w-4" />
          Làm mới
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60">
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Kỳ báo cáo</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Doanh thu</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Mốc thời gian</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={3} className="px-6 py-6 text-sm text-slate-500">Đang tải dữ liệu...</td>
              </tr>
            ) : null}

            {!loading && reportRows.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-6 text-sm text-slate-500">
                  Chưa có dữ liệu báo cáo từ API.
                </td>
              </tr>
            ) : null}

            {!loading && reportRows.map((row) => (
              <tr key={row.id} className="hover:bg-slate-50/70">
                <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                  <span className="inline-flex items-center gap-2">
                    <FileText className="h-4 w-4 text-slate-400" />
                    {row.period}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm font-bold text-slate-800">{row.total.toLocaleString('vi-VN')}đ</td>
                <td className="px-6 py-4 text-sm text-slate-500">
                  <span className="inline-flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    {row.createdAt ? new Date(row.createdAt).toLocaleDateString('vi-VN') : 'N/A'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
