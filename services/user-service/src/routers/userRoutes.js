/**
 * ========================================================================
 * USER PROFILE ROUTES
 * ========================================================================
 */

const express = require("express");
const userProfileController = require("../controllers/userProfileController");

const router = express.Router();

// Get or create profile
router.post("/profiles", userProfileController.getOrCreateProfile);

// Get profile
router.get("/profiles/:walletAddress", userProfileController.getProfile);

// Update basic info
router.put(
  "/profiles/:walletAddress/basic-info",
  userProfileController.updateBasicInfo
);

// Update contact info
router.put(
  "/profiles/:walletAddress/contact-info",
  userProfileController.updateContactInfo
);

// Update profile
router.put(
  "/profiles/:walletAddress/profile",
  userProfileController.updateProfile
);

// Update preferences
router.put(
  "/profiles/:walletAddress/preferences",
  userProfileController.updatePreferences
);

// ========================================================================
// NEW: USER-ID BASED ROUTES (for Gmail OAuth users)
// ========================================================================

// Update KYC status by userId (internal - called by KYC Service)
router.put(
  "/profiles/user/:userId/kyc-status",
  userProfileController.updateKYCStatusByUserId
);

// Update wallet address when user links wallet (internal - called by Auth Service)
router.put(
  "/profiles/user/:userId/wallet",
  userProfileController.updateWalletAddress
);

// ========================================================================
// BACKWARD COMPATIBILITY: WALLET-BASED ROUTES
// ========================================================================

// Update KYC status by wallet (internal - called by KYC Service)
router.put(
  "/profiles/:walletAddress/kyc-status",
  userProfileController.updateKYCStatus
);

// Search users
router.get("/users/search", userProfileController.searchUsers);

// Get statistics
router.get("/users/statistics", userProfileController.getStatistics);

// ========================================================================
// USER DATA AGGREGATION (Properties, NFTs, Transactions)
// ========================================================================

// Get user's properties by email/userId
router.get(
  "/users/:userId/properties",
  userProfileController.getUserProperties
);

// Get user's NFTs by wallet
router.get("/users/:userId/nfts", userProfileController.getUserNFTs);

// Get user's transaction history
router.get(
  "/users/:userId/transactions",
  userProfileController.getUserTransactions
);

// Get user's complete dashboard data
router.get("/users/:userId/dashboard", userProfileController.getUserDashboard);

module.exports = router;
