import ProductCard from './ProductCard';

function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="aspect-[3/4] animate-pulse bg-slate-200" />
      <div className="space-y-3 p-3.5">
        <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200" />
        <div className="h-6 w-1/2 animate-pulse rounded bg-slate-200" />
        <div className="h-10 w-full animate-pulse rounded-xl bg-slate-200" />
      </div>
    </div>
  );
}

export default function ProductGrid({ products = [], loading = false, onRentNow, onBuyNow, onQuickView }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <ProductCardSkeleton key={`collection-product-skeleton-${index}`} />
        ))}
      </div>
    );
  }

  if (!products.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
        Không có sản phẩm phù hợp.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
      {products.map((product) => (
        <ProductCard
          key={product?._id || product?.id || product?.slug || product?.name}
          product={product}
          onRentNow={onRentNow}
          onBuyNow={onBuyNow}
          onQuickView={onQuickView}
        />
      ))}
    </div>
  );
}
