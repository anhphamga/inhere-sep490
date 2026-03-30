require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../model/User.model');
const Product = require('../model/Product.model');
const { chatWithTools } = require('../modules/chatbot/services/chatbot.toolflow.service');

const normalize = (value) => String(value || '')
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '');

const containsAny = (text, words) => {
  const n = normalize(text);
  return words.some((word) => n.includes(normalize(word)));
};

const run = async () => {
  await connectDB();

  const actorUser = await User.findOne({ role: 'customer', status: 'active' }).lean();
  if (!actorUser) {
    throw new Error('No active customer found for checklist test');
  }

  const actor = {
    id: String(actorUser._id),
    role: actorUser.role,
    email: actorUser.email,
  };

  const abcdExists = await Product.exists({
    $or: [
      { name: { $regex: /abcd/i } },
      { category: { $regex: /abcd/i } },
    ],
  });

  const cases = [
    {
      id: 1,
      message: 'cua hang co ao dai luc bien co nhung size nao',
      validate: (result) => {
        const names = (result.data || []).map((p) => p.name || '');
        return containsAny(result.message, ['size'])
          && names.some((name) => containsAny(name, ['luc bien']));
      },
    },
    {
      id: 2,
      message: 'tim ao dai luc bien',
      validate: (result) => {
        const firstName = result?.data?.[0]?.name || '';
        return containsAny(firstName, ['luc bien']);
      },
    },
    {
      id: 3,
      message: 'tim ao dai luc to',
      validate: (result) => {
        const firstName = result?.data?.[0]?.name || '';
        return containsAny(firstName, ['lua', 'tam', 'to']);
      },
    },
    {
      id: 4,
      message: 'ao dai lua tam',
      validate: (result) => {
        const firstName = result?.data?.[0]?.name || '';
        return containsAny(firstName, ['lua', 'tam']);
      },
    },
    {
      id: 5,
      message: 'tim ao abcd',
      validate: (result) => {
        const firstName = result?.data?.[0]?.name || '';
        if (abcdExists) {
          return containsAny(firstName, ['abcd']);
        }

        return containsAny(result.message, ['khong tim thay']);
      },
    },
    {
      id: 6,
      message: 'tim ao dai size m mau do con hang duoi 1tr',
      validate: (result) => {
        const filters = result?.meta?.appliedFilters || {};
        return String(filters.size || '').toUpperCase() === 'M'
          && normalize(filters.color || '') === 'do'
          && filters.inStock === true
          && Number(filters.priceMax) === 1000000;
      },
    },
    {
      id: 7,
      message: 'cac voucher cua toi',
      validate: (result) => {
        const answer = String(result?.answer || result?.message || '');
        const hasTimeFirst = /\d{2}:\d{2}:\d{2}\s+\d{1,2}\/\d{1,2}\/\d{4}/.test(answer);
        const hasDateFirst = /\d{1,2}\/\d{1,2}\/\d{4},?\s*\d{2}:\d{2}:\d{2}/.test(answer);
        return hasTimeFirst || hasDateFirst;
      },
    },
  ];

  const outputs = [];

  for (const testCase of cases) {
    const result = await chatWithTools({
      payload: {
        message: testCase.message,
        topK: 4,
      },
      actor,
      requestId: `checklist-${Date.now()}-${testCase.id}`,
    });

    const passed = testCase.validate(result);
    outputs.push({
      id: testCase.id,
      message: testCase.message,
      passed,
      type: result.type,
      answer: result.answer || result.message || '',
      firstProducts: (result.data || []).slice(0, 3).map((item) => item.name || item.id || ''),
      appliedFilters: result?.meta?.appliedFilters || null,
    });
  }

  console.log('=== CHECKLIST RESULTS ===');
  outputs.forEach((item) => {
    console.log(`CASE ${item.id}: ${item.passed ? 'PASS' : 'FAIL'}`);
    console.log(`Q: ${item.message}`);
    console.log(`Type: ${item.type}`);
    console.log(`Answer: ${item.answer}`);
    console.log(`Top products: ${JSON.stringify(item.firstProducts)}`);
    console.log(`Applied filters: ${JSON.stringify(item.appliedFilters)}`);
    console.log('---');
  });

  const failed = outputs.filter((item) => !item.passed);
  if (failed.length > 0) {
    console.log(`TOTAL FAILED: ${failed.length}`);
    process.exitCode = 1;
  } else {
    console.log('ALL CHECKLIST CASES PASSED');
  }

  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error('Checklist test crashed:', error);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore
  }
  process.exit(1);
});
