import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header";
import "./ProductPages.css";

export default function BookingPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    totalItems: 0,
    limit: 16,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        const res = await fetch("/api/categories");
        const data = res.ok ? await res.json() : { categories: [] };
        const names = Array.isArray(data?.categories)
          ? data.categories.map((c) => c.displayName).filter(Boolean)
          : [];
        if (mounted) {
          setCategories([...new Set(names)]);
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
          purpose: "fitting",
          limit: "16",
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
              limit: 16,
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

  const display = useMemo(
    () =>
      products.map((item) => ({
        id: item._id,
        name: item.name,
        imageUrl: item.imageUrl || "",
        meta: `${item.category} • Thuê từ ${Number(item.baseRentPrice || 0).toLocaleString(
          "vi-VN"
        )} đ/ngày`,
      })),
    [products]
  );

  const onSubmit = (e) => {
    e.preventDefault();
    alert("Đã ghi nhận lịch thử đồ.");
  };

  return (
    <div className="product-page">
      <Header active="booking" />

      <main className="product-page-main">
        <div className="site-shell">
          <div className="booking-layout">
            <section className="booking-panel">
              <h1 className="page-title">Đặt lịch thử đồ</h1>
              <p className="page-sub">Trang riêng cho đặt lịch và danh sách sản phẩm thử đồ.</p>
            </section>
            <form className="booking-panel booking-form" onSubmit={onSubmit}>
              <input type="date" required />
              <input type="time" required />
              <input type="number" min="1" defaultValue="1" required />
              <button type="submit">Đặt lịch</button>
            </form>
          </div>
          <div className="filter-row">
            <label htmlFor="booking-category">Danh mục</label>
            <select
              id="booking-category"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="">Tất cả danh mục</option>
              {categories.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          {loading && <p className="status-text">Đang tải danh sách...</p>}
          <div className="product-grid">
            {display.map((p) => (
              <article className="product-card" key={p.id}>
                <Link className="catalog-media-link" to={`/products/${p.id}`}>
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt={p.name} className="product-image" />
                  ) : (
                    <div className="product-image empty">Không có ảnh từ API</div>
                  )}
                </Link>
                <div className="product-body">
                  <h3 className="product-name">
                    <Link className="catalog-name-link" to={`/products/${p.id}`}>
                      {p.name}
                    </Link>
                  </h3>
                  <p className="product-meta">{p.meta}</p>
                  <div className="catalog-actions">
                    <button className="catalog-btn" type="button">
                      Thuê
                    </button>
                    <button className="catalog-btn buy" type="button">
                      Mua
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
              Trước
            </button>
            <span className="page-info">
              Trang {pagination.page} / {pagination.totalPages}
            </span>
            <button
              type="button"
              className="page-btn"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
            >
              Sau
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
