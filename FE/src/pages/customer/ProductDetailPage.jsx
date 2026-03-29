import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import Header from "../../components/common/Header";
import ProductGallery from "../../components/product-detail/ProductGallery";
import ProductInfo from "../../components/product-detail/ProductInfo";
import VariantSelector from "../../components/product-detail/VariantSelector";
import ProductActions from "../../components/product-detail/ProductActions";
import ProductDescription from "../../components/product-detail/ProductDescription";
import RelatedProducts from "../../components/product-detail/RelatedProducts";
import ReviewList from "../../components/review/ReviewList";
import ReviewSummary from "../../components/review/ReviewSummary";
import { useBuyCart } from "../../contexts/BuyCartContext";
import { useFavorites } from "../../contexts/FavoritesContext";
import { useRentalCart } from "../../contexts/RentalCartContext";
import { getProductReviewsApi } from "../../services/review.service";

const I18N = {
  vi: {
    back: "Quay lại danh sách",
    notFound: "Không tìm thấy sản phẩm",
    loading: "Đang tải chi tiết sản phẩm...",
    breadcrumbHome: "Trang chủ",
    breadcrumbBuy: "Mua trang phục",
    toastRent: "Đã thêm vào đơn thuê",
    toastBuy: "Đã thêm vào giỏ hàng",
    toastFavoriteAdded: "Đã thêm vào danh sách yêu thích",
    toastFavoriteRemoved: "Đã xóa khỏi danh sách yêu thích",
    toastFavoriteLogin: "Vui lòng đăng nhập để thêm sản phẩm yêu thích",
    toastError: "Vui lòng chọn biến thể hợp lệ",
    policyTitle: "Chính sách",
    policyDeposit: "Đặt cọc 50% khi giữ lịch",
    policySwap: "Hỗ trợ đổi size/màu theo tồn kho",
    policyTime: "Nhận và trả theo khung giờ đã hẹn",
  },
  en: {
    back: "Back to list",
    notFound: "Product not found",
    loading: "Loading product details...",
    breadcrumbHome: "Home",
    breadcrumbBuy: "Buy outfits",
    toastRent: "Added to rental flow",
    toastBuy: "Added to cart",
    toastFavoriteAdded: "Added to favorites",
    toastFavoriteRemoved: "Removed from favorites",
    toastFavoriteLogin: "Please log in to add favorite products",
    toastError: "Please select a valid variant",
    policyTitle: "Policies",
    policyDeposit: "50% deposit for booking",
    policySwap: "Size/color swap depends on stock",
    policyTime: "Pickup/return by booked time slot",
  },
};

const SWATCH_CLASS_MAP = {
  den: "bg-neutral-900",
  do: "bg-red-600",
  vang: "bg-yellow-400",
  xanh: "bg-blue-600",
  xanhduong: "bg-blue-700",
  xanhla: "bg-green-600",
  trang: "bg-white",
  hong: "bg-pink-400",
  tim: "bg-purple-600",
  nau: "bg-amber-700",
  xam: "bg-neutral-500",
};

const normalize = (value = "") =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");

const parseList = (value = "") =>
  String(value || "")
    .split(/[|,;/]/)
    .map((item) => item.trim())
    .filter(Boolean);

const uniq = (list = []) => Array.from(new Set(list.filter(Boolean)));

const isFreeSizeValue = (value = "") => {
  const n = normalize(value);
  return n === "freesize" || n === "free" || n === "onesize" || n === "motco";
};

