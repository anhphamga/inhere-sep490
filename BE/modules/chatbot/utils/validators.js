const ChatbotError = require('./chatbotError');
const { sanitizeText } = require('./sanitize');

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getChatConfig = () => {
  return {
    maxMessageLength: toNumber(process.env.CHATBOT_MAX_MESSAGE_LENGTH, 4000),
    defaultTopK: toNumber(process.env.CHATBOT_DEFAULT_TOP_K, 4),
    maxTopK: toNumber(process.env.CHATBOT_MAX_TOP_K, 8),
    maxIngestTextLength: toNumber(process.env.CHATBOT_MAX_INGEST_TEXT_LENGTH, 50000),
  };
};

const validateChatInput = (payload = {}) => {
  const { maxMessageLength, defaultTopK, maxTopK } = getChatConfig();
  const message = sanitizeText(payload.message);

  if (!message) {
    throw new ChatbotError('Message is required', {
      statusCode: 400,
      code: 'INVALID_MESSAGE',
    });
  }

  if (message.length > maxMessageLength) {
    throw new ChatbotError(`Message exceeds max length (${maxMessageLength})`, {
      statusCode: 400,
      code: 'MESSAGE_TOO_LONG',
    });
  }

  const topK = Math.min(Math.max(toNumber(payload.topK, defaultTopK), 1), maxTopK);

  return {
    message,
    topK,
  };
};

const normalizeDocumentsInput = (payload = {}) => {
  const { maxIngestTextLength } = getChatConfig();

  const docs = [];

  if (payload.text) {
    docs.push({
      id: payload.id,
      text: payload.text,
      metadata: payload.metadata,
    });
  }

  if (Array.isArray(payload.documents)) {
    payload.documents.forEach((doc) => {
      docs.push(doc);
    });
  }

  const normalized = docs
    .map((doc, index) => {
      const text = sanitizeText(doc?.text);
      return {
        id: sanitizeText(doc?.id) || `doc-${Date.now()}-${index}`,
        text,
        metadata: typeof doc?.metadata === 'object' && doc.metadata !== null ? doc.metadata : {},
      };
    })
    .filter((doc) => doc.text.length > 0);

  if (normalized.length === 0) {
    throw new ChatbotError('At least one non-empty document text is required', {
      statusCode: 400,
      code: 'INVALID_INGEST_INPUT',
    });
  }

  normalized.forEach((doc) => {
    if (doc.text.length > maxIngestTextLength) {
      throw new ChatbotError(`Ingest text exceeds max length (${maxIngestTextLength})`, {
        statusCode: 400,
        code: 'INGEST_TEXT_TOO_LONG',
      });
    }
  });

  return normalized;
};

module.exports = {
  validateChatInput,
  normalizeDocumentsInput,
  getChatConfig,
};
