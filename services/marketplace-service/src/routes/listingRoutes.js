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
router.get("/rentals", optionalAuth, listingController.getRentalListings);
router.get("/:id", optionalAuth, listingController.getListingById);
router.get(
  "/token/:tokenId",
  optionalAuth,
  listingController.getListingByTokenId
);
router.get(
  "/token/:tokenId/rental-status",
  optionalAuth,
  listingController.getNFTRentalStatus
);
router.post("/:id/view", listingController.trackView);

// Protected routes (require auth)
router.post("/", verifyToken, listingController.createListing);
router.post("/rental", verifyToken, listingController.createRentalListing);
router.post("/:id/rent", verifyToken, listingController.rentNFT);
router.post("/:id/buy", verifyToken, listingController.buyListing);
router.put("/:id", verifyToken, listingController.updateListing);
router.delete("/:id", verifyToken, listingController.cancelListing);
router.get("/my/listings", verifyToken, listingController.getMyListings);
router.get("/my/rentals", verifyToken, listingController.getMyRentals);

// Blockchain service callback routes (internal - no auth required)
router.post("/mark-rented", listingController.markAsRented);

module.exports = router;
