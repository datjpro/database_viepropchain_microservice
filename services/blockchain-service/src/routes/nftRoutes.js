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

// ERC721Enumerable endpoints
router.get("/total-supply", nftController.getTotalSupply);
router.get("/all-nfts", nftController.getAllNFTs);
router.get("/nft-by-index/:index", nftController.getNFTByIndex);

// ERC4907 Rental endpoints
router.post("/set-user", nftController.setUser);
router.get("/user/:tokenId", nftController.getUser);
router.get("/user-expires/:tokenId", nftController.getUserExpires);
router.get("/is-rented/:tokenId", nftController.isRented);

module.exports = router;
