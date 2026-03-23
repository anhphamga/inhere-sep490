import StarRating from './StarRating'

const formatDateTime = (value) => {
  if (!value) return '--'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '--'
  return date.toLocaleDateString('vi-VN')
}

export default function ReviewItem({ review }) {
  const userName = review?.user?.name || 'Khách hàng'
  const images = Array.isArray(review?.images) ? review.images : []
  const sellerReply = review?.sellerReply || null

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">{userName}</p>
          <p className="text-xs text-slate-500">{formatDateTime(review?.createdAt)}</p>
        </div>
        <StarRating value={Number(review?.rating || 0)} disabled />
      </div>

      <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{review?.comment || 'Không có nội dung đánh giá'}</p>

      {images.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {images.map((image, index) => (
            <img
              key={`${image}-${index}`}
              src={image}
              alt="Ảnh đánh giá"
              className="h-16 w-16 rounded-xl object-cover ring-1 ring-slate-200"
            />
          ))}
        </div>
      ) : null}

      {sellerReply?.content ? (
        <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Phản hồi từ cửa hàng</p>
          <p className="mt-1 text-sm text-emerald-900">{sellerReply.content}</p>
        </div>
      ) : null}
    </article>
  )
}
