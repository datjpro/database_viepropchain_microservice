const express = require("express");
const router = express.Router();
const controller = require("../controllers/marketplaceController");
const nftController = require("../controllers/nft.controller");

router.get("/marketplace/listings", controller.getListings);
router.get("/nft/:tokenId/history", controller.getNftHistory);
router.get("/nft/:tokenId/rental-status", controller.getNftRentalStatus);
router.get("/my-nfts", controller.getMyNfts);
// Optional: support wallet as route param (easier for direct links)
router.get("/my-nfts/:walletAddress", nftController.getMyNFTsByParam);
// Debug: DB stats
router.get("/debug/db-stats", controller.getDbStats);

module.exports = router;
