/**
 * ========================================================================
 * AUTH MIDDLEWARE - Verify JWT Token
 * ========================================================================
 * Extract user info from JWT token and attach to req.user
 */

const jwt = require("jsonwebtoken");

const JWT_SECRET =
  process.env.JWT_SECRET || "viepropchain-secret-key-2025-secure-production";

/**
 * Verify JWT Token and extract user info
 */
function verifyToken(req, res, next) {
  try {
    // 1. Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized - No token provided",
      });
    }

    const token = authHeader.substring(7); // Remove "Bearer "

    // 2. Verify and decode token
    const decoded = jwt.verify(token, JWT_SECRET);

    // 3. Attach user info to request object
    req.user = {
      userId: decoded.userId || decoded.id,
      email: decoded.email,
      role: decoded.role || "user",
      walletAddress: decoded.walletAddress,
    };

    console.log(`🔐 Authenticated user: ${req.user.email} (${req.user.role})`);

    next();
  } catch (error) {
    console.error("❌ Token verification failed:", error.message);

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        error: "Token expired - Please login again",
      });
    }

    return res.status(401).json({
      success: false,
      error: "Invalid token",
    });
  }
}

/**
 * Optional auth - Continue if no token, but extract user if present
 */
function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      // No token - continue without user info
      req.user = null;
      return next();
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);

    req.user = {
      userId: decoded.userId || decoded.id,
      email: decoded.email,
      role: decoded.role || "user",
      walletAddress: decoded.walletAddress,
    };

    next();
  } catch (error) {
    // Invalid token - continue without user info
    req.user = null;
    next();
  }
}

/**
 * Require admin role
 */
function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: "Unauthorized - Please login",
    });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      error: "Forbidden - Admin access required",
    });
  }

  next();
}

module.exports = {
  verifyToken,
  optionalAuth,
  requireAdmin,
};
