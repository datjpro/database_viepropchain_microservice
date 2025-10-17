const mongoose = require("mongoose");

/**
 * Property Schema - Quản lý thông tin bất động sản
 *
 * Cấu trúc dữ liệu:
 * 1. Basic Info: Thông tin cơ bản (tên, mô tả, loại, giá...)
 * 2. Location: Vị trí địa lý
 * 3. Details: Chi tiết theo từng loại BĐS
 * 4. Media: Hình ảnh, tài liệu
 * 5. NFT Info: Thông tin NFT (nếu đã mint)
 * 6. Status: Trạng thái và lịch sử
 */

const propertySchema = new mongoose.Schema(
  {
    // ========== BASIC INFORMATION ==========
    propertyType: {
      type: String,
      required: true,
      enum: ["apartment", "land", "house", "villa"],
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
    },

    price: {
      amount: {
        type: Number,
        required: true,
      },
      currency: {
        type: String,
        default: "VND",
      },
    },

    // ========== LOCATION ==========
    location: {
      address: {
        type: String,
        required: true,
      },
      ward: String,
      district: String,
      city: String,
      coordinates: {
        latitude: Number,
        longitude: Number,
      },
    },

    // ========== PROPERTY DETAILS (Dynamic based on type) ==========
    details: {
      // Common fields
      area: {
        value: Number,
        unit: {
          type: String,
          default: "m2",
        },
      },

      // For Apartment
      projectName: String,
      apartmentCode: String,
      block: String,
      floor: Number,
      grossArea: String,
      netArea: String,
      bedrooms: Number,
      bathrooms: Number,
      balconyDirection: String,
      interiorStatus: String,

      // For Land
      landNumber: String,
      mapSheetNumber: String,
      gpsCoordinates: String,
      frontWidth: String,
      length: String,
      landType: String,
      zoning: String,
      roadFrontage: String,

      // For House/Villa
      landArea: String,
      constructionArea: String,
      usableArea: String,
      structure: String,
      houseDirection: String,
      constructionYear: Number,

      // Legal status
      legalStatus: String,

      // Additional attributes (flexible)
      additionalAttributes: [
        {
          trait_type: String,
          value: String,
        },
      ],
    },

    // ========== MEDIA ==========
    media: {
      images: [
        {
          url: String,
          caption: String,
          isPrimary: {
            type: Boolean,
            default: false,
          },
        },
      ],
      documents: [
        {
          name: String,
          url: String,
          type: String,
        },
      ],
      virtualTour: String,
    },

    // ========== NFT INFORMATION ==========
    nft: {
      isMinted: {
        type: Boolean,
        default: false,
      },
      tokenId: Number,
      contractAddress: String,
      owner: String,
      tokenURI: String,
      transactionHash: String,
      ipfsHash: String,
      mintedAt: Date,
    },

    // ========== IPFS METADATA ==========
    ipfsMetadataCid: {
      type: String,
      default: null,
    },

    // ========== STATUS & MANAGEMENT ==========
    status: {
      type: String,
      enum: [
        "draft",
        "published",
        "pending_mint",
        "minted",
        "for_sale",
        "in_transaction",
        "sold",
        "archived",
      ],
      default: "draft",
    },

    owner: {
      userId: String,
      walletAddress: String,
      name: String,
      email: String,
    },

    agent: {
      userId: String,
      name: String,
      phone: String,
      email: String,
    },

    // ========== ANALYTICS ==========
    analytics: {
      views: {
        type: Number,
        default: 0,
      },
      favorites: {
        type: Number,
        default: 0,
      },
      shares: {
        type: Number,
        default: 0,
      },
      inquiries: {
        type: Number,
        default: 0,
      },
    },

    // ========== METADATA ==========
    isPublic: {
      type: Boolean,
      default: true,
    },

    isFeatured: {
      type: Boolean,
      default: false,
    },

    tags: [String],

    // ========== TIMESTAMPS ==========
    createdAt: {
      type: Date,
      default: Date.now,
    },

    updatedAt: {
      type: Date,
      default: Date.now,
    },

    publishedAt: Date,
  },
  {
    timestamps: true,
  }
);

// ========== INDEXES ==========
propertySchema.index({ propertyType: 1, status: 1 });
propertySchema.index({ "location.city": 1, "location.district": 1 });
propertySchema.index({ "price.amount": 1 });
propertySchema.index({ "nft.tokenId": 1 });
propertySchema.index({ "nft.owner": 1 });
propertySchema.index({ "owner.walletAddress": 1 });
propertySchema.index({ createdAt: -1 });

// Text search index
propertySchema.index({
  name: "text",
  description: "text",
  "location.address": "text",
});

// ========== METHODS ==========

// Update analytics
propertySchema.methods.incrementViews = function () {
  this.analytics.views += 1;
  return this.save();
};

propertySchema.methods.incrementFavorites = function () {
  this.analytics.favorites += 1;
  return this.save();
};

// Update status
propertySchema.methods.updateStatus = function (newStatus) {
  this.status = newStatus;
  this.updatedAt = new Date();
  return this.save();
};

// Mark as minted
propertySchema.methods.markAsMinted = function (nftData) {
  this.nft = {
    isMinted: true,
    tokenId: nftData.tokenId,
    contractAddress: nftData.contractAddress,
    owner: nftData.owner,
    tokenURI: nftData.tokenURI,
    transactionHash: nftData.transactionHash,
    ipfsHash: nftData.ipfsHash,
    mintedAt: new Date(),
  };
  this.status = "minted";
  this.updatedAt = new Date();
  return this.save();
};

// ========== STATIC METHODS ==========

// Get statistics
propertySchema.statics.getStatistics = async function () {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        totalProperties: { $sum: 1 },
        totalMinted: {
          $sum: { $cond: ["$nft.isMinted", 1, 0] },
        },
        totalViews: { $sum: "$analytics.views" },
        avgPrice: { $avg: "$price.amount" },
      },
    },
    {
      $group: {
        _id: "$propertyType",
        count: { $sum: 1 },
      },
    },
  ]);

  return stats;
};

// ========== VIRTUAL FIELDS ==========

propertySchema.virtual("primaryImage").get(function () {
  const primary = this.media.images.find((img) => img.isPrimary);
  return primary ? primary.url : this.media.images[0]?.url || null;
});

// Ensure virtuals are included in JSON
propertySchema.set("toJSON", { virtuals: true });
propertySchema.set("toObject", { virtuals: true });

// ========== HOOKS ==========

// Update timestamp before save
propertySchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

const Property = mongoose.model("Property", propertySchema);

module.exports = Property;
