/**
 * ========================================================================
 * NFT QUERY CONTROLLER
 * ========================================================================
 */

const nftQueryService = require("../services/nftQueryService");

class NFTQueryController {
  /**
   * Get NFT info
   */
  async getNFTInfo(req, res) {
    try {
      const result = await nftQueryService.getNFTInfo(req.params.tokenId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("❌ Get NFT error:", error.message);
      const status = error.message.includes("not found") ? 404 : 500;
      res.status(status).json({
        success: false,
        error: "Failed to get NFT",
        message: error.message,
      });
    }
  }
}

module.exports = new NFTQueryController();
