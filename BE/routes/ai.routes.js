const express = require('express');
const mongoose = require('mongoose');
const AiFaq = require('../model/AiFaq.model');
const AiPolicy = require('../model/AiPolicy.model');
const AiIntent = require('../model/AiIntent.model');
const ChatUnanswered = require('../model/ChatUnanswered.model');
const { normalizeMessage, matchPatterns } = require('../utils/ai/matcher');
const { extractOrderCode } = require('../utils/ai/extractors');
const listProducts = require('../tools/ai/listProducts');
const topRented = require('../tools/ai/topRented');
const myOrder = require('../tools/ai/myOrder');

const router = express.Router();

const TOOL_MAP = {
  listProducts,
  topRented,
  myOrder,
};

const toObjectIdOrNull = (value) => {
  const raw = String(value ?? '').trim();
  if (!raw || !mongoose.Types.ObjectId.isValid(raw)) return null;
  return new mongoose.Types.ObjectId(raw);
};

const findBestByPatterns = (message, rows = []) => {
  let best = null;
  rows.forEach((row) => {
    const tags = Array.isArray(row.tags) ? row.tags : [];
    const patterns = Array.isArray(row.patterns) ? row.patterns : [];
    const mergedPatterns = [...patterns, ...tags];
    const matched = matchPatterns(message, mergedPatterns);
    if (!best || matched.confidence > best.confidence) {
      best = {
        row,
        confidence: matched.confidence,
        pattern: matched.pattern,
      };
    }
  });
  return best;
};

const logUnanswered = async ({
  userId,
  sessionId,
  message,
  normalizedMessage,
  pageContext,
  matchedLayer,
  confidence,
  reason,
}) => {
  await ChatUnanswered.updateOne(
    { normalizedMessage },
    {
      $set: {
        userId: userId || null,
        sessionId: sessionId || null,
        message,
        normalizedMessage,
        pageContext: pageContext || {},
        matchedLayer: matchedLayer || 'FALLBACK',
        confidence: Number(confidence || 0),
        reason: reason || 'no_match',
        lastSeenAt: new Date(),
      },
      $inc: { count: 1 },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true }
  );
};

router.post('/chat', async (req, res) => {
  try {
    const message = String(req.body?.message || '').trim();
    const normalizedMessage = normalizeMessage(message);
    const sessionId = String(req.body?.sessionId || '').trim() || null;
    const userId = toObjectIdOrNull(req.body?.userId);
    const pageContext = req.body?.pageContext && typeof req.body.pageContext === 'object' ? req.body.pageContext : {};
    const lang = String(pageContext.lang || req.body?.lang || 'vi').trim().toLowerCase().startsWith('en') ? 'en' : 'vi';

    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'message is required',
      });
    }

    // Layer 1: FAQ
    const faqs = await AiFaq.find({ status: 'active' }).lean();
    const bestFaq = findBestByPatterns(normalizedMessage, faqs);
    if (bestFaq && bestFaq.confidence >= 0.8) {
      return res.json({
        success: true,
        data: {
          answer: bestFaq.row.answer,
          matchedLayer: 'FAQ',
          confidence: bestFaq.confidence,
          meta: { fallback: false, pattern: bestFaq.pattern },
        },
      });
    }

    // Layer 1: Policy
    const policies = await AiPolicy.find({ status: 'active' }).lean();
    const bestPolicy = findBestByPatterns(normalizedMessage, policies);
    if (bestPolicy && bestPolicy.confidence >= 0.8) {
      return res.json({
        success: true,
        data: {
          answer: bestPolicy.row.answer,
          matchedLayer: 'POLICY',
          confidence: bestPolicy.confidence,
          meta: { fallback: false, pattern: bestPolicy.pattern },
        },
      });
    }

    // Layer 2: Intent/Tool
    const intents = await AiIntent.find({ status: 'active' }).lean();
    const bestIntent = intents.reduce((acc, item) => {
      const match = matchPatterns(normalizedMessage, item.sampleUtterances || []);
      if (!acc || match.confidence > acc.confidence) {
        return { item, confidence: match.confidence, pattern: match.pattern };
      }
      return acc;
    }, null);

    if (bestIntent && bestIntent.confidence >= 0.6 && TOOL_MAP[bestIntent.item.tool]) {
      try {
        const toolName = bestIntent.item.tool;
        const orderCode = extractOrderCode(message);
        const toolResult = await TOOL_MAP[toolName]({ message, normalizedMessage, orderCode, lang, userId, sessionId });

        return res.json({
          success: true,
          data: {
            answer: toolResult.answer,
            matchedLayer: 'TOOL',
            confidence: Number(toolResult.confidence || bestIntent.confidence),
            intent: bestIntent.item.intent,
            tool: toolName,
            meta: { fallback: false, pattern: bestIntent.pattern },
          },
        });
      } catch (error) {
        await logUnanswered({
          userId,
          sessionId,
          message,
          normalizedMessage,
          pageContext,
          matchedLayer: 'TOOL',
          confidence: bestIntent.confidence,
          reason: 'tool_failed',
        });
      }
    }

    // Layer 3: Fallback + log
    const fallbackAnswer =
      lang === 'en'
        ? 'I could not fully understand this request. Please share: (1) rent or buy, (2) outfit type, (3) pickup/return date.'
        : 'Mình chưa hiểu câu hỏi này, bạn cho mình thêm thông tin: (1) bạn muốn thuê hay mua? (2) loại trang phục? (3) ngày nhận/trả?';

    await logUnanswered({
      userId,
      sessionId,
      message,
      normalizedMessage,
      pageContext,
      matchedLayer: 'FALLBACK',
      confidence: Number(bestIntent?.confidence || bestPolicy?.confidence || bestFaq?.confidence || 0),
      reason: bestIntent ? 'low_confidence' : 'no_match',
    });

    return res.json({
      success: true,
      data: {
        answer: fallbackAnswer,
        matchedLayer: 'FALLBACK',
        confidence: Number(bestIntent?.confidence || 0),
        meta: { fallback: true },
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

router.get('/unanswered', async (req, res) => {
  try {
    const sort = String(req.query?.sort || 'top').toLowerCase();
    const limit = Math.min(Math.max(Number(req.query?.limit || 50), 1), 200);
    const sortOption = sort === 'recent' ? { lastSeenAt: -1 } : { count: -1, lastSeenAt: -1 };

    const rows = await ChatUnanswered.find({})
      .sort(sortOption)
      .limit(limit)
      .lean();

    return res.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;

