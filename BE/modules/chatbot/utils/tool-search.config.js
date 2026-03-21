const { sanitizeText } = require('./sanitize');

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toList = (value, fallback = []) => {
  if (typeof value !== 'string') {
    return fallback;
  }

  const normalized = value
    .split(',')
    .map((item) => sanitizeText(item).toLowerCase())
    .filter(Boolean);

  return normalized.length > 0 ? normalized : fallback;
};

const toStatusList = (value, fallback = []) => {
  if (typeof value !== 'string') {
    return fallback;
  }

  const normalized = value
    .split(',')
    .map((item) => sanitizeText(item))
    .filter(Boolean);

  return normalized.length > 0 ? normalized : fallback;
};

const getToolSearchConfig = () => {
  return {
    defaultPage: Math.max(toNumber(process.env.CHATBOT_TOOL_DEFAULT_PAGE, 1), 1),
    defaultLimit: Math.max(toNumber(process.env.CHATBOT_TOOL_DEFAULT_LIMIT, 10), 1),
    maxLimit: Math.max(toNumber(process.env.CHATBOT_TOOL_MAX_LIMIT, 20), 1),
    maxQueryLength: Math.max(toNumber(process.env.CHATBOT_TOOL_MAX_QUERY_LENGTH, 200), 10),
    maxRequestIdLength: Math.max(toNumber(process.env.CHATBOT_TOOL_MAX_REQUEST_ID_LENGTH, 120), 20),
    allowedEntities: toList(process.env.CHATBOT_TOOL_ALLOWED_ENTITIES, ['user', 'order', 'product']),
    allowedRoles: toList(process.env.CHATBOT_TOOL_ALLOWED_ROLES, ['owner', 'staff', 'customer']),
    userSearchFields: toList(
      process.env.CHATBOT_TOOL_USER_SEARCH_FIELDS,
      ['name', 'email', 'phone', '_id']
    ),
    userOutputFields: toList(
      process.env.CHATBOT_TOOL_USER_OUTPUT_FIELDS,
      ['_id', 'name', 'email', 'phone', 'role', 'status', 'createdat', 'updatedat']
    ),
    userAllowedStatus: toStatusList(process.env.CHATBOT_TOOL_USER_ALLOWED_STATUS, ['active', 'locked']),
    orderSearchFields: toList(
      process.env.CHATBOT_TOOL_ORDER_SEARCH_FIELDS,
      ['_id', 'status', 'shippingphone', 'guestemail']
    ),
    orderOutputFields: toList(
      process.env.CHATBOT_TOOL_ORDER_OUTPUT_FIELDS,
      ['_id', 'status', 'totalamount', 'createdat', 'updatedat', 'paymentmethod', 'ordertype']
    ),
    orderAllowedStatus: toStatusList(process.env.CHATBOT_TOOL_ORDER_ALLOWED_STATUS, []),
    intentUserKeywords: toList(
      process.env.CHATBOT_TOOL_INTENT_USER_KEYWORDS,
      ['user', 'customer', 'khach hang', 'nguoi dung', 'email', 'sdt', 'so dien thoai']
    ),
    intentOrderKeywords: toList(
      process.env.CHATBOT_TOOL_INTENT_ORDER_KEYWORDS,
      ['order', 'don hang', 'ma don', 'trang thai don', 'thanh toan', 'van chuyen']
    ),
    intentProductKeywords: toList(
      process.env.CHATBOT_TOOL_INTENT_PRODUCT_KEYWORDS,
      [
        'san pham',
        'goi y',
        'mua',
        'co san pham nao',
        'xem san pham',
        'co gi re',
        're khong',
        'trang phuc',
        'ao dai',
        'do mac',
        'outfit',
        'on khong',
        'on ko',
      ]
    ),
  };
};

module.exports = {
  getToolSearchConfig,
  toNumber,
};
