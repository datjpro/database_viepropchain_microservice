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
      const { walletAddress } = req.body;

      if (!walletAddress) {
        return res.status(400).json({
          success: false,
          error: "Wallet address is required",
        });
      }

      const profile = await userProfileService.getOrCreateProfile(
        walletAddress
      );

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
   * Update KYC status (internal endpoint for KYC Service)
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
}

module.exports = new UserProfileController();
