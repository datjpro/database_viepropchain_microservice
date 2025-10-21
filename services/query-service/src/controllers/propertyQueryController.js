/**
 * ========================================================================
 * PROPERTY QUERY CONTROLLER
 * ========================================================================
 */

const propertyQueryService = require("../services/propertyQueryService");

class PropertyQueryController {
  /**
   * Search properties
   */
  async searchProperties(req, res) {
    try {
      const filters = {
        search: req.query.search,
        propertyType: req.query.propertyType,
        status: req.query.status,
        city: req.query.city,
        district: req.query.district,
        ward: req.query.ward,
        minPrice: req.query.minPrice,
        maxPrice: req.query.maxPrice,
        minArea: req.query.minArea,
        maxArea: req.query.maxArea,
        bedrooms: req.query.bedrooms,
        legalStatus: req.query.legalStatus,
        isMinted: req.query.isMinted,
      };

      const pagination = {
        page: req.query.page || 1,
        limit: req.query.limit || 20,
        sortBy: req.query.sortBy || "createdAt",
        sortOrder: req.query.sortOrder || "desc",
      };

      const result = await propertyQueryService.searchProperties(
        filters,
        pagination
      );

      res.json({
        success: true,
        data: result.properties,
        pagination: result.pagination,
      });
    } catch (error) {
      console.error("❌ Search error:", error.message);
      res.status(500).json({
        success: false,
        error: "Failed to search properties",
        message: error.message,
      });
    }
  }

  /**
   * Get property by ID
   */
  async getPropertyById(req, res) {
    try {
      const property = await propertyQueryService.getPropertyById(
        req.params.id
      );

      res.json({
        success: true,
        data: property,
      });
    } catch (error) {
      console.error("❌ Get property error:", error.message);
      const status = error.message.includes("not found") ? 404 : 500;
      res.status(status).json({
        success: false,
        error: "Failed to get property",
        message: error.message,
      });
    }
  }

  /**
   * Get featured properties
   */
  async getFeaturedProperties(req, res) {
    try {
      const { limit = 10 } = req.query;

      const properties = await propertyQueryService.getFeaturedProperties(
        limit
      );

      res.json({
        success: true,
        data: properties,
      });
    } catch (error) {
      console.error("❌ Get featured error:", error.message);
      res.status(500).json({
        success: false,
        error: "Failed to get featured properties",
        message: error.message,
      });
    }
  }

  /**
   * Get cities
   */
  async getCities(req, res) {
    try {
      const cities = await propertyQueryService.getCities();

      res.json({
        success: true,
        data: cities,
      });
    } catch (error) {
      console.error("❌ Get cities error:", error.message);
      res.status(500).json({
        success: false,
        error: "Failed to get cities",
        message: error.message,
      });
    }
  }

  /**
   * Get districts
   */
  async getDistricts(req, res) {
    try {
      const { city } = req.query;

      const districts = await propertyQueryService.getDistricts(city);

      res.json({
        success: true,
        data: districts,
      });
    } catch (error) {
      console.error("❌ Get districts error:", error.message);
      res.status(500).json({
        success: false,
        error: "Failed to get districts",
        message: error.message,
      });
    }
  }
}

module.exports = new PropertyQueryController();
