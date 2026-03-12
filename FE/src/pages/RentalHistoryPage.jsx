import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getMyRentOrdersApi } from '../services/rent-order.service'
import Header from '../components/common/Header'

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

export default function RentalHistoryPage() {
  const { isAuthenticated } = useAuth()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  useEffect(() => {
    if (isAuthenticated) {
      fetchOrders()
    }
  }, [isAuthenticated, filterStatus])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const params = filterStatus ? { status: filterStatus } : {}
      const response = await getMyRentOrdersApi(params)
      setOrders(response.data || [])
    } catch (err) {
      setError('Không thể tải lịch sử thuê')
    } finally {
      setLoading(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Vui lòng đăng nhập để xem lịch sử thuê</p>
          <Link to="/login" className="text-pink-600 hover:underline">Đăng nhập</Link>
        </div>
        </div>
      </>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Lịch sử thuê</h1>
          <Link
            to="/products"
            className="bg-pink-600 text-white px-4 py-2 rounded-lg hover:bg-pink-700"
          >
            Thuê thêm
          </Link>
        </div>

        {/* Bộ lọc */}
        <div className="mb-6">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="PendingDeposit">Chờ đặt cọc</option>
            <option value="Deposited">Đã đặt cọc</option>
            <option value="Confirmed">Đã xác nhận</option>
            <option value="WaitingPickup">Chờ lấy đồ</option>
            <option value="Renting">Đang thuê</option>
            <option value="Completed">Hoàn tất</option>
            <option value="Cancelled">Đã hủy</option>
          </select>
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-pink-600 border-t-transparent"></div>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="text-center py-8 text-red-600">{error}</div>
        )}

        {/* Empty state */}
        {!loading && !error && orders.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500 mb-4">Bạn chưa có đơn thuê nào</p>
            <Link to="/products" className="text-pink-600 hover:underline">
              Khám phá sản phẩm
            </Link>
          </div>
        )}

        {/* Danh sách đơn */}
        {!loading && !error && orders.length > 0 && (
          <div className="space-y-4">
            {orders.map((order) => (
              <Link
                key={order._id}
                to={`/rental/${order._id}`}
                className="block bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-sm text-gray-500">
                      Mã đơn: <span className="font-mono">{order._id.slice(-8)}</span>
                    </p>
                    <p className="text-sm text-gray-500">
                      Ngày tạo: {new Date(order.createdAt).toLocaleDateString('vi-VN')}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[order.status] || 'bg-gray-100'}`}>
                    {statusLabels[order.status] || order.status}
                  </span>
                </div>

                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-sm text-gray-600">
                      {new Date(order.rentStartDate).toLocaleDateString('vi-VN')} - {new Date(order.rentEndDate).toLocaleDateString('vi-VN')}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {order.items?.length || 0} sản phẩm
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-lg">
                      {order.totalAmount?.toLocaleString('vi-VN')}đ
                    </p>
                    <p className="text-xs text-gray-500">
                      Đặt cọc: {order.depositAmount?.toLocaleString('vi-VN')}đ
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
