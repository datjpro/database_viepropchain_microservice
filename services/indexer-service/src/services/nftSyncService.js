/**
 * ========================================================================
 * NFT SYNC SERVICE - Sync NFT data to MongoDB
 * ========================================================================
 */

const NFT = require("../models/NFT");
const Property = require("../models/Property");
const { ethers } = require("ethers");

class NFTSyncService {
  /**
   * Sync NFT data. This is robust: it will attempt to fetch missing
   * transaction / block / tokenURI information from the provider (RPC_URL)
   * and perform an upsert so missing required schema fields don't cause
   * validation errors during the initial write.
   */
  async syncNFT(data) {
    try {
      const {
        tokenId,
        from,
        to,
        transactionHash,
        blockNumber: eventBlockNumber,
        contract,
        isMint,
      } = data;

      const tokenIdNumber = Number(tokenId);

      // Determine provider: prefer contract.provider, fallback to RPC_URL
      let provider = null;
      if (contract && contract.provider) provider = contract.provider;
      else if (process.env.RPC_URL)
        provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);

      // Prepare fields we want to store
      let finalBlockNumber = eventBlockNumber || null;
      let mintedBy = null;
      let mintedTo = to ? String(to).toLowerCase() : null;
      let mintedAt = null;
      let mintTransactionHash = transactionHash || null;
      let tokenURI = null;
      let contractAddress =
        (contract && (contract.address || contract.target)) || null;

      // Try to fetch transaction and block info if missing
      try {
        if (provider && mintTransactionHash && !finalBlockNumber) {
          const tx = await provider.getTransaction(mintTransactionHash);
          if (tx && tx.blockNumber) finalBlockNumber = tx.blockNumber;
          if (tx && tx.from) mintedBy = tx.from.toLowerCase();
        }

        if (provider && finalBlockNumber && !mintedAt) {
          const block = await provider.getBlock(finalBlockNumber);
          if (block && block.timestamp)
            mintedAt = new Date(block.timestamp * 1000);
        }
      } catch (err) {
        console.warn(
          `   ⚠️ Warning fetching tx/block info for token ${tokenIdNumber}:`,
          err.message
        );
      }

      // Try to get tokenURI from contract with fallbacks
      try {
        if (contract && typeof contract.tokenURI === "function") {
          // ensure contract has a provider
          const c = provider ? contract.connect(provider) : contract;
          tokenURI = await c.tokenURI(tokenIdNumber);
        }
      } catch (err) {
        console.warn(
          `   ⚠️ tokenURI fetch failed for ${tokenIdNumber}:`,
          err.message
        );
        tokenURI = null;
      }

      // Derive metadataCID when possible
      let metadataCID = null;
      if (tokenURI && typeof tokenURI === "string") {
        if (tokenURI.startsWith("ipfs://"))
          metadataCID = tokenURI.replace("ipfs://", "");
        else {
          try {
            const url = new URL(tokenURI);
            if (url.hostname.includes("ipfs"))
              metadataCID = url.pathname.replace("/ipfs/", "");
          } catch (e) {
            metadataCID = null;
          }
        }
      }

      // Try to find related property by tokenId + contractAddress
      let property = null;
      try {
        const propQuery = { "nft.tokenId": tokenIdNumber };
        if (contractAddress)
          propQuery["nft.contractAddress"] =
            String(contractAddress).toLowerCase();
        property = await Property.findOne(propQuery);
      } catch (err) {
        console.warn(
          `   ⚠️ Error finding property for token ${tokenIdNumber}:`,
          err.message
        );
      }

      // Build upsert payload. Use updateOne with upsert to avoid schema validation on initial write.
      const update = {
        $set: {
          tokenId: tokenIdNumber,
          contractAddress: contractAddress,
          owner: mintedTo || (to ? String(to).toLowerCase() : null),
          tokenURI: tokenURI || "",
          metadataCID: metadataCID || "",
          mintedBy: mintedBy || (from ? String(from).toLowerCase() : null),
          mintedTo: mintedTo || (to ? String(to).toLowerCase() : null),
          mintedAt: mintedAt || new Date(),
          mintTransactionHash: mintTransactionHash || null,
          blockNumber: finalBlockNumber || eventBlockNumber || 0,
          lastSyncedAt: new Date(),
        },
        $push: {
          transferHistory: {
            from: from || null,
            to: to || null,
            transactionHash: mintTransactionHash || null,
            blockNumber: finalBlockNumber || eventBlockNumber || null,
            timestamp: new Date(),
          },
        },
      };

      if (property) {
        update.$set.propertyId = property._id;
        // update nested nft fields using updateOne to avoid full-document validation
        try {
          const propSet = {
            "nft.isMinted": true,
            "nft.tokenId": tokenIdNumber,
            "nft.contractAddress": contractAddress,
            "nft.currentOwner":
              mintedTo || (to ? String(to).toLowerCase() : null),
            "nft.metadataCID": metadataCID || property.nft.metadataCID,
            "nft.mintedAt": mintedAt || property.nft.mintedAt,
            "nft.mintedBy": mintedBy || property.nft.mintedBy,
            "nft.transactionHash":
              mintTransactionHash || property.nft.transactionHash,
          };
          await Property.updateOne({ _id: property._id }, { $set: propSet });
        } catch (err) {
          console.warn(
            `   ⚠️ Error updating property nft fields for ${property._id}:`,
            err.message
          );
        }
      }

      // Perform upsert
      await NFT.updateOne({ tokenId: tokenIdNumber }, update, { upsert: true });

      console.log(`   ✅ NFT upserted: Token ${tokenIdNumber}`);

      // Update property ownership (best-effort)
      await this.updatePropertyOwnership(
        tokenIdNumber,
        mintedTo || (to ? String(to).toLowerCase() : null)
      );

      // Return the current NFT doc (fresh read)
      return await NFT.findOne({ tokenId: tokenIdNumber });
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
        // update nested fields without validating the whole document
        const setObj = {
          "nft.currentOwner": newOwner,
        };
        // ensure owner.walletAddress is updated rather than assigning the owner object
        setObj["owner.walletAddress"] = newOwner;

        await Property.updateOne({ _id: property._id }, { $set: setObj });

        console.log(`   ✅ Property ownership updated: ${property._id}`);
      }
    } catch (error) {
      console.error("   ❌ Error updating property ownership:", error);
    }
  }
}

module.exports = new NFTSyncService();
