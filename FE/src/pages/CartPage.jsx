import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  CreditCard,
  Lock,
  Mail,
  MapPin,
  Minus,
  Package,
  Phone,
  Plus,
  ShoppingBag,
  Sparkles,
  Trash2,
  User
} from 'lucide-react'
import Header from '../components/common/Header'
import GuestVerificationModal from '../components/cart/GuestVerificationModal'
import { useAuth } from '../hooks/useAuth'
import { useRentalCart } from '../contexts/RentalCartContext'
import { useBuyCart } from '../contexts/BuyCartContext'
import { createRentOrderApi, payDepositApi } from '../services/rent-order.service'
import { checkoutApi, guestCheckoutApi } from '../services/order.service'
import { ADDRESS_DATA } from '../constants/addressData'

const PHONE_REGEX = /^(0|\+84)[0-9]{9,10}$/
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const ADDRESS_HISTORY_KEY = 'inhere_checkout_address_history'
const MAX_ADDRESS_HISTORY = 5

const PAYMENT_OPTIONS = [
  {
    value: 'COD',
    title: 'Thanh toán khi nhận hàng',
    description: 'Phù hợp khi bạn muốn kiểm tra đơn trước khi thanh toán.'
  },
  {
    value: 'BankTransfer',
    title: 'Chuyển khoản',
    description: 'Thuận tiện cho đơn giao liên tỉnh và khách ở xa.'
  }
]

const formatCurrency = (value) => `${Number(value || 0).toLocaleString('vi-VN')}đ`

const calculateDays = (startDate, endDate) => {
  if (!startDate || !endDate) return 0
  const start = new Date(startDate)
  const end = new Date(endDate)
  const diffTime = Math.abs(end - start)
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1 || 1
}

const normalizePhoneInput = (value = '') => value.replace(/\s+/g, '').trim()

