/**
 * ========================================================================
 * DATABASE SCHEMA - VIEPROPCHAIN MICROSERVICES ARCHITECTURE
 * ========================================================================
 *
 * KIẾN TRÚC TỔNG QUAN:
 * ----------------------------------------------------------------
 *
 * Frontend (React - Port 3000)
 *      ↓
 * API Gateway (Port 4000) - Định tuyến requests
 *      ↓
 * ┌─────────────────────────────────────────────────────────────┐
 * │  Auth Service (4001)      - Sign-in with Ethereum          │
 * │  IPFS Service (4002)      - Upload files to IPFS/Pinata    │
 * │  Admin Service (4003)     - CRUD properties, mint NFT       │
 * │  Blockchain Service (4004) - Interact with Smart Contract   │
 * │  Indexer Service (Worker) - Listen blockchain events 24/7  │
 * │  Query Service (4005)     - Read-only queries              │
 * └─────────────────────────────────────────────────────────────┘
 *      ↓
 * MongoDB (Shared Database) + Blockchain (Ganache/Ethereum Port 8545)
 *
 * ----------------------------------------------------------------
 * SMART CONTRACT EVENTS (từ ABI):
 * ----------------------------------------------------------------
 *
 * 1. Transfer(from, to, tokenId)
 *    - Khi: Mint NFT, Transfer ownership
 *    - Indexer cập nhật: nfts.owner, properties.owner
 *
 * 2. Approval(owner, approved, tokenId)
 *    - Khi: Approve địa chỉ khác thao tác NFT
 *    - Indexer cập nhật: nfts.approvals
 *
 * 3. ApprovalForAll(owner, operator, approved)
 *    - Khi: Approve operator cho tất cả NFTs
 *    - Indexer cập nhật: nfts.operatorApprovals
 *
 * ----------------------------------------------------------------
 * MONGODB COLLECTIONS:
 * ----------------------------------------------------------------
 *
 * 1. users             - User accounts & wallet info
 * 2. properties        - Real estate properties (off-chain data)
 * 3. nfts              - NFT tokens (on-chain data synced)
 * 4. transactions      - Blockchain transactions history
 * 5. ipfs_metadata     - IPFS metadata cache
 * 6. marketplace       - Marketplace listings (if have marketplace contract)
 * 7. analytics         - Views, favorites, shares statistics
 *
 */

const mongoose = require("mongoose");

// ============================================================================
// COLLECTION 1: USERS
// ============================================================================
// Service: Auth Service (3001)
// Mục đích: Lưu thông tin user, wallet address, JWT session
// ============================================================================

const userSchema = new mongoose.Schema(
  {
    // Wallet address (primary key) - LOWERCASE để query dễ
    walletAddress: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
      validate: {
        validator: function (v) {
          return /^0x[a-fA-F0-9]{40}$/.test(v);
        },
        message: "Invalid Ethereum address",
      },
    },

    // Nonce để verify signature (Sign-in with Ethereum)
    // Auth Service generate random nonce mỗi lần login
    nonce: {
      type: String,
      required: true,
      default: () => Math.floor(Math.random() * 1000000).toString(),
    },

    // JWT session token (sau khi verify signature thành công)
    sessionToken: {
      type: String,
      default: null,
    },

    // Token expiry
    tokenExpiry: {
      type: Date,
      default: null,
    },

    // Role: 'user' | 'admin' | 'agent'
    role: {
      type: String,
      enum: ["user", "admin", "agent"],
      default: "user",
      index: true,
    },

    // Profile info (optional)
    profile: {
      name: String,
      email: String,
      phone: String,
      avatar: String, // IPFS URL or external URL
      bio: String,
    },

    // Favorite properties (array of property IDs)
    favorites: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Property",
      },
    ],

    // KYC status (if needed)
    kyc: {
      isVerified: {
        type: Boolean,
        default: false,
      },
      verifiedAt: Date,
      documents: [
        {
          type: String, // IPFS CID
          name: String,
        },
      ],
    },

    // Timestamps
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    lastLoginAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
userSchema.index({ role: 1, createdAt: -1 });
userSchema.index({ "profile.email": 1 });

// ============================================================================
// COLLECTION 2: PROPERTIES
// ============================================================================
// Service: Admin Service (3003), Query Service (3005)
// Mục đích: Lưu thông tin bất động sản OFF-CHAIN (mutable data)
// ============================================================================

