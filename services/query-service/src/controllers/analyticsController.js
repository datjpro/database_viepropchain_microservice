/**
 * ========================================================================
 * ANALYTICS CONTROLLER
 * ========================================================================
 */

const analyticsService = require("../services/analyticsService");

class AnalyticsController {
  /**
   * Track view
   */
  async trackView(req, res) {
    try {
      const { userId } = req.body;

      await analyticsService.trackView(req.params.id, userId);

      res.json({
        success: true,
        message: "View tracked",
      });
    } catch (error) {
      console.error("❌ Track view error:", error.message);
      res.status(500).json({
        success: false,
        error: "Failed to track view",
        message: error.message,
      });
    }
  }

  /**
   * Get overview stats
   */
  async getOverviewStats(req, res) {
    try {
      const stats = await analyticsService.getOverviewStats();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error("❌ Get stats error:", error.message);
      res.status(500).json({
        success: false,
        error: "Failed to get statistics",
        message: error.message,
      });
    }
  }

  /**
   * Get price trends
   */
  async getPriceTrends(req, res) {
    try {
      const filters = {
        propertyType: req.query.propertyType,
        city: req.query.city,
        days: req.query.days || 30,
      };

      const trends = await analyticsService.getPriceTrends(filters);

      res.json({
        success: true,
        data: trends,
      });
    } catch (error) {
      console.error("❌ Get price trends error:", error.message);
      res.status(500).json({
        success: false,
        error: "Failed to get price trends",
        message: error.message,
      });
    }
  }
}

module.exports = new AnalyticsController();
