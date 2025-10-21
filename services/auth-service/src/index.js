/**
 * ========================================================================
 * AUTH SERVICE - Port 4001
 * ========================================================================
 * Nhiệm vụ: Sign-in with Ethereum, verify signature, tạo JWT token
 * ========================================================================
 */

const express = require("express");
require("dotenv").config();

const connectDB = require("./config/database");
const authRoutes = require("./routes/authRoutes");

const app = express();
const PORT = process.env.PORT || 4001;

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
    service: "Auth Service",
    port: PORT,
    mongodb:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

// ============================================================================
// ROUTES
// ============================================================================
app.use("/", authRoutes);

// ============================================================================
// START SERVER
// ============================================================================
app.listen(PORT, () => {
  const mongoose = require("mongoose");
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                      AUTH SERVICE                            ║
║══════════════════════════════════════════════════════════════║
║  Port: ${PORT}                                                  ║
║  MongoDB: ${
    mongoose.connection.readyState === 1 ? "Connected" : "Disconnected"
  }                                           ║
║                                                              ║
║  API Endpoints:                                              ║
║  ├─ POST /get-nonce          - Get nonce for signing        ║
║  ├─ POST /verify-signature   - Verify & login               ║
║  ├─ GET  /profile            - Get user profile             ║
║  └─ PUT  /profile            - Update user profile          ║
╚══════════════════════════════════════════════════════════════╝
  `);
});
