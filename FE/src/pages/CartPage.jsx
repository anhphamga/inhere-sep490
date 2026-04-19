import { createElement, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Lock, Mail, MapPin, Minus, Phone, Plus, ShoppingBag, Trash2, User, CreditCard } from 'lucide-react'
import Header from '../components/common/Header'
import GuestVerificationModal from '../components/cart/GuestVerificationModal'
import { useAuth } from '../hooks/useAuth'
import { useRentalCart } from '../contexts/RentalCartContext'
import { useBuyCart } from '../contexts/BuyCartContext'
import { createRentOrderApi, payDepositApi } from '../services/rent-order.service'
import { createDepositPaymentLinkApi, createSalePaymentLinkApi } from '../services/payment.service'
import { checkoutApi, guestCheckoutApi } from '../services/order.service'
import { getMyVouchersApi, validateVoucherApi } from '../services/voucher.service'
import { ADDRESS_DATA } from '../constants/addressData'
import { createCheckoutSchema } from '../validations/checkout.schema'
import { mapZodErrors, normalizePhone } from '../utils/validation/validation.rules'
import { formatConditionLabel, getConditionBadgeClass } from '../utils/formatConditionLabel'

const ADDRESS_HISTORY_KEY = 'inhere_checkout_address_history'

const PAYMENT_OPTIONS = [
  { value: 'COD', title: '🚚 Thanh toán khi nhận hàng', description: 'Phù hợp khi bạn muốn kiểm tra đơn trước khi thanh toán.' },
  { value: 'PayOS', title: '📱 Thanh toán bằng QR', description: 'Thanh toán ngay bằng mã QR hoặc chuyển khoản. Đơn được xác nhận tự động.' },
]

const formatCurrency = (value) => `${Number(value || 0).toLocaleString('vi-VN')}đ`
const normalizePhoneInput = (value = '') => normalizePhone(value)
const normalizeVoucherCode = (value = '') => String(value || '').trim().toUpperCase()
const normalizeText = (value = '') => String(value ?? '').trim()
const normalizeEmail = (value = '') => normalizeText(value).toLowerCase()
const PHONE_REGEX_VN = /^(?:0|\+84)\d{9,10}$/
const sanitizeCheckoutForm = (nextForm = {}) => ({
  ...nextForm,
  name: normalizeText(nextForm.name),
  phone: normalizePhoneInput(nextForm.phone),
  email: normalizeEmail(nextForm.email),
  province: normalizeText(nextForm.province),
  district: normalizeText(nextForm.district),
  ward: normalizeText(nextForm.ward),
  detailedAddress: normalizeText(nextForm.detailedAddress),
  note: normalizeText(nextForm.note),
})
const createIdempotencyKey = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
const formatVoucherValue = (voucher) => {
  if (String(voucher?.voucherType || '').toLowerCase() === 'percent') {
    const maxDiscount = Number(voucher?.maxDiscount || 0) > 0 ? `, tối đa ${formatCurrency(voucher.maxDiscount)}` : ''
    return `Giảm ${voucher.value}%${maxDiscount}`
  }

  return `Giảm ${formatCurrency(voucher?.value || 0)}`
}
const getVoucherAppliesLabel = (voucher) => {
  if (voucher?.appliesTo === 'both') return 'Thuê và mua'
  if (voucher?.appliesTo === 'rental') return 'Đơn thuê'
  return 'Đơn mua'
}

const calculateDays = (startDate, endDate) => {
  if (!startDate || !endDate) return 1
  const diffMs = Math.abs(new Date(endDate) - new Date(startDate))
  if (diffMs === 0) return 1
  return Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
}

const buildShippingAddress = (form) =>
  [form.detailedAddress?.trim(), form.ward?.trim(), form.district?.trim(), form.province?.trim()]
    .filter(Boolean)
    .join(', ')

const getStoredAddressHistory = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(ADDRESS_HISTORY_KEY) || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const saveAddressHistory = (entry) => {
  if (!entry?.province || !entry?.district || !entry?.ward || !entry?.detailedAddress) return
  const existing = getStoredAddressHistory()
  const next = [
    entry,
    ...existing.filter(
      (item) =>
        !(
          item.province === entry.province &&
          item.district === entry.district &&
          item.ward === entry.ward &&
          item.detailedAddress === entry.detailedAddress &&
          item.hotel === entry.hotel
        )
    )
  ].slice(0, 5)
  localStorage.setItem(ADDRESS_HISTORY_KEY, JSON.stringify(next))
}

function SummaryRow({ label, value, emphasized = false }) {
  return (
    <div className={`flex items-center justify-between gap-4 ${emphasized ? 'text-base font-semibold text-slate-950' : 'text-sm text-slate-500'}`}>
      <span>{label}</span>
      <span className={emphasized ? 'text-rose-700' : 'text-slate-700'}>{value}</span>
    </div>
  )
}

function FieldError({ message, id }) {
  return message ? <p id={id} className="mt-2 text-xs font-medium text-rose-600">{message}</p> : null
}

