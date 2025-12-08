/**
 * ========================================================================
 * RESTORE ORIGINAL WALLETS - Khôi phục lại wallet ban đầu
 * ========================================================================
 */

const mongoose = require("mongoose");
require("dotenv").config();

const MONGO_URI = process.env.MONGODB_URI;

async function restoreOriginalWallets() {
  try {
    console.log("🔄 RESTORING ORIGINAL WALLETS");
    console.log("═══════════════════════════════");

    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    const db = mongoose.connection.db;
    const collection = db.collection("users");

    // Restore original wallets
    const updates = [
      {
        email: "todat2207@gmail.com",
        originalWallet: "0xc6890b26a32d9d92aefbc8635c4588247529cdfe",
      },
      {
        email: "tophamthanhdatt@gmail.com",
        originalWallet: "0xd1abb2a4bb9652f90e0944affdf53f0cfff54d13",
      },
    ];

    console.log("\n🔄 Restoring wallets...");
    for (const update of updates) {
      const result = await collection.updateOne(
        { email: update.email },
        {
          $set: {
            walletAddress: update.originalWallet.toLowerCase(),
            walletLinkedAt: new Date(),
          },
        }
      );

      if (result.modifiedCount > 0) {
        console.log(`✅ ${update.email} → ${update.originalWallet}`);
      }
    }

    // Check final state
    console.log("\n📋 FINAL STATE (RESTORED):");
    console.log("═════════════════════════════");
    const users = await collection
      .find({
        email: { $in: ["todat2207@gmail.com", "tophamthanhdatt@gmail.com"] },
      })
      .toArray();

    users.forEach((user) => {
      console.log(`${user.email} → ${user.walletAddress}`);
    });

    console.log("\n✅ Original wallets restored!");
    console.log("   Each user now has their own wallet again");
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
  }
}

restoreOriginalWallets();
