/**
 * ========================================================================
 * NFT LISTING HELPER - Get NFTs with Property Info
 * ========================================================================
 * Endpoint để xem danh sách NFTs đã mint kèm thông tin property
 * Giúp user biết NFT nào để tạo listing
 * ========================================================================
 */

const express = require("express");
const router = express.Router();
const axios = require("axios");

const BLOCKCHAIN_SERVICE_URL =
  process.env.BLOCKCHAIN_SERVICE_URL || "http://localhost:4004";
const ADMIN_SERVICE_URL =
  process.env.ADMIN_SERVICE_URL || "http://localhost:4003";

/**
 * GET /nft-info/:walletAddress
 * Lấy danh sách NFTs của user kèm thông tin property
 */
router.get("/nft-info/:walletAddress", async (req, res) => {
  try {
    const { walletAddress } = req.params;

    // 1. Get NFTs from Blockchain Service
    const nftResponse = await axios.get(
      `${BLOCKCHAIN_SERVICE_URL}/nfts/${walletAddress}`
    );
    const nfts = nftResponse.data.nfts || [];

    if (nfts.length === 0) {
      return res.json({
        success: true,
        message: "No NFTs found for this wallet",
        data: [],
      });
    }

    // 2. Get property info for each NFT
    const nftDetails = await Promise.all(
      nfts.map(async (nft) => {
        try {
          // Get metadata to find propertyId
          const metadataResponse = await axios.get(
            `${BLOCKCHAIN_SERVICE_URL}/metadata/${nft.tokenId}`
          );
          const metadata = metadataResponse.data;

          // Get property details
          let propertyInfo = null;
          if (metadata.propertyId) {
            try {
              const propertyResponse = await axios.get(
                `${ADMIN_SERVICE_URL}/properties/${metadata.propertyId}`
              );
              propertyInfo =
                propertyResponse.data.data || propertyResponse.data;
            } catch (error) {
              console.log(`Property not found for NFT #${nft.tokenId}`);
            }
          }

          return {
            tokenId: nft.tokenId,
            owner: nft.owner,
            tokenURI: nft.tokenURI,
            metadata: {
              name: metadata.name,
              description: metadata.description,
              image: metadata.image,
              propertyId: metadata.propertyId,
            },
            property: propertyInfo
              ? {
                  id: propertyInfo._id,
                  title: propertyInfo.title,
                  propertyType: propertyInfo.propertyType,
                  address: propertyInfo.address,
                  area: propertyInfo.area,
                  price: propertyInfo.price,
                  currency: propertyInfo.currency,
                  images: propertyInfo.images,
                }
              : null,
            readyToList: !!propertyInfo, // Có property info thì sẵn sàng list
          };
        } catch (error) {
          console.error(
            `Error getting info for NFT #${nft.tokenId}:`,
            error.message
          );
          return {
            tokenId: nft.tokenId,
            owner: nft.owner,
            tokenURI: nft.tokenURI,
            error: "Cannot load NFT details",
            readyToList: false,
          };
        }
      })
    );

    res.json({
      success: true,
      data: nftDetails,
      summary: {
        total: nftDetails.length,
        readyToList: nftDetails.filter((nft) => nft.readyToList).length,
      },
    });
  } catch (error) {
    console.error("❌ Get NFT info error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get NFT information",
      message: error.message,
    });
  }
});

/**
 * GET /nft-info/token/:tokenId
 * Lấy thông tin chi tiết 1 NFT kèm property
 */
router.get("/nft-info/token/:tokenId", async (req, res) => {
  try {
    const { tokenId } = req.params;

    // Get NFT owner
    const nftResponse = await axios.get(
      `${BLOCKCHAIN_SERVICE_URL}/nft/${tokenId}`
    );
    const nftData = nftResponse.data;

    // Get metadata
    const metadataResponse = await axios.get(
      `${BLOCKCHAIN_SERVICE_URL}/metadata/${tokenId}`
    );
    const metadata = metadataResponse.data;

    // Get property
    let propertyInfo = null;
    if (metadata.propertyId) {
      try {
        const propertyResponse = await axios.get(
          `${ADMIN_SERVICE_URL}/properties/${metadata.propertyId}`
        );
        propertyInfo = propertyResponse.data.data || propertyResponse.data;
      } catch (error) {
        console.log(`Property not found for NFT #${tokenId}`);
      }
    }

    res.json({
      success: true,
      data: {
        tokenId: parseInt(tokenId),
        owner: nftData.owner,
        tokenURI: nftData.tokenURI,
        metadata: {
          name: metadata.name,
          description: metadata.description,
          image: metadata.image,
          propertyId: metadata.propertyId,
        },
        property: propertyInfo
          ? {
              id: propertyInfo._id,
              title: propertyInfo.title,
              propertyType: propertyInfo.propertyType,
              address: propertyInfo.address,
              area: propertyInfo.area,
              price: propertyInfo.price,
              currency: propertyInfo.currency,
              images: propertyInfo.images,
              features: propertyInfo.features,
              bedrooms: propertyInfo.bedrooms,
              bathrooms: propertyInfo.bathrooms,
            }
          : null,
        readyToList: !!propertyInfo,
      },
    });
  } catch (error) {
    console.error("❌ Get NFT token info error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get NFT information",
      message: error.message,
    });
  }
});

module.exports = router;
