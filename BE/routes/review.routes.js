const express = require('express');
const reviewController = require('../controllers/review.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/product/:productId', reviewController.getProductReviews);
router.get('/product/:productId/summary', reviewController.getProductReviewSummary);
router.get('/my', authenticate, reviewController.getMyReviews);
router.get('/can-review', authenticate, reviewController.canReview);
router.post('/', authenticate, reviewController.createReview);
router.put('/:id', authenticate, reviewController.updateReview);
router.get('/admin/stats/summary', authenticate, authorize('owner', 'staff'), reviewController.getAdminReviewStatsSummary);
router.get('/admin', authenticate, authorize('owner', 'staff'), reviewController.getAdminReviews);
router.get('/admin/:id', authenticate, authorize('owner', 'staff'), reviewController.getAdminReviewDetail);
router.patch('/admin/:id/status', authenticate, authorize('owner', 'staff'), reviewController.patchAdminReviewStatus);
router.patch('/admin/:id/hide', authenticate, authorize('owner', 'staff'), reviewController.patchAdminHideReview);
router.patch('/admin/:id/reply', authenticate, authorize('owner', 'staff'), reviewController.patchAdminReply);
router.delete('/admin/:id/reply', authenticate, authorize('owner', 'staff'), reviewController.deleteAdminReply);

module.exports = router;
