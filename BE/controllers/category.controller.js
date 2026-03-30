const Category = require('../model/Category.model');
const Product = require('../model/Product.model');
const { getRequestLang, resolveLocalizedField } = require('../utils/i18n');

const normalizeKey = (value) => String(value || '').trim().toLowerCase();

const normalizeText = (value) => String(value || '').trim();

const toObject = (value) => (value && typeof value === 'object' && !Array.isArray(value) ? value : null);

const toNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const getLegacyPriceObject = (product = {}) => toObject(product?.price) || null;

const getLegacyVariantList = (product = {}) => (Array.isArray(product?.variants) ? product.variants : []);

const resolveProductPrices = (product = {}) => {
  const legacyPrice = getLegacyPriceObject(product);
  const firstVariantWithPrice = getLegacyVariantList(product).find((variant) => toObject(variant?.price));
  const firstVariantPrice = toObject(firstVariantWithPrice?.price);

  return {
    baseRentPrice: Math.max(
      toNumber(
        product?.baseRentPrice,
        toNumber(product?.commonRentPrice, toNumber(legacyPrice?.rent, toNumber(firstVariantPrice?.rent, 0)))
      ),
      0
    ),
    baseSalePrice: Math.max(
      toNumber(product?.baseSalePrice, toNumber(legacyPrice?.sale, toNumber(firstVariantPrice?.sale, 0))),
      0
    ),
  };
};

const matchesPurpose = (product = {}, purpose = 'all') => {
  const normalizedPurpose = normalizeText(purpose).toLowerCase();
  const prices = resolveProductPrices(product);

  if (normalizedPurpose === 'buy' || normalizedPurpose === 'sale') {
    return prices.baseSalePrice > 0;
  }

  if (normalizedPurpose === 'rent' || normalizedPurpose === 'fitting') {
    return prices.baseRentPrice > 0;
  }

  return true;
};

const slugify = (value) =>
  normalizeText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const collectProductImages = (product = {}) => {
  const images = [];
  const pushImages = (values = []) => {
    (Array.isArray(values) ? values : []).forEach((value) => {
      const image = normalizeText(value);
      if (image && !images.includes(image)) {
        images.push(image);
      }
    });
  };

  pushImages(product?.images);

  (Array.isArray(product?.colorVariants) ? product.colorVariants : []).forEach((variant) => {
    pushImages(variant?.images);
  });

  (Array.isArray(product?.variants) ? product.variants : []).forEach((variant) => {
    pushImages(variant?.images);
    pushImages(variant?.imageUrls);
    pushImages(variant?.gallery);
    pushImages(variant?.galleryImages);
    const colorValue = toObject(variant?.color);
    pushImages(colorValue?.images);
  });

  const imageUrl = normalizeText(product?.imageUrl);
  if (imageUrl && !images.includes(imageUrl)) {
    images.push(imageUrl);
  }

  return images;
};

const collectCategoryKeys = (product = {}) => {
  const category = product?.category;
  const categoryPath = toObject(product?.categoryPath);
  const categoryObject = toObject(category);
  const keys = [];

  const push = (value) => {
    const text = normalizeText(value);
    if (!text) return;
    const key = normalizeKey(text);
    if (key && !keys.includes(key)) {
      keys.push(key);
    }
  };

  push(categoryPath?.parent);
  push(categoryPath?.child);
  (Array.isArray(categoryPath?.ancestors) ? categoryPath.ancestors : []).forEach(push);
  push(categoryObject?.parent);
  push(categoryObject?.child);
  push(categoryObject?.vi);
  push(categoryObject?.en);
  if (typeof category === 'string') {
    push(category);
  }

  return keys;
};

const coalesceCategoryTextExpr = {
  $ifNull: [
    '$category.vi',
    {
      $ifNull: [
        '$categoryVi',
        {
          $ifNull: [
            '$category.en',
            {
              $ifNull: ['$categoryEn', '$category'],
            },
          ],
        },
      ],
    },
  ],
};

const getProductCategoryStats = async (purpose = 'all') => {
  const rows = await Product.find({})
    .select('category categoryPath images imageUrl colorVariants variants baseRentPrice commonRentPrice baseSalePrice price')
    .lean();
  const map = new Map();

  rows.forEach((row) => {
    if (!matchesPurpose(row, purpose)) {
      return;
    }

    const imageUrl = collectProductImages(row)[0] || '';
    collectCategoryKeys(row).forEach((key) => {
      const current = map.get(key) || { count: 0, imageUrl: '' };
      map.set(key, {
        count: current.count + 1,
        imageUrl: current.imageUrl || imageUrl,
      });
    });
  });

  return map;
};

