/**
 * ========================================================================
 * KYC SERVICE - KYC MODEL (SIMPLIFIED)
 * ========================================================================
 * Chỉ cần nhập Họ tên + CCCD → Tự động verified
 * ========================================================================
 */

const mongoose = require("mongoose");

const kycSchema = new mongoose.Schema(
  {
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

    // Thông tin KYC đơn giản
    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    idNumber: {
      type: String,
      required: true,
      trim: true,
    },

    // Trạng thái (tự động verified khi submit)
    status: {
      type: String,
      enum: ["verified"],
      default: "verified",
    },

    verifiedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Indexes
kycSchema.index({ walletAddress: 1 });
kycSchema.index({ idNumber: 1 });

module.exports = mongoose.model("KYC", kycSchema);
