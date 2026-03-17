import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Heart } from "lucide-react";
import Header from "../../components/common/Header";
import { useFavorites } from "../../contexts/FavoritesContext";
import "../../style/pages/ProductPages.css";
import { useTranslationDisplay } from "../../hooks/useTranslationDisplay";

const I18N = {
  vi: {
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
  },
  en: {
    titleDefault: "Product Categories",
    breadcrumbHome: "Home",
    allCategories: "All categories",
    sortNewest: "Sort by newest",
    sortPriceAsc: "Price: low to high",
    sortPriceDesc: "Price: high to low",
    sortNameAsc: "Name A-Z",
    sidebarTitle: "PRODUCT CATEGORIES",
    descByCategory: (name, count) => `Category ${name} currently has ${count} products.`,
    descDefault: "Choose a category on the left to filter products quickly.",
    loading: "Loading products...",
    noImage: "No image from API",
    rent: "Rent",
    buy: "Buy",
    prev: "Prev",
    next: "Next",
    page: "Page",
    currency: "VND",
    showChildren: "Expand subcategories",
    hideChildren: "Collapse subcategories",
  },
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

const buildSidebarTree = (rawCategories = [], lang = "vi") => {
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
  const parentLabel = lang === "vi" ? "Áo Dài Cho Thuê" : "Ao Dai Rental";
  const parent = parentIndex >= 0 ? topLevel[parentIndex] : null;
  if (parentIndex >= 0) {
    topLevel.splice(parentIndex, 1);
  }

  const mergedChildren = mergeUniqueChildren([...(parent?.children || []), ...children]).sort((a, b) =>
    a.displayName.localeCompare(b.displayName, "vi")
  );

  const groupedParent = {
    value: parent?.value || "__ao_dai_group__",
    displayName: parent?.displayName || parentLabel,
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
  const lang = "vi";
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [expanded, setExpanded] = useState({});
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
  const [translatedTextMap, setTranslatedTextMap] = useState({});
  const searchKeyword = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return (params.get("q") || "").trim();
  }, [location.search]);
  const categoryKeyword = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return (params.get("category") || "").trim();
  }, [location.search]);

  const t = I18N[lang] || I18N.vi;
  const { translateFields } = useTranslationDisplay(lang);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = "vi";
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        const params = new URLSearchParams({ lang });
        const res = await fetch(`/api/categories?${params.toString()}`);
        const data = res.ok ? await res.json() : { categories: [] };
        if (mounted) {
          setCategories(Array.isArray(data?.categories) ? data.categories : []);
        }
      } catch {
        if (mounted) setCategories([]);
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, [lang]);

  const categoryTree = useMemo(() => buildSidebarTree(categories, lang), [categories, lang]);
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

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      if (lang !== "en") {
        if (mounted) setTranslatedTextMap({});
        return;
      }

      const rawTexts = [
        ...flattenCategories(categoryTree).map((item) => item.displayName),
        ...products.flatMap((item) => [item?.name, item?.category]),
      ]
        .map((text) => String(text || "").trim())
        .filter(Boolean);

      const uniqueTexts = Array.from(new Set(rawTexts));
      if (uniqueTexts.length === 0) {
        if (mounted) setTranslatedTextMap({});
        return;
      }

      const fields = uniqueTexts.map((text, index) => ({ id: `buy_${index}`, text }));
      const translated = await translateFields(fields, { source: "vi", target: "en" });
      if (!mounted) return;

      const nextMap = {};
      uniqueTexts.forEach((text, index) => {
        nextMap[text] = translated[`buy_${index}`] || text;
      });
      setTranslatedTextMap(nextMap);
    };
    run();
    return () => {
      mounted = false;
    };
  }, [lang, categoryTree, products, translateFields]);

  const translateDisplay = (text) => {
    const raw = String(text || "").trim();
    if (!raw) return "";
    if (lang !== "en") return raw;
    return translatedTextMap[raw] || raw;
  };

  const renderCategoryNode = (category, depth = 0) => {
    const hasChildren = category.children.length > 0;
    const isOpen = Boolean(expanded[category.value]);

    return (
      <div className="catalog-cat-group" key={category.slug || category.value}>
        <button
          className={`catalog-cat-btn ${depth > 0 ? "catalog-cat-child" : ""} ${selectedCategory === category.value ? "active" : ""}`}
          type="button"
          onClick={() =>
            hasChildren ? toggleGroup(category.value) : setSelectedCategory(category.value)
          }
          aria-label={hasChildren && !isOpen ? t.showChildren : t.hideChildren}
          style={depth > 1 ? { paddingLeft: `${16 + depth * 14}px` } : undefined}
        >
          <span>{translateDisplay(category.displayName)}</span>
          <span className="catalog-cat-meta">
            <small>({category.count || 0})</small>
            {hasChildren && (
              <i className={`catalog-caret ${isOpen ? "open" : ""}`} aria-hidden="true" />
            )}
          </span>
        </button>

        {hasChildren && isOpen && (
          <div className="catalog-cat-children">
            {category.children.map((child) => renderCategoryNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  useEffect(() => {
    const nextExpanded = {};
    categoryTree.forEach((node) => {
      if (node.children.length > 0) {
        nextExpanded[node.value] = true;
      }
    });
    setExpanded(nextExpanded);
  }, [categoryTree]);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          purpose: "buy",
          limit: "24",
          page: String(page),
          lang,
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
        if (mounted) setLoading(false);
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, [selectedCategory, page, lang, searchKeyword]);

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
        priceText: `${price.toLocaleString("vi-VN")} ${t.currency}`,
      };
    });

    if (sortBy === "price_asc") mapped.sort((a, b) => a.price - b.price);
    else if (sortBy === "price_desc") mapped.sort((a, b) => b.price - a.price);
    else if (sortBy === "name_asc") mapped.sort((a, b) => a.name.localeCompare(b.name, "vi"));
    else mapped.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    return mapped;
  }, [products, sortBy, t.currency]);

  const toggleGroup = (value) => {
    setExpanded((prev) => ({ ...prev, [value]: !prev[value] }));
  };

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(""), 2000);
  };

  const handleToggleFavorite = (event, product) => {
    event.preventDefault();
    event.stopPropagation();

    const result = toggleFavorite(product);
    if (!result.ok && result.reason === "AUTH_REQUIRED") {
      showToast("Vui long dang nhap de them san pham yeu thich");
      navigate("/login", { state: { from: location } });
      return;
    }

    showToast(result.added ? "Da them vao san pham yeu thich" : "Da xoa khoi san pham yeu thich");
  };

  return (
    <div className="product-page">
      <Header active="buy" />

      <main className="product-page-main">
        <div className="site-shell">
          <section className="catalog-hero">
            <div className="catalog-hero-overlay">
              <h1>{translateDisplay(selectedCategoryInfo?.displayName) || t.titleDefault}</h1>
              <p>
                {t.breadcrumbHome} /{" "}
                <strong>{translateDisplay(selectedCategoryInfo?.displayName) || t.allCategories}</strong>
              </p>
            </div>
            <div className="catalog-sort-wrap">
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="newest">{t.sortNewest}</option>
                <option value="price_asc">{t.sortPriceAsc}</option>
                <option value="price_desc">{t.sortPriceDesc}</option>
                <option value="name_asc">{t.sortNameAsc}</option>
              </select>
            </div>
          </section>

          <section className="catalog-layout">
            <aside className="catalog-sidebar">
              <div className="catalog-sidebar-title">{t.sidebarTitle}</div>
              <button
                className={`catalog-cat-btn ${selectedCategory === "" ? "active" : ""}`}
                type="button"
                onClick={() => setSelectedCategory("")}
              >
                <span>{t.allCategories}</span>
              </button>
              {categoryTree.map((category) => renderCategoryNode(category))}
            </aside>

            <div className="catalog-content">
              <p className="catalog-desc">
                {searchKeyword
                  ? `Kết quả tìm kiếm cho "${searchKeyword}".`
                  : selectedCategoryInfo
                  ? t.descByCategory(
                    translateDisplay(selectedCategoryInfo.displayName),
                    selectedCategoryInfo.count
                  )
                  : t.descDefault}
              </p>

              {loading && <p className="status-text">{t.loading}</p>}

              <div className="catalog-grid">
                {display.map((p) => (
                  <article className="catalog-card" key={p.id}>
                    <div className="relative">
                      <Link className="catalog-media-link" to={`/products/${p.id}`}>
                        {p.imageUrl ? (
                          <img src={p.imageUrl} alt={p.name} className="catalog-image" />
                        ) : (
                          <div className="catalog-image empty">{t.noImage}</div>
                        )}
                      </Link>
                      <button
                        type="button"
                        className={`absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full border bg-white/95 shadow-sm transition ${isFavorite(p.id)
                          ? "border-rose-300 text-rose-500"
                          : "border-[#eadfce] text-[#7c6a54] hover:text-rose-500"
                          }`}
                        onClick={(event) => handleToggleFavorite(event, p)}
                        aria-label="Them vao yeu thich"
                      >
                        <Heart size={17} fill={isFavorite(p.id) ? "currentColor" : "none"} />
                      </button>
                    </div>
                    <div className="catalog-body">
                      <h3 className="catalog-name">
                        <Link className="catalog-name-link" to={`/products/${p.id}`}>
                          {translateDisplay(p.name)}
                        </Link>
                      </h3>
                      <p className="catalog-price">{p.priceText}</p>
                      <div className="catalog-actions">
                        <button className="catalog-btn" type="button" onClick={() => navigate(`/products/${p.id}`)}>
                          {t.rent}
                        </button>
                        <button className="catalog-btn buy" type="button" onClick={() => navigate(`/products/${p.id}`)}>
                          {t.buy}
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
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  {t.prev}
                </button>
                <span className="page-info">
                  {t.page} {pagination.page} / {pagination.totalPages}
                </span>
                <button
                  type="button"
                  className="page-btn"
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                >
                  {t.next}
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
