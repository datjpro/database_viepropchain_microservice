/**
 * ========================================================================
 * GOOGLE OAUTH CONTROLLER
 * ========================================================================
 */

const jwtService = require("../services/jwtService");

class GoogleOAuthController {
  /**
   * Initiate Google OAuth login
   * This redirects user to Google consent screen
   */
  initiateLogin(req, res, next) {
    console.log("🔐 Initiating Google OAuth login...");
    // Passport will handle the redirect to Google
    // This is handled by the passport.authenticate middleware in routes
  }

  /**
   * Google OAuth callback
   * Called by Google after user consents
   */
  async handleCallback(req, res) {
    try {
      // User is attached by passport
      const user = req.user;

      if (!user) {
        console.error("❌ No user after Google OAuth");
        return res.redirect(
          `${process.env.FRONTEND_URL}/login?error=auth_failed`
        );
      }

      console.log("✅ Google OAuth successful for:", user.email);

      // Generate JWT token
      const token = jwtService.generateToken(user);

      // Save token to user
      await jwtService.saveToken(user, token);

      console.log("✅ JWT token generated");

      // 🔥 CREATE USER PROFILE in User Service if not exists
      try {
        const axios = require("axios");
        const USER_SERVICE_URL =
          process.env.USER_SERVICE_URL || "http://localhost:4006";

        await axios.post(
          `${USER_SERVICE_URL}/api/profiles`,
          {
            userId: user._id.toString(),
            email: user.email,
            walletAddress: user.walletAddress || null,
          },
          { timeout: 3000 }
        );
        console.log(
          `✅ User profile created/verified in User Service for ${user.email}`
        );
      } catch (error) {
        console.warn(
          `⚠️ Failed to create User Profile (may already exist):`,
          error.response?.data?.error || error.message
        );
      }

      // Redirect to frontend with token
      // Frontend will save this token and use it for API calls
      const redirectUrl = `${process.env.FRONTEND_URL}/auth/callback?token=${token}&email=${user.email}`;

      res.redirect(redirectUrl);
    } catch (error) {
      console.error("❌ Google OAuth callback error:", error);
      res.redirect(`${process.env.FRONTEND_URL}/login?error=${error.message}`);
    }
  }

  /**
   * Get current user info
   */
  async getCurrentUser(req, res) {
    try {
      // req.user contains decoded JWT token (userId, email, etc.)
      const User = require("../models/User");

      // Fetch full user from database
      const user = await User.findById(req.user.userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          error: "User not found",
        });
      }

      res.json({
        success: true,
        data: {
          id: user._id.toString(),
          userId: user._id.toString(), // Add userId for compatibility
          email: user.email,
          emailVerified: user.emailVerified,
          walletAddress: user.walletAddress || null,
          walletLinked: !!user.walletAddress,
          role: user.role,
          profile: user.profile,
          authMethods: user.authMethods,
          createdAt: user.createdAt,
          lastLoginAt: user.lastLoginAt,
        },
      });
    } catch (error) {
      console.error("❌ Get current user error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get user",
        message: error.message,
      });
    }
  }

  /**
   * Logout user
   */
  async logout(req, res) {
    try {
      // Clear session
      req.logout((err) => {
        if (err) {
          console.error("❌ Logout error:", err);
          return res.status(500).json({
            success: false,
            error: "Logout failed",
            message: err.message,
          });
        }

        // Clear token from user
        if (req.user) {
          req.user.sessionToken = null;
          req.user.tokenExpiry = null;
          req.user.save();
        }

        res.json({
          success: true,
          message: "Logged out successfully",
        });
      });
    } catch (error) {
      console.error("❌ Logout error:", error);
      res.status(500).json({
        success: false,
        error: "Logout failed",
        message: error.message,
      });
    }
  }
}

module.exports = new GoogleOAuthController();
