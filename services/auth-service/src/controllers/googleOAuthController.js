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
      // User is attached by verifyToken middleware
      const user = req.user;

      res.json({
        success: true,
        data: {
          id: user._id,
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
