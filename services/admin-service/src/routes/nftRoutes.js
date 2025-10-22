/**
 * ========================================================================
 * NFT ROUTES
 * ========================================================================
 */

const express = require("express");
const router = express.Router();
const nftController = require("../controllers/nftController");

// Get NFT by token ID
router.get("/:tokenId", nftController.getNFT);

// Get NFTs by owner
router.get("/owner/:owner", nftController.getNFTsByOwner);

// Get all listed NFTs (marketplace)
router.get("/marketplace/listed", nftController.getListedNFTs);

// Get NFT statistics
router.get("/stats/overview", nftController.getStatistics);

// List NFT for sale
router.post("/:tokenId/list", nftController.listNFT);

// Unlist NFT
router.post("/:tokenId/unlist", nftController.unlistNFT);

// Update price (owner only)
router.put("/:tokenId/price", nftController.updatePrice);

// Update status (owner only)
router.put("/:tokenId/status", nftController.updateStatus);

// Update metadata (owner only)
router.put("/:tokenId/metadata", nftController.updateMetadata);

// Record sale (internal/indexer)
router.post("/:tokenId/record-sale", nftController.recordSale);

// Record transfer (internal/indexer)
router.post("/:tokenId/record-transfer", nftController.recordTransfer);

module.exports = router;
