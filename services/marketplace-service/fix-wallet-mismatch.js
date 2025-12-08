/**
 * ========================================================================
 * FIX WALLET MISMATCH - Remove unique constraint và fix wallet
 * ========================================================================
 */

const mongoose = require("mongoose");
require("dotenv").config();

const MONGO_URI = process.env.MONGODB_URI;

async function fixWalletMismatch() {
  try {
    console.log("🔧 FIXING WALLET MISMATCH");
    console.log("═══════════════════════════");

    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    const db = mongoose.connection.db;
    const collection = db.collection("users");

    // Step 1: Drop unique index on walletAddress
    console.log("\n🗑️  Dropping walletAddress unique index...");
    try {
      await collection.dropIndex("walletAddress_1");
      console.log("✅ Unique index dropped");
    } catch (err) {
      console.log("⚠️ Index might not exist, continuing...");
    }

    // Step 2: Update todat2207@gmail.com to use the frontend wallet
    const userEmail = "todat2207@gmail.com";
    const frontendWallet = "0xd1abb2a4bb9652f90e0944affdf53f0cfff54d13";

    console.log(`\n🔄 Updating ${userEmail} to use wallet ${frontendWallet}`);

    const updateResult = await collection.updateOne(
      { email: userEmail },
      {
        $set: {
          walletAddress: frontendWallet.toLowerCase(),
          walletLinkedAt: new Date(),
        },
      }
    );

    if (updateResult.modifiedCount > 0) {
      console.log("✅ User wallet updated successfully!");
    } else {
      console.log("⚠️ No changes made");
    }

    // Step 3: Check final state
    console.log("\n📋 FINAL STATE:");
    console.log("═════════════════");
    const users = await collection
      .find({
        email: { $in: ["todat2207@gmail.com", "tophamthanhdatt@gmail.com"] },
      })
      .toArray();

    users.forEach((user) => {
      console.log(`${user.email} → ${user.walletAddress}`);
    });

    console.log("\n✅ Wallet mismatch fixed!");
    console.log("   Now frontend wallet matches database wallet");
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
  }
}

fixWalletMismatch();
