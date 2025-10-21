/**
 * ========================================================================
 * QUERY SERVICE - Port 4005
 * ========================================================================
 * Nhiệm vụ: Read-only queries cho frontend
 * - Tìm kiếm properties
 * - Filter, pagination, sorting
 * - Statistics
 * - View tracking
 * ========================================================================
 */

const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();

const { Property, NFT, Analytics } = require("../../shared/models");

const app = express();
const PORT = process.env.PORT || 4005;

// ============================================================================
// MONGODB CONNECTION
// ============================================================================
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// ============================================================================
// MIDDLEWARE
// ============================================================================
app.use(express.json());

// ============================================================================
// HEALTH CHECK
// ============================================================================
app.get("/health", (req, res) => {
  res.json({
    success: true,
    service: "Query Service",
    port: PORT,
    mongodb:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

// ============================================================================
// SEARCH PROPERTIES
// ============================================================================
app.get("/properties", async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
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
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    // Build query
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

    // Execute query
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

    res.json({
      success: true,
      data: properties,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("❌ Search error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to search properties",
    });
  }
});

// ============================================================================
// GET PROPERTY DETAIL
// ============================================================================
app.get("/properties/:id", async (req, res) => {
  try {
    const property = await Property.findById(req.params.id)
      .select("-__v")
      .lean();

    if (!property) {
      return res.status(404).json({
        success: false,
        error: "Property not found",
      });
    }

    res.json({
      success: true,
      data: property,
    });
  } catch (error) {
    console.error("❌ Get property error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get property",
    });
  }
});

// ============================================================================
// GET FEATURED PROPERTIES
// ============================================================================
app.get("/properties/featured/list", async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const properties = await Property.find({
      status: { $in: ["minted", "listed"] },
    })
      .sort({ "analytics.views": -1, createdAt: -1 })
      .limit(Number(limit))
      .select("-__v")
      .lean();

    res.json({
      success: true,
      data: properties,
    });
  } catch (error) {
    console.error("❌ Get featured error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get featured properties",
    });
  }
});

// ============================================================================
// TRACK VIEW
// ============================================================================
app.post("/properties/:id/view", async (req, res) => {
  try {
    const { userId } = req.body;

    // Update property view count
    await Property.findByIdAndUpdate(req.params.id, {
      $inc: { "analytics.views": 1 },
    });

    // Save analytics
    const analytics = new Analytics({
      type: "view",
      propertyId: req.params.id,
      userId,
      timestamp: new Date(),
    });

    await analytics.save();

    res.json({
      success: true,
      message: "View tracked",
    });
  } catch (error) {
    console.error("❌ Track view error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to track view",
    });
  }
});

// ============================================================================
// GET STATISTICS
// ============================================================================
app.get("/stats/overview", async (req, res) => {
  try {
    const [totalProperties, totalMinted, byType, byStatus, byCity, priceStats] =
      await Promise.all([
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

    res.json({
      success: true,
      data: {
        totalProperties,
        totalMinted,
        byType,
        byStatus,
        byCity,
        priceStats: priceStats[0] || {},
      },
    });
  } catch (error) {
    console.error("❌ Get stats error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get statistics",
    });
  }
});

// ============================================================================
// GET PRICE TRENDS
// ============================================================================
app.get("/stats/price-trends", async (req, res) => {
  try {
    const { propertyType, city, days = 30 } = req.query;

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

    res.json({
      success: true,
      data: trends,
    });
  } catch (error) {
    console.error("❌ Get price trends error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get price trends",
    });
  }
});

// ============================================================================
// GET NFT INFO
// ============================================================================
app.get("/nfts/:tokenId", async (req, res) => {
  try {
    const nft = await NFT.findOne({ tokenId: req.params.tokenId })
      .select("-__v")
      .lean();

    if (!nft) {
      return res.status(404).json({
        success: false,
        error: "NFT not found",
      });
    }

    // Get associated property
    const property = await Property.findById(nft.propertyId)
      .select("-__v")
      .lean();

    res.json({
      success: true,
      data: {
        nft,
        property,
      },
    });
  } catch (error) {
    console.error("❌ Get NFT error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get NFT",
    });
  }
});

// ============================================================================
// GET LOCATIONS
// ============================================================================
app.get("/locations/cities", async (req, res) => {
  try {
    const cities = await Property.distinct("location.city");

    res.json({
      success: true,
      data: cities.filter(Boolean).sort(),
    });
  } catch (error) {
    console.error("❌ Get cities error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get cities",
    });
  }
});

app.get("/locations/districts", async (req, res) => {
  try {
    const { city } = req.query;

    const query = city ? { "location.city": city } : {};
    const districts = await Property.distinct("location.district", query);

    res.json({
      success: true,
      data: districts.filter(Boolean).sort(),
    });
  } catch (error) {
    console.error("❌ Get districts error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get districts",
    });
  }
});

// ============================================================================
// START SERVER
// ============================================================================
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                     QUERY SERVICE                            ║
║══════════════════════════════════════════════════════════════║
║  Port: ${PORT}                                                  ║
║  MongoDB: ${
    mongoose.connection.readyState === 1 ? "Connected" : "Disconnected"
  }                                           ║
║                                                              ║
║  API Endpoints:                                              ║
║  ├─ GET  /properties               - Search properties       ║
║  ├─ GET  /properties/:id           - Get property detail     ║
║  ├─ GET  /properties/featured/list - Get featured           ║
║  ├─ POST /properties/:id/view      - Track view              ║
║  ├─ GET  /stats/overview           - Get statistics          ║
║  ├─ GET  /stats/price-trends       - Get price trends        ║
║  ├─ GET  /nfts/:tokenId            - Get NFT info            ║
║  ├─ GET  /locations/cities         - Get cities              ║
║  └─ GET  /locations/districts      - Get districts           ║
╚══════════════════════════════════════════════════════════════╝
  `);
});
