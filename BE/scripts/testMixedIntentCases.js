require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../model/User.model');
const { chatWithTools } = require('../modules/chatbot/services/chatbot.toolflow.service');

const cases = [
  'tìm cho tôi những áo dài size M còn hàng và giá trên 1 triệu',
  'tim ao dai size m mau do con hang duoi 1tr',
  'các voucher của tôi',
  'muốn thuê cần có những cái gì',
  'quy tắc thuê của cửa hàng',
  'shop có những loại trang phục nào',
  'luồng thuê',
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

  for (let index = 0; index < cases.length; index += 1) {
    const message = cases[index];
    const result = await chatWithTools({
      payload: { message, topK: 4 },
      actor,
      requestId: `mixed-${Date.now()}-${index}`,
    });

    const summary = result.answer || result.message || '';
    const productNames = (result.data || []).slice(0, 3).map((item) => item.name || item.id || '');

    console.log(`CASE ${index + 1}`);
    console.log(`Q: ${message}`);
    console.log(`TYPE: ${result.type}`);
    console.log(`SUMMARY: ${summary}`);
    console.log(`TOP: ${JSON.stringify(productNames)}`);
    console.log('---');
  }

  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error(error);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore
  }
  process.exit(1);
});
