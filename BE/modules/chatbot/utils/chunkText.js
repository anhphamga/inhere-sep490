const chunkText = (text, chunkSize, overlap) => {
  const cleaned = typeof text === 'string' ? text.trim() : '';

  if (!cleaned) {
    return [];
  }

  if (cleaned.length <= chunkSize) {
    return [cleaned];
  }

  const chunks = [];
  let start = 0;

  while (start < cleaned.length) {
    const end = Math.min(start + chunkSize, cleaned.length);
    const part = cleaned.slice(start, end).trim();

    if (part) {
      chunks.push(part);
    }

    if (end === cleaned.length) {
      break;
    }

    start = Math.max(end - overlap, start + 1);
  }

  return chunks;
};

module.exports = {
  chunkText,
};
