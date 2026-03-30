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
      id: 'T1',
      message: 'tim do con hang',
      validate: (r) => r?.type === 'PRODUCT_LIST' && r?.meta?.appliedFilters?.inStock === true,
    },
    {
      id: 'T2',
      message: 'tim ao duoi 1 trieu',
      validate: (r) => Number(r?.meta?.appliedFilters?.priceMax) === 1000000,
    },
    {
      id: 'T3',
      message: 'tim ao trong khoang 700k toi 2tr',
      validate: (r) => Number(r?.meta?.appliedFilters?.priceMin) === 700000 && Number(r?.meta?.appliedFilters?.priceMax) === 2000000,
    },
    {
      id: 'T4',
      message: 'tim ao min 800k',
      validate: (r) => Number(r?.meta?.appliedFilters?.priceMin) === 800000,
    },
    {
      id: 'T5',
      message: 'tim ao 1500k',
      validate: (r) => Number(r?.meta?.appliedFilters?.priceMin) > 0 && Number(r?.meta?.appliedFilters?.priceMax) > 0,
    },
    {
      id: 'T6',
      message: 'tim ao den, xanh',
      validate: (r) => normalize(r?.meta?.appliedFilters?.color).includes('den') && normalize(r?.meta?.appliedFilters?.color).includes('xanh'),
    },
    {
      id: 'T7',
      message: 'tim ao den',
      validate: (r) => normalize(r?.meta?.appliedFilters?.color) === 'den',
    },
    {
      id: 'T8',
      message: 'tim ao mau vang size l duoi 2 trieu',
      validate: (r) => String(r?.meta?.appliedFilters?.size || '').toUpperCase() === 'L' && normalize(r?.meta?.appliedFilters?.color) === 'vang' && Number(r?.meta?.appliedFilters?.priceMax) === 2000000,
    },
    {
      id: 'T9',
      message: 'tim ao mau cam neon size xxxl gia duoi 100k',
      validate: (r) => String(r?.meta?.appliedFilters?.size || '').toUpperCase() === 'XXXL' && normalize(r?.meta?.appliedFilters?.color).includes('cam') && Number(r?.meta?.appliedFilters?.priceMax) === 100000,
    },
    {
      id: 'T10',
      message: 'tim cac don thue va mua cua toi',
      validate: (r) => r?.type === 'ORDER' && !normalize(r?.message || '').includes('don thue gan day') && !normalize(r?.message || '').includes('don mua gan day'),
    },
    {
      id: 'T11',
      message: 'tim don mua va thue',
      validate: (r) => r?.type === 'ORDER' && !normalize(r?.message || '').includes('don thue gan day') && !normalize(r?.message || '').includes('don mua gan day'),
    },
    {
      id: 'T12',
      message: 'tim ao dai do tu 1m-3m',
      validate: (r) => normalize(r?.meta?.appliedFilters?.color) === 'do'
        && Number(r?.meta?.appliedFilters?.priceMin) === 1000000
        && Number(r?.meta?.appliedFilters?.priceMax) === 3000000
        && r?.meta?.appliedFilters?.sortBy === 'price'
        && r?.meta?.appliedFilters?.sortOrder === 'desc',
    },
    {
      id: 'T13',
      message: 'tim ao tren 1m',
      validate: (r) => Number(r?.meta?.appliedFilters?.priceMin) === 1000000
        && r?.meta?.appliedFilters?.sortBy === 'price'
        && r?.meta?.appliedFilters?.sortOrder === 'desc',
    },
    {
      id: 'T14',
      message: 'cach su dung cac voucher do',
      validate: (r) => r?.type === 'TEXT'
        && normalize(r?.answer || '').includes('de dung voucher')
        && normalize(r?.answer || '').includes('thanh toan'),
    },
    {
      id: 'T15',
      message: 'cach dat lich thuu do',
      validate: (r) => r?.type === 'TEXT'
        && normalize(r?.answer || '').includes('de dat lich thu do')
        && normalize(r?.answer || '').includes('pending'),
    },
    {
      id: 'T16',
      message: 'cach dat lich thu do',
      validate: (r) => r?.type === 'TEXT'
        && normalize(r?.answer || '').includes('de dat lich thu do')
        && normalize(r?.answer || '').includes('timeslot'),
    },
  ];

  const outputs = [];

  for (let i = 0; i < cases.length; i += 1) {
    const item = cases[i];
    const result = await chatWithTools({
      payload: { message: item.message, topK: 4 },
      actor,
      requestId: `customer-transcript-${Date.now()}-${i}`,
    });

    outputs.push({
      id: item.id,
      message: item.message,
      type: result?.type,
      passed: item.validate(result),
      answer: result?.answer || result?.message || '',
      filters: result?.meta?.appliedFilters || null,
      top: (result?.data || []).slice(0, 3).map((x) => ({ name: x?.name || x?.id || '', price: x?.price })),
    });
  }

  console.log('=== CUSTOMER TRANSCRIPT CASES ===');
  outputs.forEach((item) => {
    console.log(`${item.id}: ${item.passed ? 'PASS' : 'FAIL'}`);
    console.log(`Q: ${item.message}`);
    console.log(`TYPE: ${item.type}`);
    console.log(`ANSWER: ${item.answer}`);
    console.log(`FILTERS: ${JSON.stringify(item.filters)}`);
    console.log(`TOP: ${JSON.stringify(item.top)}`);
    console.log('---');
  });

  const failed = outputs.filter((item) => !item.passed);
  if (failed.length > 0) {
    console.log(`TOTAL FAILED: ${failed.length}`);
    process.exitCode = 1;
  } else {
    console.log('ALL CUSTOMER TRANSCRIPT CASES PASSED');
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
