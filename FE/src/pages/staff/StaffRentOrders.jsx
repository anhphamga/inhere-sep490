import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getAllRentOrdersApi, getRentOrderByIdApi, confirmRentOrderApi, markWaitingPickupApi, confirmPickupApi, confirmReturnApi, completeWashingApi, finalizeRentOrderApi, markNoShowApi, searchCustomersApi, createWalkInOrderApi, createGuestCustomerApi } from '../../services/rent-order.service'
import { createExtraDuePaymentLinkApi } from '../../services/payment.service'
import axiosClient from '../../config/axios'

const statusLabels = {
  Draft: 'Nháp',
  PendingDeposit: 'Chờ đặt cọc',
  Deposited: 'Đã đặt cọc',
  Confirmed: 'Đã xác nhận',
  WaitingPickup: 'Chờ lấy đồ',
  Renting: 'Đang thuê',
  WaitingReturn: 'Chờ trả',
  Returned: 'Đã trả',
  Late: 'Trễ hạn',
  Compensation: 'Bồi thường',
  NoShow: 'Không nhận đồ',
  Completed: 'Hoàn tất',
  Cancelled: 'Đã hủy'
}

const statusColors = {
  Draft: 'bg-gray-100 text-gray-800',
  PendingDeposit: 'bg-yellow-100 text-yellow-800',
  Deposited: 'bg-blue-100 text-blue-800',
  Confirmed: 'bg-indigo-100 text-indigo-800',
  WaitingPickup: 'bg-purple-100 text-purple-800',
  Renting: 'bg-green-100 text-green-800',
  WaitingReturn: 'bg-orange-100 text-orange-800',
  Returned: 'bg-cyan-100 text-cyan-800',
  Late: 'bg-amber-100 text-amber-800',
  Compensation: 'bg-rose-100 text-rose-800',
  NoShow: 'bg-red-100 text-red-800',
  Completed: 'bg-green-200 text-green-800',
  Cancelled: 'bg-red-100 text-red-800'
}

const getCustomerText = (customer) => {
  if (!customer) return 'N/A'
  if (typeof customer === 'string') return customer
  if (typeof customer === 'object') {
    const name = customer.name || ''
    const phone = customer.phone || ''
    const email = customer.email || ''
    if (name && phone) return `${name} - ${phone}`
    if (name && email) return `${name} - ${email}`
    if (name) return name
    if (phone) return phone
    if (email) return email
    if (customer._id) return customer._id
  }
  return 'N/A'
}

const formatMoney = (value) => `${Number(value || 0).toLocaleString('vi-VN')}đ`
const formatDate = (value) => (value ? new Date(value).toLocaleDateString('vi-VN') : 'N/A')
const formatDateTime = (value) => (value ? new Date(value).toLocaleString('vi-VN') : 'N/A')
const displayOrderCode = (order) => order?.orderCode || `#${String(order?._id || '').slice(-8).toUpperCase()}`

