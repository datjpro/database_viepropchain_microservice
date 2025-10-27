/**
 * ========================================================================
 * KYC ROUTES (SIMPLIFIED)
 * ========================================================================
 * Updated to support userId-based authentication from Gmail OAuth
 * while maintaining backward compatibility for wallet-based lookups
 */

const express = require("express");
const kycController = require("../controllers/kycController");
const verifyToken = require("../middleware/verifyToken");

const router = express.Router();

// ========================================================================
// NEW: USER-ID BASED ROUTES (requires JWT token from Auth Service)
// ========================================================================

// Submit KYC (requires JWT token with userId)
// Body: { fullName, idNumber }
// userId and email are extracted from JWT token
router.post("/kyc", verifyToken, kycController.submitKYC);

// Get current user's KYC
router.get("/kyc/me", verifyToken, kycController.getMyKYC);

// Check if current user is verified
router.get("/kyc/me/verified", verifyToken, kycController.checkMyVerified);

// ========================================================================
// BACKWARD COMPATIBILITY: WALLET-BASED ROUTES (no auth required)
// ========================================================================

// Get KYC by wallet address (for backward compatibility)
router.get("/kyc/:walletAddress", kycController.getKYCByWallet);

// Check if wallet is verified (for backward compatibility)
router.get("/kyc/:walletAddress/verified", kycController.checkVerifiedByWallet);

// ========================================================================
// ADMIN/STATISTICS ROUTES (no auth for now)
// ========================================================================

// Get all verified users
router.get("/verified/all", kycController.getAllVerified);

// Get statistics
router.get("/statistics", kycController.getStatistics);

module.exports = router;
