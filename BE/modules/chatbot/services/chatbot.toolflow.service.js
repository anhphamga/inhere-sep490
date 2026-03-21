const { searchContext } = require('./retrieval.service');
const { generateResponse } = require('./groq.service');
const { validateChatInput } = require('../utils/validators');
const { detectChatIntent } = require('./tool-intent.service');
const { buildToolPromptContext } = require('./tool-prompt-template.service');
const { callToolSearch } = require('./tool-api-client.service');
const { getSuggestedProducts } = require('./product.service');
const { findFaqAnswer } = require('./faq.service');
const { getChatSession, saveChatSession } = require('./chat-session.service');
const {
  getRecentSaleOrders,
  getRecentRentOrders,
  getRecentOrders,
  getOrderDetailsByOrderIds,
} = require('./order.service');

const normalizeForMatch = (value) => {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
};

const extractDateRangeFromMessage = (message) => {
  const matched = String(message || '').match(/(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
  if (!matched) {
    return {};
  }

  const day = Number(matched[1]);
  const month = Number(matched[2]);
  const year = Number(matched[3]);
  const base = new Date(Date.UTC(year, month - 1, day));

  if (Number.isNaN(base.getTime())) {
    return {};
  }

  const dateFrom = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  const dateTo = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));

  return {
    dateFrom,
    dateTo,
  };
};

const inferOrderType = (message) => {
  const normalized = normalizeForMatch(message);

  if (normalized.includes('don thue') || normalized.includes('thue') || normalized.includes('rent')) {
    return 'rent';
  }

  if (normalized.includes('don mua') || normalized.includes('mua') || normalized.includes('sale')) {
    return 'sale';
  }

  return null;
};

const extractObjectId = (message) => {
  const matched = String(message || '').match(/[a-f0-9]{24}/ig);
  return matched || [];
};

const extractOrdinal = (message) => {
  const normalized = normalizeForMatch(message);
  const matched = normalized.match(/don thu\s*(\d{1,2})/);
  if (!matched) {
    return null;
  }

  const value = Number(matched[1]);
  return Number.isInteger(value) && value > 0 ? value : null;
};

const isLatestOrderReference = (message) => {
  const normalized = normalizeForMatch(message);
  return normalized.includes('don gan nhat') || normalized.includes('don moi nhat') || normalized.includes('don do') || normalized.includes('don nay');
};

const isPluralReference = (message) => {
  const normalized = normalizeForMatch(message);
  return normalized.includes('nhung don') || normalized.includes('cac don') || normalized.includes('2 don') || normalized.includes('hai don');
};

const asksOrderItems = (message) => {
  const normalized = normalizeForMatch(message);
  const itemWords = ['co gi', 'gom gi', 'chi tiet', 'thue gi', 'mua gi', 'san pham', 'mat hang', 'item'];
  return itemWords.some((word) => normalized.includes(word));
};

const isLatestQuery = (message) => {
  const normalized = normalizeForMatch(message);
  return normalized.includes('gan nhat') || normalized.includes('moi nhat');
};

