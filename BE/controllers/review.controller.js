const Review = require('../model/Review.model');
const {
  REVIEW_STATUSES,
  validateOrderForReview,
  createReview,
  getProductReviews,
  getReviewSummary,
  updateProductRatingStats,
  getAdminReviewList,
  getAdminReviewDetail,
  updateReviewStatus,
  hideReview,
  replyToReview,
  deleteSellerReply,
  getReviewAdminStats,
} = require('../services/review.service');

const normalizeRole = (role) => String(role || '').trim().toLowerCase();

const isOwner = (user) => normalizeRole(user?.role) === 'owner';
const isOwnerOrStaff = (user) => ['owner', 'staff'].includes(normalizeRole(user?.role));

const toUpdatePayload = (body = {}) => {
  const payload = {};
  if (Object.prototype.hasOwnProperty.call(body, 'rating')) {
    payload.rating = Number(body.rating);
  }
  if (Object.prototype.hasOwnProperty.call(body, 'comment')) {
    payload.comment = String(body.comment || '').trim();
  }
  if (Object.prototype.hasOwnProperty.call(body, 'images')) {
    payload.images = Array.isArray(body.images)
      ? body.images.map((item) => String(item || '').trim()).filter(Boolean)
      : [];
  }
  return payload;
};

exports.createReview = async (req, res) => {
  try {
    const userId = req.user?.id;
    const {
      productId,
      orderId,
      rating,
      comment = '',
      images = [],
    } = req.body || {};

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Bạn cần đăng nhập để đánh giá sản phẩm',
      });
    }

    const review = await createReview({
      userId,
      productId,
      orderId,
      rating,
      comment,
      images,
    });

    const populated = await Review.findById(review._id)
      .populate('user', 'name avatarUrl')
      .populate('product', 'name images')
      .lean();

    return res.status(201).json({
      success: true,
      message: 'Gửi đánh giá thành công',
      data: populated,
    });
  } catch (error) {
    const statusCode = Number(error?.statusCode || 500);
    return res.status(statusCode).json({
      success: false,
      message: error?.message || 'Có lỗi xảy ra, vui lòng thử lại',
    });
  }
};

exports.updateReview = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Bạn cần đăng nhập để cập nhật đánh giá',
      });
    }

    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đánh giá',
      });
    }

    if (String(review.user) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền chỉnh sửa đánh giá này',
      });
    }

    await validateOrderForReview(userId, review.order, review.product, { excludeReviewId: review._id });

    const payload = toUpdatePayload(req.body || {});
    if (Object.keys(payload).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Không có dữ liệu cần cập nhật',
      });
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'rating')) {
      if (!Number.isInteger(payload.rating) || payload.rating < 1 || payload.rating > 5) {
        return res.status(400).json({
          success: false,
          message: 'Số sao đánh giá phải từ 1 đến 5',
        });
      }
      review.rating = payload.rating;
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'comment')) {
      if (payload.comment.length > 1000) {
        return res.status(400).json({
          success: false,
          message: 'Nội dung đánh giá không được vượt quá 1000 ký tự',
        });
      }
      review.comment = payload.comment;
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'images')) {
      review.images = payload.images;
    }

    await review.save();
    await updateProductRatingStats(review.product);

    const populated = await Review.findById(review._id)
      .populate('user', 'name avatarUrl')
      .populate('product', 'name images')
      .lean();

    return res.json({
      success: true,
      message: 'Cập nhật đánh giá thành công',
      data: populated,
    });
  } catch (error) {
    const statusCode = Number(error?.statusCode || 500);
    return res.status(statusCode).json({
      success: false,
      message: error?.message || 'Có lỗi xảy ra, vui lòng thử lại',
    });
  }
};

exports.getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    const { page = 1, limit = 10, rating } = req.query || {};

    const data = await getProductReviews({
      productId,
      page,
      limit,
      rating,
    });

    return res.json({
      success: true,
      data: data.items,
      pagination: data.pagination,
      summary: data.summary,
    });
  } catch (error) {
    const statusCode = Number(error?.statusCode || 500);
    return res.status(statusCode).json({
      success: false,
      message: error?.message || 'Không thể lấy danh sách đánh giá',
    });
  }
};

exports.getMyReviews = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Bạn cần đăng nhập để xem đánh giá của mình',
      });
    }

    const {
      page = 1,
      limit = 20,
      orderId = '',
      productId = '',
    } = req.query || {};

    const normalizedPage = Math.max(Number(page) || 1, 1);
    const normalizedLimit = Math.min(Math.max(Number(limit) || 20, 1), 50);
    const skip = (normalizedPage - 1) * normalizedLimit;

    const query = { user: userId };
    if (String(orderId || '').trim()) query.order = orderId;
    if (String(productId || '').trim()) query.product = productId;

    const [rows, total] = await Promise.all([
      Review.find(query)
        .populate('product', 'name images')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(normalizedLimit)
        .lean(),
      Review.countDocuments(query),
    ]);

    return res.json({
      success: true,
      data: rows,
      pagination: {
        page: normalizedPage,
        limit: normalizedLimit,
        total,
        pages: Math.max(Math.ceil(total / normalizedLimit), 1),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Không thể lấy danh sách đánh giá',
    });
  }
};

