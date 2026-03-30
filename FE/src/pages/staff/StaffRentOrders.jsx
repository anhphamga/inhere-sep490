import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAllRentOrdersApi, getRentOrderByIdApi, confirmRentOrderApi, markWaitingPickupApi, markWaitingReturnApi, confirmPickupApi, confirmReturnApi, completeWashingApi, finalizeRentOrderApi, markNoShowApi, staffCollectDepositApi, cancelRentOrderApi } from '../../services/rent-order.service'
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

export default function StaffRentOrders() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('')
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

  const openReturnModal = (order) => {
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
      damageEntries: [], // [{ key, label, fee }]
    }))

    setReturnItems(items)
    setReturnOrderId(order?._id)
    setShowReturnModal(true)
  }

  const closeReturnModal = () => {
    setShowReturnModal(false)
    setReturnOrderId(null)
    setReturnDate('')
  }

  const handleReturnConfirm = async () => {
    if (!returnOrderId) return

    const mapped = returnItems.map((item) => {
      const totalDmgFee = item.damageEntries.reduce(
        (s, e) => s + (parseInt(String(e.fee || '0').replace(/[^0-9]/g, ''), 10) || 0), 0
      )
      const dmgNote = item.damageEntries.length > 0
        ? `[${item.label}] ${item.damageEntries.map((e) => e.label).join(', ')}`
        : null
      return {
        apiItem: {
          productInstanceId: item.productInstanceId,
          condition: item.damageEntries.length > 0 ? 'Damaged' : 'Normal',
          damageFee: totalDmgFee,
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
        washingFee: 0,
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
                  <option value="WaitingReturn">Chờ trả</option>
                  <option value="Late">Trễ hạn</option>
                  <option value="Returned">Đã trả</option>
                  <option value="NoShow">Không nhận đồ</option>
                  <option value="Compensation">Bồi thường</option>
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
                    const DAMAGE_TYPES = [
                      { key: 'torn',    label: 'Rách / Hỏng vải' },
                      { key: 'stain',   label: 'Bẩn không giặt được' },
                      { key: 'faded',   label: 'Phai màu / Ố vàng' },
                      { key: 'missing', label: 'Mất phụ kiện' },
                      { key: 'zipper',  label: 'Hỏng khóa / Cúc' },
                      { key: 'other',   label: 'Hư hỏng khác' },
                    ]
                    const selectedKeys = new Set(item.damageEntries.map((e) => e.key))
                    const totalItemFee = item.damageEntries.reduce(
                      (s, e) => s + (parseInt(String(e.fee || '0').replace(/[^0-9]/g, ''), 10) || 0), 0
                    )

                    const toggleDamageType = (dt) => {
                      const next = [...returnItems]
                      const entries = next[index].damageEntries
                      const exists = entries.findIndex((e) => e.key === dt.key)
                      if (exists >= 0) {
                        next[index].damageEntries = entries.filter((e) => e.key !== dt.key)
                      } else {
                        next[index].damageEntries = [...entries, { key: dt.key, label: dt.label, fee: '' }]
                      }
                      setReturnItems(next)
                    }

                    const updateEntryFee = (key, val) => {
                      const next = [...returnItems]
                      next[index].damageEntries = next[index].damageEntries.map((e) =>
                        e.key === key ? { ...e, fee: val } : e
                      )
                      setReturnItems(next)
                    }

                    return (
                      <div key={item.productInstanceId} className={`rounded-2xl border p-4 transition-all ${
                        item.damageEntries.length > 0
                          ? 'border-red-200 bg-red-50/60'
                          : 'border-slate-200 bg-slate-50'
                      }`}>
                        {/* Product name + status badge */}
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <p className="text-sm font-semibold text-slate-800 leading-snug truncate">{item.label}</p>
                          {item.damageEntries.length > 0 ? (
                            <span className="shrink-0 rounded-full border border-red-300 bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                              Hư hỏng · {totalItemFee > 0 ? `${totalItemFee.toLocaleString('vi-VN')}đ` : 'Chưa nhập phí'}
                            </span>
                          ) : (
                            <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                              Bình thường
                            </span>
                          )}
                        </div>

                        {/* Damage type chips */}
                        <div className="flex flex-wrap gap-2">
                          {DAMAGE_TYPES.map((dt) => {
                            const active = selectedKeys.has(dt.key)
                            return (
                              <button
                                key={dt.key}
                                type="button"
                                onClick={() => toggleDamageType(dt)}
                                className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
                                  active
                                    ? 'border-red-300 bg-red-100 text-red-700 shadow-sm ring-1 ring-red-200'
                                    : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-100'
                                }`}
                              >
                                {active ? '✓ ' : '+ '}{dt.label}
                              </button>
                            )
                          })}
                        </div>

                        {/* Fee inputs for selected damage types */}
                        {item.damageEntries.length > 0 && (
                          <div className="mt-3 space-y-2 border-t border-red-200 pt-3">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Phí bồi thường theo loại hư hỏng (VND)</p>
                            {item.damageEntries.map((entry) => (
                              <div key={entry.key} className="flex items-center gap-2">
                                <span className="w-40 shrink-0 text-xs font-medium text-slate-600 truncate">{entry.label}</span>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={entry.fee}
                                  onChange={(e) => updateEntryFee(entry.key, e.target.value)}
                                  placeholder="VD: 150000"
                                  className="h-9 flex-1 rounded-xl border border-red-200 bg-white px-3 text-sm font-medium text-slate-900 outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100"
                                />
                              </div>
                            ))}
                            {item.damageEntries.length > 1 && totalItemFee > 0 && (
                              <div className="flex justify-between border-t border-red-200 pt-2 text-sm font-semibold text-red-700">
                                <span>Tổng phí sản phẩm này</span>
                                <span>{totalItemFee.toLocaleString('vi-VN')}đ</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Grand total damage */}
                {returnItems.some((i) => i.damageEntries.length > 0) && (() => {
                  const grandDmg = returnItems.reduce((s, i) =>
                    s + i.damageEntries.reduce((ss, e) => ss + (parseInt(String(e.fee || '0').replace(/[^0-9]/g, ''), 10) || 0), 0)
                  , 0)
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

      </div>
    </div>
  )
}


