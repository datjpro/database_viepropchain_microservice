/**
 * ========================================================================
 * BLOCKCHAIN CONFIGURATION
 * ========================================================================
 */

const { ethers } = require("ethers");

const GANACHE_URL = process.env.GANACHE_URL || "http://127.0.0.1:8545";
const POLL_INTERVAL = Number(process.env.POLL_INTERVAL) || 3000; // 3 seconds

// Load contract data from deployed contracts
const contractsData = require("../../contracts.json");
const NFT_CONTRACT_ADDRESS = contractsData.contracts.ViePropChainNFT.address;
const MARKETPLACE_CONTRACT_ADDRESS = contractsData.contracts.Marketplace.address;

// Contract ABIs
const NFT_ABI = contractsData.contracts.ViePropChainNFT.abi;
const MARKETPLACE_ABI = contractsData.contracts.Marketplace.abi;

// Initialize provider and contracts
const provider = new ethers.JsonRpcProvider(GANACHE_URL);
const nftContract = new ethers.Contract(NFT_CONTRACT_ADDRESS, NFT_ABI, provider);
const marketplaceContract = new ethers.Contract(MARKETPLACE_CONTRACT_ADDRESS, MARKETPLACE_ABI, provider);

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
