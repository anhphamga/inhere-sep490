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
      id: 'Z1',
      message: 'ao 0dd',
      validate: (r) => Number(r?.meta?.appliedFilters?.priceMax) === 0 && (r?.data || []).length > 0,
    },
    {
      id: 'Z2',
      message: 'ao ovnd',
      validate: (r) => Number(r?.meta?.appliedFilters?.priceMax) === 0 && (r?.data || []).length > 0,
    },
    {
      id: 'Z3',
      message: 'ao o vnd',
      validate: (r) => Number(r?.meta?.appliedFilters?.priceMax) === 0 && (r?.data || []).length > 0,
    },
    {
      id: 'Z4',
      message: 'ao free',
      validate: (r) => Number(r?.meta?.appliedFilters?.priceMax) === 0,
    },
    {
      id: 'Z5',
      message: 'ao mien phi',
      validate: (r) => Number(r?.meta?.appliedFilters?.priceMax) === 0,
    },
    {
      id: 'S1',
      message: 'tim ao gia tu thap den cao',
      validate: (r) => r?.meta?.appliedFilters?.sortBy === 'price' && r?.meta?.appliedFilters?.sortOrder === 'asc',
    },
    {
      id: 'S2',
      message: 'tim ao gia tu cao den thap',
      validate: (r) => r?.meta?.appliedFilters?.sortBy === 'price' && r?.meta?.appliedFilters?.sortOrder === 'desc',
    },
    {
      id: 'C1',
      message: 'tim ao red',
      validate: (r) => normalize(r?.meta?.appliedFilters?.color) === 'do',
    },
    {
      id: 'C2',
      message: 'tim ao black',
      validate: (r) => normalize(r?.meta?.appliedFilters?.color) === 'den',
    },
    {
      id: 'C3',
      message: 'tim ao yellow',
      validate: (r) => normalize(r?.meta?.appliedFilters?.color) === 'vang',
    },
    {
      id: 'SZ1',
      message: 'tim ao sz m mau do',
      validate: (r) => String(r?.meta?.appliedFilters?.size || '').toUpperCase() === 'M' && normalize(r?.meta?.appliedFilters?.color) === 'do',
    },
    {
      id: 'SZ2',
      message: 'tim ao size:m',
      validate: (r) => String(r?.meta?.appliedFilters?.size || '').toUpperCase() === 'M',
    },
    {
      id: 'N1',
      message: 'tim voan cai toc co dau',
      validate: (r) => r?.type === 'PRODUCT_LIST' && (r?.data || []).length > 0,
    },
    {
      id: 'N2',
      message: 'voan cai toc co dau',
      validate: (r) => r?.type === 'PRODUCT_LIST' && (r?.data || []).length > 0,
    },
  ];

  const outputs = [];
  for (let i = 0; i < cases.length; i += 1) {
    const testCase = cases[i];
    const result = await chatWithTools({
      payload: {
        message: testCase.message,
        topK: 4,
      },
      actor,
      requestId: `semantic-variants-${Date.now()}-${i}`,
    });

    outputs.push({
      id: testCase.id,
      message: testCase.message,
      type: result?.type,
      passed: testCase.validate(result),
      answer: result?.answer || result?.message || '',
      top: (result?.data || []).slice(0, 3).map((x) => ({ name: x?.name || x?.id || '', price: x?.price })),
      filters: result?.meta?.appliedFilters || null,
    });
  }

  console.log('=== SEARCH SEMANTIC VARIANTS ===');
  outputs.forEach((item) => {
    console.log(`${item.id}: ${item.passed ? 'PASS' : 'FAIL'}`);
    console.log(`Q: ${item.message}`);
    console.log(`TYPE: ${item.type}`);
    console.log(`ANSWER: ${item.answer}`);
    console.log(`TOP: ${JSON.stringify(item.top)}`);
    console.log(`FILTERS: ${JSON.stringify(item.filters)}`);
    console.log('---');
  });

  const failed = outputs.filter((item) => !item.passed);
  if (failed.length > 0) {
    console.log(`TOTAL FAILED: ${failed.length}`);
    process.exitCode = 1;
  } else {
    console.log('ALL SEARCH SEMANTIC VARIANTS PASSED');
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
