const Product = require('../../../../model/Product.model');
const ProductInstance = require('../../../../model/ProductInstance.model');
const mongoose = require('mongoose');

const normalizeText = (value) => {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .trim();
};

const normalizeQueryText = (value) => {
  let normalized = normalizeText(value)
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Common typo/phonetic normalization used by users when searching Ao dai.
  normalized = normalized.replace(/\bluc to\b/g, 'lua tam');
  normalized = normalized.replace(/\bao dai luc to\b/g, 'ao dai lua tam');

  // Normalize shorthand price and common English color words.
  normalized = normalized
    .replace(/\b0vnd\b/g, '0 vnd')
    .replace(/\bovnd\b/g, '0 vnd')
    .replace(/\bo\s*vnd\b/g, '0 vnd')
    .replace(/\bo\s*d+\b/g, '0 d')
    .replace(/\bmien phi\b/g, '0 vnd')
    .replace(/\bfree\b/g, '0 vnd')
    .replace(/\bred\b/g, 'do')
    .replace(/\bblack\b/g, 'den')
    .replace(/\bwhite\b/g, 'trang')
    .replace(/\byellow\b/g, 'vang')
    .replace(/\bpink\b/g, 'hong')
    .replace(/\bgrey\b/g, 'xam')
    .replace(/\bgray\b/g, 'xam')
    .replace(/\bbrown\b/g, 'nau')
    .replace(/\bpurple\b/g, 'tim')
    .replace(/\bblue\b/g, 'xanh');

  return normalized;
};

const unique = (values = []) => [...new Set(values.filter(Boolean))];

const levenshteinDistance = (a = '', b = '') => {
  const source = String(a);
  const target = String(b);

  if (source === target) {
    return 0;
  }

  if (!source.length) {
    return target.length;
  }

  if (!target.length) {
    return source.length;
  }

  const rows = source.length + 1;
  const cols = target.length + 1;
  const matrix = Array.from({ length: rows }, () => Array(cols).fill(0));

  for (let row = 0; row < rows; row += 1) {
    matrix[row][0] = row;
  }

  for (let col = 0; col < cols; col += 1) {
    matrix[0][col] = col;
  }

  for (let row = 1; row < rows; row += 1) {
    for (let col = 1; col < cols; col += 1) {
      const cost = source[row - 1] === target[col - 1] ? 0 : 1;
      matrix[row][col] = Math.min(
        matrix[row - 1][col] + 1,
        matrix[row][col - 1] + 1,
        matrix[row - 1][col - 1] + cost
      );
    }
  }

  return matrix[rows - 1][cols - 1];
};

