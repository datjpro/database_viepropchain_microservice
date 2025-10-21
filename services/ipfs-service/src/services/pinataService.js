/**
 * ========================================================================
 * PINATA SERVICE - Upload files to IPFS via Pinata
 * ========================================================================
 */

const axios = require("axios");
const FormData = require("form-data");
const {
  PINATA_API_URL,
  PINATA_GATEWAY,
  PINATA_JWT,
} = require("../config/pinata");

class PinataService {
  /**
   * Upload file to IPFS
   */
  async uploadFile(fileBuffer, filename, metadata = {}) {
    try {
      const formData = new FormData();
      formData.append("file", fileBuffer, filename);

      const pinataMetadata = JSON.stringify({
        name: filename,
        keyvalues: metadata,
      });
      formData.append("pinataMetadata", pinataMetadata);

      const response = await axios.post(
        `${PINATA_API_URL}/pinning/pinFileToIPFS`,
        formData,
        {
          maxBodyLength: Infinity,
          headers: {
            "Content-Type": `multipart/form-data; boundary=${formData._boundary}`,
            Authorization: `Bearer ${PINATA_JWT}`,
          },
        }
      );

      const cid = response.data.IpfsHash;
      const url = `${PINATA_GATEWAY}/${cid}`;

      return {
        cid,
        url,
        ipfsUrl: `ipfs://${cid}`,
        pinataId: response.data.PinataId,
        pinSize: response.data.PinSize,
      };
    } catch (error) {
      throw new Error(
        `Failed to upload file: ${error.response?.data?.message || error.message}`
      );
    }
  }

  /**
   * Upload JSON metadata to IPFS
   */
  async uploadJSON(jsonData) {
    try {
      const response = await axios.post(
        `${PINATA_API_URL}/pinning/pinJSONToIPFS`,
        jsonData,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${PINATA_JWT}`,
          },
        }
      );

      const cid = response.data.IpfsHash;
      const url = `${PINATA_GATEWAY}/${cid}`;

      return {
        cid,
        url,
        ipfsUrl: `ipfs://${cid}`,
        pinataId: response.data.PinataId,
      };
    } catch (error) {
      throw new Error(
        `Failed to upload JSON: ${error.response?.data?.message || error.message}`
      );
    }
  }

  /**
   * Get content from IPFS by CID
   */
  async getContent(cid) {
    try {
      const url = `${PINATA_GATEWAY}/${cid}`;
      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get content: ${error.message}`);
    }
  }
}

module.exports = new PinataService();
