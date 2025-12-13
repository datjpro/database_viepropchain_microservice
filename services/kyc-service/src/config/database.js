/**
 * ========================================================================
 * DATABASE CONFIGURATION
 * ========================================================================
 */

const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      autoIndex: false, // Disable auto index creation
    });
    console.log("✅ MongoDB connected (autoIndex: false)");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  }
};

module.exports = connectDB;
