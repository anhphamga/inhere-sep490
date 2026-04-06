const mongoose = require('mongoose');
const Product = require('../model/Product.model');
const Review = require('../model/Review.model');
const SaleOrder = require('../model/SaleOrder.model');
const SaleOrderItem = require('../model/SaleOrderItem.model');
const { ORDER_TYPE } = require('../constants/order.constants');

const REVIEWABLE_SALE_STATUSES = new Set(['Completed', 'Returned', 'Refunded']);
const REVIEW_STATUSES = new Set(['pending', 'approved', 'hidden', 'rejected']);

const toObjectId = (value) => {
  if (!value || !mongoose.Types.ObjectId.isValid(value)) return null;
  return new mongoose.Types.ObjectId(value);
};

const ensureValidReviewObjectId = (reviewId) => {
  const objectId = toObjectId(reviewId);
  if (!objectId) {
    const error = new Error('Không tìm thấy đánh giá');
    error.statusCode = 404;
    throw error;
  }
  return objectId;
};

const normalizeImages = (images) => {
  if (!Array.isArray(images)) return [];
  return images
    .map((item) => String(item || '').trim())
    .filter(Boolean);
};

const normalizeComment = (comment) => String(comment || '').trim();
const normalizeRating = (rating) => Number(rating);
const normalizeStatus = (status) => String(status || '').trim().toLowerCase();

const normalizeSortOrder = (value) => {
  const v = String(value || '').toLowerCase();
  return v === 'asc' ? 1 : -1;
};

const normalizeSortBy = (value) => {
  const v = String(value || '').trim();
  if (!['createdAt', 'updatedAt', 'rating'].includes(v)) return 'createdAt';
  return v;
};

