import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getStaffBookingsRequest } from '../../api/booking.api'
import { getAllRentOrdersApi } from '../../services/rent-order.service'
import { getMyShiftOptionsApi } from '../../services/staff-shift.service'

const TIME_FILTERS = [
  { value: 'today', label: 'Hôm nay' },
  { value: '7d', label: '7 ngày' },
  { value: '30d', label: '30 ngày' },
]

const URGENT_TABS = [
  { key: 'soon', label: 'Sắp đến giờ' },
  { key: 'late', label: 'Trễ hạn' },
  { key: 'issue', label: 'Có vấn đề' },
]

const toneMap = {
  neutral: 'bg-slate-100 text-slate-700',
  info: 'bg-blue-100 text-blue-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-rose-100 text-rose-700',
  success: 'bg-emerald-100 text-emerald-700',
}

const quickCardTone = {
  primary: 'from-slate-900 to-slate-700 text-white',
  info: 'from-blue-700 to-blue-500 text-white',
  success: 'from-emerald-700 to-emerald-500 text-white',
  warning: 'from-amber-600 to-amber-400 text-white',
  danger: 'from-rose-700 to-rose-500 text-white',
}

const SUCCESS_ORDER_STATUSES = ['WaitingPickup', 'Renting', 'WaitingReturn', 'Returned', 'Completed']
const FINISHED_ORDER_STATUSES = ['Completed', 'Cancelled']
const RENTING_FLOW_STATUSES = ['Renting', 'WaitingReturn', 'Late']

