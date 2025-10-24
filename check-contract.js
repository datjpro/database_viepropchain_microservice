/**
 * Check if contract exists on Ganache
 */

const { ethers } = require("ethers");

const GANACHE_URL = "http://127.0.0.1:8545";
const CONTRACT_ADDRESS = "0x5995e09c8CE97519539213cEC3349a023095780b";

async function checkContract() {
  try {
    const provider = new ethers.JsonRpcProvider(GANACHE_URL);

    console.log("🔍 Checking contract on Ganache...");
    console.log("   Contract Address:", CONTRACT_ADDRESS);
    console.log("");

    // Get bytecode
    const code = await provider.getCode(CONTRACT_ADDRESS);

    console.log("📋 Contract Bytecode:");
    console.log("   Length:", code.length);
    console.log("   Code:", code.substring(0, 100) + "...");
    console.log("");

    if (code === "0x" || code.length <= 2) {
      console.log("❌ CONTRACT NOT FOUND!");
      console.log("   Contract does not exist at this address.");
      console.log("   → You need to deploy the contract again.");
      console.log("");
      console.log("💡 SOLUTION:");
      console.log("   cd viepropchain");
      console.log("   npx truffle migrate --network development");
      console.log("");
      console.log("   Then update CONTRACT_ADDRESS in .env with new address.");
    } else {
      console.log("✅ CONTRACT EXISTS!");
      console.log("   Contract is deployed and has bytecode.");
      console.log("");

      // Try to call tokenCounter
      const abi = [
        "function tokenCounter() public view returns (uint256)",
        "function name() public view returns (string)",
        "function symbol() public view returns (string)",
      ];

      const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, provider);

      try {
        const name = await contract.name();
        const symbol = await contract.symbol();
        const tokenCounter = await contract.tokenCounter();

        console.log("📊 Contract Info:");
        console.log("   Name:", name);
        console.log("   Symbol:", symbol);
        console.log("   Token Counter:", tokenCounter.toString());
        console.log("");
        console.log("✅ Contract is working correctly!");
      } catch (error) {
        console.log("⚠️ Contract exists but has errors:");
        console.log("   ", error.message);
        console.log("");
        console.log("💡 This might be wrong ABI or contract interface.");
      }
    }

    // Check current block number
    const blockNumber = await provider.getBlockNumber();
    console.log("📦 Current Block:", blockNumber);
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

checkContract();
