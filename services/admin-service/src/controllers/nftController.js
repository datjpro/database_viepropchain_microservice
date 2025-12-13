/**
 * ========================================================================
 * NFT CONTROLLER - Handle NFT queries and marketplace operations
 * ========================================================================
 */

const NFT = require("../models/NFT");
const Property = require("../models/Property");

class NFTController {
  /**
   * Get NFT by token ID
   */
  async getNFT(req, res) {
    try {
      const { tokenId } = req.params;

      const nft = await NFT.findOne({ tokenId }).populate("propertyId");

      if (!nft) {
        return res.status(404).json({
          success: false,
          error: "NFT not found",
        });
      }

      res.json({
        success: true,
        data: nft,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Failed to get NFT",
        message: error.message,
      });
    }
  }

  /**
   * Get NFTs by owner
   */
  async getNFTsByOwner(req, res) {
    try {
      const { owner } = req.params;

      const nfts = await NFT.find({
        currentOwner: owner.toLowerCase(),
      }).populate("propertyId");

      res.json({
        success: true,
        data: nfts,
        count: nfts.length,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Failed to get NFTs",
        message: error.message,
      });
    }
  }

  /**
   * Get all listed NFTs (marketplace)
   */
  async getListedNFTs(req, res) {
    try {
      const { minPrice, maxPrice, sort = "-listing.listedAt" } = req.query;

      const filter = { "listing.isListed": true };

      if (minPrice) {
        filter["listing.price"] = { $gte: parseFloat(minPrice) };
      }
      if (maxPrice) {
        filter["listing.price"] = {
          ...filter["listing.price"],
          $lte: parseFloat(maxPrice),
        };
      }

      const nfts = await NFT.find(filter).populate("propertyId").sort(sort);

      res.json({
        success: true,
        data: nfts,
        count: nfts.length,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Failed to get listed NFTs",
        message: error.message,
      });
    }
  }

  /**
   * List NFT for sale
   */
  async listNFT(req, res) {
    try {
      const { tokenId } = req.params;
      const { price, seller, listingId } = req.body;

      if (!price || !seller) {
        return res.status(400).json({
          success: false,
          error: "Missing required fields: price, seller",
        });
      }

      const nft = await NFT.findOne({ tokenId });

      if (!nft) {
        return res.status(404).json({
          success: false,
          error: "NFT not found",
        });
      }

      if (nft.currentOwner.toLowerCase() !== seller.toLowerCase()) {
        return res.status(403).json({
          success: false,
          error: "Only NFT owner can list for sale",
        });
      }

      await nft.listForSale(price, seller, listingId);

      res.json({
        success: true,
        message: "NFT listed for sale",
        data: nft,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Failed to list NFT",
        message: error.message,
      });
    }
  }

  /**
   * Unlist NFT (cancel listing)
   */
  async unlistNFT(req, res) {
    try {
      const { tokenId } = req.params;

      const nft = await NFT.findOne({ tokenId });

      if (!nft) {
        return res.status(404).json({
          success: false,
          error: "NFT not found",
        });
      }

      await nft.unlist();

      res.json({
        success: true,
        message: "NFT unlisted",
        data: nft,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Failed to unlist NFT",
        message: error.message,
      });
    }
  }

  /**
   * Record NFT sale
   */
  async recordSale(req, res) {
    try {
      const { tokenId } = req.params;
      const { from, to, price, transactionHash, blockNumber } = req.body;

      if (!from || !to || !price || !transactionHash) {
        return res.status(400).json({
          success: false,
          error: "Missing required fields",
        });
      }

      const nft = await NFT.findOne({ tokenId });

      if (!nft) {
        return res.status(404).json({
          success: false,
          error: "NFT not found",
        });
      }

      await nft.recordSale(from, to, price, transactionHash, blockNumber);

      res.json({
        success: true,
        message: "Sale recorded",
        data: nft,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Failed to record sale",
        message: error.message,
      });
    }
  }

  /**
   * Record NFT transfer
   */
  async recordTransfer(req, res) {
    try {
      const { tokenId } = req.params;
      const { from, to, transactionHash, blockNumber, type } = req.body;

      if (!from || !to || !transactionHash) {
        return res.status(400).json({
          success: false,
          error: "Missing required fields",
        });
      }

      const nft = await NFT.findOne({ tokenId });

      if (!nft) {
        return res.status(404).json({
          success: false,
          error: "NFT not found",
        });
      }

      await nft.recordTransfer(from, to, transactionHash, blockNumber, type);

      res.json({
        success: true,
        message: "Transfer recorded",
        data: nft,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Failed to record transfer",
        message: error.message,
      });
    }
  }

