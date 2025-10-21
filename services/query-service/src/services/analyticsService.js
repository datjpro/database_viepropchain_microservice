/**
 * ========================================================================
 * ANALYTICS SERVICE - View tracking & statistics
 * ========================================================================
 */

const { Property, NFT, Analytics } = require("../../../../shared/models");

class AnalyticsService {
  /**
   * Track property view
   */
  async trackView(propertyId, userId) {
    try {
      // Update property view count
      await Property.findByIdAndUpdate(propertyId, {
        $inc: { "analytics.views": 1 },
      });

      // Save analytics
      const analytics = new Analytics({
        type: "view",
        propertyId,
        userId,
        timestamp: new Date(),
      });

      await analytics.save();

      return { success: true };
    } catch (error) {
      throw new Error(`Failed to track view: ${error.message}`);
    }
  }

  /**
   * Get overview statistics
   */
  async getOverviewStats() {
    try {
      const [
        totalProperties,
        totalMinted,
        byType,
        byStatus,
        byCity,
        priceStats,
      ] = await Promise.all([
        Property.countDocuments(),
        Property.countDocuments({ "nft.isMinted": true }),
        Property.aggregate([
          { $group: { _id: "$propertyType", count: { $sum: 1 } } },
        ]),
        Property.aggregate([
          { $group: { _id: "$status", count: { $sum: 1 } } },
        ]),
        Property.aggregate([
          { $group: { _id: "$location.city", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
        ]),
        Property.aggregate([
          {
            $group: {
              _id: null,
              avgPrice: { $avg: "$price.amount" },
              minPrice: { $min: "$price.amount" },
              maxPrice: { $max: "$price.amount" },
            },
          },
        ]),
      ]);

      return {
        totalProperties,
        totalMinted,
        byType,
        byStatus,
        byCity,
        priceStats: priceStats[0] || {},
      };
    } catch (error) {
      throw new Error(`Failed to get statistics: ${error.message}`);
    }
  }

  /**
   * Get price trends
   */
  async getPriceTrends(filters) {
    try {
      const { propertyType, city, days = 30 } = filters;

      const query = {
        createdAt: { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) },
      };

      if (propertyType) query.propertyType = propertyType;
      if (city) query["location.city"] = city;

      const trends = await Property.aggregate([
        { $match: query },
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
              day: { $dayOfMonth: "$createdAt" },
            },
            avgPrice: { $avg: "$price.amount" },
            count: { $sum: 1 },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
      ]);

      return trends;
    } catch (error) {
      throw new Error(`Failed to get price trends: ${error.message}`);
    }
  }
}

module.exports = new AnalyticsService();
