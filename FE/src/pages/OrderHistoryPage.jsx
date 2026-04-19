import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Box,
  CalendarClock,
  CheckCircle2,
  Clock3,
  CreditCard,
  Package,
  Search,
  ShoppingBag,
  Sparkles,
  Truck,
  Undo2,
  Wallet,
  XCircle,
} from 'lucide-react'
import Header from '../components/common/Header'
import { useAuth } from '../contexts/AuthContext'
import { useBuyCart } from '../contexts/BuyCartContext'
import { getMySaleOrdersApi } from '../services/order.service'
import { getMyRentOrdersApi } from '../services/rent-order.service'
import { UI_IMAGE_FALLBACKS } from '../constants/ui'

const ORDER_TYPE_TABS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'buy', label: 'Đơn mua' },
  { value: 'rent', label: 'Đơn thuê' },
]

const STATUS_FILTERS = [
  { value: 'all', label: 'Tất cả trạng thái' },
  { value: 'pending_confirmation', label: 'Chờ xác nhận' },
  { value: 'returned', label: 'Đã trả hàng' },
  { value: 'deposited', label: 'Đã đặt cọc' },
  { value: 'ready_pickup', label: 'Sẵn sàng nhận đồ' },
  { value: 'renting', label: 'Đang thuê' },
  { value: 'waiting_return', label: 'Chờ trả' },
  { value: 'completed', label: 'Hoàn tất' },
  { value: 'cancelled', label: 'Đã hủy' },
]

const RENTAL_PROGRESS_STEPS = [
  { key: 'deposit', label: 'Đặt cọc' },
  { key: 'confirmed', label: 'Xác nhận' },
  { key: 'pickup', label: 'Nhận đồ' },
  { key: 'renting', label: 'Đang thuê' },
  { key: 'return', label: 'Trả đồ' },
  { key: 'completed', label: 'Hoàn tất' },
]

const STATUS_META = {
  pending_confirmation: {
    label: 'Chờ xác nhận',
    badgeClass: 'bg-amber-50 text-amber-700 ring-amber-200',
    dotClass: 'bg-amber-500',
  },
  deposited: {
    label: 'Đã đặt cọc',
    badgeClass: 'bg-sky-50 text-sky-700 ring-sky-200',
    dotClass: 'bg-sky-500',
  },
  ready_pickup: {
    label: 'Sẵn sàng nhận đồ',
    badgeClass: 'bg-violet-50 text-violet-700 ring-violet-200',
    dotClass: 'bg-violet-500',
  },
  renting: {
    label: 'Đang thuê',
    badgeClass: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    dotClass: 'bg-emerald-500',
  },
  waiting_return: {
    label: 'Chờ trả',
    badgeClass: 'bg-orange-50 text-orange-700 ring-orange-200',
    dotClass: 'bg-orange-500',
  },
  completed: {
    label: 'Hoàn tất',
    badgeClass: 'bg-green-50 text-green-700 ring-green-200',
    dotClass: 'bg-green-500',
  },
  returned: {
    label: 'Đã trả hàng',
    badgeClass: 'bg-slate-100 text-slate-700 ring-slate-200',
    dotClass: 'bg-slate-500',
  },
  cancelled: {
    label: 'Đã hủy',
    badgeClass: 'bg-rose-50 text-rose-700 ring-rose-200',
    dotClass: 'bg-rose-500',
  },
}

const TYPE_META = {
  buy: {
    label: 'Đơn mua',
    className: 'bg-slate-900 text-white',
  },
  rent: {
    label: 'Đơn thuê',
    className: 'bg-pink-100 text-pink-700',
  },
}

function formatCurrency(value) {
  return `${Number(value || 0).toLocaleString('vi-VN')}đ`
}

