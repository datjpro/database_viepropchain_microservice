/**
 * ========================================================================
 * OFFER ROUTES
 * ========================================================================
 */

const express = require("express");
const router = express.Router();
const offerController = require("../controllers/offerController");
const { verifyToken } = require("../middleware/auth");

// All offer routes require authentication
router.post("/", verifyToken, offerController.createOffer);
router.get(
  "/listing/:listingId",
  verifyToken,
  offerController.getOffersByListing
);
router.get("/my/offers", verifyToken, offerController.getMyOffers);
router.get("/my/received", verifyToken, offerController.getOffersOnMyListings);
router.post("/:offerId/accept", verifyToken, offerController.acceptOffer);
router.post("/:offerId/reject", verifyToken, offerController.rejectOffer);
router.delete("/:offerId", verifyToken, offerController.cancelOffer);

module.exports = router;
