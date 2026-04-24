const shiftAnalyticsService = require('../services/shiftAnalytics.service');

const getOverview = async (req, res) => {
  try {
    const { startDate, endDate } = req.query || {};
    const data = await shiftAnalyticsService.getShiftAnalyticsOverview({ startDate, endDate });
    return res.json({
      success: true,
      message: 'Lấy tổng quan ca làm thành công.',
      data,
    });
  } catch (error) {
    const statusCode = error?.statusCode || 500;
    if (statusCode !== 500) {
      return res.status(statusCode).json({
        success: false,
        message: error?.message || 'Dữ liệu không hợp lệ.',
      });
    }
    console.error('Shift analytics overview error:', error);
    return res.status(500).json({
      success: false,
      message: 'Không thể lấy tổng quan lúc này.',
    });
  }
};

const getRevenueByShift = async (req, res) => {
  try {
    const { startDate, endDate, groupBy } = req.query || {};
    const data = await shiftAnalyticsService.getRevenueByShift({ startDate, endDate, groupBy });
    return res.json({
      success: true,
      message: 'Lấy doanh thu theo ca thành công.',
      data,
    });
  } catch (error) {
    const statusCode = error?.statusCode || 500;
    if (statusCode !== 500) {
      return res.status(statusCode).json({
        success: false,
        message: error?.message || 'Dữ liệu không hợp lệ.',
      });
    }
    console.error('Shift analytics revenue-by-shift error:', error);
    return res.status(500).json({
      success: false,
      message: 'Không thể lấy doanh thu lúc này.',
    });
  }
};

const getStaffPerformance = async (req, res) => {
  try {
    const { startDate, endDate } = req.query || {};
    const data = await shiftAnalyticsService.getStaffPerformance({ startDate, endDate });
    return res.json({
      success: true,
      message: 'Lấy hiệu suất nhân sự thành công.',
      data,
    });
  } catch (error) {
    const statusCode = error?.statusCode || 500;
    if (statusCode !== 500) {
      return res.status(statusCode).json({
        success: false,
        message: error?.message || 'Dữ liệu không hợp lệ.',
      });
    }
    console.error('Shift analytics staff-performance error:', error);
    return res.status(500).json({
      success: false,
      message: 'Không thể lấy hiệu suất lúc này.',
    });
  }
};

const getPeakShifts = async (req, res) => {
  try {
    const { startDate, endDate, metric } = req.query || {};
    const data = await shiftAnalyticsService.getPeakShifts({ startDate, endDate, metric });
    return res.json({
      success: true,
      message: 'Lấy ca cao điểm thành công.',
      data,
    });
  } catch (error) {
    const statusCode = error?.statusCode || 500;
    if (statusCode !== 500) {
      return res.status(statusCode).json({
        success: false,
        message: error?.message || 'Dữ liệu không hợp lệ.',
      });
    }
    console.error('Shift analytics peak-shifts error:', error);
    return res.status(500).json({
      success: false,
      message: 'Không thể lấy ca cao điểm lúc này.',
    });
  }
};

const getDailySummary = async (req, res) => {
  try {
    const { startDate, endDate } = req.query || {};
    const data = await shiftAnalyticsService.getDailySummary({ startDate, endDate });
    return res.json({
      success: true,
      message: 'Lấy tổng hợp theo ngày thành công.',
      data,
    });
  } catch (error) {
    const statusCode = error?.statusCode || 500;
    if (statusCode !== 500) {
      return res.status(statusCode).json({
        success: false,
        message: error?.message || 'Dữ liệu không hợp lệ.',
      });
    }
    console.error('Shift analytics daily-summary error:', error);
    return res.status(500).json({
      success: false,
      message: 'Không thể lấy tổng hợp lúc này.',
    });
  }
};

module.exports = {
  getOverview,
  getRevenueByShift,
  getStaffPerformance,
  getPeakShifts,
  getDailySummary,
};
