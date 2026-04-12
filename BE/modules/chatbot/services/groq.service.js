const { requestWithRetry } = require('../utils/httpClient');
const ChatbotError = require('../utils/chatbotError');

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const sanitizeAnswer = (value) => {
  return String(value || '')
    .replace(/\/api\/[\w\-/:]+/gi, 'API nội bộ')
    .replace(/\/(cart|rental|buy|owner|auth|users|orders|products|categories|alerts|virtual-try-on)[\w\-/:]*/gi, 'trang phù hợp')
    .replace(/\b(backend|database|endpoint|api)\b/gi, 'hệ thống')
    .replace(/\s{2,}/g, ' ')
    .trim();
};

const buildSystemPrompt = (contextBlocks) => {
  const contextText = contextBlocks.length > 0
    ? contextBlocks.map((block, index) => `(${index + 1}) ${block}`).join('\n')
    : 'Không có ngữ cảnh phù hợp trong kho tri thức.';

  return [
    'Bạn là chatbot hỗ trợ khách hàng của INHERE.',
    'Nguyên tắc:',
    '- Luôn trả lời bằng tiếng Việt có dấu.',
    '- Văn phong thân thiện, tự nhiên như nhân viên hỗ trợ.',
    '- Nếu câu hỏi liên quan đến chính sách (mất đồ, hư hỏng, trễ hạn...), hãy trả lời dựa trên knowledge, KHÔNG tìm sản phẩm.',
    '- Không bao giờ trả lời "Không tìm thấy sản phẩm phù hợp" nếu câu hỏi không liên quan đến sản phẩm.',
    '- Nếu không chắc, hãy trả lời theo hướng hỗ trợ chung, không được từ chối thô.',
    'Ưu tiên:',
    '1. Trả lời đúng câu hỏi.',
    '2. Rõ ràng, dễ hiểu.',
    '3. Có hướng dẫn cụ thể cho người dùng.',
    'Ràng buộc thêm:',
    '- Chỉ trả lời dựa trên ngữ cảnh được cung cấp.',
    '- Không nhắc đến API, endpoint, backend, database hay hệ thống nội bộ.',
    '- Nếu thiếu ngữ cảnh, trả lời đúng câu: "Tôi không tìm thấy thông tin phù hợp."',
    '- Trả lời ngắn gọn, tối đa 3 câu.',
    `Ngữ cảnh:\n${contextText}`,
  ].join('\n\n');
};

const generateResponse = async ({ question, contextBlocks }) => {
  const apiKey = process.env.GROQ_API_KEY;
  const model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

  if (!apiKey) {
    throw new ChatbotError('GROQ_API_KEY is missing', {
      statusCode: 500,
      code: 'GROQ_CONFIG_MISSING',
    });
  }

  const payload = await requestWithRetry({
    url: 'https://api.groq.com/openai/v1/chat/completions',
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content: buildSystemPrompt(contextBlocks),
        },
        {
          role: 'user',
          content: question,
        },
      ],
    }),
    timeoutMs: toNumber(process.env.CHATBOT_GROQ_TIMEOUT_MS, 20000),
    maxRetries: toNumber(process.env.CHATBOT_MAX_RETRIES, 3),
    baseDelayMs: toNumber(process.env.CHATBOT_RETRY_BASE_DELAY_MS, 800),
    requestName: 'groq-chat-completion',
  });

  const content = payload?.choices?.[0]?.message?.content;

  if (!content) {
    throw new ChatbotError('Groq returned empty response', {
      statusCode: 502,
      code: 'EMPTY_GROQ_RESPONSE',
      details: { payload },
    });
  }

  return {
    answer: sanitizeAnswer(content),
    usage: payload?.usage || null,
    model,
  };
};

module.exports = {
  generateResponse,
};
