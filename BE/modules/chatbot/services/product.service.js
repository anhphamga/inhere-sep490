const Product = require('../../../model/Product.model');

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeProductName = (value) => {
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

const mapProduct = (doc) => {
  const id = String(doc._id);
  return {
    id,
    name: normalizeProductName(doc.name) || 'San pham',
    price: toNumber(doc.baseSalePrice, toNumber(doc.baseRentPrice, 0)),
    image: pickImage(doc),
    detailUrl: `/products/${id}`,
    buyUrl: `/products/${id}?action=buy`,
    rentUrl: `/products/${id}?action=rent`,
  };
};

const getSuggestedProducts = async ({ limit = 5 } = {}) => {
  const safeLimit = Math.min(Math.max(toNumber(limit, 5), 1), 5);

  const rows = await Product.find({ isDraft: { $ne: true } })
    .select('name baseSalePrice baseRentPrice images colorVariants createdAt')
    .sort({ createdAt: -1 })
    .limit(safeLimit)
    .lean();

  return rows.map(mapProduct).filter((item) => item.name);
};

module.exports = {
  getSuggestedProducts,
};
