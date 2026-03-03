const { createTranslateService } = require('../services/translateService');

class FakeTranslationModel {
  static store = new Map();
  static updateCalls = 0;

  static reset() {
    FakeTranslationModel.store = new Map();
    FakeTranslationModel.updateCalls = 0;
  }

  static findOne(query) {
    const doc = FakeTranslationModel.store.get(query.key) || null;
    return {
      lean: async () => doc,
    };
  }

  static find(query) {
    const keys = query?.key?.$in || [];
    const docs = keys
      .map((key) => FakeTranslationModel.store.get(key))
      .filter(Boolean)
      .map((item) => ({ ...item }));
    return {
      lean: async () => docs,
    };
  }

  static async updateOne(query, update, options = {}) {
    FakeTranslationModel.updateCalls += 1;
    const key = query.key;
    const existing = FakeTranslationModel.store.get(key);

    if (existing) {
      const next = { ...existing };
      if (update.$inc?.hits) next.hits = (next.hits || 0) + update.$inc.hits;
      if (update.$set) Object.assign(next, update.$set);
      FakeTranslationModel.store.set(key, next);
      return;
    }

    if (options?.upsert) {
      const inserted = {
        key,
        ...(update.$setOnInsert || {}),
        ...(update.$set || {}),
        hits: 0,
      };
      FakeTranslationModel.store.set(key, inserted);
    }
  }
}

describe('translateService cache flow', () => {
  test('cache miss should call provider and next request should hit cache', async () => {
    FakeTranslationModel.reset();
    const mockClient = {
      translateText: jest.fn().mockResolvedValue([
        {
          translations: [{ translatedText: 'Hello world' }],
        },
      ]),
    };

    const service = createTranslateService({
      translationModel: FakeTranslationModel,
      translationClient: mockClient,
      projectId: 'demo-project',
      location: 'global',
      logger: { error: jest.fn() },
    });

    const first = await service.translateText({
      text: 'Xin chao the gioi',
      source: 'vi',
      target: 'en',
    });
    expect(first.translatedText).toBe('Hello world');
    expect(first.cacheHit).toBe(false);
    expect(mockClient.translateText).toHaveBeenCalledTimes(1);

    const second = await service.translateText({
      text: 'Xin chao the gioi',
      source: 'vi',
      target: 'en',
    });
    expect(second.translatedText).toBe('Hello world');
    expect(second.cacheHit).toBe(true);
    expect(mockClient.translateText).toHaveBeenCalledTimes(1);
  });
});
