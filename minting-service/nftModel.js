// minting-service/nftModel.js
const mongoose = require("mongoose");

const nftSchema = new mongoose.Schema({
  // ============================================
  // 1. BLOCKCHAIN DATA (Sao chép từ on-chain)
  // ============================================
  tokenId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },

  contractAddress: {
    type: String,
    required: true,
  },

  owner: {
    type: String,
    required: true,
    index: true,
    lowercase: true,
  },

  tokenURI: {
    type: String,
    required: true,
  },

  transactionHash: {
    type: String,
    required: true,
  },

  // ============================================
  // 2. IPFS METADATA (Sao chép từ IPFS)
  // ============================================
  metadata: {
    name: {
      type: String,
      required: true,
    },

    description: {
      type: String,
    },

    image: {
      type: String,
    },

    attributes: [
      {
        trait_type: { type: String, required: true },
        value: { type: String, required: true },
        _id: false,
      },
    ],
  },

  ipfsHash: {
    type: String,
  },

  // ============================================
  // 3. APPLICATION DATA (Dữ liệu ứng dụng)
  // ============================================

  // Trạng thái niêm yết
  status: {
    type: String,
    enum: ["NOT_FOR_SALE", "FOR_SALE", "IN_TRANSACTION", "SOLD"],
    default: "NOT_FOR_SALE",
    index: true,
  },

  // Giá niêm yết (có thể thay đổi)
  listingPrice: {
    amount: { type: Number, default: 0 },
    currency: { type: String, default: "VND" },
  },

  // Thống kê
  viewCount: {
    type: Number,
    default: 0,
  },

  favoriteCount: {
    type: Number,
    default: 0,
  },

  // Lịch sử giao dịch trên nền tảng
  transactionHistory: [
    {
      type: {
        type: String,
        enum: ["MINT", "TRANSFER", "PRICE_CHANGE", "STATUS_CHANGE"],
        required: true,
      },
      from: String,
      to: String,
      price: Number,
      transactionHash: String,
      timestamp: { type: Date, default: Date.now },
      _id: false,
    },
  ],

  // Liên kết đến profile người dùng
  ownerProfileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },

  // Metadata
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },

  updatedAt: {
    type: Date,
    default: Date.now,
  },

  // Đánh dấu NFT đã bị burn chưa
  isBurned: {
    type: Boolean,
    default: false,
  },
});

// Index cho tìm kiếm nhanh
nftSchema.index({ owner: 1, status: 1 });
nftSchema.index({ "metadata.name": "text", "metadata.description": "text" });

// Middleware: Tự động cập nhật updatedAt
nftSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model("NFT", nftSchema);