function CheckoutSection({ icon: SectionIcon, title, subtitle, children }) {
  return (
    <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start gap-3">
        <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
          {createElement(SectionIcon, { className: 'h-5 w-5' })}
        </div>
        <div>
          <h4 className="text-base font-semibold text-slate-900">{title}</h4>
          {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
        </div>
      </div>
      {children}
    </section>
  )
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
          <div className="mt-8 flex justify-center gap-3">
            <Link to="/buy" className="rounded-full bg-rose-600 px-6 py-3 font-semibold text-white">Khám phá sản phẩm</Link>
            <Link to="/buy?purpose=rent&openBooking=1" className="rounded-full border border-slate-200 px-6 py-3 font-semibold text-slate-700">Đặt lịch thử đồ</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function CheckoutResultState({ message, rentalOrderId }) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#ecfdf5,_#f8fafc_55%)]">
      <Header />
      <div className="mx-auto flex min-h-[calc(100vh-140px)] max-w-3xl items-center justify-center px-4 py-12">
        <div className="w-full rounded-[28px] border border-emerald-100 bg-white/95 p-10 text-center shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
          <CheckCircle2 className="mx-auto mb-5 h-16 w-16 text-emerald-500" />
          <h1 className="text-3xl font-semibold text-slate-900">Đặt hàng thành công</h1>
          <p className="mt-3 text-slate-500">{message}</p>
          <div className="mt-8 flex justify-center gap-3">
            {rentalOrderId ? <Link to={`/rental/${rentalOrderId}`} className="rounded-full bg-sky-600 px-6 py-3 font-semibold text-white">Xem đơn thuê</Link> : null}
            <Link to="/buy" className="rounded-full border border-slate-200 px-6 py-3 font-semibold text-slate-700">Tiếp tục mua sắm</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function CartItemCard({ item, type, onRemove, onDecrease, onIncrease, subtotal }) {
  return (
    <article className="rounded-3xl border border-white bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row">
        <img src={item.image} alt={item.name} className="h-28 w-24 rounded-2xl bg-slate-100 object-cover sm:h-32 sm:w-28" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{item.name}</h3>
              <p className="mt-1 text-sm text-slate-500">
                Size {item.size} • Màu {item.color}
                {type === 'buy' && item.conditionLevel && (
                  <span className={`ml-2 rounded-full px-2 py-0.5 text-[11px] font-semibold ${getConditionBadgeClass(item.conditionScore ?? (item.conditionLevel === 'New' ? 100 : 75))}`}>
                    {formatConditionLabel(item.conditionScore ?? (item.conditionLevel === 'New' ? 100 : 75))}
                  </span>
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                const confirmed = window.confirm('Bạn có chắc muốn xóa sản phẩm này khỏi giỏ hàng không?')
                if (!confirmed) return
                onRemove(item.id)
              }}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl text-rose-500 transition hover:bg-rose-50"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          {type === 'buy' ? (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex items-center rounded-2xl border border-slate-200 bg-white">
                <button type="button" onClick={onDecrease} className="p-3 text-slate-600 transition hover:bg-slate-50"><Minus className="h-4 w-4" /></button>
                <span className="min-w-12 text-center font-semibold text-slate-800">{item.quantity}</span>
                <button type="button" onClick={onIncrease} className="p-3 text-slate-600 transition hover:bg-slate-50"><Plus className="h-4 w-4" /></button>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-right">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Đơn giá</p>
                <p className="mt-1 text-sm font-medium text-slate-600">{formatCurrency(item.salePrice)}</p>
              </div>
            </div>
          ) : (
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Lịch thuê</p>
                <p className="mt-1 text-sm font-medium text-slate-700">{new Date(item.rentStartDate).toLocaleDateString('vi-VN')} - {new Date(item.rentEndDate).toLocaleDateString('vi-VN')}</p>
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
          )}
        </div>
        <div className="sm:w-40 sm:border-l sm:border-slate-100 sm:pl-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{type === 'buy' ? 'Thành tiền' : 'Tạm tính'}</p>
          <p className={`mt-2 text-xl font-semibold ${type === 'buy' ? 'text-rose-700' : 'text-sky-700'}`}>{formatCurrency(subtotal)}</p>
        </div>
      </div>
    </article>
  )
}

