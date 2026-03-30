import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { SlidersHorizontal, X } from 'lucide-react';
import Header from '../../components/common/Header';
import FilterSidebar from '../../components/catalog/common/FilterSidebar';
import ProductGrid from '../../components/catalog/common/ProductGrid';
import QuickViewModal from '../../components/catalog/common/QuickViewModal';
import RentHero from '../../components/catalog/rent/RentHero';
import OutfitCarousel from '../../components/catalog/rent/OutfitCarousel';
import StickyRentCTA from '../../components/catalog/rent/StickyRentCTA';
import SortDropdown from '../../components/catalog/shop/SortDropdown';
import BookingModal from '../../components/booking/BookingModal';
import {
  buildSidebarTree,
  collectVariantOptions,
  flattenCategories,
  mapRentDisplayName,
  normalizeText,
  resolveCategoryValueFromKeyword,
} from './catalogHelpers';
import { useFavorites } from '../../contexts/FavoritesContext';

const DEFAULT_FILTERS = { occasion: '', category: '', color: '', size: '', price: '' };

const OCCASION_KEYWORDS = {
  wedding: ['cuoi', 'wedding', 'le cuoi', 'an hoi'],
  festival: ['le hoi', 'festival', 'su kien', 'bieu dien'],
  photoshoot: ['chup anh', 'photoshoot', 'co phuc', 'co trang'],
  travel: ['du lich', 'hoi an', 'checkin'],
};

const priceInRange = (price, range) => {
  if (!range) return true;
  if (range === 'low') return price < 300000;
  if (range === 'mid') return price >= 300000 && price <= 700000;
  if (range === 'high') return price > 700000;
  return true;
};

const getLikeCount = (product = {}) => {
  const directValue = Number(
    product?.likeCount ??
      product?.likes ??
      product?.favoriteCount ??
      product?.wishlistCount ??
      product?.totalLikes
  );
  if (Number.isFinite(directValue) && directValue >= 0) return directValue;
  if (Array.isArray(product?.likedBy)) return product.likedBy.length;
  if (Array.isArray(product?.favorites)) return product.favorites.length;
  return 0;
};

const buildOccasionText = (product = {}) => {
  const tags = Array.isArray(product?.tags) ? product.tags.join(' ') : '';
  return normalizeText(
    [product?.name, product?.description, product?.category, product?.occasion, tags].filter(Boolean).join(' ')
  );
};

const isDateAvailable = (product, startDate, endDate) => {
  if (!startDate || !endDate) return true;

  if (typeof product?.isAvailable === 'boolean') return product.isAvailable;
  if (typeof product?.availabilityStatus === 'string') {
    return !['unavailable', 'booked', 'rented'].includes(product.availabilityStatus.toLowerCase());
  }
  return true;
};

