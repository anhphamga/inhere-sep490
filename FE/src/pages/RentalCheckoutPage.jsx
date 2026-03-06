import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Trash2, ArrowLeft, ShoppingBag } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useRentalCart } from '../contexts/RentalCartContext'
import { createRentOrderApi, payDepositApi } from '../services/rent-order.service'

// Tính số ngày thuê
const calculateDays = (startDate, endDate) => {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end - start);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1 || 1;
};

export default function RentalCheckoutPage() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const { items: cartItems, clearCart, removeItem } = useRentalCart()
  const [paymentMethod, setPaymentMethod] = useState('Cash')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Tính tổng tiền cho mỗi sản phẩm dựa trên ngày của sản phẩm đó
  const cartItemsWithTotal = cartItems.map(item => {
    const days = calculateDays(item.rentStartDate, item.rentEndDate);
    const subtotal = item.rentPrice * days;
    return {
      ...item,
      days,
      subtotal
    };
  });

  // Tổng tiền tất cả
  const totalAmount = cartItemsWithTotal.reduce((sum, item) => sum + item.subtotal, 0);
  const depositAmount = Math.round(totalAmount * 0.5);
  const remainingAmount = totalAmount - depositAmount;

  const handleCreateOrder = async () => {
    if (!isAuthenticated) {
      navigate('/login?redirect=/rental/checkout')
      return
    }

    if (cartItems.length === 0) {
      setError('Giỏ thuê trống')
      return
    }

    // Kiểm tra mỗi sản phẩm phải có ngày
    const itemsWithoutDates = cartItems.filter(item => !item.rentStartDate || !item.rentEndDate);
    if (itemsWithoutDates.length > 0) {
      setError('Vui lòng chọn ngày thuê cho tất cả sản phẩm')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Mỗi sản phẩm có thể có ngày khác nhau
      const items = cartItems.map(item => ({
        productInstanceId: item.productInstanceId,
        productId: item.productId,
        baseRentPrice: item.rentPrice,
        finalPrice: item.rentPrice,
        size: item.size,
        color: item.color,
        rentStartDate: item.rentStartDate,
        rentEndDate: item.rentEndDate
      }))

      const orderData = {
        // Ngày chung cho đơn (ngày bắt đầu sớm nhất và kết thúc muộn nhất)
        rentStartDate: cartItems[0].rentStartDate,
        rentEndDate: cartItems[cartItems.length - 1].rentEndDate,
        items,
        depositAmount,
        remainingAmount,
        totalAmount
      }

      const response = await createRentOrderApi(orderData)

      if (response.success) {
        clearCart()
        const orderId = response.data._id
        await handlePayDeposit(orderId)
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra khi tạo đơn')
    } finally {
      setLoading(false)
    }
  }

  const handlePayDeposit = async (orderId) => {
    setLoading(true)
    setError('')

    try {
      const response = await payDepositApi(orderId, { method: paymentMethod })

      if (response.success) {
        alert('Thanh toán đặt cọc thành công!')
        navigate(`/rental/${orderId}`)
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra khi thanh toán')
    } finally {
      setLoading(false)
    }
  }

  // Empty cart
  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ShoppingBag className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Giỏ thuê trống</h2>
          <p className="text-gray-500 mb-4">Hãy thuê trang phục cho chuyến tham quan Hội An của bạn</p>
          <Link to="/buy" className="inline-block bg-pink-600 text-white px-6 py-3 rounded-lg hover:bg-pink-700">
            Khám phá sản phẩm
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link to="/buy" className="p-2 hover:bg-gray-200 rounded-lg">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Giỏ thuê</h1>
          </div>
          <span className="text-gray-500">{cartItems.length} sản phẩm</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Danh sách sản phẩm */}
          <div className="md:col-span-2 space-y-4">
            {cartItemsWithTotal.map((item) => (
              <div key={item.id} className="bg-white rounded-lg shadow-md p-4">
                <div className="flex gap-4">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-24 h-24 object-cover rounded-lg"
                  />
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">{item.name}</h3>
                        <p className="text-sm text-gray-500">Size: {item.size} | Màu: {item.color}</p>
                      </div>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                        title="Xóa sản phẩm"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                    
                    {/* Ngày thuê của sản phẩm này */}
                    <div className="mt-2 p-2 bg-blue-50 rounded-lg text-sm">
                      <p className="text-blue-700">
                        📅 {new Date(item.rentStartDate).toLocaleDateString('vi-VN')} - {new Date(item.rentEndDate).toLocaleDateString('vi-VN')}
                        <span className="ml-2 font-medium">({item.days} ngày)</span>
                      </p>
                    </div>

                    <div className="flex justify-between items-center mt-2">
                      <p className="text-sm text-gray-500">
                        {item.rentPrice.toLocaleString('vi-VN')}đ/ngày
                      </p>
                      <p className="font-semibold text-pink-600">
                        {item.subtotal.toLocaleString('vi-VN')}đ
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <Link to="/buy" className="inline-flex items-center gap-2 text-pink-600 hover:underline">
              + Thêm sản phẩm
            </Link>
          </div>

          {/* Thanh toán */}
          <div className="bg-white rounded-lg shadow-md p-6 h-fit sticky top-4">
            <h2 className="text-xl font-semibold mb-4">Thanh toán đặt cọc</h2>

            {/* Tổng tiền */}
            <div className="space-y-2 mb-6">
              <div className="flex justify-between text-gray-600">
                <span>Tạm tính</span>
                <span>{totalAmount.toLocaleString('vi-VN')}đ</span>
              </div>
              <div className="flex justify-between text-lg font-semibold text-pink-600 border-t pt-2">
                <span>Đặt cọc (50%)</span>
                <span>{depositAmount.toLocaleString('vi-VN')}đ</span>
              </div>
              <div className="flex justify-between text-sm text-gray-500">
                <span>Còn lại</span>
                <span>{remainingAmount.toLocaleString('vi-VN')}đ</span>
              </div>
            </div>

            {/* Phương thức thanh toán */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phương thức thanh toán
              </label>
              <div className="space-y-2">
                <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="Cash"
                    checked={paymentMethod === 'Cash'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="mr-3"
                  />
                  <span>Tiền mặt tại cửa hàng</span>
                </label>
                <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="Online"
                    checked={paymentMethod === 'Online'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="mr-3"
                  />
                  <span>Chuyển khoản online (QR Code)</span>
                </label>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Nút thanh toán */}
            <button
              onClick={handleCreateOrder}
              disabled={loading || cartItems.length === 0}
              className="w-full bg-pink-600 text-white py-3 rounded-lg font-semibold hover:bg-pink-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Đang xử lý...' : `Thanh toán ${depositAmount.toLocaleString('vi-VN')}đ`}
            </button>

            <p className="text-xs text-gray-500 mt-4 text-center">
              Bạn sẽ nhận được email xác nhận sau khi thanh toán đặt cọc thành công
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
