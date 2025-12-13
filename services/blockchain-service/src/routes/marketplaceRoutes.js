/**
 * ========================================================================
 * MARKETPLACE ROUTES - Blockchain marketplace interactions
 * ========================================================================
 */

const express = require("express");
const contractService = require("../services/contractService");

const router = express.Router();

/**
 * POST /marketplace/list
 * List NFT for sale on blockchain marketplace
 */
router.post("/marketplace/list", async (req, res) => {
  try {
    const { tokenId, priceInWei, sellerWallet } = req.body;

    if (!tokenId || !priceInWei || !sellerWallet) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
        message: "tokenId, priceInWei, and sellerWallet are required",
      });
    }

    // List NFT on blockchain marketplace
    const result = await contractService.listItem(
      tokenId,
      priceInWei,
      sellerWallet
    );

    res.json({
      success: true,
      message: "NFT listed successfully on blockchain",
      data: result,
    });
  } catch (error) {
    console.error("❌ List NFT error:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /marketplace/list-rent
 * List NFT for rent on blockchain marketplace
 */
router.post("/marketplace/list-rent", async (req, res) => {
  try {
    const { tokenId, pricePerDayInWei, maxDurationDays, sellerWallet } =
      req.body;

    if (!tokenId || !pricePerDayInWei || !maxDurationDays || !sellerWallet) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
        message:
          "tokenId, pricePerDayInWei, maxDurationDays, and sellerWallet are required",
      });
    }

    // List NFT for rent on blockchain marketplace
    const result = await contractService.listForRent(
      tokenId,
      pricePerDayInWei,
      maxDurationDays,
      sellerWallet
    );

    res.json({
      success: true,
      message: "NFT listed for rent successfully on blockchain",
      data: result,
    });
  } catch (error) {
    console.error("❌ List NFT for rent error:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /marketplace/listing-count
 * Get total number of listings on blockchain
 */
router.get("/marketplace/listing-count", async (req, res) => {
  try {
    const count = await contractService.getListingCount();

    res.json({
      success: true,
      data: { count },
    });
  } catch (error) {
    console.error("❌ Get listing count error:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /marketplace/listing/:listingId
 * Get listing details by listing ID
 */
router.get("/marketplace/listing/:listingId", async (req, res) => {
  try {
    const { listingId } = req.params;

    if (!listingId || isNaN(listingId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid listing ID",
      });
    }

    const listing = await contractService.getListing(parseInt(listingId));

    res.json({
      success: true,
      data: listing,
    });
  } catch (error) {
    console.error("❌ Get listing error:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
