import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { SlidersHorizontal, X } from "lucide-react";
import Header from "../../components/common/Header";
import ShopHeader from "../../components/catalog/shop/ShopHeader";
import SortDropdown from "../../components/catalog/shop/SortDropdown";
import Pagination from "../../components/catalog/shop/Pagination";
import FilterSidebar from "../../components/catalog/common/FilterSidebar";
import ProductGrid from "../../components/catalog/common/ProductGrid";
import QuickViewModal from "../../components/catalog/common/QuickViewModal";
import {
  buildSidebarTree,
  collectVariantOptions,
  flattenCategories,
  normalizeText,
  resolveCategoryValueFromKeyword,
} from "./catalogHelpers";
import { useBuyCart } from "../../contexts/BuyCartContext";
import { useFavorites } from "../../contexts/FavoritesContext";

const DEFAULT_FILTERS = { category: "", color: "", size: "", price: "" };

const priceInRange = (price, range) => {
  if (!range) return true;
  if (range === "low") return price < 300000;
  if (range === "mid") return price >= 300000 && price <= 700000;
  if (range === "high") return price > 700000;
  return true;
};

export default function ShopPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { addItem } = useBuyCart();
  const { isFavorite, isFavoriteLoading, toggleFavorite } = useFavorites();

  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [sortBy, setSortBy] = useState("newest");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, totalItems: 0, limit: 24 });
  const [loading, setLoading] = useState(false);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const [toast, setToast] = useState("");

  const searchKeyword = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return (params.get("q") || "").trim();
  }, [location.search]);

  const categoryKeyword = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return (params.get("category") || "").trim();
  }, [location.search]);

  const categoryTree = useMemo(() => buildSidebarTree(categories), [categories]);
  const flatCategories = useMemo(() => flattenCategories(categoryTree), [categoryTree]);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        const response = await fetch("/api/categories?lang=vi&purpose=buy");
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
      mode: "shop",
    });
    if (resolved) {
      setFilters((prev) => ({ ...prev, category: resolved }));
    }
  }, [categoryKeyword, flatCategories]);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          purpose: "buy",
          lang: "vi",
          limit: "24",
          page: String(page),
        });
        if (searchKeyword) params.set("search", searchKeyword);
        if (filters.category) params.set("category", filters.category);
        const response = await fetch(`/api/products?${params.toString()}`);
        const payload = response.ok ? await response.json() : { data: [] };
        if (!mounted) return;
        setProducts(Array.isArray(payload?.data) ? payload.data : []);
        setPagination(payload?.pagination || { page: 1, totalPages: 1, totalItems: 0, limit: 24 });
      } finally {
        if (mounted) setLoading(false);
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, [searchKeyword, filters.category, page]);

  useEffect(() => {
    setPage(1);
  }, [searchKeyword, filters.category]);

  const { sizes, colors } = useMemo(() => collectVariantOptions(products), [products]);

  const filteredProducts = useMemo(() => {
    const keyword = normalizeText(searchKeyword);
    const list = products.filter((product) => {
      const bySearch = keyword
        ? normalizeText(`${product?.name || ""} ${product?.description || ""}`).includes(keyword)
        : true;
      const bySize = filters.size
        ? normalizeText(
            `${product?.size || ""} ${Array.isArray(product?.sizes) ? product.sizes.join(" ") : ""} ${
              Array.isArray(product?.colorVariants)
                ? product.colorVariants.map((variant) => variant?.size || "").join(" ")
                : ""
            }`
          ).includes(normalizeText(filters.size))
        : true;
      const byColor = filters.color
        ? normalizeText(
            `${product?.color || ""} ${
              Array.isArray(product?.colorVariants)
                ? product.colorVariants.map((variant) => variant?.name || variant?.color || "").join(" ")
                : ""
            }`
          ).includes(normalizeText(filters.color))
        : true;
      const byPrice = priceInRange(Number(product?.baseSalePrice || product?.baseRentPrice || 0), filters.price);
      return bySearch && bySize && byColor && byPrice;
    });

    if (sortBy === "price_asc") list.sort((a, b) => Number(a.baseSalePrice || 0) - Number(b.baseSalePrice || 0));
    else if (sortBy === "price_desc") list.sort((a, b) => Number(b.baseSalePrice || 0) - Number(a.baseSalePrice || 0));
    else if (sortBy === "name_asc") list.sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "vi"));
    else list.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));

    return list;
  }, [products, filters, sortBy, searchKeyword]);

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

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(""), 2200);
  };

  const handleToggleFavorite = async (product) => {
    const result = await toggleFavorite(product);
    if (!result.ok && result.reason === "AUTH_REQUIRED") {
      showToast("Vui lòng đăng nhập để sử dụng chức năng yêu thích");
      navigate("/login", { state: { from: location } });
      return;
    }
    if (!result.ok && result.reason === "PENDING") return;
    if (!result.ok) {
      showToast(result.message || "Không thể cập nhật yêu thích");
      return;
    }
    showToast(result.added ? "Đã thêm vào yêu thích" : "Đã xóa khỏi yêu thích");
  };

  const handleAddToCart = (product) => {
    if (Number(product?.availableQuantity || 0) <= 0) {
      showToast("Sản phẩm đang hết hàng.");
      return;
    }
    addItem(product, {
      color: "Mặc định",
      size: "FREE SIZE",
      salePrice: Number(product?.baseSalePrice || 0),
      quantity: 1,
    });
    showToast("Đã thêm vào giỏ hàng.");
  };

  const handleResetFilters = () => setFilters(DEFAULT_FILTERS);

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      <Header active="buy" />

      <main className="mx-auto w-full max-w-[1280px] space-y-6 px-4 py-5 md:px-6 lg:px-8">
        <ShopHeader />

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Danh sách sản phẩm</h2>
            <p className="mt-1 text-sm text-slate-600">Mua đồ theo sản phẩm và phụ kiện có sẵn.</p>
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
            mode="shop"
            categories={flatCategories}
            filters={filters}
            onChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
            onReset={handleResetFilters}
            sizeOptions={sizes}
            colorOptions={colors}
            className="hidden lg:block"
          />

          <div>
            <ProductGrid
              mode="shop"
              products={filteredProducts}
              loading={loading}
              favoriteIds={favoriteIds}
              favoriteLoadingIds={favoriteLoadingIds}
              onToggleFavorite={handleToggleFavorite}
              onQuickView={setQuickViewProduct}
              onPrimaryAction={handleAddToCart}
              emptyText="Không có sản phẩm phù hợp với bộ lọc mua đồ."
            />

            <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={setPage} />

            <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-base font-bold text-slate-900">Thông tin giao hàng & đổi trả</h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                <li>• Giao hàng toàn quốc, hỗ trợ hỏa tốc tại Hội An và Đà Nẵng.</li>
                <li>• Đổi trả trong 48 giờ với sản phẩm lỗi từ nhà sản xuất.</li>
              </ul>
            </section>
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
              <h3 className="text-base font-bold text-slate-900">Bộ lọc mua đồ</h3>
              <button
                type="button"
                onClick={() => setIsMobileFilterOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200"
              >
                <X size={16} />
              </button>
            </div>
            <FilterSidebar
              mode="shop"
              categories={flatCategories}
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
        mode="shop"
        open={Boolean(quickViewProduct)}
        product={quickViewProduct}
        onClose={() => setQuickViewProduct(null)}
        onPrimaryAction={(product) => {
          setQuickViewProduct(null);
          handleAddToCart(product);
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
