import { EXTERNAL_LINKS, IMAGE_FALLBACKS } from '../config/env'

export const CONTACT_LINKS = {
  zaloHref: EXTERNAL_LINKS.zalo,
  mapHref: EXTERNAL_LINKS.map,
  instagramHref: EXTERNAL_LINKS.instagram,
}

export const UI_IMAGE_FALLBACKS = {
  ownerProductCard: IMAGE_FALLBACKS.ownerProductCard,
  ownerProductGrid: IMAGE_FALLBACKS.ownerProductGrid,
  reviewImage: IMAGE_FALLBACKS.reviewImage,
  heroBanner:
    String(import.meta.env.VITE_HOME_HERO_FALLBACK_IMAGE || '').trim() ||
    'https://hoianoutfit.com/wp-content/uploads/2022/08/thue-trang-phuc-hoian-hoianoutfit.jpg',
}
