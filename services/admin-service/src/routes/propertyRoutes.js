/**
 * ========================================================================
 * PROPERTY ROUTES
 * ========================================================================
 */

const express = require("express");
const propertyController = require("../controllers/propertyController");
const mintController = require("../controllers/mintController");
const approvalController = require("../controllers/approvalController");

const router = express.Router();

// CRUD operations
router.post("/", propertyController.createProperty);
router.get("/", propertyController.getProperties);
router.get("/my-properties/:owner", propertyController.getPropertiesByOwner);
router.get("/stats/overview", propertyController.getStatistics);
router.get("/:id", propertyController.getPropertyById);
router.put("/:id", propertyController.updateProperty);
router.delete("/:id", propertyController.deleteProperty);

// Approval workflow (Utility-First)
router.get("/pending/approval", approvalController.getPendingProperties);
router.post("/:id/approve", approvalController.approveProperty);
router.post("/:id/approve-and-mint", approvalController.approveAndMint);
router.post("/:id/reject", approvalController.rejectProperty);
router.post("/:id/request-info", approvalController.requestInfo);

// Legacy: Direct mint (for backward compatibility)
router.post("/:id/mint", mintController.mintProperty);

module.exports = router;
