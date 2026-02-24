const Product = require('../model/Product.model');
const RentOrderItem = require('../model/RentOrderItem.model');
const SaleOrderItem = require('../model/SaleOrderItem.model');

const toNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const normalizeImages = (images) => {
  if (!Array.isArray(images)) return [];
  return images
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean);
};

const normalizePayload = (body = {}) => ({
  name: String(body.name || '').trim(),
  category: String(body.category || '').trim(),
  size: String(body.size || '').trim(),
  color: String(body.color || '').trim(),
  description: String(body.description || '').trim(),
  images: normalizeImages(body.images),
  baseRentPrice: toNumber(body.baseRentPrice, 0),
  baseSalePrice: toNumber(body.baseSalePrice, 0),
  likeCount: Math.max(toNumber(body.likeCount, 0), 0),
});

const getProducts = async (req, res) => {
  try {
    const purpose = (req.query.purpose || 'all').toLowerCase();
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 8, 1), 50);
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const category = (req.query.category || '').trim();
    const skip = (page - 1) * limit;

    const withCategory = (filter) =>
      category ? { ...filter, category } : filter;

    let products = [];
    let totalItems = 0;
    if (purpose === 'buy') {
      const primaryFilter = withCategory({ baseSalePrice: { $gt: 0 } });
      totalItems = await Product.countDocuments(primaryFilter);
      if (totalItems > 0) {
        products = await Product.find(primaryFilter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean();
      } else {
        const fallbackFilter = withCategory({});
        totalItems = await Product.countDocuments(fallbackFilter);
        products = await Product.find(fallbackFilter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean();
      }
    } else if (purpose === 'fitting') {
      const filter = withCategory({ baseRentPrice: { $gt: 0 } });
      totalItems = await Product.countDocuments(filter);
      products = await Product.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
    } else {
      const filter = withCategory({});
      totalItems = await Product.countDocuments(filter);
      products = await Product.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
    }

    const data = products.map((product) => ({
      _id: product._id,
      name: product.name,
      category: product.category,
      imageUrl: Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : '',
      createdAt: product.createdAt,
      baseRentPrice: product.baseRentPrice,
      baseSalePrice: product.baseSalePrice,
      likeCount: product.likeCount || 0,
      size: product.size,
      color: product.color,
      description: product.description || '',
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

const getTopRentedProducts = async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 4, 1), 12);

    const rows = await RentOrderItem.aggregate([
      {
        $group: {
          _id: '$productInstanceId',
          rentCount: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'productinstances',
          localField: '_id',
          foreignField: '_id',
          as: 'instance',
        },
      },
      {
        $unwind: '$instance',
      },
      {
        $group: {
          _id: '$instance.productId',
          rentCount: { $sum: '$rentCount' },
        },
      },
      {
        $sort: { rentCount: -1, _id: 1 },
      },
      {
        $limit: limit,
      },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product',
        },
      },
      {
        $unwind: '$product',
      },
      {
        $project: {
          _id: '$product._id',
          name: '$product.name',
          category: '$product.category',
          imageUrl: {
            $ifNull: [{ $arrayElemAt: ['$product.images', 0] }, ''],
          },
          baseRentPrice: '$product.baseRentPrice',
          rentCount: 1,
        },
      },
      {
        $sort: { rentCount: -1, _id: 1 },
      },
    ]);

    return res.status(200).json({
      success: true,
      data: rows,
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
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 8, 1), 24);

    const rows = await Product.find({ baseRentPrice: { $gt: 0 } })
      .sort({ likeCount: -1, createdAt: -1, _id: 1 })
      .limit(limit)
      .lean();

    const data = rows.map((product) => ({
      _id: product._id,
      name: product.name,
      category: product.category,
      imageUrl: Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : '',
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
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 8, 1), 24);

    const rows = await SaleOrderItem.aggregate([
      {
        $group: {
          _id: '$productId',
          soldQuantity: { $sum: '$quantity' },
        },
      },
      {
        $sort: { soldQuantity: -1, _id: 1 },
      },
      {
        $limit: limit,
      },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product',
        },
      },
      {
        $unwind: '$product',
      },
      {
        $project: {
          _id: '$product._id',
          name: '$product.name',
          category: '$product.category',
          imageUrl: {
            $ifNull: [{ $arrayElemAt: ['$product.images', 0] }, ''],
          },
          baseSalePrice: '$product.baseSalePrice',
          soldQuantity: 1,
        },
      },
      {
        $sort: { soldQuantity: -1, _id: 1 },
      },
    ]);

    return res.status(200).json({
      success: true,
      data: rows,
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
    const product = await Product.findById(req.params.id).lean();
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }
    return res.status(200).json({
      success: true,
      data: product,
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
    if (!payload.name || !payload.category || !payload.size || !payload.color) {
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

const updateProduct = async (req, res) => {
  try {
    const payload = normalizePayload(req.body);
    if (!payload.name || !payload.category || !payload.size || !payload.color) {
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

module.exports = {
  getProducts,
  getTopRentedProducts,
  getTopLikedProducts,
  getTopSoldProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};