export default function RentPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isFavorite, isFavoriteLoading, toggleFavorite } = useFavorites();

  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState('top_liked');
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [selectedBookingProduct, setSelectedBookingProduct] = useState(null);
  const [toast, setToast] = useState('');

  const searchKeyword = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return (params.get('q') || '').trim();
  }, [location.search]);

  const categoryKeyword = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return (params.get('category') || '').trim();
  }, [location.search]);

  const openBookingParam = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('openBooking') === '1';
  }, [location.search]);

  const sortParam = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const value = String(params.get('sort') || '').trim().toLowerCase();
    const allowed = new Set(['top_liked', 'newest', 'price_asc', 'price_desc', 'name_asc']);
    return allowed.has(value) ? value : '';
  }, [location.search]);

  const categoryTree = useMemo(() => buildSidebarTree(categories), [categories]);
  const flatCategories = useMemo(() => flattenCategories(categoryTree), [categoryTree]);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        const response = await fetch('/api/categories?lang=vi&purpose=rent');
        const payload = response.ok ? await response.json() : { categories: [] };
        if (!mounted) return;
        setCategories(Array.isArray(payload?.categories) ? payload.categories : []);
      } catch {
        if (mounted) setCategories([]);
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!categoryKeyword || flatCategories.length === 0) return;
    const resolved = resolveCategoryValueFromKeyword({
      keyword: categoryKeyword,
      nodes: flatCategories,
      mode: 'rent',
    });
    if (resolved) {
      setFilters((prev) => ({ ...prev, category: resolved }));
    }
  }, [categoryKeyword, flatCategories]);

  useEffect(() => {
    if (openBookingParam) {
      setIsBookingOpen(true);
    }
  }, [openBookingParam]);

  useEffect(() => {
    if (sortParam) {
      setSortBy(sortParam);
    } else {
      setSortBy('top_liked');
    }
  }, [sortParam]);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({ purpose: 'rent', lang: 'vi', limit: '60', page: '1' });
        if (searchKeyword) params.set('search', searchKeyword);
        if (filters.category) params.set('category', filters.category);
        if (startDate) params.set('startDate', startDate);
        if (endDate) params.set('endDate', endDate);
        const response = await fetch(`/api/products?${params.toString()}`);
        const payload = response.ok ? await response.json() : { data: [] };
        if (!mounted) return;
        const rawProducts = Array.isArray(payload?.data) ? payload.data : [];
        setProducts(rawProducts);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, [searchKeyword, filters.category, startDate, endDate]);

  const { sizes, colors } = useMemo(() => collectVariantOptions(products), [products]);

  const filteredProducts = useMemo(() => {
    const keyword = normalizeText(searchKeyword);
    const list = products.filter((product) => {
      const bySearch = keyword
        ? normalizeText(`${product?.name || ''} ${product?.description || ''}`).includes(keyword)
        : true;
      const bySize = filters.size
        ? normalizeText(
            `${product?.size || ''} ${Array.isArray(product?.sizes) ? product.sizes.join(' ') : ''} ${
              Array.isArray(product?.colorVariants)
                ? product.colorVariants.map((variant) => variant?.size || '').join(' ')
                : ''
            }`
          ).includes(normalizeText(filters.size))
        : true;
      const byColor = filters.color
        ? normalizeText(
            `${product?.color || ''} ${
              Array.isArray(product?.colorVariants)
                ? product.colorVariants.map((variant) => variant?.name || variant?.color || '').join(' ')
                : ''
            }`
          ).includes(normalizeText(filters.color))
        : true;
      const byOccasion = filters.occasion
        ? OCCASION_KEYWORDS[filters.occasion]?.some((token) => buildOccasionText(product).includes(token))
        : true;
      const byPrice = priceInRange(Number(product?.baseRentPrice || product?.baseSalePrice || 0), filters.price);
      const byDate = isDateAvailable(product, startDate, endDate);

      return bySearch && bySize && byColor && byOccasion && byPrice && byDate;
    });

    list.sort((a, b) => {
      const likeDiff = getLikeCount(b) - getLikeCount(a);
      if (likeDiff !== 0) return likeDiff;

      if (sortBy === 'price_asc') {
        return Number(a.baseRentPrice || 0) - Number(b.baseRentPrice || 0);
      }
      if (sortBy === 'price_desc') {
        return Number(b.baseRentPrice || 0) - Number(a.baseRentPrice || 0);
      }
      if (sortBy === 'name_asc') {
        return String(a.name || '').localeCompare(String(b.name || ''), 'vi');
      }
      return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
    });

    return list;
  }, [products, filters, sortBy, searchKeyword, startDate, endDate]);

  const favoriteIds = useMemo(() => {
    const ids = new Set();
    filteredProducts.forEach((product) => {
      if (isFavorite(product._id)) ids.add(product._id);
    });
    return ids;
  }, [filteredProducts, isFavorite]);

  const favoriteLoadingIds = useMemo(() => {
    const ids = new Set();
    filteredProducts.forEach((product) => {
      if (isFavoriteLoading(product._id)) ids.add(product._id);
    });
    return ids;
  }, [filteredProducts, isFavoriteLoading]);

  const outfitSuggestions = useMemo(() => {
    return filteredProducts.slice(0, 8).map((product, index) => ({
      id: `${product._id}-outfit-${index}`,
      name: `Set ${mapRentDisplayName(product.name || 'Cổ phục')} gợi ý`,
      imageUrl: product.imageUrl,
      totalPrice: Math.round(Number(product.baseRentPrice || product.baseSalePrice || 0) * 1.8),
      productId: product._id,
    }));
  }, [filteredProducts]);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(''), 2200);
  };

  const handleToggleFavorite = async (product) => {
    const result = await toggleFavorite(product);
    if (!result.ok && result.reason === 'AUTH_REQUIRED') {
      showToast('Vui lòng đăng nhập để sử dụng chức năng yêu thích');
      navigate('/login', { state: { from: location } });
      return;
    }
    if (!result.ok && result.reason === 'PENDING') return;
    if (!result.ok) {
      showToast(result.message || 'Không thể cập nhật yêu thích.');
      return;
    }
    showToast(result.added ? 'Đã thêm vào yêu thích.' : 'Đã xóa khỏi yêu thích.');
  };

  const handleRentNow = (product) => {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    navigate(`/products/${product._id}${params.toString() ? `?${params.toString()}` : ''}`);
  };

  const handleBookFitting = (product = null) => {
    setSelectedBookingProduct(product || null);
    setIsBookingOpen(true);
  };

  const closeBookingModal = () => {
    setIsBookingOpen(false);
    setSelectedBookingProduct(null);
    const params = new URLSearchParams(location.search);
    if (params.has('openBooking')) {
      params.delete('openBooking');
      navigate(
        {
          pathname: location.pathname,
          search: params.toString() ? `?${params.toString()}` : '',
        },
        { replace: true }
      );
    }
  };

  const handleResetFilters = () => {
    setFilters(DEFAULT_FILTERS);
  };

  const selectedCategoryLabel =
    flatCategories.find((item) => item.value === filters.category)?.displayName || 'Tất cả danh mục';

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <Header active="rent" />

      <main className="mx-auto w-full max-w-[1280px] space-y-6 px-4 py-5 md:px-6 lg:px-8">
        <RentHero
          startDate={startDate}
          endDate={endDate}
          onChangeStartDate={setStartDate}
          onChangeEndDate={setEndDate}
        />

        <OutfitCarousel outfits={outfitSuggestions} onSelectOutfit={(outfit) => navigate(`/products/${outfit.productId}`)} />

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Sản phẩm nổi bật cho thuê</h2>
            <p className="mt-1 text-sm text-slate-600">Danh mục: {mapRentDisplayName(selectedCategoryLabel)}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsMobileFilterOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 lg:hidden"
            >
              <SlidersHorizontal size={16} />
              Bộ lọc
            </button>
            <SortDropdown value={sortBy} onChange={setSortBy} />
          </div>
        </div>

        <section className="grid gap-5 lg:grid-cols-[280px_1fr]">
          <FilterSidebar
            mode="rent"
            categories={flatCategories.map((item) => ({ ...item, displayName: mapRentDisplayName(item.displayName) }))}
            filters={filters}
            onChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
            onReset={handleResetFilters}
            sizeOptions={sizes}
            colorOptions={colors}
            className="hidden lg:block"
          />

          <div className="space-y-5">
            <ProductGrid
              mode="rent"
              products={filteredProducts}
              loading={loading}
              favoriteIds={favoriteIds}
              favoriteLoadingIds={favoriteLoadingIds}
              onToggleFavorite={handleToggleFavorite}
              onQuickView={setQuickViewProduct}
              onPrimaryAction={handleRentNow}
              onSecondaryAction={handleBookFitting}
              emptyText="Không có trang phục phù hợp với bộ lọc thuê."
            />

          </div>
        </section>
      </main>

      {isMobileFilterOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/45 p-4 lg:hidden" onClick={() => setIsMobileFilterOpen(false)}>
          <div
            className="mx-auto max-w-md rounded-2xl bg-white p-4 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Bộ lọc thuê đồ</h3>
              <button
                type="button"
                onClick={() => setIsMobileFilterOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200"
              >
                <X size={16} />
              </button>
            </div>
            <FilterSidebar
              mode="rent"
              categories={flatCategories.map((item) => ({ ...item, displayName: mapRentDisplayName(item.displayName) }))}
              filters={filters}
              onChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
              onReset={handleResetFilters}
              sizeOptions={sizes}
              colorOptions={colors}
            />
          </div>
        </div>
      )}

      <QuickViewModal
        mode="rent"
        open={Boolean(quickViewProduct)}
        product={quickViewProduct}
        onClose={() => setQuickViewProduct(null)}
        onPrimaryAction={(product) => {
          setQuickViewProduct(null);
          handleRentNow(product);
        }}
      />

      <StickyRentCTA count={filteredProducts.length} onClick={handleBookFitting} />

      <BookingModal
        open={isBookingOpen}
        onClose={closeBookingModal}
        selectedProduct={selectedBookingProduct}
        onSuccess={() => {
          showToast('Đặt lịch thử đồ thành công.');
        }}
      />

      {toast && (
        <div className="fixed right-4 top-24 z-[80] rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
