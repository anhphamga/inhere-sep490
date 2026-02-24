const Product = require('../model/Product.model');
const SaleOrderItem = require('../model/SaleOrderItem.model');

const TYPE_BY_CATEGORY = {
  'Áo Dài Cưới': 'sale_or_rent',
  'Áo Dài Cao Cấp': 'sale_or_rent',
  'Áo Dài Nam': 'sale_or_rent',
  'Quần Áo Dài': 'sale_or_rent',
  'Váy Cưới': 'sale_or_rent',
  'Gói Chụp Ảnh': 'service',
  'Make Up': 'service',
  'Sửa Đồ': 'service',
};

function slugify(text = '') {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function inferType(categoryName) {
  if (TYPE_BY_CATEGORY[categoryName]) {
    return TYPE_BY_CATEGORY[categoryName];
  }
  return 'rent';
}

const getCategories = async (req, res) => {
  try {
    const rows = await Product.aggregate([
      {
        $match: {
          category: { $exists: true, $ne: null, $ne: '' },
        },
      },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1, _id: 1 },
      },
    ]);

    const bestSellerPerCategory = await SaleOrderItem.aggregate([
      {
        $group: {
          _id: '$productId',
          soldQuantity: { $sum: '$quantity' },
        },
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
          category: '$product.category',
          soldQuantity: 1,
          imageUrl: {
            $ifNull: [{ $arrayElemAt: ['$product.images', 0] }, ''],
          },
        },
      },
      {
        $sort: { category: 1, soldQuantity: -1 },
      },
      {
        $group: {
          _id: '$category',
          imageUrl: { $first: '$imageUrl' },
        },
      },
    ]);

    const fallbackImagePerCategory = await Product.aggregate([
      {
        $match: {
          category: { $exists: true, $ne: null, $ne: '' },
          images: { $exists: true, $ne: [] },
        },
      },
      {
        $project: {
          category: 1,
          imageUrl: { $ifNull: [{ $arrayElemAt: ['$images', 0] }, ''] },
        },
      },
      {
        $match: {
          imageUrl: { $ne: '' },
        },
      },
      {
        $group: {
          _id: '$category',
          imageUrl: { $first: '$imageUrl' },
        },
      },
    ]);

    const bestSellerMap = new Map(
      bestSellerPerCategory.map((item) => [item._id, item.imageUrl])
    );
    const fallbackImageMap = new Map(
      fallbackImagePerCategory.map((item) => [item._id, item.imageUrl])
    );

    const categories = rows.map((row) => {
      const bestSellerImage = bestSellerMap.get(row._id) || '';
      const fallbackImage = fallbackImageMap.get(row._id) || '';
      return {
        displayName: row._id,
        slug: slugify(row._id),
        type: inferType(row._id),
        count: row.count,
        imageUrl: bestSellerImage || fallbackImage || '',
        children: [],
      };
    });

    return res.status(200).json({
      success: true,
      categories,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error getting categories',
      error: error.message,
    });
  }
};

module.exports = {
  getCategories,
};
