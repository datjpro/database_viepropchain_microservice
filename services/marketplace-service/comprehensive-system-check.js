/**
 * ========================================================================
 * COMPREHENSIVE SYSTEM STATUS CHECK - Kiểm tra toàn bộ hệ thống
 * ========================================================================
 */

const { Web3 } = require("web3");
const mongoose = require("mongoose");
require("dotenv").config();

// Kết nối
const web3 = new Web3("http://127.0.0.1:8545");
const MONGO_URI = process.env.MONGODB_URI;

// Contract setup
const contractABI = [
  {
    inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
    name: "ownerOf",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
];
const contract = new web3.eth.Contract(
  contractABI,
  "0xEA4F5F49F396B13CA447FaA792A8702054019Cc8"
);

// Models
const nftSchema = new mongoose.Schema({}, { strict: false });
const propertySchema = new mongoose.Schema({}, { strict: false });
const userSchema = new mongoose.Schema({}, { strict: false });
const NFT = mongoose.model("NFT", nftSchema, "nfts");
const Property = mongoose.model("Property", propertySchema, "properties");
const User = mongoose.model("User", userSchema, "users");

async function comprehensiveCheck() {
  try {
    console.log("🔍 COMPREHENSIVE SYSTEM STATUS CHECK");
    console.log("═══════════════════════════════════════════════");

    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // 1. Kiểm tra Ganache accounts
    console.log("\n📊 GANACHE ACCOUNTS:");
    console.log("═════════════════════════");
    const accounts = await web3.eth.getAccounts();
    for (let i = 0; i < 3 && i < accounts.length; i++) {
      const balance = await web3.eth.getBalance(accounts[i]);
      const balanceETH = web3.utils.fromWei(balance, "ether");
      console.log(`Account ${i}: ${accounts[i]}`);
      console.log(`           Balance: ${balanceETH} ETH`);
    }

    // 2. Kiểm tra NFTs ownership
    console.log("\n📦 NFT OWNERSHIP CHECK:");
    console.log("═════════════════════════");
    const nfts = await NFT.find({}).select(
      "tokenId currentOwner owner totalSales"
    );

    for (const nft of nfts) {
      try {
        const blockchainOwner = await contract.methods
          .ownerOf(nft.tokenId)
          .call();
        const dbOwner = nft.currentOwner || nft.owner;
        const syncStatus =
          dbOwner === blockchainOwner.toLowerCase()
            ? "✅ SYNCED"
            : "❌ MISMATCH";

        console.log(`Token #${nft.tokenId}:`);
        console.log(`  DB Owner: ${dbOwner}`);
        console.log(`  Blockchain: ${blockchainOwner.toLowerCase()}`);
        console.log(`  Status: ${syncStatus}`);
        console.log(`  Sales: ${nft.totalSales || 0}`);
        console.log(`  ──────────────────────────────────────`);
      } catch (error) {
        console.log(`Token #${nft.tokenId}: ❌ Error - ${error.message}`);
      }
    }

    // 3. Kiểm tra Properties ownership
    console.log("\n🏠 PROPERTIES OWNERSHIP CHECK:");
    console.log("═════════════════════════════════");
    const properties = await Property.find({}).select(
      "tokenId owner currentOwner status"
    );

    for (const prop of properties) {
      const propOwner = prop.currentOwner || prop.owner;
      console.log(`Property Token #${prop.tokenId}:`);
      console.log(`  Owner: ${propOwner}`);
      console.log(`  Status: ${prop.status}`);
      console.log(`  ──────────────────────────────────────`);
    }

    // 4. Kiểm tra Users và wallet addresses
    console.log("\n👤 USER WALLET ADDRESSES:");
    console.log("═════════════════════════════");
    const users = await User.find({}).select("walletAddress address email");

    users.forEach((user) => {
      console.log(`User: ${user.email || "No email"}`);
      console.log(
        `  Wallet: ${user.walletAddress || user.address || "No wallet"}`
      );
      console.log(`  ──────────────────────────────────────`);
    });

    // 5. Kiểm tra blockchain connection
    console.log("\n⛓️ BLOCKCHAIN CONNECTION:");
    console.log("═════════════════════════════");
    const blockNumber = await web3.eth.getBlockNumber();
    const networkId = await web3.eth.net.getId();
    console.log(`Block Number: ${blockNumber}`);
    console.log(`Network ID: ${networkId}`);
    console.log(`Ganache Status: ✅ Connected`);

    console.log("\n🎉 SYSTEM CHECK COMPLETED!");
  } catch (error) {
    console.error("❌ System check error:", error.message);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
  }
}

// Chạy check
comprehensiveCheck();
