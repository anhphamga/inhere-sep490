import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { SlidersHorizontal, X } from 'lucide-react';
import Header from '../../components/common/Header';
import QuickViewModal from '../../components/catalog/common/QuickViewModal';
import CollectionHero from '../../components/collection/CollectionHero';
import OutfitCarousel from '../../components/collection/OutfitCarousel';
import FilterSidebar from '../../components/collection/FilterSidebar';
import SortDropdown from '../../components/collection/SortDropdown';
import ProductGrid from '../../components/collection/ProductGrid';
import RelatedCollections from '../../components/collection/RelatedCollections';
import Pagination from '../../components/catalog/shop/Pagination';
import { getCollectionBySlugApi } from '../../services/collection.service';

const LAST_COLLECTION_SLUG_KEY = 'last_collection_slug';
const COLLECTION_PAGE_SIZE = 12;
const toArray = (value) => (Array.isArray(value) ? value : []);
const toText = (value) => String(value || '').trim();
const normalize = (value = '') =>
  toText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const getProductPrice = (product = {}) => Number(product?.price ?? product?.baseRentPrice ?? product?.baseSalePrice ?? 0);

const getProductColors = (product = {}) => {
  const fromVariants = toArray(product?.colorVariants)
    .map((item) => toText(item?.name || item?.color))
    .filter(Boolean);
  const fromField = toText(product?.color)
    .split(/[|,;/]/)
    .map((item) => item.trim())
    .filter(Boolean);
  return [...new Set([...fromVariants, ...fromField])];
};

const getProductSizes = (product = {}) => {
  const fromSizes = toArray(product?.sizes).map((item) => toText(item)).filter(Boolean);
  const fromVariants = toArray(product?.colorVariants)
    .map((item) => toText(item?.size))
    .filter(Boolean);
  const fallback = toText(product?.size)
    .split(/[|,;/]/)
    .map((item) => item.trim())
    .filter(Boolean);
  return [...new Set([...fromSizes, ...fromVariants, ...fallback])];
};

const facetFromApiOrProducts = ({ apiOptions, products, extractor }) => {
  const apiList = toArray(apiOptions)
    .map((item) => {
      if (typeof item === 'object' && item !== null) {
        const value = toText(item.value || item.slug || item.name || item.label);
        const label = toText(item.label || item.name || value);
        return value ? { value, label } : null;
      }
      const value = toText(item);
      return value ? { value, label: value } : null;
    })
    .filter(Boolean);

  if (apiList.length > 0) return apiList;

  const set = new Set();
  toArray(products).forEach((product) => {
    extractor(product).forEach((value) => {
      if (value) set.add(value);
    });
  });

  return Array.from(set)
    .sort((a, b) => a.localeCompare(b, 'vi'))
    .map((value) => ({ value, label: value }));
};

