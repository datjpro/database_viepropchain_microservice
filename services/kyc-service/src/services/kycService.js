/**
 * ========================================================================
 * KYC SERVICE - Business logic for KYC verification
 * ========================================================================
 */

const axios = require("axios");
const KYC = require("../models/KYC");
const { USER_SERVICE_URL } = require("../config/services");

class KYCService {
  /**
   * Submit KYC application
   */
  async submitKYC(kycData) {
    try {
      const {
        walletAddress,
        verificationType,
        basicInfo,
        contactVerification,
        addressInfo,
        documents,
      } = kycData;

      // Check if already has pending/approved KYC
      const existingKYC = await KYC.findOne({
        walletAddress: walletAddress.toLowerCase(),
        status: { $in: ["pending", "under_review", "approved"] },
      });

      if (existingKYC) {
        throw new Error("You already have a KYC application in progress");
      }

      // Create new KYC application
      const kyc = new KYC({
        walletAddress: walletAddress.toLowerCase(),
        verificationType: verificationType || "basic",
        basicInfo,
        contactVerification,
        addressInfo,
        documents,
        status: "pending",
        submittedAt: new Date(),
      });

      // Add audit log
      kyc.addAuditLog("submit", walletAddress.toLowerCase(), {
        verificationType: kyc.verificationType,
      });

      await kyc.save();

      console.log(`✅ KYC submitted: ${walletAddress} (${verificationType})`);

      return kyc;
    } catch (error) {
      throw new Error(`Failed to submit KYC: ${error.message}`);
    }
  }

  /**
   * Get KYC by wallet address
   */
  async getKYC(walletAddress) {
    try {
      const kyc = await KYC.findOne({
        walletAddress: walletAddress.toLowerCase(),
      }).sort({ submittedAt: -1 });

      if (!kyc) {
        throw new Error("KYC not found");
      }

      // Check expiry
      kyc.checkExpiry();
      if (kyc.isExpired) {
        await kyc.save();
      }

      return kyc;
    } catch (error) {
      throw new Error(`Failed to get KYC: ${error.message}`);
    }
  }

  /**
   * Update KYC status (for admin review)
   */
  async updateKYCStatus(kycId, statusData, reviewerWallet) {
    try {
      const { status, reviewNotes, rejectionReason } = statusData;

      const kyc = await KYC.findById(kycId);

      if (!kyc) {
        throw new Error("KYC not found");
      }

      const oldStatus = kyc.status;
      kyc.status = status;
      kyc.lastUpdatedAt = new Date();

      // Update review info
      kyc.review.reviewer = reviewerWallet;
      kyc.review.reviewedAt = new Date();
      kyc.review.reviewNotes = reviewNotes;

      if (status === "approved") {
        kyc.approvedAt = new Date();
        // Set expiry date (1 year for basic, 2 years for advanced/full)
        const expiryYears = kyc.verificationType === "basic" ? 1 : 2;
        kyc.expiryDate = new Date(
          Date.now() + expiryYears * 365 * 24 * 60 * 60 * 1000
        );

        // Update User Service
        await this.notifyUserService(kyc.walletAddress, {
          isVerified: true,
          verificationLevel: kyc.verificationType,
          kycId: kyc._id,
        });
      } else if (status === "rejected") {
        kyc.rejectedAt = new Date();
        kyc.review.rejectionReason = rejectionReason;

        // Update User Service
        await this.notifyUserService(kyc.walletAddress, {
          isVerified: false,
          verificationLevel: "none",
          kycId: kyc._id,
        });
      }

      // Add audit log
      kyc.addAuditLog("status_change", reviewerWallet, {
        oldStatus,
        newStatus: status,
        reviewNotes,
      });

      await kyc.save();

      console.log(`✅ KYC status updated: ${kycId} → ${status}`);

      return kyc;
    } catch (error) {
      throw new Error(`Failed to update KYC status: ${error.message}`);
    }
  }

