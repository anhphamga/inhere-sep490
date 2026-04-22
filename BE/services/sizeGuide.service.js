const mongoose = require('mongoose');
const SizeGuide = require('../model/SizeGuide.model');
const Product = require('../model/Product.model');
const {
  SIZE_GUIDE_SIZE_LABELS,
  SIZE_GUIDE_GENDERS,
} = require('../model/SizeGuide.model');

const SIZE_ORDER = new Map(SIZE_GUIDE_SIZE_LABELS.map((label, index) => [label, index]));

const parseJsonLike = (value, fallback) => {
  if (value === undefined || value === null || value === '') return fallback;
  if (Array.isArray(value) || (value && typeof value === 'object')) return value;
  if (typeof value !== 'string') return fallback;

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const normalizeText = (value) => String(value || '').trim();

const normalizeGender = (value) => {
  const normalized = normalizeText(value).toLowerCase();
  if (!normalized) return '';
  return SIZE_GUIDE_GENDERS.includes(normalized) ? normalized : '';
};

const normalizeSizeLabel = (value) => {
  const normalized = normalizeText(value).toUpperCase();
  if (!normalized) return '';
  return SIZE_GUIDE_SIZE_LABELS.includes(normalized) ? normalized : '';
};

const normalizeOptionalNumber = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const num = Number(value);
  if (!Number.isFinite(num)) return Number.NaN;
  if (num < 0) return Number.NaN;
  return num;
};

const normalizeRequiredNumber = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return Number.NaN;
  if (num < 0) return Number.NaN;
  return num;
};

const sortRows = (rows = []) => (
  rows.slice().sort((a, b) => {
    const genderA = SIZE_GUIDE_GENDERS.indexOf(a.gender);
    const genderB = SIZE_GUIDE_GENDERS.indexOf(b.gender);
    if (genderA !== genderB) return genderA - genderB;

    const sizeA = SIZE_ORDER.get(a.sizeLabel);
    const sizeB = SIZE_ORDER.get(b.sizeLabel);
    return sizeA - sizeB;
  })
);

