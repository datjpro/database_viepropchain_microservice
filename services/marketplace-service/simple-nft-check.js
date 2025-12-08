/**
 * ========================================================================
 * SIMPLE NFT CHECKER - Version không bị treo
 * ========================================================================
 */

const mongoose = require("mongoose");
require("dotenv").config();

const MONGO_URI = process.env.MONGODB_URI;

async function simpleNFTCheck() {
  try {
    console.log("🔍 SIMPLE NFT CHECK");
    console.log("═══════════════════");

    // Kết nối MongoDB với timeout
    console.log("⏳ Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 10000,
    });
    console.log("✅ Connected to MongoDB");

    // Lấy NFTs từ DB
    const NFT = mongoose.model(
      "NFT",
      new mongoose.Schema({}, { strict: false }),
      "nfts"
    );
    const nfts = await NFT.find({}).lean();

    console.log(`\n📊 Found ${nfts.length} NFTs in database:`);

    for (const nft of nfts) {
      console.log(`\n🔹 Token #${nft.tokenId}:`);
      console.log(`   currentOwner: ${nft.currentOwner || "undefined"}`);
      console.log(`   owner: ${nft.owner || "undefined"}`);
      console.log(`   totalSales: ${nft.totalSales || 0}`);
      console.log(`   saleHistory: ${nft.saleHistory?.length || 0} entries`);
      console.log(
        `   transferHistory: ${nft.transferHistory?.length || 0} entries`
      );

      // Check last transfer
      if (nft.transferHistory && nft.transferHistory.length > 0) {
        const lastTransfer =
          nft.transferHistory[nft.transferHistory.length - 1];
        console.log(
          `   Last transfer type: ${lastTransfer.transferType || "unknown"}`
        );
        if (lastTransfer.price) {
          console.log(
            `   Last transfer price: ${lastTransfer.price} ${
              lastTransfer.currency || "ETH"
            }`
          );
        }
      }

      // Check sale history
      if (nft.saleHistory && nft.saleHistory.length > 0) {
        const lastSale = nft.saleHistory[nft.saleHistory.length - 1];
        console.log(
          `   Last sale price: ${lastSale.price} ${lastSale.currency || "ETH"}`
        );
        console.log(`   Last sale date: ${lastSale.date}`);
      }
    }

    console.log("\n📋 SUMMARY:");
    console.log(`   Total NFTs: ${nfts.length}`);
    console.log(
      `   NFTs with sales: ${nfts.filter((n) => n.totalSales > 0).length}`
    );
    console.log(
      `   Total sales count: ${nfts.reduce(
        (sum, n) => sum + (n.totalSales || 0),
        0
      )}`
    );
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log("\n🔌 Disconnected from MongoDB");
    }
    console.log("✅ Check completed");
    process.exit(0);
  }
}

// Chạy check với timeout
const timeout = setTimeout(() => {
  console.log("⏰ Script timeout - forcing exit");
  process.exit(1);
}, 10000); // 10 giây timeout

simpleNFTCheck().finally(() => {
  clearTimeout(timeout);
});
