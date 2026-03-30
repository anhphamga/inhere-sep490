import StarRating from './StarRating'

const STAR_ROWS = [5, 4, 3, 2, 1]

export default function ReviewSummary({ summary }) {
  const averageRating = Number(summary?.averageRating || 0)
  const reviewCount = Number(summary?.reviewCount || 0)
  const breakdown = summary?.breakdown || {}

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5">
      <h3 className="text-lg font-semibold text-slate-900">Điểm đánh giá trung bình</h3>
      <div className="mt-3 flex flex-col gap-5 lg:flex-row">
        <div className="min-w-[210px] rounded-2xl bg-slate-50 p-4 text-center">
          <p className="text-4xl font-bold text-slate-900">{averageRating.toFixed(1)}</p>
          <div className="mt-2 flex justify-center">
            <StarRating value={Math.round(averageRating)} disabled />
          </div>
          <p className="mt-2 text-sm text-slate-600">{reviewCount} đánh giá</p>
        </div>

        <div className="flex-1 space-y-2">
          {STAR_ROWS.map((star) => {
            const count = Number(breakdown?.[star] || 0)
            const width = reviewCount > 0 ? `${Math.round((count / reviewCount) * 100)}%` : '0%'

            return (
              <div key={star} className="flex items-center gap-3">
                <span className="min-w-[48px] text-sm font-medium text-slate-700">{star} sao</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-amber-400" style={{ width }} />
                </div>
                <span className="min-w-[36px] text-right text-sm text-slate-500">{count}</span>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
