/**
 * ========================================================================
 * USER SERVICE - Port 4006
 * ========================================================================
 * Nhiệm vụ: Quản lý thông tin bổ sung của người dùng
 * ========================================================================
 */

const express = require("express");
require("dotenv").config();

const connectDB = require("./config/database");
const userRoutes = require("./routers/userRoutes");
const adminRoutes = require("./routers/adminRoutes");

const app = express();
const PORT = process.env.PORT || 4006;

// ============================================================================
// MIDDLEWARE
// ============================================================================
app.use(express.json());

// CORS middleware
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  next();
});

// Logging middleware
app.use((req, res, next) => {
  console.log(`📝 ${req.method} ${req.path}`);
  next();
});

// ============================================================================
// DATABASE CONNECTION
// ============================================================================
connectDB();

// ============================================================================
// HEALTH CHECK
// ============================================================================
app.get("/health", (req, res) => {
  const mongoose = require("mongoose");
  res.json({
    success: true,
    service: "User Service",
    port: PORT,
    mongodb:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

// ============================================================================
// TEMPORARY TEST ENDPOINT - REAL DATA FROM MongoDB - FILTER BY USER
// ============================================================================
app.get("/my-properties", async (req, res) => {
  try {
    console.log("🔍 Getting my properties from MongoDB");

    // Import Property model
    const Property = require("./models/Property");

    // Get user from auth header (temporarily hardcode for testing)
    const authHeader = req.headers.authorization;
    let userEmail = "todat2207@gmail.com"; // Default for testing

    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const jwt = require("jsonwebtoken");
        const token = authHeader.substring(7);
        const decoded = jwt.decode(token);
        userEmail = decoded?.email || userEmail;
        console.log("👤 User from token:", userEmail);
      } catch (err) {
        console.log("⚠️ Token decode error, using default user");
      }
    }

    // Query properties owned by this user
    // Note: properties are usually stored by wallet address, but let's check both email and owner field
    const properties = await Property.find({
      $or: [
        { owner: userEmail },
        { "ownerInfo.email": userEmail },
        { createdBy: userEmail },
      ],
    }).lean();

    console.log(
      `📊 Found ${properties.length} properties for user ${userEmail}`
    );

    // If no properties found for user, return empty array
    if (properties.length === 0) {
      return res.json({
        success: true,
        data: [],
        message: `No properties found for user ${userEmail}`,
        debug: {
          userEmail,
          totalProperties: await Property.countDocuments(),
        },
      });
    }

    // Transform data to match frontend expectations
    const transformedProperties = properties.map((prop) => ({
      id: prop._id,
      name: prop.title || prop.name || "Tài sản chưa đặt tên",
      address: prop.address
        ? `${prop.address.street || ""}, ${prop.address.district || ""}, ${
            prop.address.city || ""
          }`.replace(/^,\s*|,\s*$/g, "")
        : "Chưa có địa chỉ",
      area: prop.area || 0,
      status: prop.nft?.isMinted ? "active" : prop.status || "draft",
      images:
        prop.images && prop.images.length > 0
          ? prop.images
          : ["/placeholder-property.jpg"],
      // Consider NFT present if either `isMinted` is true OR a tokenId exists
      nftData:
        prop.nft && (prop.nft.isMinted || prop.nft.tokenId !== undefined)
          ? {
              tokenId: prop.nft.tokenId,
              contractAddress: prop.nft.contractAddress,
            }
          : null,
      currentListing: null, // will populate from marketplace listings below
      createdAt: prop.createdAt,
      propertyType: prop.propertyType,
      price: prop.price,
      currency: prop.currency,
      owner: prop.owner,
    }));

    // Attach current listing information from marketplace `listings` collection
    try {
      const db = require("mongoose").connection.db;
      const propertyIds = properties.map((p) => p._id);
      if (propertyIds.length > 0) {
        const listings = await db
          .collection("listings")
          .find({ propertyId: { $in: propertyIds }, status: "active" })
          .toArray();

        const listingMap = {};
        for (const l of listings) {
          const key = l.propertyId ? String(l.propertyId) : null;
          if (key) listingMap[key] = l;
        }

        for (const tp of transformedProperties) {
          const key = String(tp.id);
          const l = listingMap[key];
          if (l) {
            tp.currentListing = {
              listingId: l._id,
              blockchainListingId: l.blockchainListingId || null,
              price: l.price?.amount || null,
              type: l.listingType || null,
              status: l.status || null,
            };
          }
        }
      }
    } catch (err) {
      console.warn("⚠️ Could not attach marketplace listings:", err.message);
    }

    res.json({
      success: true,
      data: transformedProperties,
      message: `Found ${transformedProperties.length} properties for ${userEmail}`,
      debug: {
        userEmail,
        totalInDB: await Property.countDocuments(),
        userProperties: transformedProperties.length,
      },
    });
  } catch (error) {
    console.error("❌ Error fetching properties:", error.message);
    res.status(500).json({
      success: false,
      error: "Failed to fetch properties from database",
      message: error.message,
    });
  }
});

// ============================================================================
// ROUTES
// ============================================================================
app.use("/", userRoutes);
app.use("/admin", adminRoutes);

// ============================================================================
// START SERVER
// ============================================================================
app.listen(PORT, () => {
  const mongoose = require("mongoose");
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                      USER SERVICE                            ║
║══════════════════════════════════════════════════════════════║
║  Port: ${PORT}                                                  ║
║  MongoDB: ${
    mongoose.connection.readyState === 1 ? "Connected" : "Disconnected"
  }                                           ║
║                                                              ║
║  API Endpoints:                                              ║
║  ├─ POST /profiles                      - Get/create profile ║
║  ├─ GET  /profiles/:address             - Get profile        ║
║  ├─ PUT  /profiles/:address/basic-info  - Update basic info ║
║  ├─ PUT  /profiles/:address/contact-info- Update contact    ║
║  ├─ PUT  /profiles/:address/profile     - Update profile    ║
║  ├─ PUT  /profiles/:address/preferences - Update prefs      ║
║  ├─ PUT  /profiles/:address/kyc-status  - Update KYC        ║
║  ├─ GET  /users/search                  - Search users      ║
║  └─ GET  /users/statistics              - Get statistics    ║
╚══════════════════════════════════════════════════════════════╝
  `);
});
