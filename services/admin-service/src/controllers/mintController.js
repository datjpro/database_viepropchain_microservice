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
      const { recipient, to, metadataUri } = req.body;
      const propertyId = req.params.id;

      // Accept both 'recipient' and 'to' field names
      const recipientAddress = recipient || to;

      if (!recipientAddress) {
        return res.status(400).json({
          success: false,
          error: "Missing recipient address (use 'to' or 'recipient' field)",
        });
      }

      // metadataUri is optional - if not provided, metadata will be auto-generated
      console.log(`🔄 Minting property ${propertyId} for ${recipientAddress}`);
      if (metadataUri) {
        console.log(`📎 Metadata URI: ${metadataUri}`);
      } else {
        console.log(`📎 Auto-generating metadata from property data`);
      }

      const result = await orchestratorService.mintPropertyToNFT(
        propertyId,
        recipientAddress,
        metadataUri
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
