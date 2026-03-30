require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../model/User.model');
const { chatWithTools } = require('../modules/chatbot/services/chatbot.toolflow.service');

const normalize = (value) => String(value || '')
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/g, 'd')
  .trim();

const run = async () => {
  await connectDB();

  const actorUser = await User.findOne({ role: 'customer', status: 'active' }).lean();
  if (!actorUser) {
    throw new Error('No active customer found');
  }

  const actor = {
    id: String(actorUser._id),
    role: actorUser.role,
    email: actorUser.email,
  };

  const cases = [
    {
      id: 'P1',
      message: 'ao 0dd',
      validate: (result) => Number(result?.meta?.appliedFilters?.priceMax) === 0 && (result?.data || []).length > 0,
    },
    {
      id: 'P2',
      message: 'ao 0d',
      validate: (result) => Number(result?.meta?.appliedFilters?.priceMax) === 0 && (result?.data || []).length > 0,
    },
    {
      id: 'P3',
      message: 'ao 0 vnd',
      validate: (result) => Number(result?.meta?.appliedFilters?.priceMax) === 0 && (result?.data || []).length > 0,
    },
    {
      id: 'P4',
      message: 'tim ao mau do',
      validate: (result) => normalize(result?.meta?.appliedFilters?.color) === 'do' && (result?.data || []).length > 0,
    },
    {
      id: 'P5',
      message: 'tim ao tu re den dat',
      validate: (result) => result?.meta?.appliedFilters?.sortBy === 'price' && result?.meta?.appliedFilters?.sortOrder === 'asc',
    },
    {
      id: 'O1',
      message: 'don thue cua toi',
      validate: (result) => result?.type === 'ORDER',
    },
    {
      id: 'U1',
      message: 'thong tin tai khoan cua toi',
      validate: (result) => result?.type === 'USER' || result?.type === 'TEXT',
    },
  ];

  const outputs = [];

  for (let i = 0; i < cases.length; i += 1) {
    const item = cases[i];
    const result = await chatWithTools({
      payload: { message: item.message, topK: 4 },
      actor,
      requestId: `search-hardening-${Date.now()}-${i}`,
    });

    const passed = item.validate(result);
    outputs.push({
      id: item.id,
      message: item.message,
      passed,
      type: result?.type,
      answer: result?.answer || result?.message || '',
      top: (result?.data || []).slice(0, 3).map((p) => ({ name: p?.name || p?.id || '', price: p?.price })),
      filters: result?.meta?.appliedFilters || null,
    });
  }

  console.log('=== SEARCH HARDENING RESULTS ===');
  outputs.forEach((o) => {
    console.log(`${o.id}: ${o.passed ? 'PASS' : 'FAIL'}`);
    console.log(`Q: ${o.message}`);
    console.log(`TYPE: ${o.type}`);
    console.log(`ANSWER: ${o.answer}`);
    console.log(`TOP: ${JSON.stringify(o.top)}`);
    console.log(`FILTERS: ${JSON.stringify(o.filters)}`);
    console.log('---');
  });

  const failed = outputs.filter((o) => !o.passed);
  if (failed.length > 0) {
    console.log(`TOTAL FAILED: ${failed.length}`);
    process.exitCode = 1;
  } else {
    console.log('ALL SEARCH HARDENING CASES PASSED');
  }

  await mongoose.disconnect();
};

run().catch(async (err) => {
  console.error(err);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore
  }
  process.exit(1);
});
