/**
 * ========================================================================
 * ADMIN SERVICE - Port 4003
 * ========================================================================
 * Nhiệm vụ: Điều phối tạo property và mint NFT
 * ========================================================================
 */

const express = require("express");
require("dotenv").config();

const connectDB = require("./config/database");
const propertyRoutes = require("./routes/propertyRoutes");
const orchestratorService = require("./services/orchestratorService");

const app = express();
const PORT = process.env.PORT || 4003;

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
app.get("/health", async (req, res) => {
  try {
    const mongoose = require("mongoose");
    const servicesHealth = await orchestratorService.checkServicesHealth();

    res.json({
      success: true,
      service: "Admin Service",
      port: PORT,
      mongodb:
        mongoose.connection.readyState === 1 ? "connected" : "disconnected",
      dependencies: servicesHealth,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Health check failed",
    });
  }
});

// ============================================================================
// ROUTES
// ============================================================================
app.use("/properties", propertyRoutes);

// ============================================================================
// START SERVER
// ============================================================================
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                     ADMIN SERVICE                            ║
║══════════════════════════════════════════════════════════════║
║  Port: ${PORT}                                                  ║
║                                                              ║
║  API Endpoints:                                              ║
║  ├─ POST /properties            - Create property            ║
║  ├─ GET  /properties            - Get all properties         ║
║  ├─ GET  /properties/:id        - Get property               ║
║  ├─ PUT  /properties/:id        - Update property            ║
║  ├─ DELETE /properties/:id      - Archive property           ║
║  ├─ POST /properties/:id/mint   - Mint property to NFT       ║
║  └─ GET  /properties/stats/overview - Get statistics         ║
╚══════════════════════════════════════════════════════════════╝
  `);
});