  /**
   * Verify documents
   */
  async verifyDocuments(kycId, verificationData, reviewerWallet) {
    try {
      const {
        idVerified,
        faceMatchScore,
        faceMatchVerified,
        addressVerified,
        overallScore,
        riskLevel,
      } = verificationData;

      const kyc = await KYC.findById(kycId);

      if (!kyc) {
        throw new Error("KYC not found");
      }

      // Update verification results
      if (idVerified !== undefined) {
        kyc.verification.idVerified = idVerified;
        kyc.verification.idVerifiedAt = new Date();
        kyc.verification.idVerificationMethod = "manual";
      }

      if (faceMatchScore !== undefined) {
        kyc.verification.faceMatchScore = faceMatchScore;
        kyc.verification.faceMatchVerified = faceMatchVerified;
        if (faceMatchVerified) {
          kyc.verification.faceMatchVerifiedAt = new Date();
        }
      }

      if (addressVerified !== undefined) {
        kyc.verification.addressVerified = addressVerified;
        kyc.verification.addressVerifiedAt = new Date();
      }

      if (overallScore !== undefined) {
        kyc.verification.overallScore = overallScore;
      }

      if (riskLevel) {
        kyc.verification.riskLevel = riskLevel;
      }

      kyc.status = "under_review";
      kyc.lastUpdatedAt = new Date();

      // Add audit log
      kyc.addAuditLog("document_verification", reviewerWallet, {
        idVerified,
        faceMatchScore,
        addressVerified,
        overallScore,
      });

      await kyc.save();

      console.log(`✅ Documents verified for KYC: ${kycId}`);

      return kyc;
    } catch (error) {
      throw new Error(`Failed to verify documents: ${error.message}`);
    }
  }

  /**
   * Run compliance checks
   */
  async runComplianceChecks(kycId, reviewerWallet) {
    try {
      const kyc = await KYC.findById(kycId);

      if (!kyc) {
        throw new Error("KYC not found");
      }

      // Simulate compliance checks (in production, call external APIs)
      kyc.compliance.amlCheck = true;
      kyc.compliance.amlCheckAt = new Date();
      kyc.compliance.sanctionCheck = true;
      kyc.compliance.sanctionCheckAt = new Date();
      kyc.compliance.pepCheck = true;
      kyc.compliance.pepCheckAt = new Date();

      kyc.lastUpdatedAt = new Date();

      // Add audit log
      kyc.addAuditLog("compliance_check", reviewerWallet, {
        aml: true,
        sanction: true,
        pep: true,
      });

      await kyc.save();

      console.log(`✅ Compliance checks completed for KYC: ${kycId}`);

      return kyc;
    } catch (error) {
      throw new Error(`Failed to run compliance checks: ${error.message}`);
    }
  }

  /**
   * Search KYC applications
   */
  async searchKYC(filters) {
    try {
      const { status, verificationType, page = 1, limit = 20 } = filters;

      const filter = {};

      if (status) filter.status = status;
      if (verificationType) filter.verificationType = verificationType;

      const skip = (page - 1) * limit;

      const [applications, total] = await Promise.all([
        KYC.find(filter)
          .select("-documents -auditLog")
          .sort({ submittedAt: -1 })
          .skip(skip)
          .limit(Number(limit))
          .lean(),
        KYC.countDocuments(filter),
      ]);

      return {
        applications,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw new Error(`Failed to search KYC: ${error.message}`);
    }
  }

  /**
   * Get statistics
   */
  async getStatistics() {
    try {
      const [
        totalApplications,
        pendingApplications,
        approvedApplications,
        rejectedApplications,
        byVerificationType,
        byStatus,
      ] = await Promise.all([
        KYC.countDocuments(),
        KYC.countDocuments({ status: "pending" }),
        KYC.countDocuments({ status: "approved" }),
        KYC.countDocuments({ status: "rejected" }),
        KYC.aggregate([
          { $group: { _id: "$verificationType", count: { $sum: 1 } } },
        ]),
        KYC.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      ]);

      return {
        totalApplications,
        pendingApplications,
        approvedApplications,
        rejectedApplications,
        byVerificationType,
        byStatus,
      };
    } catch (error) {
      throw new Error(`Failed to get statistics: ${error.message}`);
    }
  }

  /**
   * Notify User Service about KYC status change
   */
  async notifyUserService(walletAddress, kycData) {
    try {
      await axios.put(
        `${USER_SERVICE_URL}/profiles/${walletAddress}/kyc-status`,
        kycData
      );
      console.log(`✅ User Service notified: ${walletAddress}`);
    } catch (error) {
      console.error("❌ Failed to notify User Service:", error.message);
      // Don't throw error - KYC update should succeed even if notification fails
    }
  }
}

module.exports = new KYCService();
