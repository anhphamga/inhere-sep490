const crypto = require('crypto');
const ChatbotError = require('../utils/chatbotError');
const logger = require('../utils/logger');
const { chatWithTools } = require('../services/chatbot.toolflow.service');

const chat = async (req, res) => {
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();

  try {
    logger.info('Tool-aware chat request received', {
      requestId,
      actorId: req.user?.id || null,
      actorRole: req.user?.role || null,
      bodyKeys: Object.keys(req.body || {}),
    });

    const data = await chatWithTools({
      payload: req.body || {},
      actor: req.user || {},
      requestId,
    });

    logger.info('Tool-aware chat request completed', {
      requestId,
      intent: data.intent,
      hasToolData: Boolean(data.toolData),
      latencyMs: Date.now() - startedAt,
    });

    return res.status(200).json({
      requestId,
      success: true,
      data,
    });
  } catch (error) {
    const statusCode = error instanceof ChatbotError ? error.statusCode : 500;

    logger.error('Tool-aware chat request failed', {
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
        code: error.code || 'CHATBOT_TOOLFLOW_FAILED',
        message: error.message || 'Tool-aware chat request failed',
      },
    });
  }
};

module.exports = {
  chat,
};
