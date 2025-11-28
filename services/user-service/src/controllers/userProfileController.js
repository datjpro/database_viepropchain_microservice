/**
 * ========================================================================
 * USER PROFILE CONTROLLER
 * ========================================================================
 */

const userProfileService = require("../services/userProfileService");

class UserProfileController {
  /**
   * Get user profile
   */
  async getProfile(req, res) {
    try {
      const { walletAddress } = req.params;

      const profile = await userProfileService.getProfile(walletAddress);

      res.json({
        success: true,
        data: profile,
      });
    } catch (error) {
      console.error("❌ Get profile error:", error.message);
      const status = error.message.includes("not found") ? 404 : 500;
      res.status(status).json({
        success: false,
        error: "Failed to get profile",
        message: error.message,
      });
    }
  }

  /**
   * Get or create profile
   */
  async getOrCreateProfile(req, res) {
    try {
      const { walletAddress, userId, email } = req.body;

      // Support both wallet-based and userId-based profile creation
      let profile;

      if (userId && email) {
        // Gmail OAuth user - create by userId
        profile = await userProfileService.getOrCreateProfileByUserId(
          userId,
          email
        );
      } else if (walletAddress) {
        // Wallet-only user (backward compatibility)
        profile = await userProfileService.getOrCreateProfile(walletAddress);
      } else {
        return res.status(400).json({
          success: false,
          error: "Either userId+email or walletAddress is required",
        });
      }

      res.json({
        success: true,
        data: profile,
      });
    } catch (error) {
      console.error("❌ Get/create profile error:", error.message);
      res.status(500).json({
        success: false,
        error: "Failed to get/create profile",
        message: error.message,
      });
    }
  }

  /**
   * Update basic info
   */
  async updateBasicInfo(req, res) {
    try {
      const { walletAddress } = req.params;

      const profile = await userProfileService.updateBasicInfo(
        walletAddress,
        req.body
      );

      res.json({
        success: true,
        message: "Basic info updated",
        data: profile,
      });
    } catch (error) {
      console.error("❌ Update basic info error:", error.message);
      res.status(500).json({
        success: false,
        error: "Failed to update basic info",
        message: error.message,
      });
    }
  }

  /**
   * Update contact info
   */
  async updateContactInfo(req, res) {
    try {
      const { walletAddress } = req.params;

      const profile = await userProfileService.updateContactInfo(
        walletAddress,
        req.body
      );

      res.json({
        success: true,
        message: "Contact info updated",
        data: profile,
      });
    } catch (error) {
      console.error("❌ Update contact info error:", error.message);
      res.status(500).json({
        success: false,
        error: "Failed to update contact info",
        message: error.message,
      });
    }
  }

  /**
   * Update profile
   */
  async updateProfile(req, res) {
    try {
      const { walletAddress } = req.params;

      const profile = await userProfileService.updateProfile(
        walletAddress,
        req.body
      );

      res.json({
        success: true,
        message: "Profile updated",
        data: profile,
      });
    } catch (error) {
      console.error("❌ Update profile error:", error.message);
      res.status(500).json({
        success: false,
        error: "Failed to update profile",
        message: error.message,
      });
    }
  }

  /**
   * Update preferences
   */
  async updatePreferences(req, res) {
    try {
      const { walletAddress } = req.params;

      const profile = await userProfileService.updatePreferences(
        walletAddress,
        req.body
      );

      res.json({
        success: true,
        message: "Preferences updated",
        data: profile,
      });
    } catch (error) {
      console.error("❌ Update preferences error:", error.message);
      res.status(500).json({
        success: false,
        error: "Failed to update preferences",
        message: error.message,
      });
    }
  }

