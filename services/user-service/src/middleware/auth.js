/**
 * ========================================================================
 * AUTHENTICATION MIDDLEWARE
 * ========================================================================
 */

const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

// Define Auth User Schema (same as auth-service)
const authUserSchema = new mongoose.Schema(
  {
    googleId: String,
    email: { type: String, required: true },
    emailVerified: Boolean,
    walletAddress: String,
    walletLinkedAt: Date,
    nonce: String,
    authMethods: Array,
    sessionToken: String,
    tokenExpiry: Date,
    role: { type: String, enum: ["user", "admin", "agent"], default: "user" },
    profile: Object,
    favorites: Array,
    lastLoginAt: Date,
  },
  {
    timestamps: true,
    collection: "users", // Same collection as Auth Service
  }
);

// Use existing model if already compiled, otherwise create new one
const User = mongoose.models.User || mongoose.model("User", authUserSchema);

/**
 * Verify JWT token
 */
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    console.log("🔐 Auth Header:", authHeader ? "Present" : "Missing");

    if (!authHeader) {
      console.log("❌ No authorization header");
      return res.status(401).json({
        success: false,
        error: "No token provided",
      });
    }

    const token = authHeader.replace("Bearer ", "");
    console.log("🔑 Token:", token.substring(0, 20) + "...");

    if (!process.env.JWT_SECRET) {
      console.log("❌ JWT_SECRET not configured");
      return res.status(500).json({
        success: false,
        error: "Server configuration error",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("✅ Token decoded:", decoded);
    req.user = decoded;
    next();
  } catch (error) {
    console.log("❌ Token verification failed:", error.message);
    return res.status(401).json({
      success: false,
      error: "Invalid token",
      message: error.message,
    });
  }
};

/**
 * Verify admin role
 */
const verifyAdmin = async (req, res, next) => {
  try {
    console.log("👤 Checking admin role for userId:", req.user.userId);

    const user = await User.findById(req.user.userId);

    if (!user) {
      console.log("❌ User not found:", req.user.userId);
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    console.log("👤 User found:", user.email, "Role:", user.role);

    if (user.role !== "admin") {
      console.log("❌ Access denied - not admin");
      return res.status(403).json({
        success: false,
        error: "Access denied. Admin role required.",
        userRole: user.role,
      });
    }

    console.log("✅ Admin verified");
    next();
  } catch (error) {
    console.log("❌ Admin verification error:", error.message);
    return res.status(500).json({
      success: false,
      error: "Failed to verify admin role",
      message: error.message,
    });
  }
};

module.exports = {
  verifyToken,
  verifyAdmin,
};
