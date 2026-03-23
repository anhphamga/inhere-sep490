const Product = require('../model/Product.model');
const ProductInstance = require('../model/ProductInstance.model');
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

const toNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const toIntegerOrNaN = (value) => {
  const n = Number(value);
  return Number.isInteger(n) ? n : Number.NaN;
};

const normalizeImages = (images) => {
  if (!Array.isArray(images)) return [];
  return images
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean);
};

const normalizeText = (value) => String(value || '').trim();

const escapeRegex = (value = '') => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

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

const resolveProductSizes = (product = {}) => {
  if (Array.isArray(product?.sizes) && product.sizes.length > 0) {
    return normalizeSizes(product.sizes);
  }

  const sizesFromVariants = getLegacyVariantList(product)
    .map((variant) => normalizeSizeToken(variant?.size))
    .filter(Boolean);
  if (sizesFromVariants.length > 0) {
    return normalizeSizes(sizesFromVariants);
  }

  return normalizeSizes([product?.size]);
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
  const rawSizes = parseJsonLike(body.sizes, Array.isArray(body.sizes) ? body.sizes : [body.size]);
  const sizes = normalizeSizes(rawSizes);

  const rawColorVariants = parseJsonLike(body.colorVariants, []);
  const colorVariants = normalizeColorVariants(rawColorVariants);
  const colorNames = colorVariants.map((item) => item.name);
  const primaryColor = normalizeText(body.color) || colorNames[0] || '';

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
    size: normalizeText(body.size) || sizes[0] || '',
    sizes,
    color: primaryColor,
    colorVariants,
    pricingMode: normalizeText(body.pricingMode) === 'per_variant' ? 'per_variant' : 'common',
    commonRentPrice: Math.max(toNumber(body.commonRentPrice, toNumber(body.baseRentPrice, 0)), 0),
    variantMatrix: normalizeVariantMatrix(parseJsonLike(body.variantMatrix, [])),
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

  if (!hasLocalizedText(payload.name) || !hasLocalizedText(payload.category) || !payload.size || !payload.color) {
    return 'name, category, size, color are required';
  }

  const uniqueSizes = new Set((payload.sizes || []).map((item) => normalizeSizeToken(item)));
  if (uniqueSizes.size !== (payload.sizes || []).length) {
    return 'sizes must not contain duplicates';
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
  const sizes = resolveProductSizes(product);
  const colorVariants = resolveProductColorVariants(product);
  const variantMatrix = resolveVariantMatrix(product);
  const images = collectProductImages(product);
  const primaryColor = normalizeColorName(product?.color) || colorVariants[0]?.name || '';
  const variantRentPrices = resolveVariantRentPrices(product);

  return {
    id: product._id,
    _id: product._id,
    name: resolveLocalizedField(product, 'name', lang),
    category,
    categoryPath: product.categoryPath || toObject(product.category) || { parent: '', child: '', ancestors: [] },
    size: normalizeText(product.size) || sizes[0] || '',
    sizes,
    color: primaryColor,
    colorVariants,
    pricingMode: product.pricingMode || (variantMatrix.length > 0 ? 'per_variant' : 'common'),
    commonRentPrice: prices.commonRentPrice,
    variantMatrix,
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
    totalQuantity: quantity.totalQuantity || 0,
    availableQuantity: quantity.availableQuantity || 0,
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

const getQuantityMap = async (productIds = []) => {
  if (!Array.isArray(productIds) || productIds.length === 0) return new Map();

  const rows = await ProductInstance.aggregate([
    {
      $match: {
        productId: { $in: productIds },
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
        totalQuantity: row.totalQuantity || 0,
        availableQuantity: row.availableQuantity || 0,
      },
    ])
  );
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
      const regex = new RegExp(escapeRegex(search), 'i');
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
            { size: { $regex: regex } },
            { sizes: { $elemMatch: { $regex: regex } } },
            { 'colorVariants.name': { $regex: regex } },
          ],
        },
      ];
    }
    const allProducts = await Product.find(filter).sort({ createdAt: -1 }).lean();
    const normalizedProducts = allProducts.map((product) => sanitizeProduct(product, {}, lang));

    const filteredProducts = normalizedProducts.filter((product) => {
      if (purpose === 'buy') {
        return Number(product.baseSalePrice || 0) > 0;
      }
      if (purpose === 'fitting') {
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
    if (size) filter.size = size;
    if (color) filter.color = color;

    if (lifecycleStatus) {
      const productIds = await ProductInstance.distinct('productId', { lifecycleStatus });
      filter._id = { $in: productIds };
    }

    const products = await Product.find(filter).sort({ createdAt: -1 }).lean();
    const quantityMap = await getQuantityMap(products.map((item) => item._id));
    const data = products.map((item) => sanitizeProduct(item, quantityMap.get(String(item._id)), lang));

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

    const instances = await ProductInstance.find({ productId: product._id }).sort({ createdAt: -1 }).lean();
    const totalQuantity = instances.length;
    const availableQuantity = instances.filter((item) => item.lifecycleStatus === 'Available').length;

    return res.status(200).json({
      success: true,
      data: {
        product: sanitizeProduct(product, { totalQuantity, availableQuantity }, lang),
        instances,
        totalQuantity,
        availableQuantity,
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
    return res.status(200).json({
      success: true,
      data: sanitizeProduct(product, {}, lang),
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
    if (!hasLocalizedText(payload.name) || !hasLocalizedText(payload.category) || !payload.size || !payload.color) {
      return res.status(400).json({
        success: false,
        message: 'name, category, size, color are required',
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
    const quantityRaw = req.body?.quantity;
    const quantity = toIntegerOrNaN(quantityRaw);

    const validationError = ensureOwnerProductRequired(payload);
    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: 'quantity must be a positive integer',
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
    await createInstances({
      productId: created._id,
      quantity,
      baseRentPrice: created.baseRentPrice,
      baseSalePrice: created.baseSalePrice,
    });

    return res.status(201).json({
      success: true,
      data: sanitizeProduct(created.toObject(), { totalQuantity: quantity, availableQuantity: quantity }, lang),
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
    if (!hasLocalizedText(payload.name) || !hasLocalizedText(payload.category) || !payload.size || !payload.color) {
      return res.status(400).json({
        success: false,
        message: 'name, category, size, color are required',
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
    const quantityRaw = req.body?.quantity;
    const shouldAddQuantity = quantityRaw !== undefined && quantityRaw !== null && quantityRaw !== '';
    const addQuantity = shouldAddQuantity ? toIntegerOrNaN(quantityRaw) : 0;

    const validationError = ensureOwnerProductRequired(payload);
    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    if (shouldAddQuantity && (!Number.isInteger(addQuantity) || addQuantity < 0)) {
      return res.status(400).json({
        success: false,
        message: 'quantity must be an integer >= 0',
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

    if (addQuantity > 0) {
      await createInstances({
        productId: updated._id,
        quantity: addQuantity,
        baseRentPrice: updated.baseRentPrice,
        baseSalePrice: updated.baseSalePrice,
      });
    }

    const instances = await ProductInstance.find({ productId: updated._id }).lean();
    const totalQuantity = instances.length;
    const availableQuantity = instances.filter((item) => item.lifecycleStatus === 'Available').length;

    return res.status(200).json({
      success: true,
      data: {
        product: sanitizeProduct(updated.toObject(), { totalQuantity, availableQuantity }, lang),
        totalQuantity,
        availableQuantity,
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
  return res.status(501).json({
    success: false,
    message: 'Excel import is not implemented yet',
  });
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
    if (size) filter.size = size;
    if (color) filter.color = color;

    const products = await Product.find(filter).sort({ createdAt: -1 }).lean();
    const quantityMap = includeInstances ? await getQuantityMap(products.map((item) => item._id)) : new Map();

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
      return [
        String(product._id),
        resolveLocalizedField(product, 'name', lang),
        resolveLocalizedField(product, 'category', lang),
        product.size || '',
        product.color || '',
        product.baseRentPrice || 0,
        product.baseSalePrice || 0,
        product.depositAmount || 0,
        product.buyoutValue || 0,
        includeInstances ? quantity.totalQuantity || 0 : '',
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
// PRODUCT INSTANCE APIs (Quản lý tồn kho)
// ============================================

// Lấy danh sách ProductInstance với filter
const getProductInstances = async (req, res) => {
  try {
    const {
      productId,
      conditionLevel,
      lifecycleStatus,
      page = 1,
      limit = 20,
      search
    } = req.query;

    const filter = {};

    if (productId) {
      filter.productId = productId;
    }

    if (conditionLevel) {
      filter.conditionLevel = conditionLevel;
    }

    if (lifecycleStatus) {
      filter.lifecycleStatus = lifecycleStatus;
    }

    // Search theo product name
    let productIds = null;
    if (search) {
      const products = await Product.find({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { 'name.en': { $regex: search, $options: 'i' } },
          { 'name.vi': { $regex: search, $options: 'i' } }
        ]
      }).select('_id');
      productIds = products.map(p => p._id);
      filter.productId = { $in: productIds };
    }

    const skip = (page - 1) * limit;

    const [instances, total] = await Promise.all([
      ProductInstance.find(filter)
        .populate('productId', 'name images category')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      ProductInstance.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: instances,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get product instances error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách sản phẩm',
      error: error.message
    });
  }
};

// Lấy chi tiết một ProductInstance
const getProductInstanceById = async (req, res) => {
  try {
    const { id } = req.params;

    const instance = await ProductInstance.findById(id)
      .populate('productId', 'name images category baseRentPrice baseSalePrice');

    if (!instance) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sản phẩm'
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
      message: 'Lỗi khi lấy chi tiết sản phẩm',
      error: error.message
    });
  }
};

// Cập nhật ProductInstance (giá, trạng thái, tình trạng)
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
        message: 'Không tìm thấy sản phẩm'
      });
    }

    // Cập nhật các trường được gửi lên
    const before = instance.toObject();

    if ((conditionLevel !== undefined || conditionScore !== undefined) && !canUpdateCondition) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden - missing permission'
      });
    }

    if (conditionLevel) instance.conditionLevel = conditionLevel;
    if (conditionScore !== undefined) instance.conditionScore = conditionScore;
    if (lifecycleStatus) instance.lifecycleStatus = lifecycleStatus;
    if (currentRentPrice !== undefined) instance.currentRentPrice = currentRentPrice;
    if (currentSalePrice !== undefined) instance.currentSalePrice = currentSalePrice;
    if (note !== undefined) instance.note = note;

    await instance.save();

    // Populate để trả về
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
      message: 'Cập nhật sản phẩm thành công',
      data: updatedInstance
    });
  } catch (error) {
    console.error('Update product instance error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật sản phẩm',
      error: error.message
    });
  }
};

// Tạo mới ProductInstance
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
        message: 'Vui lòng cung cấp đầy đủ thông tin'
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sản phẩm cha'
      });
    }

    const instance = new ProductInstance({
      productId,
      conditionLevel: conditionLevel || 'New',
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
      message: 'Tạo sản phẩm thành công',
      data: populatedInstance
    });
  } catch (error) {
    console.error('Create product instance error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo sản phẩm',
      error: error.message
    });
  }
};

// Xóa ProductInstance
const deleteProductInstance = async (req, res) => {
  try {
    const { id } = req.params;

    const instance = await ProductInstance.findById(id);

    if (!instance) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sản phẩm'
      });
    }

    // Chỉ cho phép xóa nếu sản phẩm đang ở trạng thái Available
    if (instance.lifecycleStatus !== 'Available') {
      return res.status(400).json({
        success: false,
        message: 'Không thể xóa sản phẩm đang được thuê hoặc đang xử lý'
      });
    }

    await ProductInstance.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Xóa sản phẩm thành công'
    });
  } catch (error) {
    console.error('Delete product instance error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa sản phẩm',
      error: error.message
    });
  }
};

// Lấy danh sách instance còn available (dùng cho customer thuê)
const getAvailableInstances = async (req, res) => {
  try {
    const { productId } = req.params;
    const { conditionLevel } = req.query;

    const filter = {
      productId,
      lifecycleStatus: 'Available'
    };

    if (conditionLevel) {
      filter.conditionLevel = conditionLevel;
    }

    const instances = await ProductInstance.find(filter)
      .populate('productId', 'name images')
      .sort({ conditionScore: -1 });

    res.json({
      success: true,
      data: instances
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
