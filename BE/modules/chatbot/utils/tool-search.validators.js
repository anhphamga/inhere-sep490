const ChatbotError = require('./chatbotError');
const { sanitizeText } = require('./sanitize');
const { getToolSearchConfig, toNumber } = require('./tool-search.config');

const ensureIsoDate = (value, fieldName) => {
  if (!value) {
    return null;
  }

  const normalized = sanitizeText(value);
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    throw new ChatbotError(`${fieldName} must be a valid date`, {
      statusCode: 400,
      code: 'INVALID_TOOL_SEARCH_FILTER',
      details: { fieldName, value },
    });
  }

  return parsed;
};

const validateToolSearchPayload = (payload = {}) => {
  const config = getToolSearchConfig();

  const entity = sanitizeText(payload.entity).toLowerCase();
  const query = sanitizeText(payload.query);

  if (!entity || !config.allowedEntities.includes(entity)) {
    throw new ChatbotError('entity must be one of allowed values', {
      statusCode: 400,
      code: 'INVALID_TOOL_SEARCH_ENTITY',
      details: { entity, allowedEntities: config.allowedEntities },
    });
  }

  if (!query) {
    throw new ChatbotError('query is required', {
      statusCode: 400,
      code: 'INVALID_TOOL_SEARCH_QUERY',
    });
  }

  if (query.length > config.maxQueryLength) {
    throw new ChatbotError(`query exceeds max length (${config.maxQueryLength})`, {
      statusCode: 400,
      code: 'TOOL_SEARCH_QUERY_TOO_LONG',
    });
  }

  const filters = typeof payload.filters === 'object' && payload.filters !== null
    ? payload.filters
    : {};

  const page = Math.max(toNumber(filters.page, config.defaultPage), 1);
  const limit = Math.min(Math.max(toNumber(filters.limit, config.defaultLimit), 1), config.maxLimit);
  const status = sanitizeText(filters.status);
  const orderType = sanitizeText(filters.orderType).toLowerCase();
  const sortBy = sanitizeText(filters.sortBy).toLowerCase();
  const sortOrder = sanitizeText(filters.sortOrder).toLowerCase();
  const category = sanitizeText(filters.category);
  const size = sanitizeText(filters.size);
  const color = sanitizeText(filters.color);
  const inStockRaw = filters.inStock;
  const priceMin = filters.priceMin === undefined || filters.priceMin === null || filters.priceMin === ''
    ? null
    : toNumber(filters.priceMin, Number.NaN);
  const priceMax = filters.priceMax === undefined || filters.priceMax === null || filters.priceMax === ''
    ? null
    : toNumber(filters.priceMax, Number.NaN);
  const dateFrom = ensureIsoDate(filters.dateFrom, 'filters.dateFrom');
  const dateTo = ensureIsoDate(filters.dateTo, 'filters.dateTo');

  if (orderType && !['rent', 'sale', 'all'].includes(orderType)) {
    throw new ChatbotError('filters.orderType must be rent, sale or all', {
      statusCode: 400,
      code: 'INVALID_TOOL_SEARCH_FILTER',
      details: {
        fieldName: 'filters.orderType',
        value: orderType,
      },
    });
  }

  if (dateFrom && dateTo && dateFrom > dateTo) {
    throw new ChatbotError('filters.dateFrom must be earlier than or equal to filters.dateTo', {
      statusCode: 400,
      code: 'INVALID_TOOL_SEARCH_DATE_RANGE',
    });
  }

  if (sortBy && !['price', 'createdat', 'name'].includes(sortBy)) {
    throw new ChatbotError('filters.sortBy must be price, createdAt or name', {
      statusCode: 400,
      code: 'INVALID_TOOL_SEARCH_FILTER',
      details: {
        fieldName: 'filters.sortBy',
        value: sortBy,
      },
    });
  }

  if (sortOrder && !['asc', 'desc'].includes(sortOrder)) {
    throw new ChatbotError('filters.sortOrder must be asc or desc', {
      statusCode: 400,
      code: 'INVALID_TOOL_SEARCH_FILTER',
      details: {
        fieldName: 'filters.sortOrder',
        value: sortOrder,
      },
    });
  }

  if (priceMin !== null && !Number.isFinite(priceMin)) {
    throw new ChatbotError('filters.priceMin must be a valid number', {
      statusCode: 400,
      code: 'INVALID_TOOL_SEARCH_FILTER',
      details: {
        fieldName: 'filters.priceMin',
        value: filters.priceMin,
      },
    });
  }

  if (priceMax !== null && !Number.isFinite(priceMax)) {
    throw new ChatbotError('filters.priceMax must be a valid number', {
      statusCode: 400,
      code: 'INVALID_TOOL_SEARCH_FILTER',
      details: {
        fieldName: 'filters.priceMax',
        value: filters.priceMax,
      },
    });
  }

  if (priceMin !== null && priceMax !== null && priceMin > priceMax) {
    throw new ChatbotError('filters.priceMin must be less than or equal to filters.priceMax', {
      statusCode: 400,
      code: 'INVALID_TOOL_SEARCH_FILTER',
    });
  }

  let inStock = null;
  if (inStockRaw !== undefined && inStockRaw !== null && inStockRaw !== '') {
    if (typeof inStockRaw === 'boolean') {
      inStock = inStockRaw;
    } else {
      const normalizedStock = sanitizeText(inStockRaw).toLowerCase();
      if (['true', '1', 'yes', 'con', 'available', 'instock'].includes(normalizedStock)) {
        inStock = true;
      } else if (['false', '0', 'no', 'het', 'out', 'outofstock'].includes(normalizedStock)) {
        inStock = false;
      } else {
        throw new ChatbotError('filters.inStock must be a boolean-like value', {
          statusCode: 400,
          code: 'INVALID_TOOL_SEARCH_FILTER',
          details: {
            fieldName: 'filters.inStock',
            value: inStockRaw,
          },
        });
      }
    }
  }

  const requestId = sanitizeText(payload.requestId || '');
  if (requestId.length > config.maxRequestIdLength) {
    throw new ChatbotError(`requestId exceeds max length (${config.maxRequestIdLength})`, {
      statusCode: 400,
      code: 'TOOL_SEARCH_REQUEST_ID_TOO_LONG',
    });
  }

  return {
    entity,
    query,
    filters: {
      status: status || null,
      orderType: orderType || null,
      sortBy: sortBy ? (sortBy === 'createdat' ? 'createdAt' : sortBy) : null,
      sortOrder: sortOrder || null,
      category: category || null,
      size: size || null,
      color: color || null,
      inStock,
      priceMin,
      priceMax,
      dateFrom,
      dateTo,
      page,
      limit,
    },
    requestId,
  };
};

module.exports = {
  validateToolSearchPayload,
};
