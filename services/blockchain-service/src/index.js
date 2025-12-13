/**
 * ========================================================================
 * BLOCKCHAIN SERVICE - Port 4004
 * ========================================================================
 * Nhiệm vụ: Service DUY NHẤT tương tác với blockchain
 * ========================================================================
 */

const express = require("express");
require("dotenv").config();

const {
  initBlockchain,
  getBlockchainHealth,
  GANACHE_URL,
  NFT_CONTRACT_ADDRESS,
  getSigner,
} = require("./config/blockchain");
const contractService = require("./services/contractService");
const nftRoutes = require("./routes/nftRoutes");
const marketplaceRoutes = require("./routes/marketplaceRoutes");

const app = express();
const PORT = process.env.PORT || 4004;

// ============================================================================
// MIDDLEWARE
// ============================================================================
app.use(express.json());

// ============================================================================
// INITIALIZE BLOCKCHAIN
// ============================================================================
initBlockchain();
contractService.initContract();

// ============================================================================
// HEALTH CHECK
// ============================================================================
app.get("/health", async (req, res) => {
  try {
    const blockchainStatus = await getBlockchainHealth();

    res.json({
      success: true,
      service: "Blockchain Service",
      port: PORT,
      blockchain: blockchainStatus,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Blockchain connection error",
      message: error.message,
    });
  }
});

// ============================================================================
// ROUTES
// ============================================================================
app.use("/", nftRoutes);
app.use("/", marketplaceRoutes);

// ============================================================================
// START SERVER
// ============================================================================
app.listen(PORT, () => {
  const signer = getSigner();
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                  BLOCKCHAIN SERVICE                          ║
║══════════════════════════════════════════════════════════════║
║  Port: ${PORT}                                                  ║
║  Ganache: ${GANACHE_URL}                          ║
║  Contract: ${NFT_CONTRACT_ADDRESS}  ║
║  Admin: ${signer.address}     ║
║                                                              ║
║  API Endpoints:                                              ║
║  ├─ POST /mint                - Mint NFT                     ║
║  ├─ GET  /nft/:tokenId        - Get NFT info                 ║
║  ├─ GET  /nfts/:owner         - Get NFTs by owner            ║
║  ├─ POST /transfer            - Transfer NFT                 ║
║  ├─ GET  /token-counter       - Get total minted             ║
║  ├─ POST /marketplace/list    - List NFT for sale            ║
║  ├─ POST /marketplace/list-rent - List NFT for rent          ║
║  ├─ GET  /marketplace/listing-count - Get listing count      ║
║  └─ GET  /marketplace/listing/:id - Get listing details      ║
╚══════════════════════════════════════════════════════════════╝
  `);
});