  /**
   * Update KYC status by userId (NEW - for Gmail OAuth users)
   * Called by KYC Service
   */
  async updateKYCStatusByUserId(req, res) {
    try {
      const { userId } = req.params;
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          error: "Email is required",
        });
      }

      const profile = await userProfileService.updateKYCStatusByUserId(
        userId,
        email,
        req.body
      );

      res.json({
        success: true,
        message: "KYC status updated by userId",
        data: profile,
      });
    } catch (error) {
      console.error("❌ Update KYC status by userId error:", error.message);
      res.status(500).json({
        success: false,
        error: "Failed to update KYC status",
        message: error.message,
      });
    }
  }

  /**
   * Update wallet address when user links wallet (NEW)
   * Called by Auth Service
   */
  async updateWalletAddress(req, res) {
    try {
      const { userId } = req.params;
      const { walletAddress } = req.body;

      if (!walletAddress) {
        return res.status(400).json({
          success: false,
          error: "Wallet address is required",
        });
      }

      const profile = await userProfileService.updateWalletAddress(
        userId,
        walletAddress
      );

      res.json({
        success: true,
        message: "Wallet address updated",
        data: profile,
      });
    } catch (error) {
      console.error("❌ Update wallet address error:", error.message);
      res.status(500).json({
        success: false,
        error: "Failed to update wallet address",
        message: error.message,
      });
    }
  }

  /**
   * Update KYC status by wallet (BACKWARD COMPATIBILITY)
   * Internal endpoint for KYC Service
   */
  async updateKYCStatus(req, res) {
    try {
      const { walletAddress } = req.params;

      const profile = await userProfileService.updateKYCStatus(
        walletAddress,
        req.body
      );

      res.json({
        success: true,
        message: "KYC status updated",
        data: profile,
      });
    } catch (error) {
      console.error("❌ Update KYC status error:", error.message);
      res.status(500).json({
        success: false,
        error: "Failed to update KYC status",
        message: error.message,
      });
    }
  }

  /**
   * Search users
   */
  async searchUsers(req, res) {
    try {
      const result = await userProfileService.searchUsers(req.query);

      res.json({
        success: true,
        data: result.users,
        pagination: result.pagination,
      });
    } catch (error) {
      console.error("❌ Search users error:", error.message);
      res.status(500).json({
        success: false,
        error: "Failed to search users",
        message: error.message,
      });
    }
  }

  /**
   * Get statistics
   */
  async getStatistics(req, res) {
    try {
      const stats = await userProfileService.getStatistics();

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

  /**
   * Get user's properties
   */
  async getUserProperties(req, res) {
    try {
      const { userId } = req.params;
      console.log(`🏠 Getting properties for user: ${userId}`);

      const properties = await userProfileService.getUserProperties(userId);

      console.log(`   ✅ Found ${properties.length} properties`);

      res.json({
        success: true,
        data: properties,
        count: properties.length,
      });
    } catch (error) {
      console.error("❌ Get user properties error:", error.message);
      res.status(500).json({
        success: false,
        error: "Failed to get user properties",
        message: error.message,
      });
    }
  }

  /**
   * Get user's NFTs
   */
  async getUserNFTs(req, res) {
    try {
      const { userId } = req.params;
      console.log(`🎨 Getting NFTs for user: ${userId}`);

      const nfts = await userProfileService.getUserNFTs(userId);

      console.log(`   ✅ Found ${nfts.nfts?.length || 0} NFTs`);

      res.json({
        success: true,
        data: nfts,
      });
    } catch (error) {
      console.error("❌ Get user NFTs error:", error.message);
      res.status(500).json({
        success: false,
        error: "Failed to get user NFTs",
        message: error.message,
      });
    }
  }

  /**
   * Get user's transaction history
   */
  async getUserTransactions(req, res) {
    try {
      const { userId } = req.params;
      console.log(`📊 Getting transactions for user: ${userId}`);

      const transactions = await userProfileService.getUserTransactions(userId);

      console.log(`   ✅ Found ${transactions.length} transactions`);

      res.json({
        success: true,
        data: transactions,
        count: transactions.length,
      });
    } catch (error) {
      console.error("❌ Get user transactions error:", error.message);
      res.status(500).json({
        success: false,
        error: "Failed to get user transactions",
        message: error.message,
      });
    }
  }

  /**
   * Get complete user dashboard data
   */
  async getUserDashboard(req, res) {
    try {
      const { userId } = req.params;
      console.log(`📈 Getting dashboard data for user: ${userId}`);

      const dashboard = await userProfileService.getUserDashboard(userId);

      res.json({
        success: true,
        data: dashboard,
      });
    } catch (error) {
      console.error("❌ Get user dashboard error:", error.message);
      res.status(500).json({
        success: false,
        error: "Failed to get user dashboard",
        message: error.message,
      });
    }
  }
}

module.exports = new UserProfileController();
