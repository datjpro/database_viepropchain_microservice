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
    // ============================================================================
    // USER LINK (Primary - from Auth Service via JWT)
    // ============================================================================
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    // ============================================================================
    // WALLET (Optional - có sau khi user link wallet)
    // ============================================================================
    walletAddress: {
      type: String,
      unique: true,
      sparse: true, // Allow null, but unique if exists
      lowercase: true,
      validate: {
        validator: function (v) {
          if (!v) return true; // Allow empty
          return /^0x[a-fA-F0-9]{40}$/.test(v);
        },
        message: "Invalid Ethereum address",
      },
    },

    // ============================================================================
    // KYC INFO
    // ============================================================================
    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    idNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },

    // ============================================================================
    // STATUS (Tự động verified khi submit)
    // ============================================================================
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

// Additional indexes
kycSchema.index({ userId: 1 });
kycSchema.index({ email: 1 });
kycSchema.index({ walletAddress: 1 });

module.exports = mongoose.model("KYC", kycSchema);
