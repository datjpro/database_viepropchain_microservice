/**
 * ========================================================================
 * KYC SERVICE - Business logic (SIMPLIFIED)
 * ========================================================================
 * User tự submit họ tên + CCCD → Tự động verified
 * ========================================================================
 */

const axios = require("axios");
const KYC = require("../models/KYC");
const { USER_SERVICE_URL } = require("../config/services");

class KYCService {
  /**
   * Submit KYC - Tự động verified (with Gmail login)
   */
  async submitKYC(kycData) {
    try {
      const { userId, email, walletAddress, fullName, idNumber } = kycData;

      // Check if user already has KYC
      const existingKYC = await KYC.findOne({ userId });

      if (existingKYC) {
        throw new Error("User already has KYC verified");
      }

      // Check if idNumber already used
      const duplicateId = await KYC.findOne({ idNumber });
      if (duplicateId) {
        throw new Error("ID number already registered");
      }

      // Create and auto-verify
      // Use userId as placeholder for walletAddress if not provided
      const kyc = new KYC({
        userId,
        email: email.toLowerCase(),
        walletAddress: walletAddress
          ? walletAddress.toLowerCase()
          : `temp_${userId}`, // Temporary unique value using userId
        fullName,
        idNumber,
        status: "verified",
        verifiedAt: new Date(),
      });

      await kyc.save();

      // Notify User Service (non-blocking)
      this.notifyUserService(userId, email, walletAddress, {
        isVerified: true,
        verificationLevel: "basic",
        kycId: kyc._id,
        fullName,
      }).catch((error) => {
        console.warn(`⚠️ Failed to notify User Service: ${error.message}`);
        console.warn(`   (KYC still saved successfully)`);
      });

      console.log(`✅ KYC auto-verified for user: ${email}`);

      return kyc;
    } catch (error) {
      throw new Error(`Failed to submit KYC: ${error.message}`);
    }
  }

  /**
   * Get KYC by userId
   */
  async getKYCByUserId(userId) {
    try {
      const kyc = await KYC.findOne({ userId });

      if (!kyc) {
        throw new Error("KYC not found");
      }

      return kyc;
    } catch (error) {
      throw new Error(`Failed to get KYC: ${error.message}`);
    }
  }

  /**
   * Get KYC by wallet address (backward compatibility)
   */
  async getKYCByWallet(walletAddress) {
    try {
      const kyc = await KYC.findOne({
        walletAddress: walletAddress.toLowerCase(),
      });

      if (!kyc) {
        throw new Error("KYC not found");
      }

      return kyc;
    } catch (error) {
      throw new Error(`Failed to get KYC: ${error.message}`);
    }
  }

  /**
   * Check if user is verified
   */
  async isVerifiedByUserId(userId) {
    try {
      const kyc = await KYC.findOne({
        userId,
        status: "verified",
      });

      return !!kyc;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if wallet is verified (backward compatibility)
   */
  async isVerifiedByWallet(walletAddress) {
    try {
      const kyc = await KYC.findOne({
        walletAddress: walletAddress.toLowerCase(),
        status: "verified",
      });

      return !!kyc;
    } catch (error) {
      return false;
    }
  }

  /**
   * Update wallet address when user links wallet
   */
  async updateWalletAddress(userId, walletAddress) {
    try {
      const kyc = await KYC.findOne({ userId });

      if (!kyc) {
        throw new Error("KYC not found");
      }

      // Check if wallet address is already linked to another user
      const existingWallet = await KYC.findOne({
        walletAddress: walletAddress.toLowerCase(),
        userId: { $ne: userId }, // Not the current user
      });

      if (existingWallet) {
        throw new Error("Wallet address is already linked to another account");
      }

      kyc.walletAddress = walletAddress.toLowerCase();
      await kyc.save();

      console.log(`✅ KYC wallet updated for user ${userId}: ${walletAddress}`);

      return kyc;
    } catch (error) {
      throw new Error(`Failed to update wallet: ${error.message}`);
    }
  }

  /**
   * Get all verified users
   */
  async getAllVerified(page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;

      const [users, total] = await Promise.all([
        KYC.find({ status: "verified" })
          .sort({ verifiedAt: -1 })
          .skip(skip)
          .limit(Number(limit))
          .lean(),
        KYC.countDocuments({ status: "verified" }),
      ]);

      return {
        users,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw new Error(`Failed to get verified users: ${error.message}`);
    }
  }

  /**
   * Get statistics
   */
  async getStatistics() {
    try {
      const totalVerified = await KYC.countDocuments({ status: "verified" });

      return {
        totalVerified,
      };
    } catch (error) {
      throw new Error(`Failed to get statistics: ${error.message}`);
    }
  }

  /**
   * Notify User Service
   */
  async notifyUserService(userId, email, walletAddress, kycData) {
    try {
      // Use walletAddress if available, otherwise use userId as fallback
      const addressOrUserId = walletAddress || userId;

      await axios.put(
        `${USER_SERVICE_URL}/profiles/${addressOrUserId}/kyc-status`,
        {
          ...kycData,
          userId,
          email,
          walletAddress,
        }
      );

      console.log(`✅ User Service notified for user: ${email}`);
    } catch (error) {
      console.error("❌ Failed to notify User Service:", error.message);
      // Don't throw, just log
    }
  }
}

module.exports = new KYCService();
