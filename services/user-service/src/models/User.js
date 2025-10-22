/**
 * ========================================================================
 * USER SERVICE - USER MODEL
 * ========================================================================
 */

const mongoose = require("mongoose");

const userProfileSchema = new mongoose.Schema(
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

    // Basic Info
    basicInfo: {
      firstName: { type: String, trim: true },
      lastName: { type: String, trim: true },
      fullName: { type: String, trim: true },
      dateOfBirth: Date,
      gender: { type: String, enum: ["male", "female", "other"] },
      nationality: String,
    },

    // Contact Info
    contactInfo: {
      email: { type: String, lowercase: true, trim: true },
      phone: { type: String, trim: true },
      address: {
        street: String,
        ward: String,
        district: String,
        city: String,
        country: String,
        postalCode: String,
      },
    },

    // Profile
    profile: {
      avatar: String,
      bio: String,
      occupation: String,
      company: String,
      website: String,
      socialMedia: {
        facebook: String,
        twitter: String,
        linkedin: String,
        telegram: String,
      },
    },

    // User Type & Status
    userType: {
      type: String,
      enum: ["individual", "business", "agent", "admin"],
      default: "individual",
      index: true,
    },

    status: {
      type: String,
      enum: ["active", "inactive", "suspended", "banned"],
      default: "active",
      index: true,
    },

    // KYC Status (reference to KYC Service)
    kycStatus: {
      isVerified: { type: Boolean, default: false },
      verificationLevel: {
        type: String,
        enum: ["none", "basic", "advanced", "full"],
        default: "none",
      },
      verifiedAt: Date,
      kycId: { type: mongoose.Schema.Types.ObjectId, ref: "KYC" },
    },

    // Preferences
    preferences: {
      language: { type: String, default: "vi" },
      currency: { type: String, default: "VND" },
      notifications: {
        email: { type: Boolean, default: true },
        push: { type: Boolean, default: true },
        sms: { type: Boolean, default: false },
      },
      privacy: {
        showEmail: { type: Boolean, default: false },
        showPhone: { type: Boolean, default: false },
        showAddress: { type: Boolean, default: false },
      },
    },

    // Activity Stats
    stats: {
      propertiesOwned: { type: Number, default: 0 },
      nftsOwned: { type: Number, default: 0 },
      transactionsCount: { type: Number, default: 0 },
      lastActive: Date,
    },

    // Metadata
    createdAt: { type: Date, default: Date.now, index: true },
    updatedAt: Date,
    lastLoginAt: Date,
  },
  { timestamps: true }
);

// Indexes for queries
userProfileSchema.index({ "contactInfo.email": 1 });
userProfileSchema.index({ userType: 1, status: 1 });
userProfileSchema.index({ "kycStatus.isVerified": 1 });
userProfileSchema.index({ createdAt: -1 });

// Virtual for full name
userProfileSchema.virtual("displayName").get(function () {
  if (this.basicInfo.fullName) return this.basicInfo.fullName;
  if (this.basicInfo.firstName && this.basicInfo.lastName) {
    return `${this.basicInfo.firstName} ${this.basicInfo.lastName}`;
  }
  return this.walletAddress.slice(0, 6) + "..." + this.walletAddress.slice(-4);
});

module.exports = mongoose.model("UserProfile", userProfileSchema);
