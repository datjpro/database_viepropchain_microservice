/**
 * ========================================================================
 * BLOCKCHAIN SERVICE - Port 4004
 * ========================================================================
 * Nhiệm vụ: Service DUY NHẤT tương tác với blockchain
 * - Quản lý Admin private key
 * - Mint NFT
 * - Transfer, Approve NFT
 * - Gửi signed transactions
 * ========================================================================
 */

const express = require("express");
const { ethers } = require("ethers");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 4004;

// ============================================================================
// BLOCKCHAIN CONFIG
// ============================================================================
const GANACHE_URL = process.env.GANACHE_URL || "http://127.0.0.1:8545";
const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY;
const CONTRACT_ADDRESS = process.env.NFT_CONTRACT_ADDRESS;

// Smart Contract ABI - Load from file
const CONTRACT_ABI = require("./contract-abi.json");

let provider;
let signer;
let contract;

// ============================================================================
// INIT BLOCKCHAIN CONNECTION
// ============================================================================
function initBlockchain() {
  try {
    provider = new ethers.JsonRpcProvider(GANACHE_URL);

    if (!ADMIN_PRIVATE_KEY) {
      throw new Error("ADMIN_PRIVATE_KEY not found in .env");
    }

    if (!CONTRACT_ADDRESS) {
      throw new Error("NFT_CONTRACT_ADDRESS not found in .env");
    }

    signer = new ethers.Wallet(ADMIN_PRIVATE_KEY, provider);
    contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

    console.log("✅ Blockchain initialized");
    console.log("   Provider:", GANACHE_URL);
    console.log("   Contract:", CONTRACT_ADDRESS);
    console.log("   Admin:", signer.address);
  } catch (error) {
    console.error("❌ Blockchain init error:", error.message);
    throw error;
  }
}

initBlockchain();

// ============================================================================
// MIDDLEWARE
// ============================================================================
app.use(express.json());

// ============================================================================
// ROUTES
// ============================================================================
// Use NFT routes (without /api prefix since API Gateway routes /blockchain to this service)
const nftRoutes = require("./src/routes/nftRoutes");
app.use("/nft", nftRoutes);

// ============================================================================
// HEALTH CHECK
// ============================================================================
app.get("/health", async (req, res) => {
  try {
    const blockNumber = await provider.getBlockNumber();
    const balance = await provider.getBalance(signer.address);

    res.json({
      success: true,
      service: "Blockchain Service",
      port: PORT,
      blockchain: {
        connected: true,
        blockNumber,
        adminAddress: signer.address,
        adminBalance: ethers.formatEther(balance),
        contractAddress: CONTRACT_ADDRESS,
      },
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
// START SERVER
// ============================================================================
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                  BLOCKCHAIN SERVICE                          ║
║══════════════════════════════════════════════════════════════║
║  Port: ${PORT}                                                  ║
║  Ganache: ${GANACHE_URL}                          ║
║  Contract: ${CONTRACT_ADDRESS}  ║
║  Admin: ${signer.address}     ║
║                                                              ║
║  Service Endpoints (via API Gateway):                       ║
║  ├─ POST /blockchain/nft/mint         - Mint NFT            ║
║  ├─ GET  /blockchain/nft/nft/:id      - Get NFT info        ║
║  ├─ GET  /blockchain/nft/nfts/:owner  - Get NFTs by owner   ║
║  ├─ POST /blockchain/nft/transfer     - Transfer NFT        ║
║  ├─ GET  /blockchain/nft/token-counter - Get total minted   ║
║  ├─ POST /blockchain/nft/set-user     - Set rental user     ║
║  ├─ GET  /blockchain/nft/user/:id     - Get rental user     ║
║  ├─ GET  /blockchain/nft/user-expires/:id - Get expires     ║
║  ├─ GET  /blockchain/nft/is-rented/:id - Check rented       ║
║  └─ GET  /blockchain/nft/metadata/:id  - Get NFT metadata   ║
╚══════════════════════════════════════════════════════════════╝
  `);
});

module.exports = { provider, contract, signer };
