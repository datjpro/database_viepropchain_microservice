/**
 * ========================================================================
 * AUTHENTICATION MIDDLEWARE
 * ========================================================================
 */

const jwt = require("jsonwebtoken");
const User = require("../models/User");

/**
 * Verify JWT token
 */
const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        success: false,
        error: "No token provided",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: "Invalid token",
    });
  }
};

/**
 * Verify admin role
 */
const verifyAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    if (user.role !== "admin") {
      return res.status(403).json({
        success: false,
        error: "Access denied. Admin role required.",
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Failed to verify admin role",
    });
  }
};

module.exports = {
  verifyToken,
  verifyAdmin,
};
