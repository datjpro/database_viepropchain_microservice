/**
 * ========================================================================
 * NFT OWNERSHIP FIXER - Sửa lỗi ownership theo kết quả phân tích
 * ========================================================================
 */

const mongoose = require("mongoose");
require("dotenv").config();

const MONGO_URI = process.env.MONGODB_URI;

// NFT Schema
const nftSchema = new mongoose.Schema({}, { strict: false });
const NFT = mongoose.model("NFT", nftSchema, "nfts");

async function fixNFTOwnership() {
  try {
    console.log("🔧 STARTING NFT OWNERSHIP FIX");
    console.log("════════════════════════════════");

    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Fix Token 0: currentOwner should be updated
    console.log("\n🔧 Fixing Token 0...");

    const token0 = await NFT.findOne({ tokenId: 0 });
    if (token0) {
      console.log("📋 Current state:");
      console.log(`   owner: ${token0.owner}`);
      console.log(`   currentOwner: ${token0.currentOwner}`);
      console.log(`   originalOwner: ${token0.originalOwner}`);

      const updateResult = await NFT.updateOne(
        { tokenId: 0 },
        {
          $set: {
            currentOwner: "0xd1abb2a4bb9652f90e0944affdf53f0cfff54d13",
            lastTransferAt: new Date(),
          },
          $push: {
            transferHistory: {
              from: token0.currentOwner || "unknown",
              to: "0xd1abb2a4bb9652f90e0944affdf53f0cfff54d13",
              transferredAt: new Date(),
              transferType: "manual_correction",
              note: "Manual fix to sync with blockchain state",
            },
          },
        }
      );

      if (updateResult.modifiedCount > 0) {
        console.log("✅ Token 0 fixed successfully!");
      } else {
        console.log("⚠️ No changes made to Token 0");
      }
    } else {
      console.log("❌ Token 0 not found");
    }

    // Verify Token 2 - should NOT be changed
    console.log("\n🔍 Verifying Token 2...");
    const token2 = await NFT.findOne({ tokenId: 2 });
    if (token2) {
      console.log("📋 Token 2 state:");
      console.log(`   currentOwner: ${token2.currentOwner}`);
      console.log(`   Should be: 0xd1abb2a4bb9652f90e0944affdf53f0cfff54d13`);

      if (
        token2.currentOwner.toLowerCase() ===
        "0xd1abb2a4bb9652f90e0944affdf53f0cfff54d13"
      ) {
        console.log("✅ Token 2 is correctly synced");
      } else {
        console.log("⚠️ Token 2 may need correction");
      }
    }

    console.log("\n📊 FINAL VERIFICATION:");
    console.log("════════════════════════════════");

    const allNFTs = await NFT.find({}).select("tokenId currentOwner owner");
    for (const nft of allNFTs) {
      console.log(`Token ${nft.tokenId}:`);
      console.log(`  currentOwner: ${nft.currentOwner || "undefined"}`);
      console.log(`  owner: ${nft.owner || "undefined"}`);
    }
  } catch (error) {
    console.error("❌ Error fixing ownership:", error.message);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
    console.log("✅ Fix operation completed");
  }
}

// Chạy fix
fixNFTOwnership();
