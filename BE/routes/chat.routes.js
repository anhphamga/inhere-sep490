const express = require('express');
const mongoose = require('mongoose');
const { createRateLimiter } = require('../middleware/rateLimit');
const { getRequestLang, pickLocalizedValue } = require('../utils/i18n');
const ChatConversation = require('../model/ChatConversation.model');
const ChatMessage = require('../model/ChatMessage.model');

const router = express.Router();

const limiter = createRateLimiter({ windowMs: 60_000, max: 30 });
const STOP_WORDS = new Set([
  'la',
  'là',
  'cua',
  'của',
  'ban',
  'bạn',
  'toi',
  'tôi',
  'shop',
  'cua',
  'hang',
  'cửa',
  'hàng',
  'the',
  'is',
  'are',
  'a',
  'an',
  'to',
  'do',
  'you',
  'your',
  'my',
]);
const STORE_NAME = String(process.env.STORE_NAME || 'InHere Hoi An').trim();

const normalizeText = (value) =>
  String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const uniqueTokens = (value) => {
  const text = normalizeText(value);
  if (!text) return [];
  return Array.from(
    new Set(text.split(' ').filter((token) => token.length > 1 && !STOP_WORDS.has(token)))
  );
};

const overlapScore = (queryTokens, targetTokens) => {
  if (queryTokens.length === 0 || targetTokens.length === 0) return 0;
  const targetSet = new Set(targetTokens);
  let hits = 0;
  queryTokens.forEach((token) => {
    if (targetSet.has(token)) hits += 1;
  });
  return hits / Math.max(queryTokens.length, 1);
};

const detectIntent = (message, intents = []) => {
  const queryTokens = uniqueTokens(message);
  if (queryTokens.length === 0) return null;

  let best = null;
  intents.forEach((intent) => {
    const samples = Array.isArray(intent.sampleUtterances) ? intent.sampleUtterances : [];
    const bestSampleScore = samples.reduce((acc, sample) => {
      const score = overlapScore(queryTokens, uniqueTokens(sample));
      return Math.max(acc, score);
    }, 0);

    if (!best || bestSampleScore > best.score) {
      best = { intent, score: bestSampleScore };
    }
  });

  if (!best) return null;
  const threshold = Number(best.intent.confidenceThreshold ?? 0.6);
  if (best.score < threshold) return null;
  return best.intent.intent;
};

const pickBestFaq = (message, faqs = [], lang = 'vi') => {
  const queryTokens = uniqueTokens(message);
  if (queryTokens.length === 0) return null;

  let best = null;
  faqs.forEach((item) => {
    const question = pickLocalizedValue(item.question, lang);
    const answer = pickLocalizedValue(item.answer, lang);
    const questionTokens = uniqueTokens(question);
    const answerTokens = uniqueTokens(answer);
    const questionScore = overlapScore(queryTokens, questionTokens);
    const answerScore = overlapScore(queryTokens, answerTokens);
    const score = questionScore * 0.8 + answerScore * 0.2;
    const overlapHits = queryTokens.filter(
      (token) => questionTokens.includes(token) || answerTokens.includes(token)
    ).length;

    if (!best || score > best.score) {
      best = { item, score, overlapHits };
    }
  });

  if (!best || best.score < 0.45 || best.overlapHits < 2) return null;
  return best.item;
};

const pickMatchingPolicies = (message, policies = [], lang = 'vi') => {
  const queryTokens = uniqueTokens(message);
  if (queryTokens.length === 0) return [];

  return policies
    .map((item) => {
      const title = pickLocalizedValue(item.title, lang);
      const content = pickLocalizedValue(item.content, lang);
      const score = overlapScore(queryTokens, uniqueTokens(`${title} ${content}`));
      return { item, score, title, content };
    })
    .filter((row) => row.score >= 0.2)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2);
};

const isStoreNameQuestion = (message) => {
  const text = normalizeText(message);
  if (!text) return false;
  const hasNameWord = text.includes('ten') || text.includes('name');
  const hasStoreWord =
    text.includes('cua hang') ||
    text.includes('shop') ||
    text.includes('store') ||
    text.includes('thuong hieu');
  return hasNameWord && hasStoreWord;
};

const toObjectIdOrNull = (value) => {
  const raw = String(value ?? '').trim();
  if (!raw || !mongoose.Types.ObjectId.isValid(raw)) return null;
  return new mongoose.Types.ObjectId(raw);
};

const resolveConversation = async ({ conversationId, sessionId, userId, role, lang, storeHistory }) => {
  if (!storeHistory) return null;

  const cleanedConversationId = String(conversationId ?? '').trim();
  const cleanedSessionId = String(sessionId ?? '').trim();
  const normalizedRole = ['owner', 'staff', 'customer', 'guest'].includes(role) ? role : 'customer';

  let conversation = null;

  if (cleanedConversationId && mongoose.Types.ObjectId.isValid(cleanedConversationId)) {
    conversation = await ChatConversation.findById(cleanedConversationId);
  }

  if (!conversation && cleanedSessionId) {
    conversation = await ChatConversation.findOne({ sessionId: cleanedSessionId, status: 'active' }).sort({
      updatedAt: -1,
    });
  }

  if (!conversation) {
    conversation = await ChatConversation.create({
      sessionId: cleanedSessionId,
      userId: userId || null,
      role: normalizedRole,
      lang,
      status: 'active',
      lastMessageAt: new Date(),
    });
    return conversation;
  }

  conversation.lastMessageAt = new Date();
  conversation.lang = lang || conversation.lang;
  if (userId && !conversation.userId) {
    conversation.userId = userId;
  }
  await conversation.save();
  return conversation;
};

