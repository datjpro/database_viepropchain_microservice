/**
 * ========================================================================
 * AUTH CONTROLLER - Handle authentication requests
 * ========================================================================
 */

const authService = require("../services/authService");
const jwtService = require("../services/jwtService");

class AuthController {
  /**
   * Get nonce for signing
   */
  async getNonce(req, res) {
    try {
      const { walletAddress } = req.body;

      if (!walletAddress) {
        return res.status(400).json({
          success: false,
          error: "Missing wallet address",
        });
      }

      const result = await authService.getNonce(walletAddress);

      res.json({
        success: true,
        message: "Please sign this message to login",
        nonce: result.nonce,
        walletAddress: result.walletAddress,
      });
    } catch (error) {
      console.error("❌ Get nonce error:", error.message);
      res.status(500).json({
        success: false,
        error: "Failed to get nonce",
        message: error.message,
      });
    }
  }

  /**
   * Verify signature and login
   */
  async verifySignature(req, res) {
    try {
      const { walletAddress, signature } = req.body;

      if (!walletAddress || !signature) {
        return res.status(400).json({
          success: false,
          error: "Missing wallet address or signature",
        });
      }

      // Verify signature
      const user = await authService.verifySignature(walletAddress, signature);

      // Generate JWT token
      const token = jwtService.generateToken(user);

      // Save token to user
      await jwtService.saveToken(user, token);

      console.log(`✅ User logged in: ${walletAddress}`);

      res.json({
        success: true,
        message: "Login successful",
        token,
        user: {
          walletAddress: user.walletAddress,
          role: user.role,
          profile: user.profile,
        },
      });
    } catch (error) {
      console.error("❌ Verify signature error:", error.message);
      const status = error.message.includes("not found") ? 404 : 401;
      res.status(status).json({
        success: false,
        error: "Failed to verify signature",
        message: error.message,
      });
    }
  }

  /**
   * Get user profile
   */
  async getProfile(req, res) {
    try {
      const profile = await authService.getUserProfile(req.user.walletAddress);

      res.json({
        success: true,
        user: profile,
      });
    } catch (error) {
      console.error("❌ Get profile error:", error.message);
      res.status(500).json({
        success: false,
        error: "Failed to get profile",
        message: error.message,
      });
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(req, res) {
    try {
      const result = await authService.updateUserProfile(
        req.user.walletAddress,
        req.body
      );

      res.json({
        success: true,
        message: "Profile updated",
        user: result,
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
}

module.exports = new AuthController();
