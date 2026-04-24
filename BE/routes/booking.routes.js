const express = require('express');
const bookingController = require('../controllers/booking.controller');
const { requireAuth, authorize } = require('../middleware/auth.middleware');
const { requireActiveShiftForStaff } = require('../middleware/activeShift.middleware');

const router = express.Router();

router.post('/', bookingController.createBooking);
router.get('/', requireAuth, requireActiveShiftForStaff, authorize('owner', 'staff'), bookingController.listBookings);
router.patch('/:id/respond', requireAuth, requireActiveShiftForStaff, authorize('staff'), bookingController.respondBooking);

module.exports = router;
