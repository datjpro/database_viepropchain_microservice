/**
 * ========================================================================
 * SYNC DATABASE WITH BLOCKCHAIN - Đồng bộ ownership theo blockchain thật
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
const NFT = mongoose.model("NFT", nftSchema, "nfts");

async function syncWithBlockchain() {
  try {
    console.log("🔄 SYNCING DATABASE WITH BLOCKCHAIN");
    console.log("═══════════════════════════════════════");

    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Get all NFTs from DB
    const nfts = await NFT.find({}).select("tokenId currentOwner owner");
    console.log(`📊 Found ${nfts.length} NFTs in database`);

    for (const nft of nfts) {
      try {
        // Get real owner from blockchain
        const blockchainOwner = await contract.methods
          .ownerOf(nft.tokenId)
          .call();
        const dbOwner = nft.currentOwner || nft.owner;

        console.log(`\n🔍 Token #${nft.tokenId}:`);
        console.log(`   DB: ${dbOwner}`);
        console.log(`   Blockchain: ${blockchainOwner.toLowerCase()}`);

        if (dbOwner !== blockchainOwner.toLowerCase()) {
          console.log(`   ❌ MISMATCH - Fixing...`);

          // Update to match blockchain
          await NFT.updateOne(
            { tokenId: nft.tokenId },
            {
              $set: {
                currentOwner: blockchainOwner.toLowerCase(),
                owner: blockchainOwner.toLowerCase(),
                lastSyncedAt: new Date(),
              },
              $push: {
                transferHistory: {
                  from: dbOwner || "unknown",
                  to: blockchainOwner.toLowerCase(),
                  transactionHash: "blockchain-sync-" + Date.now(),
                  timestamp: new Date(),
                  transferType: "blockchain_sync",
                  note: "Synced with blockchain truth",
                },
              },
            }
          );
          console.log(`   ✅ Updated to match blockchain`);
        } else {
          console.log(`   ✅ Already synced`);
        }
      } catch (error) {
        console.log(
          `   ❌ Error checking Token #${nft.tokenId}: ${error.message}`
        );
      }
    }

    console.log("\n🎉 Blockchain sync completed!");
  } catch (error) {
    console.error("❌ Sync error:", error.message);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
  }
}

// Chạy sync
syncWithBlockchain();