export default function CollectionPage() {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const outfitSectionRef = useRef(null);
  const productSectionRef = useRef(null);

  const [collection, setCollection] = useState(null);
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [filters, setFilters] = useState({
    categories: [],
    colors: [],
    sizes: [],
    priceRange: { min: 0, max: 0 },
  });
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [selectedFilters, setSelectedFilters] = useState({
    category: [],
    color: [],
    size: [],
    price: { min: 0, max: 0 },
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState(null);

  useEffect(() => {
    if (!slug) return;
    localStorage.setItem(LAST_COLLECTION_SLUG_KEY, slug);
  }, [slug]);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        setLoading(true);
        setError('');
        const payload = await getCollectionBySlugApi(slug);
        const data = payload?.data || payload || {};
        if (!mounted) return;

        const productList = toArray(data?.products);
        const apiFilters = data?.filters || {};

        const categories = facetFromApiOrProducts({
          apiOptions: apiFilters?.categories,
          products: productList,
          extractor: (product) => [toText(product?.category || product?.categoryName || product?.categorySlug)],
        });
        const colors = facetFromApiOrProducts({
          apiOptions: apiFilters?.colors,
          products: productList,
          extractor: (product) => getProductColors(product),
        });
        const sizes = facetFromApiOrProducts({
          apiOptions: apiFilters?.sizes,
          products: productList,
          extractor: (product) => getProductSizes(product),
        });

        const prices = productList.map((product) => getProductPrice(product)).filter((value) => Number.isFinite(value));
        const apiMin = Number(apiFilters?.priceRange?.min);
        const apiMax = Number(apiFilters?.priceRange?.max);
        const min = Number.isFinite(apiMin) ? apiMin : prices.length ? Math.min(...prices) : 0;
        const max = Number.isFinite(apiMax) ? apiMax : prices.length ? Math.max(...prices) : 0;

        setCollection({
          name: toText(data?.name),
          banner: toText(data?.banner),
          description: toText(data?.description),
          outfits: toArray(data?.outfits),
          relatedCollections: toArray(data?.relatedCollections),
        });
        setProducts(productList);
        setFilters({
          categories,
          colors,
          sizes,
          priceRange: { min, max },
        });
        setSelectedFilters({
          category: [],
          color: [],
          size: [],
          price: { min, max },
        });
      } catch (fetchError) {
        if (!mounted) return;
        setCollection(null);
        setProducts([]);
        setFilteredProducts([]);
        setError(fetchError?.response?.data?.message || 'Không thể tải bộ sưu tập.');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    run();
    return () => {
      mounted = false;
    };
  }, [slug]);

  useEffect(() => {
    const next = products
      .filter((product) => {
        const categoryMatched =
          selectedFilters.category.length === 0 ||
          selectedFilters.category.some((token) => normalize(product?.category || product?.categoryName || '').includes(normalize(token)));

        const productColors = getProductColors(product).map((item) => normalize(item));
        const colorMatched = selectedFilters.color.length === 0 || selectedFilters.color.some((token) => productColors.includes(normalize(token)));

        const productSizes = getProductSizes(product).map((item) => normalize(item));
        const sizeMatched = selectedFilters.size.length === 0 || selectedFilters.size.some((token) => productSizes.includes(normalize(token)));

        const price = getProductPrice(product);
        const min = Number(selectedFilters.price?.min ?? filters.priceRange.min);
        const max = Number(selectedFilters.price?.max ?? filters.priceRange.max);
        const priceMatched = Number.isFinite(price) ? price >= min && price <= max : false;

        return categoryMatched && colorMatched && sizeMatched && priceMatched;
      })
      .sort((a, b) => {
        if (sort === 'price_asc') return getProductPrice(a) - getProductPrice(b);
        if (sort === 'price_desc') return getProductPrice(b) - getProductPrice(a);
        return String(b?.createdAt || '').localeCompare(String(a?.createdAt || ''));
      });

    setFilteredProducts(next);
  }, [products, selectedFilters, sort, filters.priceRange.max, filters.priceRange.min]);

  useEffect(() => {
    setPage(1);
  }, [slug, selectedFilters, sort]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / COLLECTION_PAGE_SIZE));

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const paginatedProducts = useMemo(() => {
    const start = (page - 1) * COLLECTION_PAGE_SIZE;
    return filteredProducts.slice(start, start + COLLECTION_PAGE_SIZE);
  }, [filteredProducts, page]);

  const stickyCount = filteredProducts.length;

  const collectionData = useMemo(
    () => ({
      name: collection?.name || '',
      banner: collection?.banner || '',
      description: collection?.description || '',
      outfits: toArray(collection?.outfits).map((item, index) => ({
        ...item,
        id: item?.id || item?._id || `${slug}-outfit-${index}`,
        image: item?.image || item?.imageUrl || item?.banner || '',
        totalPrice: Number(item?.totalPrice ?? item?.price ?? item?.rentPrice ?? 0),
      })),
      relatedCollections: toArray(collection?.relatedCollections),
    }),
    [collection, slug]
  );

  const toggleFilterValue = (key, value) => {
    setSelectedFilters((prev) => {
      const current = toArray(prev?.[key]);
      const exists = current.includes(value);
      return {
        ...prev,
        [key]: exists ? current.filter((item) => item !== value) : [...current, value],
      };
    });
  };

  const handlePriceChange = (bound, value) => {
    setSelectedFilters((prev) => {
      const nextMin = bound === 'min' ? value : Number(prev.price?.min ?? filters.priceRange.min);
      const nextMax = bound === 'max' ? value : Number(prev.price?.max ?? filters.priceRange.max);
      return {
        ...prev,
        price: {
          min: Math.min(nextMin, nextMax),
          max: Math.max(nextMin, nextMax),
        },
      };
    });
  };

  const handleResetFilters = () => {
    setSelectedFilters({
      category: [],
      color: [],
      size: [],
      price: { min: filters.priceRange.min, max: filters.priceRange.max },
    });
  };

  const handleRentNow = (product) => {
    if (!product?._id && !product?.id) return;
    navigate(`/products/${product?._id || product?.id}`);
  };
  const handleBuyNow = (product) => {
    if (!product?._id && !product?.id) return;
    navigate(`/products/${product?._id || product?.id}`);
  };

  const handleRentSet = (outfit) => {
    const firstProductId =
      toArray(outfit?.products)[0]?._id ||
      toArray(outfit?.products)[0]?.id ||
      toArray(outfit?.items)[0]?._id ||
      toArray(outfit?.items)[0]?.id;
    if (!firstProductId) return;
    navigate(`/products/${firstProductId}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <Header active="collection" />

      <main className="mx-auto w-full max-w-[1280px] space-y-6 px-4 py-5 md:px-6 lg:px-8">
        <CollectionHero
          name={collectionData.name}
          banner={collectionData.banner}
          description={collectionData.description}
          onRentNow={() => productSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          onViewOutfits={() => outfitSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          loading={loading}
        />

        <section ref={outfitSectionRef}>
          <OutfitCarousel outfits={collectionData.outfits} onRentSet={handleRentSet} loading={loading} />
        </section>

        <section ref={productSectionRef} className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Sản phẩm trong bộ sưu tập</h2>
              <p className="mt-1 text-sm text-slate-600">{filteredProducts.length} sản phẩm phù hợp</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsMobileFilterOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm lg:hidden"
              >
                <SlidersHorizontal size={16} />
                Bộ lọc
              </button>
              <SortDropdown value={sort} onChange={setSort} />
            </div>
          </div>

          {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-600">{error}</div> : null}

          <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
            <div className="hidden lg:block lg:sticky lg:top-24 lg:self-start">
              <FilterSidebar
                filters={filters}
                selectedFilters={selectedFilters}
                onToggleFilter={toggleFilterValue}
                onPriceChange={handlePriceChange}
                onReset={handleResetFilters}
              />
            </div>
            <ProductGrid
              products={paginatedProducts}
              loading={loading}
              onRentNow={handleRentNow}
              onBuyNow={handleBuyNow}
              onQuickView={setQuickViewProduct}
            />
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </section>

        <RelatedCollections collections={collectionData.relatedCollections} />
      </main>

      {isMobileFilterOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/45 p-4 lg:hidden" onClick={() => setIsMobileFilterOpen(false)}>
          <div className="mx-auto max-w-md rounded-2xl bg-white p-4 shadow-xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Bộ lọc collection</h3>
              <button
                type="button"
                onClick={() => setIsMobileFilterOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200"
              >
                <X size={16} />
              </button>
            </div>
            <FilterSidebar
              filters={filters}
              selectedFilters={selectedFilters}
              onToggleFilter={toggleFilterValue}
              onPriceChange={handlePriceChange}
              onReset={handleResetFilters}
            />
          </div>
        </div>
      )}

      <QuickViewModal
        mode="rent"
        product={quickViewProduct}
        open={Boolean(quickViewProduct)}
        onClose={() => setQuickViewProduct(null)}
        onPrimaryAction={(product) => {
          setQuickViewProduct(null);
          handleRentNow(product);
        }}
      />

      <div className="fixed bottom-4 left-1/2 z-40 w-[calc(100%-1.5rem)] -translate-x-1/2 rounded-2xl border border-amber-300 bg-white/95 p-3 shadow-xl backdrop-blur md:hidden">
        <button
          type="button"
          onClick={() => productSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          className="flex w-full items-center justify-between rounded-xl bg-amber-500 px-4 py-3 text-sm font-semibold text-white"
        >
          <span>Thuê ngay</span>
          <span>{stickyCount} sản phẩm</span>
        </button>
      </div>
    </div>
  );
}
