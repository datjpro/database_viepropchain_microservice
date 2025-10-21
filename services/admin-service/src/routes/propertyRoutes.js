/**
 * ========================================================================
 * PROPERTY ROUTES
 * ========================================================================
 */

const express = require("express");
const propertyController = require("../controllers/propertyController");
const mintController = require("../controllers/mintController");

const router = express.Router();

// CRUD operations
router.post("/", propertyController.createProperty);
router.get("/", propertyController.getProperties);
router.get("/stats/overview", propertyController.getStatistics);
router.get("/:id", propertyController.getPropertyById);
router.put("/:id", propertyController.updateProperty);
router.delete("/:id", propertyController.deleteProperty);

// Mint NFT
router.post("/:id/mint", mintController.mintProperty);

module.exports = router;
