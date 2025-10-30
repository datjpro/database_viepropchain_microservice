/**
 * ========================================================================
 * OFFER MODEL - Offers on NFT Listings
 * ========================================================================
 */

const mongoose = require("mongoose");

const offerSchema = new mongoose.Schema(
  {
    // Listing Information
    listingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Listing",
      required: true,
      index: true,
    },
    tokenId: {
      type: Number,
      required: true,
    },

    // Buyer (Offer maker)
    buyer: {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        index: true,
      },
      walletAddress: {
        type: String,
        required: true,
        lowercase: true,
      },
      email: String,
      name: String,
    },

    // Offer Details
    price: {
      amount: {
        type: String, // Wei format
        required: true,
      },
      currency: {
        type: String,
        default: "ETH",
      },
      priceInUSD: Number,
    },

    message: String, // Optional message from buyer

    // Status
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "cancelled", "expired"],
      default: "pending",
      index: true,
    },

    // Timestamps
    offeredAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      // Default: 7 days from offer
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    respondedAt: Date, // When seller accepts/rejects

    // Response from seller
    sellerResponse: {
      action: {
        type: String,
        enum: ["accepted", "rejected"],
      },
      message: String,
      respondedAt: Date,
    },

    // Transaction (when accepted and executed)
    transactionHash: String,
    completedAt: Date,
  },
  {
    timestamps: true,
  }
);

// Indexes
offerSchema.index({ "buyer.userId": 1, status: 1 });
offerSchema.index({ "buyer.walletAddress": 1 });
offerSchema.index({ status: 1, offeredAt: -1 });

// Virtual for checking if offer is expired
offerSchema.virtual("isExpired").get(function () {
  return this.expiresAt < new Date() && this.status === "pending";
});

module.exports = mongoose.model("Offer", offerSchema);
