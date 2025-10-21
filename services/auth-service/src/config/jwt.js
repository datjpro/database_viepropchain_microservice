/**
 * ========================================================================
 * JWT CONFIGURATION
 * ========================================================================
 */

module.exports = {
  JWT_SECRET: process.env.JWT_SECRET || "your-secret-key-change-this",
  JWT_EXPIRY: "7d", // 7 days
};
