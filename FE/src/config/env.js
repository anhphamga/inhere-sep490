const asText = (value) => String(value || '').trim();

const devApiBaseUrl = 'http://localhost:9000/api';
const runtimeApiBaseUrl = asText(import.meta.env.VITE_API_BASE_URL);

if (!runtimeApiBaseUrl && import.meta.env.PROD) {
  throw new Error('Missing required env: VITE_API_BASE_URL');
}

export const API_BASE_URL = runtimeApiBaseUrl || devApiBaseUrl;

export const EXTERNAL_LINKS = {
  zalo: asText(import.meta.env.VITE_ZALO_URL) || 'https://zalo.me/0898199099',
  map:
    asText(import.meta.env.VITE_MAP_URL) ||
    'https://www.google.com/maps/search/?api=1&query=24+Dao+Duy+Tu+Hoi+An',
  instagram:
    asText(import.meta.env.VITE_INSTAGRAM_URL) ||
    'https://www.instagram.com/inhere_trangphuchoian/',
};

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
