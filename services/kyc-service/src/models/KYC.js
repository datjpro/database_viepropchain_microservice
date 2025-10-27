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
      // unique handled by MongoDB index
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      // index handled by MongoDB
    },

    // ============================================================================
    // WALLET (Optional - có sau khi user link wallet)
    // ============================================================================
    walletAddress: {
      type: String,
      // Unique handled by MongoDB index
      lowercase: true,
      validate: {
        validator: function (v) {
          if (!v) return true; // Allow null/empty
          // Allow temp_ placeholder or valid Ethereum address
          if (v.startsWith("temp_")) return true;
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
      // unique handled by MongoDB index
      trim: true,
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

// No schema-level indexes - all handled by MongoDB directly

module.exports = mongoose.model("KYC", kycSchema);
