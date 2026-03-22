import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Heart } from "lucide-react";
import Header from "../../components/common/Header";
import { useFavorites } from "../../contexts/FavoritesContext";
import "../../style/pages/ProductPages.css";

const TEXT = {
  titleDefault: "Danh mục sản phẩm",
  breadcrumbHome: "Trang chủ",
  allCategories: "Tất cả danh mục",
  sortNewest: "Sắp xếp theo mới nhất",
  sortPriceAsc: "Giá tăng dần",
  sortPriceDesc: "Giá giảm dần",
  sortNameAsc: "Tên A-Z",
  sidebarTitle: "DANH MỤC SẢN PHẨM",
  descByCategory: (name, count) => `Danh mục ${name} hiện có ${count} sản phẩm.`,
  descDefault: "Chọn danh mục bên trái để lọc sản phẩm nhanh theo nhu cầu.",
  loading: "Đang tải danh sách...",
  noImage: "Không có ảnh từ API",
  rent: "Thuê",
  buy: "Mua",
  prev: "Trước",
  next: "Sau",
  page: "Trang",
  currency: "đ",
  showChildren: "Mở danh mục con",
  hideChildren: "Thu gọn danh mục con",
  searchResult: (keyword) => `Kết quả tìm kiếm cho "${keyword}".`,
  favoriteRequired: "Vui lòng đăng nhập để thêm sản phẩm yêu thích",
  favoriteAdded: "Đã thêm vào sản phẩm yêu thích",
  favoriteRemoved: "Đã xóa khỏi sản phẩm yêu thích",
  favoriteLabel: "Thêm vào yêu thích",
};

const toCategoryNode = (item = {}) => ({
  value: String(item.value || item.rawName || item.displayName || "").trim(),
  displayName: String(item.displayName || item.name || item.value || "").trim(),
  count: Math.max(Number(item.count) || 0, 0),
  slug: String(item.slug || ""),
  children: Array.isArray(item.children)
    ? item.children.map((child) => toCategoryNode(child)).filter((child) => child.value)
    : [],
});

const normalizeText = (value = "") =>
  String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();

const mergeUniqueChildren = (children = []) => {
  const seen = new Set();
  return children.filter((child) => {
    if (!child?.value || seen.has(child.value)) return false;
    seen.add(child.value);
    return true;
  });
};

const buildSidebarTree = (rawCategories = []) => {
  const categories = rawCategories.map((item) => toCategoryNode(item)).filter((item) => item.value);
  const hasChildrenFromApi = categories.some((category) => category.children.length > 0);
  if (hasChildrenFromApi) {
    return categories;
  }

  const isAoDai = (name) => normalizeText(name).startsWith("ao dai");
  const isAoDaiParent = (name) => {
    const normalized = normalizeText(name);
    return normalized === "ao dai cho thue" || normalized === "ao dai";
  };

  const children = [];
  const topLevel = [];

  categories.forEach((category) => {
    if (isAoDai(category.displayName) && !isAoDaiParent(category.displayName)) {
      children.push(category);
      return;
    }
    topLevel.push(category);
  });

  if (children.length === 0) {
    return categories;
  }

  const parentIndex = topLevel.findIndex((category) => isAoDaiParent(category.displayName));
  const parent = parentIndex >= 0 ? topLevel[parentIndex] : null;

  if (parentIndex >= 0) {
    topLevel.splice(parentIndex, 1);
  }

  const mergedChildren = mergeUniqueChildren([...(parent?.children || []), ...children]).sort((a, b) =>
    a.displayName.localeCompare(b.displayName, "vi")
  );

  const groupedParent = {
    value: parent?.value || "__ao_dai_group__",
    displayName: parent?.displayName || "Áo Dài Cho Thuê",
    count: parent?.count || mergedChildren.reduce((sum, item) => sum + item.count, 0),
    slug: parent?.slug || "ao-dai-cho-thue",
    children: mergedChildren,
  };

  return [groupedParent, ...topLevel];
};

const flattenCategories = (nodes = []) => {
  const result = [];

  const visit = (items = []) => {
    items.forEach((node) => {
      result.push(node);
      if (Array.isArray(node.children) && node.children.length > 0) {
        visit(node.children);
      }
    });
  };

  visit(nodes);
  return result;
};

