const path = require('path');
const http = require('http');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const seedOwnerAccount = require('./utils/seedOwner');
const { startAutoCancelJob } = require('./utils/autoCancelPendingOrders');
const { startAutoReserveJob } = require('./utils/autoReserveInstances');
const { startAlertJobs } = require('./utils/alertJobs');
const { syncDefaultRoles } = require('./services/accessControl.service');

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

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

// Serve file tĩnh cho hóa đơn PDF (uploads/invoices)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


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
    await syncDefaultRoles();
    await seedOwnerAccount();

    // Bật cron job tự động hủy đơn PendingDeposit quá 30 phút
    startAutoCancelJob();

    // Bật cron job tự động đổi ProductInstance → Reserved khi sắp đến ngày thuê
    startAutoReserveJob();
    startAlertJobs();

    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Server bootstrap failed:', error.message);
    process.exit(1);
  }
};

bootstrap();
