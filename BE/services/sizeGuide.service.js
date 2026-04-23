const mongoose = require('mongoose');
const SizeGuide = require('../model/SizeGuide.model');
const Product = require('../model/Product.model');
const {
  SIZE_GUIDE_SIZE_LABELS,
  SIZE_GUIDE_GENDERS,
} = require('../model/SizeGuide.model');

const SIZE_ORDER = new Map(SIZE_GUIDE_SIZE_LABELS.map((label, index) => [label, index]));
const RECOMMENDATION_INDEX_WEIGHTS = Object.freeze({
  height: 0.4,
  weight: 0.6,
});
const RECOMMENDATION_SCORE_WEIGHTS = Object.freeze({
  indexGap: 1,
  outsideHeight: 0.3,
  outsideWeight: 0.7,
  inRangeHeight: 0.04,
  inRangeWeight: 0.08,
  bmi: 0.1,
});
const RECOMMENDATION_SANITY_LIMITS = Object.freeze({
  heightMinCm: 80,
  heightMaxCm: 250,
  weightMinKg: 20,
  weightMaxKg: 300,
});

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

const normalizeMeasureNumber = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return Number.NaN;
  if (num <= 0) return Number.NaN;
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

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const getAxisProfile = (value, minValue, maxValue) => {
  const min = Number(minValue);
  const max = Number(maxValue);
  if (!Number.isFinite(min) || !Number.isFinite(max) || max < min) {
    return {
      inRange: false,
      center: Number.NaN,
      outsideRatio: Number.POSITIVE_INFINITY,
      inRangeEdgeRatio: 1,
    };
  }

  const span = Math.max(max - min, 1);
  const center = (min + max) / 2;
  const halfSpan = Math.max(span / 2, 0.5);

  if (value < min) {
    return {
      inRange: false,
      center,
      outsideRatio: (min - value) / span,
      inRangeEdgeRatio: 1,
    };
  }

  if (value > max) {
    return {
      inRange: false,
      center,
      outsideRatio: (value - max) / span,
      inRangeEdgeRatio: 1,
    };
  }

  return {
    inRange: true,
    center,
    outsideRatio: 0,
    inRangeEdgeRatio: clamp(Math.abs(value - center) / halfSpan, 0, 1),
  };
};

const estimateInterpolatedSizeIndex = (value, centers = []) => {
  if (!Number.isFinite(value) || centers.length === 0) return Number.NaN;
  if (centers.length === 1) return centers[0].index;

  const sorted = centers
    .slice()
    .filter((item) => Number.isFinite(item?.index) && Number.isFinite(item?.center))
    .sort((a, b) => a.center - b.center);

  if (sorted.length === 0) return Number.NaN;
  if (sorted.length === 1) return sorted[0].index;

  const interpolate = (left, right) => {
    const delta = right.center - left.center;
    if (delta === 0) return left.index;

    const ratio = (value - left.center) / delta;
    return left.index + (ratio * (right.index - left.index));
  };

  if (value <= sorted[0].center) {
    return interpolate(sorted[0], sorted[1]);
  }

  const last = sorted.length - 1;
  if (value >= sorted[last].center) {
    return interpolate(sorted[last - 1], sorted[last]);
  }

  for (let index = 0; index < last; index += 1) {
    const left = sorted[index];
    const right = sorted[index + 1];

    if (value >= left.center && value <= right.center) {
      return interpolate(left, right);
    }
  }

  return sorted[last].index;
};

const getBmi = (heightCm, weightKg) => {
  const heightM = heightCm / 100;
  if (!Number.isFinite(heightM) || heightM <= 0) return Number.NaN;
  return weightKg / (heightM * heightM);
};

const getBmiScore = (heightCm, weightKg, row = {}) => {
  const userBmi = getBmi(heightCm, weightKg);
  if (!Number.isFinite(userBmi)) return 1;

  const rowHeightCenter = (Number(row.heightMin) + Number(row.heightMax)) / 2;
  const rowWeightCenter = (Number(row.weightMin) + Number(row.weightMax)) / 2;
  const rowBmiCenter = getBmi(rowHeightCenter, rowWeightCenter);

  if (!Number.isFinite(rowBmiCenter) || rowBmiCenter <= 0) return 1;
  return Math.abs(userBmi - rowBmiCenter) / rowBmiCenter;
};

