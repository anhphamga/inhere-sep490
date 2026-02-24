import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header";
import "./ProductPages.css";

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
  },
};

export default function BuyPage() {
  const [lang, setLang] = useState(
    typeof window !== "undefined" ? window.localStorage.getItem("lang") || "vi" : "vi"
  );
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

  const t = I18N[lang] || I18N.vi;

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("lang", lang);
    }
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang;
    }
  }, [lang]);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        const res = await fetch("/api/categories");
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
  }, []);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          purpose: "buy",
          limit: "24",
          page: String(page),
        });
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
  }, [selectedCategory, page]);

  useEffect(() => {
    setPage(1);
  }, [selectedCategory]);

  const selectedCategoryInfo = useMemo(
    () => categories.find((c) => c.displayName === selectedCategory) || null,
    [categories, selectedCategory]
  );

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

  return (
    <div className="product-page">
      <Header active="buy" lang={lang} setLang={setLang} />

      <main className="product-page-main">
        <div className="site-shell">
          <section className="catalog-hero">
            <div className="catalog-hero-overlay">
              <h1>{selectedCategory || t.titleDefault}</h1>
              <p>
                {t.breadcrumbHome} / <strong>{selectedCategory || t.allCategories}</strong>
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
              {categories.map((category) => (
                <button
                  key={category.slug || category.displayName}
                  className={`catalog-cat-btn ${
                    selectedCategory === category.displayName ? "active" : ""
                  }`}
                  type="button"
                  onClick={() => setSelectedCategory(category.displayName)}
                >
                  <span>{category.displayName}</span>
                  <small>({category.count || 0})</small>
                </button>
              ))}
            </aside>

            <div className="catalog-content">
              <p className="catalog-desc">
                {selectedCategoryInfo
                  ? t.descByCategory(selectedCategoryInfo.displayName, selectedCategoryInfo.count)
                  : t.descDefault}
              </p>

              {loading && <p className="status-text">{t.loading}</p>}

              <div className="catalog-grid">
                {display.map((p) => (
                  <article className="catalog-card" key={p.id}>
                    <Link className="catalog-media-link" to={`/products/${p.id}`}>
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt={p.name} className="catalog-image" />
                      ) : (
                        <div className="catalog-image empty">{t.noImage}</div>
                      )}
                    </Link>
                    <div className="catalog-body">
                      <h3 className="catalog-name">
                        <Link className="catalog-name-link" to={`/products/${p.id}`}>
                          {p.name}
                        </Link>
                      </h3>
                      <p className="catalog-price">{p.priceText}</p>
                      <div className="catalog-actions">
                        <button className="catalog-btn" type="button">
                          {t.rent}
                        </button>
                        <button className="catalog-btn buy" type="button">
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
    </div>
  );
}
