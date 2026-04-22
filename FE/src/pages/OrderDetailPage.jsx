import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { CreditCard, MapPin, Package, ReceiptText, UserRound } from 'lucide-react'
import Header from '../components/common/Header'
import ReviewForm from '../components/review/ReviewForm'
import { useAuth } from '../contexts/AuthContext'
import { getGuestSaleOrderByIdApi, getMySaleOrderByIdApi } from '../services/order.service'
import { createReviewApi, updateReviewApi } from '../services/review.service'
import { UI_IMAGE_FALLBACKS } from '../constants/ui'

const statusClassMap = {
  PendingConfirmation: 'bg-amber-50 text-amber-700 ring-amber-200',
  PendingPayment: 'bg-amber-50 text-amber-700 ring-amber-200',
  Paid: 'bg-sky-50 text-sky-700 ring-sky-200',
  Confirmed: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  Shipping: 'bg-violet-50 text-violet-700 ring-violet-200',
  Completed: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  Cancelled: 'bg-rose-50 text-rose-700 ring-rose-200',
  Returned: 'bg-slate-100 text-slate-700 ring-slate-200',
  Refunded: 'bg-slate-100 text-slate-700 ring-slate-200',
  Failed: 'bg-rose-50 text-rose-700 ring-rose-200',
}

function formatCurrency(value) {
  return `${Number(value || 0).toLocaleString('vi-VN')}đ`
}

function formatDateTime(value) {
  if (!value) return '--'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '--'
  return date.toLocaleString('vi-VN')
}

function getProductName(product) {
  if (typeof product?.name === 'string') return product.name
  if (product?.name && typeof product.name === 'object') {
    return product.name.vi || product.name.en || 'Sản phẩm'
  }
  return 'Sản phẩm'
}

function getPaymentMethodLabel(value) {
  const paymentMap = {
    COD: 'Thanh toán khi nhận hàng',
    Online: 'Thanh toán online',
    BankTransfer: 'Chuyển khoản',
  }

  return paymentMap[value] || value || '--'
}

function getImageUrl(value) {
  if (Array.isArray(value) && value[0]) return value[0]
  return UI_IMAGE_FALLBACKS.reviewImage
}

