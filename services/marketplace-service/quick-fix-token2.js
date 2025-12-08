/**
 * ========================================================================
 * QUICK FIX TOKEN #2 - Sửa nhanh field owner bị sai
 * ========================================================================
 */

const mongoose = require("mongoose");
require("dotenv").config();

const MONGO_URI = process.env.MONGODB_URI;

// NFT Schema
const nftSchema = new mongoose.Schema({}, { strict: false });
const NFT = mongoose.model("NFT", nftSchema, "nfts");

async function quickFixToken2() {
  try {
    console.log("🔧 QUICK FIX TOKEN #2");
    console.log("═════════════════════");

    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Token #2 hiện tại:
    // currentOwner: "0xd1abb2a4bb9652f90e0944affdf53f0cfff54d13" ✅ (ĐÚNG)
    // owner: "0xc6890b26a32d9d92aefbc8635c4588247529cdfe" ❌ (SAI)

    // Blockchain nói: Token #2 thuộc về 0xd1ABb2a4Bb9652f90E0944AFfDf53F0cFFf54D13

    const token2Before = await NFT.findOne({ tokenId: 2 });
    console.log("\n📋 Token #2 BEFORE fix:");
    console.log(`   owner: ${token2Before.owner}`);
    console.log(`   currentOwner: ${token2Before.currentOwner}`);

    // Sửa field owner về đúng như currentOwner
    const updateResult = await NFT.updateOne(
      { tokenId: 2 },
      {
        $set: {
          owner: token2Before.currentOwner, // Sync owner với currentOwner
          lastSyncedAt: new Date(),
        },
        $push: {
          transferHistory: {
            from: token2Before.owner,
            to: token2Before.currentOwner,
            transactionHash: "owner-field-fix-" + Date.now(),
            timestamp: new Date(),
            transferType: "owner_field_correction",
            note: "Fix owner field to match currentOwner and blockchain state",
          },
        },
      }
    );

    if (updateResult.modifiedCount > 0) {
      console.log("✅ Token #2 owner field fixed!");

      const token2After = await NFT.findOne({ tokenId: 2 });
      console.log("\n📋 Token #2 AFTER fix:");
      console.log(`   owner: ${token2After.owner}`);
      console.log(`   currentOwner: ${token2After.currentOwner}`);
      console.log(
        `   Both fields match: ${
          token2After.owner === token2After.currentOwner ? "✅" : "❌"
        }`
      );
    } else {
      console.log("⚠️ No changes made");
    }
  } catch (error) {
    console.error("❌ Error fixing Token #2:", error.message);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
    console.log("✅ Quick fix completed");
  }
}

// Chạy fix
quickFixToken2();
