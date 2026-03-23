import { useCallback, useEffect, useMemo, useState } from 'react'
import { Eye, MessageSquare, ShieldX, CheckCircle2, Ban, Trash2, RefreshCw } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import {
  deleteAdminReplyReviewApi,
  getAdminReviewDetailApi,
  getAdminReviewsApi,
  getAdminReviewStatsSummaryApi,
  patchAdminHideReviewApi,
  patchAdminReplyReviewApi,
  patchAdminReviewStatusApi,
} from '../../services/review.service'
import StarRating from './StarRating'

const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'pending', label: 'Chờ duyệt' },
  { value: 'approved', label: 'Đã duyệt' },
  { value: 'hidden', label: 'Bị ẩn' },
  { value: 'rejected', label: 'Từ chối' },
]

const RATING_OPTIONS = [
  { value: '', label: 'Tất cả số sao' },
  { value: '5', label: '5 sao' },
  { value: '4', label: '4 sao' },
  { value: '3', label: '3 sao' },
  { value: '2', label: '2 sao' },
  { value: '1', label: '1 sao' },
]

const REPLY_OPTIONS = [
  { value: '', label: 'Tất cả phản hồi' },
  { value: 'true', label: 'Có phản hồi' },
  { value: 'false', label: 'Chưa phản hồi' },
]

const STATUS_LABEL = {
  pending: 'Chờ duyệt',
  approved: 'Đã duyệt',
  hidden: 'Bị ẩn',
  rejected: 'Từ chối',
}

const STATUS_CLASS = {
  pending: 'bg-amber-50 text-amber-700',
  approved: 'bg-emerald-50 text-emerald-700',
  hidden: 'bg-slate-100 text-slate-700',
  rejected: 'bg-rose-50 text-rose-700',
}

const toDateTime = (value) => {
  if (!value) return '--'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '--'
  return date.toLocaleString('vi-VN')
}

const getName = (value) => {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object') return value.vi || value.en || 'Sản phẩm'
  return 'Sản phẩm'
}

const isOwnerRole = (role) => String(role || '').trim().toLowerCase() === 'owner'

