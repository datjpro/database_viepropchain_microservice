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
 * ========================================================================
 * BUILD NFT METADATA FOR IPFS
 * ========================================================================
 *
 * Tạo metadata theo chuẩn ERC-721 để lưu trên IPFS
 *
 * CẤU TRÚC METADATA IPFS (Immutable - Không đổi):
 * ----------------------------------------------------------------
 * 1. name              : Tên BĐS (hiển thị trên OpenSea, Marketplace)
 * 2. description       : Mô tả chi tiết BĐS
 * 3. image             : Link IPFS đến ảnh đại diện (ipfs://QmXXX...)
 * 4. external_url      : Link đến trang chi tiết BĐS trên DApp
 * 5. attributes        : Các thuộc tính CỐ ĐỊNH (loại hình, vị trí, diện tích...)
 * 6. legal_documents   : Mảng link IPFS đến giấy tờ pháp lý (sổ đỏ, giấy phép...)
 *
 * LƯU Ý:
 * - Metadata này LƯU TRÊN IPFS nên KHÔNG THỂ THAY ĐỔI sau khi mint
 * - Chỉ lưu thông tin CỐ ĐỊNH, định danh tài sản (như CMT, sổ đỏ)
 * - KHÔNG lưu thông tin thay đổi (giá bán, trạng thái, owner...)
 *
 * @param {Object} property - Property document từ MongoDB
 * @param {String} dappUrl - Base URL của DApp (VD: https://viepropchain.com)
 * @returns {Object} - NFT metadata theo chuẩn ERC-721
 */
function buildNFTMetadata(property, dappUrl = "https://viepropchain.com") {
  // ============================================================
  // CẤU TRÚC METADATA IPFS (Immutable)
  // ============================================================
  const metadata = {
    // Tên BĐS - Hiển thị trên OpenSea, marketplaces
    name: property.name,

    // Mô tả chi tiết - Hiển thị trên OpenSea
    description: property.description,

    // Link IPFS đến ảnh đại diện (nên là IPFS URL để vĩnh viễn)
    image: property.media?.images?.[0]?.url || "",

    // Link đến trang chi tiết trên DApp của bạn
    external_url: `${dappUrl}/properties/${property._id}`,

    // Các thuộc tính CỐ ĐỊNH (để lọc/filter trên OpenSea, marketplaces)
    attributes: [],

    // Giấy tờ pháp lý (link IPFS) - QUAN TRỌNG cho BĐS
    legal_documents: [],
  };

  // ============================================================
  // ATTRIBUTES - CHỈ LƯU THÔNG TIN CỐ ĐỊNH
  // ============================================================

  // 1. Loại hình BĐS (apartment, land, house, villa)
  metadata.attributes.push({
    trait_type: "Loại hình BĐS",
    value: getPropertyTypeName(property.propertyType),
  });

  // 2. VỊ TRÍ - Thông tin cố định (không đổi)
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

  if (property.location.ward) {
    metadata.attributes.push({
      trait_type: "Phường/Xã",
      value: property.location.ward,
    });
  }

  // 3. CÁC THUỘC TÍNH VẬT LÝ CỐ ĐỊNH (theo loại BĐS)
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

  // ============================================================
  // LEGAL DOCUMENTS - Giấy tờ pháp lý (IPFS links)
  // ============================================================
  // LƯU Ý: Upload giấy tờ lên IPFS trước, sau đó lưu link vào đây
  if (property.media?.documents && property.media.documents.length > 0) {
    property.media.documents.forEach((doc) => {
      // Chỉ thêm các document có URL IPFS (bắt đầu bằng ipfs:// hoặc /ipfs/)
      if (
        doc.url &&
        (doc.url.startsWith("ipfs://") || doc.url.includes("/ipfs/"))
      ) {
        metadata.legal_documents.push({
          name: doc.name,
          url: doc.url,
          type: doc.type || "legal_document",
        });
      }
    });
  }

  // ============================================================
  // ADDITIONAL ATTRIBUTES - Thuộc tính bổ sung
  // ============================================================
  if (details.additionalAttributes && details.additionalAttributes.length > 0) {
    details.additionalAttributes.forEach((attr) => {
      metadata.attributes.push({
        trait_type: attr.trait_type,
        value: attr.value,
      });
    });
  }

  // ============================================================
  // QUAN TRỌNG: KHÔNG LƯU CÁC THÔNG TIN SAU ĐÂY LÊN IPFS
  // ============================================================
  // ❌ KHÔNG lưu: price (giá thay đổi)
  // ❌ KHÔNG lưu: owner (owner thay đổi khi transfer)
  // ❌ KHÔNG lưu: status (trạng thái thay đổi)
  // ❌ KHÔNG lưu: viewCount, favoriteCount (metrics thay đổi)
  //
  // ✅ Các thông tin trên sẽ lưu trong MONGODB (mutable data)

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
