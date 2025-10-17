const axios = require("axios");
const FormData = require("form-data");
require("dotenv").config();

/**
 * IPFS Service - Upload files and metadata to IPFS via Pinata
 */

const PINATA_API_KEY = process.env.PINATA_API_KEY;
const PINATA_API_SECRET = process.env.PINATA_API_SECRET;
const PINATA_JWT = process.env.PINATA_JWT;

/**
 * Upload JSON metadata to IPFS
 * @param {Object} metadata - NFT metadata object
 * @returns {Promise<Object>} - IPFS hash and URL
 */
async function uploadMetadataToIPFS(metadata) {
  try {
    // Check if we can reach Pinata
    const url = "https://api.pinata.cloud/pinning/pinJSONToIPFS";

    const response = await axios.post(url, metadata, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${PINATA_JWT}`,
      },
      timeout: 10000, // 10 second timeout
    });

    const ipfsHash = response.data.IpfsHash;
    const tokenURI = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;

    console.log("✅ Metadata uploaded to IPFS:", ipfsHash);

    return {
      ipfsHash,
      tokenURI,
    };
  } catch (error) {
    console.error(
      "❌ Error uploading metadata to IPFS:",
      error.response?.data || error.message
    );

    // Fallback for development/offline mode
    if (
      process.env.NODE_ENV === "development" ||
      error.code === "ENOTFOUND" ||
      error.code === "ETIMEDOUT"
    ) {
      console.warn("⚠️  Using mock IPFS hash for development/offline mode");

      // Generate a deterministic mock hash from metadata
      const mockHash = `Qm${Buffer.from(JSON.stringify(metadata))
        .toString("base64")
        .substring(0, 44)}`;
      const tokenURI = `https://gateway.pinata.cloud/ipfs/${mockHash}`;

      console.log("🔧 Mock IPFS Hash:", mockHash);

      return {
        ipfsHash: mockHash,
        tokenURI,
      };
    }

    throw new Error("Failed to upload metadata to IPFS");
  }
}

/**
 * Upload file to IPFS
 * @param {Buffer} fileBuffer - File buffer
 * @param {String} fileName - File name
 * @returns {Promise<Object>} - IPFS hash and URL
 */
async function uploadFileToIPFS(fileBuffer, fileName) {
  try {
    const url = "https://api.pinata.cloud/pinning/pinFileToIPFS";

    const formData = new FormData();
    formData.append("file", fileBuffer, fileName);

    const response = await axios.post(url, formData, {
      headers: {
        ...formData.getHeaders(),
        Authorization: `Bearer ${PINATA_JWT}`,
      },
      maxBodyLength: Infinity,
      timeout: 15000, // 15 second timeout
    });

    const ipfsHash = response.data.IpfsHash;
    const fileURL = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;

    console.log("✅ File uploaded to IPFS:", ipfsHash);

    return {
      ipfsHash,
      fileURL,
    };
  } catch (error) {
    console.error(
      "❌ Error uploading file to IPFS:",
      error.response?.data || error.message
    );

    // Fallback for development/offline mode
    if (
      process.env.NODE_ENV === "development" ||
      error.code === "ENOTFOUND" ||
      error.code === "ETIMEDOUT"
    ) {
      console.warn(
        "⚠️  Using mock IPFS hash for file in development/offline mode"
      );

      const mockHash = `Qm${Buffer.from(fileName)
        .toString("base64")
        .substring(0, 44)}`;
      const fileURL = `https://gateway.pinata.cloud/ipfs/${mockHash}`;

      console.log("🔧 Mock File IPFS Hash:", mockHash);

      return {
        ipfsHash: mockHash,
        fileURL,
      };
    }

    throw new Error("Failed to upload file to IPFS");
  }
}

/**
 * Build NFT metadata from property data
 * @param {Object} property - Property document
 * @returns {Object} - NFT metadata in ERC-721 standard format
 */
