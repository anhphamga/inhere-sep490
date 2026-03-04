const Product = require('../model/Product.model');
const ProductInstance = require('../model/ProductInstance.model');
const RentOrderItem = require('../model/RentOrderItem.model');
const SaleOrderItem = require('../model/SaleOrderItem.model');
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
  const categoryValue = normalizeLocalizedInput(body, 'category');

  return {
    name: normalizeLocalizedInput(body, 'name'),
    category: categoryValue,
    categoryPath: {
      parent: categoryParent,
      child: categoryChild,
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

const toProductImageUrl = (product) =>
  Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : '';

const sanitizeProduct = (product, quantity = {}, lang = 'vi') => ({
  id: product._id,
  _id: product._id,
  name: resolveLocalizedField(product, 'name', lang),
  category: resolveLocalizedField(product, 'category', lang),
  categoryPath: product.categoryPath || { parent: '', child: '' },
  size: product.size,
  sizes: Array.isArray(product.sizes) && product.sizes.length > 0 ? product.sizes : [product.size].filter(Boolean),
  color: product.color,
  colorVariants: Array.isArray(product.colorVariants) ? product.colorVariants : [],
  pricingMode: product.pricingMode || 'common',
  commonRentPrice: toNumber(product.commonRentPrice, toNumber(product.baseRentPrice, 0)),
  variantMatrix: Array.isArray(product.variantMatrix) ? product.variantMatrix : [],
  isDraft: Boolean(product.isDraft),
  description: resolveLocalizedField(product, 'description', lang),
  images: Array.isArray(product.images) ? product.images : [],
  imageUrl: toProductImageUrl(product),
  baseRentPrice: product.baseRentPrice,
  baseSalePrice: product.baseSalePrice,
  depositAmount: toNumber(product.depositAmount, 0),
  buyoutValue: toNumber(product.buyoutValue, 0),
  likeCount: product.likeCount || 0,
  totalQuantity: quantity.totalQuantity || 0,
  availableQuantity: quantity.availableQuantity || 0,
  createdAt: product.createdAt,
  updatedAt: product.updatedAt,
});

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
    const skip = (page - 1) * limit;

    const withCategory = (filter) => applyCategoryFilter(filter, category);

    let products = [];
    let totalItems = 0;
    if (purpose === 'buy') {
      const primaryFilter = withCategory({ baseSalePrice: { $gt: 0 } });
      totalItems = await Product.countDocuments(primaryFilter);
      if (totalItems > 0) {
        products = await Product.find(primaryFilter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean();
      } else {
        const fallbackFilter = withCategory({});
        totalItems = await Product.countDocuments(fallbackFilter);
        products = await Product.find(fallbackFilter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean();
      }
    } else if (purpose === 'fitting') {
      const filter = withCategory({ baseRentPrice: { $gt: 0 } });
      totalItems = await Product.countDocuments(filter);
      products = await Product.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean();
    } else {
      const filter = withCategory({});
      totalItems = await Product.countDocuments(filter);
      products = await Product.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean();
    }

    const data = products.map((product) => ({
      _id: product._id,
      name: resolveLocalizedField(product, 'name', lang),
      category: resolveLocalizedField(product, 'category', lang),
      imageUrl: toProductImageUrl(product),
      createdAt: product.createdAt,
      baseRentPrice: product.baseRentPrice,
      baseSalePrice: product.baseSalePrice,
      depositAmount: toNumber(product.depositAmount, 0),
      buyoutValue: toNumber(product.buyoutValue, 0),
      likeCount: product.likeCount || 0,
      size: product.size,
      sizes: Array.isArray(product.sizes) && product.sizes.length > 0 ? product.sizes : [product.size].filter(Boolean),
      color: product.color,
      colorVariants: Array.isArray(product.colorVariants) ? product.colorVariants : [],
      description: resolveLocalizedField(product, 'description', lang),
      images: Array.isArray(product.images) ? product.images : [],
    }));

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
    const rows = await Product.find({ baseRentPrice: { $gt: 0 } }).sort({ likeCount: -1, createdAt: -1, _id: 1 }).limit(limit).lean();

    const data = rows.map((product) => ({
      _id: product._id,
      name: resolveLocalizedField(product, 'name', lang),
      category: resolveLocalizedField(product, 'category', lang),
      imageUrl: toProductImageUrl(product),
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
      data: {
        ...product,
        name: resolveLocalizedField(product, 'name', lang),
        category: resolveLocalizedField(product, 'category', lang),
        description: resolveLocalizedField(product, 'description', lang),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error getting product',
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

module.exports = {
  getProducts,
  listOwnerProducts,
  getOwnerProductDetail,
  getTopRentedProducts,
  getTopLikedProducts,
  getTopSoldProducts,
  getProductById,
  createProduct,
  createOwnerProduct,
  updateProduct,
  updateOwnerProduct,
  updateOwnerProductCollateral,
  deleteProduct,
  deleteOwnerProduct,
  importOwnerProducts,
  exportOwnerProducts,
};
