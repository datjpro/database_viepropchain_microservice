/**
 * ========================================================================
 * QUERY SERVICE - PROPERTY MODEL
 * ========================================================================
 */

const mongoose = require("mongoose");

const propertySchema = new mongoose.Schema(
  {
    propertyType: {
      type: String,
      required: true,
      enum: ["apartment", "land", "house", "villa", "commercial"],
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      index: "text",
    },
    description: {
      type: String,
      required: true,
      index: "text",
    },
    imageUrl: String,

    location: {
      address: { type: String, required: true, index: "text" },
      ward: String,
      district: { type: String, index: true },
      city: { type: String, required: true, index: true },
      coordinates: {
        latitude: Number,
        longitude: Number,
      },
    },

    details: {
      area: { value: Number, unit: { type: String, default: "m2" } },
      bedrooms: { type: Number, index: true },
      bathrooms: Number,
      legalStatus: String,
      cachedAttributes: [{ trait_type: String, value: String }],
    },

    price: {
      amount: { type: Number, required: true, index: true },
      currency: { type: String, default: "VND" },
      updatedAt: Date,
    },

    nft: {
      isMinted: { type: Boolean, default: false, index: true },
      nftId: { type: mongoose.Schema.Types.ObjectId, ref: "NFT" },
      tokenId: { type: Number, index: true, sparse: true },
      contractAddress: { type: String, lowercase: true, index: true },
      currentOwner: { type: String, lowercase: true, index: true },
      metadataCID: String,
      mintedAt: Date,
      mintedBy: String,
      transactionHash: String,
    },

    status: {
      type: String,
      enum: [
        "draft",
        "approved",
        "pending_mint",
        "minted",
        "listed",
        "sold",
        "archived",
      ],
      default: "draft",
      index: true,
    },

    creator: {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      walletAddress: { type: String, lowercase: true, index: true },
      name: String,
    },

    owner: {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      walletAddress: { type: String, lowercase: true, index: true },
      name: String,
    },

    media: {
      images: [{ url: String, cid: String, isPrimary: Boolean }],
      documents: [{ name: String, url: String, cid: String, type: String }],
    },

    analytics: {
      views: { type: Number, default: 0 },
      favorites: { type: Number, default: 0 },
      shares: { type: Number, default: 0 },
      lastViewedAt: Date,
    },

    isPublic: { type: Boolean, default: false, index: true },
    isFeatured: { type: Boolean, default: false, index: true },
    tags: [{ type: String, lowercase: true, index: true }],

    createdAt: { type: Date, default: Date.now, index: true },
    updatedAt: Date,
  },
  { timestamps: true }
);

propertySchema.index({ propertyType: 1, status: 1, createdAt: -1 });
propertySchema.index({
  "location.city": 1,
  "location.district": 1,
  propertyType: 1,
});
propertySchema.index({ "price.amount": 1, propertyType: 1, status: 1 });

module.exports = mongoose.model("Property", propertySchema);