const isApproximateMatch = (needle, hayToken) => {
  if (!needle || !hayToken) {
    return false;
  }

  if (hayToken.includes(needle) || needle.includes(hayToken)) {
    return true;
  }

  if (needle[0] !== hayToken[0]) {
    return false;
  }

  const distance = levenshteinDistance(needle, hayToken);

  if (needle.length <= 2) {
    return false;
  }

  if (needle.length <= 4) {
    return distance <= 1;
  }

  if (needle.length <= 7) {
    return distance <= 1;
  }

  return distance <= 2;
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

const pickSizes = (doc) => {
  const fromSingle = typeof doc.size === 'string' ? [doc.size] : [];
  const fromList = Array.isArray(doc.sizes) ? doc.sizes : [];
  const fromMatrix = Array.isArray(doc.variantMatrix)
    ? doc.variantMatrix.map((item) => item?.size)
    : [];

  return unique([...fromSingle, ...fromList, ...fromMatrix].map((item) => String(item || '').trim()));
};

const pickColors = (doc) => {
  const fromSingle = typeof doc.color === 'string' ? [doc.color] : [];
  const fromVariants = Array.isArray(doc.colorVariants)
    ? doc.colorVariants.map((item) => item?.name)
    : [];
  const fromMatrix = Array.isArray(doc.variantMatrix)
    ? doc.variantMatrix.map((item) => item?.color)
    : [];

  return unique([...fromSingle, ...fromVariants, ...fromMatrix].map((item) => String(item || '').trim()));
};

const pickStockCount = (doc) => {
  if (Array.isArray(doc.variantMatrix) && doc.variantMatrix.length > 0) {
    return doc.variantMatrix.reduce((sum, item) => sum + toNumber(item?.quantity, 0), 0);
  }

  return 0;
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
  const normalized = normalizeQueryText(query)
    .replace(/^(?:hay|vui\s+long|lam\s+on)\s+/g, ' ')
    .replace(/\b\d+\s*(?:m|tr|trieu)\s*\d{1,3}\b/g, ' ')
    .replace(/\bo\s*(?:vnd|dong|d+)\b/g, ' ')
    .replace(/\b\d+(?:[.,]\d+)?\s*(?:k|nghin|ngan|trieu|tr|m|ty|t|vnd|dong|d+)?\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const stopWords = new Set([
    'cua',
    'hang',
    'shop',
    'tim',
    'hay',
    'kiem',
    'search',
    'loc',
    'xem',
    'hien',
    'thi',
    'cho',
    'toi',
    'con',
    'het',
    'khong',
    'cac',
    'nhung',
    'loai',
    'sp',
    'san',
    'pham',
    'tu',
    'den',
    'toi',
    'khoang',
    'trong',
    'duoi',
    'tren',
    'nho',
    'lon',
    'thap',
    'cao',
    'it',
    'nhieu',
    'hon',
    'max',
    'min',
    'sap',
    'xep',
    'giam',
    'tang',
    'dan',
    're',
    'dat',
    'size',
    'nao',
    'co',
    'mau',
    'color',
    'gia',
    'vnd',
    'dong',
    'd',
    'dd',
    'ovnd',
    'mien',
    'phi',
    'free',
  ]);

  return normalized
    .split(' ')
    .map((item) => item.trim())
    .filter((item) => !stopWords.has(item))
    .filter((item) => !/^\d+$/.test(item))
    .filter((item) => !/^d+$/.test(item))
    .filter((item) => item.length >= 2);
};

const GENERIC_FASHION_TOKENS = new Set([
  'ao',
  'dai',
  'vay',
  'dam',
  'quan',
  'kimono',
  'vest',
  'trang',
  'phuc',
  'outfit',
  'do',
  'mac',
]);

const getTokenMatchLevel = (token, haystack, hayTokens) => {
  if (!token) {
    return 0;
  }

  if (hayTokens.includes(token)) {
    return 4;
  }

  if (hayTokens.some((item) => item.startsWith(token))) {
    return 3;
  }

  if (haystack.includes(token)) {
    return 2;
  }

  if (hayTokens.some((item) => isApproximateMatch(token, item))) {
    return 1;
  }

  return 0;
};

const scoreTokenLevel = (level, isSpecific) => {
  if (isSpecific) {
    if (level === 4) return 80;
    if (level === 3) return 55;
    if (level === 2) return 40;
    if (level === 1) return 18;
    return 0;
  }

  if (level === 4) return 10;
  if (level === 3) return 6;
  if (level === 2) return 4;
  if (level === 1) return 2;
  return 0;
};

const rankProductsByQuery = ({ products, query }) => {
  const keywords = cleanQueryForKeywords(query);
  if (!keywords.length) {
    return products.map((item) => ({ item, score: 0 }));
  }

  const specificKeywords = keywords.filter((keyword) => !GENERIC_FASHION_TOKENS.has(keyword));
  const genericKeywords = keywords.filter((keyword) => GENERIC_FASHION_TOKENS.has(keyword));
  const normalizedQuery = normalizeQueryText(query);
  const specificPhrase = specificKeywords.join(' ').trim();

  const ranked = [];

  for (const item of products) {
    const searchableName = normalizeText(item.name || '');
    const searchable = normalizeText([
      item.name,
      item.category,
      ...(item.sizes || []),
      ...(item.colors || []),
    ].join(' '));
    const searchableTokens = searchable.split(' ').filter(Boolean);

    const specificLevels = specificKeywords.map((token) => getTokenMatchLevel(token, searchable, searchableTokens));
    const genericLevels = genericKeywords.map((token) => getTokenMatchLevel(token, searchable, searchableTokens));

    const specificMatched = specificLevels.filter((level) => level > 0).length;
    const specificStrongMatched = specificLevels.filter((level) => level >= 2).length;
    const minSpecificRequired = specificKeywords.length >= 2 ? 2 : (specificKeywords.length === 1 ? 1 : 0);
    const hasSpecificPhraseInName = Boolean(specificPhrase && searchableName.includes(specificPhrase));

    if (minSpecificRequired > 0 && specificMatched < minSpecificRequired) {
      continue;
    }

    if (
      specificKeywords.length >= 2
      && !hasSpecificPhraseInName
      && specificStrongMatched < specificKeywords.length
    ) {
      continue;
    }

    let score = 0;

    if (searchableName === normalizedQuery) {
      score += 400;
    }

    if (searchableName.includes(normalizedQuery) && normalizedQuery.length >= 3) {
      score += 200;
    }

    if (hasSpecificPhraseInName) {
      score += 120;
    }

    specificLevels.forEach((level) => {
      score += scoreTokenLevel(level, true);
    });

    genericLevels.forEach((level) => {
      score += scoreTokenLevel(level, false);
    });

    if (specificKeywords.length > 0 && specificStrongMatched === specificKeywords.length) {
      score += 80;
    }

    if (specificKeywords.length > 0 && specificLevels.every((level) => level === 1)) {
      score -= 30;
    }

    ranked.push({ item, score });
  }

  return ranked.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }

    const aTime = new Date(a.item.createdAt || 0).getTime();
    const bTime = new Date(b.item.createdAt || 0).getTime();
    return bTime - aTime;
  });
};

