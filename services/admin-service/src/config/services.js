/**
 * ========================================================================
 * SERVICE URLS CONFIGURATION
 * ========================================================================
 */

module.exports = {
  IPFS_SERVICE_URL:
    process.env.IPFS_SERVICE_URL || "http://localhost:4002",
  BLOCKCHAIN_SERVICE_URL:
    process.env.BLOCKCHAIN_SERVICE_URL || "http://localhost:4004",
};