const formatCurrency = (value, lang = "vi") => {
  const amount = Number(value || 0);
  if (lang === "en") return `${amount.toLocaleString("en-US")} VND`;
  return `${amount.toLocaleString("vi-VN")}đ`;
};

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { addItem } = useRentalCart();
  const { addItem: addBuyItem } = useBuyCart();
  const { isFavorite, toggleFavorite } = useFavorites();
  const lang = "vi";
  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState(null);
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState("");
  const [toast, setToast] = useState("");
  const [reviews, setReviews] = useState([]);
  const [reviewSummary, setReviewSummary] = useState({ averageRating: 0, reviewCount: 0, breakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } });
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewFilter, setReviewFilter] = useState("all");
  const [reviewPagination, setReviewPagination] = useState({ page: 1, pages: 1, total: 0, limit: 5 });

  // Date selection modal state
  const [showDateModal, setShowDateModal] = useState(false);
  const [rentStartDate, setRentStartDate] = useState("");
  const [rentEndDate, setRentEndDate] = useState("");
  const [rentStartTime, setRentStartTime] = useState("09:00");
  const [rentEndTime, setRentEndTime] = useState("09:00");

  const t = I18N[lang] || I18N.vi;

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = "vi";
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/products/${id}`);
        const data = res.ok ? await res.json() : { data: null };
        if (!mounted) return;
        setProduct(data?.data || null);
        setSelectedImageIndex(0);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    run();
    return () => {
      mounted = false;
    };
  }, [id]);

  const baseImages = useMemo(() => {
    if (!product) return [];
    if (Array.isArray(product.images) && product.images.length > 0) return uniq(product.images.map(String));
    if (product.imageUrl) return [String(product.imageUrl)];
    return [];
  }, [product]);

  const sizes = useMemo(() => {
    if (!product) return [];
    if (Array.isArray(product.sizes) && product.sizes.length > 0) return uniq(product.sizes.map(String));
    return uniq(parseList(product.size));
  }, [product]);

  const isFreeSize = useMemo(() => {
    if (sizes.length !== 1) return false;
    return isFreeSizeValue(sizes[0]);
  }, [sizes]);

  const colors = useMemo(() => {
    if (!product) return [];
    const fromVariants = Array.isArray(product.colorVariants)
      ? product.colorVariants
        .map((variant) => String(variant?.name || variant?.color || "").trim())
        .filter(Boolean)
      : [];
    if (fromVariants.length > 0) return uniq(fromVariants);
    const fromString = uniq(parseList(product.color));
    if (fromString.length > 0) return fromString;
    return ["Default"];
  }, [product]);

  const imagesByColor = useMemo(() => {
    const map = {};
    if (!product) return map;

    if (Array.isArray(product.colorVariants) && product.colorVariants.length > 0) {
      product.colorVariants.forEach((variant) => {
        const color = String(variant?.name || variant?.color || "").trim();
        if (!color) return;
        const images = Array.isArray(variant?.images)
          ? variant.images.map(String).filter(Boolean)
          : [];
        map[color] = images.length > 0 ? uniq(images) : baseImages;
      });
    }

    if (Object.keys(map).length === 0) {
      colors.forEach((color) => {
        map[color] = baseImages;
      });
    }

    return map;
  }, [product, colors, baseImages]);

  const hasVariantPricing = useMemo(() => {
    const pricing = product?.variantRentPrices;
    return Boolean(pricing && typeof pricing === "object" && Object.keys(pricing).length > 0);
  }, [product]);

  const isVariantAvailable = useCallback((size, color) => {
    if (!hasVariantPricing) return true;
    if (isFreeSize) {
      return product?.variantRentPrices?.[`FREE SIZE__${color}`] != null || product?.variantRentPrices?.[`Free Size__${color}`] != null;
    }
    if (!size || !color) return false;
    return product?.variantRentPrices?.[`${size}__${color}`] != null;
  }, [hasVariantPricing, isFreeSize, product?.variantRentPrices]);

  useEffect(() => {
    if (!colors.length) return;
    if (!selectedColor || !colors.includes(selectedColor)) {
      setSelectedColor(colors[0]);
      return;
    }

    if (!isFreeSize && selectedSize && !isVariantAvailable(selectedSize, selectedColor)) {
      const fallback = sizes.find((size) => isVariantAvailable(size, selectedColor));
      if (fallback) setSelectedSize(fallback);
    }
  }, [colors, selectedColor, selectedSize, sizes, isFreeSize, isVariantAvailable]);

  useEffect(() => {
    if (!sizes.length) return;
    if (isFreeSize) {
      setSelectedSize("FREE SIZE");
      return;
    }

    if (!selectedSize || !sizes.includes(selectedSize)) {
      setSelectedSize(sizes[0]);
    }
  }, [sizes, selectedSize, isFreeSize]);

  useEffect(() => {
    setSelectedImageIndex(0);
  }, [selectedColor]);

  const currentImagesByColor = useMemo(() => {
    return imagesByColor[selectedColor] || baseImages;
  }, [imagesByColor, selectedColor, baseImages]);

  const productIsFavorite = useMemo(() => {
    if (!product?._id) return false;
    return isFavorite(product._id);
  }, [isFavorite, product?._id]);

  useEffect(() => {
    if (selectedImageIndex < currentImagesByColor.length) return;
    setSelectedImageIndex(0);
  }, [selectedImageIndex, currentImagesByColor]);

  const currentRentPrice = useMemo(() => {
    if (!product) return 0;
    if (!hasVariantPricing) return Number(product.baseRentPrice || 0);

    if (isFreeSize) {
      const freeKeys = [`FREE SIZE__${selectedColor}`, `Free Size__${selectedColor}`];
      const matchKey = freeKeys.find((key) => product.variantRentPrices?.[key] != null);
      if (matchKey) return Number(product.variantRentPrices[matchKey] || 0);
      return Number(product.baseRentPrice || 0);
    }

    const key = `${selectedSize}__${selectedColor}`;
    if (product.variantRentPrices?.[key] != null) {
      return Number(product.variantRentPrices[key] || 0);
    }

    return Number(product.baseRentPrice || 0);
  }, [product, hasVariantPricing, isFreeSize, selectedSize, selectedColor]);

  const canSubmit = useMemo(() => {
    if (!product) return false;
    if (!selectedColor) return false;
    if (!isFreeSize && sizes.length > 0 && !selectedSize) return false;
    if (!isFreeSize && selectedSize && !isVariantAvailable(selectedSize, selectedColor)) return false;
    return true;
  }, [product, selectedColor, selectedSize, isFreeSize, sizes, isVariantAvailable]);

  const canBuy = useMemo(
    () => canSubmit && Number(product?.baseSalePrice || 0) > 0,
    [canSubmit, product?.baseSalePrice]
  );

  useEffect(() => {
    if (!product?._id) return;
    let mounted = true;
    const run = async () => {
      try {
        setRelatedLoading(true);
        const params = new URLSearchParams({ limit: "4" });
        const res = await fetch(`/api/products/${product._id}/similar?${params.toString()}`);
        const data = res.ok ? await res.json() : { data: [] };
        if (!mounted) return;
        const items = Array.isArray(data?.data) ? data.data : [];
        setRelatedProducts(items.filter((item) => item?._id && item._id !== product._id).slice(0, 4));
      } catch {
        if (mounted) setRelatedProducts([]);
      } finally {
        if (mounted) setRelatedLoading(false);
      }
    };

    run();
    return () => {
      mounted = false;
    };
  }, [product?._id]);

  const fetchReviews = useCallback(async ({ page = 1, append = false, starFilter = reviewFilter } = {}) => {
    if (!product?._id) return;

    try {
      setReviewLoading(true);
      const params = {
        page,
        limit: 5,
      };
      if (starFilter !== "all") {
        params.rating = Number(starFilter);
      }

      const response = await getProductReviewsApi(product._id, params);
      const items = Array.isArray(response?.data) ? response.data : [];

      setReviewSummary(response?.summary || { averageRating: 0, reviewCount: 0, breakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } });
      setReviewPagination(response?.pagination || { page: 1, pages: 1, total: 0, limit: 5 });
      setReviews((prev) => (append ? [...prev, ...items] : items));
    } catch (error) {
      console.error("Fetch reviews error:", error);
      if (!append) {
        setReviews([]);
      }
    } finally {
      setReviewLoading(false);
    }
  }, [product?._id, reviewFilter]);

  useEffect(() => {
    if (!product?._id) return;
    fetchReviews({ page: 1, append: false, starFilter: reviewFilter });
  }, [fetchReviews, product?._id, reviewFilter]);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(""), 2000);
  };

  const handleLoadMoreReviews = () => {
    const nextPage = Number(reviewPagination?.page || 1) + 1;
    if (nextPage > Number(reviewPagination?.pages || 1)) return;
    fetchReviews({ page: nextPage, append: true, starFilter: reviewFilter });
  };

  const today = useMemo(() => new Date().toISOString().split("T")[0], []);

  const rentStartDateTime = useMemo(() => {
    if (!rentStartDate || !rentStartTime) return null;
    return new Date(`${rentStartDate}T${rentStartTime}`);
  }, [rentStartDate, rentStartTime]);

  const rentEndDateTime = useMemo(() => {
    if (!rentEndDate || !rentEndTime) return null;
    return new Date(`${rentEndDate}T${rentEndTime}`);
  }, [rentEndDate, rentEndTime]);

  const rentalDays = useMemo(() => {
    if (!rentStartDateTime || !rentEndDateTime) return 0;
    const diffMs = rentEndDateTime - rentStartDateTime;
    if (diffMs <= 0) return 0;
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  }, [rentEndDateTime, rentStartDateTime]);

  const totalRentPrice = useMemo(() => {
    if (!rentalDays) return 0;
    return rentalDays * currentRentPrice;
  }, [rentalDays, currentRentPrice]);

  const resetRentModal = useCallback(() => {
    setShowDateModal(false);
    setRentStartDate("");
    setRentEndDate("");
    setRentStartTime("09:00");
    setRentEndTime("09:00");
  }, []);

  const handleRent = async () => {
    if (!canSubmit) {
      showToast(t.toastError);
      return;
    }
    // Hiển thị modal chọn ngày trước
    if (!rentStartDate) setRentStartDate(today);
    if (!rentEndDate) setRentEndDate(today);
    setShowDateModal(true);
  };

  const handleConfirmRent = async () => {
    if (!rentStartDate || !rentEndDate) {
      showToast('Vui lòng chọn ngày thuê');
      return;
    }

    if (new Date(rentStartDate) > new Date(rentEndDate)) {
      showToast('Ngày kết thúc phải lớn hơn ngày bắt đầu');
      return;
    }

    if (!rentStartDateTime || !rentEndDateTime || rentEndDateTime <= rentStartDateTime) {
      showToast("Thời gian trả phải sau thời gian nhận");
      return;
    }

    setLoadingAction("rent");
    try {
      // Tạo datetime string với giờ
      const startDateTime = rentStartDate && rentStartTime ? `${rentStartDate}T${rentStartTime}:00` : rentStartDate;
      const endDateTime = rentEndDate && rentEndTime ? `${rentEndDate}T${rentEndTime}:00` : rentEndDate;

      // Thêm sản phẩm vào giỏ thuê với thông tin ngày và giờ
      addItem(product, {
        color: selectedColor,
        size: selectedSize,
        rentPrice: currentRentPrice,
        productInstanceId: null,
        rentStartDate: startDateTime,
        rentEndDate: endDateTime
      });
      showToast(t.toastRent);
      // Đóng modal và chuyển đến trang checkout
      resetRentModal();
      navigate('/cart');
    } catch {
      showToast('Có lỗi xảy ra');
    } finally {
      setLoadingAction("");
    }
  };

  const handleBuy = async () => {
    if (!canSubmit) {
      showToast(t.toastError);
      return;
    }
    if (!canBuy) {
      showToast(lang === "en" ? "This product is not available for purchase" : "Sản phẩm này hiện chưa hỗ trợ mua");
      return;
    }
    setLoadingAction("buy");
    try {
      addBuyItem(product, {
        color: selectedColor,
        size: selectedSize,
        salePrice: product.baseSalePrice,
        quantity: 1
      });
      showToast(t.toastBuy);
      navigate("/cart");
    } finally {
      setLoadingAction("");
    }
  };

  const handleToggleFavorite = () => {
    if (!product?._id) return;

    const result = toggleFavorite({
      id: product._id,
      name: product.name,
      imageUrl: currentImagesByColor[0] || product.imageUrl || "",
      price: Number(product.baseSalePrice || product.baseRentPrice || 0),
    });

    if (!result.ok && result.reason === "AUTH_REQUIRED") {
      showToast(t.toastFavoriteLogin);
      navigate("/login", { state: { from: location } });
      return;
    }

    showToast(result.added ? t.toastFavoriteAdded : t.toastFavoriteRemoved);
  };

  const getSwatchClass = (color) => {
    const key = normalize(color);
    const match = Object.keys(SWATCH_CLASS_MAP).find((item) => key.includes(item));
    return match ? SWATCH_CLASS_MAP[match] : "bg-neutral-300";
  };

  const badges = useMemo(() => {
    const list = ["Có sẵn"];
    if (isFreeSize) list.push("Free size");
    if (product?.isBestSeller) list.push("Best seller");
    if (product?.isNew) list.push("Mới");
    return list;
  }, [product?.isBestSeller, product?.isNew, isFreeSize]);

  return (
    <div className="min-h-screen bg-white pb-24 md:pb-10">
      <Header />

      <main className="isolate w-full px-4 py-4 md:px-8 md:py-6">
        <div className="mx-auto w-full max-w-7xl">
          <nav className="mb-4 flex items-center gap-1.5 text-[13px] text-slate-400">
            <Link to="/" className="hover:text-slate-700">{t.breadcrumbHome}</Link>
            <span>/</span>
            <Link to="/buy" className="hover:text-slate-700">{t.breadcrumbBuy}</Link>
            <span>/</span>
            <span className="max-w-50 truncate text-slate-600">{product?.name || id}</span>
          </nav>

          {loading && <p className="text-sm text-neutral-500">{t.loading}</p>}
          {!loading && !product && <p className="text-sm text-neutral-500">{t.notFound}</p>}

          {!loading && product && (
            <div className="space-y-4">
              {/* Product Section: Gallery + Info */}
              <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_400px] lg:gap-8">
                <ProductGallery
                  images={currentImagesByColor}
                  activeIndex={selectedImageIndex}
                  onSelectImage={setSelectedImageIndex}
                  loading={loading}
                  productName={product.name || "product"}
                  isFavorite={productIsFavorite}
                  onToggleFavorite={handleToggleFavorite}
                />

                <ProductInfo
                  name={product.name}
                  category={product.category}
                  badges={badges}
                  rentPriceText={formatCurrency(currentRentPrice, lang)}
                  salePriceText={formatCurrency(product.baseSalePrice, lang)}
                  variantContent={
                    <VariantSelector
                      colors={colors}
                      sizes={sizes}
                      selectedColor={selectedColor}
                      selectedSize={selectedSize}
                      onColorChange={setSelectedColor}
                      onSizeChange={setSelectedSize}
                      getSwatchClass={getSwatchClass}
                      isColorDisabled={(color) => !isFreeSize && selectedSize ? !isVariantAvailable(selectedSize, color) : false}
                      isSizeDisabled={(size) => selectedColor ? !isVariantAvailable(size, selectedColor) : false}
                      isFreeSize={isFreeSize}
                    />
                  }
                  actionsContent={
                    <ProductActions
                      rentPriceText={formatCurrency(currentRentPrice, lang)}
                      salePriceText={formatCurrency(product.baseSalePrice, lang)}
                      onRent={handleRent}
                      onBuy={handleBuy}
                      loadingAction={loadingAction}
                      canSubmit={canSubmit}
                      canBuy={canBuy}
                      productImage={currentImagesByColor[0]}
                    />
                  }
                />
              </div>

              {/* Description Section */}
              <section className="border-t border-slate-200 pt-4">
                <ProductDescription description={product.description} />
              </section>

              <section className="border-t border-slate-200 pt-4">
                <div className="space-y-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                    <div>
                      <h3 className="text-xl font-semibold text-slate-900">Đánh giá khách hàng</h3>
                      <p className="mt-1 text-sm text-slate-500">Tổng hợp trải nghiệm thực tế từ người đã mua sản phẩm.</p>
                    </div>
                    <div className="w-full md:w-[220px]">
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Lọc theo sao</label>
                      <select
                        value={reviewFilter}
                        onChange={(event) => setReviewFilter(event.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-300 focus:ring-4 focus:ring-slate-100"
                      >
                        <option value="all">Tất cả</option>
                        <option value="5">5 sao</option>
                        <option value="4">4 sao</option>
                        <option value="3">3 sao</option>
                        <option value="2">2 sao</option>
                        <option value="1">1 sao</option>
                      </select>
                    </div>
                  </div>

                  <ReviewSummary summary={reviewSummary} />
                  <ReviewList
                    reviews={reviews}
                    loading={reviewLoading}
                    pagination={reviewPagination}
                    onLoadMore={handleLoadMoreReviews}
                  />
                </div>
              </section>

              {/* Related Products Section */}
              <section className="border-t border-slate-200 pt-4">
                <RelatedProducts items={relatedProducts} loading={relatedLoading} />
              </section>
            </div>
          )}
        </div>
      </main>

      {toast && (
        <div className="fixed right-4 top-20 z-50 rounded-xl border border-white/10 bg-neutral-900 px-4 py-3 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      )}

      {/* Date Selection Modal */}
      {showDateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4 py-6 backdrop-blur-[2px]">
          <div className="max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-auto rounded-[28px] border border-amber-100/80 bg-gradient-to-br from-amber-50 via-white to-white p-5 shadow-2xl sm:p-6">
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-700">Đặt lịch thuê</p>
              <h3 className="mt-2 text-2xl font-bold text-slate-900">Chọn ngày thuê</h3>
              <p className="mt-1 text-sm text-slate-500">
                Chọn ngày giờ nhận và trả đồ. Hệ thống sẽ tính tổng tiền tạm tính ngay bên dưới.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
                <p className="text-sm font-semibold text-slate-900">Nhận trang phục</p>
                <p className="mt-1 text-xs text-slate-500">Bắt đầu thời gian bạn muốn nhận đồ</p>
                <div className="mt-4 space-y-3">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Ngày bắt đầu
                    </label>
                    <input
                      type="date"
                      value={rentStartDate}
                      onChange={(e) => {
                        const nextValue = e.target.value;
                        setRentStartDate(nextValue);
                        if (!rentEndDate || rentEndDate < nextValue) {
                          setRentEndDate(nextValue);
                        }
                      }}
                      min={today}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Giờ nhận
                    </label>
                    <input
                      type="time"
                      value={rentStartTime}
                      onChange={(e) => setRentStartTime(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
                <p className="text-sm font-semibold text-slate-900">Trả trang phục</p>
                <p className="mt-1 text-xs text-slate-500">Ngày trả phải sau ngày giờ nhận</p>
                <div className="mt-4 space-y-3">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Ngày kết thúc
                    </label>
                    <input
                      type="date"
                      value={rentEndDate}
                      onChange={(e) => setRentEndDate(e.target.value)}
                      min={rentStartDate || today}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Giờ trả
                    </label>
                    <input
                      type="time"
                      value={rentEndTime}
                      onChange={(e) => setRentEndTime(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                    />
                  </div>
                </div>
              </div>

              <div className="sm:col-span-2 rounded-2xl border border-amber-200 bg-amber-50/80 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-amber-900">Tạm tính đơn thuê</p>
                    <p className="mt-1 text-xs text-amber-800/80">Giá thuê tính theo số ngày và được làm tròn lên theo ngày.</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-wide text-amber-700">Giá / ngày</p>
                    <p className="text-sm font-semibold text-amber-950">{currentRentPrice.toLocaleString("vi-VN")}đ</p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl bg-white/80 px-3 py-2">
                    <p className="text-slate-500">Số ngày thuê</p>
                    <p className="mt-1 font-semibold text-slate-900">{rentalDays || 0} ngày</p>
                  </div>
                  <div className="rounded-xl bg-white/80 px-3 py-2">
                    <p className="text-slate-500">Tổng tiền</p>
                    <p className="mt-1 font-semibold text-slate-900">{totalRentPrice.toLocaleString("vi-VN")}đ</p>
                  </div>
                </div>

                {rentStartDate && rentEndDate && rentalDays === 0 && (
                  <p className="mt-3 text-sm font-medium text-rose-600">
                    Vui lòng chọn giờ trả sau giờ nhận để tạo khoảng thuê hợp lệ.
                  </p>
                )}
              </div>
            </div>

            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row">
              <button
                type="button"
                onClick={resetRentModal}
                className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmRent}
                disabled={loadingAction === "rent" || !rentStartDate || !rentEndDate || rentalDays === 0}
                className="flex-1 rounded-xl bg-amber-500 px-4 py-2.5 font-semibold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:bg-amber-300"
              >
                {loadingAction === "rent" ? "Đang xử lý..." : "Xác nhận"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
