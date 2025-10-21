/**
 * ========================================================================
 * QUERY SERVICE - Port 4005
 * ========================================================================
 * Nhiệm vụ: Read-only queries cho frontend
 * ========================================================================
 */

const express = require("express");
require("dotenv").config();

const connectDB = require("./config/database");
const propertyRoutes = require("./routes/propertyRoutes");
const statsRoutes = require("./routes/statsRoutes");
const nftRoutes = require("./routes/nftRoutes");

const app = express();
const PORT = process.env.PORT || 4005;

// ============================================================================
// MIDDLEWARE
// ============================================================================
app.use(express.json());

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
    service: "Query Service",
    port: PORT,
    mongodb:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

// ============================================================================
// ROUTES
// ============================================================================
app.use("/", propertyRoutes);
app.use("/", statsRoutes);
app.use("/", nftRoutes);

// ============================================================================
// START SERVER
// ============================================================================
app.listen(PORT, () => {
  const mongoose = require("mongoose");
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
