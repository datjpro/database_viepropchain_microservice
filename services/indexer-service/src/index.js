/**
 * ========================================================================
 * INDEXER SERVICE - Background Worker
 * ========================================================================
 * Nhiệm vụ: Lắng nghe blockchain events và update MongoDB
 * ========================================================================
 */

require("dotenv").config();
const mongoose = require("mongoose");

const connectDB = require("./config/database");
const {
  GANACHE_URL,
  CONTRACT_ADDRESS,
  POLL_INTERVAL,
} = require("./config/blockchain");
const eventListenerService = require("./services/eventListenerService");
const ownershipSyncService = require("./services/ownershipSyncService");
const comprehensiveOwnershipSyncService = require("./services/comprehensiveOwnershipSyncService");

console.log(`
╔══════════════════════════════════════════════════════════════╗
║                   INDEXER SERVICE                            ║
║══════════════════════════════════════════════════════════════║
║  Ganache: ${GANACHE_URL}                         ║
║  Contract: ${CONTRACT_ADDRESS}        ║
║  Poll Interval: ${POLL_INTERVAL}ms                                        ║
╚══════════════════════════════════════════════════════════════╝
`);

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================
async function shutdown() {
  console.log("\n🛑 Shutting down indexer service...");

  eventListenerService.stop();
  ownershipSyncService.stop(); // Dừng sync service cũ
  comprehensiveOwnershipSyncService.stop(); // Dừng sync service mới cũ
  comprehensiveOwnershipSyncService.stop(); // Dừng sync service mới

  await mongoose.connection.close();
  console.log("✅ MongoDB connection closed");

  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// ============================================================================
// START INDEXER (Cấu trúc mới với async/await đúng cách)
// ============================================================================
const startIndexer = async () => {
  try {
    // 1. Kết nối DB trước
    console.log("⏳ Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000, // 5 giây timeout
      socketTimeoutMS: 45000, // 45 giây socket timeout
    });
    console.log("✅ MongoDB connected successfully");

    // 2. SAU KHI kết nối xong mới khởi tạo các thứ khác
    console.log("🔧 Initializing indexer services...");

    // 3. Start event listener (bây giờ DB đã sẵn sàng)
    await eventListenerService.start();

    // 4. Start comprehensive ownership sync service (cảnh sát dữ liệu nâng cao)
    comprehensiveOwnershipSyncService.start();

    // 5. Start a minimal HTTP server to serve indexer viewer APIs
    const express = require("express");
    const marketplaceRoutes = require("./routes/marketplaceRoutes");

    const app = express();
    app.use(express.json());

    app.use("/api/v1/indexer", marketplaceRoutes);

    // Support both INDEXER_PORT and legacy/compose variable INDEXER_SERVICE_PORT
    const INDEXER_PORT =
      process.env.INDEXER_PORT || process.env.INDEXER_SERVICE_PORT || 4012;
    app.listen(Number(INDEXER_PORT), () => {
      console.log(
        `✅ Indexer API listening on http://localhost:${INDEXER_PORT}`
      );
    });

    console.log("✅ Marketplace Indexer started successfully");
  } catch (err) {
    console.error("❌ Startup Error:", err.message);
    process.exit(1);
  }
};

// Khởi động indexer
startIndexer();
