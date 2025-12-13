/**
 * ========================================================================
 * SHARED MODELS - Common MongoDB models for all services
 * ========================================================================
 */

const mongoose = require("mongoose");

// ============================================================================
// NFT MODEL
// ============================================================================
const NFTSchema = new mongoose.Schema({
  tokenId: { type: Number, required: true, unique: true },
  owner: { type: String, required: true },
  tokenURI: String,
  transferHistory: [
    {
      from: String,
      to: String,
      transactionHash: String,
      blockNumber: Number,
      timestamp: Date,
    },
  ],
  createdAt: { type: Date, default: Date.now },
});

// ============================================================================
// PROPERTY MODEL
// ============================================================================
const PropertySchema = new mongoose.Schema({
  // fields used by older services / admin-service
  name: String,
  title: { type: String },
  description: String,
  propertyType: {
    type: String,
    enum: ["apartment", "house", "villa", "townhouse", "condo"],
    required: true,
  },

  // location/address compatibility
  address: {
    city: String,
    district: String,
    ward: String,
    street: String,
  },
  location: {
    city: String,
    district: String,
    ward: String,
    street: String,
  },

  // media / images compatibility
  images: [String],
  media: {
    images: [{ url: String }],
    documents: [{ name: String, url: String }],
  },
  imageUrl: String,

  // detailed property info used by admin-service
  details: {
    area: {
      value: Number,
      unit: String,
    },
    bedrooms: Number,
    legalStatus: String,
    cachedAttributes: [mongoose.Schema.Types.Mixed],
  },

  // price structure used in queries
  price: {
    amount: Number,
    currency: { type: String, default: "VND" },
  },

  owner: String,

  nft: {
    isMinted: { type: Boolean, default: false },
    tokenId: Number,
    currentOwner: String,
    contractAddress: String,
    metadataCID: String,
    mintedAt: Date,
    mintedBy: String,
    transactionHash: String,
  },

  // status used by admin flows
  status: {
    type: String,
    enum: ["draft", "minted", "archived", "listed", "unlisted", "sold"],
    default: "draft",
  },

  marketplaceStatus: {
    type: String,
    enum: ["unlisted", "listed", "sold"],
    default: "unlisted",
  },
  currentListingId: Number,
  createdAt: { type: Date, default: Date.now },
});

// ============================================================================
// TRANSACTION MODEL
// ============================================================================
const TransactionSchema = new mongoose.Schema({
  transactionHash: { type: String, required: true, unique: true },
  type: {
    type: String,
    enum: ["mint", "transfer", "listing", "sale", "offer"],
    required: true,
  },
  from: String,
  to: String,
  tokenId: Number,
  blockNumber: Number,
  gasUsed: Number,
  status: {
    type: String,
    enum: ["pending", "confirmed", "failed"],
    default: "pending",
  },
  timestamp: { type: Date, default: Date.now },
});

// ============================================================================
// LISTING MODEL
// ============================================================================
const ListingSchema = new mongoose.Schema(
  {
    // listingId: { type: Number, unique: true, sparse: true }, // Removed - not used in off-chain listings
    tokenId: { type: Number, required: true },
    contractAddress: { type: String, required: true },
    propertyId: { type: mongoose.Schema.Types.ObjectId, ref: "Property" },
    propertyName: String,
    propertyType: String,
    propertyAddress: {
      city: String,
      district: String,
      ward: String,
    },
    propertyArea: Number,
    propertyImages: [String],
    seller: {
      userId: { type: mongoose.Schema.Types.ObjectId },
      walletAddress: { type: String, required: true },
      email: String,
      name: String,
    },
    price: {
      amount: { type: String, required: true }, // Wei string
      currency: { type: String, default: "ETH" },
    },
    status: {
      type: String,
      enum: ["active", "sold", "cancelled"],
      default: "active",
    },
    description: String,
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    },
    views: { type: Number, default: 0 },
    favorites: { type: Number, default: 0 },
    offers: [{ type: mongoose.Schema.Types.ObjectId, ref: "Offer" }],
    listedAt: { type: Date, default: Date.now },
    soldAt: Date,
    cancelledAt: Date,
    transactionHash: String,
    blockNumber: Number,
    buyer: {
      walletAddress: String,
    },
  },
  {
    timestamps: true,
  }
);

