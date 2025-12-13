/**
 * ========================================================================
 * AUTH MIDDLEWARE - JWT Token Verification
 * ========================================================================
 */

const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "viepropchain-secret-key-2025";

/**
 * Verify JWT token from Authorization header
 */
const verifyToken = (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        success: false,
        error: "No token provided",
        message: "Please login to continue",
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { userId, email, walletAddress, ... }
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: "Invalid or expired token",
      message: error.message,
    });
  }
};

/**
 * Optional token verification (don't block if no token)
 */
const optionalAuth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
    }
    next();
  } catch (error) {
    // Continue without user context
    next();
  }
};

module.exports = {
  verifyToken,
  optionalAuth,
};