export default function StaffRentOrders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')
  const [actionSuccess, setActionSuccess] = useState('')
  const [finalizeMethod, setFinalizeMethod] = useState('Cash')

  const showError = (msg) => {
    setError(msg)
    setActionSuccess('')
    setTimeout(() => setError(''), 6000)
  }

  const showSuccess = (msg) => {
    setActionSuccess(msg)
    setError('')
    setTimeout(() => setActionSuccess(''), 4000)
  }

  // Collateral modal state
  const [showCollateralModal, setShowCollateralModal] = useState(false)
  const [pickupOrderId, setPickupOrderId] = useState(null)
  const [pickupOrderRemaining, setPickupOrderRemaining] = useState(0)
  const [collateralType, setCollateralType] = useState('CASH')
  const [collateralValue, setCollateralValue] = useState('')
  const [collateralError, setCollateralError] = useState('')

  // Return modal state
  const [showReturnModal, setShowReturnModal] = useState(false)
  const [returnOrderId, setReturnOrderId] = useState(null)
  const [returnItems, setReturnItems] = useState([])
  const [returnNote, setReturnNote] = useState('')
  const [returnWashingFee, setReturnWashingFee] = useState('')
  const [returnError, setReturnError] = useState('')

  // Walk-in modal state
  const [showWalkInModal, setShowWalkInModal] = useState(false)
  const [walkInStep, setWalkInStep] = useState(1) // 1: chọn khách, 2: chọn đồ + ngày
  const [walkInCustomerQuery, setWalkInCustomerQuery] = useState('')
  const [walkInCustomerResults, setWalkInCustomerResults] = useState([])
  const [walkInCustomer, setWalkInCustomer] = useState(null)
  const [walkInCustomerSearching, setWalkInCustomerSearching] = useState(false)
  const [walkInStartDate, setWalkInStartDate] = useState('')
  const [walkInEndDate, setWalkInEndDate] = useState('')
  const [walkInProductQuery, setWalkInProductQuery] = useState('')
  const [walkInProductResults, setWalkInProductResults] = useState([])
  const [walkInProductSearching, setWalkInProductSearching] = useState(false)
  const [walkInItems, setWalkInItems] = useState([]) // { productId, name, image, rentPrice, qty }
  const [walkInLoading, setWalkInLoading] = useState(false)
  const [walkInError, setWalkInError] = useState('')
  const [walkInCustomerMode, setWalkInCustomerMode] = useState('search') // 'search' | 'new'
  const [walkInNewName, setWalkInNewName] = useState('')
  const [walkInNewPhone, setWalkInNewPhone] = useState('')
  const [walkInCreatingGuest, setWalkInCreatingGuest] = useState(false)
  const walkInSearchTimer = useRef(null)

  // Fetch full order detail (có collaterals, deposits, payments) khi click vào đơn
  const selectOrder = useCallback(async (order) => {
    setSelectedOrder(order) // set ngay để UX nhanh
    try {
      const res = await getRentOrderByIdApi(order._id)
      if (res?.data) setSelectedOrder(res.data)
    } catch {
      // giữ nguyên data cũ nếu fetch thất bại
    }
  }, [])

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const response = await getAllRentOrdersApi({})
      const allOrders = response.data || []

      // Filter locally if status selected
      if (filterStatus) {
        setOrders(allOrders.filter(o => o.status === filterStatus))
      } else {
        setOrders(allOrders)
      }
    } catch (err) {
      console.error('Error fetching orders:', err)
      setError('Không thể tải danh sách đơn thuê')
    } finally {
      setLoading(false)
    }
  }, [filterStatus])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  const handleConfirm = async (orderId) => {
    setActionLoading(true)
    try {
      await confirmRentOrderApi(orderId)
      showSuccess('Xác nhận đơn thành công!')
      fetchOrders()
      setSelectedOrder(null)
    } catch (err) {
      showError(err.response?.data?.message || 'Có lỗi xảy ra khi xác nhận đơn')
    } finally {
      setActionLoading(false)
    }
  }

  const handleMarkWaitingPickup = async (orderId) => {
    setActionLoading(true)
    try {
      await markWaitingPickupApi(orderId)
      showSuccess('Đơn đã chuyển sang chờ khách lấy đồ!')
      fetchOrders()
      setSelectedOrder(null)
    } catch (err) {
      showError(err.response?.data?.message || 'Có lỗi xảy ra')
    } finally {
      setActionLoading(false)
    }
  }

  const openCollateralModal = (orderId, remainingAmount = 0) => {
    setCollateralError('')
    setCollateralType('CASH')
    setCollateralValue('')
    setPickupOrderId(orderId)
    setPickupOrderRemaining(Number(remainingAmount) || 0)
    setShowCollateralModal(true)
  }

  const closeCollateralModal = () => {
    setShowCollateralModal(false)
    setPickupOrderId(null)
    setPickupOrderRemaining(0)
  }

  // --- Walk-in helpers ---
  const todayIso = () => new Date().toISOString().slice(0, 10)

  const walkInDays = useMemo(() => {
    if (!walkInStartDate || !walkInEndDate) return 1
    const diffMs = new Date(walkInEndDate) - new Date(walkInStartDate)
    if (diffMs <= 0) return 1
    return Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
  }, [walkInStartDate, walkInEndDate])

  const walkInTotal = useMemo(() => {
    return walkInItems.reduce((sum, item) => sum + item.rentPrice * walkInDays, 0)
  }, [walkInItems, walkInDays])

  const walkInDeposit = Math.round(walkInTotal * 0.5)

  const openWalkInModal = () => {
    setWalkInStep(1)
    setWalkInCustomerQuery('')
    setWalkInCustomerResults([])
    setWalkInCustomer(null)
    setWalkInCustomerMode('search')
    setWalkInNewName('')
    setWalkInNewPhone('')
    setWalkInStartDate(todayIso())
    setWalkInEndDate(todayIso())
    setWalkInProductQuery('')
    setWalkInProductResults([])
    setWalkInItems([])
    setWalkInError('')
    setShowWalkInModal(true)
  }

  const handleWalkInCustomerSearch = async (q) => {
    setWalkInCustomerQuery(q)
    clearTimeout(walkInSearchTimer.current)
    if (!q.trim()) { setWalkInCustomerResults([]); return }
    walkInSearchTimer.current = setTimeout(async () => {
      setWalkInCustomerSearching(true)
      try {
        const res = await searchCustomersApi(q)
        setWalkInCustomerResults(res.data || [])
      } catch { setWalkInCustomerResults([]) }
      finally { setWalkInCustomerSearching(false) }
    }, 350)
  }

  const handleWalkInProductSearch = async (q) => {
    setWalkInProductQuery(q)
    clearTimeout(walkInSearchTimer.current)
    if (!q.trim()) { setWalkInProductResults([]); return }
    walkInSearchTimer.current = setTimeout(async () => {
      setWalkInProductSearching(true)
      try {
        const res = await axiosClient.get('/products', { params: { search: q, purpose: 'rent', limit: 8 } })
        setWalkInProductResults(res.data?.data || [])
      } catch { setWalkInProductResults([]) }
      finally { setWalkInProductSearching(false) }
    }, 350)
  }

  const handleCreateGuestCustomer = async () => {
    if (!walkInNewName.trim()) { setWalkInError('Vui lòng nhập tên khách hàng'); return }
    setWalkInError('')
    setWalkInCreatingGuest(true)
    try {
      const res = await createGuestCustomerApi({ name: walkInNewName.trim(), phone: walkInNewPhone.trim() || undefined })
      setWalkInCustomer(res.data)
      setWalkInCustomerMode('search')
      setWalkInNewName('')
      setWalkInNewPhone('')
    } catch (err) {
      const data = err.response?.data
      // Nếu SĐT đã tồn tại, backend trả về existingCustomer để staff dùng luôn
      if (data?.existingCustomer) {
        setWalkInCustomer(data.existingCustomer)
        setWalkInCustomerMode('search')
        setWalkInNewName('')
        setWalkInNewPhone('')
        setWalkInError('')
      } else {
        setWalkInError(data?.message || 'Có lỗi xảy ra')
      }
    } finally {
      setWalkInCreatingGuest(false)
    }
  }

  const walkInAddProduct = (product) => {
    const rentPrice = Number(product.baseRentPrice || product.commonRentPrice || product.rentPrice || 0)
    if (!rentPrice) return
    setWalkInItems((prev) => {
      const exists = prev.find((i) => i.productId === product._id)
      if (exists) return prev
      return [...prev, {
        productId: product._id,
        name: typeof product.name === 'object' ? (product.name?.vi || product.name?.en || '') : (product.name || ''),
        image: product.images?.[0] || '',
        rentPrice,
      }]
    })
    setWalkInProductQuery('')
    setWalkInProductResults([])
  }

  const walkInRemoveProduct = (productId) => {
    setWalkInItems((prev) => prev.filter((i) => i.productId !== productId))
  }

  const handleCreateWalkIn = async () => {
    if (!walkInCustomer) { setWalkInError('Chưa chọn khách hàng'); return }
    if (walkInItems.length === 0) { setWalkInError('Chưa chọn sản phẩm nào'); return }
    if (!walkInStartDate || !walkInEndDate) { setWalkInError('Chưa chọn ngày thuê'); return }
    if (new Date(walkInEndDate) < new Date(walkInStartDate)) {
      setWalkInError('Ngày kết thúc không thể trước ngày bắt đầu'); return
    }
    setWalkInError('')
    setWalkInLoading(true)
    try {
      const items = walkInItems.map((item) => ({
        productId: item.productId,
        finalPrice: item.rentPrice * walkInDays,
        baseRentPrice: item.rentPrice,
        rentStartDate: walkInStartDate,
        rentEndDate: walkInEndDate,
      }))
      const res = await createWalkInOrderApi({
        customerId: walkInCustomer._id,
        rentStartDate: walkInStartDate,
        rentEndDate: walkInEndDate,
        items,
        depositMethod: 'Cash',
      })
      showSuccess(res.message || 'Tạo đơn tại chỗ thành công!')
      setShowWalkInModal(false)
      fetchOrders()
    } catch (err) {
      setWalkInError(err.response?.data?.message || 'Có lỗi xảy ra khi tạo đơn')
    } finally {
      setWalkInLoading(false)
    }
  }

  const COLLATERAL_RULES = {
    CCCD:  { regex: /^\d{12}$/, hint: '12 chữ số', label: 'Số CCCD', placeholder: 'VD: 079012345678' },
    GPLX:  { regex: /^\d{12}$/, hint: '12 chữ số', label: 'Số GPLX', placeholder: 'VD: 079012345678' },
    CAVET: { regex: /^[A-Z0-9\-]{6,20}$/i, hint: '6–20 ký tự (chữ, số, gạch ngang)', label: 'Số Cavet xe', placeholder: 'VD: 51A-12345' },
  }

  const validateCollateral = (type, value, minCash = 0) => {
    if (type === 'CASH') {
      const n = Number(value)
      if (!value || value === '' || Number.isNaN(n)) return 'Vui lòng nhập số tiền thế chấp.'
      if (n <= 0) return 'Số tiền phải lớn hơn 0.'
      if (!Number.isInteger(n)) return 'Số tiền phải là số nguyên (không có phần thập phân).'
      if (minCash > 0 && n < minCash) return `Số tiền tối thiểu phải là ${minCash.toLocaleString('vi-VN')}đ (gồm ${minCash.toLocaleString('vi-VN')}đ còn lại + phần thế chấp bảo đảm).`
      return ''
    }
    const rule = COLLATERAL_RULES[type]
    if (!rule) return ''
    const doc = String(value || '').trim()
    if (!doc) return `Vui lòng nhập ${rule.label}.`
    if (!rule.regex.test(doc)) return `${rule.label} không đúng định dạng (${rule.hint}).`
    return ''
  }

  const handlePickup = async () => {
    if (!pickupOrderId) return

    if (!collateralType) {
      setCollateralError('Vui lòng chọn loại thế chấp.')
      return
    }

    const validationMsg = validateCollateral(collateralType, collateralValue, collateralType === 'CASH' ? pickupOrderRemaining : 0)
    if (validationMsg) {
      setCollateralError(validationMsg)
      return
    }

    const collateral = { type: collateralType }

    if (collateralType === 'CASH') {
      collateral.cashAmount = Number(collateralValue)
    } else {
      collateral.documentNumber = String(collateralValue || '').trim().toUpperCase()
    }

    setActionLoading(true)
    setCollateralError('')
    try {
      await confirmPickupApi(pickupOrderId, { collateral })
      showSuccess('Xác nhận lấy đồ thành công!')
      fetchOrders()
      setSelectedOrder(null)
      closeCollateralModal()
    } catch (err) {
      setCollateralError(err.response?.data?.message || 'Có lỗi xảy ra')
    } finally {
      setActionLoading(false)
    }
  }

  const openReturnModal = (order) => {
    setReturnError('')
    setReturnNote('')
    setReturnWashingFee('')

    const items = (order?.items || []).map((item) => ({
      productInstanceId: item.productInstanceId?._id || item.productInstanceId,
      label: item.productInstanceId?.productId?.name || item.productInstanceId?._id || 'Sản phẩm',
      condition: 'Dirty',
      damageFee: ''
    }))

    setReturnItems(items)
    setReturnOrderId(order?._id)
    setShowReturnModal(true)
  }

  const closeReturnModal = () => {
    setShowReturnModal(false)
    setReturnOrderId(null)
    setReturnWashingFee('')
  }

  const handleReturnConfirm = async () => {
    if (!returnOrderId) return

    const returnedItems = returnItems.map((item) => {
      const rawFee = String(item.damageFee || '')
      const parsedFee = parseInt(rawFee.replace(/[^0-9]/g, ''), 10) || 0
      return {
        productInstanceId: item.productInstanceId,
        condition: item.condition,
        damageFee: item.condition === 'Damaged' ? parsedFee : 0
      }
    })

    setActionLoading(true)
    setReturnError('')
    try {
      await confirmReturnApi(returnOrderId, {
        returnedItems,
        note: returnNote,
        washingFee: parseInt(String(returnWashingFee || '0').replace(/[^0-9]/g, ''), 10) || 0
      })
      showSuccess('Xác nhận trả đồ thành công!')
      fetchOrders()
      setSelectedOrder(null)
      closeReturnModal()
    } catch (err) {
      setReturnError(err.response?.data?.message || 'Có lỗi xảy ra')
    } finally {
      setActionLoading(false)
    }
  }

  const handleNoShow = async (orderId) => {
    setActionLoading(true)
    try {
      await markNoShowApi(orderId)
      showSuccess('Đã đánh dấu khách no-show. Cọc bị tịch thu.')
      fetchOrders()
      setSelectedOrder(null)
    } catch (err) {
      showError(err.response?.data?.message || 'Có lỗi xảy ra')
    } finally {
      setActionLoading(false)
    }
  }

  const handleCompleteWashing = async (orderId, method = 'Cash') => {
    setActionLoading(true)
    try {
      await completeWashingApi(orderId, { method })
      showSuccess('Hoàn tất đơn thành công! Sản phẩm đã có sẵn.')
      fetchOrders()
      setSelectedOrder(null)
    } catch (err) {
      showError(err.response?.data?.message || 'Có lỗi xảy ra')
    } finally {
      setActionLoading(false)
    }
  }

  const handleFinalize = async (orderId) => {
    setActionLoading(true)
    try {
      await finalizeRentOrderApi(orderId, { method: finalizeMethod })
      showSuccess('Chốt đơn thành công!')
      fetchOrders()
      setSelectedOrder(null)
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Có lỗi xảy ra khi chốt đơn'
      showError(msg)
    } finally {
      setActionLoading(false)
    }
  }

  const statusSummary = useMemo(() => {
    return orders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1
      return acc
    }, {})
  }, [orders])

  return (
    <div className="min-h-screen bg-slate-100/80">
      <div className="space-y-6">
      {/* Bộ lọc */}
      <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">INHERE Staff</p>
              <h1 className="mt-2 text-2xl font-semibold text-slate-950">Quản lý đơn thuê</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                Theo dõi trạng thái đơn thuê, xử lý nhanh theo từng bước và giữ mọi thông tin vận hành ở một màn hình rõ ràng hơn.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[420px]">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Tổng đơn</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">{orders.length}</p>
              </div>
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-500">Đang thuê</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">{statusSummary.Renting || 0}</p>
              </div>
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-600">Hoàn tất</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">{statusSummary.Completed || 0}</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-end">
              <div className="min-w-0 flex-1">
                <label className="mb-2 block text-sm font-medium text-slate-700">Lọc theo trạng thái</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                >
                  <option value="">Tất cả</option>
                  <option value="PendingDeposit">Chờ đặt cọc</option>
                  <option value="Deposited">Đã đặt cọc</option>
                  <option value="Confirmed">Đã xác nhận</option>
                  <option value="WaitingPickup">Chờ lấy đồ</option>
                  <option value="Renting">Đang thuê</option>
                  <option value="Completed">Hoàn tất</option>
                  <option value="Cancelled">Đã hủy</option>
                </select>
              </div>
              <button
                onClick={fetchOrders}
                className="h-12 rounded-2xl bg-indigo-600 px-5 text-sm font-semibold text-white transition hover:bg-indigo-700"
              >
                Làm mới
              </button>
              <button
                onClick={openWalkInModal}
                className="h-12 rounded-2xl bg-emerald-600 px-5 text-sm font-semibold text-white transition hover:bg-emerald-700 flex items-center gap-2 whitespace-nowrap"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Tạo đơn tại chỗ
              </button>
            </div>
          </div>
        </div>
      </div>

      {actionSuccess && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 shadow-sm">
          <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
          {actionSuccess}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600 shadow-sm">
          <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)]">
        {/* Danh sách đơn */}
        <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Danh sách đơn</p>
              <h3 className="mt-2 text-lg font-semibold text-slate-950">Đơn thuê hiện tại</h3>
            </div>
            <div className="rounded-2xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-600">{orders.length} đơn</div>
          </div>

          {loading ? (
            <div className="flex min-h-[420px] items-center justify-center px-6 py-10">
              <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
            </div>
          ) : orders.length === 0 ? (
            <div className="flex min-h-[420px] items-center justify-center px-6 py-10 text-center text-sm text-slate-500">Không có đơn thuê nào</div>
          ) : (
            <div className="max-h-[calc(100vh-240px)] space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
              {orders.map((order) => (
                <button
                  key={order._id}
                  onClick={() => selectOrder(order)}
                  className={`w-full rounded-[24px] border p-5 text-left transition ${selectedOrder?._id === order._id ? 'border-indigo-200 bg-indigo-50/80 shadow-[0_16px_36px_rgba(79,70,229,0.14)]' : 'border-slate-200 bg-white shadow-sm hover:border-slate-300 hover:bg-slate-50/80 hover:shadow-md'}`}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-base font-semibold text-slate-950">
                        {displayOrderCode(order)}
                      </p>
                      <p className="mt-3 text-sm font-medium text-slate-700">
                        Khách hàng: {getCustomerText(order.customerId)}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        Tạo lúc: {formatDateTime(order.createdAt)}
                      </p>
                    </div>
                    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusColors[order.status] || 'border-slate-200 bg-slate-100 text-slate-700'}`}>
                      {statusLabels[order.status] || order.status}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-slate-50 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Khoảng thuê</p>
                      <p className="mt-1 text-sm font-medium text-slate-700">{formatDate(order.rentStartDate)} - {formatDate(order.rentEndDate)}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-4 py-3 sm:text-right">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Tổng tiền</p>
                      <p className="mt-1 text-sm font-semibold text-slate-950">{formatMoney(order.totalAmount || 0)}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Chi tiết đơn */}
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          {selectedOrder ? (
            <div>
              <div className="rounded-[24px] bg-[linear-gradient(135deg,#eef2ff,#ffffff)] p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-500">Chi tiết đơn</p>
                    <h3 className="mt-2 text-xl font-semibold text-slate-950">{displayOrderCode(selectedOrder)}</h3>
                  </div>
                  <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusColors[selectedOrder.status] || 'border-slate-200 bg-slate-100 text-slate-700'}`}>
                    {statusLabels[selectedOrder.status] || selectedOrder.status}
                  </span>
                </div>
              </div>

              <div className="mt-5 space-y-5">
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Khách hàng</p>
                  <p className="mt-3 text-base font-semibold text-slate-950">{getCustomerText(selectedOrder.customerId)}</p>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Ngày thuê</p>
                  <p className="mt-3 text-base font-semibold text-slate-950">
                    {formatDate(selectedOrder.rentStartDate)} - {formatDate(selectedOrder.rentEndDate)}
                  </p>
                </div>

                {/* Thông tin thanh toán */}
                <div className="rounded-3xl border border-slate-200 bg-white p-5">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Thông tin thanh toán</p>

                  <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Tiền thuê:</span>
                      <span className="font-semibold text-slate-900">{formatMoney(selectedOrder.totalAmount || 0)}</span>
                    </div>
                    <div className="mt-3 flex justify-between text-sm">
                      <span className="text-slate-500">Đặt cọc (50%):</span>
                      <span className="font-semibold text-indigo-600">{formatMoney(selectedOrder.depositAmount || 0)}</span>
                    </div>
                    {selectedOrder.status !== 'Completed' && (
                      <div className="mt-3 flex justify-between border-t border-slate-200 pt-3 text-sm">
                        <span className="text-slate-500">Còn lại:</span>
                        <span className="font-semibold text-slate-900">{formatMoney((selectedOrder.totalAmount || 0) - (selectedOrder.depositAmount || 0))}</span>
                      </div>
                    )}
                  </div>

                  {/* Phí phát sinh (nếu có) — chỉ hiện cho đơn chưa hoàn tất */}
                  {selectedOrder.status !== 'Completed' && (selectedOrder.washingFee > 0 || selectedOrder.damageFee > 0) && (
                    <div className="mt-4 rounded-2xl border border-orange-200 bg-orange-50 p-4">
                      <p className="text-sm font-semibold text-orange-800">Phí phát sinh</p>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Giặt:</span>
                        <span className="font-semibold text-slate-900">{formatMoney(selectedOrder.washingFee || 0)}</span>
                      </div>
                      <div className="mt-2 flex justify-between text-sm">
                        <span className="text-slate-500">Hư hỏng:</span>
                        <span className="font-semibold text-slate-900">{formatMoney(selectedOrder.damageFee || 0)}</span>
                      </div>
                      <div className="mt-3 flex justify-between border-t border-orange-200 pt-3 text-sm font-semibold">
                        <span className="text-orange-800">Tổng cần thanh toán:</span>
                        <span className="text-orange-800">{formatMoney((selectedOrder.totalAmount || 0) - (selectedOrder.depositAmount || 0) + (selectedOrder.washingFee || 0) + (selectedOrder.damageFee || 0))}</span>
                      </div>
                    </div>
                  )}

                  {/* Kết quả quyết toán — chỉ hiện cho đơn Hoàn tất */}
                  {selectedOrder.status === 'Completed' && (() => {
                    const totalFees = (selectedOrder.lateFee || 0) + (selectedOrder.washingFee || 0) + (selectedOrder.damageFee || 0) + (selectedOrder.compensationFee || 0)
                    const grandTotal = (selectedOrder.totalAmount || 0) + totalFees
                    const refundPayment = (selectedOrder.payments || []).filter(p => p.purpose === 'Refund' && p.status === 'Paid').reduce((s, p) => s + (p.amount || 0), 0)
                    const extraPayment = (selectedOrder.payments || []).filter(p => ['LateFee','DamageFee','WashingFee','Compensation','ExtraFee'].includes(p.purpose) && p.status === 'Paid').reduce((s, p) => s + (p.amount || 0), 0)
                    const cashCollateralTotal = (selectedOrder.collaterals || []).filter(c => c.type === 'CASH').reduce((s, c) => s + Number(c.cashAmount || 0), 0)
                    return (
                      <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 p-4 space-y-2">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-green-600 text-base">✅</span>
                          <p className="text-sm font-bold text-green-800">Đã quyết toán xong</p>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Tổng tiền thuê</span>
                          <span className="font-medium text-slate-800">{formatMoney(selectedOrder.totalAmount || 0)}</span>
                        </div>
                        {totalFees > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Phí phát sinh (giặt/hỏng/trễ)</span>
                            <span className="font-medium text-orange-700">{formatMoney(totalFees)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm border-t border-green-200 pt-2 font-semibold">
                          <span className="text-green-800">Tổng chi phí thực tế</span>
                          <span className="text-green-800">{formatMoney(grandTotal)}</span>
                        </div>
                        {cashCollateralTotal > 0 && (
                          <div className="flex justify-between text-sm border-t border-green-200 pt-2">
                            <span className="text-slate-500">Thế chấp tiền mặt đã thu</span>
                            <span className="font-medium text-amber-700">{formatMoney(cashCollateralTotal)}</span>
                          </div>
                        )}
                        {refundPayment > 0 && (
                          <div className="flex justify-between text-sm mt-1 rounded-lg bg-emerald-100 px-3 py-2">
                            <span className="text-emerald-700 font-medium">💵 Đã hoàn tiền mặt cho khách</span>
                            <span className="font-bold text-emerald-700">{formatMoney(refundPayment)}</span>
                          </div>
                        )}
                        {extraPayment > 0 && (
                          <div className="flex justify-between text-sm mt-1 rounded-lg bg-red-100 px-3 py-2">
                            <span className="text-red-700 font-medium">💳 Đã thu thêm từ khách</span>
                            <span className="font-bold text-red-700">{formatMoney(extraPayment)}</span>
                          </div>
                        )}
                        {cashCollateralTotal > 0 && refundPayment === 0 && extraPayment === 0 && (
                          <div className="text-xs text-slate-500 text-center pt-1">
                            Thế chấp vừa đủ phủ khoản nợ, không hoàn/thu thêm
                          </div>
                        )}
                      </div>
                    )
                  })()}
                </div>

                {/* Thế chấp đang giữ */}
                {(() => {
                  const heldCollaterals = (selectedOrder.collaterals || []).filter(c => c.status === 'Held')
                  if (heldCollaterals.length === 0) return null
                  return (
                    <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">Thế chấp đang giữ</p>
                      <div className="mt-3 space-y-2">
                        {heldCollaterals.map((c, i) => (
                          <div key={i} className="flex items-center justify-between rounded-2xl bg-white border border-amber-100 px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="text-base">{c.type === 'CASH' ? '💵' : '🪪'}</span>
                              <span className="text-sm font-medium text-slate-700">
                                {c.type === 'CASH' ? 'Tiền mặt' : c.type}
                              </span>
                            </div>
                            <span className="text-sm font-bold text-amber-700">
                              {c.type === 'CASH'
                                ? `${Number(c.cashAmount || 0).toLocaleString('vi-VN')}đ`
                                : (c.documentNumber || '—')}
                            </span>
                          </div>
                        ))}
                      </div>
                      {heldCollaterals.some(c => c.type === 'CASH') && (
                        <p className="mt-2 text-xs text-amber-600">
                          Phần thừa sau khi trừ khoản còn lại và phí sẽ được hoàn lại cho khách khi kết thúc đơn.
                        </p>
                      )}
                    </div>
                  )
                })()}

                {/* Actions */}
                <div className="rounded-3xl border border-slate-200 bg-white p-5 space-y-3">
                  {selectedOrder.status === 'Deposited' && (
                    <button
                      onClick={() => handleConfirm(selectedOrder._id)}
                      disabled={actionLoading}
                      className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400"
                    >
                      {actionLoading ? 'Đang xử lý...' : 'Xác nhận đơn (Chờ khách lấy đồ)'}
                    </button>
                  )}

                  {['Deposited', 'Confirmed', 'WaitingPickup'].includes(selectedOrder.status) && (
                    <button
                      onClick={() => handleNoShow(selectedOrder._id)}
                      disabled={actionLoading}
                      className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 disabled:bg-gray-400"
                    >
                      {actionLoading ? 'Đang xử lý...' : 'Đánh dấu No-Show'}
                    </button>
                  )}

                  {selectedOrder.status === 'Confirmed' && (
                    <div className="space-y-2">
                      <button
                        onClick={() => handleMarkWaitingPickup(selectedOrder._id)}
                        disabled={actionLoading}
                        className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 disabled:bg-gray-400"
                      >
                        {actionLoading ? 'Đang xử lý...' : 'Chờ khách đến lấy đồ'}
                      </button>
                      <button
                        onClick={() => openCollateralModal(selectedOrder._id, selectedOrder.remainingAmount)}
                        disabled={actionLoading}
                        className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400"
                      >
                        {actionLoading ? 'Đang xử lý...' : 'Khách đến lấy ngay (thu thế chấp)'}
                      </button>
                    </div>
                  )}

                  {selectedOrder.status === 'WaitingPickup' && (
                    <button
                      onClick={() => openCollateralModal(selectedOrder._id, selectedOrder.remainingAmount)}
                      disabled={actionLoading}
                      className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400"
                    >
                      {actionLoading ? 'Đang xử lý...' : 'Xác nhận khách đã lấy đồ'}
                    </button>
                  )}

                  {selectedOrder.status === 'Renting' && (
                    <button
                      onClick={() => openReturnModal(selectedOrder)}
                      disabled={actionLoading}
                      className="w-full bg-orange-600 text-white py-2 rounded-lg hover:bg-orange-700 disabled:bg-gray-400"
                    >
                      {actionLoading ? 'Đang xử lý...' : 'Xác nhận trả đồ'}
                    </button>
                  )}

                  {['WaitingReturn', 'Late', 'Compensation'].includes(selectedOrder.status) && (
                    <div className="border-t pt-4 space-y-4">
                      <p className="text-sm text-gray-600">Xác nhận khách đã trả đồ và chuyển sang bước thanh toán.</p>
                      <button
                        onClick={() => handleFinalize(selectedOrder._id)}
                        disabled={actionLoading}
                        className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400"
                      >
                        {actionLoading ? 'Đang xử lý...' : 'Chốt đơn'}
                      </button>
                    </div>
                  )}

                  {selectedOrder.status === 'Returned' && (
                    <div className="border-t pt-4 space-y-4">
                      {(() => {
                        const dep = selectedOrder.depositAmount || 0
                        const paidRemainingTotal = (selectedOrder.payments || [])
                          .filter(p => p.purpose === 'Remaining' && p.status === 'Paid')
                          .reduce((s, p) => s + (p.amount || 0), 0)
                        const outstandingRemaining = Math.max(0, (selectedOrder.remainingAmount || 0) - paidRemainingTotal)
                        const totalFees = (selectedOrder.lateFee || 0) + (selectedOrder.washingFee || 0) + (selectedOrder.damageFee || 0) + (selectedOrder.compensationFee || 0)
                        const totalOutstanding = outstandingRemaining + totalFees
                        const cashCollateral = (selectedOrder.collaterals || [])
                          .filter(c => c.type === 'CASH' && c.status === 'Held')
                          .reduce((s, c) => s + (c.cashAmount || 0), 0)
                        const hasDocCollateral = (selectedOrder.collaterals || []).some(c => c.type !== 'CASH' && c.status === 'Held')
                        const netCashRefund = Math.max(0, cashCollateral - totalOutstanding)
                        const extraDue = Math.max(0, totalOutstanding - cashCollateral)
                        return (
                          <div className="space-y-3">
                            {/* Bảng chi tiết tài chính */}
                            <div className="rounded-xl bg-gray-50 border border-gray-200 p-3 space-y-2 text-sm">
                              <div className="flex justify-between text-gray-500">
                                <span>Đã đặt cọc (online)</span>
                                <span className="font-medium text-gray-800">{dep.toLocaleString('vi-VN')}đ</span>
                              </div>
                              <div className="flex justify-between text-gray-500">
                                <span>Còn lại cần thu</span>
                                <span className={`font-medium ${outstandingRemaining > 0 ? 'text-orange-600' : 'text-gray-800'}`}>{outstandingRemaining.toLocaleString('vi-VN')}đ</span>
                              </div>
                              <div className="flex justify-between text-gray-500">
                                <span>Tổng phí phát sinh</span>
                                <span className={`font-medium ${totalFees > 0 ? 'text-orange-600' : 'text-gray-800'}`}>{totalFees.toLocaleString('vi-VN')}đ</span>
                              </div>
                              {cashCollateral > 0 && (
                                <div className="flex justify-between border-t border-gray-200 pt-2 text-emerald-700 font-medium">
                                  <span>Thế chấp tiền mặt đang giữ</span>
                                  <span>{cashCollateral.toLocaleString('vi-VN')}đ</span>
                                </div>
                              )}
                            </div>

                            {/* Hành động cần thực hiện */}
                            {netCashRefund > 0 && (
                              <div className="rounded-xl border-2 border-emerald-400 bg-emerald-50 p-4">
                                <div className="flex items-start gap-3">
                                  <span className="text-2xl">💵</span>
                                  <div>
                                    <p className="font-semibold text-emerald-800">Hoàn tiền mặt cho khách</p>
                                    <p className="mt-0.5 text-xs text-emerald-600">Lấy từ tiền thế chấp đang giữ, trả trực tiếp cho khách</p>
                                    <p className="mt-2 text-2xl font-bold text-emerald-700">{netCashRefund.toLocaleString('vi-VN')}đ</p>
                                  </div>
                                </div>
                              </div>
                            )}

                            {extraDue > 0 && (
                              <div className="rounded-xl border-2 border-red-400 bg-red-50 p-4 space-y-3">
                                <div className="flex items-start gap-3">
                                  <span className="text-2xl">💳</span>
                                  <div>
                                    <p className="font-semibold text-red-800">
                                      {hasDocCollateral ? 'Thu tiền từ khách' : 'Thu thêm từ khách'}
                                    </p>
                                    <p className="mt-0.5 text-xs text-red-600">
                                      {hasDocCollateral
                                        ? 'Khách thế chấp giấy tờ — thu khoản còn lại + phí bằng tiền mặt hoặc chuyển khoản'
                                        : 'Thế chấp tiền mặt không đủ phủ khoản nợ, cần thu thêm từ khách'}
                                    </p>
                                    <p className="mt-2 text-2xl font-bold text-red-700">{extraDue.toLocaleString('vi-VN')}đ</p>
                                  </div>
                                </div>
                                <div>
                                  <label className="text-xs font-semibold text-red-700 uppercase tracking-wide">Phương thức thanh toán</label>
                                  <select
                                    value={finalizeMethod}
                                    onChange={(e) => setFinalizeMethod(e.target.value)}
                                    className="mt-1.5 w-full rounded-lg border border-red-300 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
                                  >
                                    <option value="Cash">💵 Tiền mặt</option>
                                    <option value="Online">🏦 Chuyển khoản (staff xác nhận)</option>
                                    <option value="PayOS">📱 PayOS QR (khách tự quét)</option>
                                  </select>
                                  {finalizeMethod === 'PayOS' && (
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        try {
                                          const data = await createExtraDuePaymentLinkApi(selectedOrder._id, extraDue)
                                          window.open(data.data.paymentUrl, '_blank')
                                        } catch (err) {
                                          showError(err.response?.data?.message || 'Không tạo được link PayOS')
                                        }
                                      }}
                                      className="mt-2 w-full rounded-lg border border-red-300 bg-white py-2 text-sm font-semibold text-red-700 hover:bg-red-50 transition"
                                    >
                                      📱 Tạo QR PayOS cho khách quét
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}

                            {netCashRefund === 0 && extraDue === 0 && (
                              <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500 text-center">
                                Không có giao dịch tài chính thêm
                              </div>
                            )}
                          </div>
                        )
                      })()}

                      <button
                        onClick={() => handleCompleteWashing(selectedOrder._id, finalizeMethod)}
                        disabled={actionLoading}
                        className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:bg-gray-400"
                      >
                        {actionLoading ? 'Đang xử lý...' : 'Xác nhận & Hoàn tất đơn'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              Chọn một đơn để xem chi tiết
            </div>
          )}
        </div>
      </div>

      {/* Collateral Modal */}
      {showCollateralModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm px-4 pb-4 sm:items-center sm:pb-0">
          <div className="w-full max-w-md bg-white rounded-[28px] shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-[linear-gradient(135deg,#eef2ff,#fff)] px-6 pt-6 pb-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-100">
                  <svg className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-500">Bàn giao đồ</p>
                  <h2 className="text-lg font-semibold text-slate-950">Thông tin thế chấp</h2>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-5">
              {/* Type selector as cards */}
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Loại thế chấp</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'CASH', label: 'Tiền mặt', icon: '💵' },
                    { value: 'CCCD', label: 'CCCD', icon: '🪪' },
                    { value: 'GPLX', label: 'GPLX', icon: '🚗' },
                    { value: 'CAVET', label: 'Cavet xe', icon: '📋' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => { setCollateralType(opt.value); setCollateralValue(''); setCollateralError(''); }}
                      className={`flex items-center gap-2.5 rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition-all ${
                        collateralType === opt.value
                          ? 'border-indigo-300 bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-200'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-white'
                      }`}
                    >
                      <span className="text-lg">{opt.icon}</span>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Value input */}
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  {collateralType === 'CASH'
                    ? 'Số tiền thế chấp (VND)'
                    : (COLLATERAL_RULES[collateralType]?.label || `Số ${collateralType}`)}
                </label>
                <input
                  type={collateralType === 'CASH' ? 'number' : 'text'}
                  inputMode={collateralType === 'CASH' ? 'numeric' : 'text'}
                  min={collateralType === 'CASH' ? 1 : undefined}
                  step={collateralType === 'CASH' ? 1000 : undefined}
                  maxLength={collateralType === 'CASH' ? undefined : (collateralType === 'CAVET' ? 20 : 12)}
                  value={collateralValue}
                  onChange={(e) => {
                    const val = e.target.value
                    if (collateralType === 'CASH' && val !== '' && Number(val) < 0) return
                    setCollateralValue(val)
                    if (collateralError) setCollateralError(validateCollateral(collateralType, val, collateralType === 'CASH' ? pickupOrderRemaining : 0))
                  }}
                  placeholder={
                    collateralType === 'CASH'
                      ? `Tối thiểu ${pickupOrderRemaining > 0 ? pickupOrderRemaining.toLocaleString('vi-VN') : '0'} + thế chấp`
                      : (COLLATERAL_RULES[collateralType]?.placeholder || `Nhập số ${collateralType}...`)
                  }
                  className={`h-12 w-full rounded-2xl border px-4 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-4 ${
                    collateralError
                      ? 'border-red-300 bg-red-50 focus:border-red-400 focus:ring-red-100'
                      : 'border-slate-200 bg-slate-50 focus:border-indigo-400 focus:bg-white focus:ring-indigo-100'
                  }`}
                />
                {/* Format hint */}
                {!collateralError && collateralType !== 'CASH' && COLLATERAL_RULES[collateralType] && (
                  <p className="mt-1.5 text-xs text-slate-400">
                    Định dạng: {COLLATERAL_RULES[collateralType].hint}
                  </p>
                )}
                {!collateralError && collateralType === 'CASH' && pickupOrderRemaining > 0 && (
                  <p className="mt-1.5 text-xs text-amber-600 font-medium">
                    Tiền mặt này gồm {pickupOrderRemaining.toLocaleString('vi-VN')}đ còn lại + phần thế chấp bảo đảm. Phần thừa sẽ hoàn lại khi kết thúc đơn.
                  </p>
                )}
                {!collateralError && collateralType === 'CASH' && pickupOrderRemaining === 0 && (
                  <p className="mt-1.5 text-xs text-slate-400">Số nguyên dương, đơn vị VND</p>
                )}
              </div>

              {/* Error */}
              {collateralError && (
                <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
                  <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
                  {collateralError}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 border-t border-slate-100 px-6 py-4">
              <button
                type="button"
                onClick={closeCollateralModal}
                disabled={actionLoading}
                className="flex-1 h-11 rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handlePickup}
                disabled={actionLoading}
                className="flex-1 h-11 rounded-2xl bg-indigo-600 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50"
              >
                {actionLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                    Đang xử lý...
                  </span>
                ) : 'Xác nhận bàn giao'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Return Modal */}
      {showReturnModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm px-4 pb-4 sm:items-center sm:pb-0">
          <div className="w-full max-w-xl bg-white rounded-[28px] shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-[linear-gradient(135deg,#fff7ed,#fff)] px-6 pt-6 pb-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-100">
                  <svg className="h-5 w-5 text-orange-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-500">Nhận lại đồ</p>
                  <h2 className="text-lg font-semibold text-slate-950">Xác nhận khách trả đồ</h2>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-5 max-h-[60vh] overflow-y-auto">
              {/* Product list */}
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Tình trạng sản phẩm</p>
                <div className="space-y-3">
                  {returnItems.map((item, index) => (
                    <div key={item.productInstanceId} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-semibold text-slate-800 leading-snug">{item.label}</p>
                        <div className="flex shrink-0 gap-1.5">
                          {[
                            { value: 'Dirty', label: 'Bẩn', active: 'bg-yellow-100 border-yellow-300 text-yellow-700' },
                            { value: 'Damaged', label: 'Hư hỏng', active: 'bg-red-100 border-red-300 text-red-700' },
                          ].map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => {
                                const next = [...returnItems]
                                next[index].condition = opt.value
                                if (opt.value !== 'Damaged') next[index].damageFee = ''
                                setReturnItems(next)
                              }}
                              className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
                                item.condition === opt.value
                                  ? opt.active + ' shadow-sm'
                                  : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-100'
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      {item.condition === 'Damaged' && (
                        <div className="mt-3 flex items-center gap-3">
                          <label className="shrink-0 text-xs font-semibold text-slate-500">Phí bồi thường (VND)</label>
                          <input
                            type="text"
                            value={item.damageFee}
                            onChange={(e) => {
                              const next = [...returnItems]
                              next[index].damageFee = e.target.value
                              setReturnItems(next)
                            }}
                            placeholder="VD: 100000"
                            className="h-9 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 outline-none transition focus:border-red-300 focus:ring-2 focus:ring-red-100"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Washing fee */}
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Phí giặt (VND) — tuỳ chọn
                </label>
                <input
                  type="text"
                  value={returnWashingFee}
                  onChange={(e) => setReturnWashingFee(e.target.value)}
                  placeholder="VD: 30000"
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-300 focus:bg-white focus:ring-4 focus:ring-orange-50"
                />
              </div>

              {/* Note */}
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Ghi chú (tuỳ chọn)
                </label>
                <textarea
                  value={returnNote}
                  onChange={(e) => setReturnNote(e.target.value)}
                  rows={2}
                  placeholder="Ví dụ: 2 món bẩn, 1 món rách cổ..."
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-300 focus:bg-white focus:ring-4 focus:ring-orange-50 resize-none"
                />
              </div>

              {/* Error */}
              {returnError && (
                <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
                  <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
                  {returnError}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 border-t border-slate-100 px-6 py-4">
              <button
                type="button"
                onClick={closeReturnModal}
                disabled={actionLoading}
                className="flex-1 h-11 rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleReturnConfirm}
                disabled={actionLoading}
                className="flex-1 h-11 rounded-2xl bg-orange-500 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600 disabled:opacity-50"
              >
                {actionLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                    Đang xử lý...
                  </span>
                ) : 'Xác nhận trả đồ'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Walk-in Modal */}
      {showWalkInModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm px-4 pb-4 sm:items-center sm:pb-0">
          <div className="w-full max-w-lg bg-white rounded-[28px] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">

            {/* Header */}
            <div className="bg-[linear-gradient(135deg,#ecfdf5,#fff)] px-6 pt-6 pb-5 border-b border-slate-100 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100">
                    <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">Khách đến trực tiếp</p>
                    <h2 className="text-lg font-semibold text-slate-950">Tạo đơn tại chỗ</h2>
                  </div>
                </div>
                {/* Step indicator */}
                <div className="flex items-center gap-2">
                  <span className={`h-7 w-7 rounded-full text-xs font-bold flex items-center justify-center ${walkInStep === 1 ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-700'}`}>1</span>
                  <div className="w-6 h-px bg-slate-300" />
                  <span className={`h-7 w-7 rounded-full text-xs font-bold flex items-center justify-center ${walkInStep === 2 ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'}`}>2</span>
                </div>
              </div>
            </div>

            {/* Body — scrollable */}
            <div className="overflow-y-auto px-6 py-5 space-y-5 flex-1">

              {/* ===== STEP 1: Chọn khách ===== */}
              {walkInStep === 1 && (
                <>
                  {/* Mode toggle */}
                  {!walkInCustomer && (
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { key: 'search', label: 'Khách đã có tài khoản', icon: '🔍' },
                        { key: 'new', label: 'Khách mới (chưa có TK)', icon: '➕' },
                      ].map((m) => (
                        <button
                          key={m.key}
                          type="button"
                          onClick={() => { setWalkInCustomerMode(m.key); setWalkInError(''); setWalkInCustomerQuery(''); setWalkInCustomerResults([]) }}
                          className={`flex items-center gap-2 rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition-all ${
                            walkInCustomerMode === m.key
                              ? 'border-emerald-300 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                              : 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-white'
                          }`}
                        >
                          <span>{m.icon}</span>
                          <span className="truncate text-xs">{m.label}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* --- Mode: Tìm kiếm --- */}
                  {walkInCustomerMode === 'search' && !walkInCustomer && (
                    <>
                      <div className="relative">
                        <input
                          type="text"
                          value={walkInCustomerQuery}
                          onChange={(e) => handleWalkInCustomerSearch(e.target.value)}
                          placeholder="Nhập SĐT, tên hoặc email..."
                          className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 pr-10 text-sm font-medium text-slate-900 outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                        />
                        {walkInCustomerSearching && (
                          <svg className="absolute right-3 top-3.5 h-5 w-5 animate-spin text-slate-400" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                          </svg>
                        )}
                      </div>

                      {walkInCustomerResults.length > 0 && (
                        <div className="space-y-2">
                          {walkInCustomerResults.map((c) => (
                            <button
                              key={c._id}
                              type="button"
                              onClick={() => { setWalkInCustomer(c); setWalkInCustomerResults([]); setWalkInCustomerQuery(''); }}
                              className="w-full flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:border-emerald-300 hover:bg-emerald-50"
                            >
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
                                {(c.name || c.email || '?')[0].toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-slate-900 truncate">{c.name || c.email}</p>
                                <p className="text-xs text-slate-500">{c.phone || c.email || c._id}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                      {walkInCustomerQuery && !walkInCustomerSearching && walkInCustomerResults.length === 0 && (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-center">
                          <p className="text-sm text-slate-500">Không tìm thấy khách hàng phù hợp.</p>
                          <button
                            type="button"
                            onClick={() => { setWalkInCustomerMode('new'); setWalkInNewPhone(walkInCustomerQuery.match(/^\d+$/) ? walkInCustomerQuery : ''); setWalkInError('') }}
                            className="mt-2 text-sm font-semibold text-emerald-600 hover:underline"
                          >
                            Tạo hồ sơ khách mới →
                          </button>
                        </div>
                      )}
                    </>
                  )}

                  {/* --- Mode: Khách mới --- */}
                  {walkInCustomerMode === 'new' && !walkInCustomer && (
                    <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Thông tin khách mới</p>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">Họ tên <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          value={walkInNewName}
                          onChange={(e) => setWalkInNewName(e.target.value)}
                          placeholder="VD: Nguyễn Văn A"
                          className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">Số điện thoại <span className="text-slate-400">(tuỳ chọn)</span></label>
                        <input
                          type="tel"
                          value={walkInNewPhone}
                          onChange={(e) => setWalkInNewPhone(e.target.value)}
                          placeholder="VD: 0912345678"
                          maxLength={11}
                          className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                        />
                      </div>

                      {walkInError && (
                        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600">
                          <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
                          {walkInError}
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={handleCreateGuestCustomer}
                        disabled={walkInCreatingGuest}
                        className="w-full h-11 rounded-2xl bg-emerald-600 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {walkInCreatingGuest ? (
                          <>
                            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                            Đang tạo...
                          </>
                        ) : 'Tạo hồ sơ & Chọn khách này'}
                      </button>
                    </div>
                  )}

                  {/* Selected customer card */}
                  {walkInCustomer && (
                    <div className="flex items-center gap-3 rounded-2xl border-2 border-emerald-400 bg-emerald-50 px-4 py-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-sm font-bold text-white">
                        {(walkInCustomer.name || '?')[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900">{walkInCustomer.name}</p>
                        <p className="text-xs text-slate-500">{walkInCustomer.phone ? walkInCustomer.phone : <span className="italic text-slate-400">Không có SĐT</span>}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => { setWalkInCustomer(null); setWalkInCustomerMode('search') }}
                        className="text-slate-400 hover:text-red-500 transition"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}

                  {/* Error for search mode (not shown inside new-form) */}
                  {walkInError && walkInCustomerMode === 'search' && (
                    <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
                      <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
                      {walkInError}
                    </div>
                  )}
                </>
              )}

              {/* ===== STEP 2: Ngày + sản phẩm ===== */}
              {walkInStep === 2 && (
                <>
                  {/* Customer recap */}
                  <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-2.5">
                    <svg className="h-4 w-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
                    <span className="text-sm font-semibold text-emerald-800">{walkInCustomer?.name}</span>
                    <span className="text-xs text-emerald-600">{walkInCustomer?.phone}</span>
                  </div>

                  {/* Dates */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Ngày bắt đầu</label>
                      <input
                        type="date"
                        value={walkInStartDate}
                        min={todayIso()}
                        onChange={(e) => setWalkInStartDate(e.target.value)}
                        className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-900 outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Ngày kết thúc</label>
                      <input
                        type="date"
                        value={walkInEndDate}
                        min={walkInStartDate || todayIso()}
                        onChange={(e) => setWalkInEndDate(e.target.value)}
                        className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-900 outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                      />
                    </div>
                  </div>
                  {walkInDays > 0 && (
                    <p className="text-xs text-slate-500 -mt-2">Số ngày thuê: <strong className="text-slate-800">{walkInDays} ngày</strong></p>
                  )}

                  {/* Product search */}
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Thêm sản phẩm</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={walkInProductQuery}
                        onChange={(e) => handleWalkInProductSearch(e.target.value)}
                        placeholder="Tìm theo tên sản phẩm..."
                        className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 pr-10 text-sm font-medium text-slate-900 outline-none focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                      />
                      {walkInProductSearching && (
                        <svg className="absolute right-3 top-3 h-5 w-5 animate-spin text-slate-400" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                        </svg>
                      )}
                    </div>

                    {/* Product results dropdown */}
                    {walkInProductResults.length > 0 && (
                      <div className="mt-2 rounded-2xl border border-slate-200 bg-white shadow-lg overflow-hidden">
                        {walkInProductResults.map((p) => {
                          const name = typeof p.name === 'object' ? (p.name?.vi || p.name?.en || '') : (p.name || '')
                          const price = Number(p.baseRentPrice || p.commonRentPrice || p.rentPrice || 0)
                          const alreadyAdded = walkInItems.some((i) => i.productId === p._id)
                          return (
                            <button
                              key={p._id}
                              type="button"
                              disabled={alreadyAdded || !price}
                              onClick={() => walkInAddProduct(p)}
                              className={`w-full flex items-center gap-3 px-4 py-3 text-left border-b border-slate-100 last:border-0 transition ${alreadyAdded ? 'opacity-50 cursor-not-allowed bg-slate-50' : 'hover:bg-emerald-50'}`}
                            >
                              {p.images?.[0] ? (
                                <img src={p.images[0]} alt="" className="h-9 w-9 rounded-xl object-cover shrink-0" />
                              ) : (
                                <div className="h-9 w-9 rounded-xl bg-slate-200 shrink-0" />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-slate-900 truncate">{name}</p>
                                <p className="text-xs text-emerald-600 font-medium">{price ? `${price.toLocaleString('vi-VN')}đ/ngày` : 'Không có giá thuê'}</p>
                              </div>
                              {alreadyAdded && <span className="text-xs text-slate-400 shrink-0">Đã thêm</span>}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Selected items */}
                  {walkInItems.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Danh sách đồ thuê ({walkInItems.length} sản phẩm)</p>
                      {walkInItems.map((item) => (
                        <div key={item.productId} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                          {item.image ? (
                            <img src={item.image} alt="" className="h-10 w-10 rounded-xl object-cover shrink-0" />
                          ) : (
                            <div className="h-10 w-10 rounded-xl bg-slate-200 shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate">{item.name}</p>
                            <p className="text-xs text-slate-500">{item.rentPrice.toLocaleString('vi-VN')}đ/ngày × {walkInDays} ngày = <strong className="text-slate-700">{(item.rentPrice * walkInDays).toLocaleString('vi-VN')}đ</strong></p>
                          </div>
                          <button
                            type="button"
                            onClick={() => walkInRemoveProduct(item.productId)}
                            className="text-slate-300 hover:text-red-500 transition shrink-0"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}

                      {/* Price summary */}
                      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 space-y-2 mt-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600">Tổng tiền thuê</span>
                          <span className="font-semibold text-slate-900">{walkInTotal.toLocaleString('vi-VN')}đ</span>
                        </div>
                        <div className="flex justify-between text-sm border-t border-emerald-200 pt-2">
                          <span className="text-emerald-700 font-semibold">Tiền cọc thu ngay (50%)</span>
                          <span className="font-bold text-emerald-700">{walkInDeposit.toLocaleString('vi-VN')}đ</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Còn lại khi lấy đồ</span>
                          <span className="font-semibold text-slate-700">{(walkInTotal - walkInDeposit).toLocaleString('vi-VN')}đ</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {walkInError && (
                    <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
                      <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
                      {walkInError}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 border-t border-slate-100 px-6 py-4 shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (walkInStep === 2) setWalkInStep(1)
                  else setShowWalkInModal(false)
                }}
                disabled={walkInLoading}
                className="flex-1 h-11 rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                {walkInStep === 2 ? 'Quay lại' : 'Hủy'}
              </button>

              {walkInStep === 1 ? (
                <button
                  type="button"
                  onClick={() => {
                    if (!walkInCustomer) { setWalkInError('Vui lòng chọn khách hàng'); return }
                    setWalkInError('')
                    setWalkInStep(2)
                  }}
                  className="flex-1 h-11 rounded-2xl bg-emerald-600 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                >
                  Tiếp theo →
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCreateWalkIn}
                  disabled={walkInLoading}
                  className="flex-1 h-11 rounded-2xl bg-emerald-600 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
                >
                  {walkInLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                      Đang tạo đơn...
                    </span>
                  ) : `Tạo đơn & Thu cọc ${walkInDeposit.toLocaleString('vi-VN')}đ`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      </div>
    </div>
  )
}