// ============================================================================
// OFFER MODEL
// ============================================================================
const OfferSchema = new mongoose.Schema(
  {
    listingRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Listing",
      required: true,
    },
    tokenId: { type: Number, required: true },
    buyer: {
      userId: { type: mongoose.Schema.Types.ObjectId, required: true },
      walletAddress: { type: String, required: true },
      email: String,
      name: String,
    },
    price: {
      amount: { type: String, required: true }, // Wei string
      currency: { type: String, default: "ETH" },
    },
    message: String,
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "cancelled", "expired"],
      default: "pending",
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    }, // 7 days
    respondedAt: Date,
    response: String,
  },
  {
    timestamps: true,
  }
);

// ============================================================================
// LIVE CHAT CONVERSATION MODEL
// ============================================================================
const ConversationSchema = new mongoose.Schema(
  {
    user: {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      email: String,
      name: String,
      socketId: String, // Socket ID hiện tại của user
    },
    admin: {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      email: String,
      name: String,
      socketId: String, // Socket ID hiện tại của admin
    },
    status: {
      type: String,
      enum: ["pending", "active", "closed"],
      default: "pending",
    },
    // Thông tin bổ sung
    subject: String, // Chủ đề hội thoại
    priority: {
      type: String,
      enum: ["low", "normal", "high", "urgent"],
      default: "normal",
    },
    tags: [String], // VD: ["support", "technical", "billing"]
    // Metadata
    lastMessageAt: { type: Date, default: Date.now },
    closedAt: Date,
    closedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    rating: { type: Number, min: 1, max: 5 }, // Đánh giá sau khi kết thúc
    feedback: String,
    // Thống kê
    messageCount: { type: Number, default: 0 },
    unreadCountUser: { type: Number, default: 0 }, // Số tin nhắn user chưa đọc
    unreadCountAdmin: { type: Number, default: 0 }, // Số tin nhắn admin chưa đọc
  },
  {
    timestamps: true,
  }
);

// Index để tìm kiếm nhanh
ConversationSchema.index({ "user.userId": 1, status: 1 });
ConversationSchema.index({ "admin.userId": 1, status: 1 });
ConversationSchema.index({ status: 1, lastMessageAt: -1 });

// ============================================================================
// LIVE CHAT MESSAGE MODEL
// ============================================================================
const ChatMessageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },
    sender: {
      userId: { type: mongoose.Schema.Types.ObjectId, required: true },
      role: {
        type: String,
        enum: ["user", "admin"],
        required: true,
      },
      name: String,
      avatar: String,
    },
    messageType: {
      type: String,
      enum: ["text", "image", "file", "system"],
      default: "text",
    },
    content: {
      text: String,
      fileUrl: String,
      fileName: String,
      fileSize: Number,
      mimeType: String,
    },
    // Trạng thái đọc
    isRead: { type: Boolean, default: false },
    readAt: Date,
    // Metadata
    isSystem: { type: Boolean, default: false }, // Tin nhắn hệ thống (VD: "Admin đã tham gia")
    replyTo: { type: mongoose.Schema.Types.ObjectId, ref: "ChatMessage" }, // Trả lời tin nhắn nào
  },
  {
    timestamps: true,
  }
);

// Index để truy vấn nhanh
ChatMessageSchema.index({ conversationId: 1, createdAt: 1 });
ChatMessageSchema.index({ conversationId: 1, isRead: 1 });

// ============================================================================
// EXPORT MODELS
// ============================================================================
module.exports = {
  NFT: mongoose.model("NFT", NFTSchema),
  Property: mongoose.model("Property", PropertySchema),
  Transaction: mongoose.model("Transaction", TransactionSchema),
  Listing: mongoose.model("Listing", ListingSchema),
  Offer: mongoose.model("Offer", OfferSchema),
  Conversation: mongoose.model("Conversation", ConversationSchema),
  ChatMessage: mongoose.model("ChatMessage", ChatMessageSchema),
};
