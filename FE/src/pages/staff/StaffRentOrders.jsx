import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAllRentOrdersApi, getRentOrderByIdApi, confirmRentOrderApi, markWaitingPickupApi, markWaitingReturnApi, confirmPickupApi, confirmReturnApi, completeWashingApi, finalizeRentOrderApi, markNoShowApi, staffCollectDepositApi, cancelRentOrderApi, getSwapCandidatesApi, swapOrderItemApi } from '../../services/rent-order.service'
import { resolveDamagePolicyApi } from '../../services/damage-policy.service'
import { createDepositPaymentLinkApi, createExtraDuePaymentLinkApi } from '../../services/payment.service'

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

const getProductName = (product) => {
  if (!product) return 'Sản phẩm'
  if (typeof product.name === 'string') return product.name || 'Sản phẩm'
  if (product.name && typeof product.name === 'object') {
    return product.name.vi || product.name.en || 'Sản phẩm'
  }
  return 'Sản phẩm'
}

const getProductImage = (product) => {
  if (!product) return ''
  if (Array.isArray(product.images) && product.images.length > 0) return product.images[0]
  return product.image || ''
}

export default function StaffRentOrders() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 })
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')
  const [actionSuccess, setActionSuccess] = useState('')
  const [finalizeMethod, setFinalizeMethod] = useState('Cash')
  const [detailLoading, setDetailLoading] = useState(false)

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
  const [returnError, setReturnError] = useState('')
  const [returnDate, setReturnDate] = useState('')

  // Swap modal state
  const [showSwapModal, setShowSwapModal] = useState(false)
  const [swapOrderRef, setSwapOrderRef] = useState(null)
  const [swapItem, setSwapItem] = useState(null)
  const [swapCandidates, setSwapCandidates] = useState({ size_swap: [], model_swap: [], upgrade: [] })
  const [swapTab, setSwapTab] = useState('size_swap')
  const [swapLoading, setSwapLoading] = useState(false)
  const [swapSelected, setSwapSelected] = useState(null)
  const [swapReason, setSwapReason] = useState('')
  const [swapError, setSwapError] = useState('')

  // Fetch full order detail (có collaterals, deposits, payments) khi click vào đơn
  const selectOrder = useCallback(async (order) => {
    setSelectedOrder(order)
    setDetailLoading(true)
    try {
      const res = await getRentOrderByIdApi(order._id)
      if (res?.data) setSelectedOrder(res.data)
    } catch {
      // giữ nguyên data cũ nếu fetch thất bại
    } finally {
      setDetailLoading(false)
    }
  }, [])

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const response = await getAllRentOrdersApi({
        ...(filterStatus ? { status: filterStatus } : {}),
        page,
        limit,
      })
      setOrders(response.data || [])
      setPagination(response.pagination || { page, limit, total: (response.data || []).length, pages: 1 })
    } catch (err) {
      console.error('Error fetching orders:', err)
      setError('Không thể tải danh sách đơn thuê')
    } finally {
      setLoading(false)
    }
  }, [filterStatus, page, limit])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  useEffect(() => {
    setPage(1)
  }, [filterStatus, limit])

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

  const handleCollectDepositCash = async (orderId) => {
    setActionLoading(true)
    try {
      const res = await staffCollectDepositApi(orderId, 'Cash')
      showSuccess(res.message || 'Đã ghi nhận thu cọc tiền mặt!')
      fetchOrders()
      setSelectedOrder(prev => prev ? { ...prev, status: 'Deposited' } : null)
    } catch (err) {
      showError(err.response?.data?.message || 'Có lỗi xảy ra khi thu cọc')
    } finally {
      setActionLoading(false)
    }
  }

  const handleResendPayOSDeposit = async (orderId) => {
    setActionLoading(true)
    try {
      const res = await createDepositPaymentLinkApi(orderId)
      const paymentUrl = res.data?.paymentUrl || res.paymentUrl
      if (paymentUrl) {
        window.open(paymentUrl, '_blank')
        showSuccess('Đã mở trang thanh toán QR trong tab mới!')
      } else {
        showError('Không lấy được link thanh toán QR')
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Không thể tạo thanh toán QR')
    } finally {
      setActionLoading(false)
    }
  }

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm('Bạn có chắc muốn hủy đơn này không?')) return
    setActionLoading(true)
    try {
      await cancelRentOrderApi(orderId)
      showSuccess('Đã hủy đơn!')
      fetchOrders()
      setSelectedOrder(null)
    } catch (err) {
      showError(err.response?.data?.message || 'Có lỗi xảy ra khi hủy đơn')
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

  const handleMarkWaitingReturn = async (orderId) => {
    setActionLoading(true)
    try {
      await markWaitingReturnApi(orderId)
      showSuccess('Đơn đã chuyển sang chờ khách trả đồ!')
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

  const COLLATERAL_RULES = {
    CCCD:  { regex: /^\d{12}$/, hint: '12 chữ số', label: 'Số CCCD', placeholder: 'VD: 079012345678' },
    GPLX:  { regex: /^\d{12}$/, hint: '12 chữ số', label: 'Số GPLX', placeholder: 'VD: 079012345678' },
    CAVET: { regex: /^[A-Z0-9-]{6,20}$/i, hint: '6–20 ký tự (chữ, số, gạch ngang)', label: 'Số Cavet xe', placeholder: 'VD: 51A-12345' },
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

  const openReturnModal = async (order) => {
    setReturnError('')
    setReturnNote('')
    // Dùng ngày local (Vietnam) thay vì UTC để tránh sai ngày khi 0-7 giờ sáng
    const today = new Date()
    const localDateStr = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, '0'),
      String(today.getDate()).padStart(2, '0'),
    ].join('-')
    setReturnDate(localDateStr)

    const items = (order?.items || []).map((item) => ({
      productInstanceId: item.productInstanceId?._id || item.productInstanceId,
      label: item.productInstanceId?.productId?.name || item.productInstanceId?._id || 'Sản phẩm',
      damageLevelKey: '',
      policy: null,
      baseValue: 0,
      policyLoading: true,
    }))

    setReturnItems(items)
    setReturnOrderId(order?._id)
    setShowReturnModal(true)

    // Resolve damage policy + base value cho từng instance (song song)
    await Promise.all(
      items.map(async (it, idx) => {
        try {
          const res = await resolveDamagePolicyApi({ productInstanceId: it.productInstanceId })
          setReturnItems((prev) => {
            const next = [...prev]
            if (next[idx]) {
              next[idx] = {
                ...next[idx],
                policy: res?.data?.policy || null,
                baseValue: Number(res?.data?.baseValue || 0),
                policyLoading: false,
              }
            }
            return next
          })
        } catch (err) {
          console.error('resolve policy failed', err)
          setReturnItems((prev) => {
            const next = [...prev]
            if (next[idx]) {
              next[idx] = { ...next[idx], policyLoading: false }
            }
            return next
          })
        }
      })
    )
  }

  const closeReturnModal = () => {
    setShowReturnModal(false)
    setReturnOrderId(null)
    setReturnDate('')
  }

  // ── Swap handlers ──────────────────────────────────────────────
  const openSwapModal = async (order, item) => {
    setSwapOrderRef(order)
    setSwapItem(item)
    setSwapSelected(null)
    setSwapReason('')
    setSwapError('')
    setSwapTab('size_swap')
    setSwapCandidates({ size_swap: [], model_swap: [], upgrade: [] })
    setShowSwapModal(true)
    setSwapLoading(true)
    try {
      const res = await getSwapCandidatesApi(order._id, item._id)
      if (res?.success && res?.data) {
        setSwapCandidates({
          size_swap: res.data.size_swap || [],
          model_swap: res.data.model_swap || [],
          upgrade: res.data.upgrade || [],
        })
        // Tự chọn tab đầu tiên có dữ liệu
        if ((res.data.size_swap || []).length > 0) setSwapTab('size_swap')
        else if ((res.data.model_swap || []).length > 0) setSwapTab('model_swap')
        else if ((res.data.upgrade || []).length > 0) setSwapTab('upgrade')
      }
    } catch (err) {
      setSwapError(err?.response?.data?.message || 'Không thể lấy danh sách ứng viên đổi')
    } finally {
      setSwapLoading(false)
    }
  }

  const closeSwapModal = () => {
    setShowSwapModal(false)
    setSwapOrderRef(null)
    setSwapItem(null)
    setSwapSelected(null)
    setSwapError('')
  }

  const handleSwapConfirm = async () => {
    if (!swapSelected || !swapOrderRef || !swapItem) return
    setSwapLoading(true)
    setSwapError('')
    try {
      const res = await swapOrderItemApi(swapOrderRef._id, {
        itemId: swapItem._id,
        newInstanceId: swapSelected._id,
        swapType: swapTab,
        reason: swapReason,
      })
      if (res?.success) {
        closeSwapModal()
        showSuccess(res.message || 'Đổi sản phẩm thành công')
        if (res.data) setSelectedOrder(res.data)
      } else {
        setSwapError(res?.message || 'Đổi sản phẩm thất bại')
      }
    } catch (err) {
      setSwapError(err?.response?.data?.message || 'Lỗi khi đổi sản phẩm')
    } finally {
      setSwapLoading(false)
    }
  }

  const handleReturnConfirm = async () => {
    if (!returnOrderId) return

    const mapped = returnItems.map((item) => {
      const level = item.damageLevelKey
        ? (item.policy?.levels || []).find((l) => l.key === item.damageLevelKey)
        : null
      const dmgNote = level ? `[${item.label}] ${level.label}` : null
      return {
        apiItem: {
          productInstanceId: item.productInstanceId,
          damageLevelKey: item.damageLevelKey || undefined,
          condition: level?.condition || 'Normal',
        },
        dmgNote,
      }
    })

    const autoNotes = mapped.map((i) => i.dmgNote).filter(Boolean).join('\n')
    const finalNote = [autoNotes, returnNote].filter(Boolean).join('\n')

    setActionLoading(true)
    setReturnError('')
    try {
      await confirmReturnApi(returnOrderId, {
        returnedItems: mapped.map((i) => i.apiItem),
        note: finalNote,
        returnDate: returnDate || undefined,
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
                <p className="mt-2 text-2xl font-semibold text-slate-950">{pagination.total || 0}</p>
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
                  <option value="WaitingReturn">Chờ trả</option>
                  <option value="Late">Trễ hạn</option>
                  <option value="Returned">Đã trả</option>
                  <option value="NoShow">Không nhận đồ</option>
                  <option value="Compensation">Bồi thường</option>
                  <option value="Completed">Hoàn tất</option>
                  <option value="Cancelled">Đã hủy</option>
                </select>
              </div>
              <div className="min-w-[180px]">
                <label className="mb-2 block text-sm font-medium text-slate-700">Số dòng / trang</label>
                <select
                  value={limit}
                  onChange={(e) => setLimit(parseInt(e.target.value || '10', 10))}
                  className="h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
              <button
                onClick={fetchOrders}
                className="h-12 rounded-2xl bg-indigo-600 px-5 text-sm font-semibold text-white transition hover:bg-indigo-700"
              >
                Làm mới
              </button>
              <button
                onClick={() => navigate('/staff/walk-in')}
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
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-600">
                {pagination.total || 0} đơn
              </div>
              <div className="hidden items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 sm:flex">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={loading || page <= 1}
                  className={`rounded-xl px-2 py-1 transition ${loading || page <= 1 ? 'cursor-not-allowed text-slate-400' : 'text-slate-700 hover:bg-slate-100'}`}
                >
                  Trước
                </button>
                <span className="text-slate-500">Trang</span>
                <span className="text-slate-900">{page}</span>
                <span className="text-slate-500">/</span>
                <span className="text-slate-900">{pagination.pages || 1}</span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(pagination.pages || 1, p + 1))}
                  disabled={loading || page >= (pagination.pages || 1)}
                  className={`rounded-xl px-2 py-1 transition ${loading || page >= (pagination.pages || 1) ? 'cursor-not-allowed text-slate-400' : 'text-slate-700 hover:bg-slate-100'}`}
                >
                  Sau
                </button>
              </div>
            </div>
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

          {!loading && (pagination.pages || 1) > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4 text-sm">
              <p className="text-slate-500">
                Đang xem trang <span className="font-semibold text-slate-900">{page}</span> /{' '}
                <span className="font-semibold text-slate-900">{pagination.pages || 1}</span>
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className={`h-10 rounded-2xl px-4 font-semibold transition ${page <= 1 ? 'cursor-not-allowed bg-slate-100 text-slate-400' : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'}`}
                >
                  Trước
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(pagination.pages || 1, p + 1))}
                  disabled={page >= (pagination.pages || 1)}
                  className={`h-10 rounded-2xl px-4 font-semibold transition ${page >= (pagination.pages || 1) ? 'cursor-not-allowed bg-slate-100 text-slate-400' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                >
                  Sau
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Chi tiết đơn */}
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          {detailLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
            </div>
          )}
          {!detailLoading && selectedOrder && (
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

                {/* Ngày trả thực tế */}
                {['Renting', 'WaitingReturn', 'Late', 'Returned', 'Completed', 'Compensation'].includes(selectedOrder.status) && (() => {
                  const expected = selectedOrder.rentEndDate ? new Date(selectedOrder.rentEndDate) : null
                  const actual   = selectedOrder.actualReturnDate ? new Date(selectedOrder.actualReturnDate) : null
                  const lateDays = expected && actual
                    ? (() => {
                        const exp = new Date(expected); exp.setHours(0, 0, 0, 0)
                        const act = new Date(actual);   act.setHours(0, 0, 0, 0)
                        return Math.ceil((act - exp) / (1000 * 60 * 60 * 24))
                      })()
                    : null
                  return (
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Ngày trả đồ</p>
                      <div className="mt-2 space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-500">Dự kiến:</span>
                          <span className="font-medium text-slate-700">{formatDate(selectedOrder.rentEndDate)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-500">Thực tế:</span>
                          <span className={`font-semibold ${actual ? (lateDays > 0 ? 'text-red-600' : 'text-emerald-600') : 'text-slate-400'}`}>
                            {actual ? formatDateTime(actual) : 'Chưa ghi nhận'}
                          </span>
                        </div>
                        {lateDays !== null && lateDays > 0 && (
                          <div className="mt-2 flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2">
                            <svg className="h-4 w-4 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z" />
                            </svg>
                            <p className="text-xs font-semibold text-red-700">Trả trễ {lateDays} ngày</p>
                          </div>
                        )}
                        {lateDays !== null && lateDays <= 0 && (
                          <div className="mt-2 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2">
                            <svg className="h-4 w-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            <p className="text-xs font-semibold text-emerald-700">Trả đúng hạn{lateDays < 0 ? ` (sớm ${Math.abs(lateDays)} ngày)` : ''}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })()}

                {/* Sản phẩm trong đơn */}
                {Array.isArray(selectedOrder.items) && selectedOrder.items.length > 0 && (
                  <div className="rounded-3xl border border-slate-200 bg-white p-5">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Sản phẩm thuê</p>
                      <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-600">
                        {selectedOrder.items.length} món
                      </span>
                    </div>
                    <div className="mt-4 space-y-3">
                      {selectedOrder.items.map((item, idx) => {
                        const product = item?.productInstanceId?.productId || {}
                        const productName = getProductName(product)
                        const productImage = getProductImage(product)
                        const productId = product?._id
                        const instanceCode = item?.productInstanceId?.instanceCode || item?.productInstanceId?.code
                        return (
                          <div
                            key={item._id || idx}
                            className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-3"
                          >
                            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
                              {productImage ? (
                                <img src={productImage} alt={productName} className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-slate-300">
                                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159M16.5 14.25L18 12.75a2.25 2.25 0 013.182 0L21.75 15M3 19.5h18a.75.75 0 00.75-.75V5.25a.75.75 0 00-.75-.75H3a.75.75 0 00-.75.75v13.5c0 .414.336.75.75.75z" />
                                  </svg>
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              {productId ? (
                                <button
                                  type="button"
                                  onClick={() => navigate(`/products/${productId}`)}
                                  className="line-clamp-2 text-left text-sm font-semibold text-slate-900 hover:text-indigo-600 hover:underline"
                                  title={productName}
                                >
                                  {productName}
                                </button>
                              ) : (
                                <p className="line-clamp-2 text-sm font-semibold text-slate-900">{productName}</p>
                              )}
                              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                                {item.size && <span>Size: <span className="font-medium text-slate-700">{item.size}</span></span>}
                                {item.color && <span>Màu: <span className="font-medium text-slate-700">{item.color}</span></span>}
                                {item.condition && <span>Tình trạng: <span className="font-medium text-slate-700">{item.condition}</span></span>}
                              </div>
                              {instanceCode && (
                                <p className="mt-1 font-mono text-[11px] text-slate-400">Mã hàng: {instanceCode}</p>
                              )}
                            </div>
                            <div className="shrink-0 text-right flex flex-col items-end gap-1">
                              <p className="text-sm font-semibold text-indigo-600">
                                {formatMoney(item.finalPrice || item.baseRentPrice || 0)}
                              </p>
                              <p className="text-[11px] text-slate-400">/ngày</p>
                              {['Deposited', 'Confirmed', 'WaitingPickup'].includes(selectedOrder.status) && (
                                <button
                                  type="button"
                                  onClick={() => openSwapModal(selectedOrder, item)}
                                  className="mt-1 rounded-lg bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-200 hover:bg-amber-100 transition-colors"
                                  title="Đổi sản phẩm"
                                >
                                  Đổi SP
                                </button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

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
                  {selectedOrder.status !== 'Completed' && selectedOrder.damageFee > 0 && (
                    <div className="mt-4 rounded-2xl border border-orange-200 bg-orange-50 p-4">
                      <p className="text-sm font-semibold text-orange-800">Phí hư hỏng</p>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Bồi thường hư hỏng:</span>
                        <span className="font-semibold text-red-700">{formatMoney(selectedOrder.damageFee || 0)}</span>
                      </div>
                      <div className="mt-3 flex justify-between border-t border-orange-200 pt-3 text-sm font-semibold">
                        <span className="text-orange-800">Tổng cần thanh toán:</span>
                        <span className="text-orange-800">{formatMoney((selectedOrder.totalAmount || 0) - (selectedOrder.depositAmount || 0) + (selectedOrder.damageFee || 0))}</span>
                      </div>
                    </div>
                  )}

                  {/* Kết quả quyết toán — chỉ hiện cho đơn Hoàn tất */}
                  {selectedOrder.status === 'Completed' && (() => {
                    const totalFees = (selectedOrder.lateFee || 0) + (selectedOrder.damageFee || 0) + (selectedOrder.compensationFee || 0)
                    const grandTotal = (selectedOrder.totalAmount || 0) + totalFees
                    const refundPayment = (selectedOrder.payments || []).filter(p => p.purpose === 'Refund' && p.status === 'Paid').reduce((s, p) => s + (p.amount || 0), 0)
                    const paidRemainingTotal = (selectedOrder.payments || []).filter((p) => p.purpose === 'Remaining' && p.status === 'Paid').reduce((s, p) => s + Number(p.amount || 0), 0)
                    const extraPayment = Math.max(0, paidRemainingTotal - Number(selectedOrder.remainingAmount || 0))
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
                            <span className="text-slate-500">Phí phát sinh (hỏng/trễ)</span>
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
                  {selectedOrder.status === 'PendingDeposit' && (
                    <div className="space-y-2">
                      <p className="text-sm text-amber-700 font-medium">Đơn chờ thu cọc — chọn hình thức thu:</p>
                      <button
                        onClick={() => handleCollectDepositCash(selectedOrder._id)}
                        disabled={actionLoading}
                        className="w-full bg-emerald-600 text-white py-2 rounded-lg hover:bg-emerald-700 disabled:bg-gray-400"
                      >
                        {actionLoading ? 'Đang xử lý...' : 'Thu tiền mặt'}
                      </button>
                      <button
                        onClick={() => handleResendPayOSDeposit(selectedOrder._id)}
                        disabled={actionLoading}
                        className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                      >
                        {actionLoading ? 'Đang xử lý...' : 'Thanh toán bằng QR'}
                      </button>
                      <button
                        onClick={() => handleCancelOrder(selectedOrder._id)}
                        disabled={actionLoading}
                        className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 disabled:bg-gray-400"
                      >
                        {actionLoading ? 'Đang xử lý...' : 'Hủy đơn'}
                      </button>
                    </div>
                  )}

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
                      {actionLoading ? 'Đang xử lý...' : 'Khách không đến nhận đồ'}
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
                    <div className="space-y-2">
                      <button
                        onClick={() => handleMarkWaitingReturn(selectedOrder._id)}
                        disabled={actionLoading}
                        className="w-full bg-amber-500 text-white py-2 rounded-lg hover:bg-amber-600 disabled:bg-gray-400"
                      >
                        {actionLoading ? 'Đang xử lý...' : 'Chờ khách đến trả đồ'}
                      </button>
                      <button
                        onClick={() => openReturnModal(selectedOrder)}
                        disabled={actionLoading}
                        className="w-full bg-orange-600 text-white py-2 rounded-lg hover:bg-orange-700 disabled:bg-gray-400"
                      >
                        {actionLoading ? 'Đang xử lý...' : 'Xác nhận trả đồ ngay'}
                      </button>
                    </div>
                  )}

                  {['WaitingReturn', 'Late', 'Compensation'].includes(selectedOrder.status) && (
                    <div className="border-t pt-4 space-y-2">
                      {['WaitingReturn', 'Late'].includes(selectedOrder.status) && (
                        <button
                          onClick={() => openReturnModal(selectedOrder)}
                          disabled={actionLoading}
                          className="w-full bg-orange-600 text-white py-2 rounded-lg hover:bg-orange-700 disabled:bg-gray-400"
                        >
                          {actionLoading ? 'Đang xử lý...' : 'Xác nhận trả đồ'}
                        </button>
                      )}
                      <p className="text-sm text-gray-600">Hoặc chốt đơn nếu đã nhận đủ đồ:</p>
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
                        const lateFee = selectedOrder.lateFee || 0
                        const damageFee = selectedOrder.damageFee || 0
                        const compensationFee = selectedOrder.compensationFee || 0
                        const lateDays = selectedOrder.lateDays || 0
                        const totalFees = lateFee + damageFee + compensationFee
                        const totalOutstanding = outstandingRemaining + totalFees
                        const cashCollateral = (selectedOrder.collaterals || [])
                          .filter(c => c.type === 'CASH' && c.status === 'Held')
                          .reduce((s, c) => s + (c.cashAmount || 0), 0)
                        const hasDocCollateral = (selectedOrder.collaterals || []).some(c => c.type !== 'CASH' && c.status === 'Held')
                        const netCashRefund = Math.max(0, cashCollateral - totalOutstanding)
                        const extraDue = Math.max(0, totalOutstanding - cashCollateral)

                        const actualReturn = selectedOrder.actualReturnDate ? new Date(selectedOrder.actualReturnDate) : null
                        const expectedReturn = selectedOrder.rentEndDate ? new Date(selectedOrder.rentEndDate) : null

                        return (
                          <div className="space-y-3">
                            {/* Thông tin trả đồ */}
                            {actualReturn && (
                              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-1.5 text-sm">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Thông tin trả đồ</p>
                                <div className="flex justify-between text-gray-500">
                                  <span>Ngày dự kiến trả</span>
                                  <span className="font-medium text-gray-700">{formatDate(expectedReturn)}</span>
                                </div>
                                <div className="flex justify-between text-gray-500">
                                  <span>Ngày thực tế trả</span>
                                  <span className={`font-semibold ${lateDays > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                    {formatDateTime(actualReturn)}
                                  </span>
                                </div>
                                {lateDays > 0 && (
                                  <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 mt-1">
                                    <svg className="h-4 w-4 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z" />
                                    </svg>
                                    <span className="text-xs font-bold text-red-700">Trả trễ {lateDays} ngày</span>
                                  </div>
                                )}
                              </div>
                            )}

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
                              {/* Phí phát sinh chi tiết */}
                              {totalFees > 0 && (
                                <div className="border-t border-gray-200 pt-2 space-y-1.5">
                                  <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide">Phí phát sinh</p>
                                  {lateFee > 0 && (
                                    <div className="flex justify-between text-gray-500">
                                      <span className="flex items-center gap-1">
                                        <span>Phí trễ hạn</span>
                                        <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-xs font-bold text-red-700">{lateDays} ngày</span>
                                      </span>
                                      <span className="font-medium text-red-600">{lateFee.toLocaleString('vi-VN')}đ</span>
                                    </div>
                                  )}
                                  {damageFee > 0 && (
                                    <div className="flex justify-between text-gray-500">
                                      <span>Phí hư hỏng</span>
                                      <span className="font-medium text-orange-600">{damageFee.toLocaleString('vi-VN')}đ</span>
                                    </div>
                                  )}
                                  {compensationFee > 0 && (
                                    <div className="flex justify-between text-gray-500">
                                      <span>Phí bồi thường</span>
                                      <span className="font-medium text-orange-600">{compensationFee.toLocaleString('vi-VN')}đ</span>
                                    </div>
                                  )}
                                  <div className="flex justify-between border-t border-orange-200 pt-1.5 font-semibold text-orange-700">
                                    <span>Tổng phí phát sinh</span>
                                    <span>{totalFees.toLocaleString('vi-VN')}đ</span>
                                  </div>
                                </div>
                              )}
                              {totalFees === 0 && (
                                <div className="flex justify-between text-gray-500">
                                  <span>Tổng phí phát sinh</span>
                                  <span className="font-medium text-gray-800">0đ</span>
                                </div>
                              )}
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
                                    <option value="PayOS">📱 Thanh toán bằng QR</option>
                                  </select>
                                  {finalizeMethod === 'PayOS' && (
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        try {
                                          const data = await createExtraDuePaymentLinkApi(selectedOrder._id, extraDue)
                                          window.open(data.data.paymentUrl, '_blank')
                                        } catch (err) {
                                          showError(err.response?.data?.message || 'Không tạo được QR thanh toán')
                                        }
                                      }}
                                      className="mt-2 w-full rounded-lg border border-red-300 bg-white py-2 text-sm font-semibold text-red-700 hover:bg-red-50 transition"
                                    >
                                      📱 Tạo QR cho khách quét
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
          )}
          {!detailLoading && !selectedOrder && (
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
            <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">

              {/* Ngày thực trả */}
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Ngày thực tế trả đồ
                </label>
                <input
                  type="date"
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  max={(() => { const t = new Date(); return [t.getFullYear(), String(t.getMonth()+1).padStart(2,'0'), String(t.getDate()).padStart(2,'0')].join('-') })()}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-900 outline-none transition focus:border-orange-300 focus:bg-white focus:ring-4 focus:ring-orange-50"
                />
                <p className="mt-1.5 text-xs text-slate-400">
                  Mặc định hôm nay. Điều chỉnh nếu khách trả trễ hoặc trả sớm hơn ngày thực tế.
                </p>
                {/* Preview phí trễ */}
                {(() => {
                  if (!returnDate || !selectedOrder?.rentEndDate) return null
                  const exp = new Date(selectedOrder.rentEndDate); exp.setHours(0, 0, 0, 0)
                  const act = new Date(returnDate + 'T00:00:00')
                  const days = Math.ceil((act - exp) / (1000 * 60 * 60 * 24))
                  if (days <= 0) return (
                    <div className="mt-2 flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2">
                      <svg className="h-4 w-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <p className="text-xs font-semibold text-emerald-700">Trả đúng hạn{days < 0 ? ` (sớm ${Math.abs(days)} ngày)` : ''} — không phí trễ</p>
                    </div>
                  )
                  const feePerDay = Number(import.meta.env.VITE_LATE_FEE_PER_DAY || 50000)
                  const estimatedFee = days * feePerDay
                  return (
                    <div className="mt-2 rounded-xl bg-red-50 border border-red-200 px-3 py-2.5 space-y-1">
                      <div className="flex items-center gap-2">
                        <svg className="h-4 w-4 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z" />
                        </svg>
                        <p className="text-xs font-semibold text-red-700">Trả trễ {days} ngày</p>
                      </div>
                      <p className="text-xs text-red-600 pl-6">
                        Phí phạt ước tính: <span className="font-bold">{estimatedFee.toLocaleString('vi-VN')}đ</span> ({days} ngày × {feePerDay.toLocaleString('vi-VN')}đ/ngày)
                      </p>
                    </div>
                  )
                })()}
              </div>

              {/* Danh sách sản phẩm — kiểm tra hư hỏng */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Kiểm tra hư hỏng</p>
                  <p className="text-xs text-slate-400">Phí giặt đã bao gồm trong đơn thuê</p>
                </div>
                <div className="space-y-4">
                  {returnItems.map((item, index) => {
                    const levels = item.policy?.levels || []
                    const sortedLevels = [...levels].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
                    const selectedLevel = item.damageLevelKey
                      ? levels.find((l) => l.key === item.damageLevelKey)
                      : null
                    const itemFee = selectedLevel
                      ? Math.round(((item.baseValue || 0) * Number(selectedLevel.penaltyPercent || 0)) / 100)
                      : 0

                    const selectLevel = (key) => {
                      const next = [...returnItems]
                      next[index] = { ...next[index], damageLevelKey: next[index].damageLevelKey === key ? '' : key }
                      setReturnItems(next)
                    }

                    return (
                      <div key={item.productInstanceId} className={`rounded-2xl border p-4 transition-all ${
                        selectedLevel
                          ? 'border-red-200 bg-red-50/60'
                          : 'border-slate-200 bg-slate-50'
                      }`}>
                        {/* Product name + status badge */}
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-800 leading-snug truncate">{item.label}</p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Giá trị sản phẩm: <span className="font-semibold text-slate-700">{(item.baseValue || 0).toLocaleString('vi-VN')}đ</span>
                            </p>
                          </div>
                          {selectedLevel ? (
                            <span className="shrink-0 rounded-full border border-red-300 bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                              {selectedLevel.label} · {itemFee.toLocaleString('vi-VN')}đ
                            </span>
                          ) : (
                            <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                              Bình thường
                            </span>
                          )}
                        </div>

                        {/* Policy level chips */}
                        {item.policyLoading ? (
                          <p className="text-xs text-slate-400">Đang tải chính sách hư hỏng...</p>
                        ) : sortedLevels.length === 0 ? (
                          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                            Chưa có chính sách hư hỏng áp dụng cho sản phẩm này. Owner cần tạo trước khi staff áp phí.
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {sortedLevels.map((lvl) => {
                              const active = item.damageLevelKey === lvl.key
                              const fee = Math.round(((item.baseValue || 0) * Number(lvl.penaltyPercent || 0)) / 100)
                              return (
                                <button
                                  key={lvl.key}
                                  type="button"
                                  onClick={() => selectLevel(lvl.key)}
                                  title={lvl.description}
                                  className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
                                    active
                                      ? 'border-red-300 bg-red-100 text-red-700 shadow-sm ring-1 ring-red-200'
                                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-100'
                                  }`}
                                >
                                  {active ? '✓ ' : ''}{lvl.label} · {lvl.penaltyPercent}% ({fee.toLocaleString('vi-VN')}đ)
                                </button>
                              )
                            })}
                          </div>
                        )}

                        {/* Details of selected level */}
                        {selectedLevel && (
                          <div className="mt-3 rounded-lg border border-red-200 bg-white p-3 text-xs">
                            <div className="flex justify-between text-slate-600">
                              <span>% giá trị phạt</span>
                              <span className="font-semibold text-slate-900">{selectedLevel.penaltyPercent}%</span>
                            </div>
                            <div className="flex justify-between text-slate-600 mt-1">
                              <span>Giá trị sản phẩm</span>
                              <span className="font-semibold text-slate-900">{(item.baseValue || 0).toLocaleString('vi-VN')}đ</span>
                            </div>
                            <div className="mt-2 border-t border-red-100 pt-2 flex justify-between text-sm font-semibold text-red-700">
                              <span>Phí áp dụng</span>
                              <span>{itemFee.toLocaleString('vi-VN')}đ</span>
                            </div>
                            <div className="mt-1 text-[11px] text-slate-500">
                              Sau khi xác nhận, sản phẩm sẽ chuyển sang trạng thái <span className="font-semibold">{selectedLevel.triggerLifecycle}</span>.
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Grand total damage */}
                {returnItems.some((i) => i.damageLevelKey) && (() => {
                  const grandDmg = returnItems.reduce((s, i) => {
                    const lvl = (i.policy?.levels || []).find((l) => l.key === i.damageLevelKey)
                    if (!lvl) return s
                    return s + Math.round(((i.baseValue || 0) * Number(lvl.penaltyPercent || 0)) / 100)
                  }, 0)
                  return grandDmg > 0 ? (
                    <div className="mt-3 flex items-center justify-between rounded-2xl border border-red-300 bg-red-100 px-4 py-3">
                      <span className="text-sm font-semibold text-red-800">Tổng phí hư hỏng</span>
                      <span className="text-base font-bold text-red-800">{grandDmg.toLocaleString('vi-VN')}đ</span>
                    </div>
                  ) : null
                })()}
              </div>

              {/* Note */}
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Ghi chú thêm (tuỳ chọn)
                </label>
                <textarea
                  value={returnNote}
                  onChange={(e) => setReturnNote(e.target.value)}
                  rows={2}
                  placeholder="Ghi chú bổ sung cho nhân viên giặt hoặc kho..."
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

      {/* ── Swap Modal ───────────────────────────────────────────── */}
      {showSwapModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 shrink-0">
              <div>
                <h3 className="text-base font-bold text-slate-900">Đổi sản phẩm</h3>
                {swapItem && (
                  <p className="mt-0.5 text-xs text-slate-500">
                    {getProductName(swapItem?.productInstanceId?.productId || {})}
                    {swapItem.size ? ` · Size ${swapItem.size}` : ''}
                    {swapItem.color ? ` · ${swapItem.color}` : ''}
                  </p>
                )}
              </div>
              <button type="button" onClick={closeSwapModal} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-100 shrink-0 px-4 pt-1 gap-1">
              {[
                { key: 'size_swap', label: 'Đổi size', color: 'indigo' },
                { key: 'model_swap', label: 'Đổi mẫu', color: 'violet' },
                { key: 'upgrade', label: 'Upgrade', color: 'amber' },
              ].map(({ key, label, color }) => {
                const count = swapCandidates[key]?.length || 0
                const active = swapTab === key
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => { setSwapTab(key); setSwapSelected(null) }}
                    className={`flex items-center gap-1.5 rounded-t-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                      active
                        ? `border-b-2 border-${color}-500 text-${color}-700 bg-${color}-50/50`
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {label}
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${count > 0 ? `bg-${color}-100 text-${color}-700` : 'bg-slate-100 text-slate-400'}`}>
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Tab description */}
            <div className="px-6 py-2 shrink-0">
              {swapTab === 'size_swap' && <p className="text-xs text-slate-500">Cùng mẫu sản phẩm, khác size — phù hợp khi khách mặc không vừa.</p>}
              {swapTab === 'model_swap' && <p className="text-xs text-slate-500">Mẫu khác cùng loại — dùng khi hết size hoặc hết mẫu hiện tại.</p>}
              {swapTab === 'upgrade' && <p className="text-xs text-slate-500">Cùng mẫu tình trạng tốt hơn (ưu tiên) hoặc mẫu khác cùng loại cao cấp hơn — khi khách yêu cầu nâng cấp. Giá có thể thay đổi.</p>}
            </div>

            {/* Candidate list */}
            <div className="flex-1 overflow-y-auto px-4 pb-2">
              {swapLoading ? (
                <div className="flex items-center justify-center py-12 text-slate-400">
                  <svg className="h-6 w-6 animate-spin mr-2" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                  Đang tải...
                </div>
              ) : swapCandidates[swapTab]?.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-400">
                  Không có sản phẩm phù hợp
                </div>
              ) : (
                <div className="space-y-2 py-1">
                  {swapCandidates[swapTab].map((cand) => {
                    const candProduct = cand.productId || {}
                    const candName = getProductName(candProduct)
                    const candImage = getProductImage(candProduct)
                    const currentPrice = Number(swapItem?.finalPrice || swapItem?.baseRentPrice || 0)
                    const candPrice = Number(cand.currentRentPrice || 0)
                    const priceDiff = candPrice - currentPrice
                    const isSelected = swapSelected?._id === cand._id
                    return (
                      <button
                        key={cand._id}
                        type="button"
                        onClick={() => setSwapSelected(cand)}
                        className={`w-full flex items-center gap-3 rounded-2xl border p-3 text-left transition-all ${
                          isSelected
                            ? 'border-indigo-400 bg-indigo-50 ring-1 ring-indigo-300'
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/80'
                        }`}
                      >
                        <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${isSelected ? 'border-indigo-500 bg-indigo-500' : 'border-slate-300'}`}>
                          {isSelected && <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                        </div>
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                          {candImage ? (
                            <img src={candImage} alt={candName} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-slate-300">
                              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159M3 19.5h18V5.25H3v14.25z" /></svg>
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-900">{candName}</p>
                          <div className="mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-slate-500">
                            {cand.size && <span>Size <span className="font-medium text-slate-700">{cand.size}</span></span>}
                            {cand.color && <span>· {cand.color}</span>}
                            {cand.conditionScore != null && (
                              <span>· Điểm tình trạng: <span className="font-medium text-slate-700">{cand.conditionScore}</span></span>
                            )}
                          </div>
                          {cand.instanceCode && (
                            <p className="mt-0.5 font-mono text-[10px] text-slate-400">{cand.instanceCode}</p>
                          )}
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-semibold text-indigo-600">{formatMoney(candPrice)}</p>
                          <p className="text-[10px] text-slate-400">/ngày</p>
                          {priceDiff !== 0 && (
                            <span className={`mt-0.5 inline-block rounded-full px-1.5 py-0.5 text-[10px] font-bold ${priceDiff > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
                              {priceDiff > 0 ? '+' : ''}{formatMoney(priceDiff)}
                            </span>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Reason input + footer */}
            <div className="border-t border-slate-100 px-6 py-4 shrink-0 space-y-3">
              {swapSelected && (
                <div className="rounded-2xl bg-indigo-50 px-4 py-3 text-sm text-indigo-800">
                  Đã chọn: <span className="font-bold">{getProductName(swapSelected.productId || {})}</span>
                  {swapSelected.size ? ` · Size ${swapSelected.size}` : ''}
                  {(() => {
                    const currentPrice = Number(swapItem?.finalPrice || swapItem?.baseRentPrice || 0)
                    const newPrice = Number(swapSelected.currentRentPrice || 0)
                    const diff = newPrice - currentPrice
                    if (diff === 0) return <span className="ml-2 text-slate-500 text-xs">Giá không đổi</span>
                    return <span className={`ml-2 text-xs font-bold ${diff > 0 ? 'text-red-600' : 'text-green-700'}`}>Giá thay đổi {diff > 0 ? '+' : ''}{formatMoney(diff)}/ngày</span>
                  })()}
                </div>
              )}
              <input
                type="text"
                placeholder="Lý do đổi (tùy chọn)..."
                value={swapReason}
                onChange={(e) => setSwapReason(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm placeholder-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
              {swapError && <p className="text-sm text-red-600 font-medium">{swapError}</p>}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={closeSwapModal}
                  className="flex-1 rounded-2xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={!swapSelected || swapLoading}
                  onClick={handleSwapConfirm}
                  className="flex-1 rounded-2xl bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {swapLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                      Đang xử lý...
                    </span>
                  ) : 'Xác nhận đổi'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      </div>
    </div>
  )
}


