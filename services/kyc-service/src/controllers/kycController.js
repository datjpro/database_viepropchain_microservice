/**
 * ========================================================================
 * KYC CONTROLLER
 * ========================================================================
 */

const kycService = require("../services/kycService");

class KYCController {
  /**
   * Submit KYC application
   */
  async submitKYC(req, res) {
    try {
      const kyc = await kycService.submitKYC(req.body);

      res.json({
        success: true,
        message: "KYC application submitted successfully",
        data: kyc,
      });
    } catch (error) {
      console.error("❌ Submit KYC error:", error.message);
      const status = error.message.includes("already have") ? 400 : 500;
      res.status(status).json({
        success: false,
        error: "Failed to submit KYC",
        message: error.message,
      });
    }
  }

  /**
   * Get KYC by wallet address
   */
  async getKYC(req, res) {
    try {
      const { walletAddress } = req.params;

      const kyc = await kycService.getKYC(walletAddress);

      res.json({
        success: true,
        data: kyc,
      });
    } catch (error) {
      console.error("❌ Get KYC error:", error.message);
      const status = error.message.includes("not found") ? 404 : 500;
      res.status(status).json({
        success: false,
        error: "Failed to get KYC",
        message: error.message,
      });
    }
  }

  /**
   * Get KYC by ID
   */
  async getKYCById(req, res) {
    try {
      const { id } = req.params;

      const KYC = require("../models/KYC");
      const kyc = await KYC.findById(id);

      if (!kyc) {
        return res.status(404).json({
          success: false,
          error: "KYC not found",
        });
      }

      res.json({
        success: true,
        data: kyc,
      });
    } catch (error) {
      console.error("❌ Get KYC by ID error:", error.message);
      res.status(500).json({
        success: false,
        error: "Failed to get KYC",
        message: error.message,
      });
    }
  }

  /**
   * Update KYC status (Admin only)
   */
  async updateKYCStatus(req, res) {
    try {
      const { id } = req.params;
      const { reviewerWallet } = req.body;

      if (!reviewerWallet) {
        return res.status(400).json({
          success: false,
          error: "Reviewer wallet address is required",
        });
      }

      const kyc = await kycService.updateKYCStatus(
        id,
        req.body,
        reviewerWallet
      );

      res.json({
        success: true,
        message: "KYC status updated",
        data: kyc,
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
   * Verify documents (Admin only)
   */
  async verifyDocuments(req, res) {
    try {
      const { id } = req.params;
      const { reviewerWallet } = req.body;

      if (!reviewerWallet) {
        return res.status(400).json({
          success: false,
          error: "Reviewer wallet address is required",
        });
      }

      const kyc = await kycService.verifyDocuments(
        id,
        req.body,
        reviewerWallet
      );

      res.json({
        success: true,
        message: "Documents verified",
        data: kyc,
      });
    } catch (error) {
      console.error("❌ Verify documents error:", error.message);
      res.status(500).json({
        success: false,
        error: "Failed to verify documents",
        message: error.message,
      });
    }
  }

  /**
   * Run compliance checks (Admin only)
   */
  async runComplianceChecks(req, res) {
    try {
      const { id } = req.params;
      const { reviewerWallet } = req.body;

      if (!reviewerWallet) {
        return res.status(400).json({
          success: false,
          error: "Reviewer wallet address is required",
        });
      }

      const kyc = await kycService.runComplianceChecks(id, reviewerWallet);

      res.json({
        success: true,
        message: "Compliance checks completed",
        data: kyc,
      });
    } catch (error) {
      console.error("❌ Compliance checks error:", error.message);
      res.status(500).json({
        success: false,
        error: "Failed to run compliance checks",
        message: error.message,
      });
    }
  }

  /**
   * Search KYC applications (Admin only)
   */
  async searchKYC(req, res) {
    try {
      const result = await kycService.searchKYC(req.query);

      res.json({
        success: true,
        data: result.applications,
        pagination: result.pagination,
      });
    } catch (error) {
      console.error("❌ Search KYC error:", error.message);
      res.status(500).json({
        success: false,
        error: "Failed to search KYC",
        message: error.message,
      });
    }
  }

  /**
   * Get statistics (Admin only)
   */
  async getStatistics(req, res) {
    try {
      const stats = await kycService.getStatistics();

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

module.exports = new KYCController();
