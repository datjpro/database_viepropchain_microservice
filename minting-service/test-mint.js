// test-mint.js
const axios = require("axios");

async function testMint() {
  try {
    const response = await axios.post("http://localhost:3002/mint", {
      recipient: "0xC6890b26A32d9d92aefbc8635C4588247529CdfE", // Account 0
      name: "Test NFT",
      description: "A test NFT for connection check",
      image: "ipfs://QmTestImage",
      attributes: [{ trait_type: "Rarity", value: "Common" }],
    });
    console.log("✅ Mint thành công:", response.data);
  } catch (error) {
    console.error(
      "❌ Lỗi khi mint:",
      error.response ? error.response.data : error.message
    );
    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Data:", error.response.data);
    }
    console.error("Full error:", error);
  }
}

testMint();
