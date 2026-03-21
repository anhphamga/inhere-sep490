const { requestWithRetry } = require('../utils/httpClient');
const ChatbotError = require('../utils/chatbotError');
const { searchToolData } = require('./tool-search.service');

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const callToolSearchApiByHttp = async ({ payload, actor, requestId }) => {
  const endpoint = process.env.CHATBOT_TOOL_SEARCH_ENDPOINT;
  const token = actor?.token || '';

  if (!endpoint) {
    throw new ChatbotError('CHATBOT_TOOL_SEARCH_ENDPOINT is missing for HTTP tool call', {
      statusCode: 500,
      code: 'TOOL_API_ENDPOINT_MISSING',
    });
  }

  const response = await requestWithRetry({
    url: endpoint,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
    timeoutMs: toNumber(process.env.CHATBOT_TOOL_API_TIMEOUT_MS, 12000),
    maxRetries: toNumber(process.env.CHATBOT_MAX_RETRIES, 3),
    baseDelayMs: toNumber(process.env.CHATBOT_RETRY_BASE_DELAY_MS, 800),
    requestName: `chatbot-tool-search-${requestId}`,
  });

  if (!response?.success) {
    throw new ChatbotError('Tool API returned non-success response', {
      statusCode: 502,
      code: 'TOOL_API_BAD_RESPONSE',
      details: {
        requestId,
      },
    });
  }

  return response.data;
};

const callToolSearch = async ({ payload, actor, requestId }) => {
  const mode = String(process.env.CHATBOT_TOOL_API_MODE || 'internal').toLowerCase();

  if (mode === 'http') {
    return callToolSearchApiByHttp({ payload, actor, requestId });
  }

  return searchToolData({
    entity: payload.entity,
    query: payload.query,
    filters: payload.filters,
    actor,
  });
};

module.exports = {
  callToolSearch,
};
