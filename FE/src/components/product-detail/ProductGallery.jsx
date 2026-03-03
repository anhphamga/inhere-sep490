import { useMemo } from "react";

export default function ProductGallery({
  images = [],
  activeIndex = 0,
  onSelectImage,
  loading = false,
  productName = "Product image",
}) {
  const safeImages = useMemo(() => (Array.isArray(images) ? images.filter(Boolean) : []), [images]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-[92px_1fr]">
          <div className="hidden gap-2 md:grid">
            {Array.from({ length: 5 }).map((_, idx) => (
              <div key={idx} className="h-20 w-full animate-pulse rounded-xl bg-neutral-200" />
            ))}
          </div>
          <div className="h-[420px] animate-pulse rounded-2xl bg-neutral-200 sm:h-[520px]" />
        </div>
      </div>
    );
  }

  const mainImage = safeImages[activeIndex] || safeImages[0] || "";

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="grid gap-3 md:grid-cols-[92px_1fr]">
        <div className="hidden max-h-[520px] gap-2 overflow-auto pr-1 md:grid">
          {safeImages.map((img, idx) => (
            <button
              key={`${img.slice(0, 24)}-${idx}`}
              type="button"
              onClick={() => onSelectImage?.(idx)}
              className={`overflow-hidden rounded-xl border-2 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                idx === activeIndex ? "border-amber-500" : "border-transparent"
              }`}
              aria-label={`View image ${idx + 1}`}
            >
              <img src={img} alt={`${productName}-${idx + 1}`} className="h-20 w-full object-cover" />
            </button>
          ))}
        </div>

        <div className="group relative overflow-hidden rounded-2xl bg-neutral-100">
          {mainImage ? (
            <img
              key={mainImage}
              src={mainImage}
              alt={productName}
              className="h-[420px] w-full scale-100 object-cover opacity-100 transition-all duration-300 ease-out md:h-[520px] md:group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-[420px] items-center justify-center text-sm text-neutral-500 md:h-[520px]">
              No image
            </div>
          )}
        </div>
      </div>

      {safeImages.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-auto pb-1 md:hidden">
          {safeImages.map((img, idx) => (
            <button
              key={`${img.slice(0, 24)}-${idx}`}
              type="button"
              onClick={() => onSelectImage?.(idx)}
              className={`h-16 min-w-16 overflow-hidden rounded-lg border-2 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                idx === activeIndex ? "border-amber-500" : "border-transparent"
              }`}
              aria-label={`View image ${idx + 1}`}
            >
              <img src={img} alt={`${productName}-thumb-${idx + 1}`} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
