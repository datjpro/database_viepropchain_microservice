/**
 * ========================================================================
 * KYC CONTROLLER (SIMPLIFIED)
 * ========================================================================
 */

const kycService = require("../services/kycService");

class KYCController {
  /**
   * Submit KYC - Auto verify
   */
  async submitKYC(req, res) {
    try {
      const { walletAddress, fullName, idNumber } = req.body;

      if (!walletAddress || !fullName || !idNumber) {
        return res.status(400).json({
          success: false,
          error: "walletAddress, fullName, and idNumber are required",
        });
      }

      const kyc = await kycService.submitKYC({
        walletAddress,
        fullName,
        idNumber,
      });

      res.json({
        success: true,
        message: "KYC verified successfully",
        data: kyc,
      });
    } catch (error) {
      console.error("❌ Submit KYC error:", error.message);
      const status = error.message.includes("already verified") ? 400 : 500;
      res.status(status).json({
        success: false,
        error: "Failed to submit KYC",
        message: error.message,
      });
    }
  }

  /**
   * Get KYC by wallet address
   */
  async getKYC(req, res) {
    try {
      const { walletAddress } = req.params;

      const kyc = await kycService.getKYC(walletAddress);

      res.json({
        success: true,
        data: kyc,
      });
    } catch (error) {
      console.error("❌ Get KYC error:", error.message);
      const status = error.message.includes("not found") ? 404 : 500;
      res.status(status).json({
        success: false,
        error: "Failed to get KYC",
        message: error.message,
      });
    }
  }

  /**
   * Check if wallet is verified
   */
  async checkVerified(req, res) {
    try {
      const { walletAddress } = req.params;

      const isVerified = await kycService.isVerified(walletAddress);

      res.json({
        success: true,
        data: {
          walletAddress,
          isVerified,
        },
      });
    } catch (error) {
      console.error("❌ Check verified error:", error.message);
      res.status(500).json({
        success: false,
        error: "Failed to check verification",
        message: error.message,
      });
    }
  }

  /**
   * Get all verified users
   */
  async getAllVerified(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;

      const result = await kycService.getAllVerified(page, limit);

      res.json({
        success: true,
        data: result.users,
        pagination: result.pagination,
      });
    } catch (error) {
      console.error("❌ Get all verified error:", error.message);
      res.status(500).json({
        success: false,
        error: "Failed to get verified users",
        message: error.message,
      });
    }
  }

  /**
   * Get statistics
   */
  async getStatistics(req, res) {
    try {
      const stats = await kycService.getStatistics();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error("❌ Get statistics error:", error.message);
      res.status(500).json({
        success: false,
        error: "Failed to get statistics",
        message: error.message,
      });
    }
  }
}

module.exports = new KYCController();
