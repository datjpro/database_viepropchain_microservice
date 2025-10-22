const mongoose = require("mongoose");

const propertySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true,
    },
    name: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    propertyType: {
      type: String,
      required: true,
      enum: ["apartment", "land", "house", "villa", "commercial"],
      index: true,
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
    price: {
      type: Number,
      required: true,
      index: true,
    },
    currency: {
      type: String,
      default: "VND",
    },
    owner: {
      type: String,
      lowercase: true,
      required: true,
      index: true,
    },
    nft: {
      isMinted: { type: Boolean, default: false, index: true },
      tokenId: { type: Number, sparse: true },
      contractAddress: { type: String, lowercase: true },
      metadataUri: String,
      transactionHash: String,
      mintedAt: Date,
    },
    images: [String],
    status: {
      type: String,
      enum: ["draft", "active", "minted", "sold", "archived"],
      default: "active",
      index: true,
    },
    views: { type: Number, default: 0 },
    isPublic: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
  },
  { timestamps: true }
);

propertySchema.virtual("displayName").get(function () {
  return this.title || this.name || "Unnamed Property";
});

propertySchema.index({ propertyType: 1, status: 1, createdAt: -1 });
propertySchema.index({ "address.city": 1, "address.district": 1 });
propertySchema.index({ price: 1, propertyType: 1 });
propertySchema.index({ owner: 1, status: 1 });

module.exports = mongoose.model("Property", propertySchema);
