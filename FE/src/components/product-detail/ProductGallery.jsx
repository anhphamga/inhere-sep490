import { useMemo, useState } from "react";

function GalleryImage({ src, alt, className, fallbackClassName = "" }) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div
        className={`flex items-center justify-center bg-neutral-100 px-3 text-center text-xs font-medium text-neutral-500 ${fallbackClassName}`}
      >
        Khong co anh
      </div>
    );
  }

  return <img src={src} alt={alt} className={className} onError={() => setHasError(true)} />;
}

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
      <div className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm lg:p-5">
        <div className="grid gap-3 md:grid-cols-[104px_1fr] lg:gap-4">
          <div className="hidden gap-2 md:grid">
            {Array.from({ length: 5 }).map((_, idx) => (
              <div key={idx} className="h-24 w-full animate-pulse rounded-2xl bg-neutral-200" />
            ))}
          </div>
          <div className="h-[420px] animate-pulse rounded-3xl bg-neutral-200 sm:h-[560px] xl:h-[640px]" />
        </div>
      </div>
    );
  }

  const mainImage = safeImages[activeIndex] || safeImages[0] || "";

  return (
    <div className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm lg:p-5">
      <div className="grid gap-3 md:grid-cols-[104px_1fr] lg:gap-4">
        <div className="hidden max-h-[640px] gap-3 overflow-auto pr-1 md:grid">
          {safeImages.map((img, idx) => (
            <button
              key={`${img.slice(0, 24)}-${idx}`}
              type="button"
              onClick={() => onSelectImage?.(idx)}
              className={`h-24 w-full overflow-hidden rounded-2xl border transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                idx === activeIndex ? "border-amber-500 shadow-[0_0_0_3px_rgba(245,158,11,0.12)]" : "border-neutral-200"
              }`}
              aria-label={`View image ${idx + 1}`}
            >
              <GalleryImage
                src={img}
                alt={`${productName}-${idx + 1}`}
                className="h-full w-full object-cover"
                fallbackClassName="h-full w-full"
              />
            </button>
          ))}
        </div>

        <div className="group relative overflow-hidden rounded-3xl bg-neutral-100">
          {mainImage ? (
            <GalleryImage
              key={mainImage}
              src={mainImage}
              alt={productName}
              className="h-[420px] w-full scale-100 object-cover opacity-100 transition-all duration-500 ease-out sm:h-[520px] xl:h-[640px] md:group-hover:scale-[1.02]"
              fallbackClassName="h-[420px] w-full sm:h-[520px] xl:h-[640px]"
            />
          ) : (
            <div className="flex h-[420px] items-center justify-center text-sm text-neutral-500 sm:h-[520px] xl:h-[640px]">
              No image
            </div>
          )}
        </div>
      </div>

      {safeImages.length > 1 && (
        <div className="mt-4 flex gap-2 overflow-auto pb-1 md:hidden">
          {safeImages.map((img, idx) => (
            <button
              key={`${img.slice(0, 24)}-${idx}`}
              type="button"
              onClick={() => onSelectImage?.(idx)}
              className={`h-20 min-w-20 overflow-hidden rounded-2xl border transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                idx === activeIndex ? "border-amber-500" : "border-neutral-200"
              }`}
              aria-label={`View image ${idx + 1}`}
            >
              <GalleryImage
                src={img}
                alt={`${productName}-thumb-${idx + 1}`}
                className="h-full w-full object-cover"
                fallbackClassName="h-full w-full"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
