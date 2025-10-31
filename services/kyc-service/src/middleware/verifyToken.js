/**
 * ========================================================================
 * JWT TOKEN VERIFICATION MIDDLEWARE
 * ========================================================================
 * Middleware to verify JWT tokens from Auth Service
 * Extracts user information from token and attaches to req.user
 */

const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "viepropchain-jwt-secret-2025";

/**
 * Verify JWT token middleware
 * Expects token in Authorization header: "Bearer <token>"
 */
const verifyToken = (req, res, next) => {
  console.log("🔍 [verifyToken] Middleware called");
  console.log(
    "🔍 [verifyToken] Authorization header:",
    req.headers.authorization?.substring(0, 50) + "..."
  );

  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("❌ [verifyToken] No token provided");
      return res.status(401).json({
        success: false,
        message: "No token provided. Authorization header required.",
      });
    }

    // Extract token (remove "Bearer " prefix)
    const token = authHeader.substring(7);

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log("✅ [verifyToken] Token verified for user:", decoded.email);

    // Attach user info to request
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      walletAddress: decoded.walletAddress || null,
      role: decoded.role,
      emailVerified: decoded.emailVerified,
      authMethods: decoded.authMethods || [],
    };

    console.log("✅ [verifyToken] User attached to request:", req.user.email);
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      console.log("❌ [verifyToken] Token expired");
      return res.status(401).json({
        success: false,
        message: "Token expired. Please login again.",
      });
    }

    if (error.name === "JsonWebTokenError") {
      console.log("❌ [verifyToken] Invalid token");
      return res.status(401).json({
        success: false,
        message: "Invalid token.",
      });
    }

    console.error("❌ [verifyToken] Token verification error:", error);
    return res.status(500).json({
      success: false,
      message: "Token verification failed.",
      error: error.message,
    });
  }
};

module.exports = verifyToken;