const toArray = (value) => (Array.isArray(value) ? value : [])
const toNumber = (value, fallback = 0) => {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

const startOfDay = (date) => {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

const endOfDay = (date) => {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

const formatDateKey = (date) => {
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const isWithinRange = (value, start, end) => {
  if (!value) return false
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return false
  return d >= start && d <= end
}

const formatMoney = (value) => `${toNumber(value).toLocaleString('vi-VN')}đ`

const getTimeFilterRange = (timeFilter) => {
  const now = new Date()
  const end = endOfDay(now)
  const start = startOfDay(now)

  if (timeFilter === '7d') {
    start.setDate(start.getDate() - 6)
  } else if (timeFilter === '30d') {
    start.setDate(start.getDate() - 29)
  }

  return { start, end, now }
}

const countOrderItems = (order) => {
  const items = toArray(order?.items)
  if (items.length === 0) return 1
  return items.reduce((sum, item) => sum + Math.max(1, toNumber(item?.quantity, 1)), 0)
}

const getOrderCode = (order) => order?.orderCode || `#${String(order?._id || '').slice(-8).toUpperCase()}`

const getOrderCustomer = (order) =>
  order?.customerId?.name
  || order?.guestName
  || order?.customerName
  || 'Khách hàng'

const getPaidToday = (order, rangeStart, rangeEnd) => {
  const payments = toArray(order?.payments).filter(
    (item) => String(item?.status || '').toLowerCase() === 'paid' && isWithinRange(item?.paidAt || item?.createdAt || item?.updatedAt, rangeStart, rangeEnd)
  )
  const deposits = toArray(order?.deposits).filter(
    (item) => String(item?.status || '').toLowerCase() === 'paid' && isWithinRange(item?.paidAt || item?.createdAt || item?.updatedAt, rangeStart, rangeEnd)
  )
  const paymentAmount = payments.reduce((sum, item) => sum + toNumber(item?.amount), 0)
  const depositAmount = deposits.reduce((sum, item) => sum + toNumber(item?.amount), 0)
  return paymentAmount + depositAmount
}

const toHourMinute = (value) => {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

const buildUrgentSoonItems = (orders, now) => {
  const twoHoursMs = 2 * 60 * 60 * 1000
  return orders
    .map((order) => {
      const start = order?.rentStartDate ? new Date(order.rentStartDate) : null
      const end = order?.rentEndDate ? new Date(order.rentEndDate) : null
      const status = String(order?.status || '')
      const customer = getOrderCustomer(order)
      const code = getOrderCode(order)

      if (start && !Number.isNaN(start.getTime()) && ['Confirmed', 'WaitingPickup'].includes(status)) {
        const diff = start.getTime() - now.getTime()
        if (diff >= 0 && diff <= twoHoursMs) {
          return {
            id: `S-${order?._id}-pickup`,
            title: `Đơn ${code} sắp đến giờ lấy đồ`,
            subtitle: `Khách: ${customer} • ${toHourMinute(start)}`,
            severity: 'info',
            route: '/staff/rent-orders',
          }
        }
      }

      if (end && !Number.isNaN(end.getTime()) && RENTING_FLOW_STATUSES.includes(status)) {
        const diff = end.getTime() - now.getTime()
        if (diff >= 0 && diff <= twoHoursMs) {
          return {
            id: `S-${order?._id}-return`,
            title: `Đơn ${code} sắp đến giờ trả`,
            subtitle: `Khách: ${customer} • ${toHourMinute(end)}`,
            severity: 'warning',
            route: '/staff/return',
          }
        }
      }

      return null
    })
    .filter(Boolean)
    .slice(0, 8)
}

const buildUrgentLateItems = (orders, now) => {
  return orders
    .filter((order) => {
      const status = String(order?.status || '')
      if (status === 'Late') return true
      if (FINISHED_ORDER_STATUSES.includes(status)) return false
      if (!order?.rentEndDate) return false
      const end = new Date(order.rentEndDate)
      return !Number.isNaN(end.getTime()) && end < now
    })
    .map((order) => {
      const end = order?.rentEndDate ? new Date(order.rentEndDate) : null
      const lateHours = end && !Number.isNaN(end.getTime())
        ? Math.max(1, Math.floor((now.getTime() - end.getTime()) / (1000 * 60 * 60)))
        : 0
      return {
        id: `L-${order?._id}`,
        title: `Đơn ${getOrderCode(order)} đang trễ hạn`,
        subtitle: `Khách: ${getOrderCustomer(order)}${lateHours > 0 ? ` • ${lateHours} giờ` : ''}`,
        severity: 'danger',
        route: '/staff/rent-orders',
      }
    })
    .slice(0, 8)
}

const buildUrgentIssueItems = (orders, bookings) => {
  const fromOrders = orders
    .filter((order) => ['Compensation', 'NoShow', 'Cancelled'].includes(String(order?.status || '')))
    .map((order) => ({
      id: `I-ORDER-${order?._id}`,
      title: `Đơn ${getOrderCode(order)} cần xử lý phát sinh`,
      subtitle: `Trạng thái: ${String(order?.status || 'N/A')} • Khách: ${getOrderCustomer(order)}`,
      severity: 'warning',
      route: '/staff/rent-orders',
    }))

  const fromBookings = bookings
    .filter((booking) => String(booking?.status || '').toLowerCase() === 'pending')
    .map((booking) => ({
      id: `I-BOOK-${booking?._id}`,
      title: 'Booking chưa phản hồi',
      subtitle: `Khách: ${booking?.name || 'Khách hàng'} • ${booking?.time || 'N/A'}`,
      severity: 'info',
      route: '/staff/bookings',
    }))

  return [...fromOrders, ...fromBookings].slice(0, 8)
}

const buildTimelineItems = (orders, rangeStart, rangeEnd) => {
  const entries = []
  orders.forEach((order) => {
    if (isWithinRange(order?.rentStartDate, rangeStart, rangeEnd)) {
      entries.push({
        id: `TL-PICK-${order?._id}`,
        hour: toHourMinute(order.rentStartDate),
        action: 'Lấy đồ',
        orderCode: getOrderCode(order),
        customer: getOrderCustomer(order),
        status: String(order?.status || 'N/A'),
        route: '/staff/rent-orders',
      })
    }
    if (isWithinRange(order?.rentEndDate, rangeStart, rangeEnd)) {
      entries.push({
        id: `TL-RETURN-${order?._id}`,
        hour: toHourMinute(order.rentEndDate),
        action: 'Trả đồ',
        orderCode: getOrderCode(order),
        customer: getOrderCustomer(order),
        status: String(order?.status || 'N/A'),
        route: '/staff/return',
      })
    }
  })

  return entries
    .filter((item) => item.hour)
    .sort((a, b) => a.hour.localeCompare(b.hour))
    .slice(0, 15)
}

const buildInventorySummary = (orders) => {
  const initial = { ready: 0, renting: 0, laundry: 0, repair: 0 }

  const summary = orders.reduce((acc, order) => {
    const status = String(order?.status || '')
    const itemCount = countOrderItems(order)
    if (['Confirmed', 'WaitingPickup'].includes(status)) acc.ready += itemCount
    if (['Renting', 'WaitingReturn', 'Late'].includes(status)) acc.renting += itemCount
    if (['Returned'].includes(status)) acc.laundry += itemCount
    if (['Compensation'].includes(status)) acc.repair += itemCount
    return acc
  }, initial)

  return [
    { key: 'ready', label: 'Sẵn sàng giao', value: summary.ready, hint: 'Đơn ở trạng thái chờ lấy', route: '/staff/rent-orders', tone: 'success' },
    { key: 'renting', label: 'Đang thuê', value: summary.renting, hint: 'Đơn đang trong thời gian thuê', route: '/staff/rent-orders', tone: 'info' },
    { key: 'laundry', label: 'Đang giặt', value: summary.laundry, hint: 'Sản phẩm vừa trả cần xử lý', route: '/staff/rent-orders', tone: 'warning' },
    { key: 'repair', label: 'Đang sửa', value: summary.repair, hint: 'Sản phẩm có phát sinh hư hỏng', route: '/staff/rent-orders', tone: 'danger' },
  ]
}

const buildShiftPerformance = (ordersInRange, bookingsInRange, shifts, now) => {
  const todayKey = formatDateKey(now)
  const todayShift = shifts.find((shift) => String(shift?.workDate || '') === todayKey && Boolean(shift?.isRegistered))
    || shifts.find((shift) => String(shift?.workDate || '') === todayKey)
    || null

  const completedTasks = ordersInRange.filter((order) => SUCCESS_ORDER_STATUSES.includes(String(order?.status || ''))).length
    + bookingsInRange.filter((booking) => ['confirmed', 'rejected'].includes(String(booking?.status || '').toLowerCase())).length

  const targetTasks = Math.max(ordersInRange.length + bookingsInRange.length, 1)
  const onTimeBase = Math.max(
    ordersInRange.filter((order) => !FINISHED_ORDER_STATUSES.includes(String(order?.status || ''))).length,
    1
  )
  const lateCount = ordersInRange.filter((order) => String(order?.status || '') === 'Late').length
  const onTimeRate = Math.max(0, Math.min(100, Math.round(((onTimeBase - lateCount) / onTimeBase) * 100)))

  const bookingResolved = bookingsInRange.filter((booking) => ['confirmed', 'rejected'].includes(String(booking?.status || '').toLowerCase()))
  const bookingConfirmed = bookingResolved.filter((booking) => String(booking?.status || '').toLowerCase() === 'confirmed')
  const customerSatisfaction = bookingResolved.length > 0
    ? Number((3 + (bookingConfirmed.length / bookingResolved.length) * 2).toFixed(1))
    : 0

  return {
    shiftName: todayShift?.name || 'Ca làm hôm nay',
    owner: todayShift?.isRegistered ? `Đã đăng ký: ${todayShift?.code || todayShift?.name || 'Ca hiện tại'}` : 'Chưa đăng ký ca hôm nay',
    completedTasks,
    targetTasks,
    onTimeRate,
    avgProcessMinutes: 0,
    customerSatisfaction,
    route: '/staff/shifts',
  }
}

function DashboardSection({ title, subtitle, action, children }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 md:text-xl">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

function LoadingBlock() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-52 animate-pulse rounded-lg bg-slate-200" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[...Array(6)].map((_, idx) => (
          <div key={idx} className="h-24 animate-pulse rounded-2xl bg-slate-200" />
        ))}
      </div>
      <div className="h-44 animate-pulse rounded-3xl bg-slate-200" />
    </div>
  )
}

function EmptyBlock({ onRefresh }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
      <p className="text-lg font-semibold text-slate-800">Chưa có dữ liệu vận hành</p>
      <p className="mt-2 text-sm text-slate-500">Không tìm thấy dữ liệu phù hợp với bộ lọc thời gian hiện tại.</p>
      <button
        type="button"
        onClick={onRefresh}
        className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
      >
        Tải lại
      </button>
    </div>
  )
}

