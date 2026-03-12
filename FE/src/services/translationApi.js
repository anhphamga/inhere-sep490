const translationCache = new Map();

const makeCacheKey = ({ source = "vi", target = "en", text = "" }) =>
  `${source}|${target}|${String(text || "").trim()}`;

export function getClientTranslationCache() {
  return translationCache;
}

export async function translateSingle({ text, source = "vi", target = "en", contextKey = "" }) {
  const cleanedText = String(text || "").trim();
  if (!cleanedText) return { translatedText: "" };

  const key = makeCacheKey({ source, target, text: cleanedText });
  if (translationCache.has(key)) {
    return { translatedText: translationCache.get(key), cacheHit: true };
  }

  const response = await fetch("/api/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: cleanedText, source, target, contextKey }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    return { translatedText: cleanedText, fallback: true };
  }
  const translatedText = payload?.translatedText || cleanedText;
  translationCache.set(key, translatedText);
  return { translatedText, fallback: Boolean(payload?.fallback) };
}

export async function translateBatch(items = []) {
  const cleanItems = (Array.isArray(items) ? items : [])
    .map((item, index) => ({
      id: String(item?.id || `item_${index}`),
      text: String(item?.text || "").trim(),
      source: item?.source || "vi",
      target: item?.target || "en",
    }))
    .filter((item) => item.text);

  if (cleanItems.length === 0) return { translations: {} };

  const hitResults = {};
  const missItems = [];
  cleanItems.forEach((item) => {
    const key = makeCacheKey(item);
    if (translationCache.has(key)) {
      hitResults[item.id] = translationCache.get(key);
    } else {
      missItems.push(item);
    }
  });

  if (missItems.length === 0) {
    return { translations: hitResults };
  }

  const response = await fetch("/api/translate/batch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items: missItems }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    return {
      translations: {
        ...hitResults,
        ...Object.fromEntries(missItems.map((item) => [item.id, item.text])),
      },
      fallback: true,
    };
  }
  const apiTranslations = payload?.translations || {};

  missItems.forEach((item) => {
    const translated = apiTranslations[item.id] || item.text;
    translationCache.set(makeCacheKey(item), translated);
  });

  return {
    translations: {
      ...hitResults,
      ...apiTranslations,
    },
    fallback: payload?.fallback || {},
  };
}
