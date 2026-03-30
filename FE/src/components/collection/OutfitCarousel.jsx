const formatVnd = (value) => `${Number(value || 0).toLocaleString('vi-VN')}đ`;

export default function OutfitCarousel({ outfits = [], onRentSet, loading = false }) {
  if (loading) {
    return (
      <section className="space-y-3">
        <div className="h-6 w-48 animate-pulse rounded bg-slate-200" />
        <div className="flex gap-4 overflow-x-auto pb-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={`outfit-skeleton-${index}`} className="min-w-[260px] flex-1 rounded-2xl border border-slate-200 bg-white p-3">
              <div className="aspect-[4/3] animate-pulse rounded-xl bg-slate-200" />
              <div className="mt-3 h-4 w-2/3 animate-pulse rounded bg-slate-200" />
              <div className="mt-2 h-5 w-1/2 animate-pulse rounded bg-slate-200" />
              <div className="mt-3 h-10 w-full animate-pulse rounded-xl bg-slate-200" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (!outfits.length) return null;

  return (
    <section className="space-y-3" id="collection-outfits">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">Outfit gợi ý</h2>
        <p className="text-xs font-medium text-slate-500">Kéo ngang để xem thêm</p>
      </div>

      <div className="flex snap-x gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {outfits.map((outfit) => (
          <article
            key={outfit.id || outfit._id || outfit.name}
            className="group min-w-[260px] snap-start flex-1 rounded-2xl border border-amber-100 bg-white p-3 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg"
          >
            <div className="aspect-[4/3] overflow-hidden rounded-xl bg-amber-50">
              {outfit.image ? (
                <img
                  src={outfit.image}
                  alt={outfit.name || 'outfit'}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-slate-500">Không có ảnh</div>
              )}
            </div>
            <div className="mt-3 space-y-2">
              <h3 className="line-clamp-1 text-sm font-semibold text-slate-800">{outfit.name || 'Outfit'}</h3>
              <p className="text-lg font-extrabold text-amber-600">{formatVnd(outfit.totalPrice)}</p>
              <button
                type="button"
                onClick={() => onRentSet?.(outfit)}
                className="w-full rounded-xl bg-slate-900 px-3 py-2.5 text-sm font-semibold text-white transition duration-300 hover:bg-slate-800"
              >
                Thuê set này
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
