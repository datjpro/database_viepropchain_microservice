/**
 * ========================================================================
 * IPFS SERVICE - Port 4002
 * ========================================================================
 * Nhiệm vụ: Upload files lên IPFS/Pinata, trả về CID
 * ========================================================================
 */

const express = require("express");
require("dotenv").config();

const connectDB = require("./config/database");
const uploadRoutes = require("./routes/uploadRoutes");
const contentRoutes = require("./routes/contentRoutes");

const app = express();
const PORT = process.env.PORT || 4002;

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
    service: "IPFS Service",
    port: PORT,
    pinata: process.env.PINATA_JWT ? "configured" : "not configured",
    mongodb:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

// ============================================================================
// ROUTES
// ============================================================================
app.use("/upload", uploadRoutes);
app.use("/content", contentRoutes);

// ============================================================================
// START SERVER
// ============================================================================
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                      IPFS SERVICE                            ║
║══════════════════════════════════════════════════════════════║
║  Port: ${PORT}                                                  ║
║  Pinata: ${process.env.PINATA_JWT ? "Configured" : "Not configured"}                                          ║
║                                                              ║
║  API Endpoints:                                              ║
║  ├─ POST /upload/image      - Upload image                   ║
║  ├─ POST /upload/document   - Upload document                ║
║  ├─ POST /upload/metadata   - Upload metadata JSON           ║
║  └─ GET  /content/:cid      - Get content by CID             ║
╚══════════════════════════════════════════════════════════════╝
  `);
});
