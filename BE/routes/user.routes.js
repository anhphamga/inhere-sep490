/**
 * USER ROUTES - Định nghĩa các endpoints cho User
 * 
 * Routes CHỈ định tuyến, KHÔNG chứa logic
 * Logic xử lý nằm trong controller
 */

const express = require('express');
const router = express.Router();

// Import controller
const userController = require('../controllers/user.controller');

// GET /api/users - Lấy danh sách users (TEMPLATE)
router.get('/', userController.getAllUsers);

module.exports = router;
