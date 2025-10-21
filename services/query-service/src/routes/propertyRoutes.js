/**
 * ========================================================================
 * PROPERTY QUERY ROUTES
 * ========================================================================
 */

const express = require("express");
const propertyQueryController = require("../controllers/propertyQueryController");
const analyticsController = require("../controllers/analyticsController");

const router = express.Router();

// Property search & detail
router.get("/properties", propertyQueryController.searchProperties);
router.get(
  "/properties/featured/list",
  propertyQueryController.getFeaturedProperties
);
router.get("/properties/:id", propertyQueryController.getPropertyById);

// Analytics
router.post("/properties/:id/view", analyticsController.trackView);

// Locations
router.get("/locations/cities", propertyQueryController.getCities);
router.get("/locations/districts", propertyQueryController.getDistricts);

module.exports = router;
