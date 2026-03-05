const normalizeMessage = (value) =>
  String(value ?? '')
    .toLowerCase()
    .trim()
    .replace(/[.,!?;:()[\]{}"'`~@#$%^&*_+=<>\\/|-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const tokenSet = (value) => new Set(normalizeMessage(value).split(' ').filter(Boolean));

const jaccard = (a, b) => {
  const setA = tokenSet(a);
  const setB = tokenSet(b);
  if (setA.size === 0 || setB.size === 0) return 0;

  let intersection = 0;
  setA.forEach((token) => {
    if (setB.has(token)) intersection += 1;
  });

  const union = setA.size + setB.size - intersection;
  return union > 0 ? intersection / union : 0;
};

const scorePattern = (text, pattern) => {
  const normalizedText = normalizeMessage(text);
  const normalizedPattern = normalizeMessage(pattern);
  if (!normalizedPattern) return 0;
  if (normalizedText.includes(normalizedPattern)) return 1;

  return jaccard(normalizedText, normalizedPattern);
};

const matchPatterns = (text, patterns = []) => {
  const rows = Array.isArray(patterns) ? patterns : [];
  let bestPattern = '';
  let bestScore = 0;

  rows.forEach((pattern) => {
    const score = scorePattern(text, pattern);
    if (score > bestScore) {
      bestScore = score;
      bestPattern = pattern;
    }
  });

  return {
    matched: bestScore >= 0.45,
    confidence: Number(bestScore.toFixed(3)),
    pattern: bestPattern,
  };
};

module.exports = {
  normalizeMessage,
  matchPatterns,
};

