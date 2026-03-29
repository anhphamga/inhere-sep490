import { useCallback, useEffect, useMemo, useState } from 'react'
import { BadgePercent, ShoppingCart, TrendingUp, UserPlus } from 'lucide-react'
import AlertBox from '../../components/dashboard/AlertBox'
import OrderTable from '../../components/dashboard/OrderTable'
import RentalStatus from '../../components/dashboard/RentalStatus'
import RevenueChart from '../../components/dashboard/RevenueChart'
import StatsCard from '../../components/dashboard/StatsCard'
import {
  getOwnerCustomerStatsApi,
  getOwnerDashboardSummaryApi,
  getOwnerInventoryStatsApi,
  getOwnerOrdersApi,
  getOwnerRentalStatsApi,
  getOwnerRevenueAnalyticsApi
} from '../../services/owner.service'
import { currencyFormatter, numberFormatter, toArray } from '../../utils/owner.utils'

const unwrapApiData = (value) => value?.data ?? value ?? {}

const readPath = (obj, path) => {
  if (!obj || !path) return undefined
  return path.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), obj)
}

const readFirstNumber = (sources, paths, fallback = 0) => {
  for (const source of sources) {
    for (const path of paths) {
      const value = Number(readPath(source, path))
      if (Number.isFinite(value)) return value
    }
  }
  return fallback
}

const asPercent = (value) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 0
  return parsed <= 1 ? parsed * 100 : parsed
}

const getGrowth = (current, previous) => {
  const cur = Number(current)
  const prev = Number(previous)
  if (!Number.isFinite(cur) || !Number.isFinite(prev) || prev === 0) return 0
  return Number((((cur - prev) / prev) * 100).toFixed(1))
}

const formatDate = (value) => {
  if (!value) return 'N/A'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return String(value)
  return parsed.toLocaleDateString('vi-VN')
}

const formatDayLabel = (value) => {
  if (!value) return 'N/A'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return String(value)
  return parsed.toLocaleDateString('vi-VN', { weekday: 'short' })
}

const translateOrderStatus = (status) => {
  const normalized = String(status || '').toLowerCase()
  if (normalized.includes('late')) return 'Quá hạn'
  if (normalized.includes('renting') || normalized.includes('rented')) return 'Đang thuê'
  if (normalized.includes('return') || normalized.includes('completed') || normalized.includes('paid')) return 'Đã trả'
  if (normalized.includes('pending') || normalized.includes('confirm')) return 'Chờ xác nhận'
  return status || 'N/A'
}

const DashboardSkeleton = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="h-32 animate-pulse rounded-2xl border border-slate-200 bg-slate-100" />
      ))}
    </div>
    <div className="h-80 animate-pulse rounded-2xl border border-slate-200 bg-slate-100" />
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      <div className="h-80 animate-pulse rounded-2xl border border-slate-200 bg-slate-100 xl:col-span-2" />
      <div className="space-y-6">
        <div className="h-40 animate-pulse rounded-2xl border border-slate-200 bg-slate-100" />
        <div className="h-40 animate-pulse rounded-2xl border border-slate-200 bg-slate-100" />
      </div>
    </div>
  </div>
)

