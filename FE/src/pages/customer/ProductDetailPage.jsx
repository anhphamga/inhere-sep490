import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Header from "../../components/common/Header";
import ProductGallery from "../../components/product-detail/ProductGallery";
import ProductInfo from "../../components/product-detail/ProductInfo";
import VariantSelector from "../../components/product-detail/VariantSelector";
import ProductActions from "../../components/product-detail/ProductActions";
import ProductDescription from "../../components/product-detail/ProductDescription";
import RelatedProducts from "../../components/product-detail/RelatedProducts";
import { useBuyCart } from "../../contexts/BuyCartContext";
import { useRentalCart } from "../../contexts/RentalCartContext";

const I18N = {
  vi: {
    back: "Quay lại danh sách",
    notFound: "Không tìm thấy sản phẩm",
    loading: "Đang tải chi tiết sản phẩm...",
    breadcrumbHome: "Trang chủ",
    breadcrumbBuy: "Mua trang phục",
    toastRent: "Đã thêm vào đơn thuê",
    toastBuy: "Đã thêm vào giỏ hàng",
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
  return `${amount.toLocaleString("vi-VN")} d`;
};

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem } = useRentalCart();
  const { addItem: addBuyItem } = useBuyCart();
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
  
  // Date selection modal state
  const [showDateModal, setShowDateModal] = useState(false);
  const [rentStartDate, setRentStartDate] = useState("");
  const [rentEndDate, setRentEndDate] = useState("");

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

  const isVariantAvailable = (size, color) => {
    if (!hasVariantPricing) return true;
    if (isFreeSize) {
      return product?.variantRentPrices?.[`FREE SIZE__${color}`] != null || product?.variantRentPrices?.[`Free Size__${color}`] != null;
    }
    if (!size || !color) return false;
    return product?.variantRentPrices?.[`${size}__${color}`] != null;
  };

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
  }, [colors, selectedColor, selectedSize, sizes, isFreeSize]);

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
  }, [product, selectedColor, selectedSize, isFreeSize, sizes]);

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
        const params = new URLSearchParams({ purpose: "all", limit: "12", page: "1" });
        if (product.category) params.set("category", product.category);
        const res = await fetch(`/api/products?${params.toString()}`);
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
  }, [product?._id, product?.category]);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(""), 2000);
  };

  const handleRent = async () => {
    if (!canSubmit) {
      showToast(t.toastError);
      return;
    }
    // Hiển thị modal chọn ngày trước
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

    setLoadingAction("rent");
    try {
      // Thêm sản phẩm vào giỏ thuê với thông tin ngày
      addItem(product, {
        color: selectedColor,
        size: selectedSize,
        rentPrice: currentRentPrice,
        productInstanceId: null,
        rentStartDate,
        rentEndDate
      });
      showToast(t.toastRent);
      // Đóng modal và chuyển đến trang checkout
      setShowDateModal(false);
      navigate('/cart');
    } catch (error) {
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

  const getSwatchClass = (color) => {
    const key = normalize(color);
    const match = Object.keys(SWATCH_CLASS_MAP).find((item) => key.includes(item));
    return match ? SWATCH_CLASS_MAP[match] : "bg-neutral-300";
  };

  const badges = useMemo(() => {
    const list = ["Co san"];
    if (isFreeSize) list.push("Free size");
    if (product?.isBestSeller) list.push("Best seller");
    if (product?.isNew) list.push("Mới");
    return list;
  }, [product?.isBestSeller, product?.isNew, isFreeSize]);

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fcfaf7_0%,#f7f4ee_24%,#f5f5f4_100%)] pb-24 md:pb-10">
      <Header />

      <main className="w-full px-4 py-5 md:px-6 md:py-8">
        <div className="mx-auto w-full max-w-[1320px]">
          <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-neutral-500 md:text-sm">
            <Link to="/" className="hover:text-neutral-700">{t.breadcrumbHome}</Link>
            <span>/</span>
            <Link to="/buy" className="hover:text-neutral-700">{t.breadcrumbBuy}</Link>
            <span>/</span>
            <span className="max-w-full truncate font-medium text-neutral-700">{product?.name || id}</span>
          </div>

          <Link
            className="mb-6 inline-flex min-h-11 items-center rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 shadow-sm hover:bg-neutral-50"
            to="/buy"
          >
            {"<"} {t.back}
          </Link>

          {loading && <p className="text-sm text-neutral-500">{t.loading}</p>}
          {!loading && !product && <p className="text-sm text-neutral-500">{t.notFound}</p>}

          {!loading && product && (
            <>
              <section className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)] xl:gap-8">
                <ProductGallery
                  images={currentImagesByColor}
                  activeIndex={selectedImageIndex}
                  onSelectImage={setSelectedImageIndex}
                  loading={loading}
                  productName={product.name || "product"}
                />

                <div className="w-full space-y-4 xl:sticky xl:top-24">
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
                      />
                    }
                  />
                </div>
              </section>

              <section className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)] xl:gap-8">
                <ProductDescription description={product.description} />

                <div className="w-full">
                  <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
                    <h3 className="text-lg font-semibold text-neutral-900">{t.policyTitle}</h3>
                    <ul className="mt-3 space-y-2 text-sm text-neutral-700">
                      <li className="rounded-2xl bg-neutral-50 p-4">{t.policyDeposit}</li>
                      <li className="rounded-2xl bg-neutral-50 p-4">{t.policySwap}</li>
                      <li className="rounded-2xl bg-neutral-50 p-4">{t.policyTime}</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section className="mt-8">
                <RelatedProducts items={relatedProducts} loading={relatedLoading} />
              </section>
            </>
          )}
        </div>
      </main>

      {toast && (
        <div className="fixed right-4 top-20 z-50 rounded-xl bg-neutral-900 px-4 py-3 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      )}

      {/* Date Selection Modal */}
      {showDateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-xl font-bold">Chọn ngày thuê</h3>
            
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Ngày bắt đầu
                </label>
                <input
                  type="date"
                  value={rentStartDate}
                  onChange={(e) => setRentStartDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
                />
              </div>
              
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Ngày kết thúc
                </label>
                <input
                  type="date"
                  value={rentEndDate}
                  onChange={(e) => setRentEndDate(e.target.value)}
                  min={rentStartDate || new Date().toISOString().split('T')[0]}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
                />
              </div>

              {rentStartDate && rentEndDate && (
                <div className="rounded-lg bg-pink-50 p-3 text-sm">
                  <p className="font-medium text-pink-700">
                    Số ngày thuê: {Math.ceil((new Date(rentEndDate) - new Date(rentStartDate)) / (1000 * 60 * 60 * 24)) + 1} ngày
                  </p>
                  <p className="text-pink-600">
                    Tổng tiền: {((Math.ceil((new Date(rentEndDate) - new Date(rentStartDate)) / (1000 * 60 * 60 * 24)) + 1) * currentRentPrice).toLocaleString('vi-VN')}đ
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowDateModal(false);
                  setRentStartDate('');
                  setRentEndDate('');
                }}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmRent}
                disabled={loadingAction === "rent" || !rentStartDate || !rentEndDate}
                className="flex-1 rounded-lg bg-pink-600 px-4 py-2 font-medium text-white hover:bg-pink-700 disabled:bg-pink-300"
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
