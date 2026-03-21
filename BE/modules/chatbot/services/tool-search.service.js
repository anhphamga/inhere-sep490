const ChatbotError = require('../utils/chatbotError');
const { getToolSearchConfig } = require('../utils/tool-search.config');
const { searchUserService } = require('./tool-search/search-user.service');
const { searchOrderService } = require('./tool-search/search-order.service');
const { searchProductService } = require('./tool-search/search-product.service');

const ensureActorCanSearch = ({ actor }) => {
  const config = getToolSearchConfig();
  const role = String(actor?.role || '').toLowerCase();

  if (!actor?.id || !role) {
    throw new ChatbotError('Unauthorized', {
      statusCode: 401,
      code: 'UNAUTHORIZED_TOOL_SEARCH',
    });
  }

  if (!config.allowedRoles.includes(role)) {
    throw new ChatbotError('Forbidden', {
      statusCode: 403,
      code: 'FORBIDDEN_TOOL_SEARCH',
      details: {
        role,
        allowedRoles: config.allowedRoles,
      },
    });
  }
};

const searchToolData = async ({ entity, query, filters, actor }) => {
  ensureActorCanSearch({ actor });

  if (entity === 'user') {
    return searchUserService({ query, filters, actor });
  }

  if (entity === 'order') {
    return searchOrderService({ query, filters, actor });
  }

  if (entity === 'product') {
    return searchProductService({ query, filters, actor });
  }

  throw new ChatbotError('Unsupported entity for tool search', {
    statusCode: 400,
    code: 'UNSUPPORTED_TOOL_SEARCH_ENTITY',
    details: { entity },
  });
};

module.exports = {
  searchToolData,
};
