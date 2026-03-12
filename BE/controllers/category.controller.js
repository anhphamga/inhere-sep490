const Category = require('../model/Category.model');
const Product = require('../model/Product.model');
const { getRequestLang, resolveLocalizedField } = require('../utils/i18n');

const normalizeKey = (value) => String(value || '').trim().toLowerCase();

const coalesceCategoryTextExpr = {
  $ifNull: [
    '$category.vi',
    {
      $ifNull: [
        '$categoryVi',
        {
          $ifNull: [
            '$category.en',
            {
              $ifNull: ['$categoryEn', '$category'],
            },
          ],
        },
      ],
    },
  ],
};

const getProductCategoryStats = async () => {
  const rows = await Product.aggregate([
    {
      $project: {
        categoryText: coalesceCategoryTextExpr,
        imageUrl: { $ifNull: [{ $arrayElemAt: ['$images', 0] }, ''] },
      },
    },
    {
      $match: {
        categoryText: { $exists: true, $ne: null, $ne: '' },
      },
    },
    {
      $group: {
        _id: '$categoryText',
        count: { $sum: 1 },
        imageUrl: { $first: '$imageUrl' },
      },
    },
    {
      $sort: { count: -1, _id: 1 },
    },
  ]);

  const map = new Map();
  rows.forEach((row) => {
    const key = normalizeKey(row?._id);
    if (!key) return;
    map.set(key, {
      count: Number(row?.count || 0),
      imageUrl: String(row?.imageUrl || ''),
    });
  });

  return map;
};

const toCategoryNode = (doc = {}, lang = 'vi', statsMap = new Map()) => {
  const displayName = resolveLocalizedField(
    doc,
    'name',
    lang,
    resolveLocalizedField(doc, 'displayName', lang, String(doc?.slug || ''))
  );

  const displayNameVi = resolveLocalizedField(doc, 'name', 'vi', displayName);
  const displayNameEn = resolveLocalizedField(doc, 'name', 'en', displayNameVi);
  const value = String(doc?.value || displayName).trim();
  const slug = String(doc?.slug || '').trim();
  const rawName = String(displayNameVi || displayName || value || slug).trim();

  const lookupKeys = [rawName, displayName, displayNameVi, displayNameEn, value, slug].map(normalizeKey).filter(Boolean);
  let matchedStats = { count: 0, imageUrl: '' };
  for (const key of lookupKeys) {
    if (statsMap.has(key)) {
      matchedStats = statsMap.get(key);
      break;
    }
  }

  return {
    _id: doc?._id,
    id: String(doc?._id || ''),
    parentId: doc?.parentId || null,
    displayName,
    displayNameVi,
    displayNameEn,
    rawName,
    value: value || rawName,
    slug,
    type: String(doc?.type || 'rent').trim() || 'rent',
    sortOrder: Number(doc?.sortOrder || 0),
    isActive: doc?.isActive !== false,
    count: Number(matchedStats?.count || 0),
    imageUrl: String(matchedStats?.imageUrl || ''),
    children: [],
  };
};

const sortNodes = (nodes = []) => {
  nodes.sort((a, b) => {
    const orderDiff = Number(a?.sortOrder || 0) - Number(b?.sortOrder || 0);
    if (orderDiff !== 0) return orderDiff;
    return String(a?.displayName || '').localeCompare(String(b?.displayName || ''), 'vi');
  });

  nodes.forEach((node) => {
    if (Array.isArray(node.children) && node.children.length > 0) {
      sortNodes(node.children);
    }
  });
};

const getCategories = async (req, res) => {
  try {
    const lang = getRequestLang(req.query.lang);
    const [docs, statsMap] = await Promise.all([
      Category.find({}).sort({ sortOrder: 1, createdAt: 1, _id: 1 }).lean(),
      getProductCategoryStats(),
    ]);

    const nodes = docs.map((doc) => toCategoryNode(doc, lang, statsMap));
    const nodeById = new Map(nodes.map((node) => [String(node._id || ''), node]));
    const roots = [];

    nodes.forEach((node) => {
      const parentKey = String(node?.parentId || '');
      if (parentKey && nodeById.has(parentKey)) {
        nodeById.get(parentKey).children.push(node);
      } else {
        roots.push(node);
      }
    });

    sortNodes(roots);

    return res.status(200).json({
      success: true,
      categories: roots,
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