function ErrorBlock({ message, onRefresh }) {
  return (
    <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6">
      <p className="text-base font-semibold text-rose-700">Không tải được dashboard</p>
      <p className="mt-2 text-sm text-rose-600">{message || 'Đã có lỗi xảy ra, vui lòng thử lại.'}</p>
      <button
        type="button"
        onClick={onRefresh}
        className="mt-4 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700"
      >
        Thử lại
      </button>
    </div>
  )
}

export default function StaffDashboard() {
  const navigate = useNavigate()
  const [timeFilter, setTimeFilter] = useState('today')
  const [activeUrgentTab, setActiveUrgentTab] = useState('soon')
  const [status, setStatus] = useState('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const [data, setData] = useState(null)

  const todayLabel = useMemo(
    () =>
      new Date().toLocaleDateString('vi-VN', {
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }),
    []
  )

  const loadDashboard = useCallback(async () => {
    setStatus('loading')
    setErrorMessage('')

    try {
      const [{ start, end, now }, ordersResult, bookingsResult, shiftsResult] = await Promise.all([
        Promise.resolve(getTimeFilterRange(timeFilter)),
        getAllRentOrdersApi({}),
        getStaffBookingsRequest({ page: 1, limit: 200 }),
        getMyShiftOptionsApi({ page: 1, limit: 100 }),
      ])

      const orders = toArray(ordersResult?.data)
      const bookings = toArray(bookingsResult?.data?.data)
      const shifts = toArray(shiftsResult?.data)

      const ordersInRange = orders.filter((order) => isWithinRange(order?.createdAt || order?.updatedAt, start, end))
      const bookingsInRange = bookings.filter((booking) => isWithinRange(booking?.date || booking?.createdAt, start, end))

      const todayStart = startOfDay(now)
      const todayEnd = endOfDay(now)
      const ordersToday = orders.filter((order) => isWithinRange(order?.createdAt || order?.updatedAt, todayStart, todayEnd))
      const paidToday = orders.reduce((sum, order) => sum + getPaidToday(order, todayStart, todayEnd), 0)

      const quickStats = [
        { key: 'orders', label: 'Đơn hôm nay', value: ordersToday.length, route: '/staff/rent-orders', tone: 'primary', note: 'Đơn phát sinh trong ngày' },
        { key: 'pickup', label: 'Chờ lấy đồ', value: orders.filter((order) => String(order?.status || '') === 'WaitingPickup').length, route: '/staff/rent-orders', tone: 'info', note: 'Ưu tiên theo giờ hẹn' },
        { key: 'renting', label: 'Đang thuê', value: orders.filter((order) => String(order?.status || '') === 'Renting').length, route: '/staff/rent-orders', tone: 'success', note: 'Đang trong thời hạn thuê' },
        { key: 'return', label: 'Chờ trả', value: orders.filter((order) => String(order?.status || '') === 'WaitingReturn').length, route: '/staff/return', tone: 'warning', note: 'Cần kiểm đồ khi nhận' },
        { key: 'late', label: 'Trễ hạn', value: orders.filter((order) => String(order?.status || '') === 'Late').length, route: '/staff/rent-orders', tone: 'danger', note: 'Cần liên hệ khách ngay' },
        { key: 'money', label: 'Tiền thu hôm nay', value: paidToday, route: '/staff/sale-order', tone: 'primary', note: 'Tổng thu đã thanh toán trong ngày' },
      ]

      const urgent = {
        soon: buildUrgentSoonItems(orders, now),
        late: buildUrgentLateItems(orders, now),
        issue: buildUrgentIssueItems(orders, bookings),
      }

      const timeline = buildTimelineItems(orders, start, end)
      const inventory = buildInventorySummary(orders)
      const shiftPerformance = buildShiftPerformance(ordersInRange, bookingsInRange, shifts, now)

      const payload = { quickStats, urgent, timeline, inventory, shiftPerformance }
      const hasAnyData = Boolean(
        quickStats.some((item) => toNumber(item?.value) > 0)
        || timeline.length
        || urgent.soon.length
        || urgent.late.length
        || urgent.issue.length
      )

      setData(payload)
      setStatus(hasAnyData ? 'success' : 'empty')
    } catch (error) {
      setStatus('error')
      setErrorMessage(error?.response?.data?.message || error?.message || 'Không thể lấy dữ liệu dashboard.')
    }
  }, [timeFilter])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  const urgentItems = useMemo(() => {
    if (!data?.urgent) return []
    return data.urgent[activeUrgentTab] || []
  }, [data?.urgent, activeUrgentTab])

  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-500">INHERE STAFF DASHBOARD</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900 md:text-3xl">Tổng quan hôm nay</h1>
            <p className="mt-2 text-sm text-slate-500">Ngày {todayLabel}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={timeFilter}
              onChange={(event) => setTimeFilter(event.target.value)}
              className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-slate-900"
            >
              {TIME_FILTERS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={loadDashboard}
              className="h-11 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Làm mới
            </button>
          </div>
        </div>
      </header>

      {status === 'loading' ? <LoadingBlock /> : null}
      {status === 'empty' ? <EmptyBlock onRefresh={loadDashboard} /> : null}
      {status === 'error' ? <ErrorBlock message={errorMessage} onRefresh={loadDashboard} /> : null}

      {status === 'success' && data ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {data.quickStats.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => navigate(item.route)}
                className={`rounded-3xl bg-gradient-to-br p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${quickCardTone[item.tone] || quickCardTone.primary}`}
              >
                <p className="text-sm font-medium opacity-90">{item.label}</p>
                <p className="mt-2 text-3xl font-bold">{item.key === 'money' ? formatMoney(item.value) : item.value}</p>
                <p className="mt-3 text-xs opacity-85">{item.note}</p>
              </button>
            ))}
          </section>

          <DashboardSection
            title="Cần xử lý ngay"
            subtitle="Ưu tiên công việc ảnh hưởng trực tiếp đến lịch khách và tiến độ giao trả"
          >
            <div className="mb-4 inline-flex rounded-2xl border border-slate-200 bg-slate-50 p-1">
              {URGENT_TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveUrgentTab(tab.key)}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                    activeUrgentTab === tab.key ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {urgentItems.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                Không có mục cần xử lý trong tab này.
              </div>
            ) : (
              <div className="space-y-3">
                {urgentItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => navigate(item.route)}
                    className="flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-slate-300 hover:shadow-sm"
                  >
                    <div>
                      <p className="font-semibold text-slate-900">{item.title}</p>
                      <p className="mt-1 text-sm text-slate-500">{item.subtitle}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${toneMap[item.severity] || toneMap.neutral}`}>
                      Ưu tiên
                    </span>
                  </button>
                ))}
              </div>
            )}
          </DashboardSection>

          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <DashboardSection title="Lịch lấy/trả theo giờ" subtitle="Theo dõi luồng khách trong ngày">
              {data.timeline.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">Chưa có lịch lấy/trả cho khung thời gian đã chọn.</p>
              ) : (
                <div className="space-y-3">
                  {data.timeline.map((entry) => (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => navigate(entry.route)}
                      className="grid w-full grid-cols-[72px_1fr_auto] items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-left transition hover:border-slate-300 hover:shadow-sm"
                    >
                      <div className="rounded-xl bg-slate-900 px-2 py-2 text-center text-sm font-semibold text-white">{entry.hour}</div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {entry.action} • {entry.orderCode}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">{entry.customer}</p>
                      </div>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{entry.status}</span>
                    </button>
                  ))}
                </div>
              )}
            </DashboardSection>

            <DashboardSection title="Tồn kho vận hành" subtitle="Trạng thái sẵn sàng phục vụ">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                {data.inventory.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => navigate(item.route)}
                    className="rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-slate-300 hover:shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-600">{item.label}</p>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${toneMap[item.tone] || toneMap.neutral}`}>
                        {item.value}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">{item.hint}</p>
                  </button>
                ))}
              </div>
            </DashboardSection>
          </div>

          <DashboardSection title="Hiệu suất ca làm" subtitle="Theo dõi tiến độ công việc của nhân viên trong ca">
            <button
              type="button"
              onClick={() => navigate(data.shiftPerformance.route)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-5 text-left transition hover:border-slate-300 hover:shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-slate-900">{data.shiftPerformance.shiftName}</p>
                  <p className="mt-1 text-sm text-slate-500">{data.shiftPerformance.owner}</p>
                </div>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                  Đúng hạn {data.shiftPerformance.onTimeRate}%
                </span>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-white p-3">
                  <p className="text-xs text-slate-500">Công việc hoàn tất</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">
                    {data.shiftPerformance.completedTasks}/{data.shiftPerformance.targetTasks}
                  </p>
                </div>
                <div className="rounded-xl bg-white p-3">
                  <p className="text-xs text-slate-500">Thời gian xử lý TB</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">
                    {data.shiftPerformance.avgProcessMinutes > 0 ? `${data.shiftPerformance.avgProcessMinutes} phút` : 'Chưa đủ dữ liệu'}
                  </p>
                </div>
                <div className="rounded-xl bg-white p-3">
                  <p className="text-xs text-slate-500">Hài lòng khách hàng</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">
                    {data.shiftPerformance.customerSatisfaction > 0 ? `${data.shiftPerformance.customerSatisfaction}/5` : 'Chưa đủ dữ liệu'}
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <div className="mb-1 flex justify-between text-xs text-slate-500">
                  <span>Tiến độ ca</span>
                  <span>{Math.round((data.shiftPerformance.completedTasks / data.shiftPerformance.targetTasks) * 100)}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-200">
                  <div
                    className="h-2 rounded-full bg-slate-900"
                    style={{ width: `${Math.min(Math.round((data.shiftPerformance.completedTasks / data.shiftPerformance.targetTasks) * 100), 100)}%` }}
                  />
                </div>
              </div>
            </button>
          </DashboardSection>
        </>
      ) : null}
    </div>
  )
}
