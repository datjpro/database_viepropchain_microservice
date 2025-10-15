// minting-service/nftModel.js
const mongoose = require("mongoose");

const nftSchema = new mongoose.Schema({
  tokenId: { type: String, required: true, unique: true },
  owner: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String },
  image: { type: String }, // IPFS hash của hình ảnh
  attributes: [{ trait_type: String, value: String }],
  ipfsHash: { type: String }, // Hash của metadata trên IPFS (optional nếu IPFS fail)
  tokenURI: { type: String, required: true },
  transactionHash: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("NFT", nftSchema);
