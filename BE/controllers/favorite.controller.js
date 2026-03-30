const mongoose = require('mongoose');
const {
  toggleFavorite: toggleFavoriteService,
  getMyFavorites: getMyFavoritesService,
  checkFavorite: checkFavoriteService,
} = require('../services/favorite.service');

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

exports.toggleFavorite = async (req, res) => {
  try {
    const userId = req.user?.id;
    const productId = String(req.body?.productId || '').trim();

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Bạn cần đăng nhập để sử dụng chức năng yêu thích',
      });
    }

    if (!isValidObjectId(productId)) {
      return res.status(400).json({
        success: false,
        message: 'Mã sản phẩm không hợp lệ',
      });
    }

    const data = await toggleFavoriteService({ userId, productId });
    return res.json({
      success: true,
      message: data.isFavorite ? 'Đã thêm vào yêu thích' : 'Đã bỏ khỏi yêu thích',
      data,
    });
  } catch (error) {
    const statusCode = Number(error?.statusCode || 500);
    return res.status(statusCode).json({
      success: false,
      message: error?.message || 'Không thể cập nhật trạng thái yêu thích',
    });
  }
};

exports.getMyFavorites = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Bạn cần đăng nhập để xem danh sách yêu thích',
      });
    }

    const { page = 1, limit = 20 } = req.query || {};
    const result = await getMyFavoritesService({ userId, page, limit });

    return res.json({
      success: true,
      message: 'Lấy danh sách yêu thích thành công',
      data: result.items,
      pagination: result.pagination,
    });
  } catch (error) {
    const statusCode = Number(error?.statusCode || 500);
    return res.status(statusCode).json({
      success: false,
      message: error?.message || 'Không thể lấy danh sách yêu thích',
    });
  }
};

exports.checkFavorite = async (req, res) => {
  try {
    const userId = req.user?.id;
    const productId = String(req.params?.productId || '').trim();

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Bạn cần đăng nhập để kiểm tra yêu thích',
      });
    }

    if (!isValidObjectId(productId)) {
      return res.status(400).json({
        success: false,
        message: 'Mã sản phẩm không hợp lệ',
      });
    }

    const isFavorite = await checkFavoriteService({ userId, productId });
    return res.json({
      success: true,
      message: 'Kiểm tra trạng thái yêu thích thành công',
      data: { isFavorite },
    });
  } catch (error) {
    const statusCode = Number(error?.statusCode || 500);
    return res.status(statusCode).json({
      success: false,
      message: error?.message || 'Không thể kiểm tra trạng thái yêu thích',
    });
  }
};
