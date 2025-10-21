// minting-service/ipfsService.js
const axios = require("axios");

const PINATA_API_KEY = process.env.PINATA_API_KEY;
const PINATA_API_SECRET = process.env.PINATA_API_SECRET;
const PINATA_JWT = process.env.PINATA_JWT;

async function uploadToIPFS(metadata) {
  try {
    console.log("📤 Uploading metadata to IPFS:", metadata);
    const data = JSON.stringify(metadata);
    const config = {
      method: "post",
      url: "https://api.pinata.cloud/pinning/pinJSONToIPFS",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${PINATA_JWT}`,
      },
      data: data,
    };

    const response = await axios(config);
    const ipfsHash = response.data.IpfsHash;
    console.log(`✅ Uploaded metadata to IPFS: ${ipfsHash}`);
    return ipfsHash;
  } catch (error) {
    console.error("❌ Error uploading to IPFS:", error.message);
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", error.response.data);
    }
    throw error;
  }
}

module.exports = { uploadToIPFS };
