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
router.post("/", verifyToken, kycController.submitKYC);

// ========================================================================
// TEST ROUTES: Submit KYC without authentication (FOR TESTING ONLY)
// ========================================================================

// POST /test - Body: { userId, email, fullName, idNumber }
router.post("/test", async (req, res) => {
  try {
    const { userId, email, fullName, idNumber } = req.body;

    if (!userId || !email || !fullName || !idNumber) {
      return res.status(400).json({
        success: false,
        error: "userId, email, fullName, and idNumber are required",
      });
    }

    const kycService = require("../services/kycService");
    const kyc = await kycService.submitKYC({
      userId,
      email,
      walletAddress: null,
      fullName,
      idNumber,
    });

    res.json({
      success: true,
      message: "KYC verified successfully (TEST MODE)",
      data: kyc,
    });
  } catch (error) {
    console.error("❌ Test Submit KYC error:", error.message);
    const status = error.message.includes("already verified") ? 400 : 500;
    res.status(status).json({
      success: false,
      error: "Failed to submit KYC",
      message: error.message,
    });
  }
});

// GET /test - Simple health check for KYC service
router.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "KYC Service is running",
    service: "kyc-service",
    port: process.env.PORT || 4007,
    note: "Use POST /test to submit KYC without authentication",
    example: {
      method: "POST",
      url: "/api/kyc/test",
      body: {
        userId: "test-user-123",
        email: "test@gmail.com",
        fullName: "Nguyễn Văn A",
        idNumber: "123456789012",
      },
    },
  });
});

// Get current user's KYC
router.get("/me", verifyToken, kycController.getMyKYC);

// Check if current user is verified
router.get("/me/verified", verifyToken, kycController.checkMyVerified);

// ========================================================================
// BACKWARD COMPATIBILITY: WALLET-BASED ROUTES (no auth required)
// ========================================================================

// Get KYC by wallet address (for backward compatibility)
router.get("/wallet/:walletAddress", kycController.getKYCByWallet);

// Check if wallet is verified (for backward compatibility)
router.get(
  "/wallet/:walletAddress/verified",
  kycController.checkVerifiedByWallet
);

// ========================================================================
// ADMIN/STATISTICS ROUTES (no auth for now)
// ========================================================================

// Get all verified users
router.get("/verified/all", kycController.getAllVerified);

// Get statistics
router.get("/statistics", kycController.getStatistics);

module.exports = router;
