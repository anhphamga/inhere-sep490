import { Heart, Eye, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatVND } from '../../../pages/public/catalogHelpers';

export default function ProductCard({
  product,
  mode = 'shop',
  isFavorite = false,
  favoriteLoading = false,
  onToggleFavorite,
  onQuickView,
  onPrimaryAction,
  onSecondaryAction,
}) {
  const isRent = mode === 'rent';
  const availableQuantity = Number(product?.availableQuantity || 0);
  const inStock = availableQuantity > 0;
  const rentPrice = Number(product?.baseRentPrice || product?.baseSalePrice || 0);
  const salePrice = Number(product?.baseSalePrice || product?.baseRentPrice || 0);

  return (
    <article className="group overflow-hidden rounded-2xl border border-amber-100 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg">
      <div className="relative">
        <Link to={`/products/${product._id}`} className="block aspect-[3/4] overflow-hidden bg-amber-50">
          {product?.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              loading="lazy"
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-slate-500">Không có ảnh</div>
          )}
        </Link>

        <button
          type="button"
          onClick={() => onToggleFavorite?.(product)}
          disabled={favoriteLoading}
          className={`absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full border bg-white/90 transition ${
            isFavorite ? 'border-rose-300 text-rose-500' : 'border-amber-200 text-slate-500 hover:text-rose-500'
          } ${favoriteLoading ? 'cursor-not-allowed opacity-70' : ''}`}
          aria-label="Yêu thích"
        >
          {favoriteLoading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Heart size={16} fill={isFavorite ? 'currentColor' : 'none'} />
          )}
        </button>

        <button
          type="button"
          onClick={() => onQuickView?.(product)}
          className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full bg-slate-900/85 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-900"
        >
          <Eye size={14} />
          Xem nhanh
        </button>
      </div>

      <div className="space-y-3 p-4">
        <h3 className="line-clamp-2 min-h-[3rem] text-sm font-semibold text-slate-800">{product?.name || 'Sản phẩm'}</h3>

        <div>
          {isRent ? (
            <>
              <p className="text-xl font-extrabold text-amber-600">{formatVND(rentPrice)}</p>
              <p className="text-xs text-slate-500">Giá thuê/ngày</p>
            </>
          ) : (
            <>
              <p className="text-xl font-extrabold text-slate-900">{formatVND(salePrice)}</p>
              <p className="text-xs text-slate-500">Giá bán</p>
            </>
          )}
        </div>

        {!inStock && <p className="text-xs font-semibold text-rose-600">Hết hàng</p>}

        <div className={`grid gap-2 ${isRent ? 'grid-cols-2' : 'grid-cols-1'}`}>
          <button
            type="button"
            onClick={() => onPrimaryAction?.(product)}
            disabled={!inStock}
            className="rounded-xl bg-amber-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isRent ? 'Thuê ngay' : 'Thêm vào giỏ'}
          </button>

          {isRent && (
            <button
              type="button"
              onClick={() => onSecondaryAction?.(product)}
              className="rounded-xl border border-amber-300 px-3 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-50"
            >
              Đặt lịch thử
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
