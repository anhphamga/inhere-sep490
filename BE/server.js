require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const seedOwnerAccount = require('./utils/seedOwner');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Home route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to InHere API' });
});

/**
 * LUỒNG ROUTES:
 * server.js -> import routes/index.js -> routes/index.js import các routes con (user.routes, blog.routes...)
 */
const routes = require('./routes');
app.use('/api', routes);  // Tất cả API sẽ có prefix /api



// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

const PORT = process.env.PORT || 9000;

const bootstrap = async () => {
  try {
    await connectDB();
    await seedOwnerAccount();

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Server bootstrap failed:', error.message);
    process.exit(1);
  }
};

bootstrap();