exports.canReview = async (req, res) => {
  try {
    const userId = req.user?.id;
    const {
      orderId = '',
      productId = '',
    } = req.query || {};

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Bạn cần đăng nhập để thực hiện thao tác này',
      });
    }

    if (!String(orderId).trim() || !String(productId).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin orderId hoặc productId',
      });
    }

    try {
      await validateOrderForReview(userId, orderId, productId);
      return res.json({
        success: true,
        message: 'Có thể đánh giá sản phẩm',
        data: {
          canReview: true,
          reason: '',
        },
      });
    } catch (validationError) {
      const existing = await Review.findOne({
        user: userId,
        order: orderId,
        product: productId,
      }).select('_id');

      if (existing) {
        return res.json({
          success: true,
          data: {
            canReview: false,
            reason: 'Sản phẩm này đã được đánh giá trước đó',
            reviewId: existing._id,
          },
        });
      }

      return res.json({
        success: true,
        data: {
          canReview: false,
          reason: validationError?.message || 'Bạn không có quyền đánh giá sản phẩm này',
        },
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Không thể kiểm tra quyền đánh giá',
    });
  }
};

exports.getProductReviewSummary = async (req, res) => {
  try {
    const { productId } = req.params;
    const summary = await getReviewSummary(productId);
    return res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    const statusCode = Number(error?.statusCode || 500);
    return res.status(statusCode).json({
      success: false,
      message: error?.message || 'Không thể lấy thống kê đánh giá',
    });
  }
};

exports.getAdminReviews = async (req, res) => {
  try {
    if (!isOwnerOrStaff(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền thực hiện chức năng này',
      });
    }

    const data = await getAdminReviewList(req.query || {});
    return res.json({
      success: true,
      message: 'Lấy danh sách đánh giá thành công',
      data: data.items,
      pagination: data.pagination,
    });
  } catch (error) {
    const statusCode = Number(error?.statusCode || 500);
    return res.status(statusCode).json({
      success: false,
      message: error?.message || 'Không thể lấy danh sách đánh giá',
    });
  }
};

exports.getAdminReviewDetail = async (req, res) => {
  try {
    if (!isOwnerOrStaff(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền thực hiện chức năng này',
      });
    }

    const review = await getAdminReviewDetail(req.params.id);
    return res.json({
      success: true,
      message: 'Lấy chi tiết đánh giá thành công',
      data: review,
    });
  } catch (error) {
    const statusCode = Number(error?.statusCode || 500);
    return res.status(statusCode).json({
      success: false,
      message: error?.message || 'Không thể lấy chi tiết đánh giá',
    });
  }
};

exports.patchAdminReviewStatus = async (req, res) => {
  try {
    if (!isOwnerOrStaff(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền thực hiện chức năng này',
      });
    }

    const { status, reason = '' } = req.body || {};
    const normalizedStatus = String(status || '').trim().toLowerCase();
    if (!REVIEW_STATUSES.has(normalizedStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Trạng thái đánh giá không hợp lệ',
      });
    }

    const review = await updateReviewStatus({
      reviewId: req.params.id,
      status: normalizedStatus,
      reason,
      moderatorId: req.user?.id || null,
    });

    return res.json({
      success: true,
      message: 'Cập nhật trạng thái đánh giá thành công',
      data: review,
    });
  } catch (error) {
    const statusCode = Number(error?.statusCode || 500);
    return res.status(statusCode).json({
      success: false,
      message: error?.message || 'Không thể cập nhật trạng thái đánh giá',
    });
  }
};

exports.patchAdminHideReview = async (req, res) => {
  try {
    if (!isOwnerOrStaff(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền thực hiện chức năng này',
      });
    }

    const { reason = '' } = req.body || {};
    const review = await hideReview({
      reviewId: req.params.id,
      reason,
      moderatorId: req.user?.id || null,
    });

    return res.json({
      success: true,
      message: 'Ẩn đánh giá thành công',
      data: review,
    });
  } catch (error) {
    const statusCode = Number(error?.statusCode || 500);
    return res.status(statusCode).json({
      success: false,
      message: error?.message || 'Không thể ẩn đánh giá',
    });
  }
};

exports.patchAdminReply = async (req, res) => {
  try {
    if (!isOwnerOrStaff(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền thực hiện chức năng này',
      });
    }

    const review = await replyToReview({
      reviewId: req.params.id,
      content: req.body?.content,
      actorId: req.user?.id || null,
    });

    return res.json({
      success: true,
      message: 'Phản hồi đánh giá thành công',
      data: review,
    });
  } catch (error) {
    const statusCode = Number(error?.statusCode || 500);
    return res.status(statusCode).json({
      success: false,
      message: error?.message || 'Không thể phản hồi đánh giá',
    });
  }
};

exports.deleteAdminReply = async (req, res) => {
  try {
    if (!isOwner(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền thực hiện chức năng này',
      });
    }

    const review = await deleteSellerReply({
      reviewId: req.params.id,
    });

    return res.json({
      success: true,
      message: 'Xóa phản hồi thành công',
      data: review,
    });
  } catch (error) {
    const statusCode = Number(error?.statusCode || 500);
    return res.status(statusCode).json({
      success: false,
      message: error?.message || 'Không thể xóa phản hồi',
    });
  }
};

exports.getAdminReviewStatsSummary = async (req, res) => {
  try {
    if (!isOwnerOrStaff(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền thực hiện chức năng này',
      });
    }

    const data = await getReviewAdminStats();
    return res.json({
      success: true,
      message: 'Lấy thống kê đánh giá thành công',
      data,
    });
  } catch (error) {
    const statusCode = Number(error?.statusCode || 500);
    return res.status(statusCode).json({
      success: false,
      message: error?.message || 'Không thể lấy thống kê đánh giá',
    });
  }
};
