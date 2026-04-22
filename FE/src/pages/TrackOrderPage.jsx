import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Mail, Search, ShoppingBag } from 'lucide-react'
import Header from '../components/common/Header'
import { getGuestRentOrderApi } from '../services/rent-order.service'
import { createGuestDepositPaymentLinkApi } from '../services/payment.service'

const formatCurrency = (value) => `${Number(value || 0).toLocaleString('vi-VN')}đ`
const formatDate = (value) => {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })
  } catch {
    return String(value)
  }
}

const STATUS_LABEL = {
  Draft: 'Nháp',
  PendingDeposit: 'Chờ đặt cọc',
  Deposited: 'Đã đặt cọc',
  Confirmed: 'Đã xác nhận',
  WaitingPickup: 'Chờ lấy đồ',
  Renting: 'Đang thuê',
  WaitingReturn: 'Chờ trả đồ',
  Returned: 'Đã trả đồ',
  Completed: 'Hoàn tất',
  NoShow: 'Khách không đến',
  Late: 'Trễ hạn',
  Compensation: 'Bồi thường',
  Cancelled: 'Đã hủy',
}

export default function TrackOrderPage() {
  const [searchParams] = useSearchParams()
  const [orderCode, setOrderCode] = useState(() => searchParams.get('orderCode') || '')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [payLoading, setPayLoading] = useState(false)
  const [error, setError] = useState('')
  const [order, setOrder] = useState(null)

  useEffect(() => {
    const code = searchParams.get('orderCode')
    if (code) setOrderCode(code.toUpperCase())
  }, [searchParams])

  const handleLookup = async (event) => {
    event?.preventDefault?.()
    if (!orderCode.trim() || !email.trim()) {
      return setError('Vui lòng nhập đủ mã đơn và email.')
    }
    setError('')
    setOrder(null)
    setLoading(true)
    try {
      const res = await getGuestRentOrderApi(orderCode.trim(), email.trim().toLowerCase())
      setOrder(res?.data || null)
    } catch (err) {
      setError(err?.response?.data?.message || 'Không tìm thấy đơn thuê.')
    } finally {
      setLoading(false)
    }
  }

  const handlePayDeposit = async () => {
    if (!order?._id) return
    setPayLoading(true)
    try {
      const res = await createGuestDepositPaymentLinkApi(order._id, email.trim().toLowerCase())
      const url = res?.data?.paymentUrl
      if (url) window.location.href = url
    } catch (err) {
      setError(err?.response?.data?.message || 'Không thể tạo link thanh toán cọc.')
    } finally {
      setPayLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <Link to="/" className="mb-4 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft className="h-4 w-4" /> Về trang chủ
        </Link>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-900">Tra cứu đơn thuê</h1>
          <p className="mt-1 text-sm text-slate-500">
            Dành cho khách đặt thuê không đăng ký tài khoản. Nhập mã đơn (VD: TH-260323-6ADE) và email bạn đã dùng để xác minh.
          </p>

          <form onSubmit={handleLookup} className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-1">
              <label className="mb-1 block text-sm font-medium text-slate-700">Mã đơn</label>
              <div className="flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2 focus-within:border-sky-400">
                <ShoppingBag className="h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={orderCode}
                  onChange={(e) => setOrderCode(e.target.value.toUpperCase())}
                  placeholder="TH-YYMMDD-XXXX"
                  className="w-full bg-transparent text-sm outline-none"
                />
              </div>
            </div>
            <div className="sm:col-span-1">
              <label className="mb-1 block text-sm font-medium text-slate-700">Email đã xác minh</label>
              <div className="flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2 focus-within:border-sky-400">
                <Mail className="h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full bg-transparent text-sm outline-none"
                />
              </div>
            </div>
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-full bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Search className="h-4 w-4" /> {loading ? 'Đang tra cứu...' : 'Tra cứu'}
              </button>
            </div>
          </form>

          {error ? <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</p> : null}
        </div>

        {order ? (
          <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Mã đơn</p>
                <p className="text-lg font-semibold text-slate-900">{order.orderCode || order._id}</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                {STATUS_LABEL[order.status] || order.status}
              </span>
            </div>

            <div className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
              <div>
                <span className="block text-xs text-slate-400">Ngày thuê</span>
                <span>{formatDate(order.rentStartDate)} → {formatDate(order.rentEndDate)}</span>
              </div>
              <div>
                <span className="block text-xs text-slate-400">Tạo lúc</span>
                <span>{formatDate(order.createdAt)}</span>
              </div>
              <div>
                <span className="block text-xs text-slate-400">Tổng tiền</span>
                <span className="font-semibold text-slate-900">{formatCurrency(order.totalAmount)}</span>
              </div>
              <div>
                <span className="block text-xs text-slate-400">Đặt cọc</span>
                <span className="font-semibold text-slate-900">{formatCurrency(order.depositAmount)}</span>
              </div>
            </div>

            {Array.isArray(order.items) && order.items.length > 0 ? (
              <div className="mt-5">
                <p className="mb-2 text-sm font-semibold text-slate-800">Sản phẩm</p>
                <ul className="space-y-2">
                  {order.items.map((item) => (
                    <li key={item._id} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/50 px-3 py-2 text-sm">
                      <div>
                        <p className="font-medium text-slate-800">{item?.productInstanceId?.productId?.name || 'Sản phẩm'}</p>
                        <p className="text-xs text-slate-500">
                          {item.size ? `Size ${item.size}` : ''}{item.color ? ` · ${item.color}` : ''}
                        </p>
                      </div>
                      <span className="text-slate-700">{formatCurrency(item.finalPrice || item.baseRentPrice)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {order.status === 'PendingDeposit' ? (
              <button
                type="button"
                onClick={handlePayDeposit}
                disabled={payLoading}
                className="mt-6 w-full rounded-full bg-sky-600 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {payLoading ? 'Đang tạo link...' : `Thanh toán cọc ${formatCurrency(order.depositAmount)}`}
              </button>
            ) : null}
          </div>
        ) : null}
      </main>
    </div>
  )
}
