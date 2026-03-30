const express = require('express');
const router = express.Router();

const fittingBookingController = require('../controllers/fitting-booking.controller');
const { requireAuth, authorize } = require('../middleware/auth.middleware');

router.get('/', requireAuth, authorize('owner', 'staff'), fittingBookingController.listBookings);
router.post('/', requireAuth, authorize('customer'), fittingBookingController.createBooking);
router.patch('/:id', requireAuth, authorize('staff'), fittingBookingController.updateBookingStatus);

module.exports = router;
