const mongoose = require("mongoose");

const propertySchema = new mongoose.Schema(
  {
    title: String,
    name: String,
    description: String,
    propertyType: {
      type: String,
      enum: ["apartment", "land", "house", "villa", "commercial"],
    },
    address: {
      street: String,
      ward: String,
      district: String,
      city: String,
      country: String,
    },
    area: Number,
    bedrooms: Number,
    bathrooms: Number,
    features: [String],
    legalStatus: String,
    price: Number,
    currency: String,
    owner: {
      type: String,
      lowercase: true,
      required: true,
    },
    nft: {
      isMinted: Boolean,
      tokenId: Number,
      contractAddress: String,
      metadataUri: String,
      transactionHash: String,
      mintedAt: Date,
    },
    images: [String],
    status: String,
    views: Number,
    isPublic: Boolean,
    isFeatured: Boolean,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Property", propertySchema);
