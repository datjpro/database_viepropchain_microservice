const axios = require("axios");
require("dotenv").config();

const MINTING_SERVICE_URL =
  process.env.MINTING_SERVICE_URL || "http://localhost:3002";

/**
 * Minting Client - Communicate with Minting Service
 */

/**
 * Request NFT minting from Minting Service
 * @param {String} recipient - Wallet address of NFT recipient
 * @param {Object} metadata - NFT metadata
 * @returns {Promise<Object>} - Minting result
 */
async function requestMinting(recipient, metadata) {
  try {
    console.log("📤 Sending mint request to Minting Service...");
    console.log("Recipient:", recipient);
    console.log("Metadata:", JSON.stringify(metadata, null, 2));

    const response = await axios.post(
      `${MINTING_SERVICE_URL}/mint`,
      {
        recipient,
        name: metadata.name,
        description: metadata.description,
        image: metadata.image,
        attributes: metadata.attributes,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 60000, // 60 seconds timeout
      }
    );

    if (response.data.success) {
      console.log("✅ NFT minted successfully!");
      console.log("Token ID:", response.data.tokenId);
      console.log("Transaction Hash:", response.data.transactionHash);

      return {
        success: true,
        tokenId: response.data.tokenId,
        contractAddress:
          response.data.contractAddress ||
          "0x52B42Ac0e051A4c3386791b04391510C3cE06632",
        owner: recipient,
        tokenURI: response.data.tokenURI,
        transactionHash: response.data.transactionHash,
        ipfsHash: response.data.ipfsHash,
      };
    } else {
      throw new Error(response.data.error || "Minting failed");
    }
  } catch (error) {
    console.error(
      "❌ Error requesting minting:",
      error.response?.data || error.message
    );

    return {
      success: false,
      error:
        error.response?.data?.error || error.message || "Failed to mint NFT",
    };
  }
}

/**
 * Get NFT information from Minting Service
 * @param {Number} tokenId - Token ID
 * @returns {Promise<Object>} - NFT data
 */
async function getNFTInfo(tokenId) {
  try {
    const response = await axios.get(`${MINTING_SERVICE_URL}/nft/${tokenId}`);

    if (response.data.success) {
      return {
        success: true,
        data: response.data.data,
      };
    } else {
      throw new Error(response.data.error || "Failed to get NFT info");
    }
  } catch (error) {
    console.error(
      "❌ Error getting NFT info:",
      error.response?.data || error.message
    );

    return {
      success: false,
      error: error.response?.data?.error || error.message,
    };
  }
}

/**
 * Get all NFTs owned by an address
 * @param {String} ownerAddress - Wallet address
 * @returns {Promise<Object>} - List of NFTs
 */
async function getNFTsByOwner(ownerAddress) {
  try {
    const response = await axios.get(
      `${MINTING_SERVICE_URL}/nfts/${ownerAddress}`
    );

    if (response.data.success) {
      return {
        success: true,
        data: response.data.data,
      };
    } else {
      throw new Error(response.data.error || "Failed to get NFTs");
    }
  } catch (error) {
    console.error(
      "❌ Error getting NFTs by owner:",
      error.response?.data || error.message
    );

    return {
      success: false,
      error: error.response?.data?.error || error.message,
    };
  }
}

/**
 * Check Minting Service health
 * @returns {Promise<Boolean>} - Service health status
 */
async function checkMintingServiceHealth() {
  try {
    const response = await axios.get(`${MINTING_SERVICE_URL}/nfts`, {
      timeout: 5000,
    });

    return response.status === 200;
  } catch (error) {
    console.error("❌ Minting Service is not available:", error.message);
    return false;
  }
}

module.exports = {
  requestMinting,
  getNFTInfo,
  getNFTsByOwner,
  checkMintingServiceHealth,
};
