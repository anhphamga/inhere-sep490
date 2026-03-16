import { useCallback, useEffect, useMemo, useState } from 'react'
import { getAllRentOrdersApi, confirmRentOrderApi, confirmPickupApi, confirmReturnApi, completeWashingApi, finalizeRentOrderApi, markNoShowApi } from '../../services/rent-order.service'

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

export default function StaffRentOrders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')
  const [finalizeMethod, setFinalizeMethod] = useState('Cash')

  // Collateral modal state
  const [showCollateralModal, setShowCollateralModal] = useState(false)
  const [pickupOrderId, setPickupOrderId] = useState(null)
  const [collateralType, setCollateralType] = useState('CASH')
  const [collateralValue, setCollateralValue] = useState('')
  const [collateralError, setCollateralError] = useState('')

  // Return modal state
  const [showReturnModal, setShowReturnModal] = useState(false)
  const [returnOrderId, setReturnOrderId] = useState(null)
  const [returnItems, setReturnItems] = useState([])
  const [returnNote, setReturnNote] = useState('')
  const [returnError, setReturnError] = useState('')

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
    if (!confirm('Xác nhận đơn thuê này?')) return

    setActionLoading(true)
    try {
      await confirmRentOrderApi(orderId)
      alert('Xác nhận đơn thành công!')
      fetchOrders()
      setSelectedOrder(null)
    } catch (err) {
      alert(err.response?.data?.message || 'Có lỗi xảy ra')
    } finally {
      setActionLoading(false)
    }
  }

  const openCollateralModal = (orderId) => {
    setCollateralError('')
    setCollateralType('CASH')
    setCollateralValue('')
    setPickupOrderId(orderId)
    setShowCollateralModal(true)
  }

  const closeCollateralModal = () => {
    setShowCollateralModal(false)
    setPickupOrderId(null)
  }

  const handlePickup = async () => {
    if (!pickupOrderId) return

    // Validate collateral input
    if (!collateralType) {
      setCollateralError('Vui lòng chọn loại thế chấp.')
      return
    }

    const collateral = { type: collateralType }

    if (collateralType === 'CASH') {
      const cashAmount = Number(collateralValue)
      if (!collateralValue || Number.isNaN(cashAmount) || cashAmount <= 0) {
        setCollateralError('Số tiền thế chấp không hợp lệ.')
        return
      }
      collateral.cashAmount = cashAmount
    } else {
      const documentNumber = String(collateralValue || '').trim()
      if (!documentNumber) {
        setCollateralError(`Vui lòng nhập số ${collateralType}.`)
        return
      }
      collateral.documentNumber = documentNumber
    }

    setActionLoading(true)
    setCollateralError('')
    try {
      await confirmPickupApi(pickupOrderId, { collateral })
      alert('Xác nhận lấy đồ thành công!')
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
        note: returnNote
      })
      alert('Xác nhận trả đồ thành công!')
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
    if (!confirm('Đánh dấu khách không đến nhận đồ? Sẽ mất cọc và trả đồ về kho.')) return

    setActionLoading(true)
    try {
      await markNoShowApi(orderId)
      alert('Đã đánh dấu khách no-show. Cọc bị tịch thu.')
      fetchOrders()
      setSelectedOrder(null)
    } catch (err) {
      alert(err.response?.data?.message || 'Có lỗi xảy ra')
    } finally {
      setActionLoading(false)
    }
  }

  const handleCompleteWashing = async (orderId, method = 'Cash') => {
    if (!confirm('Hoàn tất đơn? Sản phẩm sẽ sẵn sàng cho thuê tiếp theo.')) return

    setActionLoading(true)
    try {
      await completeWashingApi(orderId, { method })
      alert('Hoàn tất đơn thành công! Sản phẩm đã có sẵn.')
      fetchOrders()
      setSelectedOrder(null)
    } catch (err) {
      alert(err.response?.data?.message || 'Có lỗi xảy ra')
    } finally {
      setActionLoading(false)
    }
  }

  const handleFinalize = async (orderId) => {
    if (!confirm('Xác nhận chốt đơn?')) return

    setActionLoading(true)
    try {
      await finalizeRentOrderApi(orderId, { method: finalizeMethod })
      alert('Chốt đơn thành công!')
      fetchOrders()
      setSelectedOrder(null)
    } catch (err) {
      const serverMessage = err.response?.data?.message
      const serverError = err.response?.data?.error
      console.error('Finalize error', serverMessage, serverError, err)
      alert(serverMessage || serverError || 'Có lỗi xảy ra khi chốt đơn')
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
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600 shadow-sm">
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
                  onClick={() => setSelectedOrder(order)}
                  className={`w-full rounded-[24px] border p-5 text-left transition ${selectedOrder?._id === order._id ? 'border-indigo-200 bg-indigo-50/80 shadow-[0_16px_36px_rgba(79,70,229,0.14)]' : 'border-slate-200 bg-white shadow-sm hover:border-slate-300 hover:bg-slate-50/80 hover:shadow-md'}`}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-base font-semibold text-slate-950">
                        #{order._id}
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
                    <h3 className="mt-2 text-xl font-semibold text-slate-950">#{selectedOrder._id}</h3>
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
                    <div className="mt-3 flex justify-between border-t border-slate-200 pt-3 text-sm">
                      <span className="text-slate-500">Còn lại:</span>
                      <span className="font-semibold text-slate-900">{formatMoney((selectedOrder.totalAmount || 0) - (selectedOrder.depositAmount || 0))}</span>
                    </div>
                  </div>

                  {/* Phí phát sinh (nếu có) */}
                  {(selectedOrder.washingFee > 0 || selectedOrder.damageFee > 0) && (
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
                </div>

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
                    <button
                      onClick={() => openCollateralModal(selectedOrder._id)}
                      disabled={actionLoading}
                      className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 disabled:bg-gray-400"
                    >
                      {actionLoading ? 'Đang xử lý...' : 'Xác nhận chờ lấy đồ'}
                    </button>
                  )}

                  {selectedOrder.status === 'WaitingPickup' && (
                    <button
                      onClick={() => openCollateralModal(selectedOrder._id)}
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

                  {['WaitingReturn', 'Late', 'Compensation', 'NoShow'].includes(selectedOrder.status) && (
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
                      <div className="grid grid-cols-1 gap-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="text-sm text-gray-600">Đã đặt cọc</div>
                          <div className="text-sm font-medium">{(selectedOrder.depositAmount || 0).toLocaleString('vi-VN')}đ</div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="text-sm text-gray-600">Còn lại cần thu</div>
                          <div className="text-sm font-medium">{((selectedOrder.remainingAmount || 0) + (selectedOrder.lateFee || 0) + (selectedOrder.damageFee || 0) + (selectedOrder.compensationFee || 0)).toLocaleString('vi-VN')}đ</div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="text-sm text-gray-600">Tổng phí phát sinh</div>
                          <div className="text-sm font-medium">{(((selectedOrder.lateFee || 0) + (selectedOrder.damageFee || 0) + (selectedOrder.compensationFee || 0))).toLocaleString('vi-VN')}đ</div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="text-sm text-gray-600">Số tiền cần thu thêm</div>
                          <div className="text-sm font-medium">
                            {Math.max(0, (selectedOrder.remainingAmount || 0) + (selectedOrder.lateFee || 0) + (selectedOrder.damageFee || 0) + (selectedOrder.compensationFee || 0) - (selectedOrder.depositAmount || 0)).toLocaleString('vi-VN')}đ
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="text-sm text-gray-600">Số tiền trả lại</div>
                          <div className="text-sm font-medium">
                            {Math.max(0, (selectedOrder.depositAmount || 0) - ((selectedOrder.remainingAmount || 0) + (selectedOrder.lateFee || 0) + (selectedOrder.damageFee || 0) + (selectedOrder.compensationFee || 0))).toLocaleString('vi-VN')}đ
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3">
                        <label className="text-sm font-medium text-gray-600">Phương thức thanh toán</label>
                        <select
                          value={finalizeMethod}
                          onChange={(e) => setFinalizeMethod(e.target.value)}
                          className="w-full rounded-lg border px-3 py-2"
                        >
                          <option value="Cash">Tiền mặt</option>
                          <option value="Online">Chuyển khoản</option>
                        </select>
                      </div>
                      <button
                        onClick={() => handleCompleteWashing(selectedOrder._id, finalizeMethod)}
                        disabled={actionLoading}
                        className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                      >
                        {actionLoading ? 'Đang xử lý...' : 'Hoàn tất đơn (Sản phẩm sẵn sàng)'}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">Xác nhận thông tin thế chấp</h2>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Loại thế chấp</label>
                <select
                  value={collateralType}
                  onChange={(e) => setCollateralType(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="CASH">Tiền mặt</option>
                  <option value="CCCD">CCCD</option>
                  <option value="GPLX">GPLX</option>
                  <option value="CAVET">CAVET</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {collateralType === 'CASH' ? 'Số tiền thế chấp (VND)' : `Số ${collateralType}`}
                </label>
                <input
                  type={collateralType === 'CASH' ? 'number' : 'text'}
                  value={collateralValue}
                  onChange={(e) => setCollateralValue(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              {collateralError && (
                <div className="text-sm text-red-600">{collateralError}</div>
              )}
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t">
              <button
                type="button"
                onClick={closeCollateralModal}
                className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                disabled={actionLoading}
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handlePickup}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-gray-400"
                disabled={actionLoading}
              >
                {actionLoading ? 'Đang xử lý...' : 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Return Modal */}
      {showReturnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-2xl bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">Xác nhận khách đã trả đồ</h2>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Ghi chú (nếu có)</label>
                <textarea
                  value={returnNote}
                  onChange={(e) => setReturnNote(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  rows={2}
                  placeholder="Ví dụ: 2 món bẩn, 1 món rách..."
                />
              </div>

              <div className="border rounded-lg">
                <div className="px-4 py-2 bg-gray-50 font-medium">Danh sách sản phẩm trả</div>
                <div className="max-h-64 overflow-y-auto">
                  {returnItems.map((item, index) => (
                    <div key={item.productInstanceId} className="flex flex-col gap-2 px-4 py-3 border-b last:border-b-0">
                      <div className="flex justify-between items-center">
                        <div className="text-sm font-medium text-gray-800">{item.label}</div>
                        <div className="flex items-center gap-2">
                          <select
                            value={item.condition}
                            onChange={(e) => {
                              const next = [...returnItems]
                              next[index].condition = e.target.value
                              if (e.target.value !== 'Damaged') next[index].damageFee = 0
                              setReturnItems(next)
                            }}
                            className="rounded-md border border-gray-300 px-2 py-1 text-sm"
                          >
                            <option value="Dirty">Bẩn</option>
                            <option value="Damaged">Rách</option>
                          </select>
                        </div>
                      </div>
                      {item.condition === 'Damaged' && (
                        <div className="flex items-center gap-2">
                          <label className="text-sm text-gray-600">Phí phạt (VND):</label>
                          <input
                            type="text"
                            value={item.damageFee}
                            onChange={(e) => {
                              const next = [...returnItems]
                              next[index].damageFee = e.target.value
                              setReturnItems(next)
                            }}
                            className="w-32 rounded-md border border-gray-300 px-2 py-1 text-sm"
                            placeholder="ví dụ: 100000"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {returnError && (
                <div className="text-sm text-red-600">{returnError}</div>
              )}
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t">
              <button
                type="button"
                onClick={closeReturnModal}
                className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                disabled={actionLoading}
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleReturnConfirm}
                className="px-4 py-2 rounded-lg bg-orange-600 text-white hover:bg-orange-700 disabled:bg-gray-400"
                disabled={actionLoading}
              >
                {actionLoading ? 'Đang xử lý...' : 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}


