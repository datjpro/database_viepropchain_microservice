/**
 * ========================================================================
 * NFT INFO ROUTES - Enhanced with ERC721Enumerable
 * ========================================================================
 * Routes để lấy thông tin NFT thông qua ERC721Enumerable
 * ========================================================================
 */

const express = require("express");
const router = express.Router();
const nftController = require("../controllers/nftController");

/**
 * GET /my-nfts/:walletAddress
 * Lấy tất cả NFTs của user thông qua wallet (sử dụng ERC721Enumerable)
 */
router.get("/my-nfts/:walletAddress", nftController.getMyNFTs);

/**
 * GET /nft-detail/:tokenId
 * Lấy thông tin chi tiết 1 NFT
 */
router.get("/nft-detail/:tokenId", nftController.getNFTDetail);

/**
 * GET /all-nfts
 * Lấy tất cả NFTs đã mint với pagination
 */
router.get("/all-nfts", nftController.getAllNFTs);

/**
 * Legacy routes (giữ lại để tương thích ngược)
 */

const axios = require("axios");

const BLOCKCHAIN_SERVICE_URL =
  process.env.BLOCKCHAIN_SERVICE_URL || "http://localhost:4004";
const ADMIN_SERVICE_URL =
  process.env.ADMIN_SERVICE_URL || "http://localhost:4003";

/**
 * GET /nft-info/:walletAddress (Legacy)
 * Lấy danh sách NFTs của user kèm thông tin property
 */
router.get("/nft-info/:walletAddress", async (req, res) => {
  try {
    const { walletAddress } = req.params;

    // Redirect to new endpoint
    const response = await axios.get(
      `http://localhost:${
        process.env.PORT || 4008
      }/api/my-nfts/${walletAddress}`
    );

    res.json(response.data);
  } catch (error) {
    console.error("❌ Legacy NFT info error:", error.message);
    res.status(500).json({
      success: false,
      error: "Failed to get NFT information",
      message: error.message,
    });
  }
});

/**
 * GET /nft-info/token/:tokenId (Legacy)
 * Lấy thông tin chi tiết 1 NFT kèm property
 */
router.get("/nft-info/token/:tokenId", async (req, res) => {
  try {
    const { tokenId } = req.params;

    // Redirect to new endpoint
    const response = await axios.get(
      `http://localhost:${process.env.PORT || 4008}/api/nft-detail/${tokenId}`
    );

    res.json(response.data);
  } catch (error) {
    console.error("❌ Legacy NFT token info error:", error.message);
    res.status(500).json({
      success: false,
      error: "Failed to get NFT information",
      message: error.message,
    });
  }
});

module.exports = router;
