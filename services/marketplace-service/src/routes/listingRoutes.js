/**
 * ========================================================================
 * LISTING ROUTES
 * ========================================================================
 */

const express = require("express");
const router = express.Router();
const listingController = require("../controllers/listingController");
const { verifyToken, optionalAuth } = require("../middleware/auth");

// Public routes (optional auth)
router.get("/", optionalAuth, listingController.getListings);
router.get("/:id", optionalAuth, listingController.getListingById);
router.get(
  "/token/:tokenId",
  optionalAuth,
  listingController.getListingByTokenId
);
router.post("/:id/view", listingController.trackView);

// Protected routes (require auth)
router.post("/", verifyToken, listingController.createListing);
router.put("/:id", verifyToken, listingController.updateListing);
router.delete("/:id", verifyToken, listingController.cancelListing);
router.get("/my/listings", verifyToken, listingController.getMyListings);

module.exports = router;