const propertySchema = new mongoose.Schema(
  {
    // ========== BASIC INFO (Cache từ IPFS để query nhanh) ==========
    propertyType: {
      type: String,
      required: true,
      enum: ["apartment", "land", "house", "villa", "commercial", "industrial"],
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      index: "text", // Full-text search
    },

    description: {
      type: String,
      required: true,
      index: "text", // Full-text search
    },

    // Primary image (cache từ IPFS)
    imageUrl: {
      type: String,
      default: null,
    },

    // ========== LOCATION ==========
    location: {
      address: {
        type: String,
        required: true,
        index: "text",
      },
      ward: String,
      district: {
        type: String,
        index: true,
      },
      city: {
        type: String,
        required: true,
        index: true,
      },
      country: {
        type: String,
        default: "Vietnam",
      },
      coordinates: {
        latitude: Number,
        longitude: Number,
      },
      // GeoJSON for geospatial queries
      geoLocation: {
        type: {
          type: String,
          enum: ["Point"],
          default: "Point",
        },
        coordinates: {
          type: [Number], // [longitude, latitude]
          index: "2dsphere",
        },
      },
    },

    // ========== PROPERTY DETAILS (Cache từ IPFS attributes) ==========
    details: {
      // Common
      area: {
        value: Number,
        unit: {
          type: String,
          default: "m2",
        },
      },
      bedrooms: {
        type: Number,
        index: true,
      },
      bathrooms: Number,
      floors: Number,

      // Apartment specific
      projectName: String,
      block: String,
      floor: Number,
      apartmentCode: String,

      // Land specific
      landNumber: String,
      frontWidth: Number,
      length: Number,
      landType: String,

      // Legal
      legalStatus: {
        type: String,
        enum: ["red_book", "pink_book", "pending", "other"],
        index: true,
      },

      // Direction
      direction: String,

      // Attributes cache từ IPFS (để query nhanh)
      cachedAttributes: [
        {
          trait_type: String,
          value: String,
        },
      ],
    },

    // ========== PRICE (Mutable - Thay đổi thường xuyên) ==========
    price: {
      amount: {
        type: Number,
        required: true,
        index: true,
      },
      currency: {
        type: String,
        default: "VND",
      },
      // Giá/m2 (tính toán tự động)
      pricePerSqm: {
        type: Number,
        index: true,
      },
      updatedAt: {
        type: Date,
        default: Date.now,
      },
    },

    // ========== NFT INFO (Link to nfts collection) ==========
    nft: {
      // Đã mint NFT chưa?
      isMinted: {
        type: Boolean,
        default: false,
        index: true,
      },

      // Reference to NFT document
      nftId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "NFT",
        default: null,
      },

      // Token ID (cache từ nfts collection)
      tokenId: {
        type: Number,
        index: true,
        sparse: true, // Allow null
      },

      // Contract address
      contractAddress: {
        type: String,
        lowercase: true,
        index: true,
      },

      // Current owner (sync từ blockchain via Indexer)
      currentOwner: {
        type: String,
        lowercase: true,
        index: true,
      },

      // IPFS metadata CID
      metadataCID: {
        type: String,
        default: null,
      },

      // Mint info
      mintedAt: Date,
      mintedBy: {
        type: String, // Admin wallet address
        lowercase: true,
      },
      transactionHash: {
        type: String,
        lowercase: true,
      },
    },

    // ========== STATUS (Mutable) ==========
    status: {
      type: String,
      enum: [
        "draft", // Admin đang soạn
        "pending_review", // Chờ review
        "approved", // Đã duyệt, chưa mint
        "pending_mint", // Đang mint
        "minted", // Đã mint NFT
        "listed", // Đang list trên marketplace
        "sold", // Đã bán
        "archived", // Đã archive
      ],
      default: "draft",
      index: true,
    },

    // ========== OWNER & CREATOR ==========
    // Creator (Admin tạo property)
    creator: {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      walletAddress: {
        type: String,
        lowercase: true,
        index: true,
      },
      name: String,
    },

    // Current owner (có thể khác creator nếu đã bán)
    owner: {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      walletAddress: {
        type: String,
        lowercase: true,
        index: true,
      },
      name: String,
    },

    // Agent (môi giới)
    agent: {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      name: String,
      phone: String,
      email: String,
      commission: {
        type: Number, // Percentage
        default: 0,
      },
    },

    // ========== MEDIA (IPFS URLs) ==========
    media: {
      images: [
        {
          url: String, // IPFS URL
          cid: String, // IPFS CID
          caption: String,
          isPrimary: {
            type: Boolean,
            default: false,
          },
          order: {
            type: Number,
            default: 0,
          },
        },
      ],
      videos: [
        {
          url: String,
          cid: String,
          thumbnail: String,
          duration: Number,
        },
      ],
      documents: [
        {
          name: String, // "Sổ hồng", "Giấy phép xây dựng"
          url: String, // IPFS URL
          cid: String, // IPFS CID
          type: {
            type: String,
            enum: ["legal", "certificate", "blueprint", "other"],
          },
        },
      ],
      virtualTour: {
        url: String,
        cid: String,
      },
    },

    // ========== ANALYTICS (Cập nhật bởi Query Service) ==========
    analytics: {
      views: {
        type: Number,
        default: 0,
      },
      uniqueViews: {
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
      lastViewedAt: Date,
    },

    // ========== METADATA ==========
    isPublic: {
      type: Boolean,
      default: false,
      index: true,
    },

    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },

    tags: [
      {
        type: String,
        lowercase: true,
        index: true,
      },
    ],

    category: {
      type: String,
      enum: ["residential", "commercial", "industrial", "agricultural"],
      index: true,
    },

    // ========== TIMESTAMPS ==========
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
    publishedAt: Date,
    mintedAt: Date,
    archivedAt: Date,
  },
  {
    timestamps: true,
  }
);

