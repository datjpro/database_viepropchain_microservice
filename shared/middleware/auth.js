/**
 * ========================================================================
 * SHARED AUTHENTICATION MIDDLEWARE
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

    const token = authHeader.split(" ")[1]; // Bearer TOKEN
    if (!token) {
      console.log("❌ No token in authorization header");
      return res.status(401).json({
        success: false,
        error: "No token provided",
      });
    }

    console.log("🔍 Verifying token...");

    // Verify token with JWT secret
    const JWT_SECRET = process.env.JWT_SECRET || "viepropchain_secret_key";
    const decoded = jwt.verify(token, JWT_SECRET);

    console.log("✅ Token verified for user:", {
      id: decoded.id,
      email: decoded.email,
      walletAddress: decoded.walletAddress,
    });

    // Get user from database to ensure still exists and wallet linked
    const user = await User.findById(decoded.id);
    if (!user) {
      console.log("❌ User not found in database");
      return res.status(401).json({
        success: false,
        error: "User not found",
      });
    }

    // Attach user to request
    req.user = {
      id: user._id,
      email: user.email,
      walletAddress: user.walletAddress,
      role: user.role,
    };

    next();
  } catch (error) {
    console.error("❌ Token verification error:", error.message);

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        error: "Invalid token",
      });
    }

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        error: "Token expired",
      });
    }

    return res.status(500).json({
      success: false,
      error: "Token verification failed",
      message: error.message,
    });
  }
};

/**
 * Optional auth middleware - continues even without token
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      req.user = null;
      return next();
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      req.user = null;
      return next();
    }

    const JWT_SECRET = process.env.JWT_SECRET || "viepropchain_secret_key";
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await User.findById(decoded.id);
    if (user) {
      req.user = {
        id: user._id,
        email: user.email,
        walletAddress: user.walletAddress,
        role: user.role,
      };
    } else {
      req.user = null;
    }

    next();
  } catch (error) {
    // If token is invalid, just continue without auth
    req.user = null;
    next();
  }
};

module.exports = {
  verifyToken,
  optionalAuth,
};
