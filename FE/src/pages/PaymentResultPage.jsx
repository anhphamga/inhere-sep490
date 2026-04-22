import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { checkPayosStatusApi } from '../services/payment.service'
import { useAuth } from '../hooks/useAuth'

const MAX_POLL = 8
const POLL_INTERVAL = 3000

export default function PaymentResultPage() {
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()

    const { isAuthenticated } = useAuth()

    const orderId      = searchParams.get('orderId')      // rent order
    const saleOrderId  = searchParams.get('saleOrderId')  // sale order
    const orderCode    = searchParams.get('orderCode')
    const purpose      = searchParams.get('purpose')      // 'deposit' | 'extra-due' | 'sale'
    const urlStatus    = searchParams.get('status')       // 'cancelled'
    const source       = searchParams.get('source')       // 'staff' = walk-in order, 'guest' = guest rent
    const isStaffOrder = source === 'staff'
    const isGuestOrder = source === 'guest'

    const [state, setState] = useState('loading') // 'loading' | 'success' | 'cancelled' | 'error'
    const [order, setOrder] = useState(null)
    const pollRef = useRef(0)

    useEffect(() => {
        if (urlStatus === 'cancelled') {
            setState('cancelled')
            return
        }
        if (!orderCode) {
            setState('error')
            return
        }
        pollStatus()
    }, [])

    const pollStatus = async () => {
        try {
            const data = await checkPayosStatusApi(orderCode)
            const status = data?.data?.status

            if (status === 'PAID') {
                setOrder(data?.data?.order)
                setState('success')
                return
            }
            if (status === 'CANCELLED' || status === 'EXPIRED') {
                setState('cancelled')
                return
            }

            // Còn PENDING — thử lại
            pollRef.current += 1
            if (pollRef.current < MAX_POLL) {
                setTimeout(pollStatus, POLL_INTERVAL)
            } else {
                setState('error')
            }
        } catch {
            setState('error')
        }
    }

    const handleGoOrder = () => {
        if (isStaffOrder) {
            navigate('/staff/rent-orders')
            return
        }
        if (isGuestOrder) {
            // Guest không xem được /rental/:id (yêu cầu auth) → chuyển sang trang tra cứu
            const orderCode = order?.orderCode ? `?orderCode=${encodeURIComponent(order.orderCode)}` : ''
            navigate(`/track-order${orderCode}`)
            return
        }
        if (purpose === 'sale' && saleOrderId) {
            if (isAuthenticated) navigate(`/orders/${saleOrderId}`)
            else navigate('/')
        } else if (orderId) navigate(`/rental/${orderId}`)
        else navigate('/orders/history')
    }

    const handleRetry = () => {
        if (isStaffOrder) {
            navigate('/staff/rent-orders')
            return
        }
        if (isGuestOrder) {
            const orderCode = order?.orderCode ? `?orderCode=${encodeURIComponent(order.orderCode)}` : ''
            navigate(`/track-order${orderCode}`)
            return
        }
        if (purpose === 'sale') navigate('/cart')
        else if (orderId) navigate(`/rental/${orderId}`)
        else navigate('/')
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-pink-50 to-white flex items-center justify-center px-4">
            <div className="w-full max-w-md rounded-3xl bg-white shadow-xl p-8 text-center">
                {state === 'loading' && (
                    <>
                        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-blue-50">
                            <svg className="h-10 w-10 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                            </svg>
                        </div>
                        <h1 className="text-xl font-bold text-gray-800">Đang xác nhận thanh toán...</h1>
                        <p className="mt-2 text-sm text-gray-500">Vui lòng chờ trong giây lát</p>
                    </>
                )}

                {state === 'success' && (
                    <>
                        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
                            <svg className="h-10 w-10 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h1 className="text-xl font-bold text-gray-800">Thanh toán thành công!</h1>
                        {isStaffOrder ? (
                            <p className="mt-2 text-sm text-gray-500">
                                {purpose === 'extra-due'
                                    ? 'Khách đã thanh toán khoản còn lại thành công. Đơn thuê có thể hoàn tất.'
                                    : 'Khách đã thanh toán cọc thành công. Đơn thuê đã chuyển sang trạng thái Đã đặt cọc.'}
                            </p>
                        ) : (
                            <>
                                {purpose === 'deposit' && (
                                    <p className="mt-2 text-sm text-gray-500">
                                        Đặt cọc của bạn đã được xác nhận. Đơn thuê đang chờ duyệt.
                                    </p>
                                )}
                                {purpose === 'extra-due' && (
                                    <p className="mt-2 text-sm text-gray-500">
                                        Khoản thanh toán đã được ghi nhận. Staff sẽ hoàn tất đơn sớm.
                                    </p>
                                )}
                                {purpose === 'sale' && (
                                    <p className="mt-2 text-sm text-gray-500">
                                        Thanh toán thành công! Đơn đang chờ xác nhận từ cửa hàng.
                                        {!isAuthenticated && ' Cảm ơn bạn đã mua hàng tại INHERE.'}
                                    </p>
                                )}
                            </>
                        )}
                        {order?.orderCode && (
                            <div className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3">
                                <p className="text-xs text-emerald-600">Mã đơn</p>
                                <p className="text-lg font-bold text-emerald-800">{order.orderCode}</p>
                            </div>
                        )}
                        {/* Guest không thể xem trang chi tiết đơn (cần đăng nhập) */}
                        {!(purpose === 'sale' && !isAuthenticated) && (
                            <button
                                onClick={handleGoOrder}
                                className="mt-6 w-full rounded-2xl bg-emerald-500 py-3 text-sm font-semibold text-white hover:bg-emerald-600 transition"
                            >
                                {isStaffOrder
                                    ? 'Xem danh sách đơn thuê'
                                    : isGuestOrder
                                        ? 'Tra cứu đơn của tôi'
                                        : 'Xem chi tiết đơn'}
                            </button>
                        )}
                    </>
                )}

                {state === 'cancelled' && (
                    <>
                        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-orange-100">
                            <svg className="h-10 w-10 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </div>
                        <h1 className="text-xl font-bold text-gray-800">Thanh toán đã hủy</h1>
                        <p className="mt-2 text-sm text-gray-500">
                            {isStaffOrder
                                ? (purpose === 'extra-due'
                                    ? 'Khách chưa hoàn tất thanh toán. Đơn vẫn chờ thu khoản còn lại.'
                                    : 'Khách chưa hoàn tất thanh toán. Đơn vẫn đang ở trạng thái Chờ đặt cọc.')
                                : 'Bạn đã hủy giao dịch. Đơn thuê vẫn đang chờ đặt cọc.'}
                        </p>
                        <button
                            onClick={handleRetry}
                            className="mt-6 w-full rounded-2xl bg-indigo-500 py-3 text-sm font-semibold text-white hover:bg-indigo-600 transition"
                        >
                            {isStaffOrder ? 'Quay lại quản lý đơn' : 'Thử lại'}
                        </button>
                    </>
                )}

                {state === 'error' && (
                    <>
                        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
                            <svg className="h-10 w-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z" />
                            </svg>
                        </div>
                        <h1 className="text-xl font-bold text-gray-800">Không xác nhận được giao dịch</h1>
                        <p className="mt-2 text-sm text-gray-500">
                            {isStaffOrder
                                ? 'Có thể khách đã thanh toán nhưng chưa cập nhật. Kiểm tra đơn trong danh sách hoặc đợi webhook xác nhận.'
                                : 'Có thể thanh toán thành công nhưng chưa cập nhật. Vui lòng kiểm tra lịch sử đơn hàng hoặc liên hệ cửa hàng.'}
                        </p>
                        <button
                            onClick={handleGoOrder}
                            className="mt-6 w-full rounded-2xl bg-gray-700 py-3 text-sm font-semibold text-white hover:bg-gray-800 transition"
                        >
                            {isStaffOrder ? 'Xem danh sách đơn thuê' : 'Xem đơn hàng'}
                        </button>
                    </>
                )}

                <button
                    onClick={() => isStaffOrder ? navigate('/staff/rent-orders') : navigate('/')}
                    className="mt-3 w-full rounded-2xl border border-gray-200 py-3 text-sm text-gray-500 hover:bg-gray-50 transition"
                >
                    {isStaffOrder ? 'Về quản lý đơn thuê' : 'Về trang chủ'}
                </button>
            </div>
        </div>
    )
}
