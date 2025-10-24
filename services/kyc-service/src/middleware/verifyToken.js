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
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "No token provided. Authorization header required.",
      });
    }

    // Extract token (remove "Bearer " prefix)
    const token = authHeader.substring(7);

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Attach user info to request
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      walletAddress: decoded.walletAddress || null,
      role: decoded.role,
      emailVerified: decoded.emailVerified,
      authMethods: decoded.authMethods || [],
    };

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token expired. Please login again.",
      });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token.",
      });
    }

    console.error("Token verification error:", error);
    return res.status(500).json({
      success: false,
      message: "Token verification failed.",
      error: error.message,
    });
  }
};

module.exports = verifyToken;