const DashboardPage = () => {
  const [dashboardData, setDashboardData] = useState({
    summary: {},
    customers: {},
    inventory: {},
    revenue: [],
    orders: [],
    rental: {}
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadDashboardData = useCallback(async () => {
    setLoading(true)
    setError('')

    const responses = await Promise.allSettled([
      getOwnerDashboardSummaryApi(),
      getOwnerCustomerStatsApi(),
      getOwnerInventoryStatsApi(),
      getOwnerRevenueAnalyticsApi({ period: 'month' }),
      getOwnerOrdersApi({ limit: 5 }),
      getOwnerRentalStatsApi({ period: 'week' })
    ])

    const [summaryRes, customerRes, inventoryRes, revenueRes, ordersRes, rentalRes] = responses

    const nextData = {
      summary: summaryRes.status === 'fulfilled' ? unwrapApiData(summaryRes.value) : {},
      customers: customerRes.status === 'fulfilled' ? unwrapApiData(customerRes.value) : {},
      inventory: inventoryRes.status === 'fulfilled' ? unwrapApiData(inventoryRes.value) : {},
      revenue: revenueRes.status === 'fulfilled' ? toArray(unwrapApiData(revenueRes.value)) : [],
      orders: ordersRes.status === 'fulfilled' ? toArray(unwrapApiData(ordersRes.value)) : [],
      rental: rentalRes.status === 'fulfilled' ? unwrapApiData(rentalRes.value) : {}
    }

    setDashboardData(nextData)

    const failed = responses.some((item) => item.status === 'rejected')
    if (failed) {
      setError('Một số dữ liệu dashboard chưa tải được đầy đủ. Hệ thống đang hiển thị phần dữ liệu khả dụng.')
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    loadDashboardData()
  }, [loadDashboardData])

  const revenueChartData = useMemo(() => {
    return toArray(dashboardData.revenue).slice(-7).map((row) => {
      const rentRevenue = Number(row?.rentRevenue || 0)
      const saleRevenue = Number(row?.saleRevenue || 0)
      const totalRevenue = Number(row?.totalRevenue || row?.revenue || (rentRevenue + saleRevenue))

      return {
        day: formatDayLabel(row?.date || row?.period || row?.day || row?.label),
        revenue: totalRevenue
      }
    })
  }, [dashboardData.revenue])

  const latestRevenue = revenueChartData[revenueChartData.length - 1]?.revenue || 0
  const previousRevenue = revenueChartData[revenueChartData.length - 2]?.revenue || 0

  const todayRevenue = readFirstNumber(
    [dashboardData.summary],
    ['todayRevenue', 'revenueToday', 'dailyRevenue'],
    latestRevenue
  )
  const yesterdayRevenue = readFirstNumber(
    [dashboardData.summary],
    ['yesterdayRevenue', 'revenueYesterday', 'previousDayRevenue'],
    previousRevenue
  )

  const todayOrders = readFirstNumber(
    [dashboardData.summary],
    ['todayOrders', 'orderCountToday', 'dailyOrderCount'],
    Number(dashboardData.orders.length || 0)
  )
  const yesterdayOrders = readFirstNumber(
    [dashboardData.summary],
    ['yesterdayOrders', 'orderCountYesterday', 'previousDayOrderCount'],
    0
  )

  const newCustomers = readFirstNumber(
    [dashboardData.customers, dashboardData.summary],
    ['new', 'newCustomers', 'todayNewCustomers', 'newCustomersToday'],
    0
  )
  const previousNewCustomers = readFirstNumber(
    [dashboardData.customers, dashboardData.summary],
    ['newPrevious', 'previousNewCustomers', 'yesterdayNewCustomers'],
    0
  )

  const conversionRate = readFirstNumber(
    [dashboardData.summary],
    ['conversionRate', 'conversion', 'rate.conversion'],
    0
  )
  const previousConversionRate = readFirstNumber(
    [dashboardData.summary],
    ['previousConversionRate', 'conversionRatePrevious'],
    0
  )

  const kpis = useMemo(() => ([
    {
      title: 'Doanh thu hôm nay',
      value: currencyFormatter.format(todayRevenue),
      trend: getGrowth(todayRevenue, yesterdayRevenue),
      subtitle: 'so với hôm qua',
      icon: TrendingUp
    },
    {
      title: 'Số đơn hàng',
      value: numberFormatter.format(todayOrders),
      trend: getGrowth(todayOrders, yesterdayOrders),
      subtitle: 'đơn trong ngày',
      icon: ShoppingCart
    },
    {
      title: 'Khách hàng mới',
      value: numberFormatter.format(newCustomers),
      trend: getGrowth(newCustomers, previousNewCustomers),
      subtitle: 'khách đăng ký mới',
      icon: UserPlus
    },
    {
      title: 'Tỷ lệ chuyển đổi',
      value: `${asPercent(conversionRate).toFixed(1)}%`,
      trend: Number((asPercent(conversionRate) - asPercent(previousConversionRate)).toFixed(1)),
      subtitle: 'so với kỳ trước',
      icon: BadgePercent
    }
  ]), [
    conversionRate,
    newCustomers,
    previousConversionRate,
    previousNewCustomers,
    todayOrders,
    todayRevenue,
    yesterdayOrders,
    yesterdayRevenue
  ])

  const orders = useMemo(() => {
    return toArray(dashboardData.orders).slice(0, 5).map((order, index) => {
      const items = toArray(order?.items)
      const firstItem = items[0]
      const costumeName = firstItem?.productId?.name
        || firstItem?.productInstanceId?.productId?.name
        || 'N/A'

      return {
        id: order?._id || order?.id || index,
        code: order?.orderCode || order?.code || `#${String(order?._id || '').slice(-8)}`,
        customer: order?.customerId?.name || order?.guestName || 'Khách hàng',
        costume: costumeName,
        rentalDate: formatDate(order?.rentalDate || order?.pickupDate || order?.createdAt),
        status: translateOrderStatus(order?.statusLabel || order?.status)
      }
    })
  }, [dashboardData.orders])

  const rentalStatuses = useMemo(() => {
    const rentedCount = readFirstNumber(
      [dashboardData.rental, dashboardData.inventory],
      ['rentedCount', 'summary.rented', 'lifecycle.Rented'],
      0
    )
    const availableCount = readFirstNumber(
      [dashboardData.rental, dashboardData.inventory],
      ['availableCount', 'summary.available', 'lifecycle.Available'],
      0
    )
    const washingCount = readFirstNumber(
      [dashboardData.rental, dashboardData.inventory],
      ['washingCount', 'summary.washing', 'lifecycle.Washing'],
      0
    )

    return [
      { label: 'Đang thuê', value: rentedCount },
      { label: 'Sẵn sàng', value: availableCount },
      { label: 'Đang giặt', value: washingCount }
    ]
  }, [dashboardData.inventory, dashboardData.rental])

  const alerts = useMemo(() => {
    const overdueCount = readFirstNumber(
      [dashboardData.rental, dashboardData.summary],
      ['lateOrders', 'overdueOrders', 'alerts.overdue', 'pendingLateReturns'],
      0
    )
    const lowStockCount = readFirstNumber(
      [dashboardData.inventory, dashboardData.summary],
      ['lowStockCount', 'alerts.lowStock', 'inventoryLowStock'],
      0
    )
    const unpaidCountFromApi = readFirstNumber(
      [dashboardData.summary, dashboardData.rental],
      ['unpaidOrders', 'alerts.unpaid', 'pendingPayments'],
      -1
    )

    const unpaidCount = unpaidCountFromApi >= 0
      ? unpaidCountFromApi
      : orders.filter((order) => {
        const status = String(order?.status || '').toLowerCase()
        return status.includes('chờ') || status.includes('pending')
      }).length

    return [
      `${overdueCount} đơn sắp trễ hạn`,
      `${lowStockCount} sản phẩm sắp hết`,
      `${unpaidCount} đơn chưa thanh toán`
    ]
  }, [dashboardData.inventory, dashboardData.rental, dashboardData.summary, orders])

  const totalRentalItems = useMemo(() => {
    return rentalStatuses.reduce((sum, item) => sum + Number(item.value || 0), 0)
  }, [rentalStatuses])

  if (loading) {
    return <DashboardSkeleton />
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50 to-white p-6">
        <h2 className="text-xl font-semibold text-slate-900">Bảng điều khiển chủ cửa hàng INHERE</h2>
        <p className="mt-1 text-sm text-slate-600">
          Theo dõi doanh thu, đơn hàng và vận hành thuê đồ trong thời gian thực.
        </p>
      </section>

      {error ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          {error}
        </section>
      ) : null}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((item) => (
          <StatsCard
            key={item.title}
            title={item.title}
            value={item.value}
            trend={item.trend}
            subtitle={item.subtitle}
            icon={item.icon}
          />
        ))}
      </section>

      <RevenueChart data={revenueChartData} />

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <OrderTable orders={orders} />
        </div>

        <div className="space-y-6">
          <AlertBox alerts={alerts} />
          <RentalStatus statuses={rentalStatuses} />
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
            Tổng số trang phục đang quản lý: <span className="font-semibold text-slate-900">{totalRentalItems}</span>
          </div>
        </div>
      </section>
    </div>
  )
}

export default DashboardPage
