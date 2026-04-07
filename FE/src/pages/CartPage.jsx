import { createElement, useEffect, useMemo, useState } from 'react'
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

const PHONE_REGEX = /^\+?[0-9]{9,15}$/
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const ADDRESS_HISTORY_KEY = 'inhere_checkout_address_history'

const PAYMENT_OPTIONS = [
  { value: 'COD', title: 'ðŸšš Thanh toÃ¡n khi nháº­n hÃ ng', description: 'PhÃ¹ há»£p khi báº¡n muá»‘n kiá»ƒm tra Ä‘Æ¡n trÆ°á»›c khi thanh toÃ¡n.' },
  { value: 'PayOS', title: 'ðŸ“± Thanh toÃ¡n báº±ng QR', description: 'Thanh toÃ¡n ngay báº±ng mÃ£ QR hoáº·c chuyá»ƒn khoáº£n. ÄÆ¡n Ä‘Æ°á»£c xÃ¡c nháº­n tá»± Ä‘á»™ng.' },
]

const formatCurrency = (value) => `${Number(value || 0).toLocaleString('vi-VN')}Ä‘`
const normalizePhoneInput = (value = '') => value.replace(/\s+/g, '').trim()
const normalizeVoucherCode = (value = '') => String(value || '').trim().toUpperCase()
const createIdempotencyKey = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
const formatVoucherValue = (voucher) => {
  if (String(voucher?.voucherType || '').toLowerCase() === 'percent') {
    const maxDiscount = Number(voucher?.maxDiscount || 0) > 0 ? `, tá»‘i Ä‘a ${formatCurrency(voucher.maxDiscount)}` : ''
    return `Giáº£m ${voucher.value}%${maxDiscount}`
  }

  return `Giáº£m ${formatCurrency(voucher?.value || 0)}`
}
const getVoucherAppliesLabel = (voucher) => {
  if (voucher?.appliesTo === 'both') return 'ThuÃª vÃ  mua'
  if (voucher?.appliesTo === 'rental') return 'ÄÆ¡n thuÃª'
  return 'ÄÆ¡n mua'
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

const validateBuyForm = (form, options = {}) => {
  const errors = {}
  const normalizedEmail = String(form.email || '').trim().toLowerCase()

  if (!form.name.trim()) errors.name = 'Vui lòng nhập họ và tên.'
  if (!PHONE_REGEX.test(normalizePhoneInput(form.phone))) errors.phone = 'Số điện thoại chưa hợp lệ.'
  if (!EMAIL_REGEX.test(normalizedEmail)) {
    errors.email = 'Email chưa hợp lệ.'
  } else if (
    options.requireVerifiedEmail &&
    options.verifiedEmail &&
    normalizedEmail !== String(options.verifiedEmail).trim().toLowerCase()
  ) {
    errors.email = 'Email thanh toán phải trùng với email đã xác minh.'
  }
  if (!form.province) errors.province = 'Chọn tỉnh/thành phố.'
  if (!form.district) errors.district = 'Chọn quận/huyện.'
  if (!form.ward) errors.ward = 'Chọn phường/xã.'
  if (!form.detailedAddress.trim()) errors.detailedAddress = 'Nhập địa chỉ chi tiết.'
  return errors
}

function SummaryRow({ label, value, emphasized = false }) {
  return (
    <div className={`flex items-center justify-between gap-4 ${emphasized ? 'text-base font-semibold text-slate-950' : 'text-sm text-slate-500'}`}>
      <span>{label}</span>
      <span className={emphasized ? 'text-rose-700' : 'text-slate-700'}>{value}</span>
    </div>
  )
}

function FieldError({ message }) {
  return message ? <p className="mt-2 text-xs font-medium text-rose-600">{message}</p> : null
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
          <h1 className="text-3xl font-semibold text-slate-900">Giá» hÃ ng Ä‘ang trá»‘ng</h1>
          <p className="mt-3 text-slate-500">ThÃªm sáº£n pháº©m thuÃª hoáº·c mua Ä‘á»ƒ xem tá»•ng quan Ä‘Æ¡n hÃ ng á»Ÿ má»™t nÆ¡i.</p>
          <div className="mt-8 flex justify-center gap-3">
            <Link to="/buy" className="rounded-full bg-rose-600 px-6 py-3 font-semibold text-white">KhÃ¡m phÃ¡ sáº£n pháº©m</Link>
            <Link to="/buy?purpose=rent&openBooking=1" className="rounded-full border border-slate-200 px-6 py-3 font-semibold text-slate-700">Äáº·t lá»‹ch thá»­ Ä‘á»“</Link>
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
          <h1 className="text-3xl font-semibold text-slate-900">Äáº·t hÃ ng thÃ nh cÃ´ng</h1>
          <p className="mt-3 text-slate-500">{message}</p>
          <div className="mt-8 flex justify-center gap-3">
            {rentalOrderId ? <Link to={`/rental/${rentalOrderId}`} className="rounded-full bg-sky-600 px-6 py-3 font-semibold text-white">Xem Ä‘Æ¡n thuÃª</Link> : null}
            <Link to="/buy" className="rounded-full border border-slate-200 px-6 py-3 font-semibold text-slate-700">Tiáº¿p tá»¥c mua sáº¯m</Link>
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
              <p className="mt-1 text-sm text-slate-500">Size {item.size} â€¢ MÃ u {item.color}</p>
            </div>
            <button type="button" onClick={() => onRemove(item.id)} className="inline-flex h-10 w-10 items-center justify-center rounded-2xl text-rose-500 transition hover:bg-rose-50">
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
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">ÄÆ¡n giÃ¡</p>
                <p className="mt-1 text-sm font-medium text-slate-600">{formatCurrency(item.salePrice)}</p>
              </div>
            </div>
          ) : (
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Lá»‹ch thuÃª</p>
                <p className="mt-1 text-sm font-medium text-slate-700">{new Date(item.rentStartDate).toLocaleDateString('vi-VN')} - {new Date(item.rentEndDate).toLocaleDateString('vi-VN')}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Sá»‘ ngÃ y</p>
                <p className="mt-1 text-sm font-medium text-slate-700">{item.days} ngÃ y</p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">ÄÆ¡n giÃ¡ thuÃª</p>
                <p className="mt-1 text-sm font-medium text-slate-700">{formatCurrency(item.rentPrice)}/ngÃ y</p>
              </div>
            </div>
          )}
        </div>
        <div className="sm:w-40 sm:border-l sm:border-slate-100 sm:pl-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{type === 'buy' ? 'ThÃ nh tiá»n' : 'Táº¡m tÃ­nh'}</p>
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
  const [suggestedVouchers, setSuggestedVouchers] = useState([])
  const [voucherSuggestionsLoading, setVoucherSuggestionsLoading] = useState(false)
  const [buyForm, setBuyForm] = useState({
    name: '',
    phone: '',
    email: '',
    province: 'Quáº£ng Nam',
    district: 'ThÃ nh phá»‘ Há»™i An',
    ward: 'Cáº©m PhÃ´',
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
    setBuyForm((prev) => ({ ...prev, [field]: value }))

    if (
      field === 'email' &&
      !isAuthenticated &&
      guestVerificationSession?.verificationToken
    ) {
      setGuestVerificationSession(null)
    }
    setBuyFieldErrors((prev) => {
      if (!prev[field]) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  const buildBuyVoucherCartItems = () =>
    buyItems.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      size: item.size,
      color: item.color,
      salePrice: item.salePrice
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

  const handleOrderVoucher = async () => {
    const code = normalizeVoucherCode(orderVoucherCode)
    if (!code) {
      clearAppliedVoucherState()
      setOrderVoucherMessage('')
      setOrderVoucherError('Vui lÃ²ng nháº­p mÃ£ voucher.')
      return
    }

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

      const [buyResult, rentalResult] = validations
      const candidates = [
        buyResult?.valid ? { target: 'buy', result: buyResult, label: 'Ä‘Æ¡n mua' } : null,
        rentalResult?.valid ? { target: 'rental', result: rentalResult, label: 'Ä‘Æ¡n thuÃª' } : null
      ].filter(Boolean)

      if (candidates.length === 0) {
        setOrderVoucherError(buyResult?.message || rentalResult?.message || 'Voucher khÃ´ng há»£p lá»‡.')
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
      setOrderVoucherMessage(`ÄÃ£ Ã¡p voucher cho ${selected.label}.`)
    } catch (error) {
      setOrderVoucherError(error.response?.data?.message || 'KhÃ´ng thá»ƒ kiá»ƒm tra voucher lÃºc nÃ y.')
    } finally {
      setOrderVoucherLoading(false)
    }
  }

  const handleSelectSuggestedVoucher = async (voucher) => {
    const code = normalizeVoucherCode(voucher?.code)
    if (!code) return
    setOrderVoucherCode(code)
    setOrderVoucherError('')
    setOrderVoucherMessage('')
    setBuyVoucherResult(null)
    setRentalVoucherResult(null)

    setOrderVoucherLoading(true)

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

      const [buyResult, rentalResult] = validations
      const candidates = [
        buyResult?.valid ? { target: 'buy', result: buyResult, label: 'Ä‘Æ¡n mua' } : null,
        rentalResult?.valid ? { target: 'rental', result: rentalResult, label: 'Ä‘Æ¡n thuÃª' } : null
      ].filter(Boolean)

      if (candidates.length === 0) {
        setOrderVoucherError('Voucher nÃ y hiá»‡n chÆ°a Ã¡p dá»¥ng Ä‘Æ°á»£c cho Ä‘Æ¡n hÃ ng cá»§a báº¡n.')
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
      setOrderVoucherMessage(`ÄÃ£ Ã¡p voucher cho ${selected.label}.`)
    } catch (error) {
      setOrderVoucherError(error.response?.data?.message || 'KhÃ´ng thá»ƒ Ã¡p voucher lÃºc nÃ y.')
    } finally {
      setOrderVoucherLoading(false)
    }
  }

  const buildBuyPayload = (session = guestVerificationSession) => ({
    ...(isAuthenticated ? {} : { verificationToken: session?.verificationToken }),
    name: buyForm.name.trim(),
    phone: normalizePhoneInput(buyForm.phone),
    email: buyForm.email.trim().toLowerCase(),
    address: addressPreview,
    paymentMethod: buyForm.paymentMethod,
    note: buyForm.note.trim(),
    shippingFee: buyShippingFee,
    voucherCode: buyVoucherResult?.code || normalizeVoucherCode(buyVoucherCode),
    items: buyItems.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      size: item.size,
      color: item.color,
      salePrice: item.salePrice
    }))
  })

  const buildRentPayload = (idempotencyKey) => ({
    rentStartDate: rentalItems[0]?.rentStartDate,
    rentEndDate: rentalItems[rentalItems.length - 1]?.rentEndDate,
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
  })

  const handleCheckout = async ({ skipGuestVerification = false, session = guestVerificationSession } = {}) => {
    if (rentalItems.length > 0 && !isAuthenticated) return navigate('/login?redirect=/cart')
    if (buyItems.length > 0 && !isAuthenticated && !skipGuestVerification && !session?.verificationToken) {
      setPendingGuestCheckout('combined')
      return setGuestVerificationOpen(true)
    }
    if (rentalItems.length > 0 && rentalItems.some((item) => !item.rentStartDate || !item.rentEndDate)) {
      return setRentalError('Vui lÃ²ng chá»n ngÃ y thuÃª cho táº¥t cáº£ sáº£n pháº©m.')
    }
    const maxRentalDays = parseInt(import.meta.env.VITE_MAX_RENTAL_DAYS || '30', 10)
    const overLimitItem = rentalItems.find((item) => {
      if (!item.rentStartDate || !item.rentEndDate) return false
      const days = Math.ceil((new Date(item.rentEndDate) - new Date(item.rentStartDate)) / (24 * 60 * 60 * 1000))
      return days > maxRentalDays
    })
    if (overLimitItem) {
      return setRentalError(`Thá»i gian thuÃª tá»‘i Ä‘a lÃ  ${maxRentalDays} ngÃ y cho má»—i sáº£n pháº©m.`)
    }

    const verifiedEmailFromSession = String(session?.guestVerification?.email || '').trim().toLowerCase()
    const validationErrors = validateBuyForm(buyForm, {
      requireVerifiedEmail: buyItems.length > 0 && !isAuthenticated && Boolean(session?.verificationToken),
      verifiedEmail: verifiedEmailFromSession,
    })
    if (buyItems.length > 0 && Object.keys(validationErrors).length > 0) {
      setBuyFieldErrors(validationErrors)
      return setBuyError('Vui lÃ²ng hoÃ n thiá»‡n Ä‘áº§y Ä‘á»§ thÃ´ng tin giao hÃ ng.')
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
            // Táº¡o link PayOS vÃ  redirect â€” khÃ´ng gá»i payDepositApi
            clearRentalCart()
            const linkData = await createDepositPaymentLinkApi(createdRentalOrderId)
            window.location.href = linkData.data.paymentUrl
            return // dá»«ng táº¡i Ä‘Ã¢y, trang sáº½ redirect
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

        // Náº¿u chá»n PayOS cho Ä‘Æ¡n mua â†’ táº¡o link vÃ  redirect (cáº£ guest láº«n member)
        if (buyForm.paymentMethod === 'PayOS' && saleOrderId) {
          const linkData = await createSalePaymentLinkApi(saleOrderId)
          window.location.href = linkData.data.paymentUrl
          return
        }
        if (!isAuthenticated) setGuestVerificationSession(null)
        saveAddressHistory({
          province: buyForm.province,
          district: buyForm.district,
          ward: buyForm.ward,
          detailedAddress: buyForm.detailedAddress.trim(),
          hotel: ''
        })
        setAddressHistory(getStoredAddressHistory())
      }

      const messages = []
      if (createdRentalOrderId) messages.push(`Ä‘Æ¡n thuÃª ${String(createdRentalOrderId).slice(-8)} Ä‘Ã£ Ä‘Æ°á»£c táº¡o vÃ  thanh toÃ¡n cá»c`)
      if (saleOrderId) messages.push(`Ä‘Æ¡n mua ${String(saleOrderId).slice(-8)} Ä‘Ã£ Ä‘Æ°á»£c ghi nháº­n`)

      const successMessage = messages.length > 0 ? `ÄÃ£ xá»­ lÃ½ thÃ nh cÃ´ng ${messages.join(', ')}.` : 'ÄÆ¡n hÃ ng Ä‘Ã£ Ä‘Æ°á»£c ghi nháº­n.'
      setBuySuccess(successMessage)
      setCheckoutResult({ message: successMessage, rentalOrderId: createdRentalOrderId })
    } catch (err) {
      if (createdRentalOrderId) {
        clearRentalCart()
        setBuyError(`ÄÆ¡n thuÃª ${String(createdRentalOrderId).slice(-8)} Ä‘Ã£ táº¡o thÃ nh cÃ´ng nhÆ°ng pháº§n Ä‘Æ¡n mua bá»‹ lá»—i. ${err.response?.data?.message || 'Vui lÃ²ng thá»­ láº¡i pháº§n mua.'}`)
      } else {
        setBuyError(err.response?.data?.message || 'KhÃ´ng thá»ƒ xá»­ lÃ½ checkout. Vui lÃ²ng thá»­ láº¡i.')
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
              Quay láº¡i mua sáº¯m
            </Link>
            <div className="mt-2 flex items-center gap-3">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-600 text-white shadow-sm">
                <Lock className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-rose-500">Thanh toÃ¡n an toÃ n</p>
                <h1 className="text-lg font-semibold text-slate-950 sm:text-xl">HoÃ n táº¥t Ä‘Æ¡n hÃ ng INHERE</h1>
              </div>
            </div>
          </div>

          <div className="hidden rounded-2xl border border-rose-100 bg-white/80 px-4 py-3 text-right shadow-sm sm:block">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">ÄÆ¡n hiá»‡n táº¡i</p>
            <p className="mt-1 text-sm font-medium text-slate-600">{combinedCount} sáº£n pháº©m</p>
            <p className="mt-1 text-lg font-semibold text-slate-950">{formatCurrency(combinedTotal)}</p>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-5 md:px-6 lg:py-8">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.28fr)_minmax(350px,0.82fr)] lg:gap-8">
          <section className="space-y-8">
            {rentalItems.length > 0 ? (
              <div className="rounded-[28px] border border-sky-100 bg-[linear-gradient(180deg,rgba(239,246,255,0.75),rgba(255,255,255,0.95))] p-5 lg:p-6">
                <h2 className="mb-5 text-xl font-semibold text-slate-900">Giá» thuÃª</h2>
                <div className="space-y-4">
                  {rentalItemsWithTotal.map((item) => (
                    <CartItemCard key={item.id} item={item} type="rental" onRemove={removeRentalItem} subtotal={item.subtotal} />
                  ))}
                </div>
              </div>
            ) : null}

            {buyItems.length > 0 ? (
              <div className="rounded-[28px] border border-rose-100 bg-[linear-gradient(180deg,rgba(255,241,242,0.76),rgba(255,255,255,0.96))] p-5 lg:p-6">
                <h2 className="mb-5 text-xl font-semibold text-slate-900">Giá» mua</h2>
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
                    <SummaryRow label="Táº¡m tÃ­nh" value={formatCurrency(buySubtotal)} />
                    {buyVoucherResult ? <SummaryRow label={`Voucher (${buyVoucherResult.code})`} value={`-${formatCurrency(buyDiscountAmount)}`} /> : null}
                    <div className="border-t border-slate-200 pt-3">
                      <SummaryRow label="Tá»•ng thanh toÃ¡n" value={formatCurrency(buyGrandTotal)} emphasized />
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </section>

          <aside className="xl:sticky xl:top-24 xl:self-start">
            <div className="space-y-5 rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
              <div className="border-b border-slate-100 pb-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-rose-500">Thanh toÃ¡n</p>
                <h3 className="mt-2 text-xl font-semibold text-slate-950">Thanh toÃ¡n thuÃª vÃ  mua</h3>
              </div>

              {combinedCount > 0 ? (
                <div className="rounded-3xl border border-amber-100 bg-amber-50/70 p-5">
                  <p className="text-sm font-semibold text-slate-900">Voucher Ä‘Æ¡n hÃ ng</p>
                  <p className="mt-1 text-sm text-slate-500">Há»‡ thá»‘ng sáº½ tá»± Ã¡p mÃ£ vÃ o Ä‘Æ¡n mua hoáº·c Ä‘Æ¡n thuÃª phÃ¹ há»£p.</p>
                  <div className="mt-4 flex gap-2">
                    <input
                      type="text"
                      value={orderVoucherCode}
                      onChange={(event) => setOrderVoucherCode(normalizeVoucherCode(event.target.value))}
                      placeholder="Nháº­p mÃ£ voucher"
                      className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-amber-300"
                    />
                    <button type="button" onClick={handleOrderVoucher} disabled={orderVoucherLoading} className="rounded-2xl bg-amber-500 px-4 py-3 text-sm font-semibold text-white">
                      {orderVoucherLoading ? 'Äang Ã¡p dá»¥ng...' : 'Ãp dá»¥ng'}
                    </button>
                  </div>
                  {isAuthenticated ? (
                    <div className="mt-4">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Voucher gá»£i Ã½</p>
                        {voucherSuggestionsLoading ? <span className="text-xs text-slate-400">Äang táº£i...</span> : null}
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
                                      ÄÆ¡n tá»‘i thiá»ƒu {formatCurrency(voucher.minOrderValue || 0)}
                                    </p>
                                  </div>
                                  <span className="text-xs font-semibold text-amber-600">
                                    {isSelected ? 'ÄÃ£ chá»n' : 'Chá»n nhanh'}
                                  </span>
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      ) : !voucherSuggestionsLoading ? (
                        <p className="rounded-2xl bg-white/80 px-4 py-3 text-sm text-slate-500">
                          ChÆ°a cÃ³ voucher phÃ¹ há»£p vá»›i giá» hÃ ng hiá»‡n táº¡i.
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
                    <SummaryRow label="Táº¡m tÃ­nh thuÃª" value={formatCurrency(rentalTotalAmount)} />
                    {rentalVoucherResult ? <SummaryRow label={`Voucher (${rentalVoucherResult.code})`} value={`-${formatCurrency(rentalDiscountAmount)}`} /> : null}
                    <SummaryRow label="CÃ²n láº¡i táº¡i cá»­a hÃ ng" value={formatCurrency(rentalRemainingAmount)} />
                    <div className="border-t border-slate-200 pt-3">
                      <SummaryRow label="Äáº·t cá»c 50%" value={formatCurrency(rentalDepositAmount)} emphasized />
                    </div>
                  </div>

                  <div className="mt-5 space-y-2">
                    <label className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm cursor-pointer transition ${rentalPaymentMethod === 'Cash' ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200'}`}>
                      <input type="radio" name="rentalPaymentMethod" value="Cash" checked={rentalPaymentMethod === 'Cash'} onChange={(e) => setRentalPaymentMethod(e.target.value)} />
                      <span className="text-slate-700">ðŸ’µ Tiá»n máº·t táº¡i cá»­a hÃ ng</span>
                    </label>
                    <label className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm cursor-pointer transition ${rentalPaymentMethod === 'PayOS' ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200'}`}>
                      <input type="radio" name="rentalPaymentMethod" value="PayOS" checked={rentalPaymentMethod === 'PayOS'} onChange={(e) => setRentalPaymentMethod(e.target.value)} />
                      <span className="text-slate-700">ðŸ“± Thanh toÃ¡n báº±ng QR</span>
                      <span className="ml-auto rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-600">Nhanh hÆ¡n</span>
                    </label>
                  </div>
                  {rentalPaymentMethod === 'PayOS' && (
                    <p className="mt-2 text-xs text-indigo-600 bg-indigo-50 rounded-xl px-3 py-2">
                      Báº¡n sáº½ Ä‘Æ°á»£c chuyá»ƒn Ä‘áº¿n trang thanh toÃ¡n QR Ä‘á»ƒ quÃ©t mÃ£ hoáº·c chuyá»ƒn khoáº£n. ÄÆ¡n thuÃª sáº½ Ä‘Æ°á»£c xÃ¡c nháº­n ngay sau khi thanh toÃ¡n.
                    </p>
                  )}

                  {rentalError ? <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">{rentalError}</p> : null}

                  {buyItems.length === 0 ? (
                    <button type="button" onClick={handleCheckout} disabled={rentalLoading} className="mt-5 w-full rounded-full bg-sky-600 px-5 py-3 font-semibold text-white">
                      {rentalLoading ? 'Äang xá»­ lÃ½...' : `Äáº·t cá»c ${formatCurrency(rentalDepositAmount)}`}
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
                        {guestVerificationSession?.verificationToken ? 'ÄÃ£ xÃ¡c minh guest báº±ng email.' : 'Báº¡n cáº§n xÃ¡c minh email trÆ°á»›c khi thanh toÃ¡n.'}
                      </div>

                      <CheckoutSection icon={User} title="ThÃ´ng tin khÃ¡ch hÃ ng" subtitle="ThÃ´ng tin liÃªn há»‡ Ä‘á»ƒ xÃ¡c nháº­n Ä‘Æ¡n vÃ  cáº­p nháº­t giao hÃ ng.">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="sm:col-span-2">
                            <label className="mb-2 block text-sm font-medium text-slate-700">Há» vÃ  tÃªn</label>
                            <input type="text" value={buyForm.name} onChange={(event) => handleBuyFieldChange('name', event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-rose-300" />
                            <FieldError message={buyFieldErrors.name} />
                          </div>
                          <div>
                            <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700"><Phone className="h-4 w-4 text-slate-400" />Sá»‘ Ä‘iá»‡n thoáº¡i</label>
                            <input type="tel" value={buyForm.phone} onChange={(event) => handleBuyFieldChange('phone', event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-rose-300" />
                            <FieldError message={buyFieldErrors.phone} />
                          </div>
                          <div>
                            <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700"><Mail className="h-4 w-4 text-slate-400" />Email</label>
                            <input type="email" value={buyForm.email} onChange={(event) => handleBuyFieldChange('email', event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-rose-300" />
                            <FieldError message={buyFieldErrors.email} />
                          </div>
                        </div>
                      </CheckoutSection>

                      <CheckoutSection icon={MapPin} title="Äá»‹a chá»‰ giao hÃ ng" subtitle="Chá»n khu vá»±c giao hÃ ng.">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <label className="mb-2 block text-sm font-medium text-slate-700">Tá»‰nh / ThÃ nh phá»‘</label>
                            <select value={buyForm.province} onChange={(event) => handleBuyFieldChange('province', event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-rose-300">
                              {ADDRESS_DATA.map((item) => <option key={item.province} value={item.province}>{item.province}</option>)}
                            </select>
                            <FieldError message={buyFieldErrors.province} />
                          </div>
                          <div>
                            <label className="mb-2 block text-sm font-medium text-slate-700">Quáº­n / Huyá»‡n</label>
                            <select value={buyForm.district} onChange={(event) => handleBuyFieldChange('district', event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-rose-300">
                              {districtOptions.map((item) => <option key={item.district} value={item.district}>{item.district}</option>)}
                            </select>
                            <FieldError message={buyFieldErrors.district} />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="mb-2 block text-sm font-medium text-slate-700">PhÆ°á»ng / XÃ£</label>
                            <select value={buyForm.ward} onChange={(event) => handleBuyFieldChange('ward', event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-rose-300">
                              {wardOptions.map((ward) => <option key={ward} value={ward}>{ward}</option>)}
                            </select>
                            <FieldError message={buyFieldErrors.ward} />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="mb-2 block text-sm font-medium text-slate-700">Äá»‹a chá»‰ chi tiáº¿t</label>
                            <input type="text" value={buyForm.detailedAddress} onChange={(event) => handleBuyFieldChange('detailedAddress', event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-rose-300" />
                            <FieldError message={buyFieldErrors.detailedAddress} />
                          </div>
                        </div>

                        {addressSuggestions.length > 0 ? <div className="rounded-2xl bg-white px-4 py-4 text-sm text-slate-500">{addressSuggestions[0].detailedAddress}</div> : null}

                        <div className="rounded-2xl bg-white px-4 py-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Äá»‹a chá»‰ giao hÃ ng</p>
                          <p className="mt-2 text-sm leading-6 text-slate-700">{addressPreview || 'Äá»‹a chá»‰ sáº½ hiá»ƒn thá»‹ á»Ÿ Ä‘Ã¢y sau khi báº¡n nháº­p Ä‘áº§y Ä‘á»§ thÃ´ng tin.'}</p>
                        </div>
                      </CheckoutSection>

                      <CheckoutSection icon={CreditCard} title="PhÆ°Æ¡ng thá»©c thanh toÃ¡n" subtitle="Chá»n phÆ°Æ¡ng thá»©c thanh toÃ¡n.">
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

                      <button type="button" onClick={handleCheckout} disabled={buyLoading || rentalLoading} className="mt-5 w-full rounded-[22px] bg-[linear-gradient(135deg,#e11d48,#f97316)] px-5 py-4 text-base font-semibold text-white">
                        {buyLoading || rentalLoading ? 'Äang xá»­ lÃ½...' : rentalItems.length > 0 ? `XÃ¡c nháº­n thanh toÃ¡n ${formatCurrency(combinedTotal)}` : `XÃ¡c nháº­n mua ${formatCurrency(buyGrandTotal)}`}
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

