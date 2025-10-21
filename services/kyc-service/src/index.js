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
║                  KYC SERVICE (SIMPLIFIED)                    ║
║══════════════════════════════════════════════════════════════║
║  Port: ${PORT}                                                  ║
║  MongoDB: ${
    mongoose.connection.readyState === 1 ? "Connected" : "Disconnected"
  }                                           ║
║                                                              ║
║  Chức năng: User nhập Họ tên + CCCD → Auto verified         ║
║                                                              ║
║  API Endpoints:                                              ║
║  ├─ POST /kyc                           - Submit & verify    ║
║  ├─ GET  /kyc/:walletAddress            - Get KYC info      ║
║  ├─ GET  /kyc/:walletAddress/verified   - Check verified    ║
║  ├─ GET  /verified/all                  - All verified      ║
║  └─ GET  /statistics                    - Statistics        ║
╚══════════════════════════════════════════════════════════════╝
  `);
});
