/**
 * ========================================================================
 * MINT CONTROLLER - Handle NFT minting requests
 * ========================================================================
 */

const orchestratorService = require("../services/orchestratorService");
const Property = require("../models/Property");

const ADMIN_WALLET_ADDRESS = process.env.ADMIN_WALLET_ADDRESS;

class MintController {
  /**
   * Mint property to NFT
   *
   * CUSTODIAL WALLET LOGIC:
   * - Nếu user CHƯA link ví (ownerWallet = null) → Mint vào ví Admin (giữ hộ)
   * - Nếu user ĐÃ link ví (ownerWallet có giá trị) → Mint trực tiếp vào ví user
   */
  async mintProperty(req, res) {
    try {
      const { metadataUri } = req.body;
      const propertyId = req.params.id;

      // 1. Lấy thông tin property
      const property = await Property.findById(propertyId);
      if (!property) {
        return res.status(404).json({
          success: false,
          error: "Property not found",
        });
      }

      // 2. QUY ĐỊNH CUSTODIAL WALLET: Tự động chọn recipient
      let recipientAddress;
      let isCustodial = false;

      if (property.ownerWallet) {
        // User ĐÃ link ví → Mint vào ví user
        recipientAddress = property.ownerWallet;
        console.log(`✅ User đã link ví: ${recipientAddress}`);
      } else {
        // User CHƯA link ví → Mint vào ví Admin (custodial)
        recipientAddress = ADMIN_WALLET_ADDRESS;
        isCustodial = true;
        console.log(
          `🏦 User chưa link ví → Mint vào ví Admin (Custodial): ${recipientAddress}`
        );
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
        message: isCustodial
          ? "Property minted to Admin wallet (Custodial) - User chưa link ví"
          : "Property minted to user's wallet successfully",
        data: {
          ...result,
          isCustodial,
          custodialWallet: isCustodial ? ADMIN_WALLET_ADDRESS : null,
        },
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