// Indexes for complex queries
propertySchema.index({ propertyType: 1, status: 1, createdAt: -1 });
propertySchema.index({
  "location.city": 1,
  "location.district": 1,
  propertyType: 1,
});
propertySchema.index({ "price.amount": 1, propertyType: 1, status: 1 });
propertySchema.index({ "nft.isMinted": 1, status: 1 });
propertySchema.index({ "owner.walletAddress": 1, status: 1 });
propertySchema.index({ tags: 1, status: 1 });

// Text search index
propertySchema.index({
  name: "text",
  description: "text",
  "location.address": "text",
  tags: "text",
});

// ============================================================================
// COLLECTION 3: NFTS
// ============================================================================
// Service: Blockchain Service (3004), Indexer Service (Worker)
// Mục đích: Lưu thông tin NFT ON-CHAIN (sync từ blockchain)
// ============================================================================

const nftSchema = new mongoose.Schema(
  {
    // ========== ON-CHAIN DATA (Sync từ blockchain) ==========

    // Token ID (unique on-chain)
    tokenId: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },

    // Contract address
    contractAddress: {
      type: String,
      required: true,
      lowercase: true,
      index: true,
    },

    // Current owner address (sync từ Transfer events)
    owner: {
      type: String,
      required: true,
      lowercase: true,
      index: true,
    },

    // Token URI (IPFS link)
    tokenURI: {
      type: String,
      required: true,
    },

    // IPFS metadata CID
    metadataCID: {
      type: String,
      required: true,
      index: true,
    },

    // ========== MINT INFO ==========
    mintedBy: {
      type: String, // Admin wallet address
      required: true,
      lowercase: true,
      index: true,
    },

    mintedTo: {
      type: String, // Original recipient
      required: true,
      lowercase: true,
    },

    mintedAt: {
      type: Date,
      required: true,
      index: true,
    },

    mintTransactionHash: {
      type: String,
      required: true,
      lowercase: true,
      index: true,
    },

    blockNumber: {
      type: Number,
      required: true,
      index: true,
    },

    // ========== TRANSFER HISTORY (Sync từ Transfer events) ==========
    transferHistory: [
      {
        from: {
          type: String,
          lowercase: true,
        },
        to: {
          type: String,
          lowercase: true,
        },
        transactionHash: {
          type: String,
          lowercase: true,
        },
        blockNumber: Number,
        timestamp: Date,
      },
    ],

    // ========== APPROVALS (Sync từ Approval events) ==========
    currentApproval: {
      approvedAddress: {
        type: String,
        lowercase: true,
        default: null,
      },
      approvedAt: Date,
      transactionHash: String,
    },

    // ========== LINK TO PROPERTY ==========
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
      required: true,
      index: true,
    },

    // ========== METADATA CACHE (Cache từ IPFS để query nhanh) ==========
    metadataCache: {
      name: String,
      description: String,
      image: String,
      external_url: String,
      attributes: [
        {
          trait_type: String,
          value: mongoose.Schema.Types.Mixed,
        },
      ],
    },

    // ========== STATUS ==========
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    // Nếu NFT bị burn
    isBurned: {
      type: Boolean,
      default: false,
      index: true,
    },

    burnedAt: Date,
    burnTransactionHash: String,

    // ========== TIMESTAMPS ==========
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },

    // Last sync time (Indexer cập nhật)
    lastSyncedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
