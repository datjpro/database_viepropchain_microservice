/**
 * ========================================================================
 * FIX CURRENT OWNERSHIP ISSUES - Script một lần
 * ========================================================================
 * Sửa lỗi ownership hiện tại dựa trên kết quả comprehensive analysis
 * ========================================================================
 */

const mongoose = require("mongoose");
require("dotenv").config();

const MONGO_URI = process.env.MONGODB_URI;

// Định nghĩa schemas linh hoạt
const NFTSchema = new mongoose.Schema({}, { strict: false });
const PropertySchema = new mongoose.Schema({}, { strict: false });
const UserSchema = new mongoose.Schema({}, { strict: false });

const NFT = mongoose.model("NFT", NFTSchema, "nfts");
const Property = mongoose.model("Property", PropertySchema, "properties");
const User = mongoose.model("User", UserSchema, "users");

async function fixCurrentOwnershipIssues() {
  try {
    console.log("🔧 FIXING CURRENT OWNERSHIP ISSUES");
    console.log("═══════════════════════════════════════════");

    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Dựa trên kết quả analysis trước đó:
    // Token 0: Cần update từ 0xc6890b26a32d9d92aefbc8635c4588247529cdfe
    //          thành 0xd1abb2a4bb9652f90e0944affdf53f0cfff54d13

    const fixes = [
      {
        tokenId: 0,
        currentDBOwner: "0xc6890b26a32d9d92aefbc8635c4588247529cdfe",
        correctOwner: "0xd1abb2a4bb9652f90e0944affdf53f0cfff54d13",
      },
    ];

    console.log(`\n🎯 Processing ${fixes.length} ownership fixes...\n`);

    for (const fix of fixes) {
      console.log(`🔧 Fixing Token #${fix.tokenId}:`);
      console.log(`   From: ${fix.currentDBOwner}`);
      console.log(`   To: ${fix.correctOwner}`);

      // 1. Tìm User mới (nếu có)
      const newOwnerUser = await User.findOne({
        $or: [
          {
            walletAddress: { $regex: new RegExp(`^${fix.correctOwner}$`, "i") },
          },
          { wallet: { $regex: new RegExp(`^${fix.correctOwner}$`, "i") } },
          { address: { $regex: new RegExp(`^${fix.correctOwner}$`, "i") } },
        ],
      });

      const newOwnerId = newOwnerUser ? newOwnerUser._id : null;
      const ownerInfo = newOwnerUser
        ? `${newOwnerUser.email || newOwnerUser.username || "Unknown User"}`
        : "Unknown Wallet";

      console.log(`   👤 Owner: ${ownerInfo}`);

      // 2. Update NFT
      const nftUpdate = await NFT.findOneAndUpdate(
        { tokenId: fix.tokenId },
        {
          $set: {
            currentOwner: fix.correctOwner.toLowerCase(),
            lastSyncedAt: new Date(),
          },
          $push: {
            transferHistory: {
              from: fix.currentDBOwner.toLowerCase(),
              to: fix.correctOwner.toLowerCase(),
              transactionHash: "manual-fix-" + Date.now(),
              timestamp: new Date(),
              transferType: "manual_correction",
              note: "Manual fix to sync with blockchain state",
            },
          },
        },
        { new: true }
      );

      if (nftUpdate) {
        console.log(`   ✅ NFT updated successfully`);
      } else {
        console.log(`   ❌ NFT not found`);
        continue;
      }

      // 3. Update Property
      const propertyQuery = {
        $or: [{ "nft.tokenId": fix.tokenId }, { tokenId: fix.tokenId }],
      };

      const property = await Property.findOne(propertyQuery);

      if (property) {
        const propertyUpdate = await Property.findOneAndUpdate(
          propertyQuery,
          {
            $set: {
              owner: newOwnerId,
              ownerWallet: fix.correctOwner.toLowerCase(),
              lastOwnerSyncAt: new Date(),
              "nft.currentOwner": fix.correctOwner.toLowerCase(),
            },
          },
          { new: true }
        );

        if (propertyUpdate) {
          console.log(`   ✅ Property updated successfully`);
          console.log(
            `   🏠 Property Title: ${propertyUpdate.title || "Untitled"}`
          );
        } else {
          console.log(`   ❌ Property update failed`);
        }
      } else {
        console.log(`   ⚠️ Property not found for Token #${fix.tokenId}`);
      }

      console.log("");
    }

    // 4. Verification - Kiểm tra lại sau khi sửa
    console.log("🔍 VERIFICATION - Checking results:");
    console.log("─────────────────────────────────────────");

    for (const fix of fixes) {
      const nft = await NFT.findOne({ tokenId: fix.tokenId });
      const property = await Property.findOne({
        $or: [{ "nft.tokenId": fix.tokenId }, { tokenId: fix.tokenId }],
      });

      console.log(`\nToken #${fix.tokenId}:`);
      if (nft) {
        console.log(`  📊 NFT currentOwner: ${nft.currentOwner}`);
        console.log(`  📊 NFT owner: ${nft.owner || "undefined"}`);
      }
      if (property) {
        console.log(`  🏠 Property owner: ${property.owner || "undefined"}`);
        console.log(
          `  🏠 Property ownerWallet: ${property.ownerWallet || "undefined"}`
        );
      }

      const isNFTFixed =
        nft && nft.currentOwner === fix.correctOwner.toLowerCase();
      const isPropertyFixed =
        property && property.ownerWallet === fix.correctOwner.toLowerCase();

      console.log(
        `  ✅ Status: NFT(${isNFTFixed ? "✅" : "❌"}) Property(${
          isPropertyFixed ? "✅" : "❌"
        })`
      );
    }

    console.log("\n🎉 OWNERSHIP FIX COMPLETED!");
  } catch (error) {
    console.error("❌ Error fixing ownership:", error.message);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
  }
}

// Chạy fix
fixCurrentOwnershipIssues();
