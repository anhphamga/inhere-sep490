const mongoose = require('mongoose');
const User = require('../model/User.model');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);

    await User.syncIndexes();

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    console.log('User indexes synced');
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