export default function CartPage() {
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuth()
  const { items: rentalItems, clearCart: clearRentalCart, removeItem: removeRentalItem } = useRentalCart()
  const { items: buyItems, totalAmount: buySubtotal, updateQuantity: updateBuyQuantity, removeItem: removeBuyItem, clearCart: clearBuyCart } = useBuyCart()

  const [rentalPaymentMethod, setRentalPaymentMethod] = useState('Cash')
  const [rentalLoading, setRentalLoading] = useState(false)
  const [rentalError, setRentalError] = useState('')
  const [buyLoading, setBuyLoading] = useState(false)
  const [buyError, setBuyError] = useState('')
  const [buySuccess, setBuySuccess] = useState('')
  const [checkoutResult, setCheckoutResult] = useState(null)
  const [buyFieldErrors, setBuyFieldErrors] = useState({})
  const [buyTouched, setBuyTouched] = useState({})
  const [addressHistory, setAddressHistory] = useState(() => getStoredAddressHistory())
  const [guestVerificationOpen, setGuestVerificationOpen] = useState(false)
  const [pendingGuestCheckout, setPendingGuestCheckout] = useState(null)
  const [guestVerificationSession, setGuestVerificationSession] = useState(null)
  const [orderVoucherCode, setOrderVoucherCode] = useState('')
  const [orderVoucherError, setOrderVoucherError] = useState('')
  const [orderVoucherMessage, setOrderVoucherMessage] = useState('')
  const [orderVoucherLoading, setOrderVoucherLoading] = useState(false)
  const [buyVoucherCode, setBuyVoucherCode] = useState('')
  const [buyVoucherResult, setBuyVoucherResult] = useState(null)
  const [rentalVoucherCode, setRentalVoucherCode] = useState('')
  const [rentalVoucherResult, setRentalVoucherResult] = useState(null)
  const voucherApplyRequestRef = useRef(0)
  const [suggestedVouchers, setSuggestedVouchers] = useState([])
  const [voucherSuggestionsLoading, setVoucherSuggestionsLoading] = useState(false)
  const [buyForm, setBuyForm] = useState({
    name: '',
    phone: '',
    email: '',
    province: 'Quảng Nam',
    district: 'Thành phố Hội An',
    ward: 'Cẩm Phô',
    detailedAddress: '',
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

  useEffect(() => {
    const fetchSuggestedVouchers = async () => {
      if (!isAuthenticated || (buyItems.length === 0 && rentalItems.length === 0)) {
        setSuggestedVouchers([])
        return
      }

      try {
        setVoucherSuggestionsLoading(true)
        const response = await getMyVouchersApi()
        setSuggestedVouchers(Array.isArray(response?.data) ? response.data : [])
      } catch {
        setSuggestedVouchers([])
      } finally {
        setVoucherSuggestionsLoading(false)
      }
    }

    fetchSuggestedVouchers()
  }, [isAuthenticated, buyItems.length, rentalItems.length])

  useEffect(() => {
    setBuyVoucherResult(null)
  }, [buyItems, buySubtotal])

  const rentalItemsWithTotal = useMemo(
    () =>
      rentalItems.map((item) => ({
        ...item,
        days: calculateDays(item.rentStartDate, item.rentEndDate),
        subtotal: Number(item.rentPrice || 0) * calculateDays(item.rentStartDate, item.rentEndDate)
      })),
    [rentalItems]
  )

  const rentalTotalAmount = useMemo(
    () => rentalItemsWithTotal.reduce((sum, item) => sum + item.subtotal, 0),
    [rentalItemsWithTotal]
  )

  useEffect(() => {
    setRentalVoucherResult(null)
  }, [rentalItems, rentalTotalAmount])

  useEffect(() => {
    setOrderVoucherMessage('')
    setOrderVoucherError('')
  }, [buyItems, buySubtotal, rentalItems, rentalTotalAmount])

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

  const rentalDiscountAmount = Number(rentalVoucherResult?.discountAmount || 0)
  const rentalSubtotalAfterVoucher = Math.max(Number(rentalVoucherResult?.finalTotal ?? rentalTotalAmount), 0)
  const rentalDepositAmount = Math.round(rentalSubtotalAfterVoucher * 0.5)
  const rentalRemainingAmount = Math.max(rentalSubtotalAfterVoucher - rentalDepositAmount, 0)
  const buyDiscountAmount = Number(buyVoucherResult?.discountAmount || 0)
  const buyShippingFee = 0
  const buyGrandTotal = Math.max(Number(buyVoucherResult?.finalTotal ?? buySubtotal), 0)
  const combinedCount = rentalItems.length + buyItems.length
  const combinedTotal = rentalDepositAmount + buyGrandTotal
  const addressPreview = useMemo(() => buildShippingAddress(buyForm), [buyForm])
  const addressSuggestions = useMemo(
    () =>
      addressHistory
        .filter((entry) => (!buyForm.province || entry.province === buyForm.province) && (!buyForm.district || entry.district === buyForm.district))
        .slice(0, 3),
    [addressHistory, buyForm.district, buyForm.province]
  )
  const checkoutSchemaOptions = useMemo(
    () => ({
      requireVerifiedEmail: buyItems.length > 0 && !isAuthenticated && Boolean(guestVerificationSession?.verificationToken),
      verifiedEmail: normalizeEmail(guestVerificationSession?.guestVerification?.email || ''),
    }),
    [buyItems.length, guestVerificationSession?.guestVerification?.email, guestVerificationSession?.verificationToken, isAuthenticated]
  )

  const getBuyValidationErrors = useMemo(() => {
    return (nextForm, options = {}) => {
      const sanitized = sanitizeCheckoutForm(nextForm)
      const validationOptions = { ...checkoutSchemaOptions, ...options }
      const fieldErrors = {}

      const schema = createCheckoutSchema(validationOptions)
      const parsed = schema.safeParse(sanitized)
      if (!parsed.success) Object.assign(fieldErrors, mapZodErrors(parsed.error))

      if (sanitized.phone && !PHONE_REGEX_VN.test(sanitized.phone)) {
        fieldErrors.phone = fieldErrors.phone || 'Số điện thoại Việt Nam không hợp lệ.'
      }

      const selectedProvinceEntry = ADDRESS_DATA.find((item) => item.province === sanitized.province)
      if (!selectedProvinceEntry) {
        fieldErrors.province = fieldErrors.province || 'Tỉnh/thành phố không hợp lệ.'
      }

      const districtEntry = selectedProvinceEntry?.districts?.find((item) => item.district === sanitized.district)
      if (!districtEntry) {
        fieldErrors.district = fieldErrors.district || 'Quận/huyện không hợp lệ.'
      }

      const validWard = Array.isArray(districtEntry?.wards) && districtEntry.wards.includes(sanitized.ward)
      if (!validWard) {
        fieldErrors.ward = fieldErrors.ward || 'Phường/xã không hợp lệ.'
      }

      if (validationOptions.requireVerifiedEmail && validationOptions.verifiedEmail && sanitized.email !== validationOptions.verifiedEmail) {
        fieldErrors.email = fieldErrors.email || 'Email thanh toán phải trùng với email đã xác minh.'
      }

      return fieldErrors
    }
  }, [checkoutSchemaOptions])

  const validateBuyForm = (nextForm = buyForm, options = {}) => {
    const finalOptions = { ...checkoutSchemaOptions, ...options }
    const errors = getBuyValidationErrors(nextForm, finalOptions)
    return { errors, sanitized: sanitizeCheckoutForm(nextForm), isValid: Object.keys(errors).length === 0 }
  }

  const buyFormIsValid = useMemo(
    () => Object.keys(getBuyValidationErrors(buyForm, checkoutSchemaOptions)).length === 0,
    [buyForm, checkoutSchemaOptions, getBuyValidationErrors]
  )

  const getBuyFieldClassName = (field) =>
    `w-full rounded-2xl border bg-white px-4 py-3 outline-none transition ${
      buyFieldErrors[field] ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200 focus:border-rose-300'
    }`
  const eligibleVoucherSuggestions = useMemo(() => {
    const availableOrderTypes = new Set()
    if (buyItems.length > 0) availableOrderTypes.add('sale')
    if (rentalItems.length > 0) availableOrderTypes.add('rental')

    return suggestedVouchers
      .filter((voucher) => {
        const appliesTo = String(voucher?.appliesTo || '').toLowerCase()
        const matchesType =
          appliesTo === 'both' ||
          (appliesTo === 'sale' && availableOrderTypes.has('sale')) ||
          (appliesTo === 'rental' && availableOrderTypes.has('rental'))

        const minOrderValue = Number(voucher?.minOrderValue || 0)
        const matchesValue =
          (availableOrderTypes.has('sale') && buySubtotal >= minOrderValue) ||
          (availableOrderTypes.has('rental') && rentalTotalAmount >= minOrderValue)

        return matchesType && matchesValue
      })
      .sort((a, b) => {
        const aValue = String(a?.voucherType || '').toLowerCase() === 'percent' ? Number(a?.value || 0) * 1000 : Number(a?.value || 0)
        const bValue = String(b?.voucherType || '').toLowerCase() === 'percent' ? Number(b?.value || 0) * 1000 : Number(b?.value || 0)
        return bValue - aValue
      })
      .slice(0, 4)
  }, [buyItems.length, buySubtotal, rentalItems.length, rentalTotalAmount, suggestedVouchers])

  const handleBuyFieldChange = (field, value) => {
    const rawValue = typeof value === 'string' ? value : value ?? ''
    const nextForm = { ...buyForm, [field]: rawValue }

    if (field === 'province') {
      const selectedProvinceEntry = ADDRESS_DATA.find((item) => item.province === rawValue)
      const nextDistrict = selectedProvinceEntry?.districts?.[0]?.district || ''
      const nextWard = selectedProvinceEntry?.districts?.[0]?.wards?.[0] || ''
      nextForm.district = nextDistrict
      nextForm.ward = nextWard
    }

    if (field === 'district') {
      const selectedProvinceEntry = ADDRESS_DATA.find((item) => item.province === nextForm.province)
      const selectedDistrictEntry = selectedProvinceEntry?.districts?.find((item) => item.district === rawValue)
      nextForm.ward = selectedDistrictEntry?.wards?.[0] || ''
    }

    setBuyForm(nextForm)

    if (
      field === 'email' &&
      !isAuthenticated &&
      guestVerificationSession?.verificationToken
    ) {
      setGuestVerificationSession(null)
    }
    if (buyFieldErrors[field]) {
      const { errors: nextErrors } = validateBuyForm(nextForm)
      setBuyFieldErrors((prev) => {
        const next = { ...prev }
        if (nextErrors[field]) next[field] = nextErrors[field]
        else delete next[field]
        if (field === 'province') {
          if (nextErrors.district) next.district = nextErrors.district
          else delete next.district
          if (nextErrors.ward) next.ward = nextErrors.ward
          else delete next.ward
        }
        if (field === 'district') {
          if (nextErrors.ward) next.ward = nextErrors.ward
          else delete next.ward
        }
        return next
      })
    }
  }

  const handleBuyFieldBlur = (field) => {
    setBuyTouched((prev) => ({ ...prev, [field]: true }))
    const trimmedValue = typeof buyForm[field] === 'string' ? normalizeText(buyForm[field]) : buyForm[field]
    const nextForm = typeof buyForm[field] === 'string' ? { ...buyForm, [field]: trimmedValue } : buyForm
    if (nextForm !== buyForm) setBuyForm(nextForm)
    const { errors: nextErrors } = validateBuyForm(nextForm)
    setBuyFieldErrors((prev) => {
      const next = { ...prev }
      if (nextErrors[field]) next[field] = nextErrors[field]
      else delete next[field]
      if (field === 'province') {
        if (nextErrors.district) next.district = nextErrors.district
        else delete next.district
        if (nextErrors.ward) next.ward = nextErrors.ward
        else delete next.ward
      }
      if (field === 'district') {
        if (nextErrors.ward) next.ward = nextErrors.ward
        else delete next.ward
      }
      return next
    })
  }

  const buildBuyVoucherCartItems = () =>
    buyItems.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      size: item.size,
      color: item.color,
      salePrice: item.salePrice,
      conditionLevel: item.conditionLevel || 'New'
    }))

  const buildRentalVoucherCartItems = () =>
    rentalItems.map((item) => ({
      productId: item.productId,
      productInstanceId: item.productInstanceId,
      size: item.size,
      color: item.color,
      rentStartDate: item.rentStartDate,
      rentEndDate: item.rentEndDate,
      baseRentPrice: item.rentPrice,
      finalPrice: item.rentPrice
    }))

  const clearAppliedVoucherState = () => {
    setBuyVoucherResult(null)
    setBuyVoucherCode('')
    setRentalVoucherResult(null)
    setRentalVoucherCode('')
  }

  const applyVoucherCode = async (rawCode, { invalidMessage = 'Voucher không hợp lệ.', requestErrorMessage = 'Không thể áp voucher lúc này.' } = {}) => {
    const code = normalizeVoucherCode(rawCode)
    if (!code) {
      clearAppliedVoucherState()
      setOrderVoucherMessage('')
      setOrderVoucherError('Vui lòng nhập mã voucher.')
      return
    }

    // Prevent stale async responses from overriding newer voucher validations.
    const requestId = voucherApplyRequestRef.current + 1
    voucherApplyRequestRef.current = requestId

    setOrderVoucherCode(code)
    setOrderVoucherLoading(true)
    setOrderVoucherError('')
    setOrderVoucherMessage('')
    clearAppliedVoucherState()

    try {
      const validations = await Promise.all([
        buyItems.length > 0
          ? validateVoucherApi({
              code,
              cartItems: buildBuyVoucherCartItems(),
              subtotal: buySubtotal,
              orderType: 'sale'
            })
          : Promise.resolve(null),
        rentalItems.length > 0
          ? validateVoucherApi({
              code,
              cartItems: buildRentalVoucherCartItems(),
              subtotal: rentalTotalAmount,
              orderType: 'rental'
            })
          : Promise.resolve(null)
      ])

      if (voucherApplyRequestRef.current !== requestId) return

      const [buyResult, rentalResult] = validations
      const candidates = [
        buyResult?.valid ? { target: 'buy', result: buyResult, label: 'đơn mua' } : null,
        rentalResult?.valid ? { target: 'rental', result: rentalResult, label: 'đơn thuê' } : null
      ].filter(Boolean)

      if (candidates.length === 0) {
        setOrderVoucherError(buyResult?.message || rentalResult?.message || invalidMessage)
        return
      }

      const selected = candidates.sort((a, b) => Number(b.result?.discountAmount || 0) - Number(a.result?.discountAmount || 0))[0]

      if (selected.target === 'buy') {
        setBuyVoucherCode(selected.result.code || code)
        setBuyVoucherResult(selected.result)
      } else {
        setRentalVoucherCode(selected.result.code || code)
        setRentalVoucherResult(selected.result)
      }

      setOrderVoucherCode(selected.result.code || code)
      setOrderVoucherMessage(`Đã áp voucher cho ${selected.label}.`)
    } catch (error) {
      if (voucherApplyRequestRef.current !== requestId) return
      setOrderVoucherError(error.response?.data?.message || requestErrorMessage)
    } finally {
      if (voucherApplyRequestRef.current === requestId) setOrderVoucherLoading(false)
    }
  }

  const handleOrderVoucher = async () => {
    if (orderVoucherLoading) return
    await applyVoucherCode(orderVoucherCode, {
      invalidMessage: 'Voucher không hợp lệ.',
      requestErrorMessage: 'Không thể kiểm tra voucher lúc này.'
    })
  }

  const handleSelectSuggestedVoucher = async (voucher) => {
    if (orderVoucherLoading) return
    await applyVoucherCode(voucher?.code, {
      invalidMessage: 'Voucher này hiện chưa áp dụng được cho đơn hàng của bạn.',
      requestErrorMessage: 'Không thể áp voucher lúc này.'
    })
  }

  const buildBuyPayload = (session = guestVerificationSession) => {
    const sanitizedForm = sanitizeCheckoutForm(buyForm)
    return ({
    ...(isAuthenticated ? {} : { verificationToken: session?.verificationToken }),
    name: sanitizedForm.name,
    phone: sanitizedForm.phone,
    email: sanitizedForm.email,
    address: buildShippingAddress(sanitizedForm),
    paymentMethod: sanitizedForm.paymentMethod,
    note: sanitizedForm.note,
    shippingFee: buyShippingFee,
    voucherCode: buyVoucherResult?.code || normalizeVoucherCode(buyVoucherCode),
    items: buyItems.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      size: item.size,
      color: item.color,
      salePrice: item.salePrice,
      conditionLevel: item.conditionLevel || 'New'
    }))
  })
  }

  const buildRentPayload = (idempotencyKey) => {
    const validDates = rentalItems.filter((item) => item.rentStartDate && item.rentEndDate)
    const orderStartDate = validDates.reduce((min, item) =>
      !min || item.rentStartDate < min ? item.rentStartDate : min, null)
    const orderEndDate = validDates.reduce((max, item) =>
      !max || item.rentEndDate > max ? item.rentEndDate : max, null)
    return ({
    rentStartDate: orderStartDate,
    rentEndDate: orderEndDate,
    items: rentalItems.map((item) => {
      const days = calculateDays(item.rentStartDate, item.rentEndDate)
      return {
        productInstanceId: item.productInstanceId,
        productId: item.productId,
        baseRentPrice: item.rentPrice,
        finalPrice: item.rentPrice * days,
        size: item.size,
        color: item.color,
        rentStartDate: item.rentStartDate,
        rentEndDate: item.rentEndDate
      }
    }),
    voucherCode: rentalVoucherResult?.code || normalizeVoucherCode(rentalVoucherCode),
    depositAmount: rentalDepositAmount,
    remainingAmount: rentalRemainingAmount,
    totalAmount: rentalSubtotalAfterVoucher,
    idempotencyKey
  })}

  const handleCheckout = async ({ skipGuestVerification = false, session = guestVerificationSession } = {}) => {
    if (rentalItems.length > 0 && !isAuthenticated) return navigate('/login?redirect=/cart')
    if (buyItems.length > 0 && !isAuthenticated && !skipGuestVerification && !session?.verificationToken) {
      setPendingGuestCheckout('combined')
      return setGuestVerificationOpen(true)
    }
    if (rentalItems.length > 0 && rentalItems.some((item) => !item.rentStartDate || !item.rentEndDate)) {
      return setRentalError('Vui lòng chọn ngày thuê cho tất cả sản phẩm.')
    }
    const maxRentalDays = parseInt(import.meta.env.VITE_MAX_RENTAL_DAYS || '30', 10)
    const overLimitItem = rentalItems.find((item) => {
      if (!item.rentStartDate || !item.rentEndDate) return false
      const days = Math.ceil((new Date(item.rentEndDate) - new Date(item.rentStartDate)) / (24 * 60 * 60 * 1000))
      return days > maxRentalDays
    })
    if (overLimitItem) {
      return setRentalError(`Thời gian thuê tối đa là ${maxRentalDays} ngày cho mỗi sản phẩm.`)
    }
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const pastStartItem = rentalItems.find((item) => {
      if (!item.rentStartDate) return false
      const startDay = new Date(item.rentStartDate)
      startDay.setHours(0, 0, 0, 0)
      return startDay < todayStart
    })
    if (pastStartItem) {
      return setRentalError(
        'Ngày bắt đầu thuê không thể là ngày trong quá khứ. Vui lòng cập nhật ngày thuê cho sản phẩm trong giỏ.'
      )
    }

    const verificationOptions = {
      requireVerifiedEmail: buyItems.length > 0 && !isAuthenticated && Boolean(session?.verificationToken),
      verifiedEmail: normalizeEmail(session?.guestVerification?.email || ''),
    }
    const { errors: validationErrors, sanitized: sanitizedBuyForm } = validateBuyForm(buyForm, verificationOptions)
    if (buyItems.length > 0 && Object.keys(validationErrors).length > 0) {
      setBuyTouched({
        name: true,
        phone: true,
        email: true,
        province: true,
        district: true,
        ward: true,
        detailedAddress: true,
      })
      setBuyFieldErrors(validationErrors)
      return setBuyError('Vui lòng hoàn thiện đầy đủ thông tin giao hàng.')
    }

    setRentalLoading(rentalItems.length > 0)
    setBuyLoading(buyItems.length > 0)
    setRentalError('')
    setBuyError('')
    setBuySuccess('')
    setCheckoutResult(null)

    let createdRentalOrderId = null

    try {
      if (rentalItems.length > 0) {
        const rentalResponse = await createRentOrderApi(buildRentPayload(createIdempotencyKey('rent-checkout')))
        createdRentalOrderId = rentalResponse.data?._id || null
        if (createdRentalOrderId) {
          if (rentalPaymentMethod === 'PayOS') {
            // Tạo link PayOS và redirect – không gọi payDepositApi
            clearRentalCart()
            const linkData = await createDepositPaymentLinkApi(createdRentalOrderId)
            window.location.href = linkData.data.paymentUrl
            return // dừng tại đây, trang sẽ redirect
          }
          await payDepositApi(createdRentalOrderId, { method: rentalPaymentMethod })
          clearRentalCart()
        }
      }

      let saleOrderId = null
      if (buyItems.length > 0) {
        const buyPayload = { ...buildBuyPayload(session), idempotencyKey: createIdempotencyKey('sale-checkout') }
        const response = !isAuthenticated ? await guestCheckoutApi(buyPayload) : await checkoutApi(buyPayload)
        saleOrderId = response.data?.orderId || null
        clearBuyCart()

        // Nếu chọn PayOS cho đơn mua → tạo link và redirect (cả guest lẫn member)
        if (buyForm.paymentMethod === 'PayOS' && saleOrderId) {
          const linkData = await createSalePaymentLinkApi(saleOrderId)
          window.location.href = linkData.data.paymentUrl
          return
        }
        if (!isAuthenticated) setGuestVerificationSession(null)
        saveAddressHistory({
          province: sanitizedBuyForm.province,
          district: sanitizedBuyForm.district,
          ward: sanitizedBuyForm.ward,
          detailedAddress: sanitizedBuyForm.detailedAddress,
          hotel: ''
        })
        setAddressHistory(getStoredAddressHistory())
      }

      const messages = []
      if (createdRentalOrderId) messages.push(`đơn thuê ${String(createdRentalOrderId).slice(-8)} đã được tạo và thanh toán cọc`)
      if (saleOrderId) messages.push(`đơn mua ${String(saleOrderId).slice(-8)} đã được ghi nhận`)

      const successMessage = messages.length > 0 ? `Đã xử lý thành công ${messages.join(', ')}.` : 'Đơn hàng đã được ghi nhận.'
      setBuySuccess(successMessage)
      setCheckoutResult({ message: successMessage, rentalOrderId: createdRentalOrderId })
    } catch (err) {
      const msg = err.response?.data?.message || 'Không thể xử lý checkout. Vui lòng thử lại.'
      if (createdRentalOrderId) {
        clearRentalCart()
        setRentalError('')
        setBuyError(`Đơn thuê ${String(createdRentalOrderId).slice(-8)} đã tạo thành công nhưng phần đơn mua bị lỗi. ${msg}`)
      } else if (rentalItems.length > 0) {
        setBuyError('')
        setRentalError(msg)
      } else {
        setRentalError('')
        setBuyError(msg)
      }

      if (!isAuthenticated && err.response?.status === 401) {
        setGuestVerificationSession(null)
        setPendingGuestCheckout('combined')
        setGuestVerificationOpen(true)
      }
    } finally {
      setRentalLoading(false)
      setBuyLoading(false)
    }
  }

  if (combinedCount === 0 && checkoutResult) {
    return <CheckoutResultState message={checkoutResult.message} rentalOrderId={checkoutResult.rentalOrderId} />
  }

  if (combinedCount === 0) return <EmptyState />

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fff7ed_0%,#f8fafc_18%,#f8fafc_100%)]">
      <div className="sticky top-0 z-30 border-b border-white/60 bg-[linear-gradient(135deg,rgba(255,247,237,0.94),rgba(255,255,255,0.96))] backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 md:px-6">
          <div>
            <Link to="/buy" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-800">
              <ArrowLeft className="h-4 w-4" />
              Quay lại mua sắm
            </Link>
            <div className="mt-2 flex items-center gap-3">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-600 text-white shadow-sm">
                <Lock className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-rose-500">Thanh toán an toàn</p>
                <h1 className="text-lg font-semibold text-slate-950 sm:text-xl">Hoàn tất đơn hàng INHERE</h1>
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

      <main className="mx-auto max-w-7xl px-4 py-5 md:px-6 lg:py-8">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.28fr)_minmax(350px,0.82fr)] lg:gap-8">
          <section className="space-y-8">
            {rentalItems.length > 0 ? (
              <div className="rounded-[28px] border border-sky-100 bg-[linear-gradient(180deg,rgba(239,246,255,0.75),rgba(255,255,255,0.95))] p-5 lg:p-6">
                <h2 className="mb-5 text-xl font-semibold text-slate-900">Giỏ thuê</h2>
                <div className="space-y-4">
                  {rentalItemsWithTotal.map((item) => (
                    <CartItemCard key={item.id} item={item} type="rental" onRemove={removeRentalItem} subtotal={item.subtotal} />
                  ))}
                </div>
              </div>
            ) : null}

            {buyItems.length > 0 ? (
              <div className="rounded-[28px] border border-rose-100 bg-[linear-gradient(180deg,rgba(255,241,242,0.76),rgba(255,255,255,0.96))] p-5 lg:p-6">
                <h2 className="mb-5 text-xl font-semibold text-slate-900">Giỏ mua</h2>
                <div className="space-y-4">
                  {buyItems.map((item) => (
                    <CartItemCard
                      key={item.id}
                      item={item}
                      type="buy"
                      onRemove={removeBuyItem}
                      onDecrease={() => updateBuyQuantity(item.id, Math.max(Number(item.quantity || 1) - 1, 1))}
                      onIncrease={() => updateBuyQuantity(item.id, Number(item.quantity || 1) + 1)}
                      subtotal={item.salePrice * item.quantity}
                    />
                  ))}
                </div>

                <div className="mt-6 rounded-[28px] border border-slate-200 bg-white p-5">
                  <div className="space-y-3">
                    <SummaryRow label="Tạm tính" value={formatCurrency(buySubtotal)} />
                    {buyVoucherResult ? <SummaryRow label={`Voucher (${buyVoucherResult.code})`} value={`-${formatCurrency(buyDiscountAmount)}`} /> : null}
                    <div className="border-t border-slate-200 pt-3">
                      <SummaryRow label="Tổng thanh toán" value={formatCurrency(buyGrandTotal)} emphasized />
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </section>

          <aside className="xl:sticky xl:top-24 xl:self-start">
            <div className="space-y-5 rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
              <div className="border-b border-slate-100 pb-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-rose-500">Thanh toán</p>
                <h3 className="mt-2 text-xl font-semibold text-slate-950">Thanh toán thuê và mua</h3>
              </div>

              {combinedCount > 0 ? (
                <div className="rounded-3xl border border-amber-100 bg-amber-50/70 p-5">
                  <p className="text-sm font-semibold text-slate-900">Voucher đơn hàng</p>
                  <p className="mt-1 text-sm text-slate-500">Hệ thống sẽ tự áp mã vào đơn mua hoặc đơn thuê phù hợp.</p>
                  <div className="mt-4 flex gap-2">
                    <input
                      type="text"
                      value={orderVoucherCode}
                      onChange={(event) => setOrderVoucherCode(normalizeVoucherCode(event.target.value))}
                      placeholder="Nhập mã voucher"
                      className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-amber-300"
                    />
                    <button type="button" onClick={handleOrderVoucher} disabled={orderVoucherLoading} className="rounded-2xl bg-amber-500 px-4 py-3 text-sm font-semibold text-white">
                      {orderVoucherLoading ? 'Đang áp dụng...' : 'Áp dụng'}
                    </button>
                  </div>
                  {isAuthenticated ? (
                    <div className="mt-4">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Voucher gợi ý</p>
                        {voucherSuggestionsLoading ? <span className="text-xs text-slate-400">Đang tải...</span> : null}
                      </div>
                      {eligibleVoucherSuggestions.length > 0 ? (
                        <div className="space-y-2">
                          {eligibleVoucherSuggestions.map((voucher) => {
                            const isSelected = normalizeVoucherCode(orderVoucherCode) === normalizeVoucherCode(voucher.code)
                            return (
                              <button
                                key={voucher._id || voucher.code}
                                type="button"
                                onClick={() => handleSelectSuggestedVoucher(voucher)}
                                disabled={orderVoucherLoading}
                                className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                                  isSelected
                                    ? 'border-amber-300 bg-white shadow-sm'
                                    : 'border-amber-100 bg-white/80 hover:border-amber-200 hover:bg-white'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <p className="text-sm font-semibold text-slate-900">{voucher.code}</p>
                                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                                        {getVoucherAppliesLabel(voucher)}
                                      </span>
                                    </div>
                                    <p className="mt-1 text-sm text-slate-600">{formatVoucherValue(voucher)}</p>
                                    <p className="mt-1 text-xs text-slate-400">
                                      Đơn tối thiểu {formatCurrency(voucher.minOrderValue || 0)}
                                    </p>
                                  </div>
                                  <span className="text-xs font-semibold text-amber-600">
                                    {isSelected ? 'Đã chọn' : 'Chọn nhanh'}
                                  </span>
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      ) : !voucherSuggestionsLoading ? (
                        <p className="rounded-2xl bg-white/80 px-4 py-3 text-sm text-slate-500">
                          Chưa có voucher phù hợp với giỏ hàng hiện tại.
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                  {orderVoucherMessage ? <p className="mt-3 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{orderVoucherMessage}</p> : null}
                  {orderVoucherError ? <p className="mt-3 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">{orderVoucherError}</p> : null}
                </div>
              ) : null}

              {rentalItems.length > 0 ? (
                <div className="rounded-3xl border border-sky-100 bg-sky-50/40 p-5">
                  <div className="space-y-3">
                    <SummaryRow label="Tạm tính thuê" value={formatCurrency(rentalTotalAmount)} />
                    {rentalVoucherResult ? <SummaryRow label={`Voucher (${rentalVoucherResult.code})`} value={`-${formatCurrency(rentalDiscountAmount)}`} /> : null}
                    <SummaryRow label="Còn lại tại cửa hàng" value={formatCurrency(rentalRemainingAmount)} />
                    <div className="border-t border-slate-200 pt-3">
                      <SummaryRow label="Đặt cọc 50%" value={formatCurrency(rentalDepositAmount)} emphasized />
                    </div>
                  </div>

                  <div className="mt-5 space-y-2">
                    <label className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm cursor-pointer transition ${rentalPaymentMethod === 'Cash' ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200'}`}>
                      <input type="radio" name="rentalPaymentMethod" value="Cash" checked={rentalPaymentMethod === 'Cash'} onChange={(e) => setRentalPaymentMethod(e.target.value)} />
                      <span className="text-slate-700">💵 Tiền mặt tại cửa hàng</span>
                    </label>
                    <label className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm cursor-pointer transition ${rentalPaymentMethod === 'PayOS' ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200'}`}>
                      <input type="radio" name="rentalPaymentMethod" value="PayOS" checked={rentalPaymentMethod === 'PayOS'} onChange={(e) => setRentalPaymentMethod(e.target.value)} />
                      <span className="text-slate-700">📱 Thanh toán bằng QR</span>
                      <span className="ml-auto rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-600">Nhanh hơn</span>
                    </label>
                  </div>
                  {rentalPaymentMethod === 'PayOS' && (
                    <p className="mt-2 text-xs text-indigo-600 bg-indigo-50 rounded-xl px-3 py-2">
                      Bạn sẽ được chuyển đến trang thanh toán QR để quét mã hoặc chuyển khoản. Đơn thuê sẽ được xác nhận ngay sau khi thanh toán.
                    </p>
                  )}

                  {rentalError ? <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">{rentalError}</p> : null}

                  {buyItems.length === 0 ? (
                    <button type="button" onClick={handleCheckout} disabled={rentalLoading} className="mt-5 w-full rounded-full bg-sky-600 px-5 py-3 font-semibold text-white">
                      {rentalLoading ? 'Đang xử lý...' : `Đặt cọc ${formatCurrency(rentalDepositAmount)}`}
                    </button>
                  ) : null}
                </div>
              ) : null}

              {buyItems.length > 0 ? (
                <div className="rounded-3xl border border-rose-100 bg-rose-50/40 p-5">
                  {buySuccess ? (
                    <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{buySuccess}</p>
                  ) : (
                    <>
                      <div className={`${!isAuthenticated ? 'mb-5' : 'hidden'} rounded-2xl border px-4 py-3 text-sm ${guestVerificationSession?.verificationToken ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
                        {guestVerificationSession?.verificationToken ? 'Đã xác minh guest bằng email.' : 'Bạn cần xác minh email trước khi thanh toán.'}
                      </div>

                      <CheckoutSection icon={User} title="Thông tin khách hàng" subtitle="Thông tin liên hệ để xác nhận đơn và cập nhật giao hàng.">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="sm:col-span-2">
                            <label className="mb-2 block text-sm font-medium text-slate-700">Họ và tên</label>
                            <input
                              id="checkout-name"
                              type="text"
                              value={buyForm.name}
                              onChange={(event) => handleBuyFieldChange('name', event.target.value)}
                              onBlur={() => handleBuyFieldBlur('name')}
                              className={getBuyFieldClassName('name')}
                              aria-invalid={Boolean(buyTouched.name && buyFieldErrors.name)}
                              aria-describedby={buyTouched.name && buyFieldErrors.name ? 'checkout-name-error' : undefined}
                            />
                            {buyTouched.name && buyFieldErrors.name ? <FieldError message={buyFieldErrors.name} id="checkout-name-error" /> : null}
                          </div>
                          <div>
                            <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700"><Phone className="h-4 w-4 text-slate-400" />Số điện thoại</label>
                            <input
                              id="checkout-phone"
                              type="tel"
                              value={buyForm.phone}
                              onChange={(event) => handleBuyFieldChange('phone', event.target.value)}
                              onBlur={() => handleBuyFieldBlur('phone')}
                              className={getBuyFieldClassName('phone')}
                              aria-invalid={Boolean(buyTouched.phone && buyFieldErrors.phone)}
                              aria-describedby={buyTouched.phone && buyFieldErrors.phone ? 'checkout-phone-error' : undefined}
                            />
                            {buyTouched.phone && buyFieldErrors.phone ? <FieldError message={buyFieldErrors.phone} id="checkout-phone-error" /> : null}
                          </div>
                          <div>
                            <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700"><Mail className="h-4 w-4 text-slate-400" />Email</label>
                            <input
                              id="checkout-email"
                              type="email"
                              value={buyForm.email}
                              onChange={(event) => handleBuyFieldChange('email', event.target.value)}
                              onBlur={() => handleBuyFieldBlur('email')}
                              className={getBuyFieldClassName('email')}
                              aria-invalid={Boolean(buyTouched.email && buyFieldErrors.email)}
                              aria-describedby={buyTouched.email && buyFieldErrors.email ? 'checkout-email-error' : undefined}
                            />
                            {buyTouched.email && buyFieldErrors.email ? <FieldError message={buyFieldErrors.email} id="checkout-email-error" /> : null}
                          </div>
                        </div>
                      </CheckoutSection>

                      <CheckoutSection icon={MapPin} title="Địa chỉ giao hàng" subtitle="Chọn khu vực giao hàng.">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <label className="mb-2 block text-sm font-medium text-slate-700">Tỉnh / Thành phố</label>
                            <select
                              id="checkout-province"
                              value={buyForm.province}
                              onChange={(event) => handleBuyFieldChange('province', event.target.value)}
                              onBlur={() => handleBuyFieldBlur('province')}
                              className={getBuyFieldClassName('province')}
                              aria-invalid={Boolean(buyTouched.province && buyFieldErrors.province)}
                              aria-describedby={buyTouched.province && buyFieldErrors.province ? 'checkout-province-error' : undefined}
                            >
                              {ADDRESS_DATA.map((item) => <option key={item.province} value={item.province}>{item.province}</option>)}
                            </select>
                            {buyTouched.province && buyFieldErrors.province ? <FieldError message={buyFieldErrors.province} id="checkout-province-error" /> : null}
                          </div>
                          <div>
                            <label className="mb-2 block text-sm font-medium text-slate-700">Quận / Huyện</label>
                            <select
                              id="checkout-district"
                              value={buyForm.district}
                              onChange={(event) => handleBuyFieldChange('district', event.target.value)}
                              onBlur={() => handleBuyFieldBlur('district')}
                              className={getBuyFieldClassName('district')}
                              aria-invalid={Boolean(buyTouched.district && buyFieldErrors.district)}
                              aria-describedby={buyTouched.district && buyFieldErrors.district ? 'checkout-district-error' : undefined}
                            >
                              {districtOptions.map((item) => <option key={item.district} value={item.district}>{item.district}</option>)}
                            </select>
                            {buyTouched.district && buyFieldErrors.district ? <FieldError message={buyFieldErrors.district} id="checkout-district-error" /> : null}
                          </div>
                          <div className="sm:col-span-2">
                            <label className="mb-2 block text-sm font-medium text-slate-700">Phường / Xã</label>
                            <select
                              id="checkout-ward"
                              value={buyForm.ward}
                              onChange={(event) => handleBuyFieldChange('ward', event.target.value)}
                              onBlur={() => handleBuyFieldBlur('ward')}
                              className={getBuyFieldClassName('ward')}
                              aria-invalid={Boolean(buyTouched.ward && buyFieldErrors.ward)}
                              aria-describedby={buyTouched.ward && buyFieldErrors.ward ? 'checkout-ward-error' : undefined}
                            >
                              {wardOptions.map((ward) => <option key={ward} value={ward}>{ward}</option>)}
                            </select>
                            {buyTouched.ward && buyFieldErrors.ward ? <FieldError message={buyFieldErrors.ward} id="checkout-ward-error" /> : null}
                          </div>
                          <div className="sm:col-span-2">
                            <label className="mb-2 block text-sm font-medium text-slate-700">Địa chỉ chi tiết</label>
                            <input
                              id="checkout-detailed-address"
                              type="text"
                              value={buyForm.detailedAddress}
                              onChange={(event) => handleBuyFieldChange('detailedAddress', event.target.value)}
                              onBlur={() => handleBuyFieldBlur('detailedAddress')}
                              className={getBuyFieldClassName('detailedAddress')}
                              aria-invalid={Boolean(buyTouched.detailedAddress && buyFieldErrors.detailedAddress)}
                              aria-describedby={buyTouched.detailedAddress && buyFieldErrors.detailedAddress ? 'checkout-detailed-address-error' : undefined}
                            />
                            {buyTouched.detailedAddress && buyFieldErrors.detailedAddress ? <FieldError message={buyFieldErrors.detailedAddress} id="checkout-detailed-address-error" /> : null}
                          </div>
                        </div>

                        {addressSuggestions.length > 0 ? <div className="rounded-2xl bg-white px-4 py-4 text-sm text-slate-500">{addressSuggestions[0].detailedAddress}</div> : null}

                        <div className="rounded-2xl bg-white px-4 py-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Địa chỉ giao hàng</p>
                          <p className="mt-2 text-sm leading-6 text-slate-700">{addressPreview || 'Địa chỉ sẽ hiển thị ở đây sau khi bạn nhập đầy đủ thông tin.'}</p>
                        </div>
                      </CheckoutSection>

                      <CheckoutSection icon={CreditCard} title="Phương thức thanh toán" subtitle="Chọn phương thức thanh toán.">
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
                      </CheckoutSection>

                      {buyError ? <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">{buyError}</p> : null}

                      <button type="button" onClick={handleCheckout} disabled={buyLoading || rentalLoading || !buyFormIsValid} className="mt-5 w-full rounded-[22px] bg-[linear-gradient(135deg,#e11d48,#f97316)] px-5 py-4 text-base font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">
                        {buyLoading || rentalLoading ? 'Đang xử lý...' : rentalItems.length > 0 ? `Xác nhận thanh toán ${formatCurrency(combinedTotal)}` : `Xác nhận mua ${formatCurrency(buyGrandTotal)}`}
                      </button>
                    </>
                  )}
                </div>
              ) : null}
            </div>
          </aside>
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
          if (pendingGuestCheckout === 'combined') {
            setPendingGuestCheckout(null)
            handleCheckout({ skipGuestVerification: true, session: nextSession })
          }
        }}
      />
    </div>
  )
}