export default function ReviewManagementPanel({ title = 'Quản lí đánh giá' }) {
  const { user } = useAuth()
  const role = String(user?.role || '').trim().toLowerCase()
  const isOwner = isOwnerRole(role)

  const [rows, setRows] = useState([])
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, limit: 10 })
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [rating, setRating] = useState('')
  const [hasReply, setHasReply] = useState('')
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState('desc')
  const [page, setPage] = useState(1)

  const [detailOpen, setDetailOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detail, setDetail] = useState(null)

  const [reasonModal, setReasonModal] = useState({ open: false, reviewId: '', mode: 'approved', reason: '' })
  const [replyModal, setReplyModal] = useState({ open: false, reviewId: '', content: '' })
  const [submitting, setSubmitting] = useState(false)

  const showToast = (message) => {
    setToast(message)
    setTimeout(() => setToast(''), 2200)
  }

  const loadStats = useCallback(async () => {
    try {
      const response = await getAdminReviewStatsSummaryApi()
      setStats(response?.data || null)
    } catch {
      // Không chặn luồng chính khi thống kê lỗi
    }
  }, [])

  const loadRows = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const response = await getAdminReviewsApi({
        page,
        limit: 10,
        search: search.trim(),
        status,
        rating,
        hasReply,
        sortBy,
        sortOrder,
      })
      setRows(Array.isArray(response?.data) ? response.data : [])
      setPagination(response?.pagination || { page: 1, pages: 1, total: 0, limit: 10 })
    } catch (apiError) {
      setError(apiError?.response?.data?.message || 'Không thể tải danh sách đánh giá')
    } finally {
      setLoading(false)
    }
  }, [hasReply, page, rating, search, sortBy, sortOrder, status])

  useEffect(() => {
    loadRows()
  }, [loadRows])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  const openDetail = async (reviewId) => {
    try {
      setDetailOpen(true)
      setDetailLoading(true)
      const response = await getAdminReviewDetailApi(reviewId)
      setDetail(response?.data || null)
    } catch (apiError) {
      showToast(apiError?.response?.data?.message || 'Không thể lấy chi tiết đánh giá')
      setDetailOpen(false)
    } finally {
      setDetailLoading(false)
    }
  }

  const refreshAll = async () => {
    await Promise.all([loadRows(), loadStats()])
  }

  const submitStatus = async () => {
    try {
      setSubmitting(true)
      if (!reasonModal.reviewId) return
      const mode = reasonModal.mode

      if (mode === 'hidden') {
        await patchAdminHideReviewApi(reasonModal.reviewId, { reason: reasonModal.reason })
        showToast('Ẩn đánh giá thành công')
      } else {
        await patchAdminReviewStatusApi(reasonModal.reviewId, {
          status: mode,
          reason: reasonModal.reason,
        })
        showToast('Cập nhật trạng thái thành công')
      }

      setReasonModal({ open: false, reviewId: '', mode: 'approved', reason: '' })
      await refreshAll()
      if (detail?._id === reasonModal.reviewId) {
        const response = await getAdminReviewDetailApi(reasonModal.reviewId)
        setDetail(response?.data || null)
      }
    } catch (apiError) {
      showToast(apiError?.response?.data?.message || 'Không thể cập nhật trạng thái')
    } finally {
      setSubmitting(false)
    }
  }

  const submitReply = async () => {
    try {
      setSubmitting(true)
      if (!replyModal.reviewId) return
      if (!String(replyModal.content || '').trim()) {
        showToast('Nội dung phản hồi không được để trống')
        return
      }

      await patchAdminReplyReviewApi(replyModal.reviewId, { content: replyModal.content })
      showToast('Gửi phản hồi thành công')
      setReplyModal({ open: false, reviewId: '', content: '' })
      await refreshAll()
      if (detail?._id === replyModal.reviewId) {
        const response = await getAdminReviewDetailApi(replyModal.reviewId)
        setDetail(response?.data || null)
      }
    } catch (apiError) {
      showToast(apiError?.response?.data?.message || 'Không thể gửi phản hồi')
    } finally {
      setSubmitting(false)
    }
  }

  const removeReply = async (reviewId) => {
    try {
      setSubmitting(true)
      await deleteAdminReplyReviewApi(reviewId)
      showToast('Xóa phản hồi thành công')
      await refreshAll()
      if (detail?._id === reviewId) {
        const response = await getAdminReviewDetailApi(reviewId)
        setDetail(response?.data || null)
      }
    } catch (apiError) {
      showToast(apiError?.response?.data?.message || 'Không thể xóa phản hồi')
    } finally {
      setSubmitting(false)
    }
  }

  const statCards = useMemo(() => ([
    { label: 'Tổng đánh giá', value: Number(stats?.totalReviews || 0), tone: 'text-slate-900' },
    { label: 'Chờ duyệt', value: Number(stats?.pendingReviews || 0), tone: 'text-amber-600' },
    { label: 'Đã duyệt', value: Number(stats?.approvedReviews || 0), tone: 'text-emerald-600' },
    { label: 'Bị ẩn / Từ chối', value: Number((stats?.hiddenReviews || 0) + (stats?.rejectedReviews || 0)), tone: 'text-rose-600' },
    { label: 'Điểm trung bình', value: Number(stats?.averageRating || 0).toFixed(2), tone: 'text-indigo-600' },
  ]), [stats])

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">Quản trị, duyệt và phản hồi đánh giá sản phẩm của khách hàng.</p>
        </div>
        <button
          type="button"
          onClick={refreshAll}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw className="h-4 w-4" />
          Làm mới
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-5">
        {statCards.map((item) => (
          <div key={item.label} className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{item.label}</p>
            <p className={`mt-2 text-2xl font-bold ${item.tone}`}>{item.value}</p>
          </div>
        ))}
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-6">
          <input
            type="text"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
            placeholder="Tìm kiếm đánh giá"
            className="md:col-span-2 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300"
          />
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
            {STATUS_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
          <select value={rating} onChange={(e) => { setRating(e.target.value); setPage(1) }} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
            {RATING_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
          <select value={hasReply} onChange={(e) => { setHasReply(e.target.value); setPage(1) }} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
            {REPLY_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
          <select value={`${sortBy}:${sortOrder}`} onChange={(e) => {
            const [nextSortBy, nextSortOrder] = String(e.target.value || 'createdAt:desc').split(':')
            setSortBy(nextSortBy || 'createdAt')
            setSortOrder(nextSortOrder || 'desc')
            setPage(1)
          }} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
            <option value="createdAt:desc">Mới nhất</option>
            <option value="createdAt:asc">Cũ nhất</option>
            <option value="rating:desc">Sao cao đến thấp</option>
            <option value="rating:asc">Sao thấp đến cao</option>
          </select>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {error ? <div className="border-b border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</div> : null}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-left text-sm">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200">
                <th className="px-4 py-3 font-semibold text-slate-600">Sản phẩm</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Khách hàng</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Số sao</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Nội dung</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Trạng thái</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Ngày tạo</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Phản hồi</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="px-4 py-8 text-slate-500" colSpan={8}>Đang tải dữ liệu...</td></tr>
              ) : null}
              {!loading && rows.length === 0 ? (
                <tr><td className="px-4 py-8 text-slate-500" colSpan={8}>Không có đánh giá nào</td></tr>
              ) : null}
              {!loading && rows.map((row) => (
                <tr key={row._id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/60">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <img src={row?.product?.images?.[0] || 'https://placehold.co/80x80/f8fafc/64748b?text=INHERE'} alt="Sản phẩm" className="h-10 w-10 rounded-lg object-cover ring-1 ring-slate-200" />
                      <div className="max-w-[180px] truncate font-medium text-slate-900">{getName(row?.product?.name)}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">{row?.user?.name || 'Khách hàng'}</p>
                    <p className="text-xs text-slate-500">{row?.user?.email || '--'}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="inline-flex items-center gap-2">
                      <StarRating value={Number(row?.rating || 0)} disabled />
                    </div>
                  </td>
                  <td className="px-4 py-3 max-w-[240px]">
                    <p className="line-clamp-2 text-slate-700">{row?.comment || 'Không có nội dung'}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_CLASS[row?.status] || 'bg-slate-100 text-slate-700'}`}>
                      {STATUS_LABEL[row?.status] || row?.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{toDateTime(row?.createdAt)}</td>
                  <td className="px-4 py-3">
                    {row?.sellerReply?.content ? (
                      <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">Có phản hồi</span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">Chưa phản hồi</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      <button type="button" onClick={() => openDetail(row._id)} className="rounded-md border border-slate-200 p-1.5 text-slate-700 hover:bg-slate-100" title="Xem chi tiết">
                        <Eye className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => setReasonModal({ open: true, reviewId: row._id, mode: 'approved', reason: '' })} className="rounded-md border border-emerald-200 p-1.5 text-emerald-700 hover:bg-emerald-50" title="Duyệt">
                        <CheckCircle2 className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => setReasonModal({ open: true, reviewId: row._id, mode: 'hidden', reason: '' })} className="rounded-md border border-slate-200 p-1.5 text-slate-700 hover:bg-slate-100" title="Ẩn đánh giá">
                        <ShieldX className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => setReasonModal({ open: true, reviewId: row._id, mode: 'rejected', reason: '' })} className="rounded-md border border-rose-200 p-1.5 text-rose-700 hover:bg-rose-50" title="Từ chối">
                        <Ban className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => setReplyModal({ open: true, reviewId: row._id, content: row?.sellerReply?.content || '' })} className="rounded-md border border-indigo-200 p-1.5 text-indigo-700 hover:bg-indigo-50" title="Phản hồi">
                        <MessageSquare className="h-4 w-4" />
                      </button>
                      {isOwner && row?.sellerReply?.content ? (
                        <button type="button" disabled={submitting} onClick={() => removeReply(row._id)} className="rounded-md border border-rose-200 p-1.5 text-rose-700 hover:bg-rose-50" title="Xóa phản hồi">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm">
          <span className="text-slate-600">Tổng {pagination.total || 0} đánh giá</span>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setPage((prev) => Math.max(prev - 1, 1))} disabled={Number(pagination.page || 1) <= 1} className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-700 disabled:cursor-not-allowed disabled:opacity-50">
              Trước
            </button>
            <span className="text-slate-600">Trang {pagination.page || 1}/{pagination.pages || 1}</span>
            <button type="button" onClick={() => setPage((prev) => Math.min(prev + 1, Number(pagination.pages || 1)))} disabled={Number(pagination.page || 1) >= Number(pagination.pages || 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-700 disabled:cursor-not-allowed disabled:opacity-50">
              Sau
            </button>
          </div>
        </div>
      </section>

      {detailOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-6">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-slate-900">Chi tiết đánh giá</h3>
              <button type="button" onClick={() => setDetailOpen(false)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">Đóng</button>
            </div>

            {detailLoading ? (
              <p className="text-sm text-slate-500">Đang tải chi tiết...</p>
            ) : detail ? (
              <div className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Sản phẩm</p>
                    <p className="mt-1 font-medium text-slate-900">{getName(detail?.product?.name)}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Khách hàng</p>
                    <p className="mt-1 font-medium text-slate-900">{detail?.user?.name || 'Khách hàng'}</p>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between">
                    <StarRating value={Number(detail?.rating || 0)} disabled />
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_CLASS[detail?.status] || 'bg-slate-100 text-slate-700'}`}>
                      {STATUS_LABEL[detail?.status] || detail?.status}
                    </span>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{detail?.comment || 'Không có nội dung'}</p>
                  {Array.isArray(detail?.images) && detail.images.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {detail.images.map((image, index) => (
                        <img key={`${image}-${index}`} src={image} alt="Ảnh đánh giá" className="h-16 w-16 rounded-lg object-cover ring-1 ring-slate-200" />
                      ))}
                    </div>
                  ) : null}
                </div>

                {detail?.sellerReply?.content ? (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">Phản hồi cửa hàng</p>
                    <p className="mt-1 text-sm text-emerald-900">{detail.sellerReply.content}</p>
                    <p className="mt-2 text-xs text-emerald-700">
                      Người phản hồi: {detail?.sellerReply?.repliedBy?.name || 'Cửa hàng'} • {toDateTime(detail?.sellerReply?.repliedAt)}
                    </p>
                  </div>
                ) : null}

                {(detail?.moderationReason || detail?.moderatedBy || detail?.moderatedAt) ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">Thông tin xử lý</p>
                    <p className="mt-2 text-sm text-slate-700">Lý do: {detail?.moderationReason || 'Không có'}</p>
                    <p className="text-sm text-slate-700">Người xử lý: {detail?.moderatedBy?.name || 'Chưa có'}</p>
                    <p className="text-sm text-slate-700">Thời gian xử lý: {toDateTime(detail?.moderatedAt)}</p>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-slate-500">Không có dữ liệu</p>
            )}
          </div>
        </div>
      ) : null}

      {reasonModal.open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-6">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-900">
              {reasonModal.mode === 'hidden' ? 'Ẩn đánh giá' : reasonModal.mode === 'rejected' ? 'Từ chối đánh giá' : 'Duyệt đánh giá'}
            </h3>
            <p className="mt-1 text-sm text-slate-500">Nhập lý do xử lý (không bắt buộc với duyệt).</p>
            <textarea
              rows={4}
              value={reasonModal.reason}
              onChange={(event) => setReasonModal((prev) => ({ ...prev, reason: event.target.value }))}
              className="mt-3 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300"
              placeholder="Nhập lý do xử lý..."
            />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setReasonModal({ open: false, reviewId: '', mode: 'approved', reason: '' })} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                Hủy
              </button>
              <button type="button" disabled={submitting} onClick={submitStatus} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60">
                {submitting ? 'Đang xử lý...' : 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {replyModal.open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-6">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-900">Phản hồi đánh giá</h3>
            <p className="mt-1 text-sm text-slate-500">Nội dung phản hồi sẽ hiển thị dưới đánh giá ở trang sản phẩm.</p>
            <textarea
              rows={5}
              value={replyModal.content}
              onChange={(event) => setReplyModal((prev) => ({ ...prev, content: event.target.value }))}
              className="mt-3 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300"
              placeholder="Nhập phản hồi của cửa hàng..."
            />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setReplyModal({ open: false, reviewId: '', content: '' })} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                Hủy
              </button>
              <button type="button" disabled={submitting} onClick={submitReply} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60">
                {submitting ? 'Đang gửi...' : 'Gửi phản hồi'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className="fixed right-4 top-20 z-50 rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      ) : null}
    </div>
  )
}
