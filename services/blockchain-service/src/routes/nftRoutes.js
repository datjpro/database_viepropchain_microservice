/**
 * ========================================================================
 * NFT ROUTES
 * ========================================================================
 */

const express = require("express");
const nftController = require("../controllers/nftController");

const router = express.Router();

// Mint NFT
router.post("/mint", nftController.mint);

// Get NFT info
router.get("/nft/:tokenId", nftController.getNFTInfo);

// Get NFTs by owner
router.get("/nfts/:owner", nftController.getNFTsByOwner);

// Transfer NFT
router.post("/transfer", nftController.transfer);

// Get token counter
router.get("/token-counter", nftController.getTokenCounter);

module.exports = router;
