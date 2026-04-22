const express = require('express');
const router = express.Router();
const damagePolicyController = require('../controllers/damage-policy.controller');
const {
  requireAuth,
  requireOwner,
  authorize,
} = require('../middleware/auth.middleware');

// Owner/staff đều xem được để áp dụng khi trả đồ
router.get('/', requireAuth, authorize('owner', 'staff'), damagePolicyController.listPolicies);
router.get('/resolve', requireAuth, authorize('owner', 'staff'), damagePolicyController.resolvePolicy);
router.get('/:id', requireAuth, authorize('owner', 'staff'), damagePolicyController.getPolicy);

// Chỉ owner mới CRUD
router.post('/', requireAuth, requireOwner, damagePolicyController.createPolicy);
router.put('/:id', requireAuth, requireOwner, damagePolicyController.updatePolicy);
router.delete('/:id', requireAuth, requireOwner, damagePolicyController.deletePolicy);

module.exports = router;
