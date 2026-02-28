const Product = require('../model/Product.model');
const SaleOrderItem = require('../model/SaleOrderItem.model');

const CATEGORY_CATALOG = [
  {
    displayName: 'Áo Dài Cho Thuê',
    type: 'rent',
    children: [
      { displayName: 'Áo Dài Bà Sui', type: 'rent' },
      {
        displayName: 'Áo Dài Bé',
        type: 'rent',
        children: [{ displayName: 'Áo Dài Bé Trai', type: 'rent' }],
      },
      { displayName: 'Áo Dài Cách Tân Cho Thuê', type: 'rent' },
      { displayName: 'Áo Dài Cưới', type: 'sale_or_rent' },
      {
        displayName: 'Áo Dài Gấm',
        type: 'rent',
        children: [
          { displayName: 'Gấm Hoa', type: 'rent' },
          { displayName: 'Gấm Thọ', type: 'rent' },
        ],
      },
      { displayName: 'Áo Dài Suôn Lụa Trơn', type: 'rent' },
      {
        displayName: 'Áo Dài Thiết Kế Cho Thuê',
        type: 'rent',
        children: [{ displayName: 'In Hoa Văn', type: 'rent' }],
      },
      { displayName: 'Áo Dài Tơ Thêu', type: 'rent' },
      { displayName: 'Áo Dài Cao Cấp', type: 'sale_or_rent' },
      { displayName: 'Áo Dài Nam', type: 'sale_or_rent' },
      { displayName: 'Áo Dài Truyền Thống Cho Thuê', type: 'rent' },
    ],
  },
  {
    displayName: 'Cho Thuê Váy Đầm Hội An',
    type: 'rent',
    children: [
      { displayName: 'Váy Đi Tiệc', type: 'rent' },
      { displayName: 'Váy Vintage', type: 'rent' },
      { displayName: 'Yếm Chụp Ảnh', type: 'rent' },
    ],
  },
  {
    displayName: 'Cho Thuê Vest Hội An',
    type: 'rent',
    children: [
      { displayName: 'Vest Nam', type: 'rent' },
      { displayName: 'Phụ Kiện Vest', type: 'rent' },
    ],
  },
  {
    displayName: 'Cổ Phục Cho Thuê Tại Hội An',
    type: 'rent',
    children: [
      { displayName: 'Áo Tấc', type: 'rent' },
      { displayName: 'Nhật Bình', type: 'rent' },
    ],
  },
  {
    displayName: 'Đồ Cho Bé Cho Thuê Hội An',
    type: 'rent',
    children: [
      { displayName: 'Bé Gái', type: 'rent' },
      { displayName: 'Bé Trai', type: 'rent' },
    ],
  },
  { displayName: 'Gói Chụp Ảnh', type: 'service' },
  { displayName: 'Make Up', type: 'service' },
  {
    displayName: 'Phụ Kiện Chụp Ảnh Cho Thuê',
    type: 'rent',
    children: [
      { displayName: 'Băng Đô', type: 'rent' },
      { displayName: 'Nón', type: 'rent' },
      { displayName: 'Quạt', type: 'rent' },
      { displayName: 'Túi Giỏ', type: 'rent' },
    ],
  },
  { displayName: 'Quần Áo Dài', type: 'sale_or_rent' },
  { displayName: 'Sửa Đồ', type: 'service' },
  { displayName: 'Váy Cưới', type: 'sale_or_rent' },
];

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

const createNode = (node = {}) => ({
  displayName: String(node.displayName || '').trim(),
  rawName: String(node.displayName || '').trim(),
  slug: slugify(node.displayName || ''),
  type: node.type || 'rent',
  count: 0,
  imageUrl: '',
  children: Array.isArray(node.children) ? node.children.map((item) => createNode(item)) : [],
});

const addDbOnlyCategory = (bucket, name, type, count, imageUrl) => {
  bucket.push({
    displayName: name,
    rawName: name,
    slug: slugify(name),
    type: type || 'rent',
    count: count || 0,
    imageUrl: imageUrl || '',
    children: [],
  });
};

const applyCountAndImage = (node, countMap, imageMap) => {
  const ownCount = countMap.get(node.displayName) || 0;
  const ownImage = imageMap.get(node.displayName) || '';

  if (!node.children.length) {
    return {
      ...node,
      count: ownCount,
      imageUrl: ownImage,
    };
  }

  const children = node.children.map((child) => applyCountAndImage(child, countMap, imageMap));
  const childrenCount = children.reduce((sum, child) => sum + (child.count || 0), 0);
  const firstChildImage = children.find((child) => child.imageUrl)?.imageUrl || '';

  return {
    ...node,
    count: ownCount + childrenCount,
    imageUrl: ownImage || firstChildImage,
    children,
  };
};

const flattenCategoryNames = (nodes = [], bag = new Set()) => {
  nodes.forEach((node) => {
    bag.add(node.displayName);
    if (Array.isArray(node.children) && node.children.length > 0) {
      flattenCategoryNames(node.children, bag);
    }
  });
  return bag;
};

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

    const countMap = new Map(rows.map((item) => [item._id, item.count]));
    const bestSellerMap = new Map(bestSellerPerCategory.map((item) => [item._id, item.imageUrl]));
    const fallbackImageMap = new Map(fallbackImagePerCategory.map((item) => [item._id, item.imageUrl]));
    const imageMap = new Map();
    [...bestSellerMap.entries(), ...fallbackImageMap.entries()].forEach(([key, value]) => {
      if (!imageMap.has(key) && value) {
        imageMap.set(key, value);
      }
    });

    const baseCatalog = CATEGORY_CATALOG.map((item) => createNode(item));
    const categories = baseCatalog.map((item) => applyCountAndImage(item, countMap, imageMap));
    const knownNames = flattenCategoryNames(categories);

    rows.forEach((row) => {
      if (!knownNames.has(row._id)) {
        addDbOnlyCategory(categories, row._id, 'rent', row.count, imageMap.get(row._id) || '');
      }
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
