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

  await mongoose.connection.close();
  console.log("✅ MongoDB connection closed");

  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// ============================================================================
// START INDEXER
// ============================================================================
(async function start() {
  try {
    // Connect to database
    await connectDB();

    // Wait for MongoDB connection
    while (mongoose.connection.readyState !== 1) {
      console.log("⏳ Waiting for MongoDB connection...");
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // Start event listener
    await eventListenerService.start();
  } catch (error) {
    console.error("❌ Error starting indexer:", error);
    process.exit(1);
  }
})();
