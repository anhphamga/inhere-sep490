const Category = require('../model/Category.model');
const Product = require('../model/Product.model');

const toText = (value = '') => String(value || '').trim();

const toLocalizedText = (value = {}, fallback = '') => {
  if (typeof value === 'string') return toText(value) || fallback;
  if (value && typeof value === 'object') {
    return toText(value.vi || value.en || value.value || '') || fallback;
  }
  return fallback;
};

const escapeRegex = (value = '') => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeColorVariants = (product = {}) => {
  if (!Array.isArray(product?.colorVariants)) return [];
  return product.colorVariants
    .map((variant) => ({
      name: toText(variant?.name || variant?.color),
      size: toText(variant?.size),
      images: Array.isArray(variant?.images) ? variant.images.filter(Boolean) : [],
    }))
    .filter((variant) => variant.name);
};

const normalizeProduct = (product = {}) => {
  const image =
    (Array.isArray(product?.images) && product.images.find(Boolean)) ||
    toText(product?.imageUrl) ||
    (Array.isArray(product?.colorVariants) && product.colorVariants.find((item) => Array.isArray(item?.images) && item.images[0])?.images?.[0]) ||
    '';

  return {
    _id: product?._id,
    name: toLocalizedText(product?.name, 'Sản phẩm'),
    description: toLocalizedText(product?.description, ''),
    category: toLocalizedText(product?.category, ''),
    image,
    imageUrl: image,
    images: Array.isArray(product?.images) ? product.images.filter(Boolean) : image ? [image] : [],
    baseRentPrice: Number(product?.baseRentPrice || 0),
    baseSalePrice: Number(product?.baseSalePrice || 0),
    price: Number(product?.baseRentPrice || product?.baseSalePrice || 0),
    sizes: Array.isArray(product?.sizes) ? product.sizes.filter(Boolean).map(String) : [],
    colorVariants: normalizeColorVariants(product),
    color: toText(product?.color),
    createdAt: product?.createdAt || null,
    isHot: Number(product?.likeCount || 0) >= 30,
    isNew: Boolean(product?.createdAt && Date.now() - new Date(product.createdAt).getTime() <= 1000 * 60 * 60 * 24 * 30),
  };
};

const buildFilters = (products = []) => {
  const categories = new Set();
  const colors = new Set();
  const sizes = new Set();
  const prices = [];

  products.forEach((product) => {
    const category = toText(product?.category);
    if (category) categories.add(category);

    const color = toText(product?.color);
    if (color) colors.add(color);
    (Array.isArray(product?.colorVariants) ? product.colorVariants : []).forEach((variant) => {
      const variantColor = toText(variant?.name || variant?.color);
      if (variantColor) colors.add(variantColor);
      const variantSize = toText(variant?.size);
      if (variantSize) sizes.add(variantSize);
    });

    (Array.isArray(product?.sizes) ? product.sizes : []).forEach((size) => {
      const normalized = toText(size);
      if (normalized) sizes.add(normalized);
    });

    const price = Number(product?.baseRentPrice || product?.baseSalePrice || 0);
    if (Number.isFinite(price)) prices.push(price);
  });

  return {
    categories: Array.from(categories).sort((a, b) => a.localeCompare(b, 'vi')).map((value) => ({ value, label: value })),
    colors: Array.from(colors).sort((a, b) => a.localeCompare(b, 'vi')).map((value) => ({ value, label: value })),
    sizes: Array.from(sizes).sort((a, b) => a.localeCompare(b, 'vi')).map((value) => ({ value, label: value })),
    priceRange: {
      min: prices.length ? Math.min(...prices) : 0,
      max: prices.length ? Math.max(...prices) : 0,
    },
  };
};

const buildOutfits = (products = [], category = null) => {
  const fromCategory = Array.isArray(category?.outfits) ? category.outfits : [];
  if (fromCategory.length > 0) return fromCategory;

  return products.slice(0, 8).map((product, index) => ({
    id: `${String(product?._id || '')}-outfit-${index}`,
    name: toLocalizedText(product?.name, `Outfit ${index + 1}`),
    image: (Array.isArray(product?.images) ? product.images.find(Boolean) : '') || toText(product?.imageUrl),
    totalPrice: Number(product?.baseRentPrice || 0),
    products: [{ _id: product?._id }],
  }));
};

const buildRelatedCollections = (categories = [], currentSlug = '') => {
  return categories
    .filter((item) => toText(item?.slug) && toText(item?.slug) !== currentSlug)
    .slice(0, 6)
    .map((item) => ({
      _id: item?._id,
      slug: toText(item?.slug),
      name: toLocalizedText(item?.displayName, toLocalizedText(item?.name, toText(item?.value))),
      banner: toText(item?.banner || item?.coverImage || item?.imageUrl),
      description: toLocalizedText(item?.description, ''),
    }));
};

exports.getCollectionBySlug = async (req, res) => {
  try {
    const slug = toText(req.params?.slug);
    if (!slug) {
      return res.status(400).json({ success: false, message: 'Collection slug is required' });
    }

    const category = await Category.findOne({
      $or: [{ slug }, { value: slug }],
      isActive: { $ne: false },
    }).lean();

    if (!category) {
      return res.status(404).json({ success: false, message: 'Collection not found' });
    }

    const categoryName = toLocalizedText(category?.displayName, toLocalizedText(category?.name, toText(category?.value || category?.slug)));
    const categoryRegex = new RegExp(escapeRegex(categoryName), 'i');

    const productsRaw = await Product.find({
      isDraft: { $ne: true },
      $or: [
        { 'categoryPath.parent': categoryRegex },
        { 'categoryPath.child': categoryRegex },
        { 'categoryPath.ancestors': categoryRegex },
        { category: categoryRegex },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(120)
      .lean();

    const products = productsRaw.map(normalizeProduct);
    const siblingCategories = await Category.find({
      _id: { $ne: category._id },
      isActive: { $ne: false },
      type: category?.type || 'rent',
    })
      .sort({ sortOrder: 1, createdAt: -1 })
      .limit(12)
      .lean();

    return res.json({
      success: true,
      data: {
        name: categoryName || 'Bộ sưu tập',
        banner: toText(category?.banner || category?.coverImage || category?.imageUrl),
        description: toLocalizedText(category?.description, ''),
        outfits: buildOutfits(productsRaw, category),
        products,
        filters: buildFilters(productsRaw),
        relatedCollections: buildRelatedCollections(siblingCategories, slug),
      },
    });
  } catch (error) {
    console.error('Get collection by slug error:', error);
    return res.status(500).json({ success: false, message: 'Cannot load collection right now' });
  }
};

