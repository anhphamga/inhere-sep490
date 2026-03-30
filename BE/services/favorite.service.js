const mongoose = require('mongoose');
const Favorite = require('../model/Favorite.model');
const Product = require('../model/Product.model');

const toObjectId = (value) => {
  if (!value || !mongoose.Types.ObjectId.isValid(value)) return null;
  return new mongoose.Types.ObjectId(value);
};

const assertValidIds = ({ userId, productId }) => {
  const userObjectId = toObjectId(userId);
  const productObjectId = toObjectId(productId);

  if (!userObjectId || !productObjectId) {
    const error = new Error('Dữ liệu không hợp lệ');
    error.statusCode = 400;
    throw error;
  }

  return { userObjectId, productObjectId };
};

const ensureProductExists = async (productObjectId) => {
  const product = await Product.findById(productObjectId).select('_id likeCount').lean();
  if (!product) {
    const error = new Error('Không tìm thấy sản phẩm');
    error.statusCode = 404;
    throw error;
  }
};

const toggleFavorite = async ({ userId, productId }) => {
  const { userObjectId, productObjectId } = assertValidIds({ userId, productId });
  await ensureProductExists(productObjectId);

  const removed = await Favorite.findOneAndDelete({
    user: userObjectId,
    product: productObjectId,
  }).lean();

  if (removed) {
    await Product.updateOne(
      { _id: productObjectId },
      { $inc: { likeCount: -1 }, $max: { likeCount: 0 } }
    );
    return {
      isFavorite: false,
      productId: String(productObjectId),
    };
  }

  try {
    const favorite = await Favorite.create({
      user: userObjectId,
      product: productObjectId,
    });

    await Product.updateOne({ _id: productObjectId }, { $inc: { likeCount: 1 } });

    return {
      isFavorite: true,
      productId: String(productObjectId),
      favoriteId: String(favorite._id),
      createdAt: favorite.createdAt,
    };
  } catch (error) {
    if (error?.code === 11000) {
      return {
        isFavorite: true,
        productId: String(productObjectId),
      };
    }
    throw error;
  }
};

const getMyFavorites = async ({ userId, page = 1, limit = 20 }) => {
  const userObjectId = toObjectId(userId);
  if (!userObjectId) {
    const error = new Error('Dữ liệu không hợp lệ');
    error.statusCode = 400;
    throw error;
  }

  const normalizedPage = Math.max(Number(page) || 1, 1);
  const normalizedLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const skip = (normalizedPage - 1) * normalizedLimit;

  const [rows, total] = await Promise.all([
    Favorite.find({ user: userObjectId })
      .populate('product')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(normalizedLimit)
      .lean(),
    Favorite.countDocuments({ user: userObjectId }),
  ]);

  return {
    items: rows,
    pagination: {
      page: normalizedPage,
      limit: normalizedLimit,
      total,
      pages: Math.max(Math.ceil(total / normalizedLimit), 1),
    },
  };
};

const checkFavorite = async ({ userId, productId }) => {
  const { userObjectId, productObjectId } = assertValidIds({ userId, productId });
  const exists = await Favorite.exists({
    user: userObjectId,
    product: productObjectId,
  });
  return Boolean(exists);
};

module.exports = {
  toggleFavorite,
  getMyFavorites,
  checkFavorite,
};