const mapProduct = (doc) => {
  const id = String(doc._id);
  const sizes = pickSizes(doc);
  const colors = pickColors(doc);
  const stockCount = pickStockCount(doc);

  return {
    id,
    name: pickLocalizedText(doc.name) || 'San pham',
    category: pickLocalizedText(doc.category) || '',
    sizes,
    colors,
    price: resolveProductPrice(doc),
    image: pickImage(doc),
    stockCount,
    inStock: stockCount > 0,
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

const getProductAvailabilityMap = async (productIds = []) => {
  const ids = Array.isArray(productIds) ? productIds.filter(Boolean) : [];
  if (!ids.length) {
    return new Map();
  }

  const idStrings = ids.map((id) => String(id));

  const objectIds = ids
    .map((id) => String(id))
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  if (!objectIds.length && !idStrings.length) {
    return new Map();
  }

  const rows = await ProductInstance.aggregate([
    {
      $match: {
        $or: [
          ...(objectIds.length ? [{ productId: { $in: objectIds } }] : []),
          ...(idStrings.length ? [{ productId: { $in: idStrings } }] : []),
        ],
      },
    },
    {
      $group: {
        _id: '$productId',
        totalQuantity: { $sum: 1 },
        availableQuantity: {
          $sum: {
            $cond: [{ $eq: ['$lifecycleStatus', 'Available'] }, 1, 0],
          },
        },
      },
    },
  ]);

  return new Map(
    rows.map((row) => [
      String(row._id),
      {
        totalQuantity: Number(row.totalQuantity || 0),
        availableQuantity: Number(row.availableQuantity || 0),
      },
    ])
  );
};

const searchProductService = async ({ query, filters }) => {
  const mongoQuery = {
    isDraft: { $ne: true },
  };

  const rows = await Product.find(mongoQuery)
    .select('name category size sizes color colorVariants variantMatrix baseSalePrice baseRentPrice images createdAt')
    .limit(500)
    .lean();

  const mappedFromProduct = rows.map(mapProduct);
  const availabilityMap = await getProductAvailabilityMap(mappedFromProduct.map((item) => item.id));

  const mapped = mappedFromProduct.map((item) => {
    const availability = availabilityMap.get(item.id);
    if (!availability) {
      return item;
    }

    const hasInstanceInventory = availability.totalQuantity > 0;
    const stockCount = hasInstanceInventory ? availability.availableQuantity : item.stockCount;

    return {
      ...item,
      stockCount,
      inStock: stockCount > 0,
      totalQuantity: hasInstanceInventory ? availability.totalQuantity : item.stockCount,
      availableQuantity: hasInstanceInventory ? availability.availableQuantity : item.stockCount,
    };
  });
  const ranked = rankProductsByQuery({ products: mapped, query });
  const filteredByKeyword = ranked.map((entry) => entry.item);

  const filtered = filteredByKeyword.filter((item) => {
    const categoryFilter = normalizeText(filters.category || '');
    const sizeFilter = normalizeText(filters.size || '');
    const colorFilter = normalizeText(filters.color || '');
    const colorFilterValues = colorFilter
      ? colorFilter.split('|').map((value) => value.trim()).filter(Boolean)
      : [];

    if (categoryFilter) {
      const normalizedCategory = normalizeText(item.category || '');
      if (!normalizedCategory.includes(categoryFilter)) {
        return false;
      }
    }

    if (sizeFilter) {
      const hasSize = (item.sizes || []).some((value) => normalizeText(value) === sizeFilter);
      if (!hasSize) {
        return false;
      }
    }

    if (colorFilterValues.length > 0) {
      const hasColor = (item.colors || []).some((value) => {
        const normalizedColorValue = normalizeText(value);
        return colorFilterValues.some((expected) => normalizedColorValue.includes(expected));
      });
      if (!hasColor) {
        return false;
      }
    }

    if (typeof filters.inStock === 'boolean' && item.inStock !== filters.inStock) {
      return false;
    }

    if (Number.isFinite(filters.priceMin) && item.price < filters.priceMin) {
      return false;
    }

    if (Number.isFinite(filters.priceMax) && item.price > filters.priceMax) {
      return false;
    }

    return true;
  });

  const sorted = (filters.sortBy || filters.sortOrder)
    ? applyProductSorting(filtered, filters)
    : filtered;
  const page = filters.page;
  const limit = filters.limit;
  const start = (page - 1) * limit;
  const records = sorted.slice(start, start + limit);

  const appliedFilters = {
    category: filters.category || null,
    size: filters.size || null,
    color: filters.color || null,
    inStock: typeof filters.inStock === 'boolean' ? filters.inStock : null,
    priceMin: Number.isFinite(filters.priceMin) ? filters.priceMin : null,
    priceMax: Number.isFinite(filters.priceMax) ? filters.priceMax : null,
    sortBy: filters.sortBy || null,
    sortOrder: filters.sortOrder || null,
  };

  return {
    entity: 'product',
    page,
    limit,
    total: sorted.length,
    records,
    appliedFilters,
  };
};

module.exports = {
  searchProductService,
};