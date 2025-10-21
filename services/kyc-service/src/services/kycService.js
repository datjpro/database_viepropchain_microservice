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
   * Submit KYC - Tự động verified luôn
   */
  async submitKYC(kycData) {
    try {
      const { walletAddress, fullName, idNumber } = kycData;

      // Check if already verified
      const existingKYC = await KYC.findOne({
        walletAddress: walletAddress.toLowerCase(),
      });

      if (existingKYC) {
        throw new Error("Wallet address already verified");
      }

      // Create and auto-verify
      const kyc = new KYC({
        walletAddress: walletAddress.toLowerCase(),
        fullName,
        idNumber,
        status: "verified",
        verifiedAt: new Date(),
      });

      await kyc.save();

      // Notify User Service
      await this.notifyUserService(walletAddress, {
        isVerified: true,
        verificationLevel: "basic",
        kycId: kyc._id,
      });

      console.log(`✅ KYC auto-verified: ${walletAddress}`);

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
   * Check if wallet is verified
   */
  async isVerified(walletAddress) {
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
  async notifyUserService(walletAddress, kycData) {
    try {
      await axios.put(
        `${USER_SERVICE_URL}/profiles/${walletAddress}/kyc-status`,
        kycData
      );
      console.log(`✅ User Service notified: ${walletAddress}`);
    } catch (error) {
      console.error("❌ Failed to notify User Service:", error.message);
    }
  }
}

module.exports = new KYCService();
