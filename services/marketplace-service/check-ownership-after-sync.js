/**
 * ============================================
 * NFT OWNERSHIP CHECKER - After blockchain sync
 * ============================================
 */

const mongoose = require("mongoose");
require("dotenv").config();

const MONGO_URI = process.env.MONGODB_URI;

const nftSchema = new mongoose.Schema({}, { strict: false });
const NFT = mongoose.model("NFT", nftSchema, "nfts");

async function checkNFTOwnership() {
  try {
    console.log("🔍 CHECKING NFT OWNERSHIP AFTER SYNC");
    console.log("═════════════════════════════════════════");

    await mongoose.connect(MONGO_URI);

    const nfts = await NFT.find({}).select("tokenId currentOwner owner");

    for (const nft of nfts) {
      console.log(`\n📦 Token #${nft.tokenId}:`);
      console.log(`   Current Owner: ${nft.currentOwner}`);
      console.log(`   Owner: ${nft.owner}`);
    }

    // Kiểm tra User hiện tại sở hữu bao nhiêu NFT
    const userNFTs = await NFT.find({
      currentOwner: "0xd1abb2a4bb9652f90e0944affdf53f0cfff54d13",
    });

    console.log(
      `\n🎯 User 0xd1abb2a4bb9652f90e0944affdf53f0cfff54d13 owns ${userNFTs.length} NFTs`
    );
    userNFTs.forEach((nft) => {
      console.log(`   - Token #${nft.tokenId}`);
    });
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await mongoose.disconnect();
  }
}

checkNFTOwnership();
