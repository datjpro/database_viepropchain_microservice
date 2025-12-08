/**
 * ========================================================================
 * TEST SALE TRANSACTION - Tạo một transaction sale thật để test
 * ========================================================================
 */

const mongoose = require("mongoose");
const axios = require("axios");
require("dotenv").config();

const MONGO_URI = process.env.MONGODB_URI;

// NFT Schema
const nftSchema = new mongoose.Schema({}, { strict: false });
const NFT = mongoose.model("NFT", nftSchema, "nfts");

async function testSaleTransaction() {
  try {
    console.log("🧪 TESTING SALE TRANSACTION FLOW");
    console.log("═══════════════════════════════════");

    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // 1. Kiểm tra NFT hiện tại
    const tokenId = 2;
    const nftBefore = await NFT.findOne({ tokenId });

    console.log(`\n📊 NFT Token #${tokenId} BEFORE test sale:`);
    console.log(`   currentOwner: ${nftBefore.currentOwner}`);
    console.log(`   totalSales: ${nftBefore.totalSales || 0}`);
    console.log(`   saleHistory length: ${nftBefore.saleHistory?.length || 0}`);
    console.log(
      `   transferHistory length: ${nftBefore.transferHistory?.length || 0}`
    );

    // 2. Simulate sale transaction data
    const saleData = {
      tokenId: tokenId,
      seller: "0xd1abb2a4bb9652f90e0944affdf53f0cfff54d13", // Current owner
      buyer: "0xc6890b26a32d9d92aefbc8635c4588247529cdfe", // Test buyer
      price: 15, // 15 ETH
      currency: "ETH",
      transactionHash: "0x" + Date.now().toString(16) + "abcdef123456",
      blockNumber: 90,
    };

    console.log(`\n🔄 Simulating sale transaction:`);
    console.log(`   From: ${saleData.seller}`);
    console.log(`   To: ${saleData.buyer}`);
    console.log(`   Price: ${saleData.price} ${saleData.currency}`);

    // 3. Update NFT với proper sale data
    const updateResult = await NFT.updateOne(
      { tokenId },
      {
        // 1. Update ownership
        $set: {
          currentOwner: saleData.buyer.toLowerCase(),
          owner: saleData.buyer.toLowerCase(),
          lastTransferAt: new Date(),
          isListed: false,
          status: "minted",
        },

        // 2. Add to history arrays
        $push: {
          // Transfer history với sale info
          transferHistory: {
            from: saleData.seller.toLowerCase(),
            to: saleData.buyer.toLowerCase(),
            transactionHash: saleData.transactionHash,
            blockNumber: saleData.blockNumber,
            transferredAt: new Date(),
            transferType: "sale", // 🔥 QUAN TRỌNG: Đánh dấu là sale
            price: saleData.price, // 🔥 QUAN TRỌNG: Lưu price
            currency: saleData.currency,
          },

          // Sale history riêng
          saleHistory: {
            seller: saleData.seller.toLowerCase(),
            buyer: saleData.buyer.toLowerCase(),
            price: saleData.price,
            currency: saleData.currency,
            transactionHash: saleData.transactionHash,
            blockNumber: saleData.blockNumber,
            date: new Date(),
          },
        },

        // 3. Increment counters
        $inc: {
          totalTransfers: 1,
          totalSales: 1, // 🔥 QUAN TRỌNG: Tăng counter
        },
      }
    );

    if (updateResult.modifiedCount > 0) {
      console.log("✅ Sale transaction recorded successfully!");

      // 4. Verify results
      const nftAfter = await NFT.findOne({ tokenId });
      console.log(`\n📊 NFT Token #${tokenId} AFTER test sale:`);
      console.log(`   currentOwner: ${nftAfter.currentOwner}`);
      console.log(`   totalSales: ${nftAfter.totalSales || 0}`);
      console.log(
        `   saleHistory length: ${nftAfter.saleHistory?.length || 0}`
      );
      console.log(
        `   transferHistory length: ${nftAfter.transferHistory?.length || 0}`
      );

      // Check latest sale
      const latestSale = nftAfter.saleHistory[nftAfter.saleHistory.length - 1];
      const latestTransfer =
        nftAfter.transferHistory[nftAfter.transferHistory.length - 1];

      console.log(`\n📈 Latest sale:`);
      console.log(
        `   Price: ${latestSale?.price || "N/A"} ${latestSale?.currency || ""}`
      );
      console.log(`   Date: ${latestSale?.date || "N/A"}`);

      console.log(`\n📋 Latest transfer:`);
      console.log(`   Type: ${latestTransfer?.transferType || "N/A"}`);
      console.log(
        `   Price: ${latestTransfer?.price || "N/A"} ${
          latestTransfer?.currency || ""
        }`
      );

      // Verify data integrity
      const hasProperSale =
        nftAfter.totalSales > 0 &&
        nftAfter.saleHistory.length > 0 &&
        latestTransfer.transferType === "sale";

      console.log(
        `\n🎯 Sale data integrity: ${hasProperSale ? "✅ PASSED" : "❌ FAILED"}`
      );
    } else {
      console.log("❌ No changes made to NFT");
    }
  } catch (error) {
    console.error("❌ Error testing sale transaction:", error.message);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
    console.log("✅ Test completed");
  }
}

// Chạy test
testSaleTransaction();
