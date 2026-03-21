const { chunkText } = require('../utils/chunkText');
const vectorStore = require('../vector-store/chromaVectorStore');

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const splitFaqSections = (text) => {
  const raw = String(text || '');

  if (raw.includes('### 1)')) {
    const matches = raw.match(/###\s+\d+\)[\s\S]*?(?=\n###\s+\d+\)|$)/g);
    return (matches || []).map((item) => item.trim()).filter(Boolean);
  }

  const lines = raw.split(/\r?\n/);
  return lines
    .filter((line) => /^\d+\.\s+/.test(line.trim()))
    .map((line) => line.trim())
    .filter(Boolean);
};

const normalizeForMatch = (value) => {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const sanitizeText = (value) => {
  return String(value || '')
    .replace(/\/api\/[\w\-/:]+/gi, 'API nội bộ')
    .replace(/\/(cart|rental|buy|owner|auth|users|orders|products|categories|alerts|virtual-try-on)[\w\-/:]*/gi, 'trang phù hợp')
    .replace(/\s{2,}/g, ' ')
    .trim();
};

const toTokenSet = (value) => {
  return new Set(
    normalizeForMatch(value)
      .split(' ')
      .filter((part) => part.length >= 2)
  );
};

const lexicalOverlapScore = (query, text) => {
  const queryTokens = toTokenSet(query);
  if (!queryTokens.size) {
    return 0;
  }

  const textTokens = toTokenSet(text);
  if (!textTokens.size) {
    return 0;
  }

  let overlap = 0;
  queryTokens.forEach((token) => {
    if (textTokens.has(token)) {
      overlap += 1;
    }
  });

  return overlap / queryTokens.size;
};

const ingestDocuments = async (documents) => {
  const chunkSize = toNumber(process.env.CHATBOT_CHUNK_SIZE, 700);
  const overlap = toNumber(process.env.CHATBOT_CHUNK_OVERLAP, 120);

  const entries = [];

  for (const doc of documents) {
    const filename = String(doc?.metadata?.filename || '').toLowerCase();
    const isFaqDoc = filename.includes('customer-faq');
    const parts = isFaqDoc
      ? splitFaqSections(doc.text)
      : chunkText(doc.text, chunkSize, overlap);

    for (let index = 0; index < parts.length; index += 1) {
      const chunk = parts[index];
      entries.push({
        id: `${doc.id}::${index}`,
        text: chunk,
        metadata: {
          ...doc.metadata,
          docId: doc.id,
          chunkIndex: index,
          createdAt: new Date().toISOString(),
        },
      });
    }
  }

  await vectorStore.upsertMany(entries);

  return {
    chunksInserted: entries.length,
    documentsInserted: documents.length,
  };
};

const searchContext = async ({ query, topK }) => {
  const normalized = normalizeForMatch(query);

  const [rawHits, normalizedHits] = await Promise.all([
    vectorStore.query({ queryText: query, topK }),
    normalized && normalized !== query ? vectorStore.query({ queryText: normalized, topK }) : Promise.resolve([]),
  ]);

  const merged = new Map();
  [...rawHits, ...normalizedHits].forEach((item) => {
    const current = merged.get(item.id);
    if (!current || item.score > current.score) {
      merged.set(item.id, item);
    }
  });

  return [...merged.values()]
    .map((item) => {
      const lexical = lexicalOverlapScore(query, item.text);
      const filename = String(item?.metadata?.filename || '').toLowerCase();
      const faqBoost = filename.includes('customer-faq') ? 0.05 : 0;

      return {
        ...item,
        rankScore: item.score + (lexical * 0.2) + faqBoost,
      };
    })
    .sort((a, b) => b.rankScore - a.rankScore)
    .slice(0, topK)
    .map((item) => ({
      id: item.id,
      text: sanitizeText(item.text),
      score: item.score,
      metadata: item.metadata,
    }));
};

module.exports = {
  ingestDocuments,
  searchContext,
};
