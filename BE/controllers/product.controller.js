const mongoose = require('mongoose');
const Product = require('../model/Product.model');
const ProductInstance = require('../model/ProductInstance.model');
const SizeGuide = require('../model/SizeGuide.model');
const RentOrderItem = require('../model/RentOrderItem.model');
const SaleOrderItem = require('../model/SaleOrderItem.model');
const { hasPermission } = require('../services/accessControl.service');
const { writeAuditLog } = require('../services/auditLog.service');
const { hasCloudinaryConfig, uploadImageBuffer } = require('../utils/cloudinary');
const {
  getRequestLang,
  resolveLocalizedField,
  normalizeLocalizedInput,
  hasLocalizedText,
} = require('../utils/i18n');
const {
  createSizeInstances,
  createSimpleInstances,
} = require('../services/productInstance.service');
const { reconcileInstancesToSizeRows } = require('../services/productInstance.sync.service');
const { importProductsFromFileBuffer } = require('../services/productImport.service');
const { notifyLowStockForProducts } = require('../services/alert.dispatcher.service');

const CONDITION_LEVEL_ALIASES = {
  Good: 'New',
  Damaged: 'Used'
};
const ALLOWED_CONDITION_LEVELS = new Set(['New', 'Used']);
const ALLOWED_CONDITION_SCORES = new Set([0, 25, 50, 75, 100]);

const normalizeConditionLevel = (value) => {
  if (value === undefined || value === null || value === '') return '';
  const raw = String(value).trim();
  return CONDITION_LEVEL_ALIASES[raw] || raw;
};

const normalizeConditionScore = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const score = Number(value);
  return Number.isFinite(score) ? score : Number.NaN;
};

const toNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const toIntegerOrNaN = (value) => {
  const n = Number(value);
  return Number.isInteger(n) ? n : Number.NaN;
};

/** Instance cÃƒÂ²n trong kho thuÃƒÂª (backend cÃƒÂ³ thÃ¡Â»Æ’ gÃƒÂ¡n theo ngÃƒÂ y), khÃƒÂ´ng tÃƒÂ­nh mÃ¡ÂºÂ¥t/Ã„â€˜ÃƒÂ£ bÃƒÂ¡n. */
const INSTANCE_STATUS_RENT_EXCLUDED = new Set(['Lost', 'Sold']);
const countRentableInstances = (instances = []) =>
  instances.filter((item) => !INSTANCE_STATUS_RENT_EXCLUDED.has(item.lifecycleStatus)).length;

const normalizeImages = (images) => {
  if (!Array.isArray(images)) return [];
  return images
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean);
};

const normalizeText = (value) => String(value || '').trim();

const escapeRegex = (value = '') => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const VIETNAMESE_CHAR_GROUPS = {
  a: 'aÃƒÂ ÃƒÂ¡Ã¡ÂºÂ¡Ã¡ÂºÂ£ÃƒÂ£ÃƒÂ¢Ã¡ÂºÂ§Ã¡ÂºÂ¥Ã¡ÂºÂ­Ã¡ÂºÂ©Ã¡ÂºÂ«Ã„Æ’Ã¡ÂºÂ±Ã¡ÂºÂ¯Ã¡ÂºÂ·Ã¡ÂºÂ³Ã¡ÂºÂµ',
  e: 'eÃƒÂ¨ÃƒÂ©Ã¡ÂºÂ¹Ã¡ÂºÂ»Ã¡ÂºÂ½ÃƒÂªÃ¡Â»ÂÃ¡ÂºÂ¿Ã¡Â»â€¡Ã¡Â»Æ’Ã¡Â»â€¦',
  i: 'iÃƒÂ¬ÃƒÂ­Ã¡Â»â€¹Ã¡Â»â€°Ã„Â©',
  o: 'oÃƒÂ²ÃƒÂ³Ã¡Â»ÂÃ¡Â»ÂÃƒÂµÃƒÂ´Ã¡Â»â€œÃ¡Â»â€˜Ã¡Â»â„¢Ã¡Â»â€¢Ã¡Â»â€”Ã†Â¡Ã¡Â»ÂÃ¡Â»â€ºÃ¡Â»Â£Ã¡Â»Å¸Ã¡Â»Â¡',
  u: 'uÃƒÂ¹ÃƒÂºÃ¡Â»Â¥Ã¡Â»Â§Ã…Â©Ã†Â°Ã¡Â»Â«Ã¡Â»Â©Ã¡Â»Â±Ã¡Â»Â­Ã¡Â»Â¯',
  y: 'yÃ¡Â»Â³ÃƒÂ½Ã¡Â»ÂµÃ¡Â»Â·Ã¡Â»Â¹',
  d: 'dÃ„â€˜',
};

const VIETNAMESE_CHAR_TO_GROUP = Object.entries(VIETNAMESE_CHAR_GROUPS).reduce((acc, [, chars]) => {
  chars.split('').forEach((char) => {
    acc[char] = chars;
  });
  return acc;
}, {});

const buildVietnameseInsensitivePattern = (value = '') => {
  const raw = String(value || '');
  let pattern = '';

  for (const char of raw) {
    if (/\s/.test(char)) {
      pattern += '\\s+';
      continue;
    }

    const lower = char.toLowerCase();
    const groupedChars = VIETNAMESE_CHAR_TO_GROUP[lower];
    if (groupedChars) {
      pattern += `[${groupedChars}]`;
      continue;
    }

    pattern += escapeRegex(char);
  }

  return pattern;
};

const parseJsonLike = (value, fallback) => {
  if (value === undefined || value === null || value === '') return fallback;
  if (Array.isArray(value) || (value && typeof value === 'object')) return value;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }
  return fallback;
};

const normalizeSizeToken = (value) => normalizeText(value).toUpperCase();

const normalizeSizes = (values) => {
  const source = Array.isArray(values) ? values : [];
  const seen = new Set();
  const result = [];

  source.forEach((item) => {
    const normalized = normalizeSizeToken(item);
    if (!normalized) return;
    if (seen.has(normalized)) return;
    seen.add(normalized);
    result.push(normalized);
  });

  return result;
};

const normalizeColorName = (value) => normalizeText(value);

const normalizeStringList = (values) => {
  const source = Array.isArray(values) ? values : [];
  const seen = new Set();
  const result = [];

  source.forEach((item) => {
    const normalized = normalizeText(item);
    if (!normalized) return;
    const key = normalized.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    result.push(normalized);
  });

  return result;
};

const toObject = (value) => (value && typeof value === 'object' && !Array.isArray(value) ? value : null);

const getLegacyPriceObject = (product = {}) => toObject(product?.price) || null;

const collectProductImages = (product = {}) => {
  const imageSet = new Set();

  normalizeImages(product?.images).forEach((image) => imageSet.add(image));

  (Array.isArray(product?.colorVariants) ? product.colorVariants : []).forEach((variant) => {
    normalizeImages(variant?.images).forEach((image) => imageSet.add(image));
  });

  (Array.isArray(product?.variants) ? product.variants : []).forEach((variant) => {
    normalizeImages(variant?.images).forEach((image) => imageSet.add(image));
    normalizeImages(variant?.imageUrls).forEach((image) => imageSet.add(image));
    normalizeImages(variant?.gallery).forEach((image) => imageSet.add(image));
    normalizeImages(variant?.galleryImages).forEach((image) => imageSet.add(image));

    const colorValue = toObject(variant?.color);
    normalizeImages(colorValue?.images).forEach((image) => imageSet.add(image));
  });

  const directImageUrl = normalizeText(product?.imageUrl);
  if (directImageUrl) imageSet.add(directImageUrl);

  return Array.from(imageSet);
};

const getLegacyVariantList = (product = {}) => (Array.isArray(product?.variants) ? product.variants : []);