router.post('/', limiter, async (req, res) => {
  try {
    const rawMessage = String(req.body?.message ?? '').trim();
    const lang = getRequestLang(req.body?.lang || req.query?.lang || req.headers['accept-language']);
    const role = String(req.body?.role || 'customer').trim().toLowerCase() || 'customer';
    const storeHistory = req.body?.storeHistory !== false;
    const conversationId = String(req.body?.conversationId || '').trim();
    const sessionId = String(req.body?.sessionId || '').trim();
    const userId = toObjectIdOrNull(req.body?.userId);

    if (!rawMessage) {
      return res.status(400).json({
        ok: false,
        message: 'message is required',
      });
    }

    const db = mongoose.connection.db;
    if (!db) {
      return res.status(503).json({
        ok: false,
        message: 'Database is not ready',
      });
    }

    const [faqs, policies, intents, toolPermissions] = await Promise.all([
      db.collection('chat_faqs').find({ status: 'active' }).toArray(),
      db.collection('chat_policies').find({ status: 'active' }).toArray(),
      db.collection('chat_intents').find({ status: 'active' }).toArray(),
      db.collection('tool_permissions').findOne({ role }),
    ]);

    const intent = detectIntent(rawMessage, intents);
    const faq = pickBestFaq(rawMessage, faqs, lang);
    const matchedPolicies = pickMatchingPolicies(rawMessage, policies, lang);

    let answer = '';
    const sources = [];

    if (isStoreNameQuestion(rawMessage)) {
      answer =
        lang === 'en'
          ? `Our store name is ${STORE_NAME}.`
          : `Tên cửa hàng là ${STORE_NAME}.`;
      sources.push({
        type: 'system',
        key: 'store_name',
      });
    }

    if (!answer && faq) {
      answer = pickLocalizedValue(faq.answer, lang);
      sources.push({
        type: 'faq',
        intent: faq.intent || null,
        question: pickLocalizedValue(faq.question, lang),
      });
    }

    if (!answer && matchedPolicies.length > 0) {
      answer = matchedPolicies.map((row) => `${row.title}: ${row.content}`).join('\n');
      matchedPolicies.forEach((row) => {
        sources.push({
          type: 'policy',
          policyKey: row.item.policyKey || null,
          title: row.title,
        });
      });
    }

    if (!answer) {
      answer =
        lang === 'en'
          ? 'I could not find enough data to answer accurately. Please share more details or order code.'
          : 'Mình chưa đủ dữ liệu để trả lời chính xác. Bạn vui lòng cung cấp thêm thông tin hoặc mã đơn.';
    }

    const conversation = await resolveConversation({
      conversationId,
      sessionId,
      userId,
      role,
      lang,
      storeHistory,
    });

    if (conversation) {
      await ChatMessage.insertMany([
        {
          conversationId: conversation._id,
          role: 'user',
          content: rawMessage,
          lang,
          intent: intent || 'unknown',
          meta: { role },
        },
        {
          conversationId: conversation._id,
          role: 'assistant',
          content: answer,
          lang,
          intent: intent || 'fallback',
          sources,
        },
      ]);
    }

    return res.json({
      ok: true,
      data: {
        conversationId: conversation ? conversation._id.toString() : null,
        role: 'assistant',
        lang,
        intent: intent || 'fallback',
        answer,
        allowedTools: Array.isArray(toolPermissions?.allowedTools) ? toolPermissions.allowedTools : [],
        sources,
      },
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: error.message,
    });
  }
});

router.get('/conversations', limiter, async (req, res) => {
  try {
    const sessionId = String(req.query?.sessionId || '').trim();
    const role = String(req.query?.role || '').trim().toLowerCase();
    const userId = toObjectIdOrNull(req.query?.userId);
    const limit = Math.min(Math.max(Number(req.query?.limit || 20), 1), 100);

    const filter = {};
    if (sessionId) filter.sessionId = sessionId;
    if (role) filter.role = role;
    if (userId) filter.userId = userId;

    const conversations = await ChatConversation.find(filter)
      .sort({ lastMessageAt: -1, updatedAt: -1 })
      .limit(limit)
      .lean();

    return res.json({
      ok: true,
      data: conversations,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: error.message,
    });
  }
});

router.get('/:conversationId/messages', limiter, async (req, res) => {
  try {
    const conversationId = String(req.params?.conversationId || '').trim();
    const limit = Math.min(Math.max(Number(req.query?.limit || 30), 1), 100);

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({
        ok: false,
        message: 'conversationId is invalid',
      });
    }

    const conversation = await ChatConversation.findById(conversationId).lean();
    if (!conversation) {
      return res.status(404).json({
        ok: false,
        message: 'Conversation not found',
      });
    }

    const messages = await ChatMessage.find({ conversationId: conversation._id })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return res.json({
      ok: true,
      data: {
        conversation,
        messages: messages.reverse(),
      },
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: error.message,
    });
  }
});

module.exports = router;