const computeRecommendationConfidence = ({ inRange, score }) => {
  if (!Number.isFinite(score)) return 0;

  if (inRange) {
    return clamp(0.95 - (score * 0.2), 0.65, 0.99);
  }

  return clamp(0.8 - (score * 0.15), 0.25, 0.79);
};

const getRecommendationBounds = (rows = []) => {
  const normalized = (Array.isArray(rows) ? rows : []).map((row) => ({
    heightMin: Number(row?.heightMin),
    heightMax: Number(row?.heightMax),
    weightMin: Number(row?.weightMin),
    weightMax: Number(row?.weightMax),
  })).filter((row) => (
    Number.isFinite(row.heightMin)
    && Number.isFinite(row.heightMax)
    && Number.isFinite(row.weightMin)
    && Number.isFinite(row.weightMax)
    && row.heightMax >= row.heightMin
    && row.weightMax >= row.weightMin
  ));

  if (normalized.length === 0) return null;

  const heightMin = Math.min(...normalized.map((row) => row.heightMin));
  const heightMax = Math.max(...normalized.map((row) => row.heightMax));
  const weightMin = Math.min(...normalized.map((row) => row.weightMin));
  const weightMax = Math.max(...normalized.map((row) => row.weightMax));

  return {
    heightMin,
    heightMax,
    weightMin,
    weightMax,
  };
};

const isOutsideHumanSanityRange = ({ heightCm, weightKg }) => {
  return (
    heightCm < RECOMMENDATION_SANITY_LIMITS.heightMinCm
    || heightCm > RECOMMENDATION_SANITY_LIMITS.heightMaxCm
    || weightKg < RECOMMENDATION_SANITY_LIMITS.weightMinKg
    || weightKg > RECOMMENDATION_SANITY_LIMITS.weightMaxKg
  );
};