const resolveProductPrices = (product = {}) => {
  const legacyPrice = getLegacyPriceObject(product);
  const firstVariantWithPrice = getLegacyVariantList(product).find((variant) => toObject(variant?.price));
  const firstVariantPrice = toObject(firstVariantWithPrice?.price);

  const baseRentPrice = Math.max(
    toNumber(
      product?.baseRentPrice,
      toNumber(product?.commonRentPrice, toNumber(legacyPrice?.rent, toNumber(firstVariantPrice?.rent, 0)))
    ),
    0
  );

  const baseSalePrice = Math.max(
    toNumber(
      product?.baseSalePrice,
      toNumber(legacyPrice?.sale, toNumber(firstVariantPrice?.sale, 0))
    ),
    0
  );

  const depositAmount = Math.max(
    toNumber(product?.depositAmount, toNumber(legacyPrice?.deposit, toNumber(firstVariantPrice?.deposit, 0))),
    0
  );

  const buyoutValue = Math.max(toNumber(product?.buyoutValue, baseSalePrice), 0);

  return {
    baseRentPrice,
    baseSalePrice,
    commonRentPrice: Math.max(toNumber(product?.commonRentPrice, baseRentPrice), 0),
    depositAmount,
    buyoutValue,
  };
};

const resolveProductCategory = (product = {}, lang = 'vi') => {
  const rawCategory = product?.category;
  const categoryObject = toObject(rawCategory);
  const categoryPath = toObject(product?.categoryPath);

  if (categoryPath?.child) return normalizeText(categoryPath.child);
  if (Array.isArray(categoryPath?.ancestors) && categoryPath.ancestors.length > 0) {
    return normalizeText(categoryPath.ancestors[categoryPath.ancestors.length - 1]);
  }
  if (categoryPath?.parent) return normalizeText(categoryPath.parent);

  if (categoryObject?.child) return normalizeText(categoryObject.child);
  if (categoryObject?.parent) return normalizeText(categoryObject.parent);

  return resolveLocalizedField(product, 'category', lang);
};

const normalizeSizeRows = (values) => {
  const source = Array.isArray(values) ? values : [];
  const seen = new Set();
  const result = [];

  source.forEach((item) => {
    if (!item || typeof item !== 'object') return;
    const size = normalizeSizeToken(item.size);
    if (!size) return;
    const key = size.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    result.push({
      size,
      quantity: Math.max(toIntegerOrNaN(item.quantity), 0) || 0,
    });
  });

  return result;
};

const resolveProductSizeRows = (product = {}, quantity = {}) => {
  const currentRows = normalizeSizeRows(product?.sizes);
  if (currentRows.length > 0) return currentRows;

  const sizesFromVariants = getLegacyVariantList(product)
    .map((variant) => normalizeSizeToken(variant?.size))
    .filter(Boolean);
  const legacySizes = normalizeSizes([
    ...sizesFromVariants,
    ...(Array.isArray(product?.sizes) ? product.sizes : []),
    product?.size,
  ]);
  if (legacySizes.length > 0) {
    const fallbackQty = Math.max(
      toIntegerOrNaN(quantity?.totalQuantity),
      toIntegerOrNaN(product?.quantity),
      0
    ) || 0;
    const perSize = Math.floor(fallbackQty / legacySizes.length);
    const remain = fallbackQty % legacySizes.length;
    return legacySizes.map((size, index) => ({
      size,
      quantity: perSize + (index < remain ? 1 : 0),
    }));
  }

  return [];
};

const resolveProductColorVariants = (product = {}) => {
  const currentVariants = normalizeColorVariants(product?.colorVariants);
  if (currentVariants.length > 0) {
    return currentVariants;
  }

  const grouped = new Map();
  getLegacyVariantList(product).forEach((variant) => {
    const name = normalizeColorName(variant?.color || variant?.colorName || variant?.name);
    if (!name) return;
    if (!grouped.has(name.toLowerCase())) {
      grouped.set(name.toLowerCase(), {
        name,
        images: [],
      });
    }
    const current = grouped.get(name.toLowerCase());
    collectProductImages(variant).forEach((image) => {
      if (!current.images.includes(image)) {
        current.images.push(image);
      }
    });
  });

  if (grouped.size > 0) {
    return Array.from(grouped.values());
  }

  const fallbackColor = normalizeColorName(product?.color);
  if (!fallbackColor) return [];

  return [{
    name: fallbackColor,
    images: collectProductImages(product),
  }];
};

const resolveVariantMatrix = (product = {}) => {
  const current = normalizeVariantMatrix(product?.variantMatrix);
  if (current.length > 0) return current;

  return normalizeVariantMatrix(
    getLegacyVariantList(product).map((variant) => ({
      size: variant?.size,
      color: variant?.color || variant?.colorName || variant?.name,
      rentPrice: variant?.price?.rent,
      salePrice: variant?.price?.sale,
      quantity: variant?.inventory?.available ?? variant?.inventory?.total ?? variant?.quantity ?? 0,
    }))
  );
};

const resolveVariantRentPrices = (product = {}) => {
  const variantRows = resolveVariantMatrix(product);
  return variantRows.reduce((acc, item) => {
    const size = normalizeSizeToken(item?.size);
    const color = normalizeColorName(item?.color);
    if (!size || !color) return acc;
    acc[`${size}__${color}`] = Math.max(toNumber(item?.rentPrice, 0), 0);
    return acc;
  }, {});
};

const normalizeColorVariants = (values) => {
  const source = Array.isArray(values) ? values : [];
  const seen = new Set();
  const result = [];

  source.forEach((item) => {
    if (!item || typeof item !== 'object') return;
    const name = normalizeColorName(item.name);
    if (!name) return;
    const key = name.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    result.push({
      name,
      images: normalizeImages(item.images),
    });
  });

  return result;
};

