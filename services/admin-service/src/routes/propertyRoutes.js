/**
 * ========================================================================
 * PROPERTY ROUTES
 * ========================================================================
 */

const express = require("express");
const propertyController = require("../controllers/propertyController");
const mintController = require("../controllers/mintController");
const approvalController = require("../controllers/approvalController");
const {
  verifyToken,
  optionalAuth,
  requireAdmin,
} = require("../middleware/authMiddleware");

const router = express.Router();

// CRUD operations
// Step 1: Create draft (no images/docs required)
router.post("/", verifyToken, propertyController.createProperty); // 🔒 Require authentication

// Step 2: Upload images to property
router.post("/:id/images", verifyToken, propertyController.uploadImages); // 🔒 Auth

// Step 3: Upload legal documents to property
router.post("/:id/documents", verifyToken, propertyController.uploadDocuments); // 🔒 Auth

// Step 4: Submit property for approval (draft -> active)
router.put("/:id/submit", verifyToken, propertyController.submitProperty); // 🔒 Auth

// Regular CRUD
router.get("/", optionalAuth, propertyController.getProperties); // Public but auth-aware
router.get(
  "/my-properties/:owner",
  verifyToken,
  propertyController.getPropertiesByOwner
); // 🔒 Auth
router.get("/stats/overview", propertyController.getStatistics); // Public
router.get("/:id", optionalAuth, propertyController.getPropertyById); // Public but auth-aware
router.put("/:id", verifyToken, propertyController.updateProperty); // 🔒 Auth
router.delete("/:id", verifyToken, propertyController.deleteProperty); // 🔒 Auth

// Approval workflow (Utility-First) - Admin only
router.get(
  "/pending/approval",
  verifyToken,
  requireAdmin,
  approvalController.getPendingProperties
); // 👮 Admin
router.post(
  "/:id/approve",
  verifyToken,
  requireAdmin,
  approvalController.approveProperty
); // 👮 Admin
router.post(
  "/:id/approve-and-mint",
  verifyToken,
  requireAdmin,
  approvalController.approveAndMint
); // 👮 Admin
router.post(
  "/:id/reject",
  verifyToken,
  requireAdmin,
  approvalController.rejectProperty
); // 👮 Admin
router.post(
  "/:id/request-info",
  verifyToken,
  requireAdmin,
  approvalController.requestInfo
); // 👮 Admin

// Legacy: Direct mint (for backward compatibility)
router.post("/:id/mint", mintController.mintProperty);

module.exports = router;
