import { useMemo, useState } from "react";
import { Heart, Loader2 } from "lucide-react";

function GalleryImage({ src, alt, className, fallbackClassName = "" }) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div
        className={`flex items-center justify-center bg-neutral-50 text-center text-xs text-neutral-400 ${fallbackClassName}`}
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
  isFavorite = false,
  favoriteLoading = false,
  onToggleFavorite,
}) {
  const safeImages = useMemo(() => (Array.isArray(images) ? images.filter(Boolean) : []), [images]);

  if (loading) {
    return (
      <div className="grid grid-cols-[100px_1fr] gap-4">
        <div className="hidden gap-3 md:grid">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="aspect-square w-full animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
        <div className="aspect-[3/4] w-full animate-pulse rounded-lg bg-slate-100" />
      </div>
    );
  }

  const mainImage = safeImages[activeIndex] || safeImages[0] || "";
  const imageCountText = `${Math.min(activeIndex + 1, Math.max(safeImages.length, 1))}/${Math.max(safeImages.length, 1)}`;

  return (
    <div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[100px_1fr]">
        {/* Thumbnails — desktop */}
        <div className="hidden content-start gap-2 self-start overflow-auto md:grid" style={{ maxHeight: "calc(75vw * 4 / 3)" }}>
          {safeImages.map((img, idx) => (
            <button
              key={`${img.slice(0, 24)}-${idx}`}
              type="button"
              onClick={() => onSelectImage?.(idx)}
              className={`aspect-square w-full overflow-hidden rounded-lg border-2 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 ${idx === activeIndex
                ? "border-slate-900 opacity-100"
                : "border-slate-200 opacity-70 hover:opacity-100"
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

        {/* Main image */}
        <div className="group relative overflow-hidden rounded-lg bg-neutral-50">
          <span className="absolute right-3 top-3 z-10 inline-flex h-6 items-center rounded-md bg-black/50 px-2 text-[11px] font-medium text-white backdrop-blur-sm">
            {imageCountText}
          </span>
          <button
            type="button"
            aria-label="Save to wishlist"
            onClick={onToggleFavorite}
            disabled={favoriteLoading}
            className={`absolute right-3 top-11 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border bg-white/90 shadow-sm transition ${isFavorite
              ? "border-rose-300 text-rose-500"
              : "border-white/80 text-slate-500 hover:text-rose-500"
              } ${favoriteLoading ? "cursor-not-allowed opacity-70" : ""}`}
          >
            {favoriteLoading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Heart size={18} fill={isFavorite ? "currentColor" : "none"} />
            )}
          </button>
          {mainImage ? (
            <GalleryImage
              key={mainImage}
              src={mainImage}
              alt={productName}
              className="aspect-[3/4] w-full object-cover"
              fallbackClassName="aspect-[3/4] w-full"
            />
          ) : (
            <div className="flex aspect-[3/4] w-full items-center justify-center text-sm text-neutral-400">
              No image
            </div>
          )}
        </div>
      </div>

      {/* Thumbnails — mobile */}
      {safeImages.length > 1 && (
        <div className="mt-4 flex gap-2 overflow-auto pb-1 md:hidden">
          {safeImages.map((img, idx) => (
            <button
              key={`${img.slice(0, 24)}-${idx}`}
              type="button"
              onClick={() => onSelectImage?.(idx)}
              className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition focus:outline-none ${idx === activeIndex
                ? "border-slate-900 opacity-100"
                : "border-transparent opacity-60"
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
