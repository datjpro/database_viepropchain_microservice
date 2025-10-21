/**
 * ========================================================================
 * PROPERTY CONTROLLER - Handle property CRUD requests
 * ========================================================================
 */

const propertyService = require("../services/propertyService");

class PropertyController {
  /**
   * Create property
   */
  async createProperty(req, res) {
    try {
      const propertyData = req.body;

      // Validate required fields
      if (
        !propertyData.name ||
        !propertyData.propertyType ||
        !propertyData.price
      ) {
        return res.status(400).json({
          success: false,
          error: "Missing required fields: name, propertyType, price",
        });
      }

      console.log(`🔄 Creating property: ${propertyData.name}`);

      const property = await propertyService.createProperty(propertyData);

      console.log(`   ✅ Property created: ${property._id}`);

      res.json({
        success: true,
        message: "Property created successfully",
        data: property,
      });
    } catch (error) {
      console.error("❌ Create property error:", error.message);
      res.status(500).json({
        success: false,
        error: "Failed to create property",
        message: error.message,
      });
    }
  }

  /**
   * Get all properties
   */
  async getProperties(req, res) {
    try {
      const result = await propertyService.getProperties(req.query);

      res.json({
        success: true,
        data: result.properties,
        pagination: result.pagination,
      });
    } catch (error) {
      console.error("❌ Get properties error:", error.message);
      res.status(500).json({
        success: false,
        error: "Failed to get properties",
        message: error.message,
      });
    }
  }

  /**
   * Get property by ID
   */
  async getPropertyById(req, res) {
    try {
      const property = await propertyService.getPropertyById(req.params.id);

      res.json({
        success: true,
        data: property,
      });
    } catch (error) {
      console.error("❌ Get property error:", error.message);
      const status = error.message.includes("not found") ? 404 : 500;
      res.status(status).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Update property
   */
  async updateProperty(req, res) {
    try {
      const property = await propertyService.updateProperty(
        req.params.id,
        req.body
      );

      console.log(`✅ Property updated: ${property._id}`);

      res.json({
        success: true,
        message: "Property updated",
        data: property,
      });
    } catch (error) {
      console.error("❌ Update property error:", error.message);
      const status = error.message.includes("not found") ? 404 : 500;
      res.status(status).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Delete property
   */
  async deleteProperty(req, res) {
    try {
      const property = await propertyService.deleteProperty(req.params.id);

      console.log(`✅ Property archived: ${property._id}`);

      res.json({
        success: true,
        message: "Property archived",
      });
    } catch (error) {
      console.error("❌ Delete property error:", error.message);
      const status = error.message.includes("not found") ? 404 : 500;
      res.status(status).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Get statistics
   */
  async getStatistics(req, res) {
    try {
      const stats = await propertyService.getStatistics();

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
}

module.exports = new PropertyController();
