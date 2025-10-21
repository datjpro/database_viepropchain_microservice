/**
 * ========================================================================
 * PROPERTY SERVICE - Business logic for property CRUD
 * ========================================================================
 */

const Property = require("../models/Property");

class PropertyService {
  /**
   * Create new property
   */
  async createProperty(propertyData) {
    try {
      const property = new Property({
        ...propertyData,
        status: "draft",
        createdAt: new Date(),
      });

      await property.save();
      return property;
    } catch (error) {
      throw new Error(`Failed to create property: ${error.message}`);
    }
  }

  /**
   * Get all properties with filters
   */
  async getProperties(filters = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        propertyType,
        status,
        city,
        minPrice,
        maxPrice,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = filters;

      // Build query
      const query = {};

      if (propertyType) query.propertyType = propertyType;
      if (status) query.status = status;
      if (city) query["location.city"] = city;
      if (minPrice || maxPrice) {
        query["price.amount"] = {};
        if (minPrice) query["price.amount"].$gte = Number(minPrice);
        if (maxPrice) query["price.amount"].$lte = Number(maxPrice);
      }

      // Execute query
      const skip = (page - 1) * limit;
      const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

      const [properties, total] = await Promise.all([
        Property.find(query).sort(sort).skip(skip).limit(Number(limit)),
        Property.countDocuments(query),
      ]);

      return {
        properties,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw new Error(`Failed to get properties: ${error.message}`);
    }
  }

  /**
   * Get property by ID
   */
  async getPropertyById(id) {
    try {
      const property = await Property.findById(id);
      if (!property) {
        throw new Error("Property not found");
      }
      return property;
    } catch (error) {
      throw new Error(`Failed to get property: ${error.message}`);
    }
  }

  /**
   * Update property
   */
  async updateProperty(id, updateData) {
    try {
      const property = await Property.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true }
      );

      if (!property) {
        throw new Error("Property not found");
      }

      return property;
    } catch (error) {
      throw new Error(`Failed to update property: ${error.message}`);
    }
  }

  /**
   * Delete (archive) property
   */
  async deleteProperty(id) {
    try {
      const property = await Property.findByIdAndUpdate(
        id,
        { status: "archived", archivedAt: new Date() },
        { new: true }
      );

      if (!property) {
        throw new Error("Property not found");
      }

      return property;
    } catch (error) {
      throw new Error(`Failed to delete property: ${error.message}`);
    }
  }

  /**
   * Get statistics
   */
  async getStatistics() {
    try {
      const [totalProperties, totalMinted, byType, byStatus] =
        await Promise.all([
          Property.countDocuments(),
          Property.countDocuments({ "nft.isMinted": true }),
          Property.aggregate([
            { $group: { _id: "$propertyType", count: { $sum: 1 } } },
          ]),
          Property.aggregate([
            { $group: { _id: "$status", count: { $sum: 1 } } },
          ]),
        ]);

      return {
        totalProperties,
        totalMinted,
        byType,
        byStatus,
      };
    } catch (error) {
      throw new Error(`Failed to get statistics: ${error.message}`);
    }
  }
}

module.exports = new PropertyService();