export default function OrderDetailPage() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const { isAuthenticated, loading: authLoading } = useAuth()

  const guestToken = searchParams.get('token') || ''
  const isGuestView = Boolean(guestToken)
  const backPath = isGuestView ? '/' : '/orders/history'

  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [reviewModalOpen, setReviewModalOpen] = useState(false)
  const [reviewSubmitting, setReviewSubmitting] = useState(false)
  const [activeReviewItem, setActiveReviewItem] = useState(null)

  const fetchOrderDetail = useCallback(async () => {
    try {
      setLoading(true)
      setError('')

      const response = isGuestView
        ? await getGuestSaleOrderByIdApi(id, guestToken)
        : await getMySaleOrderByIdApi(id)

      setOrder(response.data)
    } catch (fetchError) {
      console.error('Fetch sale order detail error:', fetchError)
      if (fetchError?.response?.status === 404) {
        setError('Không tìm thấy đơn mua này.')
      } else if (fetchError?.response?.status === 401 && isGuestView) {
        setError('Liên kết xem đơn hàng đã hết hạn hoặc không hợp lệ.')
      } else if (fetchError?.response?.status === 403) {
        setError('Bạn không có quyền xem đơn mua này.')
      } else {
        setError(fetchError?.response?.data?.message || 'Không thể tải chi tiết đơn mua.')
      }
    } finally {
      setLoading(false)
    }
  }, [guestToken, id, isGuestView])

  useEffect(() => {
    if (isGuestView) {
      if (id && guestToken) {
        fetchOrderDetail()
      } else {
        setLoading(false)
        setError('Thiếu thông tin để xem đơn hàng guest.')
      }
      return
    }

    if (!authLoading && isAuthenticated && id) {
      fetchOrderDetail()
    }

    if (!authLoading && !isAuthenticated) {
      setLoading(false)
    }
  }, [authLoading, fetchOrderDetail, guestToken, id, isAuthenticated, isGuestView])

  const subtotal = useMemo(() => {
    if (!order) return 0
    return Number(order.voucherSnapshot?.originalSubtotal || 0)
      || (order.items || []).reduce((sum, item) => sum + Number(item.unitPrice || 0) * Number(item.quantity || 1), 0)
  }, [order])

  const showToast = (message) => {
    setToast(message)
    setTimeout(() => setToast(''), 2200)
  }

  const canReviewOrder = useMemo(() => {
    if (isGuestView) return false
    return ['Completed', 'Returned', 'Refunded'].includes(String(order?.status || ''))
  }, [isGuestView, order?.status])

  const openReviewModal = (item) => {
    setActiveReviewItem(item)
    setReviewModalOpen(true)
  }

  const closeReviewModal = () => {
    setReviewModalOpen(false)
    setActiveReviewItem(null)
  }

  const handleSubmitReview = async (payload) => {
    try {
      setReviewSubmitting(true)
      if (payload?.reviewId) {
        await updateReviewApi(payload.reviewId, {
          rating: payload.rating,
          comment: payload.comment,
          images: payload.images,
        })
      } else {
        await createReviewApi({
          productId: payload.productId,
          orderId: payload.orderId,
          rating: payload.rating,
          comment: payload.comment,
          images: payload.images,
        })
      }

      showToast('Gửi đánh giá thành công')
      closeReviewModal()
      await fetchOrderDetail()
    } catch (submitError) {
      showToast(submitError?.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại')
    } finally {
      setReviewSubmitting(false)
    }
  }

  if (!isGuestView && !authLoading && !isAuthenticated) {
    return (
      <>
        <Header />
        <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
          <div className="text-center">
            <p className="mb-4 text-slate-600">Vui lòng đăng nhập để xem chi tiết đơn hàng.</p>
            <Link to="/login" className="font-medium text-slate-900 hover:underline">
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
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-900 border-t-transparent"></div>
        </div>
      </>
    )
  }

  if (error || !order) {
    return (
      <>
        <Header />
        <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
          <div className="text-center">
            <p className="mb-4 text-slate-700">{error || 'Không tìm thấy đơn hàng.'}</p>
            <Link to={backPath} className="font-medium text-slate-900 hover:underline">
              {isGuestView ? 'Quay lại trang chủ' : 'Quay lại lịch sử đơn hàng'}
            </Link>
          </div>
        </div>
      </>
    )
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fffdfb_0%,#f8fafc_45%,#f8fafc_100%)]">
      <Header />

      <main className="mx-auto max-w-6xl px-4 py-8 md:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <Link to={backPath} className="text-sm font-medium text-slate-600 hover:text-slate-900">
            {isGuestView ? '← Quay lại trang chủ' : '← Quay lại lịch sử đơn hàng'}
          </Link>
          <span className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ${statusClassMap[order.status] || 'bg-slate-100 text-slate-700 ring-slate-200'}`}>
            {order.statusLabel || order.status}
          </span>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.45fr_0.95fr]">
          <section className="space-y-6">
            <div className="rounded-[28px] border border-white/70 bg-white/95 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
              <div className="mb-5 flex items-center gap-3">
                <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
                  <ReceiptText className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-2xl font-semibold text-slate-950">Chi tiết đơn mua</h1>
                  <p className="text-sm text-slate-500">Mã đơn #{String(order._id).slice(-8).toUpperCase()}</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Ngày tạo</p>
                  <p className="mt-2 text-sm font-medium text-slate-800">{formatDateTime(order.createdAt)}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Thanh toán</p>
                  <p className="mt-2 text-sm font-medium text-slate-800">{getPaymentMethodLabel(order.paymentMethod)}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Voucher</p>
                  <p className="mt-2 text-sm font-medium text-slate-800">{order.voucherCode || 'Không áp dụng'}</p>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/70 bg-white/95 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">Sản phẩm trong đơn</h2>
              <div className="space-y-4">
                {(order.items || []).map((item) => (
                  <Link
                    key={item._id}
                    to={`/products/${item.productId?._id}`}
                    className="block rounded-2xl border border-slate-100 bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:border-slate-200 hover:bg-white hover:shadow-md"
                  >
                    <div className="flex gap-4">
                      <img
                        src={getImageUrl(item.productId?.images)}
                        alt={getProductName(item.productId)}
                        className="h-20 w-20 rounded-2xl object-cover ring-1 ring-slate-200"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{getProductName(item.productId)}</p>
                            <p className="mt-1 text-sm text-slate-500">
                              {item.size || 'FREE SIZE'} / {item.color || 'Mặc định'}
                            </p>
                            {item.note ? <p className="mt-2 text-xs text-slate-500">Ghi chú: {item.note}</p> : null}
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              {item?.review?.isReviewed ? (
                                <>
                                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                                    Đã đánh giá
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.preventDefault()
                                      openReviewModal(item)
                                    }}
                                    className="rounded-full border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
                                  >
                                    Xem đánh giá
                                  </button>
                                </>
                              ) : canReviewOrder ? (
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.preventDefault()
                                    openReviewModal(item)
                                  }}
                                  className="rounded-full border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
                                >
                                  Đánh giá sản phẩm
                                </button>
                              ) : (
                                <span className="text-xs text-slate-500">
                                  Chỉ có thể đánh giá sau khi đơn hàng đã giao thành công
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-slate-900">{formatCurrency(item.unitPrice)}</p>
                            <p className="text-xs text-slate-500">SL {item.quantity || 1}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            <div className="rounded-[28px] border border-white/70 bg-white/95 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">Tiến trình đơn hàng</h2>
              <div className="space-y-3">
                {(order.history || []).map((item, index) => (
                  <div key={`${item.updatedAt || index}-${index}`} className="flex gap-4 rounded-2xl bg-slate-50 p-4">
                    <div className="mt-1 h-2.5 w-2.5 rounded-full bg-slate-900"></div>
                    <div className="flex-1">
                      <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                        <p className="text-sm font-semibold text-slate-900">{item.statusLabel || item.status}</p>
                        <p className="text-xs text-slate-500">{formatDateTime(item.updatedAt)}</p>
                      </div>
                      <p className="mt-1 text-sm text-slate-600">{item.description || 'Cập nhật trạng thái đơn hàng'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <aside className="space-y-6">
            <div className="rounded-[28px] border border-white/70 bg-white/95 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">Tổng thanh toán</h2>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between text-slate-600">
                  <span className="inline-flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Tạm tính
                  </span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                {Number(order.discountAmount || 0) > 0 ? (
                  <div className="flex items-center justify-between text-emerald-700">
                    <span>Giảm giá</span>
                    <span>-{formatCurrency(order.discountAmount)}</span>
                  </div>
                ) : null}
                <div className="border-t border-slate-200 pt-3">
                  <div className="flex items-center justify-between text-base font-semibold text-slate-900">
                    <span className="inline-flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      Tổng cộng
                    </span>
                    <span>{formatCurrency(order.totalAmount)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/70 bg-white/95 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">Thông tin nhận hàng</h2>
              <div className="space-y-4 text-sm text-slate-600">
                <div>
                  <p className="mb-1 inline-flex items-center gap-2 text-slate-900">
                    <UserRound className="h-4 w-4" />
                    Người nhận
                  </p>
                  <p>{order.guestName || order.customerId?.name || '--'}</p>
                  <p>{order.guestEmail || order.customerId?.email || '--'}</p>
                  <p>{order.shippingPhone || order.customerId?.phone || '--'}</p>
                </div>
                <div>
                  <p className="mb-1 inline-flex items-center gap-2 text-slate-900">
                    <MapPin className="h-4 w-4" />
                    Địa chỉ giao hàng
                  </p>
                  <p>{order.shippingAddress || '--'}</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>

      {toast ? (
        <div className="fixed right-4 top-20 z-50 rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      ) : null}

      {!isGuestView ? (
        <ReviewForm
          open={reviewModalOpen}
          onClose={closeReviewModal}
          product={activeReviewItem?.productId}
          orderId={order?._id}
          initialReview={activeReviewItem?.review?.isReviewed ? {
            _id: activeReviewItem.review.reviewId,
            rating: activeReviewItem.review.rating,
            comment: activeReviewItem.review.comment,
            images: activeReviewItem.review.images,
          } : null}
          submitting={reviewSubmitting}
          onSubmit={handleSubmitReview}
        />
      ) : null}
    </div>
  )
}
