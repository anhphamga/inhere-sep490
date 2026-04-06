import { Eye } from 'lucide-react';

const formatVnd = (value) => `${Number(value || 0).toLocaleString('vi-VN')}đ`;

const resolveTag = (product = {}) => {
  if (product?.isHot || String(product?.tag || '').toUpperCase() === 'HOT') return 'HOT';
  if (product?.isNew || String(product?.tag || '').toUpperCase() === 'NEW') return 'NEW';
  return '';
};

export default function ProductCard({ product, onRentNow, onBuyNow, onQuickView }) {
  const image = product?.image || product?.imageUrl || product?.images?.[0] || '';
  const rentPrice = Number(product?.baseRentPrice ?? product?.price ?? 0);
  const buyPrice = Number(product?.baseSalePrice ?? 0);
  const displayPrice = rentPrice > 0 ? rentPrice : buyPrice;
  const tag = resolveTag(product);

  return (
    <article
      className="group overflow-hidden rounded-xl border border-amber-100 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg"
      onClick={() => onQuickView?.(product)}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onQuickView?.(product);
        }
      }}
    >
      <div className="relative">
        <div className="aspect-[3/4] overflow-hidden bg-amber-50">
          {image ? (
            <img
              src={image}
              alt={product?.name || 'product'}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-slate-500">Không có ảnh</div>
          )}
        </div>

        {tag ? (
          <span
            className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide text-white ${
              tag === 'HOT' ? 'bg-rose-500' : 'bg-emerald-500'
            }`}
          >
            {tag}
          </span>
        ) : null}

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onQuickView?.(product);
          }}
          className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full bg-slate-900/85 px-3 py-1.5 text-xs font-semibold text-white transition duration-300 hover:bg-slate-900"
        >
          <Eye size={14} />
          Xem nhanh
        </button>
      </div>

      <div className="space-y-3 p-3.5">
        <h3 className="line-clamp-2 min-h-[2.75rem] text-sm font-semibold text-slate-800">{product?.name || 'Sản phẩm'}</h3>
        <p className="text-lg font-extrabold text-amber-600">{formatVnd(displayPrice)}</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onRentNow?.(product);
            }}
            className="w-full rounded-xl bg-amber-500 px-3 py-2.5 text-sm font-semibold text-white transition duration-300 hover:bg-amber-600"
          >
            Thuê
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onBuyNow?.(product);
            }}
            className="w-full rounded-xl border border-amber-300 bg-white px-3 py-2.5 text-sm font-semibold text-amber-700 transition duration-300 hover:bg-amber-50"
          >
            Mua
          </button>
        </div>
      </div>
    </article>
  );
}
