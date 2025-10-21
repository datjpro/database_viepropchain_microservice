/**
 * ========================================================================
 * MINT CONTROLLER - Handle NFT minting requests
 * ========================================================================
 */

const orchestratorService = require("../services/orchestratorService");

class MintController {
  /**
   * Mint property to NFT
   */
  async mintProperty(req, res) {
    try {
      const { recipient } = req.body;
      const propertyId = req.params.id;

      if (!recipient) {
        return res.status(400).json({
          success: false,
          error: "Missing recipient address",
        });
      }

      console.log(`🔄 Minting property ${propertyId} for ${recipient}`);

      const result = await orchestratorService.mintPropertyToNFT(
        propertyId,
        recipient
      );

      res.json({
        success: true,
        message: "Property minted as NFT successfully",
        data: result,
      });
    } catch (error) {
      console.error("❌ Mint error:", error.message);
      const status = error.message.includes("not found") ? 404 : 500;
      res.status(status).json({
        success: false,
        error: "Failed to mint property",
        message: error.message,
      });
    }
  }
}

module.exports = new MintController();
