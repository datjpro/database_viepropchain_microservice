/**
 * ========================================================================
 * FIX USER WALLET ADDRESS - Cập nhật wallet đúng cho user
 * ========================================================================
 */

const mongoose = require("mongoose");
require("dotenv").config();

const MONGO_URI = process.env.MONGODB_URI;

// User Schema
const userSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model("User", userSchema, "users");

async function fixUserWallet() {
  try {
    console.log("🔧 FIXING USER WALLET ADDRESS");
    console.log("═══════════════════════════════");

    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // User hiện tại có email todat2207@gmail.com
    const email = "todat2207@gmail.com";
    const correctWallet = "0xd1abb2a4bb9652f90e0944affdf53f0cfff54d13"; // Wallet đang dùng trên frontend

    const user = await User.findOne({ email });
    if (!user) {
      console.log("❌ User not found");
      return;
    }

    console.log(`\n📋 User BEFORE fix:`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Wallet: ${user.walletAddress}`);

    // Update wallet address
    const updateResult = await User.updateOne(
      { email },
      {
        $set: {
          walletAddress: correctWallet.toLowerCase(),
          walletLinkedAt: new Date(),
        },
      }
    );

    if (updateResult.modifiedCount > 0) {
      console.log("✅ User wallet updated successfully!");

      const updatedUser = await User.findOne({ email });
      console.log(`\n📋 User AFTER fix:`);
      console.log(`   Email: ${updatedUser.email}`);
      console.log(`   Wallet: ${updatedUser.walletAddress}`);
    } else {
      console.log("⚠️ No changes made");
    }
  } catch (error) {
    console.error("❌ Error fixing user wallet:", error.message);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
    console.log("✅ Fix completed");
  }
}

// Chạy fix
fixUserWallet();
