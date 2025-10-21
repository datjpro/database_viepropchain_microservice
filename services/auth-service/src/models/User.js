/**
 * ========================================================================
 * AUTH SERVICE - USER MODEL
 * ========================================================================
 */

const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
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
    nonce: {
      type: String,
      required: true,
      default: () => Math.floor(Math.random() * 1000000).toString(),
    },
    sessionToken: String,
    tokenExpiry: Date,
    role: {
      type: String,
      enum: ["user", "admin", "agent"],
      default: "user",
      index: true,
    },
    profile: {
      name: String,
      email: String,
      phone: String,
      avatar: String,
      bio: String,
    },
    favorites: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Property",
      },
    ],
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    lastLoginAt: Date,
  },
  { timestamps: true }
);

userSchema.index({ role: 1, createdAt: -1 });

module.exports = mongoose.model("User", userSchema);
