/**
 * FILE TẬP HỢP TẤT CẢ ROUTES
 * File này sẽ import tất cả routes của các model và export ra
 * server.js chỉ cần import file này là có tất cả routes
 */

const express = require('express');
const router = express.Router();

// Import routes của từng model
const userRoutes = require('./user.routes');
const blogRoutes = require('./blog.routes');
const categoryRoutes = require('./category.routes');
const productRoutes = require('./product.routes');
// const orderRoutes = require('./order.routes');
// ... thêm các routes khác ở đây

// Mount routes với prefix cho từng module
router.use('/users', userRoutes);
router.use('/blogs', blogRoutes);
router.use('/categories', categoryRoutes);
router.use('/products', productRoutes);
// router.use('/orders', orderRoutes);
// ... thêm prefix tương ứng

module.exports = router;
