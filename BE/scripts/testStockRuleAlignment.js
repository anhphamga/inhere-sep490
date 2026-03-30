require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Product = require('../model/Product.model');
const ProductInstance = require('../model/ProductInstance.model');
const User = require('../model/User.model');
const { chatWithTools } = require('../modules/chatbot/services/chatbot.toolflow.service');

const run = async () => {
  await connectDB();

  const [totalProducts, productsWithVariantPositive, totalInstances, availableInstances] = await Promise.all([
    Product.countDocuments({ isDraft: { $ne: true } }),
    Product.countDocuments({ isDraft: { $ne: true }, variantMatrix: { $elemMatch: { quantity: { $gt: 0 } } } }),
    ProductInstance.countDocuments({}),
    ProductInstance.countDocuments({ lifecycleStatus: 'Available' }),
  ]);

  const actorUser = await User.findOne({ role: 'customer', status: 'active' }).lean();
  if (!actorUser) {
    throw new Error('No active customer found');
  }

  const actor = {
    id: String(actorUser._id),
    role: actorUser.role,
    email: actorUser.email,
  };

  const searchResult = await chatWithTools({
    payload: {
      message: 'tim do con hang',
      topK: 5,
    },
    actor,
    requestId: `stock-rule-${Date.now()}`,
  });

  console.log('=== STOCK RULE ALIGNMENT ===');
  console.log(JSON.stringify({
    totalProducts,
    productsWithVariantPositive,
    totalInstances,
    availableInstances,
    chatbotType: searchResult?.type,
    chatbotMessage: searchResult?.message || searchResult?.answer || '',
    chatbotFilters: searchResult?.meta?.appliedFilters || null,
    topNames: (searchResult?.data || []).slice(0, 5).map((p) => p?.name || p?.id || ''),
  }, null, 2));

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
