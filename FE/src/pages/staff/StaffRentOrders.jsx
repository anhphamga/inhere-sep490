import { useCallback, useEffect, useState } from 'react'
import { getAllRentOrdersApi, confirmRentOrderApi, confirmPickupApi, confirmReturnApi, completeWashingApi } from '../../services/rent-order.service'

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

export default function StaffRentOrders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')

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

  const handlePickup = async (orderId) => {
    if (!confirm('Xác nhận khách đã lấy đồ?')) return

    setActionLoading(true)
    try {
      await confirmPickupApi(orderId)
      alert('Xác nhận lấy đồ thành công!')
      fetchOrders()
      setSelectedOrder(null)
    } catch (err) {
      alert(err.response?.data?.message || 'Có lỗi xảy ra')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReturn = async (orderId) => {
    const washingFee = prompt('Nhập phí giặt (nếu có):', '0')
    const damageFee = prompt('Nhập phí hư hỏng (nếu có):', '0')

    if (washingFee === null || damageFee === null) return

    setActionLoading(true)
    try {
      await confirmReturnApi(orderId, {
        washingFee: parseInt(washingFee) || 0,
        damageFee: parseInt(damageFee) || 0
      })
      alert('Xác nhận trả đồ thành công! Sản phẩm đang chờ giặt.')
      fetchOrders()
      setSelectedOrder(null)
    } catch (err) {
      alert(err.response?.data?.message || 'Có lỗi xảy ra')
    } finally {
      setActionLoading(false)
    }
  }

  const handleCompleteWashing = async (orderId) => {
    if (!confirm('Hoàn tất giặt? Sản phẩm sẽ sẵn sàng cho thuê tiếp theo.')) return

    setActionLoading(true)
    try {
      await completeWashingApi(orderId)
      alert('Hoàn tất giặt! Sản phẩm đã có sẵn.')
      fetchOrders()
      setSelectedOrder(null)
    } catch (err) {
      alert(err.response?.data?.message || 'Có lỗi xảy ra')
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div>
      {/* Bộ lọc */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex gap-4 items-center">
          <label className="text-sm font-medium text-gray-700">Lọc theo trạng thái:</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
          <button
            onClick={fetchOrders}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Làm mới
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-4">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Danh sách đơn */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="font-semibold">Danh sách đơn thuê ({orders.length})</h3>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent"></div>
            </div>
          ) : orders.length === 0 ? (
            <div className="p-8 text-center text-gray-500">Không có đơn thuê nào</div>
          ) : (
            <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
              {orders.map((order) => (
                <div
                  key={order._id}
                  onClick={() => setSelectedOrder(order)}
                  className={`p-4 hover:bg-gray-50 cursor-pointer ${selectedOrder?._id === order._id ? 'bg-indigo-50' : ''}`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900">
                        #{order._id}
                      </p>
                      <p className="text-sm text-gray-500">
                        Khách: {getCustomerText(order.customerId)}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {order.createdAt ? new Date(order.createdAt).toLocaleString('vi-VN') : 'N/A'}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[order.status] || 'bg-gray-100'}`}>
                      {statusLabels[order.status] || order.status}
                    </span>
                  </div>
                  <div className="mt-2 text-sm text-gray-600">
                    Tổng tiền: {order.totalAmount || 0}đ
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Chi tiết đơn */}
        <div className="bg-white rounded-lg shadow p-6">
          {selectedOrder ? (
            <div>
              <h3 className="font-semibold text-lg mb-4">Chi tiết đơn #{selectedOrder._id}</h3>

              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Mã khách hàng</p>
                  <p className="font-medium">{getCustomerText(selectedOrder.customerId)}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Ngày thuê</p>
                  <p className="font-medium">
                    {selectedOrder.rentStartDate ? new Date(selectedOrder.rentStartDate).toLocaleDateString('vi-VN') : 'N/A'} - {selectedOrder.rentEndDate ? new Date(selectedOrder.rentEndDate).toLocaleDateString('vi-VN') : 'N/A'}
                  </p>
                </div>

                {/* Thông tin thanh toán */}
                <div className="border-t pt-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Thông tin thanh toán</p>

                  <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Tiền thuê:</span>
                      <span className="font-medium">{(selectedOrder.totalAmount || 0).toLocaleString('vi-VN')}đ</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Đặt cọc (50%):</span>
                      <span className="font-medium text-indigo-600">{(selectedOrder.depositAmount || 0).toLocaleString('vi-VN')}đ</span>
                    </div>
                    <div className="flex justify-between text-sm border-t pt-2">
                      <span className="text-gray-600">Còn lại:</span>
                      <span className="font-medium">{((selectedOrder.totalAmount || 0) - (selectedOrder.depositAmount || 0)).toLocaleString('vi-VN')}đ</span>
                    </div>
                  </div>

                  {/* Phí phát sinh (nếu có) */}
                  {(selectedOrder.washingFee > 0 || selectedOrder.damageFee > 0) && (
                    <div className="mt-3 bg-orange-50 rounded-lg p-3 space-y-2">
                      <p className="text-sm font-medium text-orange-800">Phí phát sinh</p>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Giặt:</span>
                        <span className="font-medium">{(selectedOrder.washingFee || 0).toLocaleString('vi-VN')}đ</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Hư hỏng:</span>
                        <span className="font-medium">{(selectedOrder.damageFee || 0).toLocaleString('vi-VN')}đ</span>
                      </div>
                      <div className="flex justify-between text-sm border-t pt-2 font-semibold">
                        <span className="text-orange-800">Tổng cần thanh toán:</span>
                        <span className="text-orange-800">{((selectedOrder.totalAmount || 0) - (selectedOrder.depositAmount || 0) + (selectedOrder.washingFee || 0) + (selectedOrder.damageFee || 0)).toLocaleString('vi-VN')}đ</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="border-t pt-4 space-y-2">
                  {selectedOrder.status === 'Deposited' && (
                    <button
                      onClick={() => handleConfirm(selectedOrder._id)}
                      disabled={actionLoading}
                      className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400"
                    >
                      {actionLoading ? 'Đang xử lý...' : 'Xác nhận đơn (Chờ khách lấy đồ)'}
                    </button>
                  )}

                  {selectedOrder.status === 'Confirmed' && (
                    <button
                      onClick={() => handlePickup(selectedOrder._id)}
                      disabled={actionLoading}
                      className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 disabled:bg-gray-400"
                    >
                      {actionLoading ? 'Đang xử lý...' : 'Xác nhận chờ lấy đồ'}
                    </button>
                  )}

                  {selectedOrder.status === 'WaitingPickup' && (
                    <button
                      onClick={() => handlePickup(selectedOrder._id)}
                      disabled={actionLoading}
                      className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400"
                    >
                      {actionLoading ? 'Đang xử lý...' : 'Xác nhận khách đã lấy đồ'}
                    </button>
                  )}

                  {selectedOrder.status === 'Renting' && (
                    <button
                      onClick={() => handleReturn(selectedOrder._id)}
                      disabled={actionLoading}
                      className="w-full bg-orange-600 text-white py-2 rounded-lg hover:bg-orange-700 disabled:bg-gray-400"
                    >
                      {actionLoading ? 'Đang xử lý...' : 'Xác nhận trả đồ'}
                    </button>
                  )}

                  {selectedOrder.status === 'Completed' && (
                    <button
                      onClick={() => handleCompleteWashing(selectedOrder._id)}
                      disabled={actionLoading}
                      className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                    >
                      {actionLoading ? 'Đang xử lý...' : 'Hoàn tất giặt (Sản phẩm sẵn sàng)'}
                    </button>
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
    </div>
  )
}
