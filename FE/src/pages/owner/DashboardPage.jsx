import { useCallback, useEffect, useMemo, useState } from 'react'
import { BadgePercent, ShoppingCart, TrendingUp, UserPlus } from 'lucide-react'
import DashboardFilter from '../../components/dashboard/DashboardFilter'
import RevenueChart from '../../components/dashboard/RevenueChart'
import StatsCard from '../../components/dashboard/StatsCard'
import {
  getOwnerDashboardApi,
  getOwnerInventoryAlertsApi,
  getOwnerRestockSuggestionsApi,
  getOwnerTopProductsSummaryApi
} from '../../services/owner.service'
import { useAuth } from '../../hooks/useAuth'
import { normalizeRole } from '../../utils/auth'
import { currencyFormatter, numberFormatter, toArray } from '../../utils/owner.utils'

const toDateInput = (value) => {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 10)
}

const addDays = (value, days) => {
  const date = new Date(value)
  date.setDate(date.getDate() + days)
  return date
}

const resolveRangeFromPreset = (preset) => {
  const now = new Date()
  const to = toDateInput(now)
  if (preset === 'today') return { from: to, to, preset }
  if (preset === '30days') return { from: toDateInput(addDays(now, -29)), to, preset }
  return { from: toDateInput(addDays(now, -6)), to, preset: '7days' }
}

const unwrapApiData = (value) => value?.data ?? value ?? {}

const getPercentChange = (current, previous) => {
  const cur = Number(current || 0)
  const prev = Number(previous || 0)
  if (!Number.isFinite(cur) || !Number.isFinite(prev) || prev === 0) return 0
  return Number((((cur - prev) / prev) * 100).toFixed(1))
}

const toChartSeries = (rows) => {
  return toArray(rows).map((row) => {
    const dateText = String(row?.date || row?.period || '')
    const fallback = dateText || 'N/A'
    const date = new Date(dateText)
    return {
      day: Number.isNaN(date.getTime())
        ? fallback
        : date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
      revenue: Number(row?.revenue || 0)
    }
  })
}

const DashboardSkeleton = () => (
  <div className="space-y-4">
    <div className="h-24 animate-pulse rounded-2xl border border-slate-200 bg-slate-100" />
    <div className="grid grid-cols-12 gap-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="col-span-12 h-32 animate-pulse rounded-2xl border border-slate-200 bg-slate-100 sm:col-span-6 xl:col-span-3" />
      ))}
    </div>
    <div className="h-96 animate-pulse rounded-2xl border border-slate-200 bg-slate-100" />
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-12 h-72 animate-pulse rounded-2xl border border-slate-200 bg-slate-100 lg:col-span-6" />
      <div className="col-span-12 h-72 animate-pulse rounded-2xl border border-slate-200 bg-slate-100 lg:col-span-6" />
    </div>
  </div>
)

