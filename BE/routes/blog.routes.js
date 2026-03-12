const express = require('express');
const router = express.Router();

const blogController = require('../controllers/blog.controller');

// GET /api/blogs?scope=all
router.get('/', blogController.getAllBlogs);
// GET /api/blogs/:id
router.get('/:id', blogController.getBlogById);
// POST /api/blogs
router.post('/', blogController.createBlog);
// PUT /api/blogs/:id
router.put('/:id', blogController.updateBlog);
// DELETE /api/blogs/:id
router.delete('/:id', blogController.deleteBlog);

module.exports = router;
