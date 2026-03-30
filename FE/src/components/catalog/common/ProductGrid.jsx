import ProductCard from './ProductCard';

function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="aspect-[3/4] animate-pulse bg-slate-200" />
      <div className="space-y-3 p-4">
        <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200" />
        <div className="h-6 w-1/2 animate-pulse rounded bg-slate-200" />
        <div className="h-9 w-full animate-pulse rounded-xl bg-slate-200" />
      </div>
    </div>
  );
}

export default function ProductGrid({
  products = [],
  loading = false,
  mode = 'shop',
  favoriteIds = new Set(),
  favoriteLoadingIds = new Set(),
  onToggleFavorite,
  onQuickView,
  onPrimaryAction,
  onSecondaryAction,
  emptyText = 'Không có sản phẩm phù hợp.',
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <ProductCardSkeleton key={`skeleton-${index}`} />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product) => (
        <ProductCard
          key={product._id}
          product={product}
          mode={mode}
          isFavorite={favoriteIds.has(product._id)}
          favoriteLoading={favoriteLoadingIds.has(product._id)}
          onToggleFavorite={onToggleFavorite}
          onQuickView={onQuickView}
          onPrimaryAction={onPrimaryAction}
          onSecondaryAction={onSecondaryAction}
        />
      ))}
    </div>
  );
}
