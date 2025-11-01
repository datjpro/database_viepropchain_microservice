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
      const { recipient, tokenURI } = req.body;

      if (!recipient || !tokenURI) {
        return res.status(400).json({
          success: false,
          error: "Missing recipient or tokenURI",
        });
      }

      const result = await contractService.mintNFT(recipient, tokenURI);

      res.json({
        success: true,
        message: "NFT minted successfully",
        data: result,
      });
    } catch (error) {
      console.error("❌ Mint error:", error.message);
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
      
      console.log(`📤 Controller: Sending response:`, JSON.stringify(result, null, 2));

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
}

module.exports = new NFTController();