nftSchema.index({ tokenId: 1, contractAddress: 1 }, { unique: true });
nftSchema.index({ owner: 1, isActive: 1 });
nftSchema.index({ propertyId: 1 });
nftSchema.index({ mintedAt: -1 });

// ============================================================================
// COLLECTION 4: TRANSACTIONS
// ============================================================================
// Service: Indexer Service (Worker)
// Mục đích: Lưu tất cả transactions on-chain (history log)
// ============================================================================

const transactionSchema = new mongoose.Schema({
  // Transaction hash (unique)
  transactionHash: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    index: true,
  },

  // Transaction type
  type: {
    type: String,
    required: true,
    enum: [
      "mint", // Mint NFT
      "transfer", // Transfer ownership
      "approval", // Approve address
      "approval_all", // Approve operator for all
      "list", // List on marketplace (if have)
      "buy", // Buy from marketplace
      "cancel", // Cancel listing
      "offer", // Make offer
      "accept_offer", // Accept offer
    ],
    index: true,
  },

  // Contract address
  contractAddress: {
    type: String,
    required: true,
    lowercase: true,
    index: true,
  },

  // From & To addresses
  from: {
    type: String,
    lowercase: true,
    index: true,
  },

  to: {
    type: String,
    lowercase: true,
    index: true,
  },

  // Token ID (if applicable)
  tokenId: {
    type: Number,
    index: true,
    sparse: true,
  },

  // Value (if transfer ETH/token)
  value: {
    type: String, // Store as string to avoid precision loss
    default: "0",
  },

  // Gas info
  gasUsed: Number,
  gasPrice: String,
  gasCost: String, // gasUsed * gasPrice

  // Block info
  blockNumber: {
    type: Number,
    required: true,
    index: true,
  },

  blockHash: {
    type: String,
    lowercase: true,
  },

  blockTimestamp: {
    type: Date,
    required: true,
    index: true,
  },

  // Status
  status: {
    type: String,
    enum: ["pending", "confirmed", "failed"],
    default: "confirmed",
    index: true,
  },

  // Error (if failed)
  error: String,

  // Event data (raw event data từ blockchain)
  eventData: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },

  // Link to property/NFT
  propertyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Property",
    index: true,
  },

  nftId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "NFT",
    index: true,
  },

  // ========== TIMESTAMPS ==========
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

// Indexes
transactionSchema.index({ type: 1, blockTimestamp: -1 });
transactionSchema.index({ from: 1, blockTimestamp: -1 });
transactionSchema.index({ to: 1, blockTimestamp: -1 });
transactionSchema.index({ tokenId: 1, blockTimestamp: -1 });

// ============================================================================
// COLLECTION 5: IPFS_METADATA
// ============================================================================
// Service: IPFS Service (3002)
// Mục đích: Cache IPFS metadata để không phải fetch lại liên tục
// ============================================================================

const ipfsMetadataSchema = new mongoose.Schema(
  {
    // IPFS CID (unique)
    cid: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // Type: 'metadata' | 'image' | 'document' | 'video'
    type: {
      type: String,
      required: true,
      enum: ["metadata", "image", "document", "video", "other"],
      index: true,
    },

    // Content (JSON for metadata, URL for files)
    content: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },

    // File info (if type is file)
    fileInfo: {
      name: String,
      size: Number, // bytes
      mimeType: String,
    },

    // Pinata info
    pinataInfo: {
      pinataId: String,
      pinStatus: String,
      pinSize: Number,
    },

    // Link to property/NFT
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
      index: true,
    },

    nftId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "NFT",
      index: true,
    },

    // Gateway URLs
    gatewayUrls: {
      pinata: String,
      ipfs: String,
      cloudflare: String,
    },

    // Access count (để track hot files)
    accessCount: {
      type: Number,
      default: 0,
    },

    lastAccessedAt: Date,

    // ========== TIMESTAMPS ==========
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    updatedAt: Date,
  },
  {
    timestamps: true,
  }
);

