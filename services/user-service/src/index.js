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

const app = express();
const PORT = process.env.PORT || 4006;

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
    service: "User Service",
    port: PORT,
    mongodb:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

// ============================================================================
// ROUTES
// ============================================================================
app.use("/", userRoutes);

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