const formatDate = (value) => {
  if (!value) {
    return '';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  const day = String(parsed.getUTCDate()).padStart(2, '0');
  const month = String(parsed.getUTCMonth() + 1).padStart(2, '0');
  const year = parsed.getUTCFullYear();
  return `${day}/${month}/${year}`;
};

const buildUserAnswer = ({ records }) => {
  if (!records.length) {
    return 'Khong tim thay thong tin phu hop.';
  }

  const user = records[0];
  return [
    `Ten: ${user.name || '-'}.`,
    `Email: ${user.email || '-'}.`,
    `So dien thoai: ${user.phone || '-'}, Vai tro: ${user.role || '-'}, Trang thai: ${user.status || '-'}.`,
  ].join(' ');
};

const buildOrderAnswer = ({ records, message }) => {
  if (!records.length) {
    return 'Khong tim thay thong tin phu hop.';
  }

  const source = isLatestQuery(message) ? [records[0]] : records;
  const first = source[0];
  const orderLabel = first.orderType === 'rent' ? 'don thue' : 'don mua';

  return [
    `${orderLabel.charAt(0).toUpperCase() + orderLabel.slice(1)}: ${first.id}.`,
    `Trang thai: ${first.status || '-'}, Tong tien: ${Number(first.totalAmount || 0)}.`,
    `Ngay tao: ${formatDate(first.createdAt) || '-'}.`,
  ].join(' ');
};

const buildDeterministicToolAnswer = ({ intent, toolData, message }) => {
  const records = Array.isArray(toolData?.records) ? toolData.records : [];

  if (intent === 'USER') {
    return buildUserAnswer({ records });
  }

  if (intent === 'ORDER') {
    return buildOrderAnswer({ records, message });
  }

  return null;
};

const buildOrderContext = (records) => {
  return JSON.stringify({
    total: records.length,
    records,
  }, null, 2);
};

const summarizeOrderByGroq = async ({ message, records, intent }) => {
  const llmResult = await generateResponse({
    question: [
      `Intent: ${intent}`,
      `User question: ${message}`,
      'Hay tra loi ngan gon bang tieng Viet, toi da 4 cau.',
      'Chi tom tat thong tin don hang tu context.',
      'Neu context la danh sach san pham trong don thi liet ke gon theo tung don.',
      'Tuyet doi khong noi ve API, backend, database.',
    ].join('\n'),
    contextBlocks: [buildOrderContext(records)],
  });

  return llmResult;
};

const buildOrderListMessage = ({ records, message }) => {
  const rentCount = records.filter((item) => item.orderType === 'rent').length;
  const saleCount = records.filter((item) => item.orderType === 'sale').length;
  const orderType = inferOrderType(message);

  if (orderType === 'rent') {
    return `Tim thay ${rentCount} don thue gan day. Bam "Xem chi tiet" de mo trang don.`;
  }

  if (orderType === 'sale') {
    return `Tim thay ${saleCount} don mua gan day. Bam "Xem chi tiet" o don ho tro de mo trang don.`;
  }

  return `Tim thay ${records.length} don gan day. Bam "Xem chi tiet" de mo trang don.`;
};

const getOrdersByType = async ({ actorId, orderType, topK }) => {
  if (orderType === 'sale') {
    return getRecentSaleOrders(actorId, { limit: topK });
  }

  if (orderType === 'rent') {
    return getRecentRentOrders(actorId, { limit: topK });
  }

  return getRecentOrders(actorId, { limit: topK });
};

const resolveTargetOrderIds = async ({ actorId, message, topK, sessionState }) => {
  const explicitIds = extractObjectId(message).filter((id) => id.length === 24);
  if (explicitIds.length > 0) {
    return explicitIds;
  }

  const rememberedIds = Array.isArray(sessionState?.lastOrderIds) ? sessionState.lastOrderIds : [];
  const orderType = inferOrderType(message);

  if (rememberedIds.length > 0) {
    const ordinal = extractOrdinal(message);
    if (ordinal && rememberedIds[ordinal - 1]) {
      return [rememberedIds[ordinal - 1]];
    }

    if (isLatestOrderReference(message)) {
      return [rememberedIds[0]];
    }

    if (isPluralReference(message)) {
      return rememberedIds.slice(0, topK);
    }

    if (asksOrderItems(message)) {
      return rememberedIds.slice(0, Math.min(2, topK));
    }
  }

  const recentOrders = await getOrdersByType({
    actorId,
    orderType,
    topK,
  });

  if (!recentOrders.length) {
    return [];
  }

  const ordinal = extractOrdinal(message);
  if (ordinal && recentOrders[ordinal - 1]) {
    return [recentOrders[ordinal - 1].id];
  }

  if (isPluralReference(message)) {
    return recentOrders.slice(0, topK).map((item) => item.id);
  }

  return [recentOrders[0].id];
};

const buildOrderDetailData = async ({ actorId, message, topK, sessionState }) => {
  const orderIds = await resolveTargetOrderIds({
    actorId,
    message,
    topK,
    sessionState,
  });

  if (!orderIds.length) {
    return [];
  }

  const details = await getOrderDetailsByOrderIds(orderIds, actorId);
  return details;
};

const mapToolResponseToContext = (toolData) => {
  const records = Array.isArray(toolData?.records) ? toolData.records : [];
  const summary = {
    entity: toolData?.entity || null,
    total: toolData?.total || 0,
    page: toolData?.page || 1,
    limit: toolData?.limit || records.length,
    records,
  };

  return JSON.stringify(summary, null, 2);
};

const buildToolPayload = ({ entity, message, requestId, topK }) => {
  const dateFilters = extractDateRangeFromMessage(message);
  const orderType = entity === 'order' ? inferOrderType(message) : null;

  return {
    entity,
    query: message,
    filters: {
      ...dateFilters,
      ...(orderType ? { orderType } : {}),
      page: 1,
      limit: topK,
    },
    requestId,
  };
};

const chatWithTools = async ({ payload = {}, actor = {}, requestId }) => {
  const { message, topK } = validateChatInput(payload);

  const faq = findFaqAnswer(message);
  if (faq) {
    return {
      type: 'TEXT',
      answer: faq.answer,
      usage: null,
      model: 'faq-direct',
      intent: 'FAQ',
      toolData: null,
      contexts: [
        {
          id: 'faq-direct',
          score: faq.score,
          metadata: {
            source: 'customer-faq-50-qa.md',
            matchedQuestion: faq.question,
          },
          preview: faq.question,
        },
      ],
    };
  }

  const intentInfo = detectChatIntent(message);
  const sessionState = getChatSession({ actor, requestId });

  if (intentInfo.intent === 'PRODUCT') {
    const products = await getSuggestedProducts({ limit: 5 });

    if (!products.length) {
      return {
        type: 'TEXT',
        answer: 'Hien tai chua co san pham phu hop.',
        usage: null,
        model: null,
        intent: intentInfo.intent,
        toolData: null,
        contexts: [],
      };
    }

    return {
      type: 'PRODUCT_LIST',
      message: 'Duoi day la mot so san pham ban co the tham khao:',
      data: products,
      usage: null,
      model: null,
      intent: intentInfo.intent,
      toolData: null,
      contexts: [],
    };
  }

  if (intentInfo.intent === 'ORDER' || intentInfo.intent === 'ORDER_DETAIL') {
    const orderType = inferOrderType(message);
    let orderData = [];

    if (intentInfo.intent === 'ORDER') {
      orderData = await getOrdersByType({
        actorId: actor.id,
        orderType,
        topK,
      });

      saveChatSession({
        actor,
        requestId,
        state: {
          ...sessionState,
          lastOrderIds: orderData.map((item) => item.id),
          lastOrderDetails: [],
          lastOrderType: orderType || null,
        },
      });
    } else {
      orderData = await buildOrderDetailData({
        actorId: actor.id,
        message,
        topK,
        sessionState,
      });

      saveChatSession({
        actor,
        requestId,
        state: {
          ...sessionState,
          lastOrderIds: orderData.map((item) => item.id),
          lastOrderDetails: orderData,
          lastOrderType: orderType || sessionState.lastOrderType || null,
        },
      });
    }

    if (!Array.isArray(orderData) || orderData.length === 0) {
      return {
        type: 'ORDER',
        message: 'Khong tim thay thong tin phu hop.',
        answer: 'Khong tim thay thong tin phu hop.',
        data: [],
        usage: null,
        model: null,
        intent: intentInfo.intent,
        toolData: null,
        contexts: [],
      };
    }

    const isOrderListIntent = intentInfo.intent === 'ORDER';
    const llmResult = isOrderListIntent
      ? {
        answer: buildOrderListMessage({ records: orderData, message }),
        usage: null,
        model: null,
      }
      : await summarizeOrderByGroq({
        message,
        records: orderData,
        intent: intentInfo.intent,
      });

    return {
      type: 'ORDER',
      message: llmResult.answer,
      answer: llmResult.answer,
      data: orderData,
      usage: llmResult.usage,
      model: llmResult.model,
      intent: intentInfo.intent,
      toolData: null,
      contexts: [],
    };
  }

  const contexts = await searchContext({ query: message, topK });
  const contextBlocks = contexts.map((item) => item.text);

  let toolData = null;
  if (intentInfo.entity) {
    toolData = await callToolSearch({
      payload: buildToolPayload({
        entity: intentInfo.entity,
        message,
        requestId,
        topK,
      }),
      actor,
      requestId,
    });
  }

  if (intentInfo.entity && toolData && Array.isArray(toolData.records) && toolData.records.length === 0) {
    return {
      type: 'TEXT',
      answer: 'Khong tim thay thong tin phu hop.',
      usage: null,
      model: null,
      intent: intentInfo.intent,
      toolData,
      contexts: [],
    };
  }

  if (intentInfo.entity) {
    return {
      type: 'TEXT',
      answer: buildDeterministicToolAnswer({
        intent: intentInfo.intent,
        toolData,
        message,
      }) || 'Khong tim thay thong tin phu hop.',
      usage: null,
      model: null,
      intent: intentInfo.intent,
      toolData,
      contexts: [],
    };
  }

  const mergedContext = [
    ...contextBlocks,
    toolData ? `ToolData:\n${mapToolResponseToContext(toolData)}` : '',
  ].filter(Boolean);

  const llmResult = await generateResponse({
    question: buildToolPromptContext({
      context: mergedContext.join('\n\n'),
      question: message,
    }),
    contextBlocks: mergedContext,
  });

  return {
    type: 'TEXT',
    answer: llmResult.answer,
    usage: llmResult.usage,
    model: llmResult.model,
    intent: intentInfo.intent,
    toolData,
    contexts: contexts.map((item) => ({
      id: item.id,
      score: Number(item.score.toFixed(4)),
      metadata: item.metadata,
      preview: item.text.slice(0, 200),
    })),
  };
};

module.exports = {
  chatWithTools,
};

