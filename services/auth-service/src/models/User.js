/**
 * ========================================================================
 * AUTH SERVICE - USER MODEL
 * ========================================================================
 */

const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    // ============================================================================
    // GOOGLE OAUTH FIELDS (Primary authentication)
    // ============================================================================
    googleId: {
      type: String,
      unique: true,
      sparse: true, // Allow null, but unique if exists
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
      validate: {
        validator: function (v) {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: "Invalid email address",
      },
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },

    // ============================================================================
    // WALLET FIELDS (Optional - linked after Gmail login)
    // ============================================================================
    walletAddress: {
      type: String,
      unique: true,
      sparse: true, // Allow null, but unique if exists
      lowercase: true,
      index: true,
      validate: {
        validator: function (v) {
          if (!v) return true; // Allow empty
          return /^0x[a-fA-F0-9]{40}$/.test(v);
        },
        message: "Invalid Ethereum address",
      },
    },
    walletLinkedAt: Date,
    nonce: {
      type: String,
      default: () => Math.floor(Math.random() * 1000000).toString(),
    },

    // ============================================================================
    // AUTH TRACKING
    // ============================================================================
    authMethods: [
      {
        type: {
          type: String,
          enum: ["google", "wallet"],
        },
        linkedAt: Date,
      },
    ],

    // ============================================================================
    // USER INFO
    // ============================================================================
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
      displayName: String, // From Google
      picture: String, // From Google profile photo
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

// Compound indexes for efficient queries
userSchema.index({ role: 1, createdAt: -1 });

// Pre-save hook: Add auth method if new
userSchema.pre("save", function (next) {
  if (this.isNew) {
    if (this.googleId && !this.authMethods.some((m) => m.type === "google")) {
      this.authMethods.push({ type: "google", linkedAt: new Date() });
    }
    if (
      this.walletAddress &&
      !this.authMethods.some((m) => m.type === "wallet")
    ) {
      this.authMethods.push({ type: "wallet", linkedAt: new Date() });
    }
  }
  next();
});

module.exports = mongoose.model("User", userSchema);
