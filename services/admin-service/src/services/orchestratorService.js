/**
 * ========================================================================
 * ORCHESTRATOR SERVICE - Điều phối mint NFT workflow
 * ========================================================================
 */

const axios = require("axios");
const Property = require("../models/Property");
const NFT = require("../models/NFT");
const {
  IPFS_SERVICE_URL,
  BLOCKCHAIN_SERVICE_URL,
} = require("../config/services");

class OrchestratorService {
  /**
   * Build NFT metadata from property data
   */
  buildMetadata(property) {
    const displayName = property.title || property.name || "Unnamed Property";

    return {
      name: displayName,
      description: property.description || "",
      image: property.images?.[0] || "",
      external_url: `https://viepropchain.com/properties/${property._id}`,
      attributes: [
        { trait_type: "Property Type", value: property.propertyType },
        { trait_type: "City", value: property.address?.city || "N/A" },
        { trait_type: "District", value: property.address?.district || "N/A" },
        {
          trait_type: "Area",
          value: property.area ? `${property.area} m²` : "N/A",
        },
        {
          trait_type: "Bedrooms",
          value: property.bedrooms?.toString() || "N/A",
        },
        {
          trait_type: "Bathrooms",
          value: property.bathrooms?.toString() || "N/A",
        },
        {
          trait_type: "Legal Status",
          value: property.legalStatus || "Unknown",
        },
        {
          trait_type: "Price",
          value: property.price
            ? `${property.price} ${property.currency || "VND"}`
            : "N/A",
        },
      ].filter((attr) => attr.value && attr.value !== "N/A"),
      features: property.features || [],
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
   * Update property with NFT info and create NFT record
   */
  async updatePropertyWithNFT(property, mintData, metadataCID, recipient) {
    try {
      // 1. Update property
      property.nft = {
        isMinted: true,
        tokenId: mintData.tokenId,
        contractAddress: mintData.contractAddress,
        metadataUri: `ipfs://${metadataCID}`,
        transactionHash: mintData.transactionHash,
        mintedAt: new Date(),
      };

      property.status = "minted";
      await property.save();

      // 2. Create NFT record in database
      const nft = new NFT({
        tokenId: mintData.tokenId,
        contractAddress: mintData.contractAddress,
        propertyId: property._id,
        currentOwner: recipient.toLowerCase(),
        originalOwner: recipient.toLowerCase(),
        metadataUri: `ipfs://${metadataCID}`,
        metadataCID: metadataCID,
        mintedAt: new Date(),
        mintedBy: recipient.toLowerCase(),
        mintTransactionHash: mintData.transactionHash,
        mintBlockNumber: mintData.blockNumber,
        status: "minted",
        transferHistory: [
          {
            from: "0x0000000000000000000000000000000000000000",
            to: recipient.toLowerCase(),
            transactionHash: mintData.transactionHash,
            blockNumber: mintData.blockNumber,
            transferredAt: new Date(),
            transferType: "mint",
          },
        ],
        totalTransfers: 1,
        lastTransferAt: new Date(),
      });

      await nft.save();
      console.log(`   ✅ NFT record created in database`);

      return { property, nft };
    } catch (error) {
      throw new Error(`Failed to update property: ${error.message}`);
    }
  }

  /**
   * Orchestrate complete mint workflow
   * @param {string} propertyId - Property ID
   * @param {string} recipient - Recipient wallet address
   * @param {string} metadataUri - Optional: Pre-uploaded metadata URI (ipfs://...)
   */
  async mintPropertyToNFT(propertyId, recipient, metadataUri = null) {
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

      let ipfsResult;
      let tokenURI;

      // 2. Handle metadata
      if (metadataUri) {
        // Use pre-uploaded metadata
        console.log(`   ✅ Using provided metadata URI: ${metadataUri}`);

        // Extract CID from ipfs:// URI
        const cid = metadataUri.replace("ipfs://", "");
        tokenURI = metadataUri;

        ipfsResult = {
          cid: cid,
          url: `https://gateway.pinata.cloud/ipfs/${cid}`,
          ipfsUrl: metadataUri,
        };
      } else {
        // Auto-build and upload metadata
        console.log(`   🔄 Auto-building metadata from property data...`);
        const metadata = this.buildMetadata(property);
        ipfsResult = await this.uploadMetadataToIPFS(metadata);
        tokenURI = ipfsResult.url;
      }

      // 3. Mint on blockchain
      const mintResult = await this.mintNFTOnBlockchain(recipient, tokenURI);

      // 4. Update property and create NFT record
      const { property: updatedProperty, nft } =
        await this.updatePropertyWithNFT(
          property,
          mintResult,
          ipfsResult.cid,
          recipient
        );

      console.log(`✅ Mint workflow completed successfully`);

      return {
        propertyId: updatedProperty._id,
        tokenId: mintResult.tokenId,
        contractAddress: mintResult.contractAddress,
        owner: recipient,
        transactionHash: mintResult.transactionHash,
        blockNumber: mintResult.blockNumber,
        tokenURI: tokenURI,
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
