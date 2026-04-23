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
import { formatConditionLabel } from "../../utils/formatConditionLabel";

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
  return n === "freesize" || n === "free" || n === "onesize" || n === "one" || n === "motco";
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
  const { isFavorite, isFavoriteLoading, toggleFavorite } = useFavorites();
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
  const [availableInstances, setAvailableInstances] = useState([]);
  const [selectedConditionKey, setSelectedConditionKey] = useState("");
  const [sizeGuideGender, setSizeGuideGender] = useState('female');
  const [sizeGuideRows, setSizeGuideRows] = useState([]);
  const [sizeGuideSource, setSizeGuideSource] = useState('global');
  const [sizeRecommendationInput, setSizeRecommendationInput] = useState({
    heightCm: '',
    weightKg: '',
  });
  const [sizeRecommendationResult, setSizeRecommendationResult] = useState(null);
  const [sizeRecommendationError, setSizeRecommendationError] = useState('');
  const [sizeRecommendationLoading, setSizeRecommendationLoading] = useState(false);

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

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        const params = new URLSearchParams();
        if (sizeGuideGender) params.set('gender', sizeGuideGender);
        const response = await fetch(`/api/products/${id}/size-guide?${params.toString()}`);
        const payload = response.ok ? await response.json() : { data: { rows: [], source: 'global' } };

        if (!mounted) return;
        const rows = Array.isArray(payload?.data?.rows) ? payload.data.rows : [];
        setSizeGuideRows(rows);
        setSizeGuideSource(payload?.data?.source === 'product' ? 'product' : 'global');
      } catch {
        if (!mounted) return;
        setSizeGuideRows([]);
        setSizeGuideSource('global');
      }
    };

    run();
    return () => {
      mounted = false;
    };
  }, [id, sizeGuideGender]);

  useEffect(() => {
    setSizeRecommendationInput({
      heightCm: '',
      weightKg: '',
    });
    setSizeRecommendationResult(null);
    setSizeRecommendationError('');
    setSizeRecommendationLoading(false);
  }, [id]);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        const response = await fetch(`/api/products/${id}/available-instances`);
        const payload = response.ok ? await response.json() : { data: [] };
        if (!mounted) return;
        const instances = Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(payload?.data?.instances)
            ? payload.data.instances
            : [];
        setAvailableInstances(instances);
      } catch {
        if (mounted) setAvailableInstances([]);
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

  // CRITICAL: Derive sizes from availableInstances ONLY, never from product.sizes
  const sizes = useMemo(() => {
    if (!Array.isArray(availableInstances) || availableInstances.length === 0) {
      return [];
    }
    const sizesSet = new Set();
    availableInstances.forEach((instance) => {
      const size = String(instance?.size || "").trim().toUpperCase();
      if (size && !isFreeSizeValue(size)) {
        sizesSet.add(size);
      }
    });
    return Array.from(sizesSet).sort();
  }, [availableInstances]);

  // Check if product has FREE SIZE instances
  const isFreeSize = useMemo(() => {
    if (!Array.isArray(availableInstances) || availableInstances.length === 0) {
      return false;
    }
    const hasFreeSize = availableInstances.some((instance) => {
      const size = String(instance?.size || "").trim().toUpperCase();
      return isFreeSizeValue(size);
    });
    return hasFreeSize;
  }, [availableInstances]);

  const hasSizes = useMemo(() => {
    return sizes.length > 0 || isFreeSize;
  }, [isFreeSize, sizes.length]);

  // Extract colors from both product data and available instances
  const colors = useMemo(() => {
    const colorsSet = new Set();
    
    // First priority: colors from available instances
    if (Array.isArray(availableInstances) && availableInstances.length > 0) {
      availableInstances.forEach((instance) => {
        const color = String(instance?.color || "").trim();
        if (color) colorsSet.add(color);
      });
    }
    
    // Fallback: colors from product data
    if (colorsSet.size === 0) {
      const fromString = uniq(parseList(product?.color || ""));
      fromString.forEach((color) => colorsSet.add(color));
    }
    
    if (colorsSet.size === 0) {
      const fromVariants = Array.isArray(product?.colorVariants)
        ? product.colorVariants.map((variant) => String(variant?.name || variant?.color || "").trim()).filter(Boolean)
        : [];
      fromVariants.forEach((color) => colorsSet.add(color));
    }
    
    if (colorsSet.size === 0) {
      colorsSet.add("Default");
    }
    
    return Array.from(colorsSet).sort();
  }, [product, availableInstances]);

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

  // Check if a specific size is available in the instances
  const isSizeAvailable = useCallback((size) => {
    if (!Array.isArray(availableInstances) || availableInstances.length === 0) {
      return false;
    }
    const normalizedSize = String(size || "").trim().toUpperCase();
    return availableInstances.some((instance) => {
      const instanceSize = String(instance?.size || "").trim().toUpperCase();
      return instanceSize === normalizedSize;
    });
  }, [availableInstances]);

  const hasVariantPricing = useMemo(() => {
    const pricing = product?.variantRentPrices;
    return Boolean(pricing && typeof pricing === "object" && Object.keys(pricing).length > 0);
  }, [product]);

  const isVariantAvailable = useCallback((size, color) => {
    if (!hasSizes) return true;
    if (!hasVariantPricing) return true;
    if (isFreeSize) {
      return product?.variantRentPrices?.[`FREE SIZE__${color}`] != null || product?.variantRentPrices?.[`Free Size__${color}`] != null;
    }
    if (!size || !color) return false;
    return product?.variantRentPrices?.[`${size}__${color}`] != null;
  }, [hasVariantPricing, hasSizes, isFreeSize, product?.variantRentPrices]);

  useEffect(() => {
    if (!colors.length) return;
    if (!selectedColor || !colors.includes(selectedColor)) {
      setSelectedColor(colors[0]);
      return;
    }

    if (hasSizes && !isFreeSize && selectedSize && !isVariantAvailable(selectedSize, selectedColor)) {
      const fallback = sizes.find((size) => isVariantAvailable(size, selectedColor));
      if (fallback) setSelectedSize(fallback);
    }
  }, [colors, selectedColor, selectedSize, sizes, isFreeSize, isVariantAvailable, hasSizes]);

  useEffect(() => {
    if (!hasSizes || !sizes.length) {
      setSelectedSize("");
      return;
    }
    if (isFreeSize) {
      setSelectedSize("FREE SIZE");
      return;
    }

    // Validate that selected size exists in available instances
    if (!selectedSize || !isSizeAvailable(selectedSize)) {
      setSelectedSize(sizes[0] || "");
    }
  }, [sizes, isFreeSize, hasSizes, isSizeAvailable, selectedSize]);

  useEffect(() => {
    setSelectedImageIndex(0);
  }, [selectedColor]);

  const currentImagesByColor = useMemo(() => {
    return imagesByColor[selectedColor] || baseImages;
  }, [imagesByColor, selectedColor, baseImages]);

  const filteredInstancesForSelection = useMemo(() => {
    if (!Array.isArray(availableInstances) || availableInstances.length === 0) return [];

    const bySize = availableInstances.filter((instance) => {
      const instanceSize = String(instance?.size || "").trim().toUpperCase();
      if (!hasSizes || isFreeSize) {
        return isFreeSizeValue(instanceSize || "FREE SIZE");
      }
      if (!selectedSize) return false;
      return instanceSize === String(selectedSize || "").trim().toUpperCase();
    });

    // If backend provides color per instance, keep UI consistent with selected color.
    const byColor = bySize.filter((instance) => {
      const instanceColor = String(instance?.color || "").trim();
      if (!instanceColor) return true;
      if (!selectedColor) return true;
      return instanceColor === selectedColor;
    });

    return byColor;
  }, [availableInstances, hasSizes, isFreeSize, selectedColor, selectedSize]);

  const conditionOptions = useMemo(() => {
    if (!filteredInstancesForSelection.length) return [];
    const grouped = new Map();

    filteredInstancesForSelection.forEach((instance) => {
      const score = Number(instance?.conditionScore ?? 100);
      const level = String(instance?.conditionLevel || "Used");
      const rentPrice = Number(instance?.currentRentPrice ?? 0);
      const salePrice = Number(instance?.currentSalePrice ?? 0);
      const key = `${score}__${level}`;

      if (!grouped.has(key)) {
        grouped.set(key, {
          key,
          score,
          level,
          rentPrice,
          salePrice,
          instanceId: instance?._id || null,
          count: 1,
        });
        return;
      }

      const current = grouped.get(key);
      const cheaperRent = rentPrice > 0 && (current.rentPrice <= 0 || rentPrice < current.rentPrice);
      const cheaperSale = salePrice > 0 && (current.salePrice <= 0 || salePrice < current.salePrice);
      grouped.set(key, {
        ...current,
        rentPrice: cheaperRent ? rentPrice : current.rentPrice,
        salePrice: cheaperSale ? salePrice : current.salePrice,
        instanceId: cheaperRent ? (instance?._id || current.instanceId) : current.instanceId,
        count: Number(current.count || 0) + 1,
      });
    });

    return Array.from(grouped.values())
      .sort((a, b) => Number(b.score || 0) - Number(a.score || 0))
      .map((item) => ({
        ...item,
        label: formatConditionLabel(item.score),
      }));
  }, [filteredInstancesForSelection]);

  const selectedConditionOption = useMemo(() => {
    if (!conditionOptions.length) return null;
    return conditionOptions.find((option) => option.key === selectedConditionKey) || conditionOptions[0];
  }, [conditionOptions, selectedConditionKey]);

  useEffect(() => {
    if (!conditionOptions.length) {
      setSelectedConditionKey("");
      return;
    }
    if (!selectedConditionKey || !conditionOptions.some((option) => option.key === selectedConditionKey)) {
      setSelectedConditionKey(conditionOptions[0].key);
    }
  }, [conditionOptions, selectedConditionKey]);

  const productIsFavorite = useMemo(() => {
    if (!product?._id) return false;
    return isFavorite(product._id);
  }, [isFavorite, product?._id]);

  const productFavoriteLoading = useMemo(() => {
    if (!product?._id) return false;
    return isFavoriteLoading(product._id);
  }, [isFavoriteLoading, product?._id]);

  useEffect(() => {
    if (selectedImageIndex < currentImagesByColor.length) return;
    setSelectedImageIndex(0);
  }, [selectedImageIndex, currentImagesByColor]);

  // Giá thuê luôn lấy từ product (variant matrix hoặc base), KHÔNG bị ảnh hưởng bởi condition
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

  const currentSalePrice = useMemo(() => {
    if (selectedConditionOption) {
      const optionSalePrice = Number(selectedConditionOption.salePrice || 0);
      if (optionSalePrice > 0) return optionSalePrice;
    }
    return Number(product?.baseSalePrice || 0);
  }, [selectedConditionOption, product?.baseSalePrice]);

  // Biến thể (size/màu) — không gắn với “còn hàng thuê/mua”
  const variantReady = useMemo(() => {
    if (!product) return false;
    if (!selectedColor) return false;
    if (hasSizes && !isFreeSize && sizes.length > 0 && !selectedSize) return false;
    if (hasSizes && !isFreeSize && selectedSize && !isVariantAvailable(selectedSize, selectedColor)) return false;
    return true;
  }, [product, selectedColor, selectedSize, isFreeSize, sizes, isVariantAvailable, hasSizes]);

  // Số lượng có thể thuê — tất cả instance còn trong vòng đời cho thuê
  const rentableQuantity = useMemo(() => {
    if (!Array.isArray(availableInstances) || availableInstances.length === 0) return 0;
    return availableInstances.length;
  }, [availableInstances]);

  // Số lượng có thể mua — chỉ đếm instance Available (BE đã đánh dấu isPurchasable)
  const purchasableQuantity = useMemo(() => {
    if (!Array.isArray(availableInstances) || availableInstances.length === 0) return 0;
    return availableInstances.filter((inst) => inst?.isPurchasable).length;
  }, [availableInstances]);

  const canSubmitRent = useMemo(() => {
    if (!variantReady) return false;
    if (rentableQuantity <= 0) return false;
    return true;
  }, [variantReady, rentableQuantity]);

  // Chỉ cho Mua khi thực sự có instance Available (đồ đang thuê/reserved không bán được)
  const canBuy = useMemo(() => {
    if (!variantReady) return false;
    if (Number(currentSalePrice || 0) <= 0) return false;
    if (purchasableQuantity <= 0) return false;
    if (conditionOptions.length > 0 && !selectedConditionOption) return false;
    return true;
  }, [variantReady, currentSalePrice, purchasableQuantity, conditionOptions.length, selectedConditionOption]);

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

  const handleSizeRecommendationInputChange = useCallback((field, value) => {
    setSizeRecommendationInput((prev) => ({
      ...prev,
      [field]: value,
    }));
    setSizeRecommendationError('');
  }, []);

  const handleRecommendSize = useCallback(async () => {
    const heightCm = Number(sizeRecommendationInput.heightCm);
    const weightKg = Number(sizeRecommendationInput.weightKg);

    if (!Number.isFinite(heightCm) || heightCm <= 0 || !Number.isFinite(weightKg) || weightKg <= 0) {
      setSizeRecommendationResult(null);
      setSizeRecommendationError('Vui lòng nhập chiều cao và cân nặng hợp lệ (> 0).');
      return;
    }

    try {
      setSizeRecommendationLoading(true);
      setSizeRecommendationError('');

      const params = new URLSearchParams({
        heightCm: String(heightCm),
        weightKg: String(weightKg),
      });
      if (sizeGuideGender) {
        params.set('gender', sizeGuideGender);
      }

      const response = await fetch(`/api/products/${id}/size-guide/recommendation?${params.toString()}`);
      const payload = response.ok
        ? await response.json()
        : await response.json().catch(() => ({ message: 'Không thể tính size lúc này.' }));

      if (!response.ok) {
        setSizeRecommendationResult(null);
        setSizeRecommendationError(payload?.message || 'Không thể tính size lúc này.');
        return;
      }

      const data = payload?.data || null;
      setSizeRecommendationResult(data);

      const recommendedGender = String(data?.gender || '').trim().toLowerCase();
      if (recommendedGender === 'male' || recommendedGender === 'female') {
        setSizeGuideGender(recommendedGender);
      }
    } catch {
      setSizeRecommendationResult(null);
      setSizeRecommendationError('Không thể tính size lúc này. Vui lòng thử lại.');
    } finally {
      setSizeRecommendationLoading(false);
    }
  }, [
    id,
    sizeGuideGender,
    sizeRecommendationInput.heightCm,
    sizeRecommendationInput.weightKg,
  ]);

  const handleLoadMoreReviews = () => {
    const nextPage = Number(reviewPagination?.page || 1) + 1;
    if (nextPage > Number(reviewPagination?.pages || 1)) return;
    fetchReviews({ page: nextPage, append: true, starFilter: reviewFilter });
  };

  const today = useMemo(() => new Date().toISOString().split("T")[0], []);
  const maxRentalDays = useMemo(() => parseInt(import.meta.env.VITE_MAX_RENTAL_DAYS || "30", 10), []);

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
    if (rentableQuantity <= 0) {
      showToast("Không còn bản ghi nào có thể thuê (đã mất hoặc đã bán hết).");
      return;
    }
    if (!canSubmitRent) {
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

    if (rentalDays > maxRentalDays) {
      showToast(`Thời gian thuê tối đa là ${maxRentalDays} ngày.`);
      return;
    }

    setLoadingAction("rent");
    try {
      // Tạo datetime string với giờ
      const startDateTime = rentStartDate && rentStartTime ? `${rentStartDate}T${rentStartTime}:00` : rentStartDate;
      const endDateTime = rentEndDate && rentEndTime ? `${rentEndDate}T${rentEndTime}:00` : rentEndDate;

      // Thêm vào giỏ thuê – hệ thống tự assign instance (ưu tiên Used)
        addItem(product, {
        color: selectedColor,
        size: hasSizes ? selectedSize : '',
        rentPrice: currentRentPrice,
        productInstanceId: null,
        rentStartDate: startDateTime,
        rentEndDate: endDateTime,
        image: currentImagesByColor[selectedImageIndex] || currentImagesByColor[0] || product.imageUrl || '',
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
    // Check if product is actually in stock based on availableInstances
    if (!Array.isArray(availableInstances) || availableInstances.length === 0) {
      showToast("Sản phẩm đã hết hàng, không thể mua hoặc thuê");
      return;
    }
    if (!variantReady) {
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
        size: hasSizes ? selectedSize : '',
        salePrice: currentSalePrice,
        productInstanceId: selectedConditionOption?.instanceId || null,
        conditionLevel: selectedConditionOption?.level || 'New',
        conditionScore: Number(selectedConditionOption?.score ?? 100),
        quantity: 1,
        image: currentImagesByColor[selectedImageIndex] || currentImagesByColor[0] || product.imageUrl || '',
      });
      showToast(t.toastBuy);
      navigate("/cart");
    } finally {
      setLoadingAction("");
    }
  };

  const handleToggleFavorite = async () => {
    if (!product?._id) return;

    const result = await toggleFavorite({
      id: product._id,
      name: product.name,
      imageUrl: currentImagesByColor[0] || product.imageUrl || "",
      price: Number(product.baseSalePrice || product.baseRentPrice || 0),
    });

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

    showToast(result.added ? t.toastFavoriteAdded : t.toastFavoriteRemoved);
  };

  const badges = useMemo(() => {
    // Check stock based on ACTUAL available instances, not product.availableQuantity
    const actuallyInStock = Array.isArray(availableInstances) && availableInstances.length > 0;
    const list = [actuallyInStock ? "Có sẵn" : "Hết hàng"];
    if (isFreeSize) list.push("Free size");
    if (product?.isBestSeller) list.push("Best seller");
    if (product?.isNew) list.push("Mới");
    return list;
  }, [availableInstances, product?.isBestSeller, product?.isNew, isFreeSize]);

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
                  favoriteLoading={productFavoriteLoading}
                  onToggleFavorite={handleToggleFavorite}
                />

                <ProductInfo
                  name={product.name}
                  category={product.category}
                  badges={badges}
                  rentPriceText={formatCurrency(currentRentPrice, lang)}
                  salePriceText={formatCurrency(currentSalePrice, lang)}
                  variantContent={
                    <VariantSelector
                      sizes={sizes}
                      hasSizes={hasSizes}
                      conditionOptions={conditionOptions}
                      selectedConditionKey={selectedConditionOption?.key || ""}
                      onConditionChange={setSelectedConditionKey}
                      selectedColor={selectedColor}
                      selectedSize={selectedSize}
                      onSizeChange={setSelectedSize}
                      isSizeDisabled={(size) => !isSizeAvailable(size) || (selectedColor ? !isVariantAvailable(size, selectedColor) : false)}
                      isFreeSize={isFreeSize}
                    />
                  }
                  actionsContent={
                    <ProductActions
                      rentPriceText={formatCurrency(currentRentPrice, lang)}
                      salePriceText={formatCurrency(currentSalePrice, lang)}
                      onRent={handleRent}
                      onBuy={handleBuy}
                      loadingAction={loadingAction}
                      canSubmit={variantReady}
                      canRent={canSubmitRent}
                      canBuy={canBuy}
                      productImage={
                        currentImagesByColor[selectedImageIndex] || currentImagesByColor[0] || product.imageUrl || ""
                      }
                    />
                  }
                />
              </div>

              {/* Description Section */}
              <section className="border-t border-slate-200 pt-4">
                <ProductDescription
                  description={product.description}
                  sizeGuideRows={sizeGuideRows}
                  sizeGuideSource={sizeGuideSource}
                  selectedGender={sizeGuideGender}
                  onGenderChange={setSizeGuideGender}
                  sizeRecommendationInput={sizeRecommendationInput}
                  onSizeRecommendationInputChange={handleSizeRecommendationInputChange}
                  onRecommendSize={handleRecommendSize}
                  sizeRecommendationResult={sizeRecommendationResult}
                  sizeRecommendationError={sizeRecommendationError}
                  sizeRecommendationLoading={sizeRecommendationLoading}
                />
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
                {rentalDays > maxRentalDays && (
                  <p className="mt-3 text-sm font-medium text-rose-600">
                    Thời gian thuê tối đa là {maxRentalDays} ngày. Hiện tại bạn đang chọn {rentalDays} ngày.
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
                disabled={loadingAction === "rent" || !rentStartDate || !rentEndDate || rentalDays === 0 || rentalDays > maxRentalDays}
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
