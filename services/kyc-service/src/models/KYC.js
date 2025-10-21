/**
 * ========================================================================
 * KYC SERVICE - KYC MODEL
 * ========================================================================
 */

const mongoose = require("mongoose");

const kycSchema = new mongoose.Schema(
  {
    walletAddress: {
      type: String,
      required: true,
      lowercase: true,
      index: true,
      validate: {
        validator: function (v) {
          return /^0x[a-fA-F0-9]{40}$/.test(v);
        },
        message: "Invalid Ethereum address",
      },
    },

    // Verification Level
    verificationType: {
      type: String,
      enum: ["basic", "advanced", "full"],
      required: true,
      index: true,
    },

    // Status
    status: {
      type: String,
      enum: ["pending", "under_review", "approved", "rejected", "expired"],
      default: "pending",
      index: true,
    },

    // Basic KYC Info
    basicInfo: {
      fullName: { type: String, required: true, trim: true },
      dateOfBirth: { type: Date, required: true },
      nationality: { type: String, required: true },
      idNumber: { type: String, required: true, trim: true }, // CMND/CCCD
      idIssueDate: Date,
      idIssuePlace: String,
    },

    // Contact Verification
    contactVerification: {
      email: { type: String, lowercase: true, trim: true },
      emailVerified: { type: Boolean, default: false },
      emailVerifiedAt: Date,
      phone: { type: String, trim: true },
      phoneVerified: { type: Boolean, default: false },
      phoneVerifiedAt: Date,
    },

    // Address Info
    addressInfo: {
      currentAddress: {
        street: String,
        ward: String,
        district: String,
        city: String,
        country: String,
      },
      permanentAddress: {
        street: String,
        ward: String,
        district: String,
        city: String,
        country: String,
      },
      addressProofDocument: String, // IPFS CID
    },

    // Document Uploads (IPFS CIDs)
    documents: {
      idCardFront: { cid: String, uploadedAt: Date },
      idCardBack: { cid: String, uploadedAt: Date },
      selfieWithId: { cid: String, uploadedAt: Date },
      proofOfAddress: { cid: String, uploadedAt: Date },
      additionalDocs: [
        {
          type: String,
          cid: String,
          uploadedAt: Date,
        },
      ],
    },

    // Verification Results
    verification: {
      // ID Verification
      idVerified: { type: Boolean, default: false },
      idVerifiedAt: Date,
      idVerificationMethod: String, // "manual", "ocr", "ai"

      // Face Match
      faceMatchScore: Number, // 0-100
      faceMatchVerified: { type: Boolean, default: false },
      faceMatchVerifiedAt: Date,

      // Address Verification
      addressVerified: { type: Boolean, default: false },
      addressVerifiedAt: Date,

      // Overall Score
      overallScore: { type: Number, default: 0 }, // 0-100
      riskLevel: {
        type: String,
        enum: ["low", "medium", "high"],
        default: "medium",
      },
    },

    // Review Process
    review: {
      reviewer: { type: String }, // Admin wallet address
      reviewedAt: Date,
      reviewNotes: String,
      rejectionReason: String,
      requestedChanges: [String],
    },

    // Compliance
    compliance: {
      amlCheck: { type: Boolean, default: false },
      amlCheckAt: Date,
      sanctionCheck: { type: Boolean, default: false },
      sanctionCheckAt: Date,
      pepCheck: { type: Boolean, default: false }, // Politically Exposed Person
      pepCheckAt: Date,
    },

    // Expiry
    expiryDate: Date,
    isExpired: { type: Boolean, default: false, index: true },

    // Metadata
    submittedAt: { type: Date, default: Date.now, index: true },
    approvedAt: Date,
    rejectedAt: Date,
    lastUpdatedAt: Date,

    // Audit Trail
    auditLog: [
      {
        action: String,
        actor: String, // Wallet address of who did the action
        timestamp: { type: Date, default: Date.now },
        details: mongoose.Schema.Types.Mixed,
      },
    ],
  },
  { timestamps: true }
);

// Indexes
kycSchema.index({ walletAddress: 1, verificationType: 1 });
kycSchema.index({ status: 1, submittedAt: -1 });
kycSchema.index({ "verification.overallScore": -1 });
kycSchema.index({ expiryDate: 1 });

// Check if KYC is expired
kycSchema.methods.checkExpiry = function () {
  if (this.expiryDate && this.expiryDate < new Date()) {
    this.isExpired = true;
    this.status = "expired";
    return true;
  }
  return false;
};

// Add audit log entry
kycSchema.methods.addAuditLog = function (action, actor, details) {
  this.auditLog.push({
    action,
    actor,
    timestamp: new Date(),
    details,
  });
};

module.exports = mongoose.model("KYC", kycSchema);
