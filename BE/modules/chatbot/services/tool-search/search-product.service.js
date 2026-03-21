const Product = require('../../../../model/Product.model');

const normalizeText = (value) => {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
};

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const pickLocalizedText = (value) => {
  if (typeof value === 'string') {
    return value.trim();
  }

  if (value && typeof value === 'object') {
    return String(value.vi || value.en || '').trim();
  }

  return '';
};

const pickImage = (doc) => {
  if (Array.isArray(doc.images) && doc.images.length > 0 && doc.images[0]) {
    return String(doc.images[0]);
  }

  if (Array.isArray(doc.colorVariants)) {
    for (const variant of doc.colorVariants) {
      if (Array.isArray(variant?.images) && variant.images.length > 0 && variant.images[0]) {
        return String(variant.images[0]);
      }
    }
  }

  return '';
};

const resolveProductPrice = (doc) => {
  const salePrice = toNumber(doc.baseSalePrice, 0);
  const rentPrice = toNumber(doc.baseRentPrice, 0);

  if (salePrice > 0) {
    return salePrice;
  }

  return rentPrice;
};

const cleanQueryForKeywords = (query) => {
  const normalized = normalizeText(query)
    .replace(/\d+(?:[.,]\d+)?\s*(k|nghin|ngan|trieu|tr|m|ty|t)?/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const stopWords = new Set([
    'tim',
    'kiem',
    'search',
    'loc',
    'xem',
    'hien',
    'thi',
    'cho',
    'toi',
    'cac',
    'nhung',
    'loai',
    'sp',
    'san',
    'pham',
    'tu',
    'den',
    'duoi',
    'tren',
    'nho',
    'lon',
    'it',
    'nhieu',
    'hon',
    'max',
    'min',
    'sap',
    'xep',
    'giam',
    'tang',
    're',
    'dat',
    'gia',
    'vnd',
  ]);

  return normalized
    .split(' ')
    .map((item) => item.trim())
    .filter((item) => !stopWords.has(item))
    .filter((item) => item.length >= 2);
};

const mapProduct = (doc) => {
  const id = String(doc._id);

  return {
    id,
    name: pickLocalizedText(doc.name) || 'San pham',
    category: pickLocalizedText(doc.category) || '',
    price: resolveProductPrice(doc),
    image: pickImage(doc),
    detailUrl: `/products/${id}`,
    buyUrl: `/products/${id}?action=buy`,
    rentUrl: `/products/${id}?action=rent`,
    createdAt: doc.createdAt || null,
  };
};

const applyProductSorting = (rows, filters) => {
  const sortBy = filters.sortBy || 'createdAt';
  const sortOrder = filters.sortOrder === 'asc' ? 'asc' : 'desc';
  const factor = sortOrder === 'asc' ? 1 : -1;

  if (sortBy === 'price') {
    return rows.sort((a, b) => (a.price - b.price) * factor);
  }

  if (sortBy === 'name') {
    return rows.sort((a, b) => a.name.localeCompare(b.name, 'vi') * factor);
  }

  return rows.sort((a, b) => {
    const aTime = new Date(a.createdAt || 0).getTime();
    const bTime = new Date(b.createdAt || 0).getTime();
    return (aTime - bTime) * factor;
  });
};

const searchProductService = async ({ query, filters }) => {
  const mongoQuery = {
    isDraft: { $ne: true },
  };

  const rows = await Product.find(mongoQuery)
    .select('name category baseSalePrice baseRentPrice images colorVariants createdAt')
    .limit(500)
    .lean();

  const keywords = cleanQueryForKeywords(query);
  const mapped = rows.map(mapProduct);

  const filteredByKeyword = keywords.length > 0
    ? mapped.filter((item) => {
      const haystack = normalizeText(`${item.name} ${item.category}`);
      return keywords.every((keyword) => haystack.includes(keyword));
    })
    : mapped;

  const filtered = filteredByKeyword.filter((item) => {
    if (Number.isFinite(filters.priceMin) && item.price < filters.priceMin) {
      return false;
    }

    if (Number.isFinite(filters.priceMax) && item.price > filters.priceMax) {
      return false;
    }

    return true;
  });

  const sorted = applyProductSorting(filtered, filters);
  const page = filters.page;
  const limit = filters.limit;
  const start = (page - 1) * limit;
  const records = sorted.slice(start, start + limit);

  return {
    entity: 'product',
    page,
    limit,
    total: sorted.length,
    records,
  };
};

module.exports = {
  searchProductService,
};