/**
 * ========================================================================
 * SWAP WALLETS - Hoán đổi wallet giữa 2 users
 * ========================================================================
 */

const mongoose = require("mongoose");
require("dotenv").config();

const MONGO_URI = process.env.MONGODB_URI;

// User Schema
const userSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model("User", userSchema, "users");

async function swapWallets() {
  try {
    console.log("🔄 SWAPPING WALLETS BETWEEN USERS");
    console.log("═══════════════════════════════════");

    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Current state:
    // todat2207@gmail.com → 0xc689... (but frontend wants 0xd1ab...)
    // tophamthanhdatt@gmail.com → 0xd1ab...

    const user1Email = "todat2207@gmail.com";
    const user2Email = "tophamthanhdatt@gmail.com";
    const tempWallet = "temp_wallet_" + Date.now();

    console.log("\n📋 BEFORE SWAP:");
    const user1Before = await User.findOne({ email: user1Email });
    const user2Before = await User.findOne({ email: user2Email });
    console.log(`${user1Email} → ${user1Before?.walletAddress}`);
    console.log(`${user2Email} → ${user2Before?.walletAddress}`);

    // Step 1: Set user1 to temp wallet to avoid constraint violation
    await User.updateOne(
      { email: user1Email },
      { $set: { walletAddress: tempWallet } }
    );

    // Step 2: Move user2's wallet to user1
    await User.updateOne(
      { email: user1Email },
      { $set: { walletAddress: user2Before.walletAddress } }
    );

    // Step 3: Move user1's original wallet to user2
    await User.updateOne(
      { email: user2Email },
      { $set: { walletAddress: user1Before.walletAddress } }
    );

    console.log("\n📋 AFTER SWAP:");
    const user1After = await User.findOne({ email: user1Email });
    const user2After = await User.findOne({ email: user2Email });
    console.log(`${user1Email} → ${user1After?.walletAddress}`);
    console.log(`${user2Email} → ${user2After?.walletAddress}`);

    console.log("\n✅ Wallet swap completed!");
    console.log(
      "   Now todat2207@gmail.com has the wallet that frontend is using"
    );
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
  }
}

swapWallets();