const DashboardPage = () => {
  const { loading: authLoading, isAuthenticated, user } = useAuth()
  const isOwner = normalizeRole(user?.role) === 'owner'

  const [dateRange, setDateRange] = useState(() => resolveRangeFromPreset('7days'))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dashboardData, setDashboardData] = useState({
    summary: {
      revenue: 0,
      orders: 0,
      newCustomers: 0,
      conversionRate: 0
    },
    trends: {
      revenue: 0,
      orders: 0,
      newCustomers: 0,
      conversionRate: 0
    },
    revenueByDate: [],
    topProducts: {
      topSaleProducts: [],
      topRentProducts: []
    },
    inventoryAlerts: {
      lowStock: [],
      outOfStock: []
    },
    restockSuggestions: []
  })

  const updateDateRange = useCallback((next) => {
    const preset = next?.preset || '7days'
    if (preset !== 'custom') {
      setDateRange(resolveRangeFromPreset(preset))
      return
    }

    setDateRange((prev) => ({
      from: next?.from ?? prev.from,
      to: next?.to ?? prev.to,
      preset: 'custom'
    }))
  }, [])

  const loadDashboard = useCallback(async () => {
    if (!isAuthenticated || !isOwner) {
      setLoading(false)
      return
    }

    const from = dateRange.from
    const to = dateRange.to
    if (!from || !to) return

    setLoading(true)
    setError('')

    const currentFromDate = new Date(from)
    const currentToDate = new Date(to)
    const dayDiff = Math.max(
      1,
      Math.ceil((currentToDate.getTime() - currentFromDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
    )
    const previousTo = toDateInput(addDays(currentFromDate, -1))
    const previousFrom = toDateInput(addDays(new Date(previousTo), -(dayDiff - 1)))

    const responses = await Promise.allSettled([
      getOwnerDashboardApi({ from, to }),
      getOwnerDashboardApi({ from: previousFrom, to: previousTo }),
      getOwnerTopProductsSummaryApi(),
      getOwnerInventoryAlertsApi(),
      getOwnerRestockSuggestionsApi({ limit: 10 })
    ])

    const [currentRes, previousRes, topProductsRes, inventoryAlertsRes, restockRes] = responses

    const currentData = currentRes.status === 'fulfilled' ? unwrapApiData(currentRes.value) : {}
    const previousData = previousRes.status === 'fulfilled' ? unwrapApiData(previousRes.value) : {}
    const topProducts = topProductsRes.status === 'fulfilled'
      ? unwrapApiData(topProductsRes.value)
      : { topSaleProducts: [], topRentProducts: [] }
    const inventoryAlerts = inventoryAlertsRes.status === 'fulfilled'
      ? unwrapApiData(inventoryAlertsRes.value)
      : { lowStock: [], outOfStock: [] }
    const restockSuggestions = restockRes.status === 'fulfilled'
      ? toArray(unwrapApiData(restockRes.value))
      : []

    setDashboardData({
      summary: {
        revenue: Number(currentData.revenue || 0),
        orders: Number(currentData.orders || 0),
        newCustomers: Number(currentData.newCustomers || 0),
        conversionRate: Number(currentData.conversionRate || 0)
      },
      trends: {
        revenue: getPercentChange(currentData.revenue, previousData.revenue),
        orders: getPercentChange(currentData.orders, previousData.orders),
        newCustomers: getPercentChange(currentData.newCustomers, previousData.newCustomers),
        conversionRate: Number((Number(currentData.conversionRate || 0) - Number(previousData.conversionRate || 0)).toFixed(1))
      },
      revenueByDate: toArray(currentData.revenueByDate),
      topProducts,
      inventoryAlerts: {
        lowStock: toArray(inventoryAlerts.lowStock),
        outOfStock: toArray(inventoryAlerts.outOfStock)
      },
      restockSuggestions
    })

    if (responses.some((item) => item.status === 'rejected')) {
      setError('Một số dữ liệu chưa tải được đầy đủ. Hệ thống đang hiển thị phần khả dụng.')
    }

    setLoading(false)
  }, [dateRange.from, dateRange.to, isAuthenticated, isOwner])

  useEffect(() => {
    if (authLoading) return
    loadDashboard()
  }, [authLoading, loadDashboard])

  const kpis = useMemo(() => ([
    {
      title: 'Doanh thu',
      value: currencyFormatter.format(dashboardData.summary.revenue),
      trend: dashboardData.trends.revenue,
      subtitle: 'so với kỳ trước',
      icon: TrendingUp
    },
    {
      title: 'Đơn hàng',
      value: numberFormatter.format(dashboardData.summary.orders),
      trend: dashboardData.trends.orders,
      subtitle: 'đơn trong kỳ',
      icon: ShoppingCart
    },
    {
      title: 'Khách mới',
      value: numberFormatter.format(dashboardData.summary.newCustomers),
      trend: dashboardData.trends.newCustomers,
      subtitle: 'khách hàng mới',
      icon: UserPlus
    },
    {
      title: 'Tỷ lệ chuyển đổi',
      value: `${Number(dashboardData.summary.conversionRate || 0).toFixed(1)}%`,
      trend: dashboardData.trends.conversionRate,
      subtitle: 'chênh lệch kỳ trước',
      icon: BadgePercent
    }
  ]), [dashboardData.summary, dashboardData.trends])

  const chartData = useMemo(() => toChartSeries(dashboardData.revenueByDate), [dashboardData.revenueByDate])
  const topSaleProducts = useMemo(() => toArray(dashboardData.topProducts.topSaleProducts).slice(0, 5), [dashboardData.topProducts])
  const topRentProducts = useMemo(() => toArray(dashboardData.topProducts.topRentProducts).slice(0, 5), [dashboardData.topProducts])
  const lowStockProducts = useMemo(() => toArray(dashboardData.inventoryAlerts.lowStock).slice(0, 5), [dashboardData.inventoryAlerts])
  const outOfStockProducts = useMemo(() => toArray(dashboardData.inventoryAlerts.outOfStock).slice(0, 5), [dashboardData.inventoryAlerts])
  const restockSuggestions = useMemo(() => toArray(dashboardData.restockSuggestions).slice(0, 5), [dashboardData.restockSuggestions])

  if (loading) return <DashboardSkeleton />

  return (
    <div className="space-y-4">
      <DashboardFilter value={dateRange} onChange={updateDateRange} />

      {error ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          {error}
        </section>
      ) : null}

      <section className="grid grid-cols-12 gap-4">
        {kpis.map((item) => (
          <div key={item.title} className="col-span-12 sm:col-span-6 xl:col-span-3">
            <StatsCard
              title={item.title}
              value={item.value}
              trend={item.trend}
              subtitle={item.subtitle}
              icon={item.icon}
            />
          </div>
        ))}
      </section>

      <section className="grid grid-cols-12 gap-4">
        <div className="col-span-12">
          <RevenueChart
            data={chartData}
            title="Doanh thu theo ngày"
            subtitle={`Từ ${dateRange.from || '-'} đến ${dateRange.to || '-'}`}
          />
        </div>
      </section>

      <section className="grid grid-cols-12 gap-4">
        <article className="col-span-12 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-6">
          <h3 className="text-lg font-semibold text-slate-900">Sản phẩm nổi bật</h3>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-slate-500">Bán chạy</p>
              <div className="mt-3 space-y-2">
                {topSaleProducts.length > 0 ? topSaleProducts.map((item) => (
                  <div key={`sale-${item.productId || item.name}`} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2">
                    <span className="truncate pr-3 text-sm text-slate-700">{item.name || 'Không rõ'}</span>
                    <span className="text-sm font-semibold text-slate-900">{numberFormatter.format(Number(item.totalSold || 0))}</span>
                  </div>
                )) : (
                  <p className="text-sm text-slate-500">Không có dữ liệu.</p>
                )}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-slate-500">Thuê nhiều</p>
              <div className="mt-3 space-y-2">
                {topRentProducts.length > 0 ? topRentProducts.map((item) => (
                  <div key={`rent-${item.productId || item.name}`} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2">
                    <span className="truncate pr-3 text-sm text-slate-700">{item.name || 'Không rõ'}</span>
                    <span className="text-sm font-semibold text-slate-900">{numberFormatter.format(Number(item.totalRented || 0))}</span>
                  </div>
                )) : (
                  <p className="text-sm text-slate-500">Không có dữ liệu.</p>
                )}
              </div>
            </div>
          </div>
        </article>

        <div className="col-span-12 space-y-4 lg:col-span-6">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">Cảnh báo kho</h3>
            <div className="mt-3 space-y-2">
              {outOfStockProducts.map((item) => (
                <div key={`out-${item.productId || item.name}`} className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2">
                  <p className="truncate text-sm font-medium text-rose-700">{item.name || 'Không rõ'}</p>
                  <p className="text-xs text-rose-600">Các sản phẩm hết hàng</p>
                </div>
              ))}

              {lowStockProducts.map((item) => (
                <div key={`low-${item.productId || item.name}`} className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
                  <p className="truncate text-sm font-medium text-amber-800">{item.name || 'Không rõ'}</p>
                  <p className="text-xs text-amber-700">Sắp hết: còn {numberFormatter.format(Number(item.quantity || 0))}</p>
                </div>
              ))}

              {outOfStockProducts.length === 0 && lowStockProducts.length === 0 ? (
                <p className="text-sm text-slate-500">Kho ổn định, chưa có cảnh báo.</p>
              ) : null}
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">Gợi ý nhập hàng</h3>
            <div className="mt-3 space-y-2">
              {restockSuggestions.length > 0 ? restockSuggestions.map((item) => (
                <div key={`restock-${item.productId || item.name}`} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                  <p className="truncate text-sm font-medium text-slate-800">{item.name || 'Không rõ'}</p>
                  <p className="text-xs text-slate-600">
                    Đã bán: {numberFormatter.format(Number(item.sold || 0))}
                    {' '}| Tồn kho: {numberFormatter.format(Number(item.currentStock || 0))}
                    {' '}| Đề xuất nhập: <span className="font-semibold text-slate-900">{numberFormatter.format(Number(item.suggestedImport || 0))}</span>
                  </p>
                </div>
              )) : (
                <p className="text-sm text-slate-500">Chưa có gợi ý nhập hàng.</p>
              )}
            </div>
          </article>
        </div>
      </section>
    </div>
  )
}

export default DashboardPage
