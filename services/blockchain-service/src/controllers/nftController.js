/**
 * ========================================================================
 * NFT CONTROLLER - Handle NFT-related requests
 * ========================================================================
 */

const contractService = require("../services/contractService");

class NFTController {
  /**
   * Mint NFT
   */
  async mint(req, res) {
    try {
      const { recipient, tokenURI, isCustodial } = req.body;

      if (!recipient || !tokenURI) {
        return res.status(400).json({
          success: false,
          error: "Missing recipient or tokenURI",
        });
      }

      const result = await contractService.mintNFT(recipient, tokenURI, isCustodial || false);

      // Check if it's a duplicate
      if (result.isDuplicate) {
        return res.status(409).json({
          success: false,
          error: "NFT already exists",
          message: result.message,
          data: {
            existingTokenId: result.tokenId,
            tokenURI: result.tokenURI,
            contractAddress: result.contractAddress,
          },
        });
      }

      res.json({
        success: true,
        message: result.message || "NFT minted successfully",
        data: result,
      });
    } catch (error) {
      console.error("❌ Mint error:", error.message);

      // Handle specific error types
      if (error.message.includes("already exists")) {
        return res.status(409).json({
          success: false,
          error: "NFT with this metadata already exists",
          message: error.message,
        });
      }

      res.status(500).json({
        success: false,
        error: "Failed to mint NFT",
        message: error.message,
      });
    }
  }

  /**
   * Get NFT info
   */
  async getNFTInfo(req, res) {
    try {
      const { tokenId } = req.params;

      const result = await contractService.getNFTInfo(tokenId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("❌ Get NFT error:", error.message);
      res.status(500).json({
        success: false,
        error: "Failed to get NFT info",
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

      console.log(`🎯 Controller: getNFTsByOwner called with owner: ${owner}`);

      const result = await contractService.getNFTsByOwner(owner);

      console.log(
        `📤 Controller: Sending response:`,
        JSON.stringify(result, null, 2)
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("❌ Get NFTs error:", error.message);
      res.status(500).json({
        success: false,
        error: "Failed to get NFTs",
        message: error.message,
      });
    }
  }

  /**
   * Transfer NFT
   */
  async transfer(req, res) {
    try {
      const { from, to, tokenId } = req.body;

      if (!from || !to || tokenId === undefined) {
        return res.status(400).json({
          success: false,
          error: "Missing from, to, or tokenId",
        });
      }

      const result = await contractService.transferNFT(from, to, tokenId);

      res.json({
        success: true,
        message: "NFT transferred successfully",
        data: result,
      });
    } catch (error) {
      console.error("❌ Transfer error:", error.message);
      res.status(500).json({
        success: false,
        error: "Failed to transfer NFT",
        message: error.message,
      });
    }
  }

  /**
   * Get token counter
   */
  async getTokenCounter(req, res) {
    try {
      const result = await contractService.getTokenCounter();

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("❌ Get token counter error:", error.message);
      res.status(500).json({
        success: false,
        error: "Failed to get token counter",
        message: error.message,
      });
    }
  }

  /**
   * Get total supply (ERC721Enumerable)
   */
  async getTotalSupply(req, res) {
    try {
      const result = await contractService.getTotalSupply();

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("❌ Get total supply error:", error.message);
      res.status(500).json({
        success: false,
        error: "Failed to get total supply",
        message: error.message,
      });
    }
  }

  /**
   * Get all NFTs (ERC721Enumerable)
   */
  async getAllNFTs(req, res) {
    try {
      const result = await contractService.getAllNFTs();

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("❌ Get all NFTs error:", error.message);
      res.status(500).json({
        success: false,
        error: "Failed to get all NFTs",
        message: error.message,
      });
    }
  }

  /**
   * Get NFT by global index (ERC721Enumerable)
   */
  async getNFTByIndex(req, res) {
    try {
      const { index } = req.params;

      const result = await contractService.getNFTByIndex(index);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("❌ Get NFT by index error:", error.message);
      res.status(500).json({
        success: false,
        error: "Failed to get NFT by index",
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
   * Set user for rental (ERC4907)
   */
  async setUser(req, res) {
    try {
      const { tokenId, user, expires } = req.body;

      if (tokenId === undefined || !user || !expires) {
        return res.status(400).json({
          success: false,
          error: "Missing tokenId, user, or expires",
        });
      }

      const result = await contractService.setUser(tokenId, user, expires);

      // Notify marketplace service to update listing status
      try {
        const axios = require("axios");
        const MARKETPLACE_SERVICE_URL =
          process.env.MARKETPLACE_SERVICE_URL || "http://localhost:4008";

        await axios.post(`${MARKETPLACE_SERVICE_URL}/listings/mark-rented`, {
          tokenId: tokenId,
          renterAddress: user,
          expiresTimestamp: expires,
          transactionHash: result.transactionHash,
        });

        console.log(
          `✅ Marketplace listing updated: Token #${tokenId} marked as rented`
        );
      } catch (marketplaceError) {
        console.error(
          "⚠️ Failed to update marketplace listing:",
          marketplaceError.message
        );
        // Don't fail the main request if marketplace update fails
      }

      res.json({
        success: true,
        message: "User set successfully for rental",
        data: result,
      });
    } catch (error) {
      console.error("❌ Set user error:", error.message);
      res.status(500).json({
        success: false,
        error: "Failed to set user",
        message: error.message,
      });
    }
  }

  /**
   * Get current user of NFT (ERC4907)
   */
  async getUser(req, res) {
    try {
      const { tokenId } = req.params;

      const result = await contractService.getUser(tokenId);

      res.json({
        success: true,
        data: {
          tokenId: Number(tokenId),
          user: result.user,
          expires: result.expires,
          isRented: result.isRented,
          timeLeft: result.timeLeft,
        },
      });
    } catch (error) {
      console.error("❌ Get user error:", error.message);
      res.status(500).json({
        success: false,
        error: "Failed to get user",
        message: error.message,
      });
    }
  }

  /**
   * Get rental expiry time (ERC4907)
   */
  async getUserExpires(req, res) {
    try {
      const { tokenId } = req.params;

      const result = await contractService.getUserExpires(tokenId);

      res.json({
        success: true,
        data: {
          tokenId: Number(tokenId),
          expires: result.expires,
          expiresAt: result.expiresAt,
          isActive: result.isActive,
          timeLeft: result.timeLeft,
        },
      });
    } catch (error) {
      console.error("❌ Get user expires error:", error.message);
      res.status(500).json({
        success: false,
        error: "Failed to get user expires",
        message: error.message,
      });
    }
  }

  /**
   * Check if NFT is currently rented
   */
  async isRented(req, res) {
    try {
      const { tokenId } = req.params;

      const result = await contractService.isRented(tokenId);

      res.json({
        success: true,
        data: {
          tokenId: Number(tokenId),
          isRented: result.isRented,
          currentUser: result.currentUser,
          expires: result.expires,
          timeLeft: result.timeLeft,
        },
      });
    } catch (error) {
      console.error("❌ Check rental status error:", error.message);
      res.status(500).json({
        success: false,
        error: "Failed to check rental status",
        message: error.message,
      });
    }
  }
}

module.exports = new NFTController();
