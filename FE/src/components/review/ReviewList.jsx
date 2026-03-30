import ReviewItem from './ReviewItem'

export default function ReviewList({
  reviews = [],
  loading = false,
  pagination = null,
  onLoadMore,
}) {
  const total = Number(pagination?.total || 0)
  const page = Number(pagination?.page || 1)
  const pages = Number(pagination?.pages || 1)
  const canLoadMore = page < pages

  if (loading && reviews.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">
        Đang tải đánh giá...
      </div>
    )
  }

  if (!loading && reviews.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
        Chưa có đánh giá nào
      </div>
    )
  }

  return (
    <section className="space-y-3">
      <p className="text-sm text-slate-600">Tất cả ({total})</p>
      {reviews.map((review) => (
        <ReviewItem key={review._id} review={review} />
      ))}

      {canLoadMore ? (
        <button
          type="button"
          onClick={onLoadMore}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Xem thêm
        </button>
      ) : null}
    </section>
  )
}
