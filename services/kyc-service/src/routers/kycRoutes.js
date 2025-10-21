/**
 * ========================================================================
 * KYC ROUTES (SIMPLIFIED)
 * ========================================================================
 */

const express = require("express");
const kycController = require("../controllers/kycController");

const router = express.Router();

// Submit KYC (auto-verify)
router.post("/kyc", kycController.submitKYC);

// Get KYC by wallet address
router.get("/kyc/:walletAddress", kycController.getKYC);

// Check if wallet is verified
router.get("/kyc/:walletAddress/verified", kycController.checkVerified);

// Get all verified users
router.get("/verified/all", kycController.getAllVerified);

// Get statistics
router.get("/statistics", kycController.getStatistics);

module.exports = router;