// Indexes
ipfsMetadataSchema.index({ type: 1, createdAt: -1 });
ipfsMetadataSchema.index({ propertyId: 1 });

// ============================================================================
// COLLECTION 6: MARKETPLACE (Nếu có smart contract marketplace)
// ============================================================================
// Service: Indexer Service (Worker)
// Mục đích: Sync marketplace listings từ blockchain
// ============================================================================

const marketplaceSchema = new mongoose.Schema(
  {
    // Listing ID (on-chain)
    listingId: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },

    // Token info
    tokenId: {
      type: Number,
      required: true,
      index: true,
    },

    contractAddress: {
      type: String,
      required: true,
      lowercase: true,
      index: true,
    },

    // Seller
    seller: {
      type: String,
      required: true,
      lowercase: true,
      index: true,
    },

    // Price (in Wei)
    price: {
      type: String, // String to avoid precision loss
      required: true,
    },

    // Currency (ETH, WETH, etc.)
    currency: {
      type: String,
      default: "ETH",
    },

    // Status
    status: {
      type: String,
      enum: ["active", "sold", "canceled", "expired"],
      default: "active",
      index: true,
    },

    // Listing time
    listedAt: {
      type: Date,
      required: true,
      index: true,
    },

    listTransactionHash: {
      type: String,
      lowercase: true,
      index: true,
    },

    // Sale info (if sold)
    soldAt: Date,
    buyer: {
      type: String,
      lowercase: true,
      index: true,
    },
    saleTransactionHash: {
      type: String,
      lowercase: true,
    },

    // Cancel info (if canceled)
    canceledAt: Date,
    cancelTransactionHash: String,

    // Expiry
    expiryTime: Date,

    // Link to property/NFT
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
      index: true,
    },

    nftId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "NFT",
      index: true,
    },

    // ========== TIMESTAMPS ==========
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: Date,
  },
  {
    timestamps: true,
  }
);

// Indexes
marketplaceSchema.index({ status: 1, listedAt: -1 });
marketplaceSchema.index({ seller: 1, status: 1 });
marketplaceSchema.index({ tokenId: 1, contractAddress: 1 });
marketplaceSchema.index({ price: 1, status: 1 });

// ============================================================================
// COLLECTION 7: ANALYTICS
// ============================================================================
// Service: Query Service (3005)
// Mục đích: Track analytics cho properties và platform
// ============================================================================

const analyticsSchema = new mongoose.Schema(
  {
    // Type: 'property_view' | 'property_favorite' | 'property_share' | 'user_action'
    type: {
      type: String,
      required: true,
      enum: [
        "property_view",
        "property_favorite",
        "property_share",
        "property_inquiry",
        "user_login",
        "nft_mint",
        "nft_transfer",
        "marketplace_list",
        "marketplace_sale",
      ],
      index: true,
    },

    // User info (if applicable)
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },

    walletAddress: {
      type: String,
      lowercase: true,
      index: true,
    },

    // Property/NFT info (if applicable)
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
      index: true,
    },

    nftId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "NFT",
      index: true,
    },

    // Event data
    eventData: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // Session info
    sessionId: String,
    ipAddress: String,
    userAgent: String,

    // Timestamp
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },

    // Date parts (for aggregation)
    date: {
      type: Date,
      index: true,
    },
    year: {
      type: Number,
      index: true,
    },
    month: {
      type: Number,
      index: true,
    },
    day: {
      type: Number,
      index: true,
    },
    hour: Number,
  },
  {
    timestamps: false, // Không cần timestamps vì đã có timestamp field
  }
);

// Indexes for time-based queries
analyticsSchema.index({ type: 1, timestamp: -1 });
analyticsSchema.index({ propertyId: 1, type: 1, timestamp: -1 });
analyticsSchema.index({ userId: 1, type: 1, timestamp: -1 });
analyticsSchema.index({ year: 1, month: 1, day: 1, type: 1 });

// TTL index - Tự động xóa analytics sau 1 năm (optional)
// analyticsSchema.index({ timestamp: 1 }, { expireAfterSeconds: 31536000 });

// ============================================================================
// EXPORT MODELS
// ============================================================================

