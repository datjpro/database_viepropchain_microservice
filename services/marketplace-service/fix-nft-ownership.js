/**
 * FIX NFT OWNERSHIP MISMATCH
 * Fix Token ID 0 ownership to match blockchain state
 */

const mongoose = require("mongoose");
require("dotenv").config();

// Import models
const { NFT } = require("../../shared/models");

const MONGO_URI =
  process.env.MONGO_URI ||
  "mongodb+srv://viepropchain:viepropchain123@viepropchain.k9wao.mongodb.net/?retryWrites=true&w=majority&appName=viepropchain";

async function fixNFTOwnership() {
  try {
    console.log("🔧 STARTING NFT OWNERSHIP FIX");
    console.log("═══════════════════════════════");

    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("✅ Connected to MongoDB");

    // Token ID 0 should be owned by 0xd1ABb2a4Bb9652f90E0944AFfDf53F0cFFf54D13
    // But database shows 0xc6890b26a32d9d92aefbc8635c4588247529cdfe

    const tokenId = 0;
    const correctOwner = "0xd1ABb2a4Bb9652f90E0944AFfDf53F0cFFf54D13";
    const oldOwner = "0xc6890b26a32d9d92aefbc8635c4588247529cdfe";

    console.log(`\n🔍 Fixing Token ID: ${tokenId}`);
    console.log(`📝 Current DB Owner: ${oldOwner}`);
    console.log(`🎯 Correct Owner: ${correctOwner}`);

    // Find current NFT
    const currentNFT = await NFT.findOne({ tokenId });
    if (!currentNFT) {
      console.log("❌ NFT not found in database");
      return;
    }

    console.log("📊 Current NFT state:");
    console.log(`   owner: ${currentNFT.owner}`);
    console.log(`   currentOwner: ${currentNFT.currentOwner}`);

    // Update NFT ownership
    const result = await NFT.updateOne(
      { tokenId },
      {
        $set: {
          owner: correctOwner.toLowerCase(),
          currentOwner: correctOwner.toLowerCase(),
          lastTransferAt: new Date(),
          status: "minted",
        },
        $push: {
          transferHistory: {
            from: oldOwner.toLowerCase(),
            to: correctOwner.toLowerCase(),
            transactionHash: "sync-fix-" + Date.now(),
            blockNumber: 0, // Manual sync fix
            transferredAt: new Date(),
            transferType: "sync-correction",
            note: "Manual fix to sync with blockchain state",
          },
        },
      }
    );

    if (result.modifiedCount > 0) {
      console.log("✅ NFT ownership updated successfully!");

      // Verify update
      const updatedNFT = await NFT.findOne({ tokenId });
      console.log("\n📋 Updated NFT state:");
      console.log(`   owner: ${updatedNFT.owner}`);
      console.log(`   currentOwner: ${updatedNFT.currentOwner}`);
      console.log(`   lastTransferAt: ${updatedNFT.lastTransferAt}`);
      console.log(
        `   Transfer history entries: ${
          updatedNFT.transferHistory?.length || 0
        }`
      );
    } else {
      console.log("⚠️ No changes made to the database");
    }
  } catch (error) {
    console.error("❌ Error fixing NFT ownership:", error.message);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
    console.log("✅ Fix operation completed");
  }
}

// Run the fix
fixNFTOwnership();