function buildNFTMetadata(property) {
  const metadata = {
    name: property.name,
    description: property.description,
    image: property.media?.images?.[0]?.url || "",
    attributes: [],
  };

  // Add basic attributes
  metadata.attributes.push({
    trait_type: "Loại hình BĐS",
    value: getPropertyTypeName(property.propertyType),
  });

  // Add location attributes
  if (property.location.address) {
    metadata.attributes.push({
      trait_type: "Địa chỉ",
      value: property.location.address,
    });
  }

  if (property.location.city) {
    metadata.attributes.push({
      trait_type: "Thành phố",
      value: property.location.city,
    });
  }

  if (property.location.district) {
    metadata.attributes.push({
      trait_type: "Quận/Huyện",
      value: property.location.district,
    });
  }

  // Add type-specific attributes
  const details = property.details;

  switch (property.propertyType) {
    case "apartment":
      addIfExists(metadata.attributes, "Tên dự án", details.projectName);
      addIfExists(metadata.attributes, "Mã căn hộ", details.apartmentCode);
      addIfExists(metadata.attributes, "Tòa (Block/Tower)", details.block);
      addIfExists(metadata.attributes, "Tầng (Floor)", details.floor);
      addIfExists(
        metadata.attributes,
        "Diện tích tim tường",
        details.grossArea
      );
      addIfExists(metadata.attributes, "Diện tích thông thủy", details.netArea);
      addIfExists(metadata.attributes, "Số phòng ngủ", details.bedrooms);
      addIfExists(metadata.attributes, "Số phòng tắm", details.bathrooms);
      addIfExists(
        metadata.attributes,
        "Hướng ban công",
        details.balconyDirection
      );
      addIfExists(
        metadata.attributes,
        "Tình trạng nội thất",
        details.interiorStatus
      );
      addIfExists(metadata.attributes, "Pháp lý", details.legalStatus);
      break;

    case "land":
      addIfExists(metadata.attributes, "Số thửa", details.landNumber);
      addIfExists(metadata.attributes, "Tờ bản đồ số", details.mapSheetNumber);
      addIfExists(metadata.attributes, "Tọa độ GPS", details.gpsCoordinates);
      addIfExists(
        metadata.attributes,
        "Diện tích",
        `${details.area?.value}${details.area?.unit}`
      );
      addIfExists(
        metadata.attributes,
        "Chiều ngang (Mặt tiền)",
        details.frontWidth
      );
      addIfExists(metadata.attributes, "Chiều dài", details.length);
      addIfExists(metadata.attributes, "Loại đất", details.landType);
      addIfExists(metadata.attributes, "Quy hoạch", details.zoning);
      addIfExists(metadata.attributes, "Mặt tiền đường", details.roadFrontage);
      break;

    case "house":
    case "villa":
      addIfExists(metadata.attributes, "Diện tích đất", details.landArea);
      addIfExists(
        metadata.attributes,
        "Diện tích xây dựng",
        details.constructionArea
      );
      addIfExists(metadata.attributes, "Diện tích sử dụng", details.usableArea);
      addIfExists(metadata.attributes, "Kết cấu", details.structure);
      addIfExists(metadata.attributes, "Số phòng ngủ", details.bedrooms);
      addIfExists(metadata.attributes, "Số phòng tắm", details.bathrooms);
      addIfExists(metadata.attributes, "Hướng nhà", details.houseDirection);
      addIfExists(metadata.attributes, "Mặt tiền đường", details.roadFrontage);
      addIfExists(
        metadata.attributes,
        "Năm xây dựng",
        details.constructionYear
      );
      addIfExists(metadata.attributes, "Pháp lý", details.legalStatus);
      break;
  }

  // Add price
  metadata.attributes.push({
    trait_type: "Giá",
    value: `${property.price.amount.toLocaleString()} ${
      property.price.currency
    }`,
  });

  // Add additional attributes
  if (details.additionalAttributes && details.additionalAttributes.length > 0) {
    details.additionalAttributes.forEach((attr) => {
      metadata.attributes.push({
        trait_type: attr.trait_type,
        value: attr.value,
      });
    });
  }

  return metadata;
}

/**
 * Helper function to add attribute if value exists
 */
function addIfExists(attributes, trait_type, value) {
  if (value !== undefined && value !== null && value !== "") {
    attributes.push({ trait_type, value: String(value) });
  }
}

/**
 * Get property type display name
 */
function getPropertyTypeName(type) {
  const names = {
    apartment: "Căn hộ chung cư",
    land: "Đất nền",
    house: "Nhà phố",
    villa: "Biệt thự",
  };
  return names[type] || type;
}

module.exports = {
  uploadMetadataToIPFS,
  uploadFileToIPFS,
  buildNFTMetadata,
};
