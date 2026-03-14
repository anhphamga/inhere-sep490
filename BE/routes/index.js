/**
 * FILE TAP HOP TAT CA ROUTES
 * File nay import tat ca routes va export cho server.js
 */

const express = require('express');
const router = express.Router();

const userRoutes = require('./user.routes');
const authRoutes = require('./auth.routes');
const blogRoutes = require('./blog.routes');
const categoryRoutes = require('./category.routes');
const productRoutes = require('./product.routes');
const ownerRoutes = require('./owner.routes');
const bannerRoutes = require('./banner.routes');
const rentOrderRoutes = require('./rent-order.routes');
const alertRoutes = require('./alert.routes');
const fittingBookingRoutes = require('./fitting-booking.routes');
const virtualTryOnRoutes = require('./virtual-try-on.routes');
const guestRoutes = require('./guest.routes');
const orderRoutes = require('./order.routes');

router.use('/users', userRoutes);
router.use('/auth', authRoutes);
router.use('/blogs', blogRoutes);
router.use('/categories', categoryRoutes);
router.use('/products', productRoutes);
router.use('/owner', ownerRoutes);
router.use('/banners', bannerRoutes);
router.use('/rent-orders', rentOrderRoutes);
router.use('/alerts', alertRoutes);
router.use('/fitting-bookings', fittingBookingRoutes);
router.use('/virtual-try-on', virtualTryOnRoutes);
router.use('/guest', guestRoutes);
router.use('/orders', orderRoutes);

module.exports = router;
