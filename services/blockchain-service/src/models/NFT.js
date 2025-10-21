/**
 * ========================================================================
 * BLOCKCHAIN SERVICE - NFT MODEL
 * ========================================================================
 */

const mongoose = require("mongoose");

const nftSchema = new mongoose.Schema(
  {
    tokenId: { type: Number, required: true, unique: true, index: true },
    contractAddress: {
      type: String,
      required: true,
      lowercase: true,
      index: true,
    },
    owner: { type: String, required: true, lowercase: true, index: true },
    tokenURI: { type: String, required: true },
    metadataCID: { type: String, required: true, index: true },

    mintedBy: { type: String, required: true, lowercase: true },
    mintedTo: { type: String, required: true, lowercase: true },
    mintedAt: { type: Date, required: true, index: true },
    mintTransactionHash: {
      type: String,
      required: true,
      lowercase: true,
      index: true,
    },
    blockNumber: { type: Number, required: true, index: true },

    transferHistory: [
      {
        from: String,
        to: String,
        transactionHash: String,
        blockNumber: Number,
        timestamp: Date,
      },
    ],

    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
      required: true,
      index: true,
    },

    metadataCache: {
      name: String,
      description: String,
      image: String,
      attributes: [{ trait_type: String, value: mongoose.Schema.Types.Mixed }],
    },

    isActive: { type: Boolean, default: true, index: true },
    lastSyncedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

nftSchema.index({ tokenId: 1, contractAddress: 1 }, { unique: true });
nftSchema.index({ owner: 1, isActive: 1 });

module.exports = mongoose.model("NFT", nftSchema);
