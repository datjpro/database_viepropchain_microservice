/**
 * Test script để kiểm tra sync functionality
 */

const { ethers } = require("ethers");
const mongoose = require("mongoose");
require("dotenv").config();

const GANACHE_URL = process.env.GANACHE_URL || "http://127.0.0.1:8545";
const NFT_CONTRACT_ADDRESS = "0xEA4F5F49F396B13CA447FaA792A8702054019Cc8";

const NFT_ABI = [
  "function totalSupply() external view returns (uint256)",
  "function ownerOf(uint256 tokenId) external view returns (address)",
  "function tokenURI(uint256 tokenId) external view returns (string)",
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
];

const { NFT, Property } = require("../../shared/models");

async function testSync() {
  try {
    console.log("🔗 Connecting to Ganache...");
    const provider = new ethers.JsonRpcProvider(GANACHE_URL);
    const nftContract = new ethers.Contract(
      NFT_CONTRACT_ADDRESS,
      NFT_ABI,
      provider
    );

    console.log("🔗 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log("✅ Connected to MongoDB");

    // Test 1: Get total supply
    console.log("\n📊 Test 1: Get Total Supply");
    const totalSupply = await nftContract.totalSupply();
    console.log(`Total NFTs on blockchain: ${totalSupply}`);

    // Test 2: Get owner of token 0
    if (totalSupply > 0) {
      console.log("\n📊 Test 2: Get Owner of Token 0");
      const owner = await nftContract.ownerOf(0);
      console.log(`Owner of Token 0: ${owner}`);

      // Check in database
      const nftInDb = await NFT.findOne({ tokenId: 0 });
      if (nftInDb) {
        console.log(`Owner in DB: ${nftInDb.owner}`);
        console.log(
          `Match: ${
            nftInDb.owner.toLowerCase() === owner.toLowerCase() ? "✅" : "❌"
          }`
        );
      } else {
        console.log("❌ NFT not found in database");
      }
    }

    // Test 3: Count NFTs in database
    console.log("\n📊 Test 3: Count NFTs in Database");
    const nftCount = await NFT.countDocuments();
    console.log(`NFTs in database: ${nftCount}`);

    // Test 4: Count Properties with NFTs
    console.log("\n📊 Test 4: Count Properties with NFTs");
    const propertyCount = await Property.countDocuments({
      "nft.tokenId": { $exists: true },
    });
    console.log(`Properties with NFTs: ${propertyCount}`);

    // Test 5: List all NFTs
    console.log("\n📊 Test 5: List All NFTs");
    const nfts = await NFT.find().select("tokenId owner").limit(10);
    console.table(nfts.map((n) => ({ tokenId: n.tokenId, owner: n.owner })));

    await mongoose.connection.close();
    console.log("\n✅ Tests completed");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

testSync();
