const crypto = require('crypto');
const ChatbotError = require('../utils/chatbotError');
const logger = require('../utils/logger');
const { validateToolSearchPayload } = require('../utils/tool-search.validators');
const { searchToolData } = require('../services/tool-search.service');

const search = async (req, res) => {
  const startedAt = Date.now();
  const fallbackRequestId = crypto.randomUUID();

  try {
    const validated = validateToolSearchPayload(req.body || {});
    const requestId = validated.requestId || fallbackRequestId;

    logger.info('Tool search request received', {
      requestId,
      entity: validated.entity,
      query: validated.query,
      actorId: req.user?.id || null,
      actorRole: req.user?.role || null,
      page: validated.filters.page,
      limit: validated.filters.limit,
    });

    const data = await searchToolData({
      entity: validated.entity,
      query: validated.query,
      filters: validated.filters,
      actor: req.user,
    });

    logger.info('Tool search request completed', {
      requestId,
      entity: validated.entity,
      query: validated.query,
      recordsReturned: data.records.length,
      totalRecords: data.total,
      latencyMs: Date.now() - startedAt,
    });

    return res.status(200).json({
      requestId,
      success: true,
      data,
    });
  } catch (error) {
    const statusCode = error instanceof ChatbotError ? error.statusCode : 500;
    const requestId = (req.body && req.body.requestId) || fallbackRequestId;

    logger.error('Tool search request failed', {
      requestId,
      statusCode,
      message: error.message,
      details: error.details,
      latencyMs: Date.now() - startedAt,
    });

    return res.status(statusCode).json({
      requestId,
      success: false,
      error: {
        code: error.code || 'CHATBOT_TOOL_SEARCH_FAILED',
        message: error.message || 'Tool search request failed',
      },
    });
  }
};

module.exports = {
  search,
};
