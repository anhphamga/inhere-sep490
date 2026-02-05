/**
 * USER CONTROLLER - Xử lý logic nghiệp vụ cho User
 * 
 * Controller chứa LOGIC, routes chỉ ĐỊNH TUYẾN
 * Template này dùng để copy cho các model khác
 */

const User = require('../model/User.model');

/**
 * Lấy danh sách tất cả users (TEMPLATE)
 */
const getAllUsers = async (req, res) => {
  try {
    // Logic xử lý ở đây
    const users = await User.find();
    
    res.status(200).json({
      success: true,
      message: 'Get all users successfully',
      data: users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error getting users',
      error: error.message
    });
  }
};

// Export function
module.exports = {
  getAllUsers
};
