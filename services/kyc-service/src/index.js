/**
 * ========================================================================
 * KYC SERVICE - Port 4007
 * ========================================================================
 * Nhiệm vụ: Xác thực danh tính người dùng (Know Your Customer)
 * ========================================================================
 */

const express = require("express");
require("dotenv").config();

const connectDB = require("./config/database");
const kycRoutes = require("./routers/kycRoutes");

const app = express();
const PORT = process.env.PORT || 4007;

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
    service: "KYC Service",
    port: PORT,
    mongodb:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

// ============================================================================
// ROUTES
// ============================================================================
app.use("/", kycRoutes);

// ============================================================================
// START SERVER
// ============================================================================
app.listen(PORT, () => {
  const mongoose = require("mongoose");
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                       KYC SERVICE                            ║
║══════════════════════════════════════════════════════════════║
║  Port: ${PORT}                                                  ║
║  MongoDB: ${
    mongoose.connection.readyState === 1 ? "Connected" : "Disconnected"
  }                                           ║
║                                                              ║
║  API Endpoints:                                              ║
║  ├─ POST /kyc                           - Submit KYC         ║
║  ├─ GET  /kyc/wallet/:address           - Get by wallet     ║
║  ├─ GET  /kyc/:id                       - Get by ID         ║
║  ├─ PUT  /kyc/:id/status                - Update status     ║
║  ├─ PUT  /kyc/:id/verify-documents      - Verify docs       ║
║  ├─ POST /kyc/:id/compliance-checks     - Run compliance    ║
║  ├─ GET  /kyc/search/all                - Search KYC        ║
║  └─ GET  /kyc/statistics/all            - Get statistics    ║
╚══════════════════════════════════════════════════════════════╝
  `);
});
