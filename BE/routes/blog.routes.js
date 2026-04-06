const express = require('express');
const blogController = require('../controllers/blog.controller');
const { PERMISSIONS } = require('../access-control/permissions');
const { requireAuth, checkPermission, checkRole } = require('../middleware/auth.middleware');
const { uploadBlogThumbnail } = require('../middleware/upload.middleware');

const router = express.Router();

router.post(
  '/',
  requireAuth,
  checkPermission(PERMISSIONS.blog.post.create),
  blogController.createBlog
);
router.put(
  '/:id',
  requireAuth,
  checkPermission(PERMISSIONS.blog.post.update),
  blogController.updateBlog
);
router.get(
  '/my',
  requireAuth,
  checkPermission(PERMISSIONS.blog.post.view),
  blogController.getMyBlogs
);
router.post(
  '/:id/submit',
  requireAuth,
  checkPermission(PERMISSIONS.blog.post.submit),
  blogController.submitBlog
);
router.post(
  '/upload-thumbnail',
  requireAuth,
  checkPermission(PERMISSIONS.blog.post.create),
  uploadBlogThumbnail,
  blogController.uploadBlogThumbnail
);

router.get(
  '/pending',
  requireAuth,
  checkRole('owner'),
  checkPermission(PERMISSIONS.blog.post.approve),
  blogController.getPendingBlogs
);
router.post(
  '/:id/approve',
  requireAuth,
  checkRole('owner'),
  checkPermission(PERMISSIONS.blog.post.approve),
  blogController.approveBlog
);
router.post(
  '/:id/reject',
  requireAuth,
  checkRole('owner'),
  checkPermission(PERMISSIONS.blog.post.approve),
  blogController.rejectBlog
);
router.post(
  '/:id/publish',
  requireAuth,
  checkRole('owner'),
  checkPermission(PERMISSIONS.blog.post.publish),
  blogController.publishBlog
);
router.delete(
  '/:id',
  requireAuth,
  checkPermission(PERMISSIONS.blog.post.delete),
  blogController.deleteBlog
);

router.get('/', blogController.getPublishedBlogs);
router.get('/:slug', blogController.getPublishedBlogBySlug);

module.exports = router;
