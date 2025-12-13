/**
 * ========================================================================
 * AUTH USER MODEL - Connect to Auth Service User collection
 * ========================================================================
 */

const mongoose = require("mongoose");

// Schema để query collection 'users' từ database chính
const authUserSchema = new mongoose.Schema(
  {
    email: String,
    walletAddress: String,
    emailVerified: Boolean,
    role: String,
    profile: {
      displayName: String,
      avatar: String,
    },
    authMethods: Array,
    createdAt: Date,
    lastLoginAt: Date,
  },
  {
    strict: false,
    collection: "users", // Explicitly use 'users' collection
  }
);

module.exports = mongoose.model("AuthUser", authUserSchema);
