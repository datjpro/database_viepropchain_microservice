/**
 * ========================================================================
 * BLOCKCHAIN CONFIGURATION
 * ========================================================================
 */

const { ethers } = require("ethers");

const GANACHE_URL = process.env.GANACHE_URL || "http://127.0.0.1:8545";
const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;

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

    if (!CONTRACT_ADDRESS) {
      throw new Error("CONTRACT_ADDRESS not found in .env");
    }

    signer = new ethers.Wallet(ADMIN_PRIVATE_KEY, provider);

    console.log("✅ Blockchain initialized");
    console.log("   Provider:", GANACHE_URL);
    console.log("   Contract:", CONTRACT_ADDRESS);
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
      contractAddress: CONTRACT_ADDRESS,
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
  CONTRACT_ADDRESS,
};
