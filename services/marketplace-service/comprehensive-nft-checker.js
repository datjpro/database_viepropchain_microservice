/**
 * ========================================================================
 * COMPREHENSIVE NFT CHECKER - Kiểm tra toàn diện tất cả NFTs
 * ========================================================================
 */

const { Web3 } = require("web3");
const mongoose = require("mongoose");
require("dotenv").config();

// Kết nối Web3 và MongoDB
const web3 = new Web3("http://127.0.0.1:8545");
const MONGO_URI = process.env.MONGODB_URI;

// Contract ABI (chỉ cần ownerOf)
const contractABI = [
  {
    inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
    name: "ownerOf",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalSupply",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
];

const contract = new web3.eth.Contract(
  contractABI,
  "0xEA4F5F49F396B13CA447FaA792A8702054019Cc8"
);

// NFT Schema cho cả 2 collections
const nftSchemaShared = new mongoose.Schema({}, { strict: false });
const nftSchemaIndexer = new mongoose.Schema({}, { strict: false });

const NFTShared = mongoose.model("NFTShared", nftSchemaShared, "nfts");
const NFTIndexer = mongoose.model("NFTIndexer", nftSchemaIndexer, "nfts");

async function checkAllNFTs() {
  try {
    console.log("🔍 COMPREHENSIVE NFT ANALYSIS");
    console.log("═══════════════════════════════════════════════════");

    // Kết nối MongoDB
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // 1. Kiểm tra tất cả NFTs từ blockchain trước
    console.log("\n📡 BLOCKCHAIN NFT SCAN:");
    console.log("─────────────────────────────────");

    let totalSupply;
    try {
      totalSupply = await contract.methods.totalSupply().call();
      console.log(`📊 Total Supply on Blockchain: ${totalSupply}`);
    } catch (error) {
      console.log("⚠️ Cannot get totalSupply, checking individual tokens...");
      totalSupply = 10; // Fallback - check first 10 tokens
    }

    const blockchainNFTs = [];

    for (let tokenId = 0; tokenId < totalSupply; tokenId++) {
      try {
        const owner = await contract.methods.ownerOf(tokenId).call();
        blockchainNFTs.push({
          tokenId,
          owner: owner.toLowerCase(),
          exists: true,
        });
        console.log(`Token ${tokenId}: ${owner}`);
      } catch (error) {
        console.log(
          `Token ${tokenId}: ❌ NOT EXISTS (${error.message.split(":")[0]})`
        );
        blockchainNFTs.push({
          tokenId,
          owner: null,
          exists: false,
          error: error.message,
        });
      }
    }

    // 2. Lấy tất cả NFTs từ database
    console.log("\n💾 DATABASE NFT SCAN:");
    console.log("─────────────────────────────────");

    const dbNFTs = await NFTShared.find({}).lean();
    console.log(`📊 Total NFTs in DB: ${dbNFTs.length}`);

    // In chi tiết từng NFT trong DB
    for (const nft of dbNFTs) {
      console.log(`\n🔹 Token ${nft.tokenId}:`);
      console.log(`   owner: ${nft.owner || "undefined"}`);
      console.log(`   currentOwner: ${nft.currentOwner || "undefined"}`);
      console.log(`   originalOwner: ${nft.originalOwner || "undefined"}`);
      console.log(`   status: ${nft.status || "undefined"}`);
      console.log(
        `   isActive: ${
          nft.isActive !== undefined ? nft.isActive : "undefined"
        }`
      );
      console.log(
        `   transfers: ${nft.transferHistory ? nft.transferHistory.length : 0}`
      );
      console.log(`   lastTransferAt: ${nft.lastTransferAt || "undefined"}`);
    }

    // 3. So sánh blockchain vs database
    console.log("\n🔄 COMPARISON ANALYSIS:");
    console.log("─────────────────────────────────");

    const analysis = [];

    for (const blockchainNFT of blockchainNFTs) {
      const dbNFT = dbNFTs.find((db) => db.tokenId === blockchainNFT.tokenId);

      if (!blockchainNFT.exists) {
        // NFT không tồn tại trên blockchain
        if (dbNFT) {
          analysis.push({
            tokenId: blockchainNFT.tokenId,
            status: "DELETED_ON_CHAIN",
            blockchain: null,
            database: {
              owner: dbNFT.owner,
              currentOwner: dbNFT.currentOwner,
              isActive: dbNFT.isActive,
            },
            action: "Mark as inactive in DB",
          });
        }
        continue;
      }

      if (!dbNFT) {
        // NFT tồn tại trên blockchain nhưng không có trong DB
        analysis.push({
          tokenId: blockchainNFT.tokenId,
          status: "MISSING_IN_DB",
          blockchain: blockchainNFT.owner,
          database: null,
          action: "Add to database",
        });
        continue;
      }

      // So sánh ownership
      const blockchainOwner = blockchainNFT.owner;
      const dbCurrentOwner = (
        dbNFT.currentOwner ||
        dbNFT.owner ||
        ""
      ).toLowerCase();

      if (blockchainOwner !== dbCurrentOwner) {
        analysis.push({
          tokenId: blockchainNFT.tokenId,
          status: "OWNERSHIP_MISMATCH",
          blockchain: blockchainOwner,
          database: {
            owner: dbNFT.owner,
            currentOwner: dbNFT.currentOwner,
          },
          action: `Update currentOwner to ${blockchainOwner}`,
        });
      } else {
        analysis.push({
          tokenId: blockchainNFT.tokenId,
          status: "SYNCED",
          blockchain: blockchainOwner,
          database: dbCurrentOwner,
        });
      }
    }

    // 4. Báo cáo kết quả
    console.log("\n📋 FINAL ANALYSIS:");
    console.log("═══════════════════════════════════════════════════");

    let syncedCount = 0;
    let mismatchCount = 0;
    let missingCount = 0;
    let deletedCount = 0;

    for (const item of analysis) {
      console.log(`\nToken ${item.tokenId}: ${item.status}`);

      if (item.status === "SYNCED") {
        console.log(`  ✅ OK - Owner: ${item.blockchain}`);
        syncedCount++;
      } else if (item.status === "OWNERSHIP_MISMATCH") {
        console.log(`  ❌ MISMATCH`);
        console.log(`     🔗 Blockchain: ${item.blockchain}`);
        console.log(`     💾 DB owner: ${item.database.owner}`);
        console.log(`     💾 DB currentOwner: ${item.database.currentOwner}`);
        console.log(`  🔧 Action: ${item.action}`);
        mismatchCount++;
      } else if (item.status === "MISSING_IN_DB") {
        console.log(`  ⚠️ Missing in database`);
        console.log(`     🔗 Blockchain owner: ${item.blockchain}`);
        missingCount++;
      } else if (item.status === "DELETED_ON_CHAIN") {
        console.log(`  🗑️ Deleted on blockchain`);
        console.log(`  🔧 Action: ${item.action}`);
        deletedCount++;
      }
    }

    console.log(`\n📊 SUMMARY:`);
    console.log(`  ✅ Synced: ${syncedCount}`);
    console.log(`  ❌ Mismatched: ${mismatchCount}`);
    console.log(`  ⚠️ Missing in DB: ${missingCount}`);
    console.log(`  🗑️ Deleted on chain: ${deletedCount}`);
    console.log(`  🎯 Total analyzed: ${analysis.length}`);

    if (mismatchCount === 0 && missingCount === 0 && deletedCount === 0) {
      console.log("\n🎉 ALL DATA IS PERFECTLY SYNCED! 🎉");
    } else {
      console.log(
        `\n⚠️ Found ${
          mismatchCount + missingCount + deletedCount
        } issues requiring attention`
      );
    }
  } catch (error) {
    console.error("❌ Error during analysis:", error.message);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
  }
}

// Chạy analysis
checkAllNFTs();
