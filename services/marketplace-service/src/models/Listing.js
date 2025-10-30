/**
 * ========================================================================
 * LISTING MODEL - NFT Marketplace Listings
 * ========================================================================
 */

const mongoose = require("mongoose");

const listingSchema = new mongoose.Schema(
  {
    // NFT Information
    tokenId: {
      type: Number,
      required: true,
      index: true,
    },
    contractAddress: {
      type: String,
      required: true,
    },

    // Property Information (from property service)
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    propertyName: String,
    propertyType: String,
    propertyAddress: {
      city: String,
      district: String,
      ward: String,
    },
    propertyArea: Number,
    propertyImages: [String],

    // Seller Information
    seller: {
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

    // Pricing
    price: {
      amount: {
        type: String, // Wei format (use string to handle big numbers)
        required: true,
      },
      currency: {
        type: String,
        default: "ETH",
      },
      priceInUSD: Number, // Optional: converted price
    },

    // Listing Status
    status: {
      type: String,
      enum: ["active", "sold", "cancelled", "expired"],
      default: "active",
      index: true,
    },

    // Listing Details
    description: String,

    // Timestamps
    listedAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      // Default: 90 days from listing
      default: () => new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    },
    soldAt: Date,
    cancelledAt: Date,

    // Sale Information (when sold)
    buyer: {
      userId: mongoose.Schema.Types.ObjectId,
      walletAddress: {
        type: String,
        lowercase: true,
      },
      email: String,
      name: String,
    },
    transactionHash: String,

    // Analytics
    views: {
      type: Number,
      default: 0,
    },
    favorites: {
      type: Number,
      default: 0,
    },
    offers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Offer",
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
listingSchema.index({ status: 1, listedAt: -1 });
listingSchema.index({ "seller.userId": 1, status: 1 });
listingSchema.index({ "seller.walletAddress": 1 });
listingSchema.index({ "price.amount": 1 });
listingSchema.index({ propertyType: 1, status: 1 });
listingSchema.index({ "propertyAddress.city": 1, status: 1 });

// Virtual for checking if listing is expired
listingSchema.virtual("isExpired").get(function () {
  return this.expiresAt < new Date() && this.status === "active";
});

module.exports = mongoose.model("Listing", listingSchema);