const getReviewSummary = async (productId) => {
  const productObjectId = toObjectId(productId);
  if (!productObjectId) {
    return {
      averageRating: 0,
      reviewCount: 0,
      breakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    };
  }

  const publicMatch = {
    product: productObjectId,
    status: 'approved',
    isHidden: { $ne: true },
  };

  const [summaryRow, breakdownRows] = await Promise.all([
    Review.aggregate([
      { $match: publicMatch },
      {
        $group: {
          _id: null,
          reviewCount: { $sum: 1 },
          averageRating: { $avg: '$rating' },
        },
      },
    ]),
    Review.aggregate([
      { $match: publicMatch },
      {
        $group: {
          _id: '$rating',
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  breakdownRows.forEach((row) => {
    const key = Number(row?._id || 0);
    if (key >= 1 && key <= 5) breakdown[key] = Number(row?.count || 0);
  });

  return {
    averageRating: Number(summaryRow?.[0]?.averageRating || 0),
    reviewCount: Number(summaryRow?.[0]?.reviewCount || 0),
    breakdown,
  };
};

const updateProductRatingStats = async (productId) => {
  const summary = await getReviewSummary(productId);
  const roundedAverage = Number(summary.averageRating.toFixed(2));

  await Product.findByIdAndUpdate(productId, {
    averageRating: roundedAverage,
    reviewCount: summary.reviewCount,
  });

  return {
    ...summary,
    averageRating: roundedAverage,
  };
};

const validateOrderForReview = async (userId, orderId, productId, options = {}) => {
  const userObjectId = toObjectId(userId);
  const orderObjectId = toObjectId(orderId);
  const productObjectId = toObjectId(productId);
  const excludeReviewId = toObjectId(options.excludeReviewId);

  if (!userObjectId || !orderObjectId || !productObjectId) {
    const error = new Error('Dữ liệu đánh giá không hợp lệ');
    error.statusCode = 400;
    throw error;
  }

  const order = await SaleOrder.findOne({
    _id: orderObjectId,
    customerId: userObjectId,
    orderType: ORDER_TYPE.BUY,
  }).lean();

  if (!order) {
    const error = new Error('Bạn không có quyền đánh giá sản phẩm này');
    error.statusCode = 403;
    throw error;
  }

  if (!REVIEWABLE_SALE_STATUSES.has(String(order.status || ''))) {
    const error = new Error('Đơn hàng chưa đủ điều kiện để đánh giá');
    error.statusCode = 400;
    throw error;
  }

  const orderItem = await SaleOrderItem.findOne({
    orderId: orderObjectId,
    productId: productObjectId,
  }).lean();

  if (!orderItem) {
    const error = new Error('Sản phẩm không thuộc đơn hàng này');
    error.statusCode = 400;
    throw error;
  }

  const existingQuery = {
    user: userObjectId,
    product: productObjectId,
    order: orderObjectId,
  };
  if (excludeReviewId) {
    existingQuery._id = { $ne: excludeReviewId };
  }

  const existingReview = await Review.findOne(existingQuery).lean();
  if (existingReview) {
    const error = new Error('Sản phẩm này đã được đánh giá trước đó');
    error.statusCode = 409;
    throw error;
  }

  return {
    order,
    orderItem,
  };
};

const createReview = async ({
  userId,
  productId,
  orderId,
  rating,
  comment,
  images,
}) => {
  await validateOrderForReview(userId, orderId, productId);

  const normalizedRating = normalizeRating(rating);
  const normalizedComment = normalizeComment(comment);
  const normalizedImages = normalizeImages(images);

  if (!Number.isInteger(normalizedRating) || normalizedRating < 1 || normalizedRating > 5) {
    const error = new Error('Số sao đánh giá phải từ 1 đến 5');
    error.statusCode = 400;
    throw error;
  }

  if (normalizedComment.length > 1000) {
    const error = new Error('Nội dung đánh giá không được vượt quá 1000 ký tự');
    error.statusCode = 400;
    throw error;
  }

  const review = await Review.create({
    user: userId,
    product: productId,
    order: orderId,
    rating: normalizedRating,
    comment: normalizedComment,
    images: normalizedImages,
    isVerifiedPurchase: true,
    status: 'pending',
    isHidden: false,
  });

  await updateProductRatingStats(productId);
  return review;
};

const getProductReviews = async ({
  productId,
  page = 1,
  limit = 10,
  rating,
}) => {
  const productObjectId = toObjectId(productId);
  if (!productObjectId) {
    const error = new Error('Sản phẩm không hợp lệ');
    error.statusCode = 400;
    throw error;
  }

  const normalizedPage = Math.max(Number(page) || 1, 1);
  const normalizedLimit = Math.min(Math.max(Number(limit) || 10, 1), 50);
  const normalizedRating = Number(rating);

  const query = {
    product: productObjectId,
    status: 'approved',
    isHidden: { $ne: true },
  };
  if (Number.isInteger(normalizedRating) && normalizedRating >= 1 && normalizedRating <= 5) {
    query.rating = normalizedRating;
  }

  const skip = (normalizedPage - 1) * normalizedLimit;
  const [rows, total, summary] = await Promise.all([
    Review.find(query)
      .populate('user', 'name avatarUrl')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(normalizedLimit)
      .lean(),
    Review.countDocuments(query),
    getReviewSummary(productObjectId),
  ]);

  return {
    items: rows,
    pagination: {
      page: normalizedPage,
      limit: normalizedLimit,
      total,
      pages: Math.max(Math.ceil(total / normalizedLimit), 1),
    },
    summary,
  };
};

const getReviewedMapForOrders = async ({ userId, orderIds = [] }) => {
  const userObjectId = toObjectId(userId);
  const normalizedOrderIds = orderIds
    .map((id) => toObjectId(id))
    .filter(Boolean);

  if (!userObjectId || normalizedOrderIds.length === 0) {
    return new Map();
  }

  const rows = await Review.find({
    user: userObjectId,
    order: { $in: normalizedOrderIds },
  }).lean();

  const map = new Map();
  rows.forEach((row) => {
    const key = `${String(row.order)}::${String(row.product)}`;
    map.set(key, row);
  });

  return map;
};

const getAdminReviewList = async ({
  page = 1,
  limit = 20,
  search = '',
  status = '',
  rating = '',
  productId = '',
  hasReply = '',
  sortBy = 'createdAt',
  sortOrder = 'desc',
}) => {
  const normalizedPage = Math.max(Number(page) || 1, 1);
  const normalizedLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const skip = (normalizedPage - 1) * normalizedLimit;

  const query = {};

  const normalizedStatus = normalizeStatus(status);
  if (normalizedStatus && REVIEW_STATUSES.has(normalizedStatus)) {
    query.status = normalizedStatus;
  }

  const normalizedRating = Number(rating);
  if (Number.isInteger(normalizedRating) && normalizedRating >= 1 && normalizedRating <= 5) {
    query.rating = normalizedRating;
  }

  const productObjectId = toObjectId(productId);
  if (productObjectId) {
    query.product = productObjectId;
  }

  if (String(hasReply || '').toLowerCase() === 'true') {
    query['sellerReply.content'] = { $exists: true, $ne: '' };
  } else if (String(hasReply || '').toLowerCase() === 'false') {
    query.$or = [
      { sellerReply: { $exists: false } },
      { 'sellerReply.content': { $exists: false } },
      { 'sellerReply.content': '' },
    ];
  }

  if (String(search || '').trim()) {
    const regex = new RegExp(String(search).trim(), 'i');

    const [matchedProducts, matchedUsers] = await Promise.all([
      Product.find({
        $or: [
          { name: { $regex: regex } },
          { 'name.vi': { $regex: regex } },
          { 'name.en': { $regex: regex } },
        ],
      }).select('_id').lean(),
      mongoose.model('User').find({ name: { $regex: regex } }).select('_id').lean(),
    ]);

    query.$and = [
      ...(Array.isArray(query.$and) ? query.$and : []),
      {
        $or: [
          { comment: { $regex: regex } },
          { product: { $in: matchedProducts.map((item) => item._id) } },
          { user: { $in: matchedUsers.map((item) => item._id) } },
        ],
      },
    ];
  }

  const sort = {
    [normalizeSortBy(sortBy)]: normalizeSortOrder(sortOrder),
  };

  const [rows, total] = await Promise.all([
    Review.find(query)
      .populate('user', 'name email avatarUrl')
      .populate('product', 'name images')
      .populate('order', 'status createdAt')
      .populate('moderatedBy', 'name')
      .sort(sort)
      .skip(skip)
      .limit(normalizedLimit)
      .lean(),
    Review.countDocuments(query),
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

const getAdminReviewDetail = async (reviewId) => {
  const reviewObjectId = ensureValidReviewObjectId(reviewId);
  const review = await Review.findById(reviewObjectId)
    .populate('user', 'name email avatarUrl')
    .populate('product', 'name images')
    .populate('order', 'status createdAt')
    .populate('moderatedBy', 'name')
    .populate('sellerReply.repliedBy', 'name')
    .lean();

  if (!review) {
    const error = new Error('Không tìm thấy đánh giá');
    error.statusCode = 404;
    throw error;
  }

  return review;
};

const updateReviewStatus = async ({ reviewId, status, reason = '', moderatorId = null }) => {
  const normalizedStatus = normalizeStatus(status);
  if (!REVIEW_STATUSES.has(normalizedStatus)) {
    const error = new Error('Trạng thái đánh giá không hợp lệ');
    error.statusCode = 400;
    throw error;
  }

  const reviewObjectId = ensureValidReviewObjectId(reviewId);
  const review = await Review.findById(reviewObjectId);
  if (!review) {
    const error = new Error('Không tìm thấy đánh giá');
    error.statusCode = 404;
    throw error;
  }

  review.status = normalizedStatus;
  review.isHidden = normalizedStatus === 'hidden';
  review.moderationReason = String(reason || '').trim();
  review.moderatedBy = moderatorId || null;
  review.moderatedAt = new Date();
  await review.save();
  await updateProductRatingStats(review.product);

  return getAdminReviewDetail(review._id);
};

const hideReview = async ({ reviewId, reason = '', moderatorId = null }) => {
  const reviewObjectId = ensureValidReviewObjectId(reviewId);
  const review = await Review.findById(reviewObjectId);
  if (!review) {
    const error = new Error('Không tìm thấy đánh giá');
    error.statusCode = 404;
    throw error;
  }

  review.status = 'hidden';
  review.isHidden = true;
  review.moderationReason = String(reason || '').trim() || 'Ẩn đánh giá bởi quản trị';
  review.moderatedBy = moderatorId || null;
  review.moderatedAt = new Date();
  await review.save();
  await updateProductRatingStats(review.product);

  return getAdminReviewDetail(review._id);
};

const replyToReview = async ({ reviewId, content, actorId }) => {
  const normalizedContent = String(content || '').trim();
  if (!normalizedContent) {
    const error = new Error('Nội dung phản hồi không được để trống');
    error.statusCode = 400;
    throw error;
  }
  if (normalizedContent.length > 1000) {
    const error = new Error('Nội dung phản hồi không được vượt quá 1000 ký tự');
    error.statusCode = 400;
    throw error;
  }

  const reviewObjectId = ensureValidReviewObjectId(reviewId);
  const review = await Review.findById(reviewObjectId);
  if (!review) {
    const error = new Error('Không tìm thấy đánh giá');
    error.statusCode = 404;
    throw error;
  }

  review.sellerReply = {
    content: normalizedContent,
    repliedBy: actorId || null,
    repliedAt: new Date(),
  };
  await review.save();

  return getAdminReviewDetail(review._id);
};

const deleteSellerReply = async ({ reviewId }) => {
  const reviewObjectId = ensureValidReviewObjectId(reviewId);
  const review = await Review.findById(reviewObjectId);
  if (!review) {
    const error = new Error('Không tìm thấy đánh giá');
    error.statusCode = 404;
    throw error;
  }

  review.sellerReply = undefined;
  await review.save();

  return getAdminReviewDetail(review._id);
};

const getReviewAdminStats = async () => {
  const [total, pending, approved, hidden, rejected, averageAgg, ratingAgg, lowRatedProducts] = await Promise.all([
    Review.countDocuments({}),
    Review.countDocuments({ status: 'pending' }),
    Review.countDocuments({ status: 'approved', isHidden: { $ne: true } }),
    Review.countDocuments({ status: 'hidden' }),
    Review.countDocuments({ status: 'rejected' }),
    Review.aggregate([
      { $match: { status: 'approved', isHidden: { $ne: true } } },
      { $group: { _id: null, averageRating: { $avg: '$rating' } } },
    ]),
    Review.aggregate([
      { $group: { _id: '$rating', count: { $sum: 1 } } },
    ]),
    Review.aggregate([
      { $match: { status: 'approved', isHidden: { $ne: true } } },
      {
        $group: {
          _id: '$product',
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 },
        },
      },
      { $match: { averageRating: { $lte: 2.5 } } },
      { $sort: { averageRating: 1, totalReviews: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product',
        },
      },
      { $unwind: '$product' },
      {
        $project: {
          _id: 0,
          productId: '$product._id',
          productName: '$product.name',
          averageRating: { $round: ['$averageRating', 2] },
          totalReviews: 1,
        },
      },
    ]),
  ]);

  const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  ratingAgg.forEach((row) => {
    const key = Number(row?._id || 0);
    if (key >= 1 && key <= 5) {
      breakdown[key] = Number(row?.count || 0);
    }
  });

  return {
    totalReviews: total,
    pendingReviews: pending,
    approvedReviews: approved,
    hiddenReviews: hidden,
    rejectedReviews: rejected,
    averageRating: Number((averageAgg?.[0]?.averageRating || 0).toFixed(2)),
    breakdown,
    lowRatedProducts,
  };
};

module.exports = {
  REVIEWABLE_SALE_STATUSES,
  REVIEW_STATUSES,
  validateOrderForReview,
  createReview,
  getProductReviews,
  getReviewSummary,
  updateProductRatingStats,
  getReviewedMapForOrders,
  getAdminReviewList,
  getAdminReviewDetail,
  updateReviewStatus,
  hideReview,
  replyToReview,
  deleteSellerReply,
  getReviewAdminStats,
};
