/**
 * ========================================================================
 * PINATA CONFIGURATION
 * ========================================================================
 */

module.exports = {
  PINATA_API_URL: "https://api.pinata.cloud",
  PINATA_GATEWAY: "https://gateway.pinata.cloud/ipfs",
  PINATA_JWT: process.env.PINATA_JWT,
  PINATA_API_KEY: process.env.PINATA_API_KEY,
  PINATA_SECRET_KEY: process.env.PINATA_SECRET_KEY,
};
