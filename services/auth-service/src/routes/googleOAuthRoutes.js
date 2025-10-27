/**
 * ========================================================================
 * GOOGLE OAUTH ROUTES
 * ========================================================================
 */

const express = require("express");
const router = express.Router();
const passport = require("../config/passport");
const googleOAuthController = require("../controllers/googleOAuthController");
const verifyToken = require("../middleware/verifyToken");

// ============================================================================
// GOOGLE OAUTH LOGIN
// ============================================================================

/**
 * @route   GET /auth/google
 * @desc    Initiate Google OAuth login
 * @access  Public
 */
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

/**
 * @route   GET /auth/google/callback
 * @desc    Google OAuth callback
 * @access  Public
 */
router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=auth_failed`,
    session: true,
  }),
  googleOAuthController.handleCallback
);

/**
 * @route   GET /auth/me
 * @desc    Get current user info
 * @access  Private (requires JWT token)
 */
router.get("/me", verifyToken, googleOAuthController.getCurrentUser);

/**
 * @route   POST /auth/logout
 * @desc    Logout user
 * @access  Private (requires JWT token)
 */
router.post("/logout", verifyToken, googleOAuthController.logout);

module.exports = router;