module.exports = {
  User: mongoose.model("User", userSchema),
  Property: mongoose.model("Property", propertySchema),
  NFT: mongoose.model("NFT", nftSchema),
  Transaction: mongoose.model("Transaction", transactionSchema),
  IPFSMetadata: mongoose.model("IPFSMetadata", ipfsMetadataSchema),
  Marketplace: mongoose.model("Marketplace", marketplaceSchema),
  Analytics: mongoose.model("Analytics", analyticsSchema),
};

/**
 * ========================================================================
 * DATA FLOW GIỮA CÁC SERVICES:
 * ========================================================================
 *
 * 1. ADMIN TẠO PROPERTY & MINT NFT:
 *    Admin Frontend → API Gateway → Admin Service (3003)
 *    → Admin Service lưu vào properties collection (status='draft')
 *    → Admin Service gọi IPFS Service (3002) upload images/documents
 *    → IPFS Service lưu vào ipfs_metadata collection, trả CID
 *    → Admin Service build metadata JSON, gọi IPFS Service upload metadata
 *    → Admin Service gọi Blockchain Service (3004) mint NFT
 *    → Blockchain Service gửi transaction, trả tokenId + txHash
 *    → Admin Service cập nhật properties (nft.isMinted=true, nft.tokenId=...)
 *    → Indexer Service catch Transfer event
 *    → Indexer Service tạo record trong nfts collection
 *    → Indexer Service tạo record trong transactions collection
 *    → Indexer Service cập nhật properties.nft.currentOwner
 *
 * 2. USER BROWSE PROPERTIES:
 *    User Frontend → API Gateway → Query Service (3005)
 *    → Query Service query properties collection (filter, pagination)
 *    → Trả về properties (đã có imageUrl, name cache từ IPFS)
 *    → Query Service ghi analytics (property_view)
 *    → Query Service cập nhật properties.analytics.views++
 *
 * 3. USER TRANSFER NFT:
 *    User gửi transaction trực tiếp từ wallet
 *    → Smart Contract emit Transfer event
 *    → Indexer Service catch Transfer event
 *    → Indexer Service cập nhật nfts.owner = newOwner
 *    → Indexer Service cập nhật nfts.transferHistory.push(...)
 *    → Indexer Service cập nhật properties.nft.currentOwner = newOwner
 *    → Indexer Service tạo record trong transactions collection
 *
 * 4. MARKETPLACE LIST NFT (Nếu có):
 *    User Frontend → Blockchain Service (3004) hoặc trực tiếp từ wallet
 *    → Smart Contract emit ItemListed event
 *    → Indexer Service catch ItemListed event
 *    → Indexer Service tạo record trong marketplace collection
 *    → Indexer Service cập nhật properties.status = 'listed'
 *
 * 5. MARKETPLACE BUY NFT:
 *    Buyer Frontend → Blockchain Service (3004) hoặc trực tiếp từ wallet
 *    → Smart Contract emit ItemSold + Transfer events
 *    → Indexer Service catch events
 *    → Indexer Service cập nhật marketplace.status = 'sold'
 *    → Indexer Service cập nhật nfts.owner = buyer
 *    → Indexer Service cập nhật properties.nft.currentOwner = buyer
 *    → Indexer Service cập nhật properties.status = 'sold'
 *    → Indexer Service tạo records trong transactions collection
 *
 * ========================================================================
 * LƯU Ý QUAN TRỌNG:
 * ========================================================================
 *
 * ✅ Chỉ Blockchain Service (3004) được phép gửi transactions
 * ✅ Chỉ Indexer Service được phép cập nhật on-chain data (nfts, marketplace)
 * ✅ Admin Service (3003) chỉ quản lý properties collection (off-chain data)
 * ✅ Query Service (3005) chỉ ĐỌC, không GHI (except analytics)
 * ✅ IPFS Service (3002) chỉ upload files, không query database
 * ✅ Auth Service (3001) chỉ quản lý users collection
 *
 * ✅ Cache metadata từ IPFS vào properties để query nhanh
 * ✅ Dữ liệu CỐ ĐỊNH → IPFS (name, description, attributes, legal docs)
 * ✅ Dữ liệu THAY ĐỔI → MongoDB (owner, price, status, analytics)
 * ✅ Blockchain là source of truth cho ownership và transactions
 * ✅ MongoDB là cache + mutable data + analytics
 *
 */
