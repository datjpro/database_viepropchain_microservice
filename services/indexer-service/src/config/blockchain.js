/**
 * ========================================================================
 * BLOCKCHAIN CONFIGURATION
 * ========================================================================
 */

const { ethers } = require("ethers");

const GANACHE_URL = process.env.GANACHE_URL || "http://127.0.0.1:8545";
const POLL_INTERVAL = Number(process.env.POLL_INTERVAL) || 3000; // 3 seconds

// Load contract addresses from environment variables (up-to-date)
const NFT_CONTRACT_ADDRESS =
  process.env.NFT_CONTRACT_ADDRESS ||
  "0xEA4F5F49F396B13CA447FaA792A8702054019Cc8";
const MARKETPLACE_CONTRACT_ADDRESS =
  process.env.MARKETPLACE_CONTRACT_ADDRESS ||
  "0x75573f6E6C40780FDf378bA29FcBb8c25c611E24";

// Load contract ABIs from deployed contracts (for ABI only)
const contractsData = require("../../contracts.json");

// Contract ABIs
const NFT_ABI = contractsData.contracts.ViePropChainNFT.abi;
const MARKETPLACE_ABI = contractsData.contracts.Marketplace.abi;

// Initialize provider and contracts
const provider = new ethers.JsonRpcProvider(GANACHE_URL);
const nftContract = new ethers.Contract(
  NFT_CONTRACT_ADDRESS,
  NFT_ABI,
  provider
);
const marketplaceContract = new ethers.Contract(
  MARKETPLACE_CONTRACT_ADDRESS,
  MARKETPLACE_ABI,
  provider
);

module.exports = {
  provider,
  nftContract,
  marketplaceContract,
  contract: nftContract, // Keep for backward compatibility
  GANACHE_URL,
  CONTRACT_ADDRESS: NFT_CONTRACT_ADDRESS, // Keep for backward compatibility
  NFT_CONTRACT_ADDRESS,
  MARKETPLACE_CONTRACT_ADDRESS,
  POLL_INTERVAL,
};
