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
    // Local listing identifier (used for off-chain listings)
    listingId: {
      type: Number,
      index: true,
    },
    contractAddress: {
      type: String,
      required: true,
    },

    // Blockchain Listing ID (from smart contract)
    blockchainListingId: {
      type: Number,
      index: true,
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

    // Listing Type and Rental Info
    listingType: {
      type: String,
      enum: ["sale", "rent"],
      default: "sale",
      index: true,
    },

    // Rental specific fields
    rental: {
      pricePerDay: {
        type: String, // Wei format for daily rental price
        required: function () {
          return this.listingType === "rent";
        },
      },
      maxDurationDays: {
        type: Number,
        required: function () {
          return this.listingType === "rent";
        },
        min: 1,
        max: 365,
      },
      currentRenter: {
        userId: mongoose.Schema.Types.ObjectId,
        walletAddress: {
          type: String,
          lowercase: true,
        },
        email: String,
        name: String,
        rentedAt: Date,
        expiresAt: Date,
        rentalDays: Number,
        transactionHash: String,
      },
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
      enum: ["active", "sold", "cancelled", "expired", "rented"],
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
    // Off-chain listing support
    isOffchain: { type: Boolean, default: false, index: true },
    sellerSignature: { type: String, default: null },
    signedPrice: { type: String, default: null },

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
listingSchema.index({ listingType: 1, status: 1 });
listingSchema.index({ "seller.userId": 1, status: 1 });
listingSchema.index({ "seller.walletAddress": 1 });
listingSchema.index({ "price.amount": 1 });
listingSchema.index({ "rental.pricePerDay": 1 });
listingSchema.index({ propertyType: 1, status: 1 });
listingSchema.index({ "propertyAddress.city": 1, status: 1 });

// Virtual for checking if listing is expired
listingSchema.virtual("isExpired").get(function () {
  return this.expiresAt < new Date() && this.status === "active";
});

// Virtual for checking if rental is active
listingSchema.virtual("isRentalActive").get(function () {
  if (this.listingType !== "rent" || !this.rental.currentRenter) return false;
  return new Date() < this.rental.currentRenter.expiresAt;
});

module.exports = mongoose.model("Listing", listingSchema);
