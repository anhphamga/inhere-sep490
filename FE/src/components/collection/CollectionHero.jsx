export default function CollectionHero({
  name = '',
  banner = '',
  description = '',
  onRentNow,
  onViewOutfits,
  loading = false,
}) {
  if (loading) {
    return (
      <section className="relative overflow-hidden rounded-3xl border border-amber-100 bg-white shadow-sm">
        <div className="h-[280px] animate-pulse bg-slate-200 md:h-[360px]" />
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden rounded-3xl border border-amber-100 bg-slate-900 shadow-sm">
      {banner ? (
        <img
          src={banner}
          alt={name || 'collection-banner'}
          loading="lazy"
          decoding="async"
          className="h-[280px] w-full object-cover md:h-[360px]"
        />
      ) : (
        <div className="h-[280px] w-full bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-300 md:h-[360px]" />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-900/55 to-slate-900/20" />

      <div className="absolute inset-x-0 bottom-0 p-5 md:p-8">
        <p className="inline-flex rounded-full border border-white/30 bg-white/20 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-white">
          INHERE COLLECTION
        </p>
        <h1 className="mt-3 text-3xl font-bold leading-tight text-white md:text-4xl">{name || 'Bộ sưu tập'}</h1>
        <p className="mt-2 max-w-3xl text-sm text-white/80 md:text-base">{description}</p>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onRentNow}
            className="rounded-xl bg-amber-500 px-5 py-3 text-sm font-semibold text-white transition duration-300 hover:bg-amber-600"
          >
            Thuê ngay
          </button>
          <button
            type="button"
            onClick={onViewOutfits}
            className="rounded-xl border border-white/45 bg-white/15 px-5 py-3 text-sm font-semibold text-white transition duration-300 hover:bg-white/25"
          >
            Xem outfit
          </button>
        </div>
      </div>
    </section>
  );
}
