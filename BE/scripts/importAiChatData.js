require('dotenv').config();

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const DATA_FILE = path.resolve(__dirname, '../../data/mongo_seed_data_ai_chat.json');

const COLLECTIONS = [
  {
    key: 'chat_faqs',
    match: (doc) => ({
      intent: doc.intent || null,
      'question.vi': doc?.question?.vi || null,
      'question.en': doc?.question?.en || null,
    }),
  },
  {
    key: 'chat_policies',
    match: (doc) => ({
      policyKey: doc.policyKey,
    }),
  },
  {
    key: 'chat_intents',
    match: (doc) => ({
      intent: doc.intent,
    }),
  },
  {
    key: 'assistant_prompts',
    match: (doc) => ({
      assistantName: doc.assistantName,
      version: doc.version,
    }),
  },
  {
    key: 'knowledge_chunks',
    match: (doc) => ({
      chunkId: doc.chunkId,
    }),
  },
  {
    key: 'tool_permissions',
    match: (doc) => ({
      role: doc.role,
    }),
  },
];

const readSeedFile = () => {
  if (!fs.existsSync(DATA_FILE)) {
    throw new Error(`Seed file not found: ${DATA_FILE}`);
  }
  const raw = fs.readFileSync(DATA_FILE, 'utf8');
  const sanitized = raw.replace(/^\uFEFF/, '').trim();
  return JSON.parse(sanitized);
};

const asArray = (value) => (Array.isArray(value) ? value : []);

const upsertCollection = async (collectionName, docs, matchFn) => {
  const rows = asArray(docs).filter((doc) => doc && typeof doc === 'object');
  if (rows.length === 0) {
    console.log(`[skip] ${collectionName}: no documents`);
    return;
  }

  const ops = rows
    .map((doc) => {
      const filter = matchFn(doc);
      if (!filter || Object.keys(filter).length === 0) return null;
      return {
        updateOne: {
          filter,
          update: { $set: doc },
          upsert: true,
        },
      };
    })
    .filter(Boolean);

  if (ops.length === 0) {
    console.log(`[skip] ${collectionName}: no valid upsert operations`);
    return;
  }

  const result = await mongoose.connection.collection(collectionName).bulkWrite(ops, { ordered: false });
  const matched = result.matchedCount || 0;
  const modified = result.modifiedCount || 0;
  const upserted = result.upsertedCount || 0;
  console.log(`[ok] ${collectionName}: matched=${matched} modified=${modified} upserted=${upserted}`);
};

const run = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is missing in environment');
  }

  const seed = readSeedFile();

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('MongoDB connected');

  for (const item of COLLECTIONS) {
    await upsertCollection(item.key, seed[item.key], item.match);
  }

  await mongoose.disconnect();
  console.log('AI chat seed import completed.');
};

run().catch(async (error) => {
  console.error('importAiChatData failed:', error.message);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore
  }
  process.exit(1);
});