  /**
   * Update NFT listing price (owner only)
   */
  async updatePrice(req, res) {
    try {
      const { tokenId } = req.params;
      const { price, owner } = req.body;

      if (!price || !owner) {
        return res.status(400).json({
          success: false,
          error: "Missing required fields: price, owner",
        });
      }

      const nft = await NFT.findOne({ tokenId });

      if (!nft) {
        return res.status(404).json({
          success: false,
          error: "NFT not found",
        });
      }

      // Verify ownership
      if (nft.currentOwner.toLowerCase() !== owner.toLowerCase()) {
        return res.status(403).json({
          success: false,
          error: "Only NFT owner can update price",
        });
      }

      // Update listing price
      if (nft.listing.isListed) {
        nft.listing.price = price;
        nft.listing.priceETH = parseFloat((price / 1e18).toFixed(4));
        await nft.save();

        res.json({
          success: true,
          message: "Price updated successfully",
          data: {
            tokenId: nft.tokenId,
            price: nft.listing.price,
            priceETH: nft.listing.priceETH,
          },
        });
      } else {
        return res.status(400).json({
          success: false,
          error: "NFT is not listed. List it first before updating price.",
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Failed to update price",
        message: error.message,
      });
    }
  }

  /**
   * Update NFT status (owner only)
   */
  async updateStatus(req, res) {
    try {
      const { tokenId } = req.params;
      const { status, owner } = req.body;

      if (!status || !owner) {
        return res.status(400).json({
          success: false,
          error: "Missing required fields: status, owner",
        });
      }

      const validStatuses = [
        "minted",
        "listed",
        "sold",
        "transferred",
        "burned",
      ];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
        });
      }

      const nft = await NFT.findOne({ tokenId });

      if (!nft) {
        return res.status(404).json({
          success: false,
          error: "NFT not found",
        });
      }

      // Verify ownership
      if (nft.currentOwner.toLowerCase() !== owner.toLowerCase()) {
        return res.status(403).json({
          success: false,
          error: "Only NFT owner can update status",
        });
      }

      nft.status = status;
      await nft.save();

