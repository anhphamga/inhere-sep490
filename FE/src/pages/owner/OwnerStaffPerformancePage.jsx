import { useMemo, useState } from 'react'
import { Calendar, RefreshCw, TrendingUp } from 'lucide-react'
import { useStaffPerformance } from '../../hooks/useStaffPerformance'

const KPI_THRESHOLD = 2000 // đồng/giờ

const formatCurrency = (value) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value || 0)
}

const formatNumber = (value) => {
  return new Intl.NumberFormat('vi-VN').format(Math.round(value || 0))
}

const getDateRange = () => {
  const today = new Date()
  const endDate = today.toISOString().split('T')[0]
  const startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0]
  return { startDate, endDate }
}

export default function OwnerStaffPerformancePage() {
  const [dateRange, setDateRange] = useState(getDateRange())

  const { data, kpis, loading, error, refetch } = useStaffPerformance({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    threshold: KPI_THRESHOLD,
  })

  const handleDateChange = (e) => {
    const { name, value } = e.target
    setDateRange((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleRefresh = async () => {
    await refetch()
  }

  // KPI Cards
  const KpiCard = ({ title, value, subtitle, icon: Icon }) => (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {title}
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
          {subtitle && (
            <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
          )}
        </div>
        {Icon && (
          <div className="ml-3 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
            <Icon className="h-5 w-5 text-blue-600" />
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Hiệu suất nhân viên</h1>
        <p className="mt-1 text-sm text-slate-600">
          Mô tả: Theo dõi hiệu quả làm việc theo ca
        </p>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-4 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="block text-xs font-medium text-slate-700">
            Từ ngày
          </label>
          <input
            type="date"
            name="startDate"
            value={dateRange.startDate}
            onChange={handleDateChange}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div className="flex-1">
          <label className="block text-xs font-medium text-slate-700">
            Đến ngày
          </label>
          <input
            type="date"
            name="endDate"
            value={dateRange.endDate}
            onChange={handleDateChange}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
          />
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-wait disabled:opacity-50"
        >
          <RefreshCw className="h-4 w-4" />
          Làm mới
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard
          title="Tổng nhân viên"
          value={formatNumber(kpis.totalStaff)}
          icon={null}
        />
        <KpiCard
          title="Tổng doanh thu"
          value={formatCurrency(kpis.totalRevenue)}
          subtitle="Cả bán + cho thuê"
          icon={TrendingUp}
        />
        <KpiCard
          title="Tổng đơn"
          value={formatNumber(kpis.totalOrders)}
          subtitle="Hoàn tất"
          icon={null}
        />
        <KpiCard
          title="Tổng giờ làm"
          value={formatNumber(kpis.totalHours)}
          subtitle="Giờ"
          icon={Calendar}
        />
        <KpiCard
          title="TB / giờ"
          value={formatCurrency(kpis.avgRevenuePerHour)}
          subtitle="Doanh thu trung bình"
          icon={null}
        />
      </div>

      {/* Main Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                Xếp hạng
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                Nhân viên
              </th>
              <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-600">
                Số ca
              </th>
              <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-600">
                Giờ làm
              </th>
              <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-600">
                Số đơn
              </th>
              <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-600">
                Doanh thu
              </th>
              <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-600">
                TB / ca
              </th>
              <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-600">
                TB / giờ
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                Trạng thái
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-sm text-slate-500">
                  Đang tải dữ liệu...
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-sm text-slate-500">
                  Không có dữ liệu
                </td>
              </tr>
            ) : (
              data.map((staff) => (
                <tr key={staff.staffId} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-center text-lg font-bold text-slate-900">
                    {staff.rankMedal || `${staff.rank}`}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">
                    {staff.staffName}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-slate-700">
                    {formatNumber(staff.totalShifts)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-slate-700">
                    {staff.totalHours.toFixed(1)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-slate-700">
                    {formatNumber(staff.totalOrders)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900">
                    {formatCurrency(staff.totalRevenue)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-slate-700">
                    {formatCurrency(staff.avgRevenuePerShift)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-slate-700">
                    {formatCurrency(staff.avgRevenuePerHour)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${
                        staff.avgRevenuePerHour > KPI_THRESHOLD
                          ? 'bg-green-100 text-green-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {staff.performanceLevel}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Summary Stats */}
      {!loading && data.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-600">
              Người dẫn đầu
            </h3>
            <p className="mt-2 text-lg font-bold text-slate-900">
              {data[0]?.staffName || 'N/A'}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {formatCurrency(data[0]?.totalRevenue || 0)}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-600">
              Nhân viên với hiệu suất cao nhất
            </h3>
            <p className="mt-2 text-lg font-bold text-slate-900">
              {
                data.reduce(
                  (best, curr) =>
                    (curr.avgRevenuePerHour || 0) > (best.avgRevenuePerHour || 0)
                      ? curr
                      : best,
                  data[0] || {}
                )?.staffName
              }
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {formatCurrency(
                Math.max(...data.map((s) => s.avgRevenuePerHour || 0))
              )}/giờ
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-600">
              Hiệu suất cao
            </h3>
            <p className="mt-2 text-lg font-bold text-slate-900">
              {data.filter((s) => s.avgRevenuePerHour > KPI_THRESHOLD).length}/{data.length}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Nhân viên vượt ngưỡng
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
