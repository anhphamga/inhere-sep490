import { useState, useEffect } from 'react'
import { useParams, Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  getRentOrderByIdApi,
  getGuestRentOrderByIdApi,
  payDepositApi,
  cancelRentOrderApi,
  cancelGuestRentOrderApi,
  confirmPickupApi,
  confirmReturnApi,
  finalizeRentOrderApi,
} from '../services/rent-order.service'
import { createDepositPaymentLinkApi, createGuestDepositPaymentLinkApi } from '../services/payment.service'
import Header from '../components/common/Header'

const statusLabels = {
  Draft: 'Nháp',
  PendingDeposit: 'Chờ đặt cọc',
  Deposited: 'Đã đặt cọc',
  Confirmed: 'Đã xác nhận',
  WaitingPickup: 'Chờ lấy đồ',
  Renting: 'Đang thuê',
  WaitingReturn: 'Chờ trả',
  Late: 'Trễ hạn',
  Returned: 'Đã trả',
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
  Late: 'bg-amber-100 text-amber-800',
  Returned: 'bg-cyan-100 text-cyan-800',
  Compensation: 'bg-rose-100 text-rose-800',
  NoShow: 'bg-red-100 text-red-800',
  Completed: 'bg-green-200 text-green-800',
  Cancelled: 'bg-red-100 text-red-800'
}

