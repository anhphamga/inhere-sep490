const fs = require('fs/promises');
const path = require('path');
const ChatbotError = require('../utils/chatbotError');

class FileVectorStore {
  constructor() {
    const defaultPath = path.join(__dirname, 'data', 'vectors.json');
    const configured = process.env.CHATBOT_VECTOR_STORE_FILE;
    this.storePath = configured
      ? path.resolve(process.cwd(), configured)
      : defaultPath;
    this.writeQueue = Promise.resolve();
  }

  async ensureStore() {
    const dir = path.dirname(this.storePath);
    await fs.mkdir(dir, { recursive: true });

    try {
      await fs.access(this.storePath);
    } catch (error) {
      await fs.writeFile(this.storePath, '[]', 'utf8');
    }
  }

  async readAll() {
    await this.ensureStore();
    const raw = await fs.readFile(this.storePath, 'utf8');

    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      throw new ChatbotError('Vector store file is corrupted', {
        statusCode: 500,
        code: 'VECTOR_STORE_CORRUPTED',
      });
    }
  }

  async writeAll(rows) {
    await this.ensureStore();
    const payload = JSON.stringify(rows, null, 2);
    await fs.writeFile(this.storePath, payload, 'utf8');
  }

  async addMany(entries) {
    this.writeQueue = this.writeQueue.then(async () => {
      const current = await this.readAll();
      const merged = current.concat(entries);
      await this.writeAll(merged);
      return merged.length;
    });

    return this.writeQueue;
  }

  cosineSimilarity(vecA = [], vecB = []) {
    if (!Array.isArray(vecA) || !Array.isArray(vecB) || vecA.length !== vecB.length || vecA.length === 0) {
      return -1;
    }

    let dot = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i += 1) {
      dot += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    if (normA === 0 || normB === 0) {
      return -1;
    }

    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  async query({ vector, topK = 4 }) {
    const rows = await this.readAll();

    const scored = rows
      .map((item) => ({
        ...item,
        score: this.cosineSimilarity(vector, item.embedding),
      }))
      .filter((item) => Number.isFinite(item.score) && item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    return scored;
  }
}

module.exports = new FileVectorStore();
