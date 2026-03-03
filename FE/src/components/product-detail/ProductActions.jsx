function Spinner() {
  return <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />;
}

export default function ProductActions({
  rentPriceText,
  salePriceText,
  onRent,
  onBuy,
  loadingAction,
  canSubmit,
}) {
  const renting = loadingAction === "rent";
  const buying = loadingAction === "buy";

  return (
    <>
      <div className="hidden rounded-2xl border border-neutral-200 bg-white p-4 md:block">
        <p className="text-sm text-neutral-500">Chon mau/size truoc khi dat</p>
        <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Gia thue</p>
            <p className="text-2xl font-bold text-amber-700">{rentPriceText}</p>
            <p className="mt-1 truncate text-sm text-neutral-500">Gia ban: {salePriceText}</p>
          </div>
          <div className="grid w-full grid-cols-2 gap-2 lg:min-w-[260px]">
            <button
              type="button"
              onClick={onRent}
              disabled={!canSubmit || renting || buying}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-amber-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-amber-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {renting && <Spinner />}
              Thue ngay
            </button>
            <button
              type="button"
              onClick={onBuy}
              disabled={!canSubmit || renting || buying}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-neutral-300 bg-white px-5 py-2 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {buying && <Spinner />}
              Mua
            </button>
          </div>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200 bg-white/95 p-3 backdrop-blur md:hidden">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-neutral-500">Gia thue</p>
            <p className="truncate text-lg font-bold text-amber-700">{rentPriceText}</p>
          </div>
          <button
            type="button"
            onClick={onRent}
            disabled={!canSubmit || renting || buying}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {renting && <Spinner />}
            Thue ngay
          </button>
        </div>
      </div>
    </>
  );
}