const toCategoryNode = (doc = {}, lang = 'vi', statsMap = new Map()) => {
  const displayName = resolveLocalizedField(
    doc,
    'name',
    lang,
    resolveLocalizedField(doc, 'displayName', lang, String(doc?.slug || ''))
  );

  const displayNameVi = resolveLocalizedField(doc, 'name', 'vi', displayName);
  const displayNameEn = resolveLocalizedField(doc, 'name', 'en', displayNameVi);
  const value = String(doc?.value || displayName).trim();
  const slug = String(doc?.slug || '').trim();
  const rawName = String(displayNameVi || displayName || value || slug).trim();

  const lookupKeys = [rawName, displayName, displayNameVi, displayNameEn, value, slug].map(normalizeKey).filter(Boolean);
  let matchedStats = { count: 0, imageUrl: '' };
  for (const key of lookupKeys) {
    if (statsMap.has(key)) {
      matchedStats = statsMap.get(key);
      break;
    }
  }

  return {
    _id: doc?._id,
    id: String(doc?._id || ''),
    parentId: doc?.parentId || null,
    displayName,
    displayNameVi,
    displayNameEn,
    rawName,
    value: value || rawName,
    slug,
    type: String(doc?.type || 'rent').trim() || 'rent',
    sortOrder: Number(doc?.sortOrder || 0),
    isActive: doc?.isActive !== false,
    count: Number(matchedStats?.count || 0),
    imageUrl: String(matchedStats?.imageUrl || ''),
    children: [],
  };
};

const sortNodes = (nodes = []) => {
  nodes.sort((a, b) => {
    const orderDiff = Number(a?.sortOrder || 0) - Number(b?.sortOrder || 0);
    if (orderDiff !== 0) return orderDiff;
    return String(a?.displayName || '').localeCompare(String(b?.displayName || ''), 'vi');
  });

  nodes.forEach((node) => {
    if (Array.isArray(node.children) && node.children.length > 0) {
      sortNodes(node.children);
    }
  });
};

const getCategories = async (req, res) => {
  try {
    const lang = getRequestLang(req.query.lang);
    const purpose = normalizeText(req.query.purpose || 'all');
    const roots = await buildCategoryTree(lang, purpose);

    return res.status(200).json({
      success: true,
      categories: roots,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error getting categories',
      error: error.message,
    });
  }
};

const validateCategoryInput = async ({ name, slug, parentId, currentId = null }) => {
  const normalizedName = normalizeText(name);
  if (!normalizedName) {
    return 'name is required';
  }

  const normalizedSlug = slugify(slug || normalizedName);
  if (!normalizedSlug) {
    return 'slug is invalid';
  }

  if (parentId) {
    const parent = await Category.findById(parentId).lean();
    if (!parent) {
      return 'parent category not found';
    }
  }

  const existingSlug = await Category.findOne({
    slug: normalizedSlug,
    ...(currentId ? { _id: { $ne: currentId } } : {}),
  }).lean();

  if (existingSlug) {
    return 'slug already exists';
  }

  return null;
};

const buildCategoryTree = async (lang = 'vi', purpose = 'all') => {
  const [docs, statsMap] = await Promise.all([
    Category.find({}).sort({ sortOrder: 1, createdAt: 1, _id: 1 }).lean(),
    getProductCategoryStats(purpose),
  ]);

  const nodes = docs.map((doc) => toCategoryNode(doc, lang, statsMap));
  const nodeById = new Map(nodes.map((node) => [String(node._id || ''), node]));
  const roots = [];

  nodes.forEach((node) => {
    const parentKey = String(node?.parentId || '');
    if (parentKey && nodeById.has(parentKey)) {
      nodeById.get(parentKey).children.push(node);
    } else {
      roots.push(node);
    }
  });

  sortNodes(roots);
  return roots;
};