const toClientRow = (row = {}) => ({
  id: row._id,
  sizeLabel: row.sizeLabel,
  gender: row.gender,
  heightMin: row.heightMin,
  heightMax: row.heightMax,
  weightMin: row.weightMin,
  weightMax: row.weightMax,
  itemLength: row.itemLength ?? null,
  itemWidth: row.itemWidth ?? null,
  type: row.type,
  productId: row.productId || null,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

const normalizeRowsInput = (value) => {
  const source = parseJsonLike(value, []);
  return Array.isArray(source) ? source : [];
};

const validateAndNormalizeRows = (rowsInput = []) => {
  const rows = normalizeRowsInput(rowsInput);
  if (rows.length === 0) {
    return {
      error: 'rows must be a non-empty array',
      rows: [],
    };
  }

  const seen = new Set();
  const normalizedRows = [];

  for (const row of rows) {
    if (!row || typeof row !== 'object') {
      return { error: 'each row must be an object', rows: [] };
    }

    const gender = normalizeGender(row.gender);
    const sizeLabel = normalizeSizeLabel(row.sizeLabel || row.size_label || row.size);

    if (!gender) {
      return { error: 'gender must be male or female', rows: [] };
    }
    if (!sizeLabel) {
      return { error: 'sizeLabel must be one of S, M, L, XL', rows: [] };
    }

    const key = `${gender}::${sizeLabel}`;
    if (seen.has(key)) {
      return { error: 'duplicate row for the same gender and sizeLabel', rows: [] };
    }
    seen.add(key);

    const heightMin = normalizeRequiredNumber(row.heightMin ?? row.height_min);
    const heightMax = normalizeRequiredNumber(row.heightMax ?? row.height_max);
    const weightMin = normalizeRequiredNumber(row.weightMin ?? row.weight_min);
    const weightMax = normalizeRequiredNumber(row.weightMax ?? row.weight_max);

    if ([heightMin, heightMax, weightMin, weightMax].some((num) => Number.isNaN(num))) {
      return { error: 'heightMin, heightMax, weightMin, weightMax must be numbers >= 0', rows: [] };
    }

    if (heightMin > heightMax) {
      return { error: 'heightMin must be <= heightMax', rows: [] };
    }

    if (weightMin > weightMax) {
      return { error: 'weightMin must be <= weightMax', rows: [] };
    }

    const itemLength = normalizeOptionalNumber(row.itemLength ?? row.item_length);
    const itemWidth = normalizeOptionalNumber(row.itemWidth ?? row.item_width);

    if (Number.isNaN(itemLength) || Number.isNaN(itemWidth)) {
      return { error: 'itemLength and itemWidth must be numbers >= 0 when provided', rows: [] };
    }

    normalizedRows.push({
      sizeLabel,
      gender,
      heightMin,
      heightMax,
      weightMin,
      weightMax,
      itemLength,
      itemWidth,
    });
  }

  const expectedKeys = [];
  SIZE_GUIDE_GENDERS.forEach((gender) => {
    SIZE_GUIDE_SIZE_LABELS.forEach((sizeLabel) => {
      expectedKeys.push(`${gender}::${sizeLabel}`);
    });
  });

  const missing = expectedKeys.filter((key) => !seen.has(key));
  if (missing.length > 0) {
    return {
      error: 'rows must include full matrix for male/female and S/M/L/XL',
      rows: [],
    };
  }

  return {
    error: null,
    rows: sortRows(normalizedRows),
  };
};

const getGlobalRows = async (gender = '') => {
  const normalizedGender = normalizeGender(gender);
  const query = {
    type: 'global',
    productId: null,
  };
  if (normalizedGender) query.gender = normalizedGender;

  const rows = await SizeGuide.find(query).lean();
  return sortRows(rows.map(toClientRow));
};

const getProductRows = async (productId, gender = '') => {
  const normalizedGender = normalizeGender(gender);
  const query = {
    type: 'product',
    productId,
  };
  if (normalizedGender) query.gender = normalizedGender;

  const rows = await SizeGuide.find(query).lean();
  return sortRows(rows.map(toClientRow));
};

const ensureProductExists = async (productId) => {
  if (!mongoose.Types.ObjectId.isValid(productId)) return false;
  const count = await Product.countDocuments({ _id: productId });
  return count > 0;
};

const replaceGlobalRows = async (rows = []) => {
  const docs = rows.map((row) => ({
    ...row,
    type: 'global',
    productId: null,
  }));

  await SizeGuide.deleteMany({ type: 'global', productId: null });
  if (docs.length === 0) return [];

  const inserted = await SizeGuide.insertMany(docs);
  return sortRows(inserted.map((item) => toClientRow(item.toObject())));
};

const replaceProductRows = async (productId, rows = []) => {
  const docs = rows.map((row) => ({
    ...row,
    type: 'product',
    productId,
  }));

  await SizeGuide.deleteMany({ type: 'product', productId });
  if (docs.length === 0) return [];

  const inserted = await SizeGuide.insertMany(docs);
  return sortRows(inserted.map((item) => toClientRow(item.toObject())));
};

const resolveSizeGuideForProduct = async ({ productId, gender = '' }) => {
  const productRows = await getProductRows(productId, gender);
  if (productRows.length > 0) {
    return {
      source: 'product',
      rows: productRows,
    };
  }

  const globalRows = await getGlobalRows(gender);
  return {
    source: 'global',
    rows: globalRows,
  };
};

module.exports = {
  SIZE_GUIDE_GENDERS,
  SIZE_GUIDE_SIZE_LABELS,
  ensureProductExists,
  getGlobalRows,
  getProductRows,
  normalizeGender,
  normalizeRowsInput,
  replaceGlobalRows,
  replaceProductRows,
  resolveSizeGuideForProduct,
  toClientRow,
  validateAndNormalizeRows,
};
