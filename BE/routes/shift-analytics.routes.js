const express = require('express');
const shiftAnalyticsController = require('../controllers/shift-analytics.controller');
const { requireAuth, requireOwner } = require('../middleware/auth.middleware');

const router = express.Router();

// OWNER only
router.get('/overview', requireAuth, requireOwner, shiftAnalyticsController.getOverview);
router.get('/revenue-by-shift', requireAuth, requireOwner, shiftAnalyticsController.getRevenueByShift);
router.get('/staff-performance', requireAuth, requireOwner, shiftAnalyticsController.getStaffPerformance);
router.get('/peak-shifts', requireAuth, requireOwner, shiftAnalyticsController.getPeakShifts);
router.get('/daily-summary', requireAuth, requireOwner, shiftAnalyticsController.getDailySummary);

module.exports = router;

