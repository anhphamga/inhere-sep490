import { useState } from "react";
import VirtualTryOnModal from "./VirtualTryOnModal";

function Spinner() {
  return <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />;
}

export default function ProductActions({
  rentPriceText,
  onRent,
  onBuy,
  loadingAction,
  canSubmit,
  canBuy,
  productImage,
}) {
  const [showTryOn, setShowTryOn] = useState(false);
  const renting = loadingAction === "rent";
  const buying = loadingAction === "buy";

  return (
    <>
      {/* Desktop */}
      <div className="hidden space-y-3 md:block">
        {/* Primary + Secondary CTA */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onBuy}
            disabled={!canBuy || renting || buying}
            className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {buying && <Spinner />}
            Mua
          </button>
          <button
            type="button"
            onClick={onRent}
            disabled={!canSubmit || renting || buying}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {renting && <Spinner />}
            Thuê ngay
          </button>
        </div>

        {/* Tertiary actions */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBuy}
            disabled={!canBuy || renting || buying}
            className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Thêm vào giỏ
          </button>
          <button
            type="button"
            onClick={() => setShowTryOn(true)}
            className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
          >
            Thử đồ ảo
          </button>
        </div>

        {/* Trust signals */}
        <div className="flex items-center gap-4 pt-1 text-xs text-slate-400">
          <span>✓ Miễn phí vận chuyển & đổi trả</span>
          <span>✓ Bao gồm giặt hấp</span>
        </div>
      </div>

      {/* Mobile sticky bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur md:hidden">
        <div className="mx-auto flex w-full max-w-lg items-center gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] text-slate-400">Giá thuê</p>
            <p className="truncate text-base font-bold text-slate-900">{rentPriceText}</p>
          </div>
          <button
            type="button"
            onClick={onBuy}
            disabled={!canBuy || renting || buying}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {buying && <Spinner />}
            Mua
          </button>
          <button
            type="button"
            onClick={onRent}
            disabled={!canSubmit || renting || buying}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {renting && <Spinner />}
            Thuê ngay
          </button>
        </div>
      </div>

      {/* Virtual Try-On Modal */}
      <VirtualTryOnModal
        isOpen={showTryOn}
        onClose={() => setShowTryOn(false)}
        outfitImageUrl={productImage}
      />
    </>
  );
}
