const { ChromaClient } = require('chromadb');
const ChatbotError = require('../utils/chatbotError');
const logger = require('../utils/logger');
const { chromaUrl } = require('../../../config/app.config');
const { embedText } = require('../services/embedding.service');

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

class ChromaVectorStore {
  constructor() {
    const parsedUrl = new URL(chromaUrl);

    this.collectionName = process.env.CHATBOT_CHROMA_COLLECTION || 'inhere_chatbot_knowledge';
    this.client = new ChromaClient({
      ssl: parsedUrl.protocol === 'https:',
      host: parsedUrl.hostname,
      port: Number(parsedUrl.port) || (parsedUrl.protocol === 'https:' ? 443 : 80),
    });
    this.collection = null;
  }

  async getCollection() {
    if (this.collection) {
      return this.collection;
    }

    try {
      this.collection = await this.client.getOrCreateCollection({
        name: this.collectionName,
        metadata: {
          source: 'inhere-chatbot',
        },
      });

      return this.collection;
    } catch (error) {
      throw new ChatbotError('Failed to connect or create Chroma collection', {
        statusCode: 500,
        code: 'CHROMA_CONNECTION_FAILED',
        details: {
          message: error.message,
          collectionName: this.collectionName,
        },
      });
    }
  }

  async resetCollection() {
    try {
      await this.client.deleteCollection({
        name: this.collectionName,
      });
    } catch (error) {
      const message = String(error?.message || '').toLowerCase();
      if (!message.includes('not found')
        && !message.includes('does not exist')
        && !message.includes('could not be found')) {
        throw new ChatbotError('Failed to reset Chroma collection', {
          statusCode: 500,
          code: 'CHROMA_RESET_FAILED',
          details: {
            message: error.message,
            collectionName: this.collectionName,
          },
        });
      }
    }

    this.collection = null;
    await this.getCollection();
  }

  async upsertMany(entries) {
    if (!entries.length) {
      return 0;
    }

    const collection = await this.getCollection();

    const ids = entries.map((entry) => entry.id);
    const documents = entries.map((entry) => entry.text);
    const metadatas = entries.map((entry) => entry.metadata || {});
    const embeddings = [];

    for (const entry of entries) {
      embeddings.push(await embedText(entry.text));
    }

    try {
      await collection.upsert({
        ids,
        documents,
        metadatas,
        embeddings,
      });

      logger.info('Chroma upsert completed', {
        collection: this.collectionName,
        count: entries.length,
      });

      return entries.length;
    } catch (error) {
      throw new ChatbotError('Failed to upsert documents into Chroma', {
        statusCode: 500,
        code: 'CHROMA_UPSERT_FAILED',
        details: {
          message: error.message,
          collectionName: this.collectionName,
        },
      });
    }
  }

  async query({ queryText, queryEmbedding, topK }) {
    const collection = await this.getCollection();
    const resolvedEmbedding = queryEmbedding || (queryText ? await embedText(queryText) : null);

    if (!resolvedEmbedding) {
      throw new ChatbotError('Query embedding is missing', {
        statusCode: 400,
        code: 'QUERY_EMBEDDING_MISSING',
      });
    }

    try {
      const result = await collection.query({
        queryEmbeddings: [resolvedEmbedding],
        nResults: topK,
        include: ['documents', 'metadatas', 'distances'],
      });

      const ids = result?.ids?.[0] || [];
      const documents = result?.documents?.[0] || [];
      const metadatas = result?.metadatas?.[0] || [];
      const distances = result?.distances?.[0] || [];

      return ids.map((id, index) => {
        const distance = Number(distances[index] || 0);
        return {
          id,
          text: documents[index] || '',
          metadata: metadatas[index] || {},
          // Convert distance to bounded similarity score in (0, 1].
          score: Number.isFinite(distance) ? (1 / (1 + Math.max(distance, 0))) : 0,
        };
      });
    } catch (error) {
      throw new ChatbotError('Failed to query Chroma', {
        statusCode: 500,
        code: 'CHROMA_QUERY_FAILED',
        details: {
          message: error.message,
          collectionName: this.collectionName,
        },
      });
    }
  }
}

module.exports = new ChromaVectorStore();
