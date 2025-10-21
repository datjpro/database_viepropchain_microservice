/**
 * ========================================================================
 * NFT SYNC SERVICE - Sync NFT data to MongoDB
 * ========================================================================
 */

const { NFT, Property } = require("../../../../shared/models");

class NFTSyncService {
  /**
   * Sync NFT data
   */
  async syncNFT(data) {
    try {
      const {
        tokenId,
        from,
        to,
        transactionHash,
        blockNumber,
        contract,
        isMint,
      } = data;

      // Update or create NFT document
      let nft = await NFT.findOne({ tokenId });

      if (!nft) {
        // New mint
        try {
          const tokenURI = await contract.tokenURI(tokenId);

          nft = new NFT({
            tokenId,
            owner: to,
            tokenURI,
            transferHistory: [],
            createdAt: new Date(),
          });

          console.log(`   ✅ New NFT created: Token ${tokenId}`);
        } catch (error) {
          console.error(
            `   ❌ Error fetching tokenURI for ${tokenId}:`,
            error.message
          );
          throw error;
        }
      } else {
        // Transfer
        nft.owner = to;
        console.log(`   ✅ NFT ownership updated: Token ${tokenId}`);
      }

      // Add to transfer history
      nft.transferHistory.push({
        from,
        to,
        transactionHash,
        blockNumber,
        timestamp: new Date(),
      });

      await nft.save();

      // Update Property if exists
      await this.updatePropertyOwnership(tokenId, to);

      return nft;
    } catch (error) {
      throw new Error(`Failed to sync NFT: ${error.message}`);
    }
  }

  /**
   * Update property ownership
   */
  async updatePropertyOwnership(tokenId, newOwner) {
    try {
      const property = await Property.findOne({ "nft.tokenId": tokenId });

      if (property) {
        property.nft.currentOwner = newOwner;
        property.owner = newOwner;
        await property.save();

        console.log(`   ✅ Property ownership updated: ${property._id}`);
      }
    } catch (error) {
      console.error("   ❌ Error updating property ownership:", error);
    }
  }
}

module.exports = new NFTSyncService();