export default function BuyPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    totalItems: 0,
    limit: 24,
  });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");

  const searchKeyword = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return (params.get("q") || "").trim();
  }, [location.search]);

  const categoryKeyword = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return (params.get("category") || "").trim();
  }, [location.search]);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = "vi";
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      try {
        const res = await fetch("/api/categories?lang=vi&purpose=buy");
        const data = res.ok ? await res.json() : { categories: [] };
        if (mounted) {
          setCategories(Array.isArray(data?.categories) ? data.categories : []);
        }
      } catch {
        if (mounted) {
          setCategories([]);
        }
      }
    };

    run();
    return () => {
      mounted = false;
    };
  }, []);

  const categoryTree = useMemo(() => buildSidebarTree(categories), [categories]);
  const allCategoryNodes = useMemo(() => flattenCategories(categoryTree), [categoryTree]);
  const selectedCategoryInfo = useMemo(
    () => allCategoryNodes.find((item) => item.value === selectedCategory) || null,
    [allCategoryNodes, selectedCategory]
  );

  useEffect(() => {
    if (!categoryKeyword || allCategoryNodes.length === 0) return;

    const normalizedKeyword = normalizeText(categoryKeyword);
    const matched = allCategoryNodes.find((item) =>
      [item.value, item.displayName, item.slug].some(
        (candidate) => normalizeText(candidate) === normalizedKeyword
      )
    );

    if (matched?.value) {
      setSelectedCategory((prev) => (prev === matched.value ? prev : matched.value));
    }
  }, [categoryKeyword, allCategoryNodes]);

  const renderCategoryNode = (category, depth = 0) => {
    const hasChildren = category.children.length > 0;

    return (
      <div
        className={`catalog-cat-group ${hasChildren ? "has-children" : ""}`}
        key={category.slug || category.value}
      >
        <button
          className={`catalog-cat-btn ${depth > 0 ? "catalog-cat-child" : ""} ${selectedCategory === category.value ? "active" : ""}`}
          type="button"
          onClick={() => setSelectedCategory(category.value)}
          aria-label={category.displayName}
          aria-haspopup={hasChildren ? "true" : undefined}
          style={depth > 1 ? { paddingLeft: `${16 + depth * 14}px` } : undefined}
        >
          <span>{category.displayName}</span>
          <span className="catalog-cat-meta">
            <small>({category.count || 0})</small>
            {hasChildren && (
              <i className="catalog-caret" aria-hidden="true" />
            )}
          </span>
        </button>

        {hasChildren && (
          <div className="catalog-cat-children">
            {category.children.map((child) => renderCategoryNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          purpose: "buy",
          limit: "24",
          page: String(page),
          lang: "vi",
        });

        if (searchKeyword) {
          params.set("search", searchKeyword);
        }
        if (selectedCategory) {
          params.set("category", selectedCategory);
        }

        const res = await fetch(`/api/products?${params.toString()}`);
        const data = res.ok ? await res.json() : { data: [] };

        if (mounted) {
          setProducts(Array.isArray(data?.data) ? data.data : []);
          setPagination(
            data?.pagination || {
              page: 1,
              totalPages: 1,
              totalItems: 0,
              limit: 24,
            }
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    run();
    return () => {
      mounted = false;
    };
  }, [selectedCategory, page, searchKeyword]);

  useEffect(() => {
    setPage(1);
  }, [selectedCategory, searchKeyword]);

  const display = useMemo(() => {
    const mapped = products.map((item) => {
      const price = Number(item.baseSalePrice || item.baseRentPrice || 0);
      return {
        id: item._id,
        name: item.name,
        imageUrl: item.imageUrl || "",
        createdAt: item.createdAt || "",
        price,
        priceText: `${price.toLocaleString("vi-VN")} ${TEXT.currency}`,
      };
    });

    if (sortBy === "price_asc") mapped.sort((a, b) => a.price - b.price);
    else if (sortBy === "price_desc") mapped.sort((a, b) => b.price - a.price);
    else if (sortBy === "name_asc") mapped.sort((a, b) => a.name.localeCompare(b.name, "vi"));
    else mapped.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

    return mapped;
  }, [products, sortBy]);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(""), 2000);
  };

  const handleToggleFavorite = (event, product) => {
    event.preventDefault();
    event.stopPropagation();

    const result = toggleFavorite(product);
    if (!result.ok && result.reason === "AUTH_REQUIRED") {
      showToast(TEXT.favoriteRequired);
      navigate("/login", { state: { from: location } });
      return;
    }

    showToast(result.added ? TEXT.favoriteAdded : TEXT.favoriteRemoved);
  };

  return (
    <div className="product-page">
      <Header active="buy" />

      <main className="product-page-main">
        <div className="site-shell">
          <section className="catalog-hero">
            <div className="catalog-hero-overlay">
              <h1>{selectedCategoryInfo?.displayName || TEXT.titleDefault}</h1>
              <p>
                {TEXT.breadcrumbHome} / <strong>{selectedCategoryInfo?.displayName || TEXT.allCategories}</strong>
              </p>
            </div>
            <div className="catalog-sort-wrap">
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="newest">{TEXT.sortNewest}</option>
                <option value="price_asc">{TEXT.sortPriceAsc}</option>
                <option value="price_desc">{TEXT.sortPriceDesc}</option>
                <option value="name_asc">{TEXT.sortNameAsc}</option>
              </select>
            </div>
          </section>

          <section className="catalog-layout">
            <aside className="catalog-sidebar">
              <div className="catalog-sidebar-title">{TEXT.sidebarTitle}</div>
              <button
                className={`catalog-cat-btn ${selectedCategory === "" ? "active" : ""}`}
                type="button"
                onClick={() => setSelectedCategory("")}
              >
                <span>{TEXT.allCategories}</span>
              </button>
              {categoryTree.map((category) => renderCategoryNode(category))}
            </aside>

            <div className="catalog-content">
              <p className="catalog-desc">
                {searchKeyword
                  ? TEXT.searchResult(searchKeyword)
                  : selectedCategoryInfo
                    ? TEXT.descByCategory(selectedCategoryInfo.displayName, selectedCategoryInfo.count)
                    : TEXT.descDefault}
              </p>

              {loading && <p className="status-text">{TEXT.loading}</p>}

              <div className="catalog-grid">
                {display.map((product) => (
                  <article className="catalog-card" key={product.id}>
                    <div className="relative">
                      <Link className="catalog-media-link" to={`/products/${product.id}`}>
                        {product.imageUrl ? (
                          <img src={product.imageUrl} alt={product.name} className="catalog-image" />
                        ) : (
                          <div className="catalog-image empty">{TEXT.noImage}</div>
                        )}
                      </Link>
                      <button
                        type="button"
                        className={`absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full border bg-white/95 shadow-sm transition ${isFavorite(product.id)
                          ? "border-rose-300 text-rose-500"
                          : "border-[#eadfce] text-[#7c6a54] hover:text-rose-500"
                          }`}
                        onClick={(event) => handleToggleFavorite(event, product)}
                        aria-label={TEXT.favoriteLabel}
                      >
                        <Heart size={17} fill={isFavorite(product.id) ? "currentColor" : "none"} />
                      </button>
                    </div>

                    <div className="catalog-body">
                      <h3 className="catalog-name">
                        <Link className="catalog-name-link" to={`/products/${product.id}`}>
                          {product.name}
                        </Link>
                      </h3>
                      <p className="catalog-price">{product.priceText}</p>
                      <div className="catalog-actions">
                        <button className="catalog-btn" type="button" onClick={() => navigate(`/products/${product.id}`)}>
                          {TEXT.rent}
                        </button>
                        <button className="catalog-btn buy" type="button" onClick={() => navigate(`/products/${product.id}`)}>
                          {TEXT.buy}
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <div className="pagination-wrap">
                <button
                  type="button"
                  className="page-btn"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  {TEXT.prev}
                </button>
                <span className="page-info">
                  {TEXT.page} {pagination.page} / {pagination.totalPages}
                </span>
                <button
                  type="button"
                  className="page-btn"
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage((current) => Math.min(pagination.totalPages, current + 1))}
                >
                  {TEXT.next}
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>

      {toast && (
        <div className="fixed right-4 top-24 z-50 rounded-xl border border-white/10 bg-neutral-900 px-4 py-3 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
