const express = require('express');
const shiftController = require('../controllers/shift.controller');
const { requireAuth, requireOwner, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

// POST /api/shifts (OWNER)
router.post('/', requireAuth, requireOwner, shiftController.createShift);

// GET /api/shifts (OWNER/STAFF)
router.get('/', requireAuth, authorize('owner', 'staff'), shiftController.getShifts);

// POST /api/shifts/register (STAFF)
router.post('/register', requireAuth, authorize('staff'), shiftController.registerShift);

// GET /api/shifts/my-registrations (STAFF)
router.get('/my-registrations', requireAuth, authorize('staff'), shiftController.getMyShiftRegistrations);

// GET /api/shifts/current (STAFF)
router.get('/current', requireAuth, authorize('staff'), shiftController.getCurrentShift);

// POST /api/shifts/approve (OWNER) - approve/reject
router.post('/approve', requireAuth, requireOwner, shiftController.approveShiftRegistration);

// POST /api/shifts/check-in (STAFF)
router.post('/check-in', requireAuth, authorize('staff'), shiftController.checkIn);

// POST /api/shifts/check-out (STAFF)
router.post('/check-out', requireAuth, authorize('staff'), shiftController.checkOut);

// POST /api/shifts/undo-checkout (STAFF)
router.post('/undo-checkout', requireAuth, authorize('staff'), shiftController.undoCheckout);

// POST /api/shifts/:shiftId/close (OWNER)
router.post('/:shiftId/close', requireAuth, requireOwner, shiftController.closeShift);

// GET /api/shifts/:shiftId/registrations (OWNER)
router.get('/:shiftId/registrations', requireAuth, requireOwner, shiftController.getShiftRegistrations);

module.exports = router;
