/**
 * BLOG ROUTES - Định nghĩa các endpoints cho Blog
 * 
 * Routes CHỈ định tuyến, KHÔNG chứa logic
 * Logic xử lý nằm trong controller
 */

const express = require('express');
const router = express.Router();

// Import controller
const blogController = require('../controllers/blog.controller');

// GET /api/blogs - Lấy danh sách blogs
router.get('/', blogController.getAllBlogs);

module.exports = router;
