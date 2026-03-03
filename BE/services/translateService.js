const crypto = require('crypto');
const Translation = require('../models/Translation');

let TranslationServiceClient = null;
try {
  TranslationServiceClient = require('@google-cloud/translate').v3.TranslationServiceClient;
} catch {
  TranslationServiceClient = null;
}

const ALLOWED_LANGS = new Set(['vi', 'en']);

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

const makeCacheKey = ({ source, target, text }) => sha256(`${source}:${target}:${text}`);

function normalizeLang(lang, fallback) {
  const value = String(lang || fallback || '').trim().toLowerCase();
  if (!ALLOWED_LANGS.has(value)) return fallback;
  return value;
}

function cleanText(value) {
  return String(value || '').trim();
}

function createTranslateService({
  translationModel = Translation,
  projectId = process.env.GCP_PROJECT_ID,
  location = process.env.GCP_LOCATION || 'global',
  logger = console,
  translationClient = null,
} = {}) {
  let client = translationClient;
  const parent = projectId ? `projects/${projectId}/locations/${location}` : '';

  const logError = (scope, error) => {
    const message = error?.message || 'Unknown translation error';
    logger.error(`[translate:${scope}] ${message}`);
  };

  const validateInput = ({ text, source = 'vi', target = 'en' }) => {
    const cleanedText = cleanText(text);
    if (!cleanedText) {
      throw new Error('text is required');
    }
    if (cleanedText.length > 2000) {
      throw new Error('text exceeds 2000 characters');
    }

    const sourceLang = normalizeLang(source, 'vi');
    const targetLang = normalizeLang(target, 'en');
    if (!sourceLang || !targetLang) {
      throw new Error('source/target must be one of: vi, en');
    }

    return { text: cleanedText, source: sourceLang, target: targetLang };
  };

  const fetchCachedByKeys = async (keys = []) => {
    if (keys.length === 0) return new Map();
    const docs = await translationModel.find({ key: { $in: keys } }).lean();
    return new Map(docs.map((doc) => [doc.key, doc]));
  };

  const markCacheHit = async (key) =>
    translationModel.updateOne({ key }, { $inc: { hits: 1 }, $set: { updatedAt: new Date() } });

  const persistTranslation = async ({ key, source, target, original, translated }) =>
    translationModel.updateOne(
      { key },
      {
        $setOnInsert: { source, target, original, translated },
        $set: { translated, updatedAt: new Date() },
      },
      { upsert: true }
    );

  const providerTranslateMany = async ({ texts, source, target }) => {
    if (!texts.length) return [];
    if (source === target) return texts;

    if (!parent) {
      throw new Error('Google Translation client is not configured');
    }

    if (!client && TranslationServiceClient) {
      client = new TranslationServiceClient();
    }
    if (!client) {
      throw new Error('Google Translation client is not configured');
    }

    const [response] = await client.translateText({
      parent,
      contents: texts,
      mimeType: 'text/plain',
      sourceLanguageCode: source,
      targetLanguageCode: target,
    });

    return (response?.translations || []).map((item) => item?.translatedText || '');
  };

  const translateText = async ({ text, source = 'vi', target = 'en', contextKey = '' }) => {
    const parsed = validateInput({ text, source, target });
    const key = makeCacheKey(parsed);

    const existingQuery = translationModel.findOne({ key });
    const existing =
      typeof existingQuery?.lean === 'function'
        ? await existingQuery.lean()
        : await existingQuery;
    if (existing) {
      await markCacheHit(key);
      return {
        translatedText: existing.translated,
        fallback: false,
        cacheHit: true,
      };
    }

    try {
      const translated = (await providerTranslateMany({ texts: [parsed.text], source: parsed.source, target: parsed.target }))[0] || parsed.text;
      await persistTranslation({
        key,
        source: parsed.source,
        target: parsed.target,
        original: parsed.text,
        translated,
      });
      return {
        translatedText: translated,
        fallback: false,
        cacheHit: false,
      };
    } catch (error) {
      logError(`single:${contextKey || 'n/a'}`, error);
      return {
        translatedText: parsed.text,
        fallback: true,
        cacheHit: false,
      };
    }
  };

  const translateBatch = async (items = []) => {
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error('items is required');
    }
    if (items.length > 100) {
      throw new Error('items exceeds 100 entries');
    }

    const parsedItems = items.map((item, index) => {
      const id = String(item?.id || '').trim() || `idx_${index}`;
      const parsed = validateInput({
        text: item?.text,
        source: item?.source || 'vi',
        target: item?.target || 'en',
      });
      return {
        id,
        ...parsed,
        key: makeCacheKey(parsed),
      };
    });

    const keys = Array.from(new Set(parsedItems.map((item) => item.key)));
    const cachedMap = await fetchCachedByKeys(keys);
    const results = {};
    const fallback = {};

    const missingUniqueMap = new Map();
    parsedItems.forEach((item) => {
      const cached = cachedMap.get(item.key);
      if (cached) {
        results[item.id] = cached.translated;
      } else if (!missingUniqueMap.has(item.key)) {
        missingUniqueMap.set(item.key, item);
      }
    });

    await Promise.all(
      parsedItems
        .filter((item) => cachedMap.has(item.key))
        .map((item) => markCacheHit(item.key))
    );

    const missingUnique = Array.from(missingUniqueMap.values());
    if (missingUnique.length > 0) {
      const missingByLocalePair = new Map();
      missingUnique.forEach((item) => {
        const localePair = `${item.source}:${item.target}`;
        if (!missingByLocalePair.has(localePair)) {
          missingByLocalePair.set(localePair, []);
        }
        missingByLocalePair.get(localePair).push(item);
      });

      const translatedByKey = new Map();

      for (const [, itemsByPair] of missingByLocalePair) {
        try {
          const translatedMany = await providerTranslateMany({
            texts: itemsByPair.map((item) => item.text),
            source: itemsByPair[0].source,
            target: itemsByPair[0].target,
          });

          await Promise.all(
            itemsByPair.map((item, idx) =>
              persistTranslation({
                key: item.key,
                source: item.source,
                target: item.target,
                original: item.text,
                translated: translatedMany[idx] || item.text,
              })
            )
          );

          itemsByPair.forEach((item, idx) => {
            translatedByKey.set(item.key, translatedMany[idx] || item.text);
          });
        } catch (error) {
          logError('batch', error);
          itemsByPair.forEach((item) => {
            translatedByKey.set(item.key, item.text);
          });
        }
      }

      parsedItems.forEach((item) => {
        if (!results[item.id]) {
          const translated = translatedByKey.get(item.key) || item.text;
          results[item.id] = translated;
          if (translated === item.text && item.source !== item.target) {
            fallback[item.id] = true;
          }
        }
      });
    }

    return {
      translations: results,
      fallback,
    };
  };

  return {
    validateInput,
    makeCacheKey,
    translateText,
    translateBatch,
  };
}

const translateService = createTranslateService();

module.exports = {
  ALLOWED_LANGS,
  createTranslateService,
  translateService,
};
