/**
 * ========================================================================
 * BLOCKCHAIN CONFIGURATION
 * ========================================================================
 */

const { ethers } = require("ethers");

const GANACHE_URL = process.env.GANACHE_URL || "http://127.0.0.1:8545";
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const POLL_INTERVAL = Number(process.env.POLL_INTERVAL) || 3000; // 3 seconds

// Contract ABI (minimal for events)
const CONTRACT_ABI = require("../../contract-abi.json");

// Initialize provider and contract
const provider = new ethers.JsonRpcProvider(GANACHE_URL);
const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

module.exports = {
  provider,
  contract,
  GANACHE_URL,
  CONTRACT_ADDRESS,
  POLL_INTERVAL,
};
