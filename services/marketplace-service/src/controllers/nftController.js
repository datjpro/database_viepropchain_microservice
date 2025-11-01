/**
 * ========================================================================
 * NFT CONTROLLER - Marketplace Service
 * ========================================================================
 * Xử lý các request liên quan đến NFT thông qua ERC721Enumerable
 * ========================================================================
 */

const axios = require("axios");

const BLOCKCHAIN_SERVICE_URL =
  process.env.BLOCKCHAIN_SERVICE_URL || "http://localhost:4004";
const ADMIN_SERVICE_URL =
  process.env.ADMIN_SERVICE_URL || "http://localhost:4003";

class NFTController {
  /**
   * GET /my-nfts/:walletAddress
   * Lấy tất cả NFTs của user từ wallet thông qua ERC721Enumerable
   */
  async getMyNFTs(req, res) {
    try {
      const { walletAddress } = req.params;

      console.log(`🔍 Getting NFTs for wallet: ${walletAddress}`);

      // Gọi blockchain service để lấy NFTs của user
      const nftResponse = await axios.get(
        `${BLOCKCHAIN_SERVICE_URL}/nfts/${walletAddress}`
      );

      const data = nftResponse.data;
      if (!data.success) {
        return res.status(500).json({
          success: false,
          error: "Failed to get NFTs from blockchain",
          message: data.message,
        });
      }

      const { owner, balance, nfts = [] } = data.data; // Default empty array

      // Debug log
      console.log(`   📊 Response from blockchain service:`, {
        owner,
        balance,
        nftsCount: nfts.length,
        nftsArray: nfts
      });

      if (balance === 0 || !nfts || nfts.length === 0) {
        return res.json({
          success: true,
          message: "No NFTs found for this wallet",
          data: {
            owner,
            balance: 0,
            nfts: [],
            summary: {
              total: 0,
              readyToList: 0,
              withMetadata: 0,
              withProperty: 0,
            },
          },
        });
      }

      // Lấy thông tin chi tiết cho từng NFT (metadata + property)
      const nftDetails = await Promise.all(
        nfts.map(async (nft) => {
          try {
            // Get metadata từ tokenURI
            let metadata = null;
            if (nft.tokenURI) {
              try {
                if (nft.tokenURI.startsWith("http")) {
                  const metadataResponse = await axios.get(nft.tokenURI);
                  metadata = metadataResponse.data;
                } else {
                  // Nếu là IPFS hoặc format khác, parse JSON
                  metadata = JSON.parse(nft.tokenURI);
                }
              } catch (error) {
                console.warn(
                  `Failed to parse metadata for NFT #${nft.tokenId}:`,
                  error.message
                );
              }
            }

            // Get property info nếu có propertyId trong metadata
            let propertyInfo = null;
            if (metadata && metadata.propertyId) {
              try {
                const propertyResponse = await axios.get(
                  `${ADMIN_SERVICE_URL}/api/properties/${metadata.propertyId}`
                );
                propertyInfo =
                  propertyResponse.data.data || propertyResponse.data;
              } catch (error) {
                console.warn(
                  `Property not found for NFT #${nft.tokenId}:`,
                  error.message
                );
              }
            }

            return {
              tokenId: nft.tokenId,
              owner: nft.owner,
              tokenURI: nft.tokenURI,
              index: nft.index,
              metadata: metadata
                ? {
                    name: metadata.name || `NFT #${nft.tokenId}`,
                    description: metadata.description || "",
                    image: metadata.image || "",
                    propertyId: metadata.propertyId || null,
                    attributes: metadata.attributes || [],
                  }
                : null,
              property: propertyInfo
                ? {
                    id: propertyInfo._id,
                    title: propertyInfo.title,
                    propertyType: propertyInfo.propertyType,
                    address: propertyInfo.address,
                    area: propertyInfo.area,
                    price: propertyInfo.price,
                    currency: propertyInfo.currency,
                    images: propertyInfo.images || [],
                    features: propertyInfo.features || {},
                    bedrooms: propertyInfo.bedrooms,
                    bathrooms: propertyInfo.bathrooms,
                  }
                : null,
              readyToList: !!propertyInfo, // Có thể list nếu có property info
              hasMetadata: !!metadata,
            };
          } catch (error) {
            console.error(
              `Error processing NFT #${nft.tokenId}:`,
              error.message
            );
            return {
              tokenId: nft.tokenId,
              owner: nft.owner,
              tokenURI: nft.tokenURI,
              index: nft.index,
              error: "Failed to load NFT details",
              readyToList: false,
              hasMetadata: false,
            };
          }
        })
      );

      const summary = {
        total: nftDetails.length,
        readyToList: nftDetails.filter((nft) => nft.readyToList).length,
        withMetadata: nftDetails.filter((nft) => nft.hasMetadata).length,
        withProperty: nftDetails.filter((nft) => nft.property).length,
      };

      res.json({
        success: true,
        data: {
          owner,
          balance,
          nfts: nftDetails,
          summary,
        },
      });
    } catch (error) {
      console.error("❌ Get my NFTs error:", error.message);
      res.status(500).json({
        success: false,
        error: "Failed to get NFTs",
        message: error.message,
      });
    }
  }

