require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../model/User.model');
const { chatWithTools } = require('../modules/chatbot/services/chatbot.toolflow.service');

const cases = [
  'tìm cho tôi những áo dài đỏ size m trên 1 triệu',
  'áo 0dd',
  'áo 0 d',
  'áo 0 vnd',
  'Có thể hủy đơn thuê khi nào?',
  'Sự khác nhau giữa thuê và mua ở shop là gì?',
  'tìm cho tôi những áo từ rẻ đến đắt',
  'tìm cho tôi những áo 0đ',
  'tìm cho tôi những áo màu vàng',
  'tìm cho tôi những áo màu đỏ',
  'shop có những loại trang phục nào',
  'Tôi có đơn thuê nào không và chính sách trả trễ là gì?',
];

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

  for (let i = 0; i < cases.length; i += 1) {
    const q = cases[i];
    const result = await chatWithTools({
      payload: { message: q, topK: 4 },
      actor,
      requestId: `user-reported-${Date.now()}-${i}`,
    });

    const answer = result.answer || result.message || '';
    const top = (result.data || []).slice(0, 4).map((x) => ({ name: x.name || x.id || '', price: x.price }));
    console.log(`CASE ${i + 1}`);
    console.log(`Q: ${q}`);
    console.log(`TYPE: ${result.type}`);
    console.log(`ANSWER: ${answer}`);
    console.log(`TOP: ${JSON.stringify(top)}`);
    console.log(`FILTERS: ${JSON.stringify(result?.meta?.appliedFilters || null)}`);
    console.log('---');
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
