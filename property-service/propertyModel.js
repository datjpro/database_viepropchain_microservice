const mongoose = require("mongoose");

/**
 * ========================================================================
 * PROPERTY MODEL - MongoDB Schema cho Property Service
 * ========================================================================
 *
 * KIẾN TRÚC MICROSERVICES:
 * ----------------------------------------------------------------
 *
 * 1. API Gateway (Port 4000)
 *    - Cổng vào duy nhất từ Frontend (React Port 3000)
 *    - Định tuyến requests đến các microservices
 *    - CORS: Allow origin http://localhost:3000
 *
 * 2. Auth Service (Port 4001)
 *    - Sign-in with Ethereum (verify signature)
 *    - Tạo JWT token
 *
 * 3. IPFS Service (Port 4002)
 *    - Upload files (images, documents, metadata JSON) lên IPFS/Pinata
 *    - Trả về CID
 *
 * 4. Admin Service / Property Management Service (Port 4003)
 *    - CRUD bất động sản
 *    - Build metadata NFT
 *    - Gọi IPFS Service để upload
 *    - Gọi Blockchain Service để mint NFT
 *    - Sử dụng Model này để lưu/query MongoDB
 *
 * 5. Blockchain Service (Port 4004)
 *    - Service DUY NHẤT tương tác blockchain
 *    - Quản lý Admin private key
 *    - Mint NFT, List/Buy/Cancel marketplace
 *    - Gửi signed transactions
 *
 * 6. Indexer Service (Background Worker - No Port)
 *    - Lắng nghe Smart Contract events 24/7
 *    - Events: Transfer, ItemListed, ItemSold, ItemCanceled
 *    - CẬP NHẬT model này khi có events (owner, marketplace, status...)
 *    - Connect: Ganache (Port 8545)
 *
 * 7. Query Service (Port 4005)
 *    - API read-only cho Frontend
 *    - ĐỌC từ model này (search, filter, pagination)
 *    - Optimized queries
 *
 * ----------------------------------------------------------------
 * PHÂN CHIA DỮ LIỆU:
 * ----------------------------------------------------------------
 *
 * 📦 IPFS (Immutable - Không thay đổi):
 * --------------------------------
 * - name, description          : Thông tin cơ bản BĐS
 * - image                      : Primary image IPFS URL
 * - external_url               : Link trang chi tiết (VD: https://viepropchain.com/properties/123)
 * - attributes                 : Các thuộc tính CỐ ĐỊNH (loại, vị trí, số phòng, diện tích...)
 * - legal_documents            : Giấy tờ pháp lý (sổ hồng, giấy phép) - IPFS URLs
 *
 * LƯU Ý: Dữ liệu trên IPFS KHÔNG thể sửa/xóa sau khi upload!
 *
 * 🗄️ MONGODB (Mutable - Có thể thay đổi):
 * -----------------------------------
 * - tokenId, contractAddress   : Định danh on-chain
 * - nft.owner                  : Owner hiện tại (CẬP NHẬT bởi Indexer khi có Transfer event)
 * - marketplace.*              : Thông tin marketplace (CẬP NHẬT bởi Indexer khi có ItemListed/Sold/Canceled events)
 * - status                     : 'draft' | 'published' | 'minted' | 'listed' | 'sold' | 'archived'
 * - price                      : Giá bán hiện tại (thay đổi khi list/update)
 * - auctionInfo                : Thông tin đấu giá (nếu có)
 * - analytics                  : views, favorites, shares (CẬP NHẬT bởi Query Service)
 *
 * CACHE từ IPFS (để query nhanh):
 * - name, description, imageUrl, attributes
 * → Query Service không cần gọi IPFS mỗi lần query!
 *
 * ----------------------------------------------------------------
 * NGUYÊN TẮC:
 * ----------------------------------------------------------------
 * ✅ Dữ liệu CỐ ĐỊNH (như CMT, sổ đỏ, số phòng) → IPFS
 * ✅ Dữ liệu THAY ĐỔI (giá, owner, status, views) → MongoDB
 * ✅ Cache metadata từ IPFS → MongoDB (tăng tốc query)
 * ✅ Indexer Service tự động sync blockchain events → MongoDB
 * ✅ Query Service chỉ ĐỌC MongoDB (không ghi)
 * ✅ Blockchain Service là duy nhất có private key và gửi transactions
 *
 */

