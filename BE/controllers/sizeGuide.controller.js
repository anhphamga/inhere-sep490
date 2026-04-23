const {
  ensureProductExists,
  getGlobalRows,
  getProductRows,
  normalizeGender,
  replaceGlobalRows,
  replaceProductRows,
  recommendSizeForProduct,
  resolveSizeGuideForProduct,
  validateAndNormalizeRows,
} = require('../services/sizeGuide.service');

const getProductSizeGuide = async (req, res) => {
  try {
    const { id } = req.params;
    const gender = normalizeGender(req.query.gender);

    const exists = await ensureProductExists(id);
    if (!exists) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    const result = await resolveSizeGuideForProduct({ productId: id, gender });

    return res.status(200).json({
      success: true,
      data: {
        productId: id,
        gender: gender || null,
        source: result.source,
        rows: result.rows,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error getting size guide',
      error: error.message,
    });
  }
};

const getProductSizeRecommendation = async (req, res) => {
  try {
    const { id } = req.params;
    const rawGender = String(req.query.gender || '').trim();
    const gender = normalizeGender(rawGender);
    const heightCm = Number(req.query.heightCm ?? req.query.height);
    const weightKg = Number(req.query.weightKg ?? req.query.weight ?? req.query.kg);

    const exists = await ensureProductExists(id);
    if (!exists) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    if (rawGender && !gender) {
      return res.status(400).json({
        success: false,
        message: 'gender must be male or female when provided',
      });
    }

    if (!Number.isFinite(heightCm) || heightCm <= 0 || !Number.isFinite(weightKg) || weightKg <= 0) {
      return res.status(400).json({
        success: false,
        message: 'heightCm and weightKg must be numbers > 0',
      });
    }

    const recommendation = await recommendSizeForProduct({
      productId: id,
      gender,
      heightCm,
      weightKg,
    });

    if (recommendation.error) {
      const status = recommendation.errorCode === 'OUT_OF_SUPPORTED_RANGE' ? 422 : 400;
      return res.status(status).json({
        success: false,
        message: recommendation.error,
        data: {
          bounds: recommendation.bounds || null,
          code: recommendation.errorCode || 'INVALID_REQUEST',
        },
      });
    }

    if (!recommendation.result || !recommendation.result.recommendedRow) {
      return res.status(404).json({
        success: false,
        message: 'No size guide data available for recommendation',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        productId: id,
        source: recommendation.source,
        gender: recommendation.result.recommendedRow.gender || null,
        input: {
          heightCm,
          weightKg,
        },
        recommendedSize: recommendation.result.recommendedSize,
        matchType: recommendation.result.matchType,
        confidence: recommendation.result.confidence,
        score: recommendation.result.score,
        row: recommendation.result.recommendedRow,
        bounds: recommendation.bounds || null,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error getting size recommendation',
      error: error.message,
    });
  }
};

const getOwnerGlobalSizeGuide = async (req, res) => {
  try {
    const gender = normalizeGender(req.query.gender);
    const rows = await getGlobalRows(gender);

    return res.status(200).json({
      success: true,
      data: {
        gender: gender || null,
        rows,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error getting global size guide',
      error: error.message,
    });
  }
};

const upsertOwnerGlobalSizeGuide = async (req, res) => {
  try {
    const { error, rows } = validateAndNormalizeRows(req.body.rows);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error,
      });
    }

    const updatedRows = await replaceGlobalRows(rows);
    return res.status(200).json({
      success: true,
      message: 'Global size guide updated',
      data: {
        rows: updatedRows,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error updating global size guide',
      error: error.message,
    });
  }
};

const deleteOwnerGlobalSizeGuide = async (req, res) => {
  try {
    await replaceGlobalRows([]);

    return res.status(200).json({
      success: true,
      message: 'Global size guide deleted',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error deleting global size guide',
      error: error.message,
    });
  }
};

const getOwnerProductSizeGuide = async (req, res) => {
  try {
    const { id } = req.params;
    const gender = normalizeGender(req.query.gender);

    const exists = await ensureProductExists(id);
    if (!exists) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    const [productRows, globalRows, effective] = await Promise.all([
      getProductRows(id, gender),
      getGlobalRows(gender),
      resolveSizeGuideForProduct({ productId: id, gender }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        productId: id,
        gender: gender || null,
        hasOverride: productRows.length > 0,
        source: effective.source,
        productRows,
        globalRows,
        rows: effective.rows,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error getting owner product size guide',
      error: error.message,
    });
  }
};

const upsertOwnerProductSizeGuide = async (req, res) => {
  try {
    const { id } = req.params;
    const mode = String(req.body.mode || '').trim().toLowerCase();

    const exists = await ensureProductExists(id);
    if (!exists) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    if (mode === 'global') {
      await replaceProductRows(id, []);
      const effective = await resolveSizeGuideForProduct({ productId: id });

      return res.status(200).json({
        success: true,
        message: 'Product size guide switched to global',
        data: {
          productId: id,
          mode: 'global',
          source: effective.source,
          rows: effective.rows,
        },
      });
    }

    if (mode !== 'product') {
      return res.status(400).json({
        success: false,
        message: 'mode must be global or product',
      });
    }

    const { error, rows } = validateAndNormalizeRows(req.body.rows);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error,
      });
    }

    const updatedRows = await replaceProductRows(id, rows);

    return res.status(200).json({
      success: true,
      message: 'Product size guide updated',
      data: {
        productId: id,
        mode: 'product',
        source: 'product',
        rows: updatedRows,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error updating product size guide',
      error: error.message,
    });
  }
};

const deleteOwnerProductSizeGuide = async (req, res) => {
  try {
    const { id } = req.params;

    const exists = await ensureProductExists(id);
    if (!exists) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    await replaceProductRows(id, []);
    const effective = await resolveSizeGuideForProduct({ productId: id });

    return res.status(200).json({
      success: true,
      message: 'Product size guide override deleted',
      data: {
        productId: id,
        mode: 'global',
        source: effective.source,
        rows: effective.rows,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error deleting product size guide',
      error: error.message,
    });
  }
};

module.exports = {
  deleteOwnerGlobalSizeGuide,
  deleteOwnerProductSizeGuide,
  getOwnerGlobalSizeGuide,
  getOwnerProductSizeGuide,
  getProductSizeRecommendation,
  getProductSizeGuide,
  upsertOwnerGlobalSizeGuide,
  upsertOwnerProductSizeGuide,
};
