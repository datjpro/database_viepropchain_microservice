/**
 * ========================================================================
 * KYC ROUTES
 * ========================================================================
 */

const express = require("express");
const kycController = require("../controllers/kycController");

const router = express.Router();

// Submit KYC application
router.post("/kyc", kycController.submitKYC);

// Get KYC by wallet address
router.get("/kyc/wallet/:walletAddress", kycController.getKYC);

// Get KYC by ID
router.get("/kyc/:id", kycController.getKYCById);

// Update KYC status (Admin)
router.put("/kyc/:id/status", kycController.updateKYCStatus);

// Verify documents (Admin)
router.put("/kyc/:id/verify-documents", kycController.verifyDocuments);

// Run compliance checks (Admin)
router.post("/kyc/:id/compliance-checks", kycController.runComplianceChecks);

// Search KYC applications (Admin)
router.get("/kyc/search/all", kycController.searchKYC);

// Get statistics (Admin)
router.get("/kyc/statistics/all", kycController.getStatistics);

module.exports = router;