export default function RentalDetailPage() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const { isAuthenticated, loading: authLoading, user } = useAuth()

  const guestToken = searchParams.get('token') || ''
  const isGuestView = Boolean(guestToken)
  const paymentCancelled = searchParams.get('payment') === 'cancelled'

  const isStaffOrOwner = !isGuestView && ['owner', 'staff'].includes(String(user?.role || '').toLowerCase())

  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  // Pickup form
  const [pickupCollateralType, setPickupCollateralType] = useState('CCCD')
  const [pickupDocumentNumber, setPickupDocumentNumber] = useState('')
  const [pickupCashAmount, setPickupCashAmount] = useState(0)
  const [pickupCollectRemaining, setPickupCollectRemaining] = useState(true)

  // Return form
  const [returnCondition, setReturnCondition] = useState('Normal')
  const [returnDamageFee, setReturnDamageFee] = useState(0)
  const [returnCompensationFee, setReturnCompensationFee] = useState(0)
  const [returnNote, setReturnNote] = useState('')

  // Finalize form
  const [finalizeMethod, setFinalizeMethod] = useState('Cash')

  useEffect(() => {
    if (isGuestView) {
      if (id && guestToken) {
        fetchOrderDetail()
      } else {
        setLoading(false)
        setError('Thiếu thông tin để xem đơn thuê.')
      }
      return
    }

    if (!authLoading && isAuthenticated && id) {
      fetchOrderDetail()
    }

    if (!authLoading && !isAuthenticated) {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, id, authLoading, isGuestView, guestToken])

  useEffect(() => {
    if (!order) return

    setPickupCashAmount(order.remainingAmount || 0)

    setReturnDamageFee(order.damageFee || 0)
    setReturnCompensationFee(order.compensationFee || 0)
  }, [order])

  const fetchOrderDetail = async () => {
    try {
      setLoading(true)
      setError('')
      const response = isGuestView
        ? await getGuestRentOrderByIdApi(id, guestToken)
        : await getRentOrderByIdApi(id)
      setOrder(response.data)
    } catch (err) {
      console.error('Error fetching order:', err)
      if (err.response?.status === 401 && isGuestView) {
        setError('Liên kết xem đơn thuê đã hết hạn hoặc không hợp lệ.')
      } else if (err.response?.status === 401) {
        setError('Vui lòng đăng nhập lại')
      } else if (err.response?.status === 403) {
        setError('Bạn không có quyền xem đơn thuê này')
      } else if (err.response?.status === 404) {
        setError('Không tìm thấy đơn thuê')
      } else {
        setError('Không thể tải chi tiết đơn thuê')
      }
    } finally {
      setLoading(false)
    }
  }

  const handlePayDepositCash = async () => {
    if (!confirm('Xác nhận đặt cọc bằng tiền mặt?')) return
    setActionLoading(true)
    try {
      const response = await payDepositApi(id, { method: 'Cash' })
      if (response.success) {
        alert('Đặt cọc thành công!')
        fetchOrderDetail()
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Có lỗi xảy ra')
    } finally {
      setActionLoading(false)
    }
  }

  const handlePayDepositOnline = async () => {
    setActionLoading(true)
    try {
      const guestEmail = order?.guestContact?.email || ''
      const res = isGuestView
        ? await createGuestDepositPaymentLinkApi(id, guestEmail)
        : await createDepositPaymentLinkApi(id)
      const paymentUrl = res.data?.paymentUrl || res.paymentUrl
      if (paymentUrl) {
        window.location.href = paymentUrl
      } else {
        alert('Không lấy được link thanh toán')
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Có lỗi tạo link thanh toán')
    } finally {
      setActionLoading(false)
    }
  }

  const handleCancelOrder = async () => {
    if (!confirm('Bạn có chắc chắn muốn hủy đơn thuê này?')) return

    setActionLoading(true)
    try {
      const response = isGuestView
        ? await cancelGuestRentOrderApi(id, {
            token: guestToken,
            email: order?.guestContact?.email || '',
          })
        : await cancelRentOrderApi(id)
      if (response.success) {
        alert('Hủy đơn thành công!')
        fetchOrderDetail()
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Có lỗi xảy ra')
    } finally {
      setActionLoading(false)
    }
  }

  const handleConfirmPickup = async () => {
    if (!pickupCollateralType) {
      alert('Vui lòng chọn loại thế chấp')
      return
    }

    // Nếu là cash thì cần nhập số tiền
    if (pickupCollateralType === 'CASH' && (!pickupCashAmount || Number(pickupCashAmount) <= 0)) {
      alert('Vui lòng nhập số tiền thế chấp hợp lệ')
      return
    }

    setActionLoading(true)
    try {
      const payload = {
        method: 'Cash',
        collateral: {
          type: pickupCollateralType,
          documentNumber: pickupCollateralType !== 'CASH' ? pickupDocumentNumber : undefined,
          cashAmount: pickupCollateralType === 'CASH' ? Number(pickupCashAmount) : undefined
        },
        collectRemaining: pickupCollectRemaining
      }
      const response = await confirmPickupApi(id, payload)
      if (response.success) {
        alert('Xác nhận lấy đồ thành công')
        fetchOrderDetail()
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Có lỗi xảy ra khi xác nhận lấy đồ')
    } finally {
      setActionLoading(false)
    }
  }

  const handleConfirmReturn = async () => {
    setActionLoading(true)
    try {
      const returnedItems = (order.items || []).map((item) => ({
        productInstanceId: item.productInstanceId?._id || item.productInstanceId,
        condition: returnCondition,
        damageFee: Number(returnDamageFee || 0)
      }))

      const payload = {
        returnedItems,
        note: returnNote
      }

      const response = await confirmReturnApi(id, payload)
      if (response.success) {
        alert('Xác nhận trả đồ thành công')
        fetchOrderDetail()
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Có lỗi xảy ra khi trả đồ')
    } finally {
      setActionLoading(false)
    }
  }

  const handleFinalize = async () => {
    setActionLoading(true)
    try {
      const response = await finalizeRentOrderApi(id, { method: finalizeMethod })
      if (response.success) {
        alert('Chốt đơn thành công')
        fetchOrderDetail()
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Có lỗi xảy ra khi chốt đơn')
    } finally {
      setActionLoading(false)
    }
  }

  if (!isGuestView && !isAuthenticated) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Vui lòng đăng nhập để xem chi tiết đơn thuê</p>
          <Link to={`/login?redirect=/rental/${id}`} className="text-pink-600 hover:underline">
            Đăng nhập
          </Link>
        </div>
        </div>
      </>
    )
  }

  if (authLoading || loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-pink-600 border-t-transparent"></div>
        </div>
      </>
    )
  }

  if (error) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Link to={isGuestView ? '/track-order' : '/rental/history'} className="text-pink-600 hover:underline">
            {isGuestView ? 'Quay lại tra cứu đơn' : 'Quay lại lịch sử thuê'}
          </Link>
        </div>
        </div>
      </>
    )
  }

  if (!order) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Không tìm thấy đơn thuê</p>
          <Link to={isGuestView ? '/track-order' : '/rental/history'} className="text-pink-600 hover:underline">
            {isGuestView ? 'Quay lại tra cứu đơn' : 'Quay lại lịch sử thuê'}
          </Link>
        </div>
        </div>
      </>
    )
  }

  const canPayDeposit = order.status === 'PendingDeposit'
  const canCancel = isGuestView
    ? ['Draft', 'PendingDeposit'].includes(order.status)
    : ['Draft', 'PendingDeposit', 'Deposited', 'Confirmed', 'WaitingPickup'].includes(order.status)

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link
            to={isGuestView ? `/track-order?orderCode=${encodeURIComponent(order?.orderCode || '')}` : '/rental/history'}
            className="text-pink-600 hover:underline"
          >
            ← Quay lại
          </Link>
          <span className={`px-4 py-2 rounded-full text-sm font-medium ${statusColors[order.status] || 'bg-gray-100'}`}>
            {statusLabels[order.status] || order.status}
          </span>
        </div>

        {isGuestView && paymentCancelled && order.status === 'PendingDeposit' && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <p className="font-semibold">Bạn đã hủy giao dịch thanh toán.</p>
            <p className="mt-1 text-amber-700">
              Đơn thuê vẫn ở trạng thái <span className="font-semibold">Chờ đặt cọc</span>. Bạn có thể bấm
              <span className="font-semibold"> “Đặt cọc qua QR” </span> để thanh toán lại, hoặc chọn
              <span className="font-semibold"> “Hủy đơn” </span> nếu không muốn tiếp tục.
            </p>
          </div>
        )}

        {isGuestView && !paymentCancelled && (
          <div className="mb-6 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-700">
            Bạn đang xem đơn thuê với tư cách khách. Liên kết này chỉ có giá trị trong 7 ngày.
            Vui lòng lưu lại email xác nhận để tiếp tục theo dõi đơn của mình.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Thông tin đơn */}
          <div className="md:col-span-2 space-y-6">
            {/* Thông tin chung */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Thông tin đơn thuê</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Mã đơn</p>
                  <p className="font-mono font-medium">
                    {order.orderCode || `#${String(order._id || '').slice(-8).toUpperCase()}`}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Ngày tạo</p>
                  <p className="font-medium">{new Date(order.createdAt).toLocaleDateString('vi-VN')}</p>
                </div>
                <div>
                  <p className="text-gray-500">Ngày bắt đầu</p>
                  <p className="font-medium">
                    {new Date(order.rentStartDate).toLocaleDateString('vi-VN')}
                    {order.rentStartDate.includes('T') && ` ${new Date(order.rentStartDate).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Ngày kết thúc</p>
                  <p className="font-medium">
                    {new Date(order.rentEndDate).toLocaleDateString('vi-VN')}
                    {order.rentEndDate.includes('T') && ` ${new Date(order.rentEndDate).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`}
                  </p>
                </div>
              </div>
            </div>

            {/* Danh sách sản phẩm */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Sản phẩm thuê ({order.items?.length || 0})</h2>
              <div className="space-y-4">
                {order.items?.map((item, index) => (
                  <Link
                    key={index}
                    to={`/products/${item.productInstanceId?.productId?._id}`}
                    className="block rounded-lg bg-gray-50 p-4 transition hover:bg-white hover:shadow-sm"
                  >
                    <div className="flex items-center gap-4">
                      <img
                        src={item.productInstanceId?.productId?.images?.[0] || '/placeholder.png'}
                        alt={item.productInstanceId?.productId?.name}
                        className="w-20 h-20 object-cover rounded"
                      />
                      <div className="flex-1">
                        <p className="font-semibold">{item.productInstanceId?.productId?.name}</p>
                        <p className="text-sm text-gray-500">
                          Size: {item.size} | Màu: {item.color}
                        </p>
                        <p className="text-sm">
                          Tình trạng: <span className="text-gray-600">{item.condition || 'Tốt'}</span>
                        </p>
                        <p className="mt-2 text-xs font-medium text-pink-600">Bấm để xem sản phẩm và thuê lại</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-pink-600">
                          {item.finalPrice?.toLocaleString('vi-VN')}đ
                        </p>
                        <p className="text-xs text-gray-500">/ngày</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Lịch sử thanh toán */}
            {order.payments?.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-4">Lịch sử thanh toán</h2>
                <div className="space-y-3">
                  {order.payments.map((payment, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <div>
                        <p className="font-medium">
                          {payment.method === 'Cash' ? 'Tiền mặt' : payment.method === 'Online' ? 'Chuyển khoản' : payment.method}
                        </p>
                        <p className="text-xs text-gray-500">
                          {payment.paidAt ? new Date(payment.paidAt).toLocaleString('vi-VN') : 'Chưa thanh toán'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{payment.amount?.toLocaleString('vi-VN')}đ</p>
                        <p className={`text-xs ${payment.status === 'Paid' ? 'text-green-600' : 'text-yellow-600'}`}>
                          {payment.status === 'Paid' ? 'Đã thanh toán' : payment.status}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Tổng tiền & Actions */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Thanh toán</h2>
              
              <div className="space-y-3 border-b pb-4 mb-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Tiền thuê</span>
                  <span className="font-medium">{order.totalAmount?.toLocaleString('vi-VN')}đ</span>
                </div>
                <div className="flex justify-between text-pink-600 font-semibold">
                  <span>Đặt cọc (50%)</span>
                  <span>{order.depositAmount?.toLocaleString('vi-VN')}đ</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Còn lại</span>
                  <span>{order.remainingAmount?.toLocaleString('vi-VN')}đ</span>
                </div>
              </div>

              {/* Phí phát sinh */}
              {(order.damageFee > 0 || order.lateFee > 0 || order.compensationFee > 0) && (
                <div className="border-b pb-4 mb-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Phí phát sinh</h3>
                  <div className="space-y-1">
                    {order.lateFee > 0 && (
                      <div className="flex justify-between text-yellow-600">
                        <span>Trễ hạn ({order.lateDays || 0} ngày)</span>
                        <span>{order.lateFee?.toLocaleString('vi-VN')}đ</span>
                      </div>
                    )}
                    {order.damageFee > 0 && (
                      <div className="flex justify-between text-red-600">
                        <span>Hư hỏng</span>
                        <span>{order.damageFee?.toLocaleString('vi-VN')}đ</span>
                      </div>
                    )}
                    {order.compensationFee > 0 && (
                      <div className="flex justify-between text-red-700">
                        <span>Bồi thường</span>
                        <span>{order.compensationFee?.toLocaleString('vi-VN')}đ</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tổng cần thanh toán */}
              <div className="bg-pink-50 rounded-lg p-3">
                <div className="flex justify-between font-semibold text-lg">
                  <span>
                    {order.status === 'Completed' ? 'Tổng chi phí thực tế' : 'Còn cần thanh toán'}
                  </span>
                  <span className="text-pink-600">
                    {(() => {
                      const fees = (order.lateFee || 0) + (order.damageFee || 0) + (order.compensationFee || 0)
                      if (order.status === 'Completed') {
                        return ((order.totalAmount || 0) + fees).toLocaleString('vi-VN')
                      }
                      const paidRemaining = (order.payments || [])
                        .filter(p => p.purpose === 'Remaining' && p.status === 'Paid')
                        .reduce((s, p) => s + (p.amount || 0), 0)
                      const outstanding = Math.max(0, (order.remainingAmount || 0) - paidRemaining) + fees
                      return outstanding.toLocaleString('vi-VN')
                    })()}đ
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Thao tác</h2>
              <div className="space-y-4">
                {canPayDeposit && (
                  <div className="space-y-2">
                    <button
                      onClick={handlePayDepositOnline}
                      disabled={actionLoading}
                      className="w-full bg-pink-600 text-white py-3 rounded-lg font-semibold hover:bg-pink-700 disabled:bg-gray-400"
                    >
                      {actionLoading ? 'Đang xử lý...' : '📱 Đặt cọc qua QR (PayOS)'}
                    </button>
                    {!isGuestView && (
                      <button
                        onClick={handlePayDepositCash}
                        disabled={actionLoading}
                        className="w-full border border-pink-600 text-pink-600 py-3 rounded-lg font-semibold hover:bg-pink-50 disabled:bg-gray-100"
                      >
                        {actionLoading ? 'Đang xử lý...' : '💵 Đặt cọc tiền mặt'}
                      </button>
                    )}
                  </div>
                )}

                {canCancel && (
                  <button
                    onClick={handleCancelOrder}
                    disabled={actionLoading}
                    className="w-full border border-red-600 text-red-600 py-3 rounded-lg font-semibold hover:bg-red-50 disabled:bg-gray-100"
                  >
                    {actionLoading ? 'Đang xử lý...' : 'Hủy đơn'}
                  </button>
                )}

                {isStaffOrOwner && (order.status === 'Confirmed' || order.status === 'WaitingPickup') && (
                  <div className="rounded-lg border border-gray-200 p-4">
                    <h3 className="text-lg font-semibold mb-3">Xác nhận lấy đồ</h3>
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 gap-3">
                        <label className="text-sm font-medium text-gray-600">Loại thế chấp</label>
                        <select
                          className="w-full rounded-lg border px-3 py-2"
                          value={pickupCollateralType}
                          onChange={(e) => setPickupCollateralType(e.target.value)}
                        >
                          <option value="CCCD">CCCD</option>
                          <option value="GPLX">GPLX</option>
                          <option value="CAVET">CAVET</option>
                          <option value="CASH">Tiền mặt</option>
                        </select>
                      </div>

                      {pickupCollateralType === 'CASH' ? (
                        <div className="grid grid-cols-1 gap-3">
                          <label className="text-sm font-medium text-gray-600">Số tiền thế chấp</label>
                          <input
                            type="number"
                            min={0}
                            value={pickupCashAmount}
                            onChange={(e) => setPickupCashAmount(e.target.value)}
                            className="w-full rounded-lg border px-3 py-2"
                          />
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-3">
                          <label className="text-sm font-medium text-gray-600">Số {pickupCollateralType}</label>
                          <input
                            type="text"
                            value={pickupDocumentNumber}
                            onChange={(e) => setPickupDocumentNumber(e.target.value)}
                            className="w-full rounded-lg border px-3 py-2"
                          />
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <input
                          id="collectRemaining"
                          type="checkbox"
                          checked={pickupCollectRemaining}
                          onChange={(e) => setPickupCollectRemaining(e.target.checked)}
                          className="h-4 w-4"
                        />
                        <label htmlFor="collectRemaining" className="text-sm text-gray-600">
                          Thu khoản còn lại ngay (nếu có)
                        </label>
                      </div>

                      <button
                        onClick={handleConfirmPickup}
                        disabled={actionLoading}
                        className="w-full bg-emerald-600 text-white py-3 rounded-lg font-semibold hover:bg-emerald-700 disabled:bg-gray-400"
                      >
                        {actionLoading ? 'Đang xử lý...' : 'Xác nhận lấy đồ'}
                      </button>
                    </div>
                  </div>
                )}

                {isStaffOrOwner && (order.status === 'Renting' || order.status === 'WaitingReturn' || order.status === 'Late') && (
                  <div className="rounded-lg border border-gray-200 p-4">
                    <h3 className="text-lg font-semibold mb-3">Xác nhận trả đồ</h3>
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 gap-3">
                        <label className="text-sm font-medium text-gray-600">Tình trạng đồ</label>
                        <select
                          className="w-full rounded-lg border px-3 py-2"
                          value={returnCondition}
                          onChange={(e) => setReturnCondition(e.target.value)}
                        >
                          <option value="Normal">Bình thường</option>
                          <option value="Dirty">Bẩn</option>
                          <option value="Damaged">Hỏng</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                          <label className="text-sm font-medium text-gray-600">Phí hư hỏng</label>
                          <input
                            type="number"
                            min={0}
                            value={returnDamageFee}
                            onChange={(e) => setReturnDamageFee(e.target.value)}
                            className="w-full rounded-lg border px-3 py-2"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                          <label className="text-sm font-medium text-gray-600">Phí đền bù</label>
                          <input
                            type="number"
                            min={0}
                            value={returnCompensationFee}
                            onChange={(e) => setReturnCompensationFee(e.target.value)}
                            className="w-full rounded-lg border px-3 py-2"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3">
                        <label className="text-sm font-medium text-gray-600">Ghi chú</label>
                        <textarea
                          rows={3}
                          value={returnNote}
                          onChange={(e) => setReturnNote(e.target.value)}
                          className="w-full rounded-lg border px-3 py-2"
                        />
                      </div>

                      <button
                        onClick={handleConfirmReturn}
                        disabled={actionLoading}
                        className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-400"
                      >
                        {actionLoading ? 'Đang xử lý...' : 'Xác nhận trả đồ'}
                      </button>
                    </div>
                  </div>
                )}

                {isStaffOrOwner && ['Returned', 'WaitingReturn', 'Late', 'Compensation', 'NoShow'].includes(order.status) && (
                  <div className="rounded-lg border border-gray-200 p-4">
                    <h3 className="text-lg font-semibold mb-3">Chốt đơn</h3>
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 gap-3">
                        <label className="text-sm font-medium text-gray-600">Phương thức thanh toán</label>
                        <select
                          className="w-full rounded-lg border px-3 py-2"
                          value={finalizeMethod}
                          onChange={(e) => setFinalizeMethod(e.target.value)}
                        >
                          <option value="Cash">Tiền mặt</option>
                          <option value="Online">Chuyển khoản</option>
                        </select>
                      </div>
                      <button
                        onClick={handleFinalize}
                        disabled={actionLoading}
                        className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400"
                      >
                        {actionLoading ? 'Đang xử lý...' : 'Chốt đơn'}
                      </button>
                    </div>
                  </div>
                )}

                {!canPayDeposit && !canCancel && order.status === 'Completed' && (
                  <p className="text-center text-green-600 font-medium">Đơn thuê đã hoàn tất</p>
                )}
                {!canPayDeposit && !canCancel && order.status === 'Cancelled' && (
                  <p className="text-center text-red-600 font-medium">Đơn thuê đã bị hủy</p>
                )}
              </div>
            </div>

            {/* Thông tin khách hàng */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Thông tin khách hàng</h2>
              <div className="text-sm space-y-2">
                <p><span className="text-gray-500">Tên:</span> {order.customerId?.name}</p>
                <p><span className="text-gray-500">SĐT:</span> {order.customerId?.phone}</p>
                <p><span className="text-gray-500">Email:</span> {order.customerId?.email}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
