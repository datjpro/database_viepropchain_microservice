/**
 * ========================================================================
 * BLOCKCHAIN SERVICE - TRANSACTION MODEL
 * ========================================================================
 */

const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
  transactionHash: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    index: true,
  },
  type: {
    type: String,
    required: true,
    enum: ["mint", "transfer", "approval", "list", "buy", "cancel"],
    index: true,
  },
  contractAddress: {
    type: String,
    required: true,
    lowercase: true,
    index: true,
  },
  from: { type: String, lowercase: true, index: true },
  to: { type: String, lowercase: true, index: true },
  tokenId: { type: Number, index: true, sparse: true },
  value: { type: String, default: "0" },

  gasUsed: Number,
  gasPrice: String,

  blockNumber: { type: Number, required: true, index: true },
  blockTimestamp: { type: Date, required: true, index: true },

  status: {
    type: String,
    enum: ["pending", "confirmed", "failed"],
    default: "confirmed",
    index: true,
  },

  propertyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Property",
    index: true,
  },
  nftId: { type: mongoose.Schema.Types.ObjectId, ref: "NFT", index: true },

  createdAt: { type: Date, default: Date.now, index: true },
});

transactionSchema.index({ type: 1, blockTimestamp: -1 });
transactionSchema.index({ tokenId: 1, blockTimestamp: -1 });

module.exports = mongoose.model("Transaction", transactionSchema);
