/**
 * ========================================================================
 * QUERY SERVICE - ANALYTICS MODEL
 * ========================================================================
 */

const mongoose = require("mongoose");

const analyticsSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: [
        "property_view",
        "property_favorite",
        "property_share",
        "user_login",
        "nft_mint",
      ],
      index: true,
    },

    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    walletAddress: { type: String, lowercase: true, index: true },
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
      index: true,
    },

    timestamp: { type: Date, default: Date.now, index: true },
    date: { type: Date, index: true },

    ipAddress: String,
    userAgent: String,
  },
  { timestamps: false }
);

analyticsSchema.index({ type: 1, timestamp: -1 });
analyticsSchema.index({ propertyId: 1, type: 1, timestamp: -1 });

module.exports = mongoose.model("Analytics", analyticsSchema);