const propertySchema = new mongoose.Schema(
  {
    // ============================================================
    // SECTION 1: BASIC INFORMATION (Cache từ IPFS)
    // ============================================================
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

    // ============================================================
    // SECTION 2: BLOCKCHAIN & NFT INFORMATION
    // ============================================================
    // Thông tin liên kết với smart contract và IPFS

    nft: {
      // Đã mint thành NFT chưa?
      isMinted: {
        type: Boolean,
        default: false,
      },

      // Token ID trên blockchain (unique identifier on-chain)
      tokenId: {
        type: Number,
        index: true,
      },

      // Contract address (VD: 0x52B42Ac0e051A4c3386791b04391510C3cE06632)
      contractAddress: String,

      // Owner hiện tại (địa chỉ ví) - CẬP NHẬT từ Transfer events
      // LƯU Ý: Field này được sync tự động từ blockchain qua eventListener
      owner: {
        type: String,
        lowercase: true,
        index: true,
      },

      // Token URI (link đến metadata IPFS)
      // VD: ipfs://QmXXX... hoặc https://gateway.pinata.cloud/ipfs/QmXXX...
      tokenURI: String,

      // Transaction hash khi mint
      transactionHash: String,

      // IPFS hash của metadata (QmXXX...)
      ipfsHash: String,

      // Timestamp khi mint
      mintedAt: Date,
    },

    // ============================================================
    // SECTION 3: IPFS METADATA CID
    // ============================================================
    // Lưu IPFS CID của metadata để có thể fetch lại nếu cần
    ipfsMetadataCid: {
      type: String,
      default: null,
    },

    // ============================================================
    // SECTION 4: STATUS & MANAGEMENT (Dữ liệu thay đổi)
    // ============================================================
    // Các thông tin này KHÔNG lưu trên IPFS vì thay đổi thường xuyên
    // Trạng thái BĐS - THAY ĐỔI theo sự kiện blockchain
    status: {
      type: String,
      enum: [
        "draft", // Đang soạn thảo
        "published", // Đã publish, chưa mint
        "pending_mint", // Đang chờ mint
        "minted", // Đã mint thành NFT
        "for_sale", // Đang rao bán (có người list)
        "in_transaction", // Đang trong giao dịch
        "sold", // Đã bán
        "archived", // Đã lưu trữ
      ],
      default: "draft",
      index: true,
    },

    // ============================================================
    // SECTION 5: PRICE & AUCTION INFO (Dữ liệu thay đổi)
    // ============================================================
    // Thông tin giá và đấu giá - ĐỒNG BỘ từ smart contract events

    // Giá niêm yết hiện tại (có thể thay đổi)
    // CẬP NHẬT khi có sự kiện List/UpdatePrice từ smart contract
    listingPrice: {
      amount: {
        type: Number,
        default: 0,
      },
      currency: {
        type: String,
        default: "VND",
      },
      updatedAt: Date,
    },

    // Thông tin đấu giá (nếu có)
    auctionInfo: {
      isActive: {
        type: Boolean,
        default: false,
      },
      startPrice: Number,
      currentBid: Number,
      highestBidder: String,
      endTime: Date,
      bids: [
        {
          bidder: String,
          amount: Number,
          timestamp: Date,
        },
      ],
    },

    // ============================================================
    // SECTION 6: OWNER & AGENT INFO
    // ============================================================

    // Thông tin owner (người sở hữu off-chain)
    owner: {
      userId: String,
      walletAddress: String,
      name: String,
      email: String,
    },

    // Thông tin agent (môi giới)
    agent: {
      userId: String,
      name: String,
      phone: String,
      email: String,
    },

    // ============================================================
    // SECTION 7: ANALYTICS (Dữ liệu thay đổi liên tục)
    // ============================================================
    // Các metrics này chỉ dùng cho hiển thị, KHÔNG lưu trên IPFS

    analytics: {
      // Số lượt xem (tăng mỗi khi user xem chi tiết)
      views: {
        type: Number,
        default: 0,
      },

      // Số lượt yêu thích
      favorites: {
        type: Number,
        default: 0,
      },

      // Số lượt chia sẻ
      shares: {
        type: Number,
        default: 0,
      },

      // Số lượt hỏi thông tin
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

// ============================================================
// DATABASE INDEXES (Tối ưu query performance)
// ============================================================

// Index cho query theo loại và trạng thái
propertySchema.index({ propertyType: 1, status: 1 });

// Index cho query theo vị trí
propertySchema.index({ "location.city": 1, "location.district": 1 });

// Index cho query theo giá
propertySchema.index({ "price.amount": 1 });
propertySchema.index({ "listingPrice.amount": 1 });

// Index cho query NFT (on-chain data)
propertySchema.index({ "nft.tokenId": 1 });
propertySchema.index({ "nft.owner": 1 });
propertySchema.index({ "nft.isMinted": 1 });

// Index cho query owner
propertySchema.index({ "owner.walletAddress": 1 });

// Index cho sắp xếp theo thời gian
propertySchema.index({ createdAt: -1 });
propertySchema.index({ updatedAt: -1 });

// Text search index (tìm kiếm full-text)
propertySchema.index({
  name: "text",
  description: "text",
  "location.address": "text",
});

// ============================================================
// INSTANCE METHODS
// ============================================================

/**
 * Tăng số lượt xem
 * Sử dụng: property.incrementViews()
 */
propertySchema.methods.incrementViews = function () {
  this.analytics.views += 1;
  return this.save();
};

/**
 * Tăng số lượt yêu thích
 * Sử dụng: property.incrementFavorites()
 */
propertySchema.methods.incrementFavorites = function () {
  this.analytics.favorites += 1;
  return this.save();
};

/**
 * Cập nhật trạng thái BĐS
 * Sử dụng: property.updateStatus('for_sale')
 */
propertySchema.methods.updateStatus = function (newStatus) {
  this.status = newStatus;
  this.updatedAt = new Date();
  return this.save();
};

/**
 * Đánh dấu BĐS đã được mint thành NFT
 * QUAN TRỌNG: Method này được gọi sau khi mint thành công
 *
 * @param {Object} nftData - Dữ liệu NFT từ minting service
 * @param {Number} nftData.tokenId - Token ID on-chain
 * @param {String} nftData.contractAddress - Contract address
 * @param {String} nftData.owner - Owner address
 * @param {String} nftData.tokenURI - IPFS URI
 * @param {String} nftData.transactionHash - Mint transaction hash
 * @param {String} nftData.ipfsHash - IPFS metadata hash
 */
propertySchema.methods.markAsMinted = function (nftData) {
  this.nft = {
    isMinted: true,
    tokenId: nftData.tokenId,
    contractAddress: nftData.contractAddress,
    owner: nftData.owner.toLowerCase(), // Normalize address
    tokenURI: nftData.tokenURI,
    transactionHash: nftData.transactionHash,
    ipfsHash: nftData.ipfsHash,
    mintedAt: new Date(),
  };
  this.status = "minted";
  this.updatedAt = new Date();
  return this.save();
};

/**
 * Cập nhật owner khi NFT được transfer
 * QUAN TRỌNG: Method này được gọi khi phát hiện Transfer event từ blockchain
 *
 * @param {String} newOwner - Địa chỉ owner mới
 * @param {String} transactionHash - Transfer transaction hash
 */
propertySchema.methods.updateOwner = function (newOwner, transactionHash) {
  if (!this.nft.isMinted) {
    throw new Error("Property is not minted as NFT yet");
  }

  this.nft.owner = newOwner.toLowerCase();
  this.updatedAt = new Date();

  console.log(`✅ Updated owner for property ${this._id}: ${newOwner}`);
  console.log(`   Transaction: ${transactionHash}`);

  return this.save();
};

/**
 * Cập nhật giá niêm yết
 * QUAN TRỌNG: Method này được gọi khi có event PriceUpdated từ smart contract
 *
 * @param {Number} amount - Giá mới
 * @param {String} currency - Đơn vị tiền tệ
 */
propertySchema.methods.updateListingPrice = function (
  amount,
  currency = "VND"
) {
  this.listingPrice = {
    amount: amount,
    currency: currency,
    updatedAt: new Date(),
  };
  this.updatedAt = new Date();

  console.log(
    `✅ Updated listing price for property ${this._id}: ${amount} ${currency}`
  );

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
