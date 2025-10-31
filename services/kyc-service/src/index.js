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
║  API Endpoints (qua API Gateway: /api/kyc/*):                ║
║  ├─ POST /api/kyc                       - Submit & verify (*) ║
║  ├─ GET  /api/kyc/me                    - My KYC (*)         ║
║  ├─ GET  /api/kyc/me/verified           - My verified (*)    ║
║  ├─ GET  /api/kyc/wallet/:address       - By wallet          ║
║  ├─ GET  /api/kyc/wallet/:address/verified - Check verified  ║
║  ├─ GET  /api/kyc/verified/all          - All verified       ║
║  └─ GET  /api/kyc/statistics            - Statistics         ║
║                                                              ║
║  (*) = Requires JWT Authentication                          ║
╚══════════════════════════════════════════════════════════════╝
  `);
});
