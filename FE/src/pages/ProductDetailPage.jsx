import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Header from "../components/Header";
import "./ProductDetailPage.css";

const I18N = {
  vi: {
    back: "Quay lại danh sách",
    notFound: "Không tìm thấy sản phẩm",
    loading: "Đang tải chi tiết sản phẩm...",
    category: "Danh mục",
    size: "Kích thước",
    color: "Màu sắc",
    rentPrice: "Giá thuê",
    salePrice: "Giá bán",
    description: "Mô tả",
    rent: "Thuê",
    buy: "Mua",
    noImage: "Chưa có ảnh",
    breadcrumbHome: "Trang chủ",
    breadcrumbBuy: "Mua trang phục",
    currency: "đ",
  },
  en: {
    back: "Back to list",
    notFound: "Product not found",
    loading: "Loading product details...",
    category: "Category",
    size: "Size",
    color: "Color",
    rentPrice: "Rent price",
    salePrice: "Sale price",
    description: "Description",
    rent: "Rent",
    buy: "Buy",
    noImage: "No image",
    breadcrumbHome: "Home",
    breadcrumbBuy: "Buy outfits",
    currency: "VND",
  },
};

export default function ProductDetailPage() {
  const { id } = useParams();
  const [lang, setLang] = useState(
    typeof window !== "undefined" ? window.localStorage.getItem("lang") || "vi" : "vi"
  );
  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState(null);
  const [activeImage, setActiveImage] = useState(0);
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
        setLoading(true);
        const res = await fetch(`/api/products/${id}`);
        const data = res.ok ? await res.json() : { data: null };
        if (mounted) {
          setProduct(data?.data || null);
          setActiveImage(0);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, [id]);

  const images = useMemo(() => {
    if (!product) return [];
    if (Array.isArray(product.images) && product.images.length > 0) return product.images;
    if (product.imageUrl) return [product.imageUrl];
    return [];
  }, [product]);

  const activeImageUrl = images[activeImage] || "";
  const formatPrice = (value) => `${Number(value || 0).toLocaleString("vi-VN")} ${t.currency}`;

  return (
    <div className="product-detail-page">
      <Header lang={lang} setLang={setLang} />
      <main className="detail-shell">
        <div className="detail-breadcrumb">
          <Link to="/">{t.breadcrumbHome}</Link>
          <span>/</span>
          <Link to="/buy">{t.breadcrumbBuy}</Link>
          <span>/</span>
          <strong>{product?.name || id}</strong>
        </div>

        <Link className="detail-back-link" to="/buy">
          {"<"} {t.back}
        </Link>

        {loading && <p className="detail-status">{t.loading}</p>}
        {!loading && !product && <p className="detail-status">{t.notFound}</p>}

        {!loading && product && (
          <section className="detail-grid">
            <div className="detail-gallery">
              <div className="detail-main-image-wrap">
                {activeImageUrl ? (
                  <img src={activeImageUrl} alt={product.name} className="detail-main-image" />
                ) : (
                  <div className="detail-main-image empty">{t.noImage}</div>
                )}
              </div>

              {images.length > 1 && (
                <div className="detail-thumbs">
                  {images.map((img, i) => (
                    <button
                      key={`${img.slice(0, 24)}-${i}`}
                      className={`detail-thumb ${i === activeImage ? "active" : ""}`}
                      onClick={() => setActiveImage(i)}
                      type="button"
                    >
                      <img src={img} alt={`${product.name}-${i + 1}`} />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="detail-info">
              <h1>{product.name}</h1>

              <div className="detail-meta-grid">
                <div>
                  <span>{t.category}</span>
                  <strong>{product.category || "-"}</strong>
                </div>
                <div>
                  <span>{t.size}</span>
                  <strong>{product.size || "-"}</strong>
                </div>
                <div>
                  <span>{t.color}</span>
                  <strong>{product.color || "-"}</strong>
                </div>
                <div>
                  <span>{t.rentPrice}</span>
                  <strong>{formatPrice(product.baseRentPrice)}</strong>
                </div>
                <div>
                  <span>{t.salePrice}</span>
                  <strong>{formatPrice(product.baseSalePrice)}</strong>
                </div>
              </div>

              <div className="detail-description">
                <h3>{t.description}</h3>
                <p>{product.description || "-"}</p>
              </div>

              <div className="detail-actions">
                <button type="button">{t.rent}</button>
                <button type="button" className="buy">
                  {t.buy}
                </button>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