const getStoredAddressHistory = () => {
  try {
    const raw = localStorage.getItem(ADDRESS_HISTORY_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const saveAddressHistory = (entry) => {
  if (!entry?.province || !entry?.district || !entry?.ward || !entry?.detailedAddress) {
    return
  }

  const existing = getStoredAddressHistory()
  const next = [
    entry,
    ...existing.filter((item) => !(
      item.province === entry.province &&
      item.district === entry.district &&
      item.ward === entry.ward &&
      item.detailedAddress === entry.detailedAddress &&
      item.hotel === entry.hotel
    ))
  ].slice(0, MAX_ADDRESS_HISTORY)

  localStorage.setItem(ADDRESS_HISTORY_KEY, JSON.stringify(next))
}

const buildShippingAddress = (form) => {
  const parts = [
    form.detailedAddress?.trim(),
    form.ward?.trim(),
    form.district?.trim(),
    form.province?.trim()
  ].filter(Boolean)

  if (form.hotel?.trim()) {
    parts.splice(1, 0, `Hotel/Homestay: ${form.hotel.trim()}`)
  }

  return parts.join(', ')
}

const validateBuyForm = (form) => {
  const errors = {}
  if (!form.name.trim()) errors.name = 'Vui lòng nhập họ và tên.'
  if (!PHONE_REGEX.test(normalizePhoneInput(form.phone))) errors.phone = 'Số điện thoại chưa hợp lệ.'
  if (!EMAIL_REGEX.test(String(form.email || '').trim().toLowerCase())) errors.email = 'Email chưa hợp lệ.'
  if (!form.province) errors.province = 'Chọn tỉnh/thành phố.'
  if (!form.district) errors.district = 'Chọn quận/huyện.'
  if (!form.ward) errors.ward = 'Chọn phường/xã.'
  if (!form.detailedAddress.trim()) errors.detailedAddress = 'Nhập địa chỉ chi tiết.'
  return errors
}

function EmptyState() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#fdf2f8,_#f8fafc_55%)]">
      <Header />
      <div className="mx-auto flex min-h-[calc(100vh-140px)] max-w-3xl items-center justify-center px-4 py-12">
        <div className="w-full rounded-[28px] border border-white/70 bg-white/90 p-10 text-center shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
          <ShoppingBag className="mx-auto mb-5 h-16 w-16 text-rose-300" />
          <h1 className="text-3xl font-semibold text-slate-900">Giỏ hàng đang trống</h1>
          <p className="mt-3 text-slate-500">Thêm sản phẩm thuê hoặc mua để xem tổng quan đơn hàng ở một nơi.</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link to="/buy" className="rounded-full bg-rose-600 px-6 py-3 font-semibold text-white transition hover:bg-rose-700">Khám phá sản phẩm</Link>
            <Link to="/booking" className="rounded-full border border-slate-200 px-6 py-3 font-semibold text-slate-700 transition hover:bg-slate-50">Đặt lịch thử đồ</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function CheckoutTopBar({ combinedCount, combinedTotal }) {
  return (
    <div className="sticky top-0 z-30 border-b border-white/60 bg-[linear-gradient(135deg,rgba(255,247,237,0.94),rgba(255,255,255,0.96))] backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 md:px-6">
        <div className="min-w-0">
          <Link to="/buy" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-800">
            <ArrowLeft className="h-4 w-4" />
            Quay lại mua sắm
          </Link>
          <div className="mt-2 flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-600 text-white shadow-sm">
              <Lock className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-rose-500">Secure checkout</p>
              <h1 className="truncate text-lg font-semibold text-slate-950 sm:text-xl">Hoàn tất đơn hàng INHERE</h1>
            </div>
          </div>
        </div>

        <div className="hidden rounded-2xl border border-rose-100 bg-white/80 px-4 py-3 text-right shadow-sm sm:block">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Đơn hiện tại</p>
          <p className="mt-1 text-sm font-medium text-slate-600">{combinedCount} sản phẩm</p>
          <p className="mt-1 text-lg font-semibold text-slate-950">{formatCurrency(combinedTotal)}</p>
        </div>
      </div>
    </div>
  )
}

function SectionHeader({ icon, title, count, tone }) {
  const IconComponent = icon
  return (
    <div className="flex items-center gap-3">
      <span className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${tone}`}>
        <IconComponent className="h-5 w-5" />
      </span>
      <div>
        <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
        <p className="text-sm text-slate-500">{count} sản phẩm</p>
      </div>
    </div>
  )
}

function CheckoutSection({ icon, title, subtitle, children }) {
  const IconComponent = icon
  return (
    <section className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-rose-500 shadow-sm">
          <IconComponent className="h-4 w-4" />
        </span>
        <div>
          <h4 className="text-base font-semibold text-slate-900">{title}</h4>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        </div>
      </div>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  )
}

function FieldError({ message }) {
  if (!message) return null
  return <p className="mt-2 text-xs font-medium text-rose-600">{message}</p>
}

function SummaryRow({ label, value, emphasized = false }) {
  return (
    <div className={`flex items-center justify-between gap-4 ${emphasized ? 'text-base font-semibold text-slate-950' : 'text-sm text-slate-500'}`}>
      <span>{label}</span>
      <span className={emphasized ? 'text-rose-700' : 'text-slate-700'}>{value}</span>
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
  const [buyFieldErrors, setBuyFieldErrors] = useState({})
  const [addressHistory, setAddressHistory] = useState(() => getStoredAddressHistory())
  const [guestVerificationOpen, setGuestVerificationOpen] = useState(false)
  const [pendingGuestCheckout, setPendingGuestCheckout] = useState(null)
  const [guestVerificationSession, setGuestVerificationSession] = useState(null)
  const [buyForm, setBuyForm] = useState({
    name: '',
    phone: '',
    email: '',
    province: 'Quảng Nam',
    district: 'Thành phố Hội An',
    ward: 'Cẩm Phô',
    detailedAddress: '',
    hotel: '',
    paymentMethod: 'COD',
    note: ''
  })

  useEffect(() => {
    setBuyForm((prev) => ({
      ...prev,
      name: user?.name || prev.name,
      phone: user?.phone || prev.phone,
      email: user?.email || prev.email,
      detailedAddress: user?.address || prev.detailedAddress
    }))
  }, [user?.address, user?.email, user?.name, user?.phone])

  useEffect(() => {
    if (isAuthenticated) {
      setGuestVerificationSession(null)
      setGuestVerificationOpen(false)
      setPendingGuestCheckout(null)
    }
  }, [isAuthenticated])

  const selectedProvince = useMemo(
    () => ADDRESS_DATA.find((item) => item.province === buyForm.province) || ADDRESS_DATA[0],
    [buyForm.province]
  )
  const districtOptions = useMemo(() => selectedProvince?.districts || [], [selectedProvince])
  const selectedDistrict = useMemo(
    () => districtOptions.find((item) => item.district === buyForm.district) || districtOptions[0],
    [buyForm.district, districtOptions]
  )
  const wardOptions = useMemo(() => selectedDistrict?.wards || [], [selectedDistrict])

  useEffect(() => {
    if (!districtOptions.some((item) => item.district === buyForm.district)) {
      setBuyForm((prev) => ({
        ...prev,
        district: districtOptions[0]?.district || '',
        ward: districtOptions[0]?.wards?.[0] || ''
      }))
    }
  }, [buyForm.district, districtOptions])

  useEffect(() => {
    if (wardOptions.length > 0 && !wardOptions.includes(buyForm.ward)) {
      setBuyForm((prev) => ({ ...prev, ward: wardOptions[0] || '' }))
    }
  }, [buyForm.ward, wardOptions])

  const rentalItemsWithTotal = useMemo(
    () => rentalItems.map((item) => {
      const days = calculateDays(item.rentStartDate, item.rentEndDate)
      const subtotal = Number(item.rentPrice || 0) * days
      return { ...item, days, subtotal }
    }),
    [rentalItems]
  )

  const rentalTotalAmount = useMemo(() => rentalItemsWithTotal.reduce((sum, item) => sum + item.subtotal, 0), [rentalItemsWithTotal])
  const rentalDepositAmount = Math.round(rentalTotalAmount * 0.5)
  const rentalRemainingAmount = rentalTotalAmount - rentalDepositAmount
  const buyShippingFee = useMemo(() => (buyItems.length > 0 ? 30000 : 0), [buyItems.length])
  const buyGrandTotal = buySubtotal + buyShippingFee
  const combinedCount = rentalItems.length + buyItems.length
  const combinedTotal = rentalDepositAmount + buyGrandTotal
  const addressPreview = useMemo(() => buildShippingAddress(buyForm), [buyForm])

  const addressSuggestions = useMemo(() => {
    const keyword = `${buyForm.detailedAddress} ${buyForm.hotel}`.trim().toLowerCase()
    return addressHistory.filter((entry) => {
      const haystack = `${entry.detailedAddress} ${entry.hotel} ${entry.ward} ${entry.district} ${entry.province}`.toLowerCase()
      const sameLocality = (!buyForm.province || entry.province === buyForm.province) && (!buyForm.district || entry.district === buyForm.district)
      if (!keyword) return sameLocality
      return sameLocality && haystack.includes(keyword)
    }).slice(0, 3)
  }, [addressHistory, buyForm.detailedAddress, buyForm.district, buyForm.hotel, buyForm.province])

  const handleBuyFieldChange = (field, value) => {
    setBuyForm((prev) => ({ ...prev, [field]: value }))
    setBuyFieldErrors((prev) => {
      if (!prev[field]) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  const handleProvinceChange = (value) => {
    const province = ADDRESS_DATA.find((item) => item.province === value)
    const firstDistrict = province?.districts?.[0]
    setBuyForm((prev) => ({
      ...prev,
      province: value,
      district: firstDistrict?.district || '',
      ward: firstDistrict?.wards?.[0] || ''
    }))
  }

  const handleDistrictChange = (value) => {
    const district = districtOptions.find((item) => item.district === value)
    setBuyForm((prev) => ({
      ...prev,
      district: value,
      ward: district?.wards?.[0] || ''
    }))
  }

  const handleApplySuggestion = (suggestion) => {
    setBuyForm((prev) => ({
      ...prev,
      province: suggestion.province,
      district: suggestion.district,
      ward: suggestion.ward,
      detailedAddress: suggestion.detailedAddress,
      hotel: suggestion.hotel || ''
    }))
  }

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

  const handleBuyCheckout = async ({ skipGuestVerification = false, session = guestVerificationSession } = {}) => {
    if (!isAuthenticated && !skipGuestVerification && !session?.verificationToken) {
      setPendingGuestCheckout('buy')
      setGuestVerificationOpen(true)
      return
    }

    if (buyItems.length === 0) {
      setBuyError('Giỏ mua đang trống')
      return
    }

    const validationErrors = validateBuyForm(buyForm)
    if (Object.keys(validationErrors).length > 0) {
      setBuyFieldErrors(validationErrors)
      setBuyError('Vui lòng hoàn thiện đầy đủ thông tin giao hàng.')
      return
    }

    const payload = {
      name: buyForm.name.trim(),
      phone: normalizePhoneInput(buyForm.phone),
      email: buyForm.email.trim().toLowerCase(),
      address: addressPreview,
      paymentMethod: buyForm.paymentMethod,
      note: buyForm.note.trim(),
      shippingFee: buyShippingFee,
      items: buyItems.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        size: item.size,
        color: item.color,
        salePrice: item.salePrice
      }))
    }

    setBuyLoading(true)
    setBuyError('')
    setBuyFieldErrors({})

    try {
      const response = !isAuthenticated
        ? await guestCheckoutApi({ verificationToken: session?.verificationToken, ...payload })
        : await checkoutApi(payload)

      clearBuyCart()
      if (!isAuthenticated) {
        setGuestVerificationSession(null)
      }

      const historyEntry = {
        province: buyForm.province,
        district: buyForm.district,
        ward: buyForm.ward,
        detailedAddress: buyForm.detailedAddress.trim(),
        hotel: buyForm.hotel.trim()
      }

      saveAddressHistory(historyEntry)
      setAddressHistory(getStoredAddressHistory())
      setBuySuccess(`Đã ghi nhận đơn mua ${String(response.data?.orderId || '').slice(-8)}. Cửa hàng sẽ liên hệ xác nhận sớm.`)
    } catch (err) {
      setBuyError(err.response?.data?.message || 'Không thể tạo đơn mua. Vui lòng thử lại.')

      if (!isAuthenticated && err.response?.status === 401) {
        setGuestVerificationSession(null)
        setPendingGuestCheckout('buy')
        setGuestVerificationOpen(true)
      }
    } finally {
      setBuyLoading(false)
    }
  }

  if (combinedCount === 0) {
    return <EmptyState />
  }

  const guestVerificationMethodLabel = guestVerificationSession?.guestVerification?.phoneVerified ? 'số điện thoại' : 'email'

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fff7ed_0%,#f8fafc_18%,#f8fafc_100%)]">
      <CheckoutTopBar combinedCount={combinedCount} combinedTotal={combinedTotal} />
      <main className="mx-auto max-w-7xl px-4 py-5 md:px-6 lg:py-8">
        <div className="rounded-[32px] border border-white/70 bg-white/82 p-4 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur sm:p-5 lg:p-8">
          <div className="grid gap-3 border-b border-slate-100 pb-5 sm:grid-cols-3 lg:pb-6">
            <div className="rounded-2xl border border-rose-100 bg-[linear-gradient(135deg,#fff1f2,#fff7ed)] px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-rose-500">Tổng sản phẩm</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{combinedCount}</p>
            </div>
            <div className="rounded-2xl border border-sky-100 bg-[linear-gradient(135deg,#eff6ff,#f8fafc)] px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-sky-500">Đặt cọc thuê</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{formatCurrency(rentalDepositAmount)}</p>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-[linear-gradient(135deg,#ecfdf5,#f8fafc)] px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-500">Thanh toán hôm nay</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{formatCurrency(combinedTotal)}</p>
            </div>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.28fr)_minmax(350px,0.82fr)] lg:mt-8">
            <section className="space-y-8">
              {rentalItems.length > 0 && (
                <div className="rounded-[28px] border border-sky-100 bg-[linear-gradient(180deg,rgba(239,246,255,0.75),rgba(255,255,255,0.95))] p-5 lg:p-6">
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
                                  {new Date(item.rentStartDate).toLocaleDateString('vi-VN')} - {new Date(item.rentEndDate).toLocaleDateString('vi-VN')}
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
                <div className="rounded-[28px] border border-rose-100 bg-[linear-gradient(180deg,rgba(255,241,242,0.76),rgba(255,255,255,0.96))] p-5 lg:p-6">
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

                  <div className="mt-6 border-t border-rose-100 pt-6">
                    <div className="border-b border-slate-100 pb-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-rose-500">Checkout</p>
                      <h3 className="mt-2 text-xl font-semibold text-slate-950">Thông tin khách hàng</h3>
                      <p className="mt-1 text-sm leading-6 text-slate-500">
                        Xem sản phẩm trước, rồi điền thông tin nhận hàng để hoàn tất đơn mua.
                      </p>
                    </div>

                    {!buySuccess && !isAuthenticated && (
                      <div className={`mt-5 rounded-2xl border px-4 py-3 text-sm ${guestVerificationSession?.verificationToken ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
                        {guestVerificationSession?.verificationToken
                          ? `Đã xác minh guest bằng ${guestVerificationMethodLabel}.`
                          : 'Bạn cần xác minh bằng số điện thoại hoặc email trước khi thanh toán.'}
                      </div>
                    )}

                    {!buySuccess ? (
                      <div className="mt-5 space-y-5">
                        <CheckoutSection icon={User} title="Customer information" subtitle="Thông tin liên hệ để xác nhận đơn và cập nhật giao hàng.">
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div className="sm:col-span-2">
                              <label className="mb-2 block text-sm font-medium text-slate-700">Họ và tên</label>
                              <input type="text" value={buyForm.name} onChange={(event) => handleBuyFieldChange('name', event.target.value)} placeholder="Ví dụ: Nguyễn Minh Anh" autoComplete="name" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-rose-300" />
                              <FieldError message={buyFieldErrors.name} />
                            </div>
                            <div>
                              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700"><Phone className="h-4 w-4 text-slate-400" />Số điện thoại</label>
                              <input type="tel" value={buyForm.phone} onChange={(event) => handleBuyFieldChange('phone', event.target.value)} placeholder="0901234567" autoComplete="tel" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-rose-300" />
                              <FieldError message={buyFieldErrors.phone} />
                            </div>
                            <div>
                              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700"><Mail className="h-4 w-4 text-slate-400" />Email</label>
                              <input type="email" value={buyForm.email} onChange={(event) => handleBuyFieldChange('email', event.target.value)} placeholder="ban@example.com" autoComplete="email" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-rose-300" />
                              <FieldError message={buyFieldErrors.email} />
                            </div>
                          </div>
                        </CheckoutSection>

                        <CheckoutSection icon={MapPin} title="Shipping address" subtitle="Chọn khu vực bằng dropdown và dùng gợi ý địa chỉ gần đây để điền nhanh hơn.">
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                              <label className="mb-2 block text-sm font-medium text-slate-700">Province / City</label>
                              <select value={buyForm.province} onChange={(event) => handleProvinceChange(event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-rose-300">
                                {ADDRESS_DATA.map((item) => <option key={item.province} value={item.province}>{item.province}</option>)}
                              </select>
                              <FieldError message={buyFieldErrors.province} />
                            </div>
                            <div>
                              <label className="mb-2 block text-sm font-medium text-slate-700">District</label>
                              <select value={buyForm.district} onChange={(event) => handleDistrictChange(event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-rose-300">
                                {districtOptions.map((item) => <option key={item.district} value={item.district}>{item.district}</option>)}
                              </select>
                              <FieldError message={buyFieldErrors.district} />
                            </div>
                            <div className="sm:col-span-2">
                              <label className="mb-2 block text-sm font-medium text-slate-700">Ward</label>
                              <select value={buyForm.ward} onChange={(event) => handleBuyFieldChange('ward', event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-rose-300">
                                {wardOptions.map((ward) => <option key={ward} value={ward}>{ward}</option>)}
                              </select>
                              <FieldError message={buyFieldErrors.ward} />
                            </div>
                            <div className="sm:col-span-2">
                              <label className="mb-2 block text-sm font-medium text-slate-700">Detailed address</label>
                              <input type="text" value={buyForm.detailedAddress} onChange={(event) => handleBuyFieldChange('detailedAddress', event.target.value)} placeholder="Số nhà, tên đường, tòa nhà..." autoComplete="street-address" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-rose-300" />
                              <FieldError message={buyFieldErrors.detailedAddress} />
                            </div>
                            <div className="sm:col-span-2">
                              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700"><Building2 className="h-4 w-4 text-slate-400" />Hotel / Homestay (optional)</label>
                              <input type="text" value={buyForm.hotel} onChange={(event) => handleBuyFieldChange('hotel', event.target.value)} placeholder="Ví dụ: Little Hoi An Boutique Hotel" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-rose-300" />
                            </div>
                          </div>

                          {addressSuggestions.length > 0 && (
                            <div className="rounded-2xl border border-dashed border-rose-200 bg-white px-4 py-4">
                              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-500">Address auto suggestion</p>
                              <div className="mt-3 space-y-2">
                                {addressSuggestions.map((suggestion, index) => (
                                  <button key={`${suggestion.province}-${suggestion.district}-${suggestion.ward}-${index}`} type="button" onClick={() => handleApplySuggestion(suggestion)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-left text-sm text-slate-700 transition hover:border-rose-200 hover:bg-rose-50">
                                    <span className="block font-medium text-slate-900">{suggestion.detailedAddress}</span>
                                    <span className="mt-1 block text-slate-500">{[suggestion.hotel, suggestion.ward, suggestion.district, suggestion.province].filter(Boolean).join(' • ')}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="rounded-2xl bg-white px-4 py-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Địa chỉ giao hàng sẽ lưu</p>
                            <p className="mt-2 text-sm leading-6 text-slate-700">{addressPreview || 'Địa chỉ sẽ hiển thị ở đây sau khi bạn nhập đầy đủ thông tin.'}</p>
                          </div>
                        </CheckoutSection>

                        <CheckoutSection icon={CreditCard} title="Payment method" subtitle="Radio card rõ ràng hơn trên mobile và desktop.">
                          <div className="grid gap-3">
                            {PAYMENT_OPTIONS.map((option) => {
                              const checked = buyForm.paymentMethod === option.value
                              return (
                                <label key={option.value} className={`cursor-pointer rounded-3xl border px-4 py-4 transition ${checked ? 'border-rose-300 bg-[linear-gradient(135deg,#fff1f2,#fff7ed)] shadow-sm' : 'border-slate-200 bg-white hover:border-rose-200 hover:bg-rose-50/50'}`}>
                                  <div className="flex items-start gap-3">
                                    <input type="radio" name="paymentMethod" value={option.value} checked={checked} onChange={(event) => handleBuyFieldChange('paymentMethod', event.target.value)} className="mt-1" />
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <p className="font-semibold text-slate-900">{option.title}</p>
                                        {checked ? <CheckCircle2 className="h-4 w-4 text-rose-500" /> : null}
                                      </div>
                                      <p className="mt-1 text-sm leading-6 text-slate-500">{option.description}</p>
                                    </div>
                                  </div>
                                </label>
                              )
                            })}
                          </div>
                          <div>
                            <label className="mb-2 block text-sm font-medium text-slate-700">Ghi chú đơn hàng</label>
                            <textarea value={buyForm.note} onChange={(event) => handleBuyFieldChange('note', event.target.value)} placeholder="Thêm lưu ý về thời gian nhận, liên hệ lễ tân, hoặc yêu cầu đặc biệt." rows={3} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-rose-300" />
                          </div>
                        </CheckoutSection>
                      </div>
                    ) : null}
                  </div>
                </div>
              )}
            </section>
            <aside className="space-y-5 xl:sticky xl:top-24 xl:self-start">
              {rentalItems.length > 0 && (
                <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-slate-900">Thanh toán đơn thuê</h3>
                  <div className="mt-5 space-y-3">
                    <SummaryRow label="Tạm tính" value={formatCurrency(rentalTotalAmount)} />
                    <SummaryRow label="Còn lại tại cửa hàng" value={formatCurrency(rentalRemainingAmount)} />
                    <div className="border-t border-slate-100 pt-3">
                      <SummaryRow label="Đặt cọc 50%" value={formatCurrency(rentalDepositAmount)} emphasized />
                    </div>
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
                <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                  {buySuccess ? (
                    <div className="mt-5 rounded-3xl border border-emerald-100 bg-emerald-50 p-5">
                      <p className="font-semibold text-emerald-800">Đặt mua thành công</p>
                      <p className="mt-2 text-sm leading-6 text-emerald-700">{buySuccess}</p>
                    </div>
                  ) : (
                    <>
                      <div className="mt-5 rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,#fffaf7,#f8fafc)] p-5">
                        <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-4">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Order summary</p>
                            <h4 className="mt-1 text-lg font-semibold text-slate-950">Tóm tắt thanh toán</h4>
                          </div>
                          <div className="rounded-2xl bg-white px-3 py-2 text-right shadow-sm">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{buyItems.length} sản phẩm</p>
                            <p className="mt-1 text-sm font-semibold text-slate-900">{formatCurrency(buyGrandTotal)}</p>
                          </div>
                        </div>

                        <div className="mt-4 space-y-3">
                          <SummaryRow label="Tạm tính" value={formatCurrency(buySubtotal)} />
                          <SummaryRow label="Phí vận chuyển" value={formatCurrency(buyShippingFee)} />
                          <div className="border-t border-slate-200 pt-3">
                            <SummaryRow label="Tổng thanh toán" value={formatCurrency(buyGrandTotal)} emphasized />
                          </div>
                        </div>
                      </div>

                      {buyError && <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">{buyError}</p>}

                      <div className="mt-5 rounded-3xl border border-emerald-100 bg-emerald-50/70 px-4 py-3 text-sm text-emerald-800">
                        <p className="font-medium">Bước cuối cùng</p>
                        <p className="mt-1 leading-6">Kiểm tra lại địa chỉ giao hàng và phương thức thanh toán trước khi xác nhận.</p>
                      </div>

                      <button type="button" onClick={handleBuyCheckout} disabled={buyLoading} className="mt-5 w-full rounded-[22px] bg-[linear-gradient(135deg,#e11d48,#f97316)] px-5 py-4 text-base font-semibold text-white shadow-[0_18px_40px_rgba(244,63,94,0.28)] transition hover:translate-y-[-1px] hover:shadow-[0_22px_48px_rgba(244,63,94,0.34)] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none">
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

      <GuestVerificationModal
        open={guestVerificationOpen}
        initialVerification={guestVerificationSession?.guestVerification || null}
        onClose={() => {
          setGuestVerificationOpen(false)
          setPendingGuestCheckout(null)
        }}
        onSuccess={(payload) => {
          const nextSession = {
            verificationToken: payload?.verificationToken || '',
            guestVerification: payload?.guestVerification || null
          }

          setGuestVerificationSession(nextSession)
          setGuestVerificationOpen(false)

          if (pendingGuestCheckout === 'buy') {
            setPendingGuestCheckout(null)
            handleBuyCheckout({
              skipGuestVerification: true,
              session: nextSession
            })
          }
        }}
      />
    </div>
  )
}
