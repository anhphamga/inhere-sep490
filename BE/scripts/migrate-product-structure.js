const mongoose = require('mongoose');
const Product = require('../model/Product.model');
const ProductInstance = require('../model/ProductInstance.model');
const { connectDB } = require('../config/db');

const toText = (value) => String(value || '').trim();

const normalizeImages = (values = []) => {
  if (!Array.isArray(values)) return [];
  const seen = new Set();
  const out = [];
  values.forEach((item) => {
    const value = toText(item);
    if (!value || seen.has(value)) return;
    seen.add(value);
    out.push(value);
  });
  return out;
};

const normalizeSizeRows = (product = {}, totalQuantity = 0) => {
  if (Array.isArray(product?.sizes) && product.sizes.length > 0 && typeof product.sizes[0] === 'object') {
    return product.sizes
      .map((item) => ({
        size: toText(item?.size).toUpperCase(),
        quantity: Math.max(Number(item?.quantity || 0), 0),
      }))
      .filter((item) => item.size);
  }

  const sizes = [];
  if (Array.isArray(product?.sizes)) {
    product.sizes.forEach((size) => {
      const value = toText(size).toUpperCase();
      if (value) sizes.push(value);
    });
  }
  const fallback = toText(product?.size).toUpperCase();
  if (fallback) sizes.push(fallback);

  const uniqSizes = Array.from(new Set(sizes));
  if (uniqSizes.length === 0) return [];

  const perSize = Math.floor(totalQuantity / uniqSizes.length);
  const remain = totalQuantity % uniqSizes.length;
  return uniqSizes.map((size, index) => ({
    size,
    quantity: perSize + (index < remain ? 1 : 0),
  }));
};

const migrate = async () => {
  await connectDB();

  const products = await Product.find({}).lean();
  console.log(`[migrate] Found ${products.length} products`);

  for (const product of products) {
    const instanceCount = await ProductInstance.countDocuments({ productId: product._id });

    const legacyColorVariants = Array.isArray(product?.colorVariants) ? product.colorVariants : [];
    const mergedVariantImages = legacyColorVariants.flatMap((variant) => (Array.isArray(variant?.images) ? variant.images : []));
    const mergedImages = normalizeImages([...(Array.isArray(product?.images) ? product.images : []), ...mergedVariantImages]);

    const color =
      toText(product?.color) ||
      toText(legacyColorVariants[0]?.name) ||
      'Default';

    const baseQuantity = Math.max(Number(product?.quantity || 0), 0) || instanceCount;
    const sizeRows = normalizeSizeRows(product, baseQuantity);
    const hasSizes = sizeRows.length > 0;

    const update = {
      color,
      images: mergedImages,
      hasSizes,
      sizes: hasSizes ? sizeRows : [],
      quantity: hasSizes ? 0 : baseQuantity,
      $unset: {
        size: 1,
      },
    };

    await Product.updateOne({ _id: product._id }, update);
  }

  console.log('[migrate] Done');
  await mongoose.connection.close();
};

migrate().catch(async (error) => {
  console.error('[migrate] Failed:', error);
  try {
    await mongoose.connection.close();
  } catch {
    // ignore
  }
  process.exit(1);
});

