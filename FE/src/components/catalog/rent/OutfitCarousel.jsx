import { formatVND } from '../../../pages/public/catalogHelpers';

export default function OutfitCarousel({ outfits = [], onSelectOutfit }) {
  if (outfits.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">Gợi ý outfit trọn set</h2>
        <p className="text-xs font-medium text-slate-500">Kéo ngang để xem thêm</p>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2">
        {outfits.map((outfit) => (
          <article
            key={outfit.id}
            className="min-w-[260px] flex-1 rounded-2xl border border-amber-100 bg-white p-3 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
          >
            <div className="aspect-[4/3] overflow-hidden rounded-xl bg-amber-50">
              {outfit.imageUrl ? (
                <img src={outfit.imageUrl} alt={outfit.name} loading="lazy" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-slate-500">Không có ảnh</div>
              )}
            </div>
            <div className="mt-3 space-y-2">
              <h3 className="line-clamp-1 text-sm font-semibold text-slate-800">{outfit.name}</h3>
              <p className="text-lg font-bold text-amber-600">{formatVND(outfit.totalPrice)}</p>
              <button
                type="button"
                onClick={() => onSelectOutfit?.(outfit)}
                className="w-full rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
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
