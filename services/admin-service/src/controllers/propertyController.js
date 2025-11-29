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

      // Validate required fields (accept either title or name)
      // propertyType có default là "apartment" nên không bắt buộc
      if (
        (!propertyData.name && !propertyData.title) ||
        !propertyData.price ||
        !propertyData.description
      ) {
        return res.status(400).json({
          success: false,
          error: "Missing required fields: name/title, description, price",
        });
      }

      // 🔒 SECURITY: Get owner from JWT token (req.user)
      // NEVER trust owner from request body!
      let ownerId = req.user.email.toLowerCase(); // Default: current user

      // ⚠️ Exception: Admin can create property for other users
      if (req.user.role === "admin" && propertyData.ownerId) {
        ownerId = propertyData.ownerId.toLowerCase();
        console.log(`👮 Admin creating property for: ${ownerId}`);
      }

      // Remove owner/ownerId from body to prevent manipulation
      delete propertyData.owner;
      delete propertyData.ownerId;

      // Set owner from authenticated user
      propertyData.owner = ownerId;

      // Set ownerWallet if available
      if (req.user.walletAddress) {
        propertyData.ownerWallet = req.user.walletAddress;
      }

      console.log(
        `🔄 Creating property: ${
          propertyData.title || propertyData.name
        } (Owner: ${ownerId})`
      );

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
   * Get properties by owner (user email or ID)
   */
  async getPropertiesByOwner(req, res) {
    try {
      const owner = req.params.owner.toLowerCase();
      console.log(`🔍 Getting properties for owner: ${owner}`);

      const properties = await propertyService.getPropertiesByOwner(owner);

      console.log(`   ✅ Found ${properties.length} properties`);

      res.json({
        success: true,
        data: properties,
        count: properties.length,
      });
    } catch (error) {
      console.error("❌ Get properties by owner error:", error.message);
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
