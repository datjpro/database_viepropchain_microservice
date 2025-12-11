/**
 * ========================================================================
 * INDEXER SERVICE - SaleHistory MODEL
 * ========================================================================
 */

const mongoose = require("mongoose");

const saleHistorySchema = new mongoose.Schema(
  {
    tokenId: { type: Number, required: true, index: true },
    listingId: { type: Number, default: 0, index: true },
    price: { type: String, required: true },
    buyer: { type: String, required: true, lowercase: true, index: true },
    seller: { type: String, required: true, lowercase: true, index: true },
    txHash: { type: String, lowercase: true, index: true },
    blockNumber: { type: Number, index: true },
    type: { type: String, enum: ["sale", "rental"], required: true },
    expiresAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SaleHistory", saleHistorySchema);
