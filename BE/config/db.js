const mongoose = require('mongoose');
const { syncModelIndexes } = require('../model');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);

    await syncModelIndexes();

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    console.log('All indexes synced');
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