const recommendSizeFromRows = ({ rows = [], heightCm, weightKg }) => {
  const normalizedHeight = normalizeMeasureNumber(heightCm);
  const normalizedWeight = normalizeMeasureNumber(weightKg);

  if (Number.isNaN(normalizedHeight) || Number.isNaN(normalizedWeight)) {
    return {
      error: 'Chiều cao và cân nặng phải là số lớn hơn 0.',
      errorCode: 'INVALID_INPUT',
      result: null,
      bounds: null,
    };
  }

  const bounds = getRecommendationBounds(rows);
  if (!bounds) {
    return {
      error: 'Không có dữ liệu bảng size hợp lệ để tư vấn.',
      errorCode: 'NO_SIZE_DATA',
      result: null,
      bounds: null,
    };
  }

  if (isOutsideHumanSanityRange({
    heightCm: normalizedHeight,
    weightKg: normalizedWeight,
  })) {
    return {
      error: `Thông số chưa hợp lý để tư vấn. Vui lòng nhập chiều cao trong khoảng ${RECOMMENDATION_SANITY_LIMITS.heightMinCm}-${RECOMMENDATION_SANITY_LIMITS.heightMaxCm} cm và cân nặng trong khoảng ${RECOMMENDATION_SANITY_LIMITS.weightMinKg}-${RECOMMENDATION_SANITY_LIMITS.weightMaxKg} kg.`,
      errorCode: 'OUT_OF_SUPPORTED_RANGE',
      result: null,
      bounds,
    };
  }

  const orderedRows = (Array.isArray(rows) ? rows : [])
    .filter((row) => SIZE_ORDER.has(String(row?.sizeLabel || '').toUpperCase()))
    .slice()
    .sort((a, b) => {
      const indexA = SIZE_ORDER.get(String(a?.sizeLabel || '').toUpperCase()) ?? Number.MAX_SAFE_INTEGER;
      const indexB = SIZE_ORDER.get(String(b?.sizeLabel || '').toUpperCase()) ?? Number.MAX_SAFE_INTEGER;
      return indexA - indexB;
    });

  if (orderedRows.length === 0) {
    return {
      error: 'Không có dữ liệu size hợp lệ để tư vấn.',
      errorCode: 'NO_SIZE_DATA',
      result: null,
      bounds,
    };
  }

  const heightCenters = orderedRows.map((row) => ({
    index: SIZE_ORDER.get(String(row?.sizeLabel || '').toUpperCase()),
    center: (Number(row?.heightMin) + Number(row?.heightMax)) / 2,
  }));
  const weightCenters = orderedRows.map((row) => ({
    index: SIZE_ORDER.get(String(row?.sizeLabel || '').toUpperCase()),
    center: (Number(row?.weightMin) + Number(row?.weightMax)) / 2,
  }));

  const estimatedHeightIndex = estimateInterpolatedSizeIndex(normalizedHeight, heightCenters);
  const estimatedWeightIndex = estimateInterpolatedSizeIndex(normalizedWeight, weightCenters);
  const blendedSizeIndex = (
    (estimatedHeightIndex * RECOMMENDATION_INDEX_WEIGHTS.height)
    + (estimatedWeightIndex * RECOMMENDATION_INDEX_WEIGHTS.weight)
  );

  const candidates = orderedRows.map((row) => {
    const rowIndex = SIZE_ORDER.get(String(row?.sizeLabel || '').toUpperCase()) ?? Number.MAX_SAFE_INTEGER;
    const heightAxis = getAxisProfile(normalizedHeight, row.heightMin, row.heightMax);
    const weightAxis = getAxisProfile(normalizedWeight, row.weightMin, row.weightMax);
    const bmiScore = getBmiScore(normalizedHeight, normalizedWeight, row);

    const indexGap = Math.abs(rowIndex - blendedSizeIndex);
    const outsidePenalty = (
      (heightAxis.outsideRatio * RECOMMENDATION_SCORE_WEIGHTS.outsideHeight)
      + (weightAxis.outsideRatio * RECOMMENDATION_SCORE_WEIGHTS.outsideWeight)
    );
    const inRangePenalty = (
      (heightAxis.inRange ? heightAxis.inRangeEdgeRatio * RECOMMENDATION_SCORE_WEIGHTS.inRangeHeight : 0)
      + (weightAxis.inRange ? weightAxis.inRangeEdgeRatio * RECOMMENDATION_SCORE_WEIGHTS.inRangeWeight : 0)
    );
    const totalScore = (
      (indexGap * RECOMMENDATION_SCORE_WEIGHTS.indexGap)
      + outsidePenalty
      + inRangePenalty
      + (bmiScore * RECOMMENDATION_SCORE_WEIGHTS.bmi)
    );

    return {
      row,
      rowIndex,
      inRange: heightAxis.inRange && weightAxis.inRange,
      score: totalScore,
    };
  });

  if (candidates.length === 0) {
    return {
      error: null,
      errorCode: null,
      result: null,
      bounds,
    };
  }

  candidates.sort((a, b) => {
    if (a.inRange !== b.inRange) {
      return a.inRange ? -1 : 1;
    }

    if (a.score !== b.score) {
      return a.score - b.score;
    }

    return a.rowIndex - b.rowIndex;
  });

  const best = candidates[0];
  return {
    error: null,
    errorCode: null,
    result: {
      recommendedRow: best.row,
      recommendedSize: best.row?.sizeLabel || null,
      matchType: best.inRange ? 'in-range' : 'nearest',
      score: best.score,
      confidence: computeRecommendationConfidence(best),
    },
    bounds,
  };
};

const recommendSizeForProduct = async ({
  productId,
  gender = '',
  heightCm,
  weightKg,
}) => {
  const resolved = await resolveSizeGuideForProduct({ productId, gender });
  const recommendation = recommendSizeFromRows({
    rows: resolved.rows,
    heightCm,
    weightKg,
  });

  return {
    source: resolved.source,
    rows: resolved.rows,
    ...recommendation,
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
  recommendSizeForProduct,
  recommendSizeFromRows,
  resolveSizeGuideForProduct,
  toClientRow,
  validateAndNormalizeRows,
};
