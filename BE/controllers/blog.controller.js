/**
 * BLOG CONTROLLER - Xử lý logic nghiệp vụ cho Blog
 * 
 * Copy từ user.controller.js và đổi tên User -> Blog
 * Template này dùng để copy cho các model khác
 */

const Blog = require('../model/Blog.model');

/**
 * Lấy danh sách tất cả blogs
 */
const getAllBlogs = async (req, res) => {
  try {
    const blogs = await Blog.find().sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      message: 'Get all blogs successfully',
      data: blogs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error getting blogs',
      error: error.message
    });
  }
};

module.exports = {
  getAllBlogs
};
