/**
 * ========================================================================
 * APPROVAL CONTROLLER - Handle property verification and NFT minting
 * ========================================================================
 * Purpose: Separate Web2 approval from Web3 minting (Utility-First approach)
 */

const Property = require("../models/Property");
const axios = require("axios");

const BLOCKCHAIN_SERVICE_URL =
  process.env.BLOCKCHAIN_SERVICE_URL || "http://localhost:4004";

class ApprovalController {
  /**
   * Approve property (Web2 layer only)
   * Changes verificationStatus to 'verified' without minting NFT
   */
  async approveProperty(req, res) {
    try {
      const { id } = req.params;
      const { adminNotes } = req.body;

      console.log(`🔍 Approving property: ${id}`);

      const property = await Property.findById(id);
      if (!property) {
        return res.status(404).json({
          success: false,
          error: "Property not found",
        });
      }

      if (property.verificationStatus === "verified") {
        return res.status(400).json({
          success: false,
          error: "Property already verified",
        });
      }

      // Update verification status
      property.verificationStatus = "verified";
      property.blockchainStatus = "none"; // Not yet minted

      // Change status from 'draft' to 'active' when approved
      if (property.status === "draft") {
        property.status = "active";
      }

      await property.save();

      console.log(
        `   ✅ Property verified (Web2 only): ${property._id} - Status: ${property.status}`
      );

      res.json({
        success: true,
        message: "Property approved successfully. Ready for minting.",
        data: property,
      });
    } catch (error) {
      console.error("❌ Approve property error:", error.message);
      res.status(500).json({
        success: false,
        error: "Failed to approve property",
        message: error.message,
      });
    }
  }

  /**
   * Approve AND mint NFT (One-step process for convenience)
   * This combines verification + blockchain minting
   */
  async approveAndMint(req, res) {
    try {
      const { id } = req.params;
      const { recipientWallet } = req.body;

      console.log(`🔍 Approve & Mint property: ${id}`);

      const property = await Property.findById(id);
      if (!property) {
        return res.status(404).json({
          success: false,
          error: "Property not found",
        });
      }

      // Step 1: Approve property
      property.verificationStatus = "verified";
      property.blockchainStatus = "queue_mint";

      // Change status from 'draft' to 'active' when approved
      if (property.status === "draft") {
        property.status = "active";
      }

      await property.save();

      console.log(
        `   ✅ Step 1: Property verified - Status: ${property.status}`
      );

      // Step 2: Call Blockchain Service to mint NFT
      try {
        property.blockchainStatus = "minting";
        await property.save();

        console.log(`   🔄 Step 2: Calling Blockchain Service...`);

        const mintResponse = await axios.post(
          `${BLOCKCHAIN_SERVICE_URL}/api/blockchain/mint-property`,
          {
            propertyId: property._id.toString(),
            recipientAddress: recipientWallet || property.ownerWallet,
            metadata: {
              name: property.title || property.name,
              description: property.description,
              image: property.images?.[0],
              attributes: [
                {
                  trait_type: "Property Type",
                  value: property.propertyType,
                },
                { trait_type: "Area", value: property.area },
                { trait_type: "Price", value: property.price },
              ],
            },
          }
        );

        // Update property with NFT data
        property.blockchainStatus = "minted";
        property.nft.isMinted = true;
        property.nft.tokenId = mintResponse.data.tokenId;
        property.nft.contractAddress = mintResponse.data.contractAddress;
        property.nft.transactionHash = mintResponse.data.transactionHash;
        property.nft.metadataUri = mintResponse.data.metadataUri;
        property.nft.mintedAt = new Date();
        property.status = "minted";

        // Determine if custodial
        property.isCustodial = !recipientWallet || !property.ownerWallet;

        await property.save();

        console.log(
          `   ✅ Step 3: NFT Minted - TokenID: ${property.nft.tokenId}`
        );

        res.json({
          success: true,
          message: "Property approved and NFT minted successfully",
          data: {
            property,
            nft: {
              tokenId: property.nft.tokenId,
              contractAddress: property.nft.contractAddress,
              transactionHash: property.nft.transactionHash,
            },
          },
        });
      } catch (blockchainError) {
        console.error("❌ Blockchain minting failed:", blockchainError.message);

        // Update status to failed
        property.blockchainStatus = "sync_failed";
        await property.save();

        res.status(500).json({
          success: false,
          error: "Failed to mint NFT",
          message:
            blockchainError.response?.data?.message || blockchainError.message,
          property,
        });
      }
    } catch (error) {
      console.error("❌ Approve & Mint error:", error.message);
      res.status(500).json({
        success: false,
        error: "Failed to approve and mint property",
        message: error.message,
      });
    }
  }

  /**
   * Reject property
   */
  async rejectProperty(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const property = await Property.findById(id);
      if (!property) {
        return res.status(404).json({
          success: false,
          error: "Property not found",
        });
      }

      property.verificationStatus = "rejected";
      await property.save();

      console.log(`   ❌ Property rejected: ${property._id}`);

      res.json({
        success: true,
        message: "Property rejected",
        data: property,
      });
    } catch (error) {
      console.error("❌ Reject property error:", error.message);
      res.status(500).json({
        success: false,
        error: "Failed to reject property",
        message: error.message,
      });
    }
  }

  /**
   * Request more information
   */
  async requestInfo(req, res) {
    try {
      const { id } = req.params;
      const { message } = req.body;

      const property = await Property.findById(id);
      if (!property) {
        return res.status(404).json({
          success: false,
          error: "Property not found",
        });
      }

      property.verificationStatus = "info_required";
      await property.save();

      console.log(`   ℹ️ Info requested for property: ${property._id}`);

      res.json({
        success: true,
        message: "Additional information requested",
        data: property,
      });
    } catch (error) {
      console.error("❌ Request info error:", error.message);
      res.status(500).json({
        success: false,
        error: "Failed to request information",
        message: error.message,
      });
    }
  }

  /**
   * Get properties pending approval
   */
  async getPendingProperties(req, res) {
    try {
      const properties = await Property.find({
        verificationStatus: "pending",
      }).sort({ createdAt: -1 });

      res.json({
        success: true,
        data: properties,
        count: properties.length,
      });
    } catch (error) {
      console.error("❌ Get pending properties error:", error.message);
      res.status(500).json({
        success: false,
        error: "Failed to get pending properties",
        message: error.message,
      });
    }
  }

  /**
   * Fix property status (Admin utility)
   * Changes approved properties from 'draft' to 'active'
   */
  async fixPropertyStatus(req, res) {
    try {
      const { id } = req.params;

      console.log(`🔧 Fixing property status: ${id}`);

      const property = await Property.findById(id);
      if (!property) {
        return res.status(404).json({
          success: false,
          error: "Property not found",
        });
      }

      const oldStatus = property.status;

      // Fix: If verified but still draft, change to active
      if (
        property.verificationStatus === "verified" &&
        property.status === "draft"
      ) {
        property.status = "active";
        await property.save();

        console.log(`   ✅ Fixed: ${oldStatus} → ${property.status}`);

        return res.json({
          success: true,
          message: `Property status updated: ${oldStatus} → ${property.status}`,
          data: property,
        });
      }

      // Already correct
      res.json({
        success: true,
        message: "Property status is already correct",
        data: property,
        note: `Status: ${property.status}, VerificationStatus: ${property.verificationStatus}`,
      });
    } catch (error) {
      console.error("❌ Fix property status error:", error.message);
      res.status(500).json({
        success: false,
        error: "Failed to fix property status",
        message: error.message,
      });
    }
  }
}

module.exports = new ApprovalController();
