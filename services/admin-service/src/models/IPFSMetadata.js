/**
 * ========================================================================
 * ADMIN SERVICE - IPFS METADATA MODEL
 * ========================================================================
 */

const mongoose = require("mongoose");

const ipfsMetadataSchema = new mongoose.Schema(
  {
    cid: { type: String, required: true, unique: true, index: true },
    type: {
      type: String,
      required: true,
      enum: ["metadata", "image", "document"],
      index: true,
    },
    content: { type: mongoose.Schema.Types.Mixed, required: true },

    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
      index: true,
    },

    pinataInfo: {
      pinataId: String,
      pinStatus: String,
    },

    gatewayUrls: {
      pinata: String,
      ipfs: String,
    },

    createdAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("IPFSMetadata", ipfsMetadataSchema);