      res.json({
        success: true,
        message: "Status updated successfully",
        data: {
          tokenId: nft.tokenId,
          status: nft.status,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Failed to update status",
        message: error.message,
      });
    }
  }

  /**
   * Update NFT metadata URI (owner only)
   */
  async updateMetadata(req, res) {
    try {
      const { tokenId } = req.params;
      const { metadataUri, owner } = req.body;

      if (!metadataUri || !owner) {
        return res.status(400).json({
          success: false,
          error: "Missing required fields: metadataUri, owner",
        });
      }

      const nft = await NFT.findOne({ tokenId });

      if (!nft) {
        return res.status(404).json({
          success: false,
          error: "NFT not found",
        });
      }

      // Verify ownership
      if (nft.currentOwner.toLowerCase() !== owner.toLowerCase()) {
        return res.status(403).json({
          success: false,
          error: "Only NFT owner can update metadata",
        });
      }

      nft.metadataUri = metadataUri;

      // Extract CID if it's ipfs:// URI
      if (metadataUri.startsWith("ipfs://")) {
        nft.metadataCID = metadataUri.replace("ipfs://", "");
      }

      await nft.save();

      res.json({
        success: true,
        message: "Metadata updated successfully",
        data: {
          tokenId: nft.tokenId,
          metadataUri: nft.metadataUri,
          metadataCID: nft.metadataCID,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Failed to update metadata",
        message: error.message,
      });
    }
  }

  /**
   * Get NFT statistics
   */
  async getStatistics(req, res) {
    try {
      const totalNFTs = await NFT.countDocuments();
      const listedNFTs = await NFT.countDocuments({ "listing.isListed": true });
      const soldNFTs = await NFT.countDocuments({ totalSales: { $gt: 0 } });

      const totalVolume = await NFT.aggregate([
        { $unwind: "$saleHistory" },
        { $group: { _id: null, total: { $sum: "$saleHistory.priceETH" } } },
      ]);

      res.json({
        success: true,
        data: {
          totalNFTs,
          listedNFTs,
          soldNFTs,
          totalVolumeETH: totalVolume[0]?.total || 0,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Failed to get statistics",
        message: error.message,
      });
    }
  }

  /**
   * ========================================================================
   * ERC4907 RENTAL FUNCTIONS
   * ========================================================================
   */

  /**
   * Set rental user for NFT (ERC4907)
   */
  async setRentalUser(req, res) {
    try {
      const { tokenId } = req.params;
      const { user, expires, rentedBy, transactionHash } = req.body;

      if (!user || !expires) {
        return res.status(400).json({
          success: false,
          error: "Missing required fields: user, expires",
        });
      }

      const nft = await NFT.findOne({ tokenId });

      if (!nft) {
        return res.status(404).json({
          success: false,
          error: "NFT not found",
        });
      }

      // Update rental information
      nft.rental = {
        currentUser: user.toLowerCase(),
        expires: new Date(expires * 1000), // Convert timestamp to Date
        rentedAt: new Date(),
        rentedBy: rentedBy ? rentedBy.toLowerCase() : null,
        transactionHash,
        isActive: true,
      };

      nft.status = "rented";
      await nft.save();

      res.json({
        success: true,
        message: "Rental user set successfully",
        data: {
          tokenId: nft.tokenId,
          rental: nft.rental,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Failed to set rental user",
        message: error.message,
      });
    }
  }

  /**
   * Get current rental user of NFT
   */
  async getRentalUser(req, res) {
    try {
      const { tokenId } = req.params;

      const nft = await NFT.findOne({ tokenId });

      if (!nft) {
        return res.status(404).json({
          success: false,
          error: "NFT not found",
        });
      }

      const isRentalActive = nft.rental?.expires && new Date() < nft.rental.expires;

      res.json({
        success: true,
        data: {
          tokenId: nft.tokenId,
          currentUser: isRentalActive ? nft.rental.currentUser : null,
          expires: nft.rental?.expires || null,
          isActive: isRentalActive,
          rental: nft.rental || null,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Failed to get rental user",
        message: error.message,
      });
    }
  }

  /**
   * Clear expired rental user
   */
  async clearExpiredRental(req, res) {
    try {
      const { tokenId } = req.params;

      const nft = await NFT.findOne({ tokenId });

      if (!nft) {
        return res.status(404).json({
          success: false,
          error: "NFT not found",
        });
      }

      if (!nft.rental || !nft.rental.expires) {
        return res.status(400).json({
          success: false,
          error: "No active rental found",
        });
      }

      const now = new Date();
      if (now < nft.rental.expires) {
        return res.status(400).json({
          success: false,
          error: "Rental is still active",
          message: `Rental expires at ${nft.rental.expires}`,
        });
      }

      // Clear expired rental
      nft.rental.isActive = false;
      nft.status = nft.listing?.isListed ? "listed" : "minted";
      await nft.save();

      res.json({
        success: true,
        message: "Expired rental cleared",
        data: {
          tokenId: nft.tokenId,
          status: nft.status,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Failed to clear expired rental",
        message: error.message,
      });
    }
  }

  /**
   * Get all rented NFTs
   */
  async getRentedNFTs(req, res) {
    try {
      const { renter } = req.query;

      const filter = {
        "rental.isActive": true,
        "rental.expires": { $gte: new Date() },
      };

      if (renter) {
        filter["rental.currentUser"] = renter.toLowerCase();
      }

      const nfts = await NFT.find(filter).populate("propertyId");

      res.json({
        success: true,
        data: nfts,
        count: nfts.length,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Failed to get rented NFTs",
        message: error.message,
      });
    }
  }

  /**
   * Get NFTs available for rent
   */
  async getAvailableForRent(req, res) {
    try {
      const filter = {
        $or: [
          { "rental.isActive": { $ne: true } },
          { "rental.expires": { $lt: new Date() } },
          { rental: { $exists: false } },
        ],
        status: { $in: ["minted", "listed"] },
      };

      const nfts = await NFT.find(filter).populate("propertyId");

      res.json({
        success: true,
        data: nfts,
        count: nfts.length,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Failed to get available NFTs",
        message: error.message,
      });
    }
  }
}

module.exports = new NFTController();
