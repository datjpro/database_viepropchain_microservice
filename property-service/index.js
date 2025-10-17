const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const Property = require("./propertyModel");
const { buildNFTMetadata } = require("./ipfsService");
const {
  requestMinting,
  checkMintingServiceHealth,
} = require("./mintingClient");

const app = express();
const PORT = process.env.PORT || 3003;

// ========== MIDDLEWARE ==========
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ========== MONGODB CONNECTION ==========
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("✅ Connected to MongoDB (Property Service)");
  })
  .catch((error) => {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  });

// ========== HEALTH CHECK ==========
app.get("/health", async (req, res) => {
  const mintingServiceHealth = await checkMintingServiceHealth();

  res.json({
    success: true,
    service: "Property Service",
    status: "running",
    database:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    mintingService: mintingServiceHealth ? "available" : "unavailable",
    timestamp: new Date().toISOString(),
  });
});

// ========== CREATE AND MINT (ALL-IN-ONE) ==========
/**
 * POST /properties/create-and-mint
 * Create property and mint NFT in one action - for Admin page
 */
app.post("/properties/create-and-mint", async (req, res) => {
  try {
    const { recipient, ...propertyData } = req.body;

    if (!recipient) {
      return res.status(400).json({
        success: false,
        error: "Recipient wallet address is required",
      });
    }

    console.log("🏠 Step 1: Creating property...");

    // Create property
    const property = new Property(propertyData);
    await property.save();

    console.log("✅ Property created:", property._id);

    // Update status to pending_mint
    await property.updateStatus("pending_mint");

    console.log("🎨 Step 2: Building NFT metadata...");

    // Build metadata
    const metadata = buildNFTMetadata(property);

    console.log("📤 Step 3: Requesting minting from Minting Service...");

    // Request minting
    const mintResult = await requestMinting(recipient, metadata);

    if (!mintResult.success) {
      // If minting fails, keep property but mark as published
      await property.updateStatus("published");

      return res.status(500).json({
        success: false,
        error: mintResult.error,
        propertyId: property._id,
        message: "Property created but minting failed. You can retry minting later.",
      });
    }

    // Update property with NFT info
    await property.markAsMinted({
      tokenId: mintResult.tokenId,
      contractAddress: mintResult.contractAddress,
      owner: mintResult.owner,
      tokenURI: mintResult.tokenURI,
      transactionHash: mintResult.transactionHash,
      ipfsHash: mintResult.ipfsHash,
    });

    console.log("✅ Property created and minted successfully!");

    res.status(201).json({
      success: true,
      message: "Property created and minted as NFT successfully",
      data: {
        property: property,
        nft: {
          tokenId: mintResult.tokenId,
          contractAddress: mintResult.contractAddress,
          owner: mintResult.owner,
          transactionHash: mintResult.transactionHash,
          tokenURI: mintResult.tokenURI,
          ipfsHash: mintResult.ipfsHash,
        },
      },
    });
  } catch (error) {
    console.error("❌ Error in create-and-mint:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ========== CREATE PROPERTY ==========
/**
 * POST /properties
 * Create a new property
 */
app.post("/properties", async (req, res) => {
  try {
    console.log("📝 Creating new property...");

    const propertyData = req.body;

    // Validate required fields
    if (!propertyData.propertyType) {
      return res.status(400).json({
        success: false,
        error: "Property type is required",
      });
    }

    if (!propertyData.name) {
      return res.status(400).json({
        success: false,
        error: "Property name is required",
      });
    }

    // Create property
    const property = new Property(propertyData);
    await property.save();

    console.log("✅ Property created:", property._id);

    res.status(201).json({
      success: true,
      message: "Property created successfully",
      data: property,
    });
  } catch (error) {
    console.error("❌ Error creating property:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ========== GET ALL PROPERTIES ==========
/**
 * GET /properties
 * Get all properties with filtering, sorting, and pagination
 */
app.get("/properties", async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      propertyType,
      status,
      city,
      district,
      minPrice,
      maxPrice,
      bedrooms,
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    // Build query
    const query = {};

    if (propertyType) {
      query.propertyType = propertyType;
    }

    if (status) {
      query.status = status;
    }

    if (city) {
      query["location.city"] = city;
    }

    if (district) {
      query["location.district"] = district;
    }

    if (minPrice || maxPrice) {
      query["price.amount"] = {};
      if (minPrice) query["price.amount"].$gte = Number(minPrice);
      if (maxPrice) query["price.amount"].$lte = Number(maxPrice);
    }

    if (bedrooms) {
      query["details.bedrooms"] = Number(bedrooms);
    }

    if (search) {
      query.$text = { $search: search };
    }

    // Execute query
    const skip = (Number(page) - 1) * Number(limit);
    const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

    const [properties, total] = await Promise.all([
      Property.find(query).sort(sort).skip(skip).limit(Number(limit)).lean(),
      Property.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: properties,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("❌ Error getting properties:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ========== GET PROPERTY BY ID ==========
/**
 * GET /properties/:id
 * Get property details by ID
 */
app.get("/properties/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { incrementView } = req.query;

    const property = await Property.findById(id);

    if (!property) {
      return res.status(404).json({
        success: false,
        error: "Property not found",
      });
    }

    // Increment view count if requested
    if (incrementView === "true") {
      await property.incrementViews();
    }

    res.json({
      success: true,
      data: property,
    });
  } catch (error) {
    console.error("❌ Error getting property:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ========== UPDATE PROPERTY ==========
/**
 * PUT /properties/:id
 * Update property information
 */
app.put("/properties/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Don't allow updating NFT info directly
    delete updateData.nft;

    const property = await Property.findByIdAndUpdate(
      id,
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!property) {
      return res.status(404).json({
        success: false,
        error: "Property not found",
      });
    }

    console.log("✅ Property updated:", id);

    res.json({
      success: true,
      message: "Property updated successfully",
      data: property,
    });
  } catch (error) {
    console.error("❌ Error updating property:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ========== DELETE PROPERTY ==========
/**
 * DELETE /properties/:id
 * Delete a property (soft delete - archive)
 */
app.delete("/properties/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { permanent } = req.query;

    if (permanent === "true") {
      // Permanent delete
      const property = await Property.findByIdAndDelete(id);

      if (!property) {
        return res.status(404).json({
          success: false,
          error: "Property not found",
        });
      }

      console.log("✅ Property permanently deleted:", id);

      res.json({
        success: true,
        message: "Property permanently deleted",
      });
    } else {
      // Soft delete (archive)
      const property = await Property.findByIdAndUpdate(
        id,
        { status: "archived", updatedAt: new Date() },
        { new: true }
      );

      if (!property) {
        return res.status(404).json({
          success: false,
          error: "Property not found",
        });
      }

      console.log("✅ Property archived:", id);

      res.json({
        success: true,
        message: "Property archived",
        data: property,
      });
    }
  } catch (error) {
    console.error("❌ Error deleting property:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ========== MINT PROPERTY TO NFT ==========
/**
 * POST /properties/:id/mint
 * Mint a property as NFT
 */
app.post("/properties/:id/mint", async (req, res) => {
  try {
    const { id } = req.params;
    const { recipient } = req.body;

    if (!recipient) {
      return res.status(400).json({
        success: false,
        error: "Recipient wallet address is required",
      });
    }

    // Get property
    const property = await Property.findById(id);

    if (!property) {
      return res.status(404).json({
        success: false,
        error: "Property not found",
      });
    }

    // Check if already minted
    if (property.nft.isMinted) {
      return res.status(400).json({
        success: false,
        error: "Property is already minted as NFT",
        tokenId: property.nft.tokenId,
      });
    }

    // Update status to pending
    await property.updateStatus("pending_mint");

    console.log("🎨 Building NFT metadata...");

    // Build metadata
    const metadata = buildNFTMetadata(property);

    console.log("📤 Requesting minting from Minting Service...");

    // Request minting
    const mintResult = await requestMinting(recipient, metadata);

    if (!mintResult.success) {
      // Revert status
      await property.updateStatus("published");

      return res.status(500).json({
        success: false,
        error: mintResult.error,
      });
    }

    // Update property with NFT info
    await property.markAsMinted({
      tokenId: mintResult.tokenId,
      contractAddress: mintResult.contractAddress,
      owner: mintResult.owner,
      tokenURI: mintResult.tokenURI,
      transactionHash: mintResult.transactionHash,
      ipfsHash: mintResult.ipfsHash,
    });

    console.log("✅ Property minted as NFT successfully!");

    res.json({
      success: true,
      message: "Property minted as NFT successfully",
      data: {
        propertyId: property._id,
        tokenId: mintResult.tokenId,
        contractAddress: mintResult.contractAddress,
        owner: mintResult.owner,
        transactionHash: mintResult.transactionHash,
        tokenURI: mintResult.tokenURI,
        ipfsHash: mintResult.ipfsHash,
      },
    });
  } catch (error) {
    console.error("❌ Error minting property:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ========== GET STATISTICS ==========
/**
 * GET /properties/stats/overview
 * Get overall statistics
 */
app.get("/properties/stats/overview", async (req, res) => {
  try {
    const [
      totalProperties,
      totalMinted,
      totalForSale,
      totalSold,
      byType,
      byStatus,
    ] = await Promise.all([
      Property.countDocuments(),
      Property.countDocuments({ "nft.isMinted": true }),
      Property.countDocuments({ status: "for_sale" }),
      Property.countDocuments({ status: "sold" }),
      Property.aggregate([
        { $group: { _id: "$propertyType", count: { $sum: 1 } } },
      ]),
      Property.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    ]);

    // Total views
    const viewsResult = await Property.aggregate([
      { $group: { _id: null, totalViews: { $sum: "$analytics.views" } } },
    ]);

    const totalViews = viewsResult[0]?.totalViews || 0;

    res.json({
      success: true,
      data: {
        totalProperties,
        totalMinted,
        totalForSale,
        totalSold,
        totalViews,
        byType,
        byStatus,
      },
    });
  } catch (error) {
    console.error("❌ Error getting statistics:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ========== ANALYTICS ENDPOINTS ==========

/**
 * POST /properties/:id/favorite
 * Increment favorite count
 */
app.post("/properties/:id/favorite", async (req, res) => {
  try {
    const { id } = req.params;
    const property = await Property.findById(id);

    if (!property) {
      return res.status(404).json({
        success: false,
        error: "Property not found",
      });
    }

    await property.incrementFavorites();

    res.json({
      success: true,
      message: "Favorite count incremented",
      favorites: property.analytics.favorites,
    });
  } catch (error) {
    console.error("❌ Error incrementing favorites:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /properties/:id/share
 * Increment share count
 */
app.post("/properties/:id/share", async (req, res) => {
  try {
    const { id } = req.params;
    const property = await Property.findById(id);

    if (!property) {
      return res.status(404).json({
        success: false,
        error: "Property not found",
      });
    }

    property.analytics.shares += 1;
    await property.save();

    res.json({
      success: true,
      message: "Share count incremented",
      shares: property.analytics.shares,
    });
  } catch (error) {
    console.error("❌ Error incrementing shares:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ========== ERROR HANDLING ==========
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint not found",
  });
});

app.use((error, req, res, next) => {
  console.error("Unhandled error:", error);
  res.status(500).json({
    success: false,
    error: "Internal server error",
  });
});

// ========== START SERVER ==========
app.listen(PORT, () => {
  console.log("=".repeat(50));
  console.log("🏢 PROPERTY SERVICE");
  console.log("=".repeat(50));
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`📍 API: http://localhost:${PORT}`);
  console.log("=".repeat(50));
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, closing server...");
  mongoose.connection.close(() => {
    console.log("MongoDB connection closed");
    process.exit(0);
  });
});
