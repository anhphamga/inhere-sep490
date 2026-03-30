const { requestWithRetry } = require('../utils/httpClient');
const ChatbotError = require('../utils/chatbotError');
const { getChatConfig } = require('../utils/validators');

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const averageTokenEmbeddings = (value) => {
  if (!Array.isArray(value)) {
    throw new ChatbotError('Invalid embedding response shape', {
      statusCode: 502,
      code: 'INVALID_EMBEDDING_RESPONSE',
    });
  }

  if (value.length === 0) {
    return [];
  }

  if (typeof value[0] === 'number') {
    return value;
  }

  const dims = value[0]?.length || 0;
  if (dims === 0) {
    return [];
  }

  const pooled = new Array(dims).fill(0);

  value.forEach((tokenVec) => {
    for (let i = 0; i < dims; i += 1) {
      pooled[i] += Number(tokenVec[i] || 0);
    }
  });

  return pooled.map((v) => v / value.length);
};

const embedText = async (text) => {
  const provider = (process.env.CHATBOT_EMBEDDING_PROVIDER || 'huggingface').toLowerCase();

  if (provider !== 'huggingface') {
    throw new ChatbotError('Unsupported embedding provider', {
      statusCode: 500,
      code: 'UNSUPPORTED_EMBEDDING_PROVIDER',
      details: { provider },
    });
  }

  const hfApiKey = process.env.HF_API_KEY;
  const hfModel = process.env.HF_EMBEDDING_MODEL || 'sentence-transformers/all-MiniLM-L6-v2';

  if (!hfApiKey) {
    throw new ChatbotError('HF_API_KEY is missing', {
      statusCode: 500,
      code: 'EMBEDDING_CONFIG_MISSING',
    });
  }

  const timeoutMs = toNumber(process.env.CHATBOT_EMBEDDING_TIMEOUT_MS, 15000);
  const maxRetries = toNumber(process.env.CHATBOT_MAX_RETRIES, 3);
  const baseDelayMs = toNumber(process.env.CHATBOT_RETRY_BASE_DELAY_MS, 800);

  const payload = await requestWithRetry({
    url: `https://api-inference.huggingface.co/pipeline/feature-extraction/${encodeURIComponent(hfModel)}`,
    method: 'POST',
    headers: {
      Authorization: `Bearer ${hfApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: text,
      options: { wait_for_model: true },
    }),
    timeoutMs,
    maxRetries,
    baseDelayMs,
    requestName: 'huggingface-embedding',
  });

  const embedding = averageTokenEmbeddings(payload);

  if (!embedding.length) {
    throw new ChatbotError('Embedding result is empty', {
      statusCode: 502,
      code: 'EMPTY_EMBEDDING',
    });
  }

  const { maxMessageLength } = getChatConfig();
  if (text.length > maxMessageLength * 20) {
    throw new ChatbotError('Input for embedding is too large', {
      statusCode: 400,
      code: 'EMBEDDING_INPUT_TOO_LARGE',
    });
  }

  return embedding;
};

module.exports = {
  embedText,
};
