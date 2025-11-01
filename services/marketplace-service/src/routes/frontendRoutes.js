/**
 * ========================================================================
 * FRONTEND ROUTES - Fast Read APIs for Frontend
 * ========================================================================
 */

const express = require("express");
const router = express.Router();
const frontendController = require("../controllers/frontendController");

// Public endpoints (no auth required)
router.get("/marketplace/home", frontendController.getMarketplaceHome);
router.get("/marketplace/featured", frontendController.getFeaturedListings);
router.get(
  "/marketplace/search/suggestions",
  frontendController.getSearchSuggestions
);
router.get("/marketplace/listings/:id", frontendController.getListingDetail);

module.exports = router;
