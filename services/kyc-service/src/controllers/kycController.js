/**
 * ========================================================================
 * KYC CONTROLLER (SIMPLIFIED)
 * ========================================================================
 */

const kycService = require("../services/kycService");

class KYCController {
  /**
   * Submit KYC - Auto verify (with Gmail login)
   */
  async submitKYC(req, res) {
    console.log("🔍 [submitKYC] Controller called");
    console.log("🔍 [submitKYC] req.user:", req.user);
    console.log("🔍 [submitKYC] req.body:", req.body);

    try {
      const { fullName, idNumber } = req.body;

      // userId và email đến từ JWT token (req.user từ verifyToken middleware)
      const userId = req.user?.userId || req.user?._id;
      const email = req.user?.email;
      const walletAddress = req.user?.walletAddress || null;

      console.log(
        "🔍 [submitKYC] Extracted - userId:",
        userId,
        "email:",
        email
      );

      if (!userId || !email) {
        console.log("❌ [submitKYC] Missing userId or email");
        return res.status(401).json({
          success: false,
          error: "Unauthorized - Please login with Google first",
        });
      }

      if (!fullName || !idNumber) {
        console.log("❌ [submitKYC] Missing fullName or idNumber");
        return res.status(400).json({
          success: false,
          error: "fullName and idNumber are required",
        });
      }

      console.log("✅ [submitKYC] Calling kycService.submitKYC...");
      const kyc = await kycService.submitKYC({
        userId,
        email,
        walletAddress,
        fullName,
        idNumber,
      });

      console.log("✅ [submitKYC] KYC submitted successfully");
      res.json({
        success: true,
        message: "KYC verified successfully",
        data: kyc,
      });
    } catch (error) {
      console.error("❌ [submitKYC] Submit KYC error:", error.message);
      const status = error.message.includes("already verified") ? 400 : 500;
      res.status(status).json({
        success: false,
        error: "Failed to submit KYC",
        message: error.message,
      });
    }
  }

  /**
   * Get current user's KYC
   */
  async getMyKYC(req, res) {
    try {
      const userId = req.user?.userId || req.user?._id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "Unauthorized",
        });
      }

      const kyc = await kycService.getKYCByUserId(userId);

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
   * Get KYC by wallet address (for backward compatibility)
   */
  async getKYCByWallet(req, res) {
    try {
      const { walletAddress } = req.params;

      const kyc = await kycService.getKYCByWallet(walletAddress);

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
   * Check if current user is verified
   */
  async checkMyVerified(req, res) {
    try {
      const userId = req.user?.userId || req.user?._id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "Unauthorized",
        });
      }

      const isVerified = await kycService.isVerifiedByUserId(userId);

      res.json({
        success: true,
        data: {
          userId,
          email: req.user?.email,
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
   * Check if wallet is verified (for backward compatibility)
   */
  async checkVerifiedByWallet(req, res) {
    try {
      const { walletAddress } = req.params;

      const isVerified = await kycService.isVerifiedByWallet(walletAddress);

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
