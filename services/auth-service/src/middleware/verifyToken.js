/**
 * ========================================================================
 * VERIFY TOKEN MIDDLEWARE
 * ========================================================================
 */

const jwtService = require("../services/jwtService");

const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        success: false,
        error: "No token provided",
      });
    }

    const decoded = jwtService.verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: error.message,
    });
  }
};

module.exports = verifyToken;
