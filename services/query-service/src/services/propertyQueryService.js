/**
 * ========================================================================
 * PROPERTY QUERY SERVICE - Search & filter logic
 * ========================================================================
 */

const { Property } = require("../../../../shared/models");

class PropertyQueryService {
  /**
   * Build search query from filters
   */
  buildQuery(filters) {
    const {
      search,
      propertyType,
      status,
      city,
      district,
      ward,
      minPrice,
      maxPrice,
      minArea,
      maxArea,
      bedrooms,
      legalStatus,
      isMinted,
    } = filters;

    const query = {};

    // Text search
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { "location.address": { $regex: search, $options: "i" } },
      ];
    }

    // Filters
    if (propertyType) query.propertyType = propertyType;
    if (status) query.status = status;
    if (city) query["location.city"] = city;
    if (district) query["location.district"] = district;
    if (ward) query["location.ward"] = ward;
    if (legalStatus) query["details.legalStatus"] = legalStatus;
    if (isMinted !== undefined) query["nft.isMinted"] = isMinted === "true";

    // Price range
    if (minPrice || maxPrice) {
      query["price.amount"] = {};
      if (minPrice) query["price.amount"].$gte = Number(minPrice);
      if (maxPrice) query["price.amount"].$lte = Number(maxPrice);
    }

    // Area range
    if (minArea || maxArea) {
      query["details.area.value"] = {};
      if (minArea) query["details.area.value"].$gte = Number(minArea);
      if (maxArea) query["details.area.value"].$lte = Number(maxArea);
    }

    // Bedrooms
    if (bedrooms) query["details.bedrooms"] = Number(bedrooms);

    return query;
  }

  /**
   * Search properties with pagination
   */
  async searchProperties(filters, pagination) {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = pagination;

      const query = this.buildQuery(filters);
      const skip = (page - 1) * limit;
      const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

      const [properties, total] = await Promise.all([
        Property.find(query)
          .select("-__v")
          .sort(sort)
          .skip(skip)
          .limit(Number(limit))
          .lean(),
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
      throw new Error(`Failed to search properties: ${error.message}`);
    }
  }

  /**
   * Get property by ID
   */
  async getPropertyById(propertyId) {
    try {
      const property = await Property.findById(propertyId)
        .select("-__v")
        .lean();

      if (!property) {
        throw new Error("Property not found");
      }

      return property;
    } catch (error) {
      throw new Error(`Failed to get property: ${error.message}`);
    }
  }

  /**
   * Get featured properties
   */
  async getFeaturedProperties(limit = 10) {
    try {
      const properties = await Property.find({
        status: { $in: ["minted", "listed"] },
      })
        .sort({ "analytics.views": -1, createdAt: -1 })
        .limit(Number(limit))
        .select("-__v")
        .lean();

      return properties;
    } catch (error) {
      throw new Error(`Failed to get featured properties: ${error.message}`);
    }
  }

  /**
   * Get locations
   */
  async getCities() {
    try {
      const cities = await Property.distinct("location.city");
      return cities.filter(Boolean).sort();
    } catch (error) {
      throw new Error(`Failed to get cities: ${error.message}`);
    }
  }

  async getDistricts(city) {
    try {
      const query = city ? { "location.city": city } : {};
      const districts = await Property.distinct("location.district", query);
      return districts.filter(Boolean).sort();
    } catch (error) {
      throw new Error(`Failed to get districts: ${error.message}`);
    }
  }
}

module.exports = new PropertyQueryService();
