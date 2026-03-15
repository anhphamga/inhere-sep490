import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, CreditCard, Minus, Package, Plus, ShoppingBag, Sparkles, Trash2 } from 'lucide-react'
import Header from '../components/common/Header'
import { useAuth } from '../hooks/useAuth'
import { useRentalCart } from '../contexts/RentalCartContext'
import { useBuyCart } from '../contexts/BuyCartContext'
import { createRentOrderApi, payDepositApi } from '../services/rent-order.service'

const ORDER_STORAGE_KEY = 'inhere_buy_orders'

const formatCurrency = (value) => `${Number(value || 0).toLocaleString('vi-VN')}đ`

const calculateDays = (startDate, endDate) => {
  if (!startDate || !endDate) return 0
  const start = new Date(startDate)
  const end = new Date(endDate)
  const diffTime = Math.abs(end - start)
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1 || 1
}

const getStoredOrders = () => {
  try {
    const stored = localStorage.getItem(ORDER_STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function EmptyState() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#fdf2f8,_#f8fafc_55%)]">
      <Header />
      <div className="mx-auto flex min-h-[calc(100vh-140px)] max-w-3xl items-center justify-center px-4 py-12">
        <div className="w-full rounded-[28px] border border-white/70 bg-white/90 p-10 text-center shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
          <ShoppingBag className="mx-auto mb-5 h-16 w-16 text-rose-300" />
          <h1 className="text-3xl font-semibold text-slate-900">Giỏ hàng đang trống</h1>
          <p className="mt-3 text-slate-500">
            Thêm sản phẩm thuê hoặc mua để xem tổng quan đơn hàng ở một nơi.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link to="/buy" className="rounded-full bg-rose-600 px-6 py-3 font-semibold text-white transition hover:bg-rose-700">
              Khám phá sản phẩm
            </Link>
            <Link to="/booking" className="rounded-full border border-slate-200 px-6 py-3 font-semibold text-slate-700 transition hover:bg-slate-50">
              Đặt lịch thử đồ
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function SectionHeader({ icon: Icon, title, count, tone }) {
  return (
    <div className="flex items-center gap-3">
      <span className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${tone}`}>
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
        <p className="text-sm text-slate-500">{count} sản phẩm</p>
      </div>
    </div>
  )
}

export default function CartPage() {
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuth()
  const { items: rentalItems, clearCart: clearRentalCart, removeItem: removeRentalItem } = useRentalCart()
  const {
    items: buyItems,
    totalAmount: buySubtotal,
    updateQuantity: updateBuyQuantity,
    removeItem: removeBuyItem,
    clearCart: clearBuyCart
  } = useBuyCart()

  const [rentalPaymentMethod, setRentalPaymentMethod] = useState('Cash')
  const [rentalLoading, setRentalLoading] = useState(false)
  const [rentalError, setRentalError] = useState('')
  const [buyLoading, setBuyLoading] = useState(false)
  const [buyError, setBuyError] = useState('')
  const [buySuccess, setBuySuccess] = useState('')
  const [buyForm, setBuyForm] = useState({
    name: '',
    phone: '',
    address: '',
    paymentMethod: 'COD',
    note: ''
  })

  useEffect(() => {
    setBuyForm((prev) => ({
      ...prev,
      name: user?.name || prev.name,
      phone: user?.phone || prev.phone,
      address: user?.address || prev.address
    }))
  }, [user?.address, user?.name, user?.phone])

  const rentalItemsWithTotal = useMemo(
    () =>
      rentalItems.map((item) => {
        const days = calculateDays(item.rentStartDate, item.rentEndDate)
        const subtotal = Number(item.rentPrice || 0) * days
        return { ...item, days, subtotal }
      }),
    [rentalItems]
  )

  const rentalTotalAmount = useMemo(
    () => rentalItemsWithTotal.reduce((sum, item) => sum + item.subtotal, 0),
    [rentalItemsWithTotal]
  )
  const rentalDepositAmount = Math.round(rentalTotalAmount * 0.5)
  const rentalRemainingAmount = rentalTotalAmount - rentalDepositAmount
  const buyShippingFee = useMemo(() => (buyItems.length > 0 ? 30000 : 0), [buyItems.length])
  const buyGrandTotal = buySubtotal + buyShippingFee
  const combinedCount = rentalItems.length + buyItems.length
  const combinedTotal = rentalDepositAmount + buyGrandTotal

  const handleRentalCheckout = async () => {
    if (!isAuthenticated) {
      navigate('/login?redirect=/cart')
      return
    }
    if (rentalItems.length === 0) {
      setRentalError('Giỏ thuê đang trống')
      return
    }

    const itemsWithoutDates = rentalItems.filter((item) => !item.rentStartDate || !item.rentEndDate)
    if (itemsWithoutDates.length > 0) {
      setRentalError('Vui lòng chọn ngày thuê cho tất cả sản phẩm')
      return
    }

    setRentalLoading(true)
    setRentalError('')

    try {
      const items = rentalItems.map((item) => ({
        productInstanceId: item.productInstanceId,
        productId: item.productId,
        baseRentPrice: item.rentPrice,
        finalPrice: item.rentPrice,
        size: item.size,
        color: item.color,
        rentStartDate: item.rentStartDate,
        rentEndDate: item.rentEndDate
      }))

      const response = await createRentOrderApi({
        rentStartDate: rentalItems[0].rentStartDate,
        rentEndDate: rentalItems[rentalItems.length - 1].rentEndDate,
        items,
        depositAmount: rentalDepositAmount,
        remainingAmount: rentalRemainingAmount,
        totalAmount: rentalTotalAmount
      })

      if (response.success) {
        clearRentalCart()
        const orderId = response.data._id
        const payment = await payDepositApi(orderId, { method: rentalPaymentMethod })
        if (payment.success) {
          navigate(`/rental/${orderId}`)
        }
      }
    } catch (err) {
      setRentalError(err.response?.data?.message || 'Có lỗi xảy ra khi tạo đơn thuê')
    } finally {
      setRentalLoading(false)
    }
  }

  const handleBuyCheckout = async () => {
    if (!isAuthenticated) {
      navigate('/login?redirect=/cart')
      return
    }
    if (buyItems.length === 0) {
      setBuyError('Giỏ mua đang trống')
      return
    }
    if (!buyForm.name.trim() || !buyForm.phone.trim() || !buyForm.address.trim()) {
      setBuyError('Vui lòng nhập đầy đủ tên, số điện thoại và địa chỉ nhận hàng')
      return
    }

    setBuyLoading(true)
    setBuyError('')

    try {
      const orderCode = `BUY-${Date.now()}`
      const nextOrder = {
        id: orderCode,
        createdAt: new Date().toISOString(),
        customerId: user?.id || null,
        customerName: buyForm.name.trim(),
        shippingPhone: buyForm.phone.trim(),
        shippingAddress: buyForm.address.trim(),
        paymentMethod: buyForm.paymentMethod,
        note: buyForm.note.trim(),
        items: buyItems,
        totalAmount: buySubtotal,
        shippingFee: buyShippingFee,
        grandTotal: buyGrandTotal,
        status: 'PendingConfirmation'
      }

      const orders = getStoredOrders()
      localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify([nextOrder, ...orders]))
      clearBuyCart()
      setBuySuccess(`Đã ghi nhận đơn mua ${orderCode}. Cửa hàng sẽ liên hệ xác nhận sớm.`)
    } catch {
      setBuyError('Không thể tạo đơn mua. Vui lòng thử lại.')
    } finally {
      setBuyLoading(false)
    }
  }

  if (combinedCount === 0) {
    return <EmptyState />
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fff7ed_0%,#f8fafc_26%,#f8fafc_100%)]">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-6 md:px-6 lg:py-8">
        <div className="rounded-[30px] border border-white/70 bg-white/80 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur lg:p-8">
          <div className="flex flex-col gap-5 border-b border-slate-100 pb-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <Link to="/buy" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-800">
                <ArrowLeft className="h-4 w-4" />
                Tiếp tục chọn sản phẩm
              </Link>
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">
                  <Sparkles className="h-3.5 w-3.5" />
                  Cart Center
                </div>
                <h1 className="text-3xl font-semibold tracking-tight text-slate-950 lg:text-4xl">
                  Một giỏ hàng cho cả thuê và mua
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 lg:text-base">
                  Theo dõi toàn bộ sản phẩm, chi phí đặt cọc thuê và thanh toán đơn mua trên cùng một giao diện.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-rose-500">Tổng mục</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{combinedCount}</p>
              </div>
              <div className="rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-sky-500">Đặt cọc thuê</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{formatCurrency(rentalDepositAmount)}</p>
              </div>
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-500">Cần thanh toán</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{formatCurrency(combinedTotal)}</p>
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.85fr)]">
            <section className="space-y-8">
              {rentalItems.length > 0 && (
                <div className="rounded-[28px] border border-sky-100 bg-sky-50/40 p-5 lg:p-6">
                  <SectionHeader icon={CreditCard} title="Giỏ thuê" count={rentalItems.length} tone="bg-sky-100 text-sky-700" />
                  <div className="mt-5 space-y-4">
                    {rentalItemsWithTotal.map((item) => (
                      <article key={item.id} className="rounded-3xl border border-white bg-white p-4 shadow-sm">
                        <div className="flex flex-col gap-4 sm:flex-row">
                          <img src={item.image} alt={item.name} className="h-28 w-24 rounded-2xl bg-slate-100 object-cover sm:h-32 sm:w-28" />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="min-w-0">
                                <h3 className="text-lg font-semibold text-slate-900">{item.name}</h3>
                                <p className="mt-1 text-sm text-slate-500">Size {item.size} • Màu {item.color}</p>
                              </div>
                              <button type="button" onClick={() => removeRentalItem(item.id)} className="inline-flex h-10 w-10 items-center justify-center rounded-2xl text-rose-500 transition hover:bg-rose-50">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                            <div className="mt-4 grid gap-3 md:grid-cols-3">
                              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Lịch thuê</p>
                                <p className="mt-1 text-sm font-medium text-slate-700">
                                  {new Date(item.rentStartDate).toLocaleDateString('vi-VN')} {item.rentStartDate.includes('T') ? new Date(item.rentStartDate).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : ''}
                                  {' - '}
                                  {new Date(item.rentEndDate).toLocaleDateString('vi-VN')} {item.rentEndDate.includes('T') ? new Date(item.rentEndDate).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : ''}
                                </p>
                              </div>
                              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Số ngày</p>
                                <p className="mt-1 text-sm font-medium text-slate-700">{item.days} ngày</p>
                              </div>
                              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Đơn giá thuê</p>
                                <p className="mt-1 text-sm font-medium text-slate-700">{formatCurrency(item.rentPrice)}/ngày</p>
                              </div>
                            </div>
                          </div>
                          <div className="sm:w-40 sm:border-l sm:border-slate-100 sm:pl-4">
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Tạm tính</p>
                            <p className="mt-2 text-xl font-semibold text-sky-700">{formatCurrency(item.subtotal)}</p>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              )}

              {buyItems.length > 0 && (
                <div className="rounded-[28px] border border-rose-100 bg-rose-50/40 p-5 lg:p-6">
                  <SectionHeader icon={Package} title="Giỏ mua" count={buyItems.length} tone="bg-rose-100 text-rose-700" />
                  <div className="mt-5 space-y-4">
                    {buyItems.map((item) => (
                      <article key={item.id} className="rounded-3xl border border-white bg-white p-4 shadow-sm">
                        <div className="flex flex-col gap-4 sm:flex-row">
                          <img src={item.image} alt={item.name} className="h-28 w-24 rounded-2xl bg-slate-100 object-cover sm:h-32 sm:w-28" />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="min-w-0">
                                <h3 className="text-lg font-semibold text-slate-900">{item.name}</h3>
                                <p className="mt-1 text-sm text-slate-500">Size {item.size} • Màu {item.color}</p>
                              </div>
                              <button type="button" onClick={() => removeBuyItem(item.id)} className="inline-flex h-10 w-10 items-center justify-center rounded-2xl text-rose-500 transition hover:bg-rose-50">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                              <div className="inline-flex items-center rounded-2xl border border-slate-200 bg-white">
                                <button type="button" onClick={() => updateBuyQuantity(item.id, Math.max(Number(item.quantity || 1) - 1, 1))} className="p-3 text-slate-600 transition hover:bg-slate-50">
                                  <Minus className="h-4 w-4" />
                                </button>
                                <span className="min-w-12 text-center font-semibold text-slate-800">{item.quantity}</span>
                                <button type="button" onClick={() => updateBuyQuantity(item.id, Number(item.quantity || 1) + 1)} className="p-3 text-slate-600 transition hover:bg-slate-50">
                                  <Plus className="h-4 w-4" />
                                </button>
                              </div>
                              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-right">
                                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Đơn giá</p>
                                <p className="mt-1 text-sm font-medium text-slate-600">{formatCurrency(item.salePrice)}</p>
                              </div>
                            </div>
                          </div>
                          <div className="sm:w-40 sm:border-l sm:border-slate-100 sm:pl-4">
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Thành tiền</p>
                            <p className="mt-2 text-xl font-semibold text-rose-700">{formatCurrency(item.salePrice * item.quantity)}</p>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              )}
            </section>

            <aside className="space-y-5 xl:sticky xl:top-24 xl:self-start">
              {rentalItems.length > 0 && (
                <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-slate-900">Thanh toán đơn thuê</h3>
                  <div className="mt-5 space-y-3 text-sm">
                    <div className="flex justify-between text-slate-500"><span>Tạm tính</span><span>{formatCurrency(rentalTotalAmount)}</span></div>
                    <div className="flex justify-between text-slate-500"><span>Còn lại tại cửa hàng</span><span>{formatCurrency(rentalRemainingAmount)}</span></div>
                    <div className="flex justify-between border-t border-slate-100 pt-3 text-base font-semibold text-slate-900"><span>Đặt cọc 50%</span><span className="text-sky-700">{formatCurrency(rentalDepositAmount)}</span></div>
                  </div>
                  <div className="mt-5 space-y-2">
                    <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
                      <input type="radio" name="rentalPaymentMethod" value="Cash" checked={rentalPaymentMethod === 'Cash'} onChange={(event) => setRentalPaymentMethod(event.target.value)} />
                      Tiền mặt tại cửa hàng
                    </label>
                    <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
                      <input type="radio" name="rentalPaymentMethod" value="Online" checked={rentalPaymentMethod === 'Online'} onChange={(event) => setRentalPaymentMethod(event.target.value)} />
                      Chuyển khoản online
                    </label>
                  </div>
                  {rentalError && <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">{rentalError}</p>}
                  <button type="button" onClick={handleRentalCheckout} disabled={rentalLoading} className="mt-5 w-full rounded-full bg-sky-600 px-5 py-3 font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300">
                    {rentalLoading ? 'Đang xử lý...' : `Đặt cọc ${formatCurrency(rentalDepositAmount)}`}
                  </button>
                </div>
              )}

              {buyItems.length > 0 && (
                <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-slate-900">Xác nhận đơn mua</h3>
                  {buySuccess ? (
                    <div className="mt-5 rounded-3xl border border-emerald-100 bg-emerald-50 p-5">
                      <p className="font-semibold text-emerald-800">Đặt mua thành công</p>
                      <p className="mt-2 text-sm leading-6 text-emerald-700">{buySuccess}</p>
                    </div>
                  ) : (
                    <>
                      <div className="mt-5 space-y-3">
                        <input type="text" value={buyForm.name} onChange={(event) => setBuyForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="Họ và tên" className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-rose-300" />
                        <input type="tel" value={buyForm.phone} onChange={(event) => setBuyForm((prev) => ({ ...prev, phone: event.target.value }))} placeholder="Số điện thoại" className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-rose-300" />
                        <textarea value={buyForm.address} onChange={(event) => setBuyForm((prev) => ({ ...prev, address: event.target.value }))} placeholder="Địa chỉ nhận hàng" rows={3} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-rose-300" />
                        <select value={buyForm.paymentMethod} onChange={(event) => setBuyForm((prev) => ({ ...prev, paymentMethod: event.target.value }))} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-rose-300">
                          <option value="COD">Thanh toán khi nhận hàng</option>
                          <option value="BankTransfer">Chuyển khoản</option>
                        </select>
                        <textarea value={buyForm.note} onChange={(event) => setBuyForm((prev) => ({ ...prev, note: event.target.value }))} placeholder="Ghi chú đơn hàng" rows={2} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-rose-300" />
                      </div>
                      <div className="mt-5 space-y-3 text-sm">
                        <div className="flex justify-between text-slate-500"><span>Tạm tính</span><span>{formatCurrency(buySubtotal)}</span></div>
                        <div className="flex justify-between text-slate-500"><span>Phí vận chuyển</span><span>{formatCurrency(buyShippingFee)}</span></div>
                        <div className="flex justify-between border-t border-slate-100 pt-3 text-base font-semibold text-slate-900"><span>Tổng thanh toán</span><span className="text-rose-700">{formatCurrency(buyGrandTotal)}</span></div>
                      </div>
                      {buyError && <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">{buyError}</p>}
                      <button type="button" onClick={handleBuyCheckout} disabled={buyLoading} className="mt-5 w-full rounded-full bg-rose-600 px-5 py-3 font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-slate-300">
                        {buyLoading ? 'Đang xử lý...' : `Xác nhận mua ${formatCurrency(buyGrandTotal)}`}
                      </button>
                    </>
                  )}
                </div>
              )}
            </aside>
          </div>
        </div>
      </main>
    </div>
  )
}
