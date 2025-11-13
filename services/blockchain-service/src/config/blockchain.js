/**
 * ========================================================================
 * BLOCKCHAIN CONFIGURATION
 * ========================================================================
 */

const { ethers } = require("ethers");
const { NFT_CONTRACT_ADDRESS, MARKETPLACE_CONTRACT_ADDRESS } = require('./contract');

const GANACHE_URL = process.env.GANACHE_URL || "http://127.0.0.1:8545";
const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY;
const NFT_CONTRACT = process.env.NFT_CONTRACT_ADDRESS || NFT_CONTRACT_ADDRESS;
const MARKETPLACE_CONTRACT = process.env.MARKETPLACE_CONTRACT_ADDRESS || MARKETPLACE_CONTRACT_ADDRESS;

let provider;
let signer;

/**
 * Initialize blockchain connection
 */
function initBlockchain() {
  try {
    provider = new ethers.JsonRpcProvider(GANACHE_URL);

    if (!ADMIN_PRIVATE_KEY) {
      throw new Error("ADMIN_PRIVATE_KEY not found in .env");
    }

    if (!NFT_CONTRACT) {
      throw new Error("NFT_CONTRACT_ADDRESS not found");
    }

    if (!MARKETPLACE_CONTRACT) {
      throw new Error("MARKETPLACE_CONTRACT_ADDRESS not found");
    }

    signer = new ethers.Wallet(ADMIN_PRIVATE_KEY, provider);

    console.log("✅ Blockchain initialized");
    console.log("   Provider:", GANACHE_URL);
    console.log("   NFT Contract:", NFT_CONTRACT);
    console.log("   Marketplace Contract:", MARKETPLACE_CONTRACT);
    console.log("   Admin:", signer.address);

    console.log("✅ Blockchain initialized");
    console.log("   Provider:", GANACHE_URL);
    console.log("   NFT Contract:", NFT_CONTRACT);
    console.log("   Marketplace Contract:", MARKETPLACE_CONTRACT);
    console.log("   Admin:", signer.address);

    return { provider, signer };
  } catch (error) {
    console.error("❌ Blockchain init error:", error.message);
    throw error;
  }
}

/**
 * Get blockchain health status
 */
async function getBlockchainHealth() {
  try {
    const blockNumber = await provider.getBlockNumber();
    const balance = await provider.getBalance(signer.address);

    return {
      connected: true,
      blockNumber,
      adminAddress: signer.address,
      adminBalance: ethers.formatEther(balance),
      nftContractAddress: NFT_CONTRACT,
      marketplaceContractAddress: MARKETPLACE_CONTRACT,
    };
  } catch (error) {
    throw new Error(`Blockchain health check failed: ${error.message}`);
  }
}

module.exports = {
  initBlockchain,
  getBlockchainHealth,
  getProvider: () => provider,
  getSigner: () => signer,
  GANACHE_URL,
  NFT_CONTRACT_ADDRESS: NFT_CONTRACT,
  MARKETPLACE_CONTRACT_ADDRESS: MARKETPLACE_CONTRACT,
};
