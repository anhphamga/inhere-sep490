const express = require('express');
const bookingController = require('../controllers/booking.controller');
const { requireAuth, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/', bookingController.createBooking);
router.get('/', requireAuth, authorize('owner', 'staff'), bookingController.listBookings);
router.patch('/:id/respond', requireAuth, authorize('staff'), bookingController.respondBooking);

module.exports = router;
