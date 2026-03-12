const express = require('express');
const router = express.Router();

const alertController = require('../controllers/alert.controller');
const { requireAuth, authorize } = require('../middleware/auth.middleware');

router.get('/', requireAuth, authorize('owner', 'staff'), alertController.listAlerts);
router.post('/', requireAuth, authorize('owner', 'staff'), alertController.createAlert);
router.patch('/:id/status', requireAuth, authorize('owner', 'staff'), alertController.updateAlertStatus);

module.exports = router;
