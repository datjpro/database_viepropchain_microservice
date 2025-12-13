/**
 * ========================================================================
 * INDEXER SERVICE - Listing MODEL
 * ========================================================================
 */

const mongoose = require("mongoose");

const listingSchema = new mongoose.Schema(
  {
    listingId: { type: Number, required: true, index: true },
    contractAddress: { type: String, lowercase: true, index: true },
    tokenId: { type: Number, required: true, index: true },
    seller: { type: String, required: true, lowercase: true, index: true },
    listingType: { type: String, enum: ["sale", "rental"], required: true },
    price: { type: String, required: true }, // store price in wei as string
    status: {
      type: String,
      enum: ["Active", "Sold", "Cancelled"],
      default: "Active",
      index: true,
    },
    rentalDuration: { type: Number, default: 0 }, // seconds
    txHash: { type: String, lowercase: true, index: true },
    blockNumber: { type: Number, index: true },
  },
  { timestamps: true }
);

listingSchema.index({ tokenId: 1, listingId: 1 });

module.exports = mongoose.model("Listing", listingSchema);