  /**
   * GET /nft-detail/:tokenId
   * Lấy thông tin chi tiết 1 NFT
   */
  async getNFTDetail(req, res) {
    try {
      const { tokenId } = req.params;

      console.log(`🔍 Getting detail for NFT #${tokenId}`);

      // Get NFT info từ blockchain
      const nftResponse = await axios.get(
        `${BLOCKCHAIN_SERVICE_URL}/nft/${tokenId}`
      );

      const nftData = nftResponse.data.data;

      // Parse metadata
      let metadata = null;
      if (nftData.tokenURI) {
        try {
          if (nftData.tokenURI.startsWith("http")) {
            const metadataResponse = await axios.get(nftData.tokenURI);
            metadata = metadataResponse.data;
          } else {
            metadata = JSON.parse(nftData.tokenURI);
          }
        } catch (error) {
          console.warn(
            `Failed to parse metadata for NFT #${tokenId}:`,
            error.message
          );
        }
      }

      // Get property info
      let propertyInfo = null;
      if (metadata && metadata.propertyId) {
        try {
          const propertyResponse = await axios.get(
            `${ADMIN_SERVICE_URL}/api/properties/${metadata.propertyId}`
          );
          propertyInfo = propertyResponse.data.data || propertyResponse.data;
        } catch (error) {
          console.warn(
            `Property not found for NFT #${tokenId}:`,
            error.message
          );
        }
      }

      const result = {
        tokenId: nftData.tokenId,
        owner: nftData.owner,
        tokenURI: nftData.tokenURI,
        metadata: metadata
          ? {
              name: metadata.name || `NFT #${tokenId}`,
              description: metadata.description || "",
              image: metadata.image || "",
              propertyId: metadata.propertyId || null,
              attributes: metadata.attributes || [],
            }
          : null,
        property: propertyInfo
          ? {
              id: propertyInfo._id,
              title: propertyInfo.title,
              propertyType: propertyInfo.propertyType,
              address: propertyInfo.address,
              area: propertyInfo.area,
              price: propertyInfo.price,
              currency: propertyInfo.currency,
              images: propertyInfo.images || [],
              features: propertyInfo.features || {},
              bedrooms: propertyInfo.bedrooms,
              bathrooms: propertyInfo.bathrooms,
            }
          : null,
        readyToList: !!propertyInfo,
        hasMetadata: !!metadata,
      };

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("❌ Get NFT detail error:", error.message);
      res.status(500).json({
        success: false,
        error: "Failed to get NFT detail",
        message: error.message,
      });
    }
  }

  /**
   * GET /all-nfts
   * Lấy tất cả NFTs đã mint (ERC721Enumerable)
   */
  async getAllNFTs(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;

      console.log(`🔍 Getting all NFTs (page ${page}, limit ${limit})`);

      // Get all NFTs từ blockchain
      const response = await axios.get(`${BLOCKCHAIN_SERVICE_URL}/all-nfts`);
      const { totalSupply, nfts } = response.data.data;

      // Pagination
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const startIndex = (pageNum - 1) * limitNum;
      const endIndex = startIndex + limitNum;
      const paginatedNFTs = nfts.slice(startIndex, endIndex);

      // Get metadata cho từng NFT
      const nftsWithMetadata = await Promise.all(
        paginatedNFTs.map(async (nft) => {
          let metadata = null;
          if (nft.tokenURI) {
            try {
              if (nft.tokenURI.startsWith("http")) {
                const metadataResponse = await axios.get(nft.tokenURI);
                metadata = metadataResponse.data;
              } else {
                metadata = JSON.parse(nft.tokenURI);
              }
            } catch (error) {
              console.warn(`Failed to parse metadata for NFT #${nft.tokenId}`);
            }
          }

          return {
            ...nft,
            metadata: metadata
              ? {
                  name: metadata.name || `NFT #${nft.tokenId}`,
                  description: metadata.description || "",
                  image: metadata.image || "",
                  propertyId: metadata.propertyId || null,
                }
              : null,
          };
        })
      );

      const totalPages = Math.ceil(totalSupply / limitNum);

      res.json({
        success: true,
        data: {
          nfts: nftsWithMetadata,
          pagination: {
            currentPage: pageNum,
            totalPages,
            totalItems: totalSupply,
            itemsPerPage: limitNum,
            hasNext: pageNum < totalPages,
            hasPrev: pageNum > 1,
          },
        },
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
}

module.exports = new NFTController();
