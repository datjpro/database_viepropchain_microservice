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
      default: "apartment", // Default nếu không truyền
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

    // Legal Document ID (Số vào sổ cấp GCN - UNIQUE per property)
    legalDocumentId: {
      type: String,
      trim: true,
      uppercase: true, // Tự động viết hoa (cs12345 -> CS12345)
      required: true,
      unique: true, // Không cho phép trùng lặp
      index: true,
      validate: {
        validator: function (v) {
          // Validate format: CS + numbers (e.g., CS12345)
          return /^[A-Z]{2}\d{5,}$/.test(v);
        },
        message: (props) =>
          `${props.value} is not a valid legal document ID! Format: CS12345`,
      },
    },

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
    ownerWallet: {
      type: String,
      lowercase: true,
      required: false,
      index: true,
    },

    // Web2 Verification Layer (Admin approval)
    verificationStatus: {
      type: String,
      enum: [
        "pending_kyc", // User chưa KYC
        "pending_approval", // User đã KYC, chờ Admin duyệt
        "verified", // Admin đã duyệt
        "rejected", // Admin từ chối
        "info_required", // Cần bổ sung thông tin
      ],
      default: "pending_kyc",
      index: true,
    },

    // KYC Status tracking
    kycStatus: {
      type: String,
      enum: ["not_required", "pending", "verified", "rejected"],
      default: "pending",
      index: true,
    },

    // Blockchain Sync Status
    blockchainStatus: {
      type: String,
      enum: ["none", "queue_mint", "minting", "minted", "sync_failed"],
      default: "none",
      index: true,
    },

    // Legal Documents (Private - Only Admin/Owner can see)
    legalDocuments: [String],

    // Custodial Wallet Management
    isCustodial: {
      type: Boolean,
      default: false,
      description:
        "True if NFT is held by system wallet (user hasn't linked wallet yet)",
    },

    nft: {
      isMinted: { type: Boolean, default: false, index: true },
      tokenId: { type: Number, sparse: true, required: false },
      contractAddress: { type: String, lowercase: true, required: false },
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
propertySchema.index({ verificationStatus: 1, blockchainStatus: 1 });
propertySchema.index({ ownerWallet: 1 });
propertySchema.index({ legalDocumentId: 1 }, { unique: true }); // UNIQUE: Không cho phép trùng số GCN

module.exports = mongoose.model("Property", propertySchema);
