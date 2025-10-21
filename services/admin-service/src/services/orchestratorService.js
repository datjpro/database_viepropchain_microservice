/**
 * ========================================================================
 * ORCHESTRATOR SERVICE - Điều phối mint NFT workflow
 * ========================================================================
 */

const axios = require("axios");
const { Property } = require("../../../../shared/models");
const {
  IPFS_SERVICE_URL,
  BLOCKCHAIN_SERVICE_URL,
} = require("../config/services");

class OrchestratorService {
  /**
   * Build NFT metadata from property data
   */
  buildMetadata(property) {
    return {
      name: property.name,
      description: property.description,
      image: property.imageUrl || property.media.images[0]?.url,
      external_url: `https://viepropchain.com/properties/${property._id}`,
      attributes: [
        { trait_type: "Property Type", value: property.propertyType },
        { trait_type: "City", value: property.location.city },
        {
          trait_type: "District",
          value: property.location.district || "N/A",
        },
        {
          trait_type: "Area",
          value: `${property.details.area?.value || 0} ${
            property.details.area?.unit || "m2"
          }`,
        },
        {
          trait_type: "Bedrooms",
          value: property.details.bedrooms?.toString() || "0",
        },
        {
          trait_type: "Legal Status",
          value: property.details.legalStatus || "Unknown",
        },
      ].filter((attr) => attr.value && attr.value !== "N/A"),
      legal_documents:
        property.media.documents?.map((doc) => ({
          name: doc.name,
          url: doc.url,
        })) || [],
      propertyId: property._id.toString(),
    };
  }

  /**
   * Upload metadata to IPFS
   */
  async uploadMetadataToIPFS(metadata) {
    try {
      console.log(`   🔄 Uploading metadata to IPFS...`);

      const response = await axios.post(
        `${IPFS_SERVICE_URL}/upload/metadata`,
        metadata
      );

      if (!response.data.success) {
        throw new Error("Failed to upload metadata to IPFS");
      }

      console.log(`   ✅ Metadata uploaded: ${response.data.data.cid}`);

      return {
        cid: response.data.data.cid,
        url: response.data.data.url,
        ipfsUrl: response.data.data.ipfsUrl,
      };
    } catch (error) {
      throw new Error(
        `IPFS upload failed: ${error.response?.data?.message || error.message}`
      );
    }
  }

  /**
   * Mint NFT on blockchain
   */
  async mintNFTOnBlockchain(recipient, tokenURI) {
    try {
      console.log(`   🔄 Minting NFT on blockchain...`);

      const response = await axios.post(`${BLOCKCHAIN_SERVICE_URL}/mint`, {
        recipient,
        tokenURI,
      });

      if (!response.data.success) {
        throw new Error("Failed to mint NFT");
      }

      console.log(`   ✅ NFT minted: Token ID ${response.data.data.tokenId}`);

      return response.data.data;
    } catch (error) {
      throw new Error(
        `Blockchain mint failed: ${
          error.response?.data?.message || error.message
        }`
      );
    }
  }

  /**
   * Update property with NFT info
   */
  async updatePropertyWithNFT(property, mintData, metadataCID) {
    try {
      property.nft = {
        isMinted: true,
        tokenId: mintData.tokenId,
        contractAddress: mintData.contractAddress,
        currentOwner: mintData.recipient.toLowerCase(),
        metadataCID,
        mintedAt: new Date(),
        mintedBy: mintData.mintedBy,
        transactionHash: mintData.transactionHash,
      };

      property.status = "minted";
      property.details.cachedAttributes =
        this.buildMetadata(property).attributes;

      await property.save();

      return property;
    } catch (error) {
      throw new Error(`Failed to update property: ${error.message}`);
    }
  }

  /**
   * Orchestrate complete mint workflow
   */
  async mintPropertyToNFT(propertyId, recipient) {
    try {
      console.log(`🔄 Starting mint workflow for property: ${propertyId}`);

      // 1. Get property
      const property = await Property.findById(propertyId);
      if (!property) {
        throw new Error("Property not found");
      }

      if (property.nft.isMinted) {
        throw new Error("Property already minted");
      }

      // 2. Build metadata
      const metadata = this.buildMetadata(property);

      // 3. Upload to IPFS
      const ipfsResult = await this.uploadMetadataToIPFS(metadata);

      // 4. Mint on blockchain
      const mintResult = await this.mintNFTOnBlockchain(
        recipient,
        ipfsResult.url
      );

      // 5. Update property
      await this.updatePropertyWithNFT(property, mintResult, ipfsResult.cid);

      console.log(`✅ Mint workflow completed successfully`);

      return {
        propertyId: property._id,
        tokenId: mintResult.tokenId,
        contractAddress: mintResult.contractAddress,
        owner: recipient,
        transactionHash: mintResult.transactionHash,
        blockNumber: mintResult.blockNumber,
        tokenURI: ipfsResult.url,
        metadataCID: ipfsResult.cid,
      };
    } catch (error) {
      console.error(`❌ Mint workflow failed:`, error.message);
      throw error;
    }
  }

  /**
   * Check service health
   */
  async checkServicesHealth() {
    try {
      const [ipfsHealth, blockchainHealth] = await Promise.all([
        axios
          .get(`${IPFS_SERVICE_URL}/health`, { timeout: 2000 })
          .catch(() => ({ data: { success: false } })),
        axios
          .get(`${BLOCKCHAIN_SERVICE_URL}/health`, { timeout: 2000 })
          .catch(() => ({ data: { success: false } })),
      ]);

      return {
        ipfsService: ipfsHealth.data.success ? "connected" : "disconnected",
        blockchainService: blockchainHealth.data.success
          ? "connected"
          : "disconnected",
      };
    } catch (error) {
      return {
        ipfsService: "error",
        blockchainService: "error",
      };
    }
  }
}

module.exports = new OrchestratorService();
