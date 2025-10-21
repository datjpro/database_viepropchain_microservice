/**
 * ========================================================================
 * NFT QUERY SERVICE - NFT info retrieval
 * ========================================================================
 */

const NFT = require("../models/NFT");
const Property = require("../models/Property");

class NFTQueryService {
  /**
   * Get NFT info by token ID
   */
  async getNFTInfo(tokenId) {
    try {
      const nft = await NFT.findOne({ tokenId }).select("-__v").lean();

      if (!nft) {
        throw new Error("NFT not found");
      }

      // Get associated property
      const property = await Property.findById(nft.propertyId)
        .select("-__v")
        .lean();

      return {
        nft,
        property,
      };
    } catch (error) {
      throw new Error(`Failed to get NFT info: ${error.message}`);
    }
  }
}

module.exports = new NFTQueryService();
