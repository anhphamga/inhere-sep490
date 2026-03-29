import { X } from 'lucide-react';
import { formatVND } from '../../../pages/public/catalogHelpers';

export default function QuickViewModal({ product, mode = 'shop', open = false, onClose, onPrimaryAction }) {
  if (!open || !product) return null;

  const isRent = mode === 'rent';
  const image = product?.imageUrl || product?.image || product?.images?.[0] || '';
  const price = Number(
    isRent
      ? product?.baseRentPrice || product?.baseSalePrice || 0
      : product?.baseSalePrice || product?.baseRentPrice || 0
  );

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/55 p-4" onClick={onClose}>
      <div
        className="w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="text-lg font-bold text-slate-900">Xem nhanh sản phẩm</h3>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-5 p-5 md:grid-cols-2">
          <div className="overflow-hidden rounded-2xl bg-amber-50">
            {image ? (
              <img src={image} alt={product.name} loading="lazy" className="h-full w-full object-cover" />
            ) : (
              <div className="flex aspect-[3/4] items-center justify-center text-sm text-slate-500">Không có ảnh</div>
            )}
          </div>

          <div className="space-y-3">
            <h4 className="text-xl font-bold text-slate-900">{product?.name}</h4>
            <p className="text-sm text-slate-600">
              {product?.description || 'Sản phẩm nổi bật tại INHERE, phù hợp nhiều phong cách và dịp sử dụng.'}
            </p>
            <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3">
              <p className="text-sm text-slate-600">{isRent ? 'Giá thuê/ngày' : 'Giá bán'}</p>
              <p className="text-2xl font-extrabold text-amber-600">{formatVND(price)}</p>
            </div>
            <button
              type="button"
              onClick={() => onPrimaryAction?.(product)}
              className="w-full rounded-xl bg-amber-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-amber-600"
            >
              {isRent ? 'Thuê ngay' : 'Thêm vào giỏ'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
