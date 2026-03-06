import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getRentOrderByIdApi, payDepositApi, cancelRentOrderApi } from '../services/rent-order.service'

const statusLabels = {
  Draft: 'Nháp',
  PendingDeposit: 'Chờ đặt cọc',
  Deposited: 'Đã đặt cọc',
  Confirmed: 'Đã xác nhận',
  WaitingPickup: 'Chờ lấy đồ',
  Renting: 'Đang thuê',
  Waiting: 'Chờ trả',
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
  Waiting: 'bg-orange-100 text-orange-800',
  Completed: 'bg-green-200 text-green-800',
  Cancelled: 'bg-red-100 text-red-800'
}

export default function RentalDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated, loading: authLoading } = useAuth()

  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    if (!authLoading && isAuthenticated && id) {
      fetchOrderDetail()
    }
  }, [isAuthenticated, id, authLoading])

  const fetchOrderDetail = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await getRentOrderByIdApi(id)
      setOrder(response.data)
    } catch (err) {
      console.error('Error fetching order:', err)
      if (err.response?.status === 401) {
        setError('Vui lòng đăng nhập lại')
      } else if (err.response?.status === 403) {
        setError('Bạn không có quyền xem đơn thuê này')
      } else {
        setError('Không thể tải chi tiết đơn thuê')
      }
    } finally {
      setLoading(false)
    }
  }

  const handlePayDeposit = async () => {
    if (!confirm('Bạn có chắc chắn muốn thanh toán đặt cọc?')) return

    setActionLoading(true)
    try {
      const response = await payDepositApi(id, { method: 'Cash' })
      if (response.success) {
        alert('Thanh toán đặt cọc thành công!')
        fetchOrderDetail()
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Có lỗi xảy ra')
    } finally {
      setActionLoading(false)
    }
  }

  const handleCancelOrder = async () => {
    if (!confirm('Bạn có chắc chắn muốn hủy đơn thuê này?')) return

    setActionLoading(true)
    try {
      const response = await cancelRentOrderApi(id)
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

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Vui lòng đăng nhập để xem chi tiết đơn thuê</p>
          <Link to="/login?redirect=/rental/{id}" className="text-pink-600 hover:underline">
            Đăng nhập
          </Link>
        </div>
      </div>
    )
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-pink-600 border-t-transparent"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Link to="/rental/history" className="text-pink-600 hover:underline">
            Quay lại lịch sử thuê
          </Link>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Không tìm thấy đơn thuê</p>
          <Link to="/rental/history" className="text-pink-600 hover:underline">
            Quay lại lịch sử thuê
          </Link>
        </div>
      </div>
    )
  }

  const canPayDeposit = order.status === 'PendingDeposit'
  const canCancel = ['Draft', 'PendingDeposit', 'Deposited'].includes(order.status)

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link to="/rental/history" className="text-pink-600 hover:underline">
            ← Quay lại
          </Link>
          <span className={`px-4 py-2 rounded-full text-sm font-medium ${statusColors[order.status] || 'bg-gray-100'}`}>
            {statusLabels[order.status] || order.status}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Thông tin đơn */}
          <div className="md:col-span-2 space-y-6">
            {/* Thông tin chung */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Thông tin đơn thuê</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Mã đơn</p>
                  <p className="font-mono font-medium">{order._id}</p>
                </div>
                <div>
                  <p className="text-gray-500">Ngày tạo</p>
                  <p className="font-medium">{new Date(order.createdAt).toLocaleDateString('vi-VN')}</p>
                </div>
                <div>
                  <p className="text-gray-500">Ngày bắt đầu</p>
                  <p className="font-medium">{new Date(order.rentStartDate).toLocaleDateString('vi-VN')}</p>
                </div>
                <div>
                  <p className="text-gray-500">Ngày kết thúc</p>
                  <p className="font-medium">{new Date(order.rentEndDate).toLocaleDateString('vi-VN')}</p>
                </div>
              </div>
            </div>

            {/* Danh sách sản phẩm */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Sản phẩm thuê ({order.items?.length || 0})</h2>
              <div className="space-y-4">
                {order.items?.map((item, index) => (
                  <div key={index} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
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
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-pink-600">
                        {item.finalPrice?.toLocaleString('vi-VN')}đ
                      </p>
                      <p className="text-xs text-gray-500">/ngày</p>
                    </div>
                  </div>
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
              {(order.washingFee > 0 || order.damageFee > 0) && (
                <div className="border-b pb-4 mb-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Phí phát sinh</h3>
                  <div className="space-y-1">
                    {order.washingFee > 0 && (
                      <div className="flex justify-between text-orange-600">
                        <span>Giặt</span>
                        <span>{order.washingFee?.toLocaleString('vi-VN')}đ</span>
                      </div>
                    )}
                    {order.damageFee > 0 && (
                      <div className="flex justify-between text-red-600">
                        <span>Hư hỏng</span>
                        <span>{order.damageFee?.toLocaleString('vi-VN')}đ</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tổng cần thanh toán */}
              <div className="bg-pink-50 rounded-lg p-3">
                <div className="flex justify-between font-semibold text-lg">
                  <span>Tổng cần thanh toán</span>
                  <span className="text-pink-600">
                    {((order.depositAmount || 0) + (order.washingFee || 0) + (order.damageFee || 0)).toLocaleString('vi-VN')}đ
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Thao tác</h2>
              <div className="space-y-3">
                {canPayDeposit && (
                  <button
                    onClick={handlePayDeposit}
                    disabled={actionLoading}
                    className="w-full bg-pink-600 text-white py-3 rounded-lg font-semibold hover:bg-pink-700 disabled:bg-gray-400"
                  >
                    {actionLoading ? 'Đang xử lý...' : 'Thanh toán đặt cọc'}
                  </button>
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
