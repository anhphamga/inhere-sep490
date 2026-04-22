const asText = (value) => String(value || '').trim();

// ❌ KHÔNG dùng localhost trong production
const devApiBaseUrl = 'http://localhost:9000/api';

// ✅ ENV từ Vercel
const runtimeApiBaseUrl = asText(import.meta.env.VITE_API_BASE_URL);

// ✅ fallback production (QUAN TRỌNG)
const productionApiFallback = 'https://hoianstyle.onrender.com/api';

// 🎯 FINAL BASE URL (KHÔNG BAO GIỜ RỖNG)
// ⚠️ CRITICAL: Must be full URL (e.g., https://hoianstyle.onrender.com/api)
// ⚠️ NEVER use relative paths like "/api" - causes OAuth origin_mismatch errors
export const API_BASE_URL =
  runtimeApiBaseUrl !== ''
    ? runtimeApiBaseUrl
    : import.meta.env.PROD
      ? productionApiFallback
      : devApiBaseUrl;

// ================= LINKS =================

export const EXTERNAL_LINKS = {
  zalo: asText(import.meta.env.VITE_ZALO_URL) || 'https://zalo.me/0898199099',
  map:
    asText(import.meta.env.VITE_MAP_URL) ||
    'https://www.google.com/maps/search/?api=1&query=24+Dao+Duy+Tu+Hoi+An',
  instagram:
    asText(import.meta.env.VITE_INSTAGRAM_URL) ||
    'https://www.instagram.com/inhere_trangphuchoian/',
};

// ================= IMAGES =================

export const IMAGE_FALLBACKS = {
  ownerProductCard:
    asText(import.meta.env.VITE_OWNER_PRODUCT_PLACEHOLDER) ||
    'https://picsum.photos/seed/product-default/200/300',
  ownerProductGrid:
    asText(import.meta.env.VITE_OWNER_PRODUCT_GRID_PLACEHOLDER) ||
    'https://picsum.photos/seed/product-grid/400/600',
  reviewImage:
    asText(import.meta.env.VITE_REVIEW_IMAGE_PLACEHOLDER) ||
    'https://placehold.co/160x160/f8fafc/64748b?text=INHERE',
};