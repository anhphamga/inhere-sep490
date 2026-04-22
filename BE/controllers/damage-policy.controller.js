const mongoose = require('mongoose');
const DamagePolicy = require('../model/DamagePolicy.model');
const Category = require('../model/Category.model');
const Product = require('../model/Product.model');
const ProductInstance = require('../model/ProductInstance.model');
const { getInstanceBaseValue } = require('../model/ProductInstance.model');

const normalizeKey = (value) => String(value || '').trim().toLowerCase();

const pickCategoryText = (cat) => {
  if (!cat) return '';
  if (typeof cat === 'string') return cat.trim();
  return String(cat?.vi || cat?.en || cat?.name?.vi || cat?.name?.en || cat?.value || cat?.slug || '').trim();
};

const resolveCategoryDocForProduct = async (product) => {
  if (!product) return null;

  const categoryText = pickCategoryText(product.category);
  const childText = pickCategoryText(product?.categoryPath?.child);
  const parentText = pickCategoryText(product?.categoryPath?.parent);

  const candidates = [childText, categoryText, parentText]
    .map(normalizeKey)
    .filter(Boolean);
  if (candidates.length === 0) return null;

  const allCategories = await Category.find({}).lean();
  const byKey = new Map();
  for (const cat of allCategories) {
    const keys = [
      cat?.slug,
      cat?.value,
      cat?.name?.vi,
      cat?.name?.en,
      cat?.displayName?.vi,
      cat?.displayName?.en,
      typeof cat?.name === 'string' ? cat.name : '',
      typeof cat?.displayName === 'string' ? cat.displayName : '',
    ].map(normalizeKey).filter(Boolean);
    for (const k of keys) {
      if (!byKey.has(k)) byKey.set(k, cat);
    }
  }

  for (const key of candidates) {
    if (byKey.has(key)) return byKey.get(key);
  }

  return null;
};

const sanitizeLevels = (raw) => {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((lvl, idx) => ({
      key: String(lvl?.key || '').trim() || `level_${idx + 1}`,
      label: String(lvl?.label || '').trim(),
      description: String(lvl?.description || '').trim(),
      penaltyPercent: Math.max(0, Math.min(100, Number(lvl?.penaltyPercent || 0))),
      triggerLifecycle: ['Washing', 'Repair', 'Lost'].includes(lvl?.triggerLifecycle) ? lvl.triggerLifecycle : 'Repair',
      condition: ['Normal', 'Dirty', 'Damaged', 'Lost'].includes(lvl?.condition) ? lvl.condition : 'Damaged',
      sortOrder: Number(lvl?.sortOrder || idx),
    }))
    .filter((lvl) => lvl.label);
};

exports.listPolicies = async (req, res) => {
  try {
    const { scope, isActive } = req.query;
    const filter = {};
    if (scope && ['global', 'category'].includes(scope)) filter.scope = scope;
    if (isActive === 'true') filter.isActive = true;
    if (isActive === 'false') filter.isActive = false;

    const policies = await DamagePolicy.find(filter)
      .populate('categoryId', 'name displayName slug value')
      .sort({ scope: 1, createdAt: -1 })
      .lean();

    return res.json({ success: true, data: policies });
  } catch (error) {
    console.error('listPolicies error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
  }
};

exports.getPolicy = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'ID không hợp lệ' });
    }
    const policy = await DamagePolicy.findById(id)
      .populate('categoryId', 'name displayName slug value')
      .lean();
    if (!policy) return res.status(404).json({ success: false, message: 'Không tìm thấy chính sách' });
    return res.json({ success: true, data: policy });
  } catch (error) {
    console.error('getPolicy error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
  }
};

exports.createPolicy = async (req, res) => {
  try {
    const { name, description, scope, categoryId, levels, isActive } = req.body || {};

    if (!name || !String(name).trim()) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập tên chính sách' });
    }
    if (!['global', 'category'].includes(scope)) {
      return res.status(400).json({ success: false, message: 'Scope không hợp lệ' });
    }
    if (scope === 'category' && !mongoose.isValidObjectId(categoryId)) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn danh mục' });
    }

    const cleanLevels = sanitizeLevels(levels);
    if (cleanLevels.length === 0) {
      return res.status(400).json({ success: false, message: 'Policy phải có ít nhất 1 mức' });
    }

    const payload = {
      name: String(name).trim(),
      description: String(description || '').trim(),
      scope,
      categoryId: scope === 'category' ? categoryId : null,
      levels: cleanLevels,
      isActive: isActive !== false,
      createdBy: req.user?.id || req.user?._id || null,
      updatedBy: req.user?.id || req.user?._id || null,
    };

    if (scope === 'global') {
      const existingGlobal = await DamagePolicy.findOne({ scope: 'global', isActive: true });
      if (existingGlobal) {
        return res.status(400).json({
          success: false,
          message: 'Đã có chính sách global đang hoạt động. Vui lòng vô hiệu hóa trước khi tạo mới.',
        });
      }
    } else {
      const existingForCategory = await DamagePolicy.findOne({
        scope: 'category',
        categoryId: payload.categoryId,
        isActive: true,
      });
      if (existingForCategory) {
        return res.status(400).json({
          success: false,
          message: 'Danh mục này đã có chính sách đang hoạt động.',
        });
      }
    }

    const policy = await DamagePolicy.create(payload);
    return res.status(201).json({ success: true, data: policy });
  } catch (error) {
    console.error('createPolicy error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
  }
};

exports.updatePolicy = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'ID không hợp lệ' });
    }

    const policy = await DamagePolicy.findById(id);
    if (!policy) return res.status(404).json({ success: false, message: 'Không tìm thấy chính sách' });

    const { name, description, scope, categoryId, levels, isActive } = req.body || {};

    if (name !== undefined) policy.name = String(name).trim();
    if (description !== undefined) policy.description = String(description || '').trim();
    if (scope !== undefined) {
      if (!['global', 'category'].includes(scope)) {
        return res.status(400).json({ success: false, message: 'Scope không hợp lệ' });
      }
      policy.scope = scope;
    }
    if (scope === 'category' || policy.scope === 'category') {
      if (categoryId && !mongoose.isValidObjectId(categoryId)) {
        return res.status(400).json({ success: false, message: 'categoryId không hợp lệ' });
      }
      if (categoryId) policy.categoryId = categoryId;
    }
    if (policy.scope === 'global') {
      policy.categoryId = null;
    }
    if (levels !== undefined) {
      const cleanLevels = sanitizeLevels(levels);
      if (cleanLevels.length === 0) {
        return res.status(400).json({ success: false, message: 'Policy phải có ít nhất 1 mức' });
      }
      policy.levels = cleanLevels;
    }
    if (isActive !== undefined) policy.isActive = Boolean(isActive);

    policy.updatedBy = req.user?.id || req.user?._id || null;

    if (policy.isActive) {
      const dupFilter = policy.scope === 'global'
        ? { scope: 'global', isActive: true, _id: { $ne: policy._id } }
        : { scope: 'category', categoryId: policy.categoryId, isActive: true, _id: { $ne: policy._id } };
      const dup = await DamagePolicy.findOne(dupFilter);
      if (dup) {
        return res.status(400).json({
          success: false,
          message: policy.scope === 'global'
            ? 'Đã tồn tại chính sách global đang hoạt động'
            : 'Danh mục này đã có chính sách đang hoạt động khác',
        });
      }
    }

    await policy.save();
    return res.json({ success: true, data: policy });
  } catch (error) {
    console.error('updatePolicy error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
  }
};

exports.deletePolicy = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'ID không hợp lệ' });
    }
    const policy = await DamagePolicy.findById(id);
    if (!policy) return res.status(404).json({ success: false, message: 'Không tìm thấy chính sách' });

    policy.isActive = false;
    policy.updatedBy = req.user?.id || req.user?._id || null;
    await policy.save();
    return res.json({ success: true, message: 'Đã vô hiệu hóa chính sách' });
  } catch (error) {
    console.error('deletePolicy error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
  }
};

/**
 * Resolve policy cho 1 product hoặc 1 productInstance:
 * - Ưu tiên policy theo category của product (walk parent chain).
 * - Fallback về policy global.
 * Trả về: { policy, baseValue } để FE dùng render dropdown mức phạt.
 */
const resolvePolicyForProduct = async (product) => {
  if (!product) return null;

  const catDoc = await resolveCategoryDocForProduct(product);
  if (catDoc) {
    let current = catDoc;
    const visited = new Set();
    while (current && !visited.has(String(current._id))) {
      visited.add(String(current._id));
      const match = await DamagePolicy.findOne({
        scope: 'category',
        categoryId: current._id,
        isActive: true,
      }).lean();
      if (match) return match;
      if (!current.parentId) break;
      // eslint-disable-next-line no-await-in-loop
      current = await Category.findById(current.parentId).lean();
    }
  }

  const globalPolicy = await DamagePolicy.findOne({ scope: 'global', isActive: true }).lean();
  return globalPolicy;
};

exports.resolvePolicyForProduct = resolvePolicyForProduct;

exports.resolvePolicy = async (req, res) => {
  try {
    const { productId, productInstanceId } = req.query;

    let product = null;
    let instance = null;

    if (productInstanceId) {
      if (!mongoose.isValidObjectId(productInstanceId)) {
        return res.status(400).json({ success: false, message: 'productInstanceId không hợp lệ' });
      }
      instance = await ProductInstance.findById(productInstanceId).lean();
      if (!instance) return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
      product = await Product.findById(instance.productId).lean();
    } else if (productId) {
      if (!mongoose.isValidObjectId(productId)) {
        return res.status(400).json({ success: false, message: 'productId không hợp lệ' });
      }
      product = await Product.findById(productId).lean();
      if (!product) return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
    } else {
      return res.status(400).json({ success: false, message: 'Thiếu productId hoặc productInstanceId' });
    }

    const policy = await resolvePolicyForProduct(product);
    const baseValue = getInstanceBaseValue(instance, product);

    return res.json({
      success: true,
      data: {
        policy,
        baseValue,
        productId: product?._id || null,
        productInstanceId: instance?._id || null,
      },
    });
  } catch (error) {
    console.error('resolvePolicy error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
  }
};