const normalizeVariantMatrix = (values) => {
  const source = Array.isArray(values) ? values : [];
  const result = [];
  const seen = new Set();

  source.forEach((item) => {
    if (!item || typeof item !== 'object') return;
    const size = normalizeSizeToken(item.size);
    const color = normalizeColorName(item.color);
    if (!size || !color) return;
    const key = `${size}::${color.toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);

    result.push({
      size,
      color,
      rentPrice: Math.max(toNumber(item.rentPrice, 0), 0),
      salePrice: Math.max(toNumber(item.salePrice, 0), 0),
      quantity: Math.max(toIntegerOrNaN(item.quantity), 0) || 0,
    });
  });

  return result;
};

const resolveHasSizes = (product = {}, sizeRows = []) => {
  if (typeof product?.hasSizes === 'boolean') return product.hasSizes;
  return sizeRows.length > 0;
};

const resolveStandaloneQuantity = (product = {}, quantity = {}) => {
  const fromPayload = toIntegerOrNaN(product?.quantity);
  if (Number.isInteger(fromPayload) && fromPayload >= 0) return fromPayload;
  const fromComputed = toIntegerOrNaN(quantity?.totalQuantity);
  if (Number.isInteger(fromComputed) && fromComputed >= 0) return fromComputed;
  return 0;
};

const applyCategoryFilter = (filter = {}, rawCategory = '') => {
  const category = normalizeText(rawCategory);
  if (!category) return filter;
  return {
    ...filter,
    $or: [
      { category },
      { 'category.vi': category },
      { 'category.en': category },
      { 'category.parent': category },
      { 'category.child': category },
      { 'categoryPath.parent': category },
      { 'categoryPath.child': category },
      { 'categoryPath.ancestors': category },
      { categoryVi: category },
      { categoryEn: category },
    ],
  };
};

const normalizePayload = (body = {}) => {
  const rawColorVariants = parseJsonLike(body.colorVariants, []);
  const colorVariants = normalizeColorVariants(rawColorVariants);
  const colorNames = colorVariants.map((item) => item.name);
  const primaryColor = normalizeText(body.color) || colorNames[0] || '';

  const rawSizeRows = parseJsonLike(body.sizes, body.sizes);
  let sizeRows = normalizeSizeRows(rawSizeRows);
  if (sizeRows.length === 0) {
    const fallbackSizes = normalizeSizes(parseJsonLike(body.sizes, Array.isArray(body.sizes) ? body.sizes : [body.size]));
    sizeRows = fallbackSizes.map((size) => ({ size, quantity: 0 }));
  }

  const hasSizesRaw = body.hasSizes;
  const hasSizesRawText = String(hasSizesRaw).toLowerCase();
  const explicitHasSizes = hasSizesRaw === true || hasSizesRawText === 'true';
  const explicitNoSizes = hasSizesRaw === false || hasSizesRawText === 'false';
  const hasSizes = explicitNoSizes ? false : (explicitHasSizes || sizeRows.length > 0);

  const standaloneQuantity = Math.max(toIntegerOrNaN(body.quantity), 0) || 0;

  const mergedImages = normalizeImages([
    ...normalizeImages(parseJsonLike(body.images, [])),
    ...colorVariants.flatMap((item) => item.images || []),
  ]);

  const categoryParent = normalizeText(body.categoryParent);
  const categoryChild = normalizeText(body.categoryChild);
  const categoryAncestors = normalizeStringList(parseJsonLike(body.categoryAncestors, []));
  const categoryValue = normalizeLocalizedInput(body, 'category');

  return {
    name: normalizeLocalizedInput(body, 'name'),
    category: categoryValue,
    categoryPath: {
      parent: categoryParent,
      child: categoryChild,
      ancestors: categoryAncestors,
    },
    hasSizes,
    sizes: hasSizes ? sizeRows : [],
    quantity: hasSizes ? 0 : standaloneQuantity,
    color: primaryColor,
    colorVariants, // deprecated input support
    pricingMode: normalizeText(body.pricingMode) === 'per_variant' ? 'per_variant' : 'common',
    commonRentPrice: Math.max(toNumber(body.commonRentPrice, toNumber(body.baseRentPrice, 0)), 0),
    variantMatrix: normalizeVariantMatrix(parseJsonLike(body.variantMatrix, [])), // deprecated input support
    isDraft: Boolean(body.isDraft === true || String(body.isDraft).toLowerCase() === 'true'),
    description: normalizeLocalizedInput(body, 'description'),
    images: mergedImages,
    baseRentPrice: toNumber(body.baseRentPrice, 0),
    baseSalePrice: toNumber(body.baseSalePrice, 0),
    depositAmount: Math.max(toNumber(body.depositAmount, 0), 0),
    buyoutValue: Math.max(toNumber(body.buyoutValue, 0), 0),
    likeCount: Math.max(toNumber(body.likeCount, 0), 0),
  };
};

const ensureOwnerProductRequired = (payload) => {
  if (payload.isDraft) {
    if (Number.isNaN(payload.baseRentPrice) || Number.isNaN(payload.baseSalePrice)) {
      return 'baseRentPrice and baseSalePrice must be valid numbers';
    }
    if (payload.baseRentPrice < 0 || payload.baseSalePrice < 0) {
      return 'baseRentPrice and baseSalePrice must be >= 0';
    }
    if (Number.isNaN(payload.depositAmount) || Number.isNaN(payload.buyoutValue)) {
      return 'depositAmount and buyoutValue must be valid numbers';
    }
    if (payload.depositAmount < 0 || payload.buyoutValue < 0) {
      return 'depositAmount and buyoutValue must be >= 0';
    }
    return null;
  }

  if (!hasLocalizedText(payload.name) || !hasLocalizedText(payload.category) || !payload.color) {
    return 'name, category, color are required';
  }

  if (payload.hasSizes) {
    if (!Array.isArray(payload.sizes) || payload.sizes.length === 0) {
      return 'sizes are required when hasSizes=true';
    }
    const uniqueSizes = new Set((payload.sizes || []).map((item) => normalizeSizeToken(item?.size)));
    if (uniqueSizes.size !== (payload.sizes || []).length) {
      return 'sizes must not contain duplicates';
    }
    const hasInvalidSizeQty = (payload.sizes || []).some((item) => !Number.isInteger(item?.quantity) || item.quantity < 0);
    if (hasInvalidSizeQty) {
      return 'sizes.quantity must be integer >= 0';
    }
  } else {
    if (!Number.isInteger(payload.quantity) || payload.quantity < 0) {
      return 'quantity must be integer >= 0 when hasSizes=false';
    }
  }

  const colorNames = (payload.colorVariants || []).map((item) => normalizeColorName(item.name).toLowerCase()).filter(Boolean);
  const uniqueColors = new Set(colorNames);
  if (uniqueColors.size !== colorNames.length) {
    return 'colors must not contain duplicates';
  }

  if (Number.isNaN(payload.baseRentPrice) || Number.isNaN(payload.baseSalePrice)) {
    return 'baseRentPrice and baseSalePrice must be valid numbers';
  }

  if (payload.baseRentPrice < 0 || payload.baseSalePrice < 0) {
    return 'baseRentPrice and baseSalePrice must be >= 0';
  }

  if (Number.isNaN(payload.depositAmount) || Number.isNaN(payload.buyoutValue)) {
    return 'depositAmount and buyoutValue must be valid numbers';
  }

  if (payload.depositAmount < 0 || payload.buyoutValue < 0) {
    return 'depositAmount and buyoutValue must be >= 0';
  }

  return null;
};

const toProductImageUrl = (product) => collectProductImages(product)[0] || '';

const sanitizeProduct = (product, quantity = {}, lang = 'vi') => {
  const prices = resolveProductPrices(product);
  const category = resolveProductCategory(product, lang);
  const images = collectProductImages(product);
  const sizeRows = resolveProductSizeRows(product, quantity);
  const hasSizes = resolveHasSizes(product, sizeRows);
  const sizeTokens = sizeRows.map((item) => item.size);
  const colorVariants = resolveProductColorVariants(product);
  const primaryColor = normalizeColorName(product?.color) || colorVariants[0]?.name || 'Default';
  const deprecatedVariantMatrix = resolveVariantMatrix(product);
  const variantRentPrices = resolveVariantRentPrices(product);
  const rawQuantity = resolveStandaloneQuantity(product, quantity);
  const resolvedQuantity = hasSizes
    ? sizeRows.reduce((sum, item) => sum + Math.max(Number(item?.quantity || 0), 0), 0)
    : rawQuantity;

  return {
    id: product._id,
    _id: product._id,
    name: resolveLocalizedField(product, 'name', lang),
    category,
    categoryPath: product.categoryPath || toObject(product.category) || { parent: '', child: '', ancestors: [] },
    size: sizeTokens[0] || '',
    hasSizes,
    sizes: hasSizes ? sizeRows : [],
    sizeOptions: sizeTokens,
    quantity: hasSizes ? 0 : resolvedQuantity,
    color: primaryColor,
    colorVariants: colorVariants.length > 0 ? colorVariants : [{ name: primaryColor, images }], // deprecated
    pricingMode: product.pricingMode || (deprecatedVariantMatrix.length > 0 ? 'per_variant' : 'common'),
    commonRentPrice: prices.commonRentPrice,
    variantMatrix: deprecatedVariantMatrix, // deprecated
    variantRentPrices,
    isDraft: Boolean(product.isDraft),
    description: resolveLocalizedField(product, 'description', lang),
    images,
    imageUrl: images[0] || '',
    baseRentPrice: prices.baseRentPrice,
    baseSalePrice: prices.baseSalePrice,
    depositAmount: prices.depositAmount,
    buyoutValue: prices.buyoutValue,
    likeCount: product.likeCount || 0,
    averageRating: Math.max(Number(product.averageRating || 0), 0),
    reviewCount: Math.max(Number(product.reviewCount || 0), 0),
    // Quantity fields must reflect computed inventory (ProductInstance). Legacy `product.quantity/sizes`
    // should not "inflate" stock when computed values exist (including 0).
    totalQuantity: Number.isFinite(Number(quantity.totalQuantity))
      ? Math.max(Number(quantity.totalQuantity), 0)
      : resolvedQuantity,
    availableQuantity: Number.isFinite(Number(quantity.availableQuantity))
      ? Math.max(Number(quantity.availableQuantity), 0)
      : resolvedQuantity,
    rentableQuantity: Number.isFinite(Number(quantity.rentableQuantity))
      ? Math.max(Number(quantity.rentableQuantity), 0)
      : resolvedQuantity,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
};

const uploadOwnerImages = async (files = []) => {
  if (!Array.isArray(files) || files.length === 0) {
    return [];
  }

  if (hasCloudinaryConfig()) {
    const uploaded = await Promise.all(
      files.map((file, index) =>
        uploadImageBuffer(file.buffer, {
          folder: 'inhere/products',
          public_id: `owner_product_${Date.now()}_${index}`,
          resource_type: 'image',
        }).then((result) => result.secure_url)
      )
    );
    return uploaded.filter(Boolean);
  }

  // Fallback for local/dev: keep image as data URL when cloud storage is not configured.
  return files.map((file) => `data:${file.mimetype};base64,${file.buffer.toString('base64')}`);
};

const createInstances = async ({ productId, quantity, baseRentPrice, baseSalePrice }) => {
  if (!Number.isInteger(quantity) || quantity <= 0) return;
  const docs = Array.from({ length: quantity }, () => ({
    productId,
    conditionLevel: 'New',
    conditionScore: 100,
    lifecycleStatus: 'Available',
    currentRentPrice: baseRentPrice,
    currentSalePrice: baseSalePrice,
  }));
  await ProductInstance.insertMany(docs);
};

const getQuantityMap = async (productIds = [], options = {}) => {
  if (!Array.isArray(productIds) || productIds.length === 0) return new Map();
  const excludeSold = Boolean(options.excludeSold);

  const rows = await ProductInstance.aggregate([
    {
      $match: {
        productId: { $in: productIds },
        ...(excludeSold ? { lifecycleStatus: { $ne: 'Sold' } } : {}),
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
        rentableQuantity: {
          $sum: {
            $cond: [{ $in: ['$lifecycleStatus', ['Lost', 'Sold']] }, 0, 1],
          },
        },
      },
    },
  ]);

  return new Map(
    rows.map((row) => [
      String(row._id),
      {
        totalQuantity: row.totalQuantity || 0,
        availableQuantity: row.availableQuantity || 0,
        rentableQuantity: row.rentableQuantity || 0,
      },
    ])
  );
};

/** TÃ¡Â»â€œn kho thÃ¡Â»Â±c tÃ¡ÂºÂ¿ theo size (ProductInstance, khÃƒÂ´ng tÃƒÂ­nh Sold) Ã¢â‚¬â€ dÃƒÂ¹ng mÃƒÂ n owner */
const getOwnerSizeStockMap = async (productIds = []) => {
  if (!Array.isArray(productIds) || productIds.length === 0) return new Map();

  const rows = await ProductInstance.aggregate([
    {
      $match: {
        productId: { $in: productIds },
        // Loại trừ cả Sold và Lost khỏi tồn kho hiển thị
        lifecycleStatus: { $nin: ['Sold', 'Lost'] },
      },
    },
    {
      $addFields: {
        normSize: {
          $let: {
            vars: {
              t: { $trim: { input: { $toString: { $ifNull: ['$size', ''] } } } },
            },
            in: {
              $cond: [{ $eq: ['$$t', ''] }, 'ONE', { $toUpper: '$$t' }],
            },
          },
        },
      },
    },
    {
      $group: {
        _id: { productId: '$productId', size: '$normSize' },
        total: { $sum: 1 },
        available: {
          $sum: { $cond: [{ $eq: ['$lifecycleStatus', 'Available'] }, 1, 0] },
        },
        reserved: {
          $sum: { $cond: [{ $eq: ['$lifecycleStatus', 'Reserved'] }, 1, 0] },
        },
        renting: {
          $sum: { $cond: [{ $in: ['$lifecycleStatus', ['Rented', 'Renting']] }, 1, 0] },
        },
        other: {
          $sum: {
            $cond: [
              { $in: ['$lifecycleStatus', ['Washing', 'Repair']] },
              1,
              0,
            ],
          },
        },
      },
    },
    { $sort: { '_id.size': 1 } },
  ]);

  const map = new Map();
  rows.forEach((row) => {
    const pid = String(row._id.productId);
    const size = row._id.size || 'ONE';
    if (!map.has(pid)) map.set(pid, []);
    map.get(pid).push({
      size,
      quantity: row.total || 0,       // tổng (không kể Sold/Lost)
      available: row.available || 0,  // chỉ Available
      reserved: row.reserved || 0,
      renting: row.renting || 0,
      other: row.other || 0,
    });
  });

  return map;
};

const getProducts = async (req, res) => {
  try {
    const lang = getRequestLang(req.query.lang);
    const purpose = (req.query.purpose || 'all').toLowerCase();
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 8, 1), 50);
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const category = normalizeText(req.query.category);
    const search = normalizeText(req.query.search);
    const skip = (page - 1) * limit;

    const withCategory = (filter) => applyCategoryFilter(filter, category);

    const filter = withCategory({});
    if (search) {
      const regex = new RegExp(buildVietnameseInsensitivePattern(search), 'i');
      filter.$and = [
        ...(Array.isArray(filter.$and) ? filter.$and : []),
        {
          $or: [
            { name: { $regex: regex } },
            { 'name.vi': { $regex: regex } },
            { 'name.en': { $regex: regex } },
            { category: { $regex: regex } },
            { 'category.vi': { $regex: regex } },
            { 'category.en': { $regex: regex } },
            { color: { $regex: regex } },
            { size: { $regex: regex } }, // deprecated
            { 'sizes.size': { $regex: regex } },
            { 'colorVariants.name': { $regex: regex } },
          ],
        },
      ];
    }
    const allProducts = await Product.find(filter).sort({ createdAt: -1 }).lean();
    const quantityMap = await getQuantityMap(allProducts.map((product) => product._id));
    const normalizedProducts = allProducts.map((product) => {
      // No fallback: if a product has no instances, treat stock as 0 on public listing.
      const quantity = quantityMap.get(String(product._id)) || {
        totalQuantity: 0,
        availableQuantity: 0,
        rentableQuantity: 0,
      };
      return sanitizeProduct(product, quantity, lang);
    });

    const filteredProducts = normalizedProducts.filter((product) => {
      if (purpose === 'buy') {
        return Number(product.baseSalePrice || 0) > 0;
      }
      if (purpose === 'fitting' || purpose === 'rent') {
        return Number(product.baseRentPrice || 0) > 0;
      }
      return true;
    });

    const totalItems = filteredProducts.length;
    const data = filteredProducts.slice(skip, skip + limit);

    return res.status(200).json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages: Math.ceil(totalItems / limit) || 1,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error getting products',
      error: error.message,
    });
  }
};

const listOwnerProducts = async (req, res) => {
  try {
    const lang = getRequestLang(req.query.lang);
    const filter = {};
    const category = normalizeText(req.query.category);
    const size = normalizeText(req.query.size);
    const color = normalizeText(req.query.color);
    const lifecycleStatus = normalizeText(req.query.lifecycleStatus);

    if (category) Object.assign(filter, applyCategoryFilter({}, category));
    if (size) {
      filter.$or = [{ size }, { sizes: { $elemMatch: { size } } }, { 'sizes.size': size }];
    }
    if (color) filter.color = color;

    if (lifecycleStatus) {
      const productIds = await ProductInstance.distinct('productId', { lifecycleStatus });
      filter._id = { $in: productIds };
    }

    const products = await Product.find(filter).sort({ createdAt: -1 }).lean();
    const productIds = products.map((item) => item._id);
    const quantityMap = await getQuantityMap(productIds, { excludeSold: true });
    const sizeStockMap = await getOwnerSizeStockMap(productIds);
    const data = products.map((item) => {
      const id = String(item._id);
      const quantity = quantityMap.get(id) || {
        totalQuantity: 0,
        availableQuantity: 0,
        rentableQuantity: 0,
      };
      const base = sanitizeProduct(item, quantity, lang);
      return {
        ...base,
        sizeStock: sizeStockMap.get(id) || [],
      };
    });

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error getting owner product list',
      error: error.message,
    });
  }
};

const getOwnerProductDetail = async (req, res) => {
  try {
    const lang = getRequestLang(req.query.lang);
    const { id } = req.params;
    const product = await Product.findById(id).lean();

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // SINGLE SOURCE OF TRUTH: ProductInstance
    const instances = await ProductInstance.find({ productId: product._id }).sort({ createdAt: -1 }).lean();
    
    // Compute sizes from instances (NOT from product.sizes)
    const { groupInstancesBySize, getInventoryTotals } = require('./product.inventory.helper');
    const computedSizes = groupInstancesBySize(instances, { excludeStatuses: ['Sold'] });
    const totals = getInventoryTotals(instances, { excludeStatuses: ['Sold'] });
    const managedInstances = instances.filter((instance) => instance?.lifecycleStatus !== 'Sold');

    return res.status(200).json({
      success: true,
      data: {
        product: sanitizeProduct(product, { 
          totalQuantity: totals.total, 
          availableQuantity: totals.available, 
          rentableQuantity: totals.rentable 
        }, lang),
        // COMPUTED FROM INSTANCES - Don't use product.sizes.quantity anymore
        sizes: computedSizes,
        instances: managedInstances,
        // All totals derived from instances
        totalQuantity: totals.total,
        availableQuantity: totals.available,
        rentableQuantity: totals.rentable,
        inventory: totals, // Full breakdown
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error getting owner product detail',
      error: error.message,
    });
  }
};

const getTopRentedProducts = async (req, res) => {
  try {
    const lang = getRequestLang(req.query.lang);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 4, 1), 12);

    const rows = await RentOrderItem.aggregate([
      { $group: { _id: '$productInstanceId', rentCount: { $sum: 1 } } },
      { $lookup: { from: 'productinstances', localField: '_id', foreignField: '_id', as: 'instance' } },
      { $unwind: '$instance' },
      { $group: { _id: '$instance.productId', rentCount: { $sum: '$rentCount' } } },
      { $sort: { rentCount: -1, _id: 1 } },
      { $limit: limit },
      { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'product' } },
      { $unwind: '$product' },
      {
        $project: {
          _id: '$product._id',
          name: '$product.name',
          category: '$product.category',
          imageUrl: { $ifNull: [{ $arrayElemAt: ['$product.images', 0] }, ''] },
          baseRentPrice: '$product.baseRentPrice',
          rentCount: 1,
        },
      },
      { $sort: { rentCount: -1, _id: 1 } },
    ]);

    const data = rows.map((item) => ({
      ...item,
      name: resolveLocalizedField(item, 'name', lang),
      category: resolveLocalizedField(item, 'category', lang),
    }));

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error getting top rented products',
      error: error.message,
    });
  }
};

const getTopLikedProducts = async (req, res) => {
  try {
    const lang = getRequestLang(req.query.lang);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 8, 1), 24);
    const rows = await Product.find({}).sort({ likeCount: -1, createdAt: -1, _id: 1 }).lean();

    const data = rows
      .map((product) => sanitizeProduct(product, {}, lang))
      .filter((product) => Number(product.baseRentPrice || 0) > 0)
      .slice(0, limit)
      .map((product) => ({
        _id: product._id,
        name: product.name,
        category: product.category,
        imageUrl: product.imageUrl,
        baseRentPrice: product.baseRentPrice,
        likeCount: product.likeCount || 0,
      }));

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error getting top liked products',
      error: error.message,
    });
  }
};

const getTopSoldProducts = async (req, res) => {
  try {
    const lang = getRequestLang(req.query.lang);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 8, 1), 24);

    const rows = await SaleOrderItem.aggregate([
      { $group: { _id: '$productId', soldQuantity: { $sum: '$quantity' } } },
      { $sort: { soldQuantity: -1, _id: 1 } },
      { $limit: limit },
      { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'product' } },
      { $unwind: '$product' },
      {
        $project: {
          _id: '$product._id',
          name: '$product.name',
          category: '$product.category',
          imageUrl: { $ifNull: [{ $arrayElemAt: ['$product.images', 0] }, ''] },
          baseSalePrice: '$product.baseSalePrice',
          soldQuantity: 1,
        },
      },
      { $sort: { soldQuantity: -1, _id: 1 } },
    ]);

    const data = rows.map((item) => ({
      ...item,
      name: resolveLocalizedField(item, 'name', lang),
      category: resolveLocalizedField(item, 'category', lang),
    }));

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error getting top sold products',
      error: error.message,
    });
  }
};

const getProductById = async (req, res) => {
  try {
    const lang = getRequestLang(req.query.lang);
    const product = await Product.findById(req.params.id).lean();
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }
    const instances = await ProductInstance.find({ productId: product._id }).lean();
    const quantity = {
      totalQuantity: instances.length,
      availableQuantity: instances.filter((item) => item.lifecycleStatus === 'Available').length,
      rentableQuantity: countRentableInstances(instances),
    };
    return res.status(200).json({
      success: true,
      data: sanitizeProduct(product, quantity, lang),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error getting product',
      error: error.message,
    });
  }
};

const getSimilarProducts = async (req, res) => {
  try {
    const lang = getRequestLang(req.query.lang);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 4, 1), 12);
    const product = await Product.findById(req.params.id).lean();

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    const categoryCandidates = [
      normalizeText(product?.categoryPath?.child),
      normalizeText(product?.categoryPath?.parent),
      ...normalizeStringList(product?.categoryPath?.ancestors),
      normalizeText(toObject(product?.category)?.child),
      normalizeText(toObject(product?.category)?.parent),
      normalizeText(resolveLocalizedField(product, 'category', 'vi')),
      normalizeText(resolveLocalizedField(product, 'category', 'en')),
    ].filter(Boolean);

    let relatedRows = [];

    for (const category of categoryCandidates) {
      const rows = await Product.find({
        _id: { $ne: product._id },
        ...applyCategoryFilter({}, category),
      })
        .sort({ likeCount: -1, createdAt: -1, _id: 1 })
        .limit(limit)
        .lean();

      if (rows.length > 0) {
        relatedRows = rows;
        break;
      }
    }

    if (relatedRows.length < limit) {
      const excludedIds = [product._id, ...relatedRows.map((item) => item._id)];
      const fallbackRows = await Product.find({
        _id: { $nin: excludedIds },
      })
        .sort({ likeCount: -1, createdAt: -1, _id: 1 })
        .limit(limit - relatedRows.length)
        .lean();

      relatedRows = relatedRows.concat(fallbackRows);
    }

    return res.status(200).json({
      success: true,
      data: relatedRows.map((item) => sanitizeProduct(item, {}, lang)),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error getting similar products',
      error: error.message,
    });
  }
};

const createProduct = async (req, res) => {
  try {
    const payload = normalizePayload(req.body);
    if (!hasLocalizedText(payload.name) || !hasLocalizedText(payload.category) || !payload.color) {
      return res.status(400).json({
        success: false,
        message: 'name, category, color are required',
      });
    }

    const created = await Product.create(payload);
    return res.status(201).json({
      success: true,
      data: created,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error creating product',
      error: error.message,
    });
  }
};

const createOwnerProduct = async (req, res) => {
  try {
    const lang = getRequestLang(req.query.lang);
    const payload = normalizePayload(req.body);

    const validationError = ensureOwnerProductRequired(payload);
    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const uploadedImages = await uploadOwnerImages(req.files);
    if (uploadedImages.length > 0) {
      payload.images = normalizeImages([...(payload.images || []), ...uploadedImages]);
    }

    if (!Array.isArray(payload.images) || payload.images.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'at least one product image is required',
      });
    }

    const created = await Product.create(payload);
    const pid = created._id;

    try {
      if (!payload.isDraft) {
        if (payload.hasSizes && Array.isArray(payload.sizes) && payload.sizes.length > 0) {
          await createSizeInstances({
            productId: pid,
            sizes: payload.sizes,
            baseRentPrice: payload.baseRentPrice,
            baseSalePrice: payload.baseSalePrice,
          });
        } else if (!payload.hasSizes && payload.quantity > 0) {
          await createSimpleInstances({
            productId: pid,
            quantity: payload.quantity,
            baseRentPrice: payload.baseRentPrice,
            baseSalePrice: payload.baseSalePrice,
          });
        }
      }
    } catch (syncErr) {
      const syncError = syncErr?.message || String(syncErr);
      await Product.findByIdAndDelete(pid);
      return res.status(500).json({
        success: false,
        message: 'Error creating product inventory',
        error: syncError,
      });
    }

    await notifyLowStockForProducts([pid]);
    return res.status(201).json({
      success: true,
      data: sanitizeProduct(created.toObject(), {}, lang),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error creating owner product',
      error: error.message,
    });
  }
};

const updateProduct = async (req, res) => {
  try {
    const payload = normalizePayload(req.body);
    if (!hasLocalizedText(payload.name) || !hasLocalizedText(payload.category) || !payload.color) {
      return res.status(400).json({
        success: false,
        message: 'name, category, color are required',
      });
    }

    const updated = await Product.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    });
    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }
    return res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error updating product',
      error: error.message,
    });
  }
};

const updateOwnerProduct = async (req, res) => {
  try {
    const lang = getRequestLang(req.query.lang);
    const payload = normalizePayload(req.body);

    const validationError = ensureOwnerProductRequired(payload);
    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const existing = await Product.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    const uploadedImages = await uploadOwnerImages(req.files);
    const nextPayload = {
      ...payload,
      images: uploadedImages.length > 0
        ? normalizeImages([...(payload.images || []), ...uploadedImages])
        : (Array.isArray(payload.images) && payload.images.length > 0 ? payload.images : existing.images),
    };

    if (!Array.isArray(nextPayload.images) || nextPayload.images.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'at least one product image is required',
      });
    }

    const updated = await Product.findByIdAndUpdate(req.params.id, nextPayload, {
      new: true,
      runValidators: true,
    });

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    try {
      if (!nextPayload.isDraft && payload.hasSizes && Array.isArray(payload.sizes) && payload.sizes.length > 0) {
        // Use actual inventory as baseline to avoid drift between Product.sizes and ProductInstance.
        const currentSizeStockMap = await getOwnerSizeStockMap([updated._id]);
        const currentSizeRows = currentSizeStockMap.get(String(updated._id)) || [];

        await reconcileInstancesToSizeRows(
          updated._id,
          currentSizeRows,
          nextPayload.sizes,
          {
            baseRentPrice: updated.baseRentPrice,
            baseSalePrice: updated.baseSalePrice,
          }
        );
      }
    } catch (syncErr) {
      const syncError = syncErr?.message || String(syncErr);
      return res.status(500).json({
        success: false,
        message: 'Error updating product inventory',
        error: syncError,
      });
    }

    const quantityMap = await getQuantityMap([updated._id], { excludeSold: true });
    const quantityFromInstances = quantityMap.get(String(updated._id)) || {};
    await notifyLowStockForProducts([updated._id]);
    return res.status(200).json({
      success: true,
      data: {
        product: sanitizeProduct(updated.toObject(), quantityFromInstances, lang),
        totalQuantity: quantityFromInstances.totalQuantity || updated.quantity || 0,
        availableQuantity: quantityFromInstances.availableQuantity || updated.quantity || 0,
        rentableQuantity: quantityFromInstances.rentableQuantity || updated.quantity || 0,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error updating owner product',
      error: error.message,
    });
  }
};

const updateOwnerProductCollateral = async (req, res) => {
  try {
    const lang = getRequestLang(req.query.lang);
    const payload = {};
    if (Object.prototype.hasOwnProperty.call(req.body, 'depositAmount')) {
      payload.depositAmount = Math.max(toNumber(req.body.depositAmount, 0), 0);
    }
    if (Object.prototype.hasOwnProperty.call(req.body, 'buyoutValue')) {
      payload.buyoutValue = Math.max(toNumber(req.body.buyoutValue, 0), 0);
    }

    if (Object.keys(payload).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'depositAmount or buyoutValue is required',
      });
    }

    const updated = await Product.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    }).lean();

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: sanitizeProduct(updated, {}, lang),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error updating collateral info',
      error: error.message,
    });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const deleted = await Product.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    await SizeGuide.deleteMany({ type: 'product', productId: deleted._id });

    return res.status(200).json({
      success: true,
      message: 'Deleted successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error deleting product',
      error: error.message,
    });
  }
};

const deleteOwnerProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Product.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    await ProductInstance.deleteMany({ productId: deleted._id });
    await SizeGuide.deleteMany({ type: 'product', productId: deleted._id });

    return res.status(200).json({
      success: true,
      message: 'Deleted successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error deleting owner product',
      error: error.message,
    });
  }
};

const importOwnerProducts = async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({
        success: false,
        message: 'Vui long chon file Excel/CSV de import.',
      });
    }

    const originalName = String(req.file.originalname || '').toLowerCase();
    const isSupportedFile = (
      originalName.endsWith('.csv')
      || originalName.endsWith('.xlsx')
      || originalName.endsWith('.xls')
    );
    if (!isSupportedFile) {
      return res.status(400).json({
        success: false,
        message: 'Chi ho tro file dinh dang Excel/CSV.',
      });
    }

    const result = await importProductsFromFileBuffer({
      buffer: req.file.buffer,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
    });

    return res.status(200).json({
      success: true,
      message: 'Import completed',
      successCount: result.successCount,
      failedCount: result.failedCount,
      errors: result.errors,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Khong the import san pham luc nay.',
      error: error.message,
    });
  }
};
const exportOwnerProducts = async (req, res) => {
  try {
    const lang = getRequestLang(req.query.lang);
    const includeInstances = String(req.query.includeInstances || '').toLowerCase() === 'true';
    const filter = {};
    const category = normalizeText(req.query.category);
    const size = normalizeText(req.query.size);
    const color = normalizeText(req.query.color);

    if (category) Object.assign(filter, applyCategoryFilter({}, category));
    if (size) {
      filter.$or = [{ size }, { sizes: { $elemMatch: { size } } }, { 'sizes.size': size }];
    }
    if (color) filter.color = color;

    const products = await Product.find(filter).sort({ createdAt: -1 }).lean();
    const quantityMap = includeInstances
      ? await getQuantityMap(products.map((item) => item._id), { excludeSold: true })
      : new Map();

    const header = [
      'id',
      'name',
      'category',
      'size',
      'color',
      'baseRentPrice',
      'baseSalePrice',
      'depositAmount',
      'buyoutValue',
      'totalQuantity',
      'availableQuantity',
    ];

    const rows = products.map((product) => {
      const quantity = quantityMap.get(String(product._id)) || {};
      const normalizedRows = normalizeSizeRows(product?.sizes);
      const rowSize = normalizedRows[0]?.size || normalizeText(product.size) || '';
      const rowQuantity = normalizedRows.length > 0
        ? normalizedRows.reduce((sum, item) => sum + Number(item.quantity || 0), 0)
        : Math.max(toIntegerOrNaN(product.quantity), 0) || 0;
      return [
        String(product._id),
        resolveLocalizedField(product, 'name', lang),
        resolveLocalizedField(product, 'category', lang),
        rowSize,
        product.color || '',
        product.baseRentPrice || 0,
        product.baseSalePrice || 0,
        product.depositAmount || 0,
        product.buyoutValue || 0,
        includeInstances ? quantity.totalQuantity || rowQuantity : rowQuantity,
        includeInstances ? quantity.availableQuantity || 0 : '',
      ];
    });

    const csv = [header, ...rows]
      .map((line) =>
        line
          .map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`)
          .join(',')
      )
      .join('\n');

    const filename = `owner_products_${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(`\uFEFF${csv}`);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error exporting owner products',
      error: error.message,
    });
  }
};

// ============================================
// PRODUCT INSTANCE APIs (QuÃ¡ÂºÂ£n lÃƒÂ½ tÃ¡Â»â€œn kho)
// ============================================

// LÃ¡ÂºÂ¥y danh sÃƒÂ¡ch ProductInstance vÃ¡Â»â€ºi filter
const getProductInstances = async (req, res) => {
  try {
    // productId can come from route params (/:productId/instances) or query string
    const resolvedProductId = req.params.productId || req.query.productId || null;

    const {
      conditionLevel,
      lifecycleStatus,
      page = 1,
      limit = 100,
      search,
    } = req.query;

    const filter = {};

    if (resolvedProductId) {
      if (!mongoose.isValidObjectId(resolvedProductId)) {
        return res.status(400).json({ success: false, message: 'productId khong hop le' });
      }
      filter.productId = new mongoose.Types.ObjectId(resolvedProductId);
    }

    if (conditionLevel) {
      const normalizedLevel = normalizeConditionLevel(conditionLevel);
      if (!ALLOWED_CONDITION_LEVELS.has(normalizedLevel)) {
        return res.status(400).json({ success: false, message: 'Tinh trang chi chap nhan New hoac Used' });
      }
      filter.conditionLevel = normalizedLevel;
    }

    if (lifecycleStatus) {
      filter.lifecycleStatus = lifecycleStatus;
    }

    // Search within the product scope (by instance code / size / note)
    if (search && resolvedProductId) {
      const searchRegex = new RegExp(buildVietnameseInsensitivePattern(search.trim()), 'i');
      filter.$or = [
        { instanceCode: { $regex: searchRegex } },
        { code: { $regex: searchRegex } },
        { size: { $regex: searchRegex } },
        { note: { $regex: searchRegex } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(parseInt(limit, 10) || 100, 500));
    const skip = (pageNum - 1) * limitNum;

    const [instances, total] = await Promise.all([
      ProductInstance.find(filter)
        .populate('productId', 'name images category')
        .sort({ size: 1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      ProductInstance.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: instances,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Get product instances error:', error);
    res.status(500).json({
      success: false,
      message: 'Loi khi lay danh sach phan ban',
      error: error.message,
    });
  }
};

// LÃ¡ÂºÂ¥y chi tiÃ¡ÂºÂ¿t mÃ¡Â»â„¢t ProductInstance
const getProductInstanceById = async (req, res) => {
  try {
    const { id } = req.params;

    const instance = await ProductInstance.findById(id)
      .populate('productId', 'name images category baseRentPrice baseSalePrice');

    if (!instance) {
      return res.status(404).json({
        success: false,
        message: 'KhÃƒÂ´ng tÃƒÂ¬m thÃ¡ÂºÂ¥y sÃ¡ÂºÂ£n phÃ¡ÂºÂ©m'
      });
    }

    res.json({
      success: true,
      data: instance
    });
  } catch (error) {
    console.error('Get product instance error:', error);
    res.status(500).json({
      success: false,
      message: 'LÃ¡Â»â€”i khi lÃ¡ÂºÂ¥y chi tiÃ¡ÂºÂ¿t sÃ¡ÂºÂ£n phÃ¡ÂºÂ©m',
      error: error.message
    });
  }
};

// CÃ¡ÂºÂ­p nhÃ¡ÂºÂ­t ProductInstance (giÃƒÂ¡, trÃ¡ÂºÂ¡ng thÃƒÂ¡i, tÃƒÂ¬nh trÃ¡ÂºÂ¡ng)
const updateProductInstance = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      conditionLevel,
      conditionScore,
      lifecycleStatus,
      currentRentPrice,
      currentSalePrice,
      note
    } = req.body;

    const instance = await ProductInstance.findById(id);
    const canUpdateCondition = hasPermission(req.access, 'inventory.item.update_condition');

    if (!instance) {
      return res.status(404).json({
        success: false,
        message: 'KhÃƒÂ´ng tÃƒÂ¬m thÃ¡ÂºÂ¥y sÃ¡ÂºÂ£n phÃ¡ÂºÂ©m'
      });
    }

    // CÃ¡ÂºÂ­p nhÃ¡ÂºÂ­t cÃƒÂ¡c trÃ†Â°Ã¡Â»Âng Ã„â€˜Ã†Â°Ã¡Â»Â£c gÃ¡Â»Â­i lÃƒÂªn
    const before = instance.toObject();

    if ((conditionLevel !== undefined || conditionScore !== undefined) && !canUpdateCondition) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden - missing permission'
      });
    }

    if (conditionLevel !== undefined) {
      const normalizedLevel = normalizeConditionLevel(conditionLevel);
      if (!ALLOWED_CONDITION_LEVELS.has(normalizedLevel)) {
        return res.status(400).json({
          success: false,
          message: 'TÃƒÂ¬nh trÃ¡ÂºÂ¡ng chÃ¡Â»â€° chÃ¡ÂºÂ¥p nhÃ¡ÂºÂ­n New hoÃ¡ÂºÂ·c Used'
        });
      }
      instance.conditionLevel = normalizedLevel;
    }
    if (conditionScore !== undefined) {
      const normalizedScore = normalizeConditionScore(conditionScore);
      if (!ALLOWED_CONDITION_SCORES.has(normalizedScore)) {
        return res.status(400).json({
          success: false,
          message: 'Ã„ÂiÃ¡Â»Æ’m tÃƒÂ¬nh trÃ¡ÂºÂ¡ng chÃ¡Â»â€° chÃ¡ÂºÂ¥p nhÃ¡ÂºÂ­n 0, 25, 50, 75 hoÃ¡ÂºÂ·c 100'
        });
      }
      instance.conditionScore = normalizedScore;
    }
    if (lifecycleStatus) instance.lifecycleStatus = lifecycleStatus;
    if (currentRentPrice !== undefined) instance.currentRentPrice = currentRentPrice;
    if (currentSalePrice !== undefined) instance.currentSalePrice = currentSalePrice;
    if (note !== undefined) instance.note = note;

    await instance.save();

    // Populate Ã„â€˜Ã¡Â»Æ’ trÃ¡ÂºÂ£ vÃ¡Â»Â
    const updatedInstance = await ProductInstance.findById(id)
      .populate('productId', 'name images category');

    await writeAuditLog({
      req,
      user: req.user,
      action: 'inventory.item.update_condition',
      resource: 'ProductInstance',
      resourceId: updatedInstance._id,
      before: {
        conditionLevel: before.conditionLevel,
        conditionScore: before.conditionScore,
        lifecycleStatus: before.lifecycleStatus,
        currentRentPrice: before.currentRentPrice,
        currentSalePrice: before.currentSalePrice,
        note: before.note,
      },
      after: {
        conditionLevel: updatedInstance.conditionLevel,
        conditionScore: updatedInstance.conditionScore,
        lifecycleStatus: updatedInstance.lifecycleStatus,
        currentRentPrice: updatedInstance.currentRentPrice,
        currentSalePrice: updatedInstance.currentSalePrice,
        note: updatedInstance.note,
      },
    });

    res.json({
      success: true,
      message: 'CÃ¡ÂºÂ­p nhÃ¡ÂºÂ­t sÃ¡ÂºÂ£n phÃ¡ÂºÂ©m thÃƒÂ nh cÃƒÂ´ng',
      data: updatedInstance
    });
  } catch (error) {
    console.error('Update product instance error:', error);
    res.status(500).json({
      success: false,
      message: 'LÃ¡Â»â€”i khi cÃ¡ÂºÂ­p nhÃ¡ÂºÂ­t sÃ¡ÂºÂ£n phÃ¡ÂºÂ©m',
      error: error.message
    });
  }
};

// TÃ¡ÂºÂ¡o mÃ¡Â»â€ºi ProductInstance
const createProductInstance = async (req, res) => {
  try {
    const {
      productId,
      conditionLevel,
      currentRentPrice,
      currentSalePrice,
      note
    } = req.body;

    if (!productId || !currentRentPrice || !currentSalePrice) {
      return res.status(400).json({
        success: false,
        message: 'Vui lÃƒÂ²ng cung cÃ¡ÂºÂ¥p Ã„â€˜Ã¡ÂºÂ§y Ã„â€˜Ã¡Â»Â§ thÃƒÂ´ng tin'
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'KhÃƒÂ´ng tÃƒÂ¬m thÃ¡ÂºÂ¥y sÃ¡ÂºÂ£n phÃ¡ÂºÂ©m cha'
      });
    }

    const normalizedLevel = conditionLevel ? normalizeConditionLevel(conditionLevel) : 'New';
    if (!ALLOWED_CONDITION_LEVELS.has(normalizedLevel)) {
      return res.status(400).json({
        success: false,
        message: 'TÃƒÂ¬nh trÃ¡ÂºÂ¡ng chÃ¡Â»â€° chÃ¡ÂºÂ¥p nhÃ¡ÂºÂ­n New hoÃ¡ÂºÂ·c Used'
      });
    }

    const instance = new ProductInstance({
      productId,
      conditionLevel: normalizedLevel,
      conditionScore: 100,
      lifecycleStatus: 'Available',
      currentRentPrice,
      currentSalePrice,
      note: note || ''
    });

    await instance.save();

    const populatedInstance = await ProductInstance.findById(instance._id)
      .populate('productId', 'name images category');

    res.status(201).json({
      success: true,
      message: 'TÃ¡ÂºÂ¡o sÃ¡ÂºÂ£n phÃ¡ÂºÂ©m thÃƒÂ nh cÃƒÂ´ng',
      data: populatedInstance
    });
  } catch (error) {
    console.error('Create product instance error:', error);
    res.status(500).json({
      success: false,
      message: 'LÃ¡Â»â€”i khi tÃ¡ÂºÂ¡o sÃ¡ÂºÂ£n phÃ¡ÂºÂ©m',
      error: error.message
    });
  }
};

// XÃƒÂ³a ProductInstance
const deleteProductInstance = async (req, res) => {
  try {
    const { id } = req.params;

    const instance = await ProductInstance.findById(id);

    if (!instance) {
      return res.status(404).json({
        success: false,
        message: 'KhÃƒÂ´ng tÃƒÂ¬m thÃ¡ÂºÂ¥y sÃ¡ÂºÂ£n phÃ¡ÂºÂ©m'
      });
    }

    // ChÃ¡Â»â€° cho phÃƒÂ©p xÃƒÂ³a nÃ¡ÂºÂ¿u sÃ¡ÂºÂ£n phÃ¡ÂºÂ©m Ã„â€˜ang Ã¡Â»Å¸ trÃ¡ÂºÂ¡ng thÃƒÂ¡i Available
    if (instance.lifecycleStatus !== 'Available') {
      return res.status(400).json({
        success: false,
        message: 'KhÃƒÂ´ng thÃ¡Â»Æ’ xÃƒÂ³a sÃ¡ÂºÂ£n phÃ¡ÂºÂ©m Ã„â€˜ang Ã„â€˜Ã†Â°Ã¡Â»Â£c thuÃƒÂª hoÃ¡ÂºÂ·c Ã„â€˜ang xÃ¡Â»Â­ lÃƒÂ½'
      });
    }

    await ProductInstance.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'XÃƒÂ³a sÃ¡ÂºÂ£n phÃ¡ÂºÂ©m thÃƒÂ nh cÃƒÂ´ng'
    });
  } catch (error) {
    console.error('Delete product instance error:', error);
    res.status(500).json({
      success: false,
      message: 'LÃ¡Â»â€”i khi xÃƒÂ³a sÃ¡ÂºÂ£n phÃ¡ÂºÂ©m',
      error: error.message
    });
  }
};

// Lấy danh sách instance có thể thuê/mua (dùng cho trang chi tiết khách hàng).
// - Size/Color/Condition phải lấy từ ProductInstance (không từ Product.sizes).
// - Rentable: chỉ loại các lifecycle kết thúc (Lost/Sold). Một instance đang Reserved/Rented
//   vẫn có thể thuê cho khoảng ngày khác không overlap, nên phải hiện ra ở chỗ thuê.
// - Purchasable: chỉ Available (đồ đang thuê không bán được).
const RENT_BLOCKING_LIFECYCLE = ['Lost', 'Sold'];

const getAvailableInstances = async (req, res) => {
  try {
    const { productId } = req.params;
    const { conditionLevel } = req.query;

    const filter = {
      productId,
      lifecycleStatus: { $nin: RENT_BLOCKING_LIFECYCLE }
    };

    if (conditionLevel) {
      const normalizedLevel = normalizeConditionLevel(conditionLevel);
      if (!ALLOWED_CONDITION_LEVELS.has(normalizedLevel)) {
        return res.status(400).json({
          success: false,
          message: 'Tình trạng chỉ chấp nhận New hoặc Used'
        });
      }
      filter.conditionLevel = normalizedLevel;
    }

    const rawInstances = await ProductInstance.find(filter)
      .populate('productId', 'name images')
      .sort({ conditionScore: -1 })
      .lean();

    const instances = rawInstances.map((inst) => ({
      ...inst,
      isPurchasable: inst.lifecycleStatus === 'Available',
    }));

    // EXTRACT SIZES, COLORS, CONDITIONS FROM INSTANCES ONLY
    const sizesSet = new Set();
    const colorsSet = new Set();
    const conditionsSet = new Set();

    instances.forEach((instance) => {
      const size = String(instance?.size || '').trim().toUpperCase();
      const color = String(instance?.color || '').trim();
      const conditionLevel = String(instance?.conditionLevel || '').trim();

      if (size) sizesSet.add(size);
      if (color) colorsSet.add(color);
      if (conditionLevel) conditionsSet.add(conditionLevel);
    });

    const sizes = Array.from(sizesSet).sort();
    const colors = Array.from(colorsSet).sort();
    const conditions = Array.from(conditionsSet).sort();

    const totalPurchasable = instances.filter((inst) => inst.isPurchasable).length;

    res.json({
      success: true,
      data: {
        instances,
        sizes,
        colors,
        conditions,
        totalAvailable: instances.length,
        totalPurchasable,
      }
    });
  } catch (error) {
    console.error('Get available instances error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách sản phẩm có sẵn',
      error: error.message
    });
  }
};

module.exports = {
  getProducts,
  listOwnerProducts,
  getOwnerProductDetail,
  getTopRentedProducts,
  getTopLikedProducts,
  getTopSoldProducts,
  getProductById,
  getSimilarProducts,
  createProduct,
  createOwnerProduct,
  updateProduct,
  updateOwnerProduct,
  updateOwnerProductCollateral,
  deleteProduct,
  deleteOwnerProduct,
  importOwnerProducts,
  exportOwnerProducts,
  // Product Instance APIs
  getProductInstances,
  getProductInstanceById,
  updateProductInstance,
  createProductInstance,
  deleteProductInstance,
  getAvailableInstances,
};