function formatDate(value) {
  if (!value) return '--'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '--'

  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function getStatusMeta(status) {
  return STATUS_META[status] || STATUS_META.pending_confirmation
}

function getActionConfig(action, orderType = 'rent') {
  const actionMap = {
    view: {
      label: 'Xem chi tiết',
      className: 'border-slate-200 text-slate-700 hover:bg-slate-50',
      icon: Package,
    },
    pay_deposit: {
      label: 'Thanh toán cọc',
      className: 'border-transparent bg-slate-900 text-white hover:bg-slate-800',
      icon: Wallet,
    },
    pay_remaining: {
      label: 'Thanh toán phần còn lại',
      className: 'border-transparent bg-slate-900 text-white hover:bg-slate-800',
      icon: CreditCard,
    },
    schedule_pickup: {
      label: 'Đặt lịch nhận đồ',
      className: 'border-slate-200 text-slate-700 hover:bg-slate-50',
      icon: CalendarClock,
    },
    confirm_return: {
      label: 'Xác nhận trả đồ',
      className: 'border-slate-200 text-slate-700 hover:bg-slate-50',
      icon: Undo2,
    },
    cancel: {
      label: 'Hủy đơn',
      className: 'border-rose-200 text-rose-700 hover:bg-rose-50',
      icon: XCircle,
    },
    reorder: {
      label: orderType === 'buy' ? 'Mua lại' : 'Thuê lại',
      className: 'border-slate-200 text-slate-700 hover:bg-slate-50',
      icon: ArrowRight,
    },
  }

  return actionMap[action] || actionMap.view
}

function getProgressStepIndex(stepKey) {
  return RENTAL_PROGRESS_STEPS.findIndex((step) => step.key === stepKey)
}

function getProductName(product) {
  if (typeof product?.name === 'string') return product.name
  if (product?.name && typeof product.name === 'object') {
    return product.name.vi || product.name.en || 'Sản phẩm'
  }
  return 'Sản phẩm'
}

function getImageUrl(value) {
  if (Array.isArray(value) && value[0]) return value[0]
  if (typeof value === 'string' && value.trim()) return value
  return UI_IMAGE_FALLBACKS.reviewImage
}

function normalizePaymentMethod(value, fallback = 'Theo quy trình thanh toán') {
  const paymentMap = {
    COD: 'Thanh toán khi nhận hàng',
    Cash: 'Tiền mặt',
    Online: 'Thanh toán online',
    BankTransfer: 'Chuyển khoản',
    Remaining: 'Thanh toán phần còn lại',
  }

  return paymentMap[value] || value || fallback
}

function calculateRentalDays(startDate, endDate) {
  const start = new Date(startDate)
  const end = new Date(endDate)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0
  return Math.max(Math.round((end - start) / (24 * 60 * 60 * 1000)) + 1, 1)
}

function mapBuyStatus(status) {
  switch (status) {
    case 'Completed':
      return 'completed'
    case 'Returned':
    case 'Refunded':
      return 'returned'
    case 'Cancelled':
    case 'Failed':
      return 'cancelled'
    case 'Shipping':
      return 'ready_pickup'
    case 'PendingPayment':
    case 'PendingConfirmation':
    case 'Paid':
    case 'Confirmed':
    case 'Unpaid':
    case 'Draft':
    default:
      return 'pending_confirmation'
  }
}

function mapRentStatus(status) {
  switch (status) {
    case 'Completed':
      return 'completed'
    case 'Cancelled':
    case 'NoShow':
      return 'cancelled'
    case 'Deposited':
      return 'deposited'
    case 'Confirmed':
    case 'WaitingPickup':
      return 'ready_pickup'
    case 'Renting':
      return 'renting'
    case 'WaitingReturn':
    case 'Returned':
    case 'Late':
    case 'Compensation':
      return 'waiting_return'
    case 'PendingDeposit':
    case 'Draft':
    default:
      return 'pending_confirmation'
  }
}

function mapRentProgress(status) {
  switch (status) {
    case 'Completed':
      return 'completed'
    case 'Returned':
    case 'WaitingReturn':
    case 'Late':
    case 'Compensation':
      return 'return'
    case 'Renting':
      return 'renting'
    case 'WaitingPickup':
      return 'pickup'
    case 'Confirmed':
      return 'confirmed'
    case 'Deposited':
      return 'deposit'
    case 'PendingDeposit':
    case 'Draft':
    default:
      return 'deposit'
  }
}

function getBuyActions(order) {
  const actions = ['view']

  if (order.rawStatus === 'PendingConfirmation' || order.rawStatus === 'PendingPayment') {
    actions.push('cancel')
  }

  if (['Completed', 'Returned', 'Refunded'].includes(order.rawStatus)) {
    actions.push('reorder')
  }

  return actions
}

function getRentActions(order) {
  const actions = ['view']

  if (order.rawStatus === 'PendingDeposit') {
    actions.push('pay_deposit', 'cancel')
  }

  if (['Deposited', 'Confirmed', 'WaitingPickup'].includes(order.rawStatus)) {
    actions.push('schedule_pickup')
  }

  if (['Confirmed', 'WaitingPickup', 'Returned'].includes(order.rawStatus) && Number(order.remainingAmount || 0) > 0) {
    actions.push('pay_remaining')
  }

  if (['WaitingReturn', 'Returned'].includes(order.rawStatus)) {
    actions.push('confirm_return')
  }

  if (['Completed', 'Cancelled', 'NoShow'].includes(order.rawStatus)) {
    actions.push('reorder')
  }

  return Array.from(new Set(actions))
}

function displayCode(order) {
  if (order.orderCode) return order.orderCode
  const raw = String(order.id || order._id || '')
  return raw ? `#${raw.slice(-8).toUpperCase()}` : '--'
}

function normalizeBuyOrders(orders = []) {
  return orders.map((order) => {
    const shippingFee = Number(order.shippingFee || 0)
    const subtotal = Number(order.voucherSnapshot?.originalSubtotal || (Number(order.totalAmount || 0) - shippingFee))
    const canReview = ['Completed', 'Returned', 'Refunded'].includes(String(order.status || ''))

    return {
      id: order._id,
      orderCode: order.orderCode || null,
      type: 'buy',
      rawStatus: order.status,
      status: mapBuyStatus(order.status),
      createdAt: order.createdAt,
      paymentMethod: normalizePaymentMethod(order.paymentMethod, 'Thanh toán khi nhận hàng'),
      totalAmount: Number(order.totalAmount || 0),
      shippingFee,
      subtotal: Math.max(subtotal, 0),
      customerNote: order.note || '',
      detailPath: `/orders/${order._id}`,
      actions: [],
      canReview,
      items: (order.items || []).map((item) => ({
        id: item._id,
        orderId: order._id,
        productId: item.productId?._id,
        size: item.size || 'FREE SIZE',
        color: item.color || 'Mặc định',
        unitPrice: Number(item.unitPrice || 0),
        conditionLevel: item.conditionLevel === 'Used' ? 'Used' : 'New',
        image: getImageUrl(item.productId?.images),
        name: getProductName(item.productId),
        variant: `${item.size || 'FREE SIZE'} / ${item.color || 'Mặc định'}`,
        quantity: Number(item.quantity || 1),
        review: item.review || { isReviewed: false, canReview },
      })),
    }
  }).map((order) => ({
    ...order,
    actions: getBuyActions(order),
  }))
}

function normalizeRentOrders(orders = []) {
  return orders.map((order) => {
    const totalExtraFee = Number(order.damageFee || 0) + Number(order.lateFee || 0) + Number(order.compensationFee || 0)
    const collateralAmount = Array.isArray(order.collaterals)
      ? order.collaterals.reduce((sum, item) => sum + Number(item.cashAmount || 0), 0)
      : 0

    return {
      id: order._id,
      orderCode: order.orderCode || null,
      type: 'rent',
      rawStatus: order.status,
      status: mapRentStatus(order.status),
      createdAt: order.createdAt,
      paymentMethod: normalizePaymentMethod(order.payments?.[0]?.method, 'Theo quy trình thanh toán thuê'),
      totalAmount: Number(order.totalAmount || 0),
      shippingFee: 0,
      depositAmount: Number(order.depositAmount || 0),
      remainingAmount: Math.max(Number(order.remainingAmount || 0) + totalExtraFee, 0),
      collateralAmount,
      pickupMethod: order.pickupAt ? `Nhận đồ ngày ${formatDate(order.pickupAt)}` : 'Nhận tại showroom / theo lịch hẹn',
      rentalProgress: mapRentProgress(order.status),
      detailPath: `/rental/${order._id}`,
      actions: [],
      items: (order.items || []).map((item) => {
        const product = item.productInstanceId?.productId
        const pickupDate = item.rentStartDate || order.rentStartDate
        const returnDate = item.rentEndDate || order.rentEndDate

        return {
          id: item._id,
          image: getImageUrl(product?.images),
          name: getProductName(product),
          variant: `${item.size || 'FREE SIZE'} / ${item.color || 'Mặc định'}`,
          quantity: 1,
          pickupDate,
          returnDate,
          rentalDays: calculateRentalDays(pickupDate, returnDate),
        }
      }),
    }
  }).map((order) => ({
    ...order,
    actions: getRentActions(order),
  }))
}

function OrderFilters({
  activeTab,
  onTabChange,
  statusFilter,
  onStatusChange,
  searchValue,
  onSearchChange,
}) {
  return (
    <section className="rounded-[28px] border border-white/70 bg-white/90 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.06)] backdrop-blur xl:p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap gap-2">
          {ORDER_TYPE_TABS.map((tab) => {
            const isActive = tab.value === activeTab
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => onTabChange(tab.value)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchValue}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Tìm theo mã đơn hoặc tên sản phẩm"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-700 outline-none transition focus:border-slate-300 focus:bg-white focus:ring-4 focus:ring-slate-200/60"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) => onStatusChange(event.target.value)}
            className="min-w-[220px] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-300 focus:bg-white focus:ring-4 focus:ring-slate-200/60"
          >
            {STATUS_FILTERS.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </section>
  )
}

function OrderItem({ item, type, order }) {
  return (
    <div className="flex gap-4 rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
      <img
        src={item.image}
        alt={item.name}
        className="h-20 w-20 rounded-2xl object-cover ring-1 ring-slate-200"
      />

      <div className="min-w-0 flex-1">
        <div className="flex flex-col gap-1 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">{item.name}</p>
            <p className="mt-1 text-sm text-slate-500">{item.variant}</p>
          </div>
          <div className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
            SL {item.quantity}
          </div>
        </div>

        {type === 'rent' ? (
          <div className="mt-3 grid gap-2 text-xs text-slate-500 sm:grid-cols-3">
            <div className="rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200">
              Ngày nhận: <span className="font-medium text-slate-700">{formatDate(item.pickupDate)}</span>
            </div>
            <div className="rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200">
              Ngày trả: <span className="font-medium text-slate-700">{formatDate(item.returnDate)}</span>
            </div>
            <div className="rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200">
              Số ngày thuê: <span className="font-medium text-slate-700">{item.rentalDays} ngày</span>
            </div>
          </div>
        ) : null}

        {type === 'buy' ? (
          <div className="mt-3">
            {item?.review?.isReviewed ? (
              <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                Đã đánh giá
              </span>
            ) : order?.canReview ? (
              <Link
                to={order.detailPath}
                className="inline-flex rounded-full border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
              >
                Đánh giá sản phẩm
              </Link>
            ) : (
              <span className="text-xs text-slate-500">
                Chỉ có thể đánh giá sau khi đơn hàng đã giao thành công
              </span>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}

function RentalProgress({ currentStep }) {
  const currentIndex = getProgressStepIndex(currentStep)

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-4 flex items-center gap-2">
        <Clock3 className="h-4 w-4 text-slate-500" />
        <p className="text-sm font-semibold text-slate-800">Tiến trình đơn thuê</p>
      </div>

      <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
        {RENTAL_PROGRESS_STEPS.map((step, index) => {
          const isDone = index < currentIndex
          const isCurrent = index === currentIndex

          return (
            <div key={step.key} className="relative">
              <div
                className={`flex h-full flex-col items-center rounded-2xl px-2 py-3 text-center transition ${
                  isCurrent
                    ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/10'
                    : isDone
                      ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                      : 'bg-slate-50 text-slate-400 ring-1 ring-slate-200'
                }`}
              >
                <div
                  className={`mb-2 flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                    isCurrent
                      ? 'bg-white/15 text-white'
                      : isDone
                        ? 'bg-emerald-500 text-white'
                        : 'bg-white text-slate-400 ring-1 ring-slate-200'
                  }`}
                >
                  {isDone ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                </div>
                <span className="text-[11px] font-medium leading-4">{step.label}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ActionButton({ actionKey, order, onAction }) {
  const action = getActionConfig(actionKey, order?.type)
  const Icon = action.icon
  const className = `inline-flex min-h-[44px] items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-medium transition ${action.className}`

  if (actionKey === 'view' && order.detailPath) {
    return (
      <Link to={order.detailPath} className={className}>
        <Icon className="h-4 w-4" />
        {action.label}
      </Link>
    )
  }

  return (
    <button type="button" className={className} onClick={() => onAction?.(order, actionKey)}>
      <Icon className="h-4 w-4" />
      {action.label}
    </button>
  )
}

function OrderCard({ order, onAction }) {
  const statusMeta = getStatusMeta(order.status)
  const typeMeta = TYPE_META[order.type]
  const financialRows = order.type === 'rent'
    ? [
        { label: 'Tổng giá thuê', value: formatCurrency(order.totalAmount), icon: ShoppingBag },
        { label: 'Đã cọc 50%', value: formatCurrency(order.depositAmount), icon: Wallet },
        { label: 'Còn lại cần thanh toán', value: formatCurrency(order.remainingAmount), icon: CreditCard },
        order.collateralAmount > 0
          ? { label: 'Tiền thế chấp', value: formatCurrency(order.collateralAmount), icon: Box }
          : null,
      ].filter(Boolean)
    : [
        { label: 'Tổng đơn', value: formatCurrency(order.subtotal), icon: ShoppingBag },
        { label: 'Phí vận chuyển', value: formatCurrency(order.shippingFee), icon: Truck },
        { label: 'Thanh toán', value: formatCurrency(order.totalAmount), icon: CreditCard },
      ]

  return (
    <article className="overflow-hidden rounded-[32px] border border-white/70 bg-white/95 shadow-[0_24px_80px_rgba(15,23,42,0.08)] ring-1 ring-slate-100 backdrop-blur">
      <div className="border-b border-slate-100 bg-[radial-gradient(circle_at_top_left,_rgba(244,114,182,0.10),_transparent_32%),radial-gradient(circle_at_top_right,_rgba(15,23,42,0.06),_transparent_30%),linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(248,250,252,0.95))] px-5 py-5 md:px-7">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${typeMeta.className}`}>
                {typeMeta.label}
              </span>
              <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ring-1 ${statusMeta.badgeClass}`}>
                <span className={`h-2 w-2 rounded-full ${statusMeta.dotClass}`}></span>
                {statusMeta.label}
              </span>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Mã đơn</p>
                <p className="mt-1 font-mono text-lg font-semibold text-slate-900">{displayCode(order)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Ngày tạo đơn</p>
                <p className="mt-1 text-sm font-medium text-slate-700">{formatDate(order.createdAt)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Phương thức thanh toán</p>
                <p className="mt-1 text-sm font-medium text-slate-700">{order.paymentMethod}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[360px]">
            {financialRows.map((row) => {
              const Icon = row.icon
              return (
                <div key={row.label} className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
                  <div className="mb-3 flex items-center gap-2 text-slate-500">
                    <Icon className="h-4 w-4" />
                    <span className="text-xs font-medium uppercase tracking-[0.16em]">{row.label}</span>
                  </div>
                  <p className="text-lg font-semibold text-slate-900">{row.value}</p>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="grid gap-6 px-5 py-5 md:px-7 xl:grid-cols-[1.45fr_0.95fr]">
        <div className="space-y-4">
          {order.type === 'rent' ? <RentalProgress currentStep={order.rentalProgress} /> : null}

          <div className="space-y-3">
            {order.items.map((item) => (
              <OrderItem key={item.id} item={item} type={order.type} order={order} />
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {order.type === 'rent' ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Thông tin nhận đồ</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{order.pickupMethod}</p>
              <p className="mt-2 text-sm text-slate-500">
                Còn lại {formatCurrency(order.remainingAmount)} khi nhận đồ hoặc khi hoàn tất theo quy trình thuê.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Ghi chú đơn hàng</p>
              <p className="mt-2 text-sm text-slate-600">
                {order.customerNote || 'INHERE đang chuẩn bị đơn hàng của bạn với tiêu chuẩn đóng gói chỉn chu và giao đúng lịch hẹn.'}
              </p>
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="mb-4 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-slate-500" />
              <p className="text-sm font-semibold text-slate-800">Thao tác nhanh</p>
            </div>

            <div className="flex flex-wrap gap-3">
              {order.actions.map((actionKey) => (
                <ActionButton key={actionKey} actionKey={actionKey} order={order} onAction={onAction} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}

function EmptyState() {
  return (
    <div className="rounded-[32px] border border-dashed border-slate-200 bg-white/90 px-6 py-14 text-center shadow-[0_20px_60px_rgba(15,23,42,0.05)]">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] bg-slate-100 text-slate-600">
        <ShoppingBag className="h-9 w-9" />
      </div>
      <h3 className="mt-6 text-2xl font-semibold text-slate-900">Bạn chưa có đơn hàng nào</h3>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-500">
        Khám phá các bộ sưu tập trang phục và bắt đầu đơn đầu tiên của bạn.
      </p>
      <Link
        to="/buy"
        className="mt-8 inline-flex min-h-[46px] items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
      >
        Mua sắm ngay
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="rounded-[32px] border border-white/70 bg-white/90 px-6 py-16 text-center shadow-[0_20px_60px_rgba(15,23,42,0.05)]">
      <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-900 border-t-transparent"></div>
      <p className="mt-4 text-sm text-slate-500">Đang tải lịch sử đơn hàng...</p>
    </div>
  )
}

function ErrorState({ message }) {
  return (
    <div className="rounded-[32px] border border-rose-100 bg-white/95 px-6 py-14 text-center shadow-[0_20px_60px_rgba(15,23,42,0.05)]">
      <p className="text-lg font-semibold text-slate-900">Không thể tải lịch sử đơn hàng</p>
      <p className="mt-3 text-sm text-slate-500">{message}</p>
    </div>
  )
}

export default function OrderHistoryPage() {
  const navigate = useNavigate()
  const { addItem: addBuyItem } = useBuyCart()
  const { isAuthenticated, loading: authLoading } = useAuth()
  const [activeTab, setActiveTab] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchValue, setSearchValue] = useState('')
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionMessage, setActionMessage] = useState('')

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      fetchOrders()
    }

    if (!authLoading && !isAuthenticated) {
      setLoading(false)
    }
  }, [authLoading, isAuthenticated])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      setError('')

      const [buyResponse, rentResponse] = await Promise.all([
        getMySaleOrdersApi(),
        getMyRentOrdersApi({ limit: 50 }),
      ])

      const normalizedOrders = [
        ...normalizeBuyOrders(buyResponse?.data || []),
        ...normalizeRentOrders(rentResponse?.data || []),
      ].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())

      setOrders(normalizedOrders)
    } catch (fetchError) {
      console.error('Fetch order history error:', fetchError)
      setError(fetchError?.response?.data?.message || 'Đã có lỗi xảy ra khi tải dữ liệu.')
    } finally {
      setLoading(false)
    }
  }

  const filteredOrders = useMemo(() => {
    const keyword = searchValue.trim().toLowerCase()

    return orders.filter((order) => {
      const matchesTab = activeTab === 'all' || order.type === activeTab
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter
      const matchesKeyword = !keyword || [
        order.orderCode,
        order.id,
        displayCode(order),
        ...order.items.map((item) => item.name),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(keyword)

      return matchesTab && matchesStatus && matchesKeyword
    })
  }, [activeTab, orders, searchValue, statusFilter])

  const handleOrderAction = (order, actionKey) => {
    if (actionKey !== 'reorder') return
    if (order?.type !== 'buy') return

    const buyItems = Array.isArray(order?.items) ? order.items : []
    if (!buyItems.length) return

    buyItems.forEach((item) => {
      if (!item?.productId) return
      addBuyItem(
        {
          _id: item.productId,
          name: item.name || 'Sản phẩm',
          images: item.image ? [item.image] : [],
          availableQuantity: Math.max(Number(item.quantity || 1), 1),
          baseSalePrice: Number(item.unitPrice || 0),
        },
        {
          color: item.color || 'Mặc định',
          size: item.size || 'FREE SIZE',
          salePrice: Number(item.unitPrice || 0),
          quantity: Math.max(Number(item.quantity || 1), 1),
          conditionLevel: item.conditionLevel === 'Used' ? 'Used' : 'New',
        }
      )
    })

    setActionMessage('Đã thêm lại sản phẩm vào giỏ mua')
    setTimeout(() => setActionMessage(''), 1800)
    navigate('/cart')
  }

  if (!authLoading && !isAuthenticated) {
    return (
      <>
        <Header />
        <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#fffdfb_0%,#f8fafc_45%,#f8fafc_100%)] px-4">
          <div className="text-center">
            <p className="mb-4 text-slate-600">Vui lòng đăng nhập để xem lịch sử đơn hàng.</p>
            <Link to="/login" className="font-medium text-slate-900 hover:underline">
              Đăng nhập
            </Link>
          </div>
        </div>
      </>
    )
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fffdfb_0%,#f8fafc_45%,#f8fafc_100%)]">
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-8 md:px-6 lg:px-8 lg:py-10">
        <section className="relative overflow-hidden rounded-[36px] border border-white/70 bg-[radial-gradient(circle_at_top_left,_rgba(244,114,182,0.12),_transparent_26%),radial-gradient(circle_at_top_right,_rgba(15,23,42,0.10),_transparent_28%),linear-gradient(135deg,_rgba(255,255,255,0.98),_rgba(248,250,252,0.94))] px-6 py-8 shadow-[0_30px_120px_rgba(15,23,42,0.08)] md:px-8 lg:px-10">
          <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-pink-100/60 blur-3xl"></div>
          <div className="absolute bottom-0 left-10 h-32 w-32 rounded-full bg-slate-200/70 blur-3xl"></div>

          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-medium text-slate-600 shadow-sm">
                <ShoppingBag className="h-4 w-4" />
                INHERE Order Center
              </div>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">
                Lịch sử đơn hàng
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600 md:text-base">
                Theo dõi cả đơn mua và đơn thuê của bạn tại một nơi.
              </p>
            </div>

            <Link
              to="/buy"
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Khám phá bộ sưu tập
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        <div className="mt-6">
          <OrderFilters
            activeTab={activeTab}
            onTabChange={setActiveTab}
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            searchValue={searchValue}
            onSearchChange={setSearchValue}
          />
        </div>

        <section className="mt-6 space-y-5">
          {loading || authLoading ? <LoadingState /> : null}
          {!loading && error ? <ErrorState message={error} /> : null}
          {!loading && !error && filteredOrders.length === 0 ? <EmptyState /> : null}
          {!loading && !error && filteredOrders.length > 0
            ? filteredOrders.map((order) => (
                <OrderCard key={`${order.type}-${order.id}`} order={order} onAction={handleOrderAction} />
              ))
            : null}
        </section>
      </main>

      {actionMessage ? (
        <div className="fixed right-4 top-20 z-50 rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-lg">
          {actionMessage}
        </div>
      ) : null}
    </div>
  )
}