const createCategory = async (req, res) => {
  try {
    const name = normalizeText(req.body?.name);
    const displayName = normalizeText(req.body?.displayName) || name;
    const slug = slugify(req.body?.slug || name);
    const value = normalizeText(req.body?.value) || displayName;
    const parentId = normalizeText(req.body?.parentId) || null;
    const sortOrder = Number(req.body?.sortOrder || 0);
    const isActive = req.body?.isActive !== false && String(req.body?.isActive).toLowerCase() !== 'false';
    const type = normalizeText(req.body?.type) || 'rent';

    const validationError = await validateCategoryInput({ name, slug, parentId });
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    const created = await Category.create({
      name,
      displayName,
      slug,
      value,
      parentId,
      sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
      isActive,
      type,
    });

    return res.status(201).json({
      success: true,
      data: created,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error creating category',
      error: error.message,
    });
  }
};

const updateCategory = async (req, res) => {
  try {
    const existing = await Category.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    const name = normalizeText(req.body?.name) || normalizeText(existing.name);
    const displayName = normalizeText(req.body?.displayName) || normalizeText(existing.displayName) || name;
    const slug = slugify(req.body?.slug || existing.slug || name);
    const value = normalizeText(req.body?.value) || normalizeText(existing.value) || displayName;
    const parentIdRaw = Object.prototype.hasOwnProperty.call(req.body || {}, 'parentId')
      ? normalizeText(req.body?.parentId)
      : String(existing.parentId || '');
    const parentId = parentIdRaw || null;
    const sortOrder = Object.prototype.hasOwnProperty.call(req.body || {}, 'sortOrder')
      ? Number(req.body?.sortOrder || 0)
      : Number(existing.sortOrder || 0);
    const isActive = Object.prototype.hasOwnProperty.call(req.body || {}, 'isActive')
      ? !(req.body?.isActive === false || String(req.body?.isActive).toLowerCase() === 'false')
      : existing.isActive !== false;
    const type = normalizeText(req.body?.type) || normalizeText(existing.type) || 'rent';

    if (parentId && String(parentId) === String(existing._id)) {
      return res.status(400).json({ success: false, message: 'category cannot be its own parent' });
    }

    if (parentId) {
      let cursor = await Category.findById(parentId).lean();
      while (cursor) {
        if (String(cursor._id) === String(existing._id)) {
          return res.status(400).json({ success: false, message: 'cannot move category under its descendant' });
        }
        if (!cursor.parentId) break;
        cursor = await Category.findById(cursor.parentId).lean();
      }
    }

    const validationError = await validateCategoryInput({
      name,
      slug,
      parentId,
      currentId: existing._id,
    });
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    existing.name = name;
    existing.displayName = displayName;
    existing.slug = slug;
    existing.value = value;
    existing.parentId = parentId;
    existing.sortOrder = Number.isFinite(sortOrder) ? sortOrder : 0;
    existing.isActive = isActive;
    existing.type = type;
    await existing.save();

    return res.status(200).json({
      success: true,
      data: existing,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error updating category',
      error: error.message,
    });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const existing = await Category.findById(req.params.id).lean();
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    const childExists = await Category.exists({ parentId: existing._id });
    if (childExists) {
      return res.status(400).json({
        success: false,
        message: 'Delete child categories first',
      });
    }

    const categoryName = normalizeText(existing.name) || normalizeText(existing.displayName) || normalizeText(existing.value);
    const productUsingCategory = await Product.exists({
      $or: [
        { category: categoryName },
        { 'category.vi': categoryName },
        { 'category.en': categoryName },
        { 'categoryPath.parent': categoryName },
        { 'categoryPath.child': categoryName },
        { 'categoryPath.ancestors': categoryName },
      ],
    });

    if (productUsingCategory) {
      return res.status(400).json({
        success: false,
        message: 'Category is being used by products',
      });
    }

    await Category.findByIdAndDelete(existing._id);
    return res.status(200).json({
      success: true,
      message: 'Deleted successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error deleting category',
      error: error.message,
    });
  }
};

const listOwnerCategories = async (req, res) => {
  try {
    const lang = getRequestLang(req.query.lang);
    const purpose = normalizeText(req.query.purpose || 'all');
    const categories = await buildCategoryTree(lang, purpose);
    return res.status(200).json({
      success: true,
      categories,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error getting owner categories',
      error: error.message,
    });
  }
};

module.exports = {
  getCategories,
  listOwnerCategories,
  createCategory,
  updateCategory,
  deleteCategory,
};
