require('dotenv').config();

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const AiFaq = require('../model/AiFaq.model');
const AiPolicy = require('../model/AiPolicy.model');
const AiIntent = require('../model/AiIntent.model');

const DATA_DIR = path.resolve(__dirname, '../../data/ai');

const readJson = (name) => {
  const filePath = path.join(DATA_DIR, name);
  if (!fs.existsSync(filePath)) return [];
  const raw = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '').trim();
  if (!raw) return [];
  return JSON.parse(raw);
};

const now = () => new Date();

const upsertFaqs = async (rows) => {
  const docs = Array.isArray(rows) ? rows : [];
  if (docs.length === 0) return;

  const ops = docs.map((item) => ({
    updateOne: {
      filter: { id: item.id },
      update: {
        $set: {
          tags: Array.isArray(item.tags) ? item.tags : [],
          patterns: Array.isArray(item.patterns) ? item.patterns : [],
          answer: String(item.answer || '').trim(),
          status: item.status || 'active',
        },
        $setOnInsert: { createdAt: now() },
      },
      upsert: true,
    },
  }));

  const result = await AiFaq.bulkWrite(ops, { ordered: false });
  console.log(`[ai_faqs] upserted=${result.upsertedCount || 0} modified=${result.modifiedCount || 0}`);
};

const upsertPolicies = async (rows) => {
  const docs = Array.isArray(rows) ? rows : [];
  if (docs.length === 0) return;

  const ops = docs.map((item) => ({
    updateOne: {
      filter: { id: item.id },
      update: {
        $set: {
          tags: Array.isArray(item.tags) ? item.tags : [],
          patterns: Array.isArray(item.patterns) ? item.patterns : [],
          answer: String(item.answer || '').trim(),
          status: item.status || 'active',
        },
        $setOnInsert: { createdAt: now() },
      },
      upsert: true,
    },
  }));

  const result = await AiPolicy.bulkWrite(ops, { ordered: false });
  console.log(`[ai_policies] upserted=${result.upsertedCount || 0} modified=${result.modifiedCount || 0}`);
};

const upsertIntents = async (rows) => {
  const docs = Array.isArray(rows) ? rows : [];
  if (docs.length === 0) return;

  const ops = docs.map((item) => ({
    updateOne: {
      filter: { intent: item.intent },
      update: {
        $set: {
          sampleUtterances: Array.isArray(item.sampleUtterances) ? item.sampleUtterances : [],
          tool: String(item.tool || '').trim(),
          status: item.status || 'active',
        },
        $setOnInsert: { createdAt: now() },
      },
      upsert: true,
    },
  }));

  const result = await AiIntent.bulkWrite(ops, { ordered: false });
  console.log(`[ai_intents] upserted=${result.upsertedCount || 0} modified=${result.modifiedCount || 0}`);
};

const run = async () => {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is missing in environment');

  const faqs = readJson('faqs.json');
  const policies = readJson('policies.json');
  const intents = readJson('intents.json');

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('MongoDB connected');

  await upsertFaqs(faqs);
  await upsertPolicies(policies);
  await upsertIntents(intents);

  await mongoose.disconnect();
  console.log('Seed ai chat completed.');
};

run().catch(async (error) => {
  console.error('seedAiChat failed:', error.message);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore
  }
  process.exit(1);
});

