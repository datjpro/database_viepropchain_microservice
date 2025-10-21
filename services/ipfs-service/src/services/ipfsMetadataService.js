/**
 * ========================================================================
 * IPFS METADATA SERVICE - Database operations for IPFS metadata
 * ========================================================================
 */

const { IPFSMetadata } = require("../../../../shared/models");

class IPFSMetadataService {
  /**
   * Save IPFS metadata to database
   */
  async saveMetadata(data) {
    try {
      const ipfsMetadata = new IPFSMetadata(data);
      await ipfsMetadata.save();
      return ipfsMetadata;
    } catch (error) {
      throw new Error(`Failed to save metadata: ${error.message}`);
    }
  }

  /**
   * Get metadata by CID
   */
  async getByCID(cid) {
    try {
      const metadata = await IPFSMetadata.findOne({ cid });

      if (metadata) {
        // Update access count
        metadata.accessCount = (metadata.accessCount || 0) + 1;
        metadata.lastAccessedAt = new Date();
        await metadata.save();
      }

      return metadata;
    } catch (error) {
      throw new Error(`Failed to get metadata: ${error.message}`);
    }
  }

  /**
   * Get metadata by property ID
   */
  async getByPropertyId(propertyId) {
    try {
      return await IPFSMetadata.find({ propertyId }).sort({ createdAt: -1 });
    } catch (error) {
      throw new Error(`Failed to get metadata by property: ${error.message}`);
    }
  }
}

module.exports = new IPFSMetadataService();
