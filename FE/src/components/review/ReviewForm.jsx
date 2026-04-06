import { useEffect, useMemo, useState } from 'react'
import StarRating from './StarRating'
import { UI_IMAGE_FALLBACKS } from '../../constants/ui'

const getProductName = (product) => {
  if (typeof product?.name === 'string') return product.name
  if (product?.name && typeof product.name === 'object') {
    return product.name.vi || product.name.en || 'Sản phẩm'
  }
  return 'Sản phẩm'
}

const getProductImage = (product) => {
  if (Array.isArray(product?.images) && product.images[0]) return product.images[0]
  return UI_IMAGE_FALLBACKS.reviewImage
}

const splitImageText = (value) =>
  String(value || '')
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)

export default function ReviewForm({
  open = false,
  onClose,
  product,
  orderId,
  initialReview = null,
  submitting = false,
  onSubmit,
}) {
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [imagesText, setImagesText] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    const defaultRating = Number(initialReview?.rating || 0)
    const defaultComment = String(initialReview?.comment || '')
    const defaultImages = Array.isArray(initialReview?.images) ? initialReview.images.join('\n') : ''

    setRating(defaultRating)
    setComment(defaultComment)
    setImagesText(defaultImages)
    setError('')
  }, [initialReview, open])

  const imagePreviewList = useMemo(() => splitImageText(imagesText), [imagesText])

  if (!open) return null

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    if (!rating) {
      setError('Bạn cần chọn số sao trước khi gửi')
      return
    }

    if (!String(comment || '').trim()) {
      setError('Vui lòng nhập nội dung đánh giá')
      return
    }

    if (String(comment || '').trim().length > 1000) {
      setError('Nội dung đánh giá không được vượt quá 1000 ký tự')
      return
    }

    await onSubmit?.({
      reviewId: initialReview?._id || null,
      orderId,
      productId: product?._id,
      rating,
      comment: comment.trim(),
      images: imagePreviewList,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-6">
      <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-start gap-4">
          <img
            src={getProductImage(product)}
            alt={getProductName(product)}
            className="h-16 w-16 rounded-2xl object-cover ring-1 ring-slate-200"
          />
          <div>
            <h3 className="text-xl font-semibold text-slate-900">Đánh giá sản phẩm</h3>
            <p className="mt-1 text-sm text-slate-600">{getProductName(product)}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Chọn số sao</label>
            <StarRating value={rating} onChange={setRating} size={24} disabled={submitting} />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Nhập cảm nhận của bạn về sản phẩm</label>
            <textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              rows={5}
              placeholder="Ví dụ: Chất liệu đẹp, đúng mô tả, giao hàng nhanh..."
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
              disabled={submitting}
            />
            <p className="mt-1 text-xs text-slate-500">{comment.length}/1000 ký tự</p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Ảnh đánh giá (mỗi dòng một URL, không bắt buộc)</label>
            <textarea
              value={imagesText}
              onChange={(event) => setImagesText(event.target.value)}
              rows={3}
              placeholder="https://.../anh-1.jpg"
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
              disabled={submitting}
            />
          </div>

          {imagePreviewList.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {imagePreviewList.slice(0, 6).map((image, index) => (
                <img key={`${image}-${index}`} src={image} alt="Ảnh xem trước" className="h-14 w-14 rounded-xl object-cover ring-1 ring-slate-200" />
              ))}
            </div>
          ) : null}

          {error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>
          ) : null}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              disabled={submitting}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-500"
              disabled={submitting}
            >
              {submitting ? 'Đang gửi...' : 'Gửi đánh giá'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
