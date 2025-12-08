/**
 * ========================================================================
 * CHECK WALLET CONFLICTS - Kiểm tra ai đang dùng wallet nào
 * ========================================================================
 */

const mongoose = require("mongoose");
require("dotenv").config();

const MONGO_URI = process.env.MONGODB_URI;

// User Schema
const userSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model("User", userSchema, "users");

async function checkWalletConflicts() {
  try {
    console.log("🔍 CHECKING WALLET CONFLICTS");
    console.log("═════════════════════════════");

    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    const wallets = [
      "0xc6890b26a32d9d92aefbc8635c4588247529cdfe", // User cũ
      "0xd1abb2a4bb9652f90e0944affdf53f0cfff54d13", // Frontend đang dùng
    ];

    for (const wallet of wallets) {
      console.log(`\n🔍 Wallet: ${wallet}`);
      console.log("═══════════════════════════════════════════════");

      const users = await User.find({ walletAddress: wallet });

      if (users.length === 0) {
        console.log("   ✅ No users found");
      } else {
        users.forEach((user) => {
          console.log(`   👤 User: ${user.email}`);
          console.log(`      ID: ${user._id}`);
          console.log(`      Role: ${user.role || "user"}`);
          console.log(`      Created: ${user.createdAt}`);
          console.log(`      ────────────────────────────`);
        });
      }
    }

    // Tìm tất cả users có wallet
    console.log(`\n📋 ALL USERS WITH WALLETS:`);
    console.log("═══════════════════════════════");
    const allUsersWithWallet = await User.find({
      walletAddress: { $exists: true, $ne: null },
    }).select("email walletAddress role");

    allUsersWithWallet.forEach((user) => {
      console.log(
        `${user.email} → ${user.walletAddress} (${user.role || "user"})`
      );
    });
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
  }
}

checkWalletConflicts();
