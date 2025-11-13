/**
 * ========================================================================
 * MARKETPLACE SERVICE - Port 4008
 * ========================================================================
 * Nhiệm vụ: Quản lý NFT listings và offers
 * - List NFT for sale
 * - Browse marketplace
 * - Make & manage offers
 * - Buy/sell NFTs
 * ========================================================================
 */

const express = require("express");
const cors = require("cors");
require("dotenv").config();

const connectDB = require("./config/database");
const listingRoutes = require("./routes/listingRoutes");
const offerRoutes = require("./routes/offerRoutes");
const nftInfoRoutes = require("./routes/nftInfoRoutes");
const frontendRoutes = require("./routes/frontendRoutes");

const app = express();
const PORT = process.env.PORT || 4008;

// ============================================================================
// MIDDLEWARE
// ============================================================================
app.use(express.json());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);

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
    service: "Marketplace Service",
    port: PORT,
    mongodb:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

// ============================================================================
// ROUTES
// ============================================================================
app.use("/api", frontendRoutes); // Fast read APIs for frontend
app.use("/listings", listingRoutes);
app.use("/offers", offerRoutes);
app.use("/", nftInfoRoutes); // NFT info helper routes

// ============================================================================
// ERROR HANDLER
// ============================================================================
app.use((err, req, res, next) => {
  console.error("❌ Error:", err);
  res.status(500).json({
    success: false,
    error: "Internal server error",
    message: err.message,
  });
});

// ============================================================================
// START SERVER
// ============================================================================
app.listen(PORT, () => {
  const mongoose = require("mongoose");
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                  MARKETPLACE SERVICE                         ║
║══════════════════════════════════════════════════════════════║
║  Port: ${PORT}                                                  ║
║  MongoDB: ${
    mongoose.connection.readyState === 1 ? "Connected" : "Disconnected"
  }                                           ║
║                                                              ║
║  📋 Listing Endpoints:                                       ║
║  ├─ GET    /listings                - Browse listings       ║
║  ├─ GET    /listings/:id            - Get listing detail    ║
║  ├─ GET    /listings/token/:tokenId - Get by token ID       ║
║  ├─ POST   /listings                - Create listing (*)    ║
║  ├─ PUT    /listings/:id            - Update listing (*)    ║
║  ├─ DELETE /listings/:id            - Cancel listing (*)    ║
║  ├─ GET    /listings/my/listings    - My listings (*)       ║
║  └─ POST   /listings/:id/view       - Track view            ║
║                                                              ║
║  💰 Offer Endpoints:                                         ║
║  ├─ POST   /offers                  - Create offer (*)      ║
║  ├─ GET    /offers/listing/:id      - Offers on listing (*) ║
║  ├─ GET    /offers/my/offers        - My offers (*)         ║
║  ├─ GET    /offers/my/received      - Offers received (*)   ║
║  ├─ POST   /offers/:id/accept       - Accept offer (*)      ║
║  ├─ POST   /offers/:id/reject       - Reject offer (*)      ║
║  └─ DELETE /offers/:id              - Cancel offer (*)      ║
║                                                              ║
║  🏠 Rental Endpoints:                                        ║
║  ├─ POST   /listings/rental         - Create rental (*)     ║
║  ├─ POST   /listings/:id/rent       - Rent NFT (*)          ║
║  ├─ GET    /listings/rental         - Browse rentals        ║
║  └─ GET    /my/rentals              - My rentals (*)        ║
║                                                              ║
║  🔍 NFT Info Helper:                                         ║
║  ├─ GET    /nft-info/:wallet        - My NFTs with property ║
║  └─ GET    /nft-info/token/:tokenId - NFT detail            ║
║                                                              ║
║  (*) = Requires JWT Authentication                          ║
╚══════════════════════════════════════════════════════════════╝
  `);
});

module.exports = app;
