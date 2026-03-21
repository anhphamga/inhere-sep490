const crypto = require('crypto');
const chatbotService = require('../services/chatbot.service');
const ChatbotError = require('../utils/chatbotError');
const logger = require('../utils/logger');
const { sanitizeText } = require('../utils/sanitize');

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const ingestFromRequest = (req) => {
  const payload = {
    ...req.body,
  };

  if (req.file && req.file.buffer) {
    const fileText = req.file.buffer.toString('utf8');
    payload.documents = [
      {
        id: sanitizeText(req.file.originalname) || `file-${Date.now()}`,
        text: fileText,
        metadata: {
          source: 'upload',
          filename: sanitizeText(req.file.originalname),
          mimetype: sanitizeText(req.file.mimetype),
          size: req.file.size,
        },
      },
    ];
  }

  return payload;
};

const chat = async (req, res) => {
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();

  try {
    logger.info('Chat request received', {
      requestId,
      bodyKeys: Object.keys(req.body || {}),
    });

    const data = await chatbotService.chat(req.body || {});

    logger.info('Chat request completed', {
      requestId,
      latencyMs: Date.now() - startedAt,
    });

    return res.status(200).json({
      requestId,
      success: true,
      data,
    });
  } catch (error) {
    const statusCode = error instanceof ChatbotError ? error.statusCode : 500;

    logger.error('Chat request failed', {
      requestId,
      statusCode,
      message: error.message,
      details: error.details,
    });

    return res.status(statusCode).json({
      requestId,
      success: false,
      error: {
        code: error.code || 'CHATBOT_CHAT_FAILED',
        message: error.message || 'Chatbot request failed',
      },
    });
  }
};

const ingest = async (req, res) => {
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();

  try {
    logger.info('Ingest request received', {
      requestId,
      hasFile: Boolean(req.file),
      bodyKeys: Object.keys(req.body || {}),
    });

    if (req.file && req.file.size > toNumber(process.env.CHATBOT_INGEST_MAX_FILE_SIZE_MB, 2) * 1024 * 1024) {
      throw new ChatbotError('Uploaded file is too large', {
        statusCode: 400,
        code: 'FILE_TOO_LARGE',
      });
    }

    const payload = ingestFromRequest(req);
    const data = await chatbotService.ingest(payload);

    logger.info('Ingest request completed', {
      requestId,
      latencyMs: Date.now() - startedAt,
      documentsInserted: data.documentsInserted,
      chunksInserted: data.chunksInserted,
    });

    return res.status(200).json({
      requestId,
      success: true,
      data,
    });
  } catch (error) {
    const statusCode = error instanceof ChatbotError ? error.statusCode : 500;

    logger.error('Ingest request failed', {
      requestId,
      statusCode,
      message: error.message,
      details: error.details,
    });

    return res.status(statusCode).json({
      requestId,
      success: false,
      error: {
        code: error.code || 'CHATBOT_INGEST_FAILED',
        message: error.message || 'Ingest request failed',
      },
    });
  }
};

module.exports = {
  chat,
  ingest,
};
