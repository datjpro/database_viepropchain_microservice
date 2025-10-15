// check-nft.js - Script để kiểm tra NFT đã mint
const { ethers } = require("ethers");
const contractData = require("./minting-service/contract-abi.json");

async function checkNFT() {
  try {
    const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545", {
      name: "ganache",
      chainId: 1337,
      ensAddress: null,
    });

    const contractAddress = "0xA5FAf5e76a6336b0bAb5C2dCC8B88CEA64122AA2";
    const contractABI = contractData.contracts.ViePropChainNFT.abi;
    const nftContract = new ethers.Contract(
      contractAddress,
      contractABI,
      provider
    );

    console.log("🔍 Kiểm tra NFT đã mint...\n");

    // Lấy tổng số NFT đã mint
    const totalMinted = await nftContract.tokenCounter();
    console.log(`📊 Tổng số NFT đã mint: ${totalMinted.toString()}`);

    // Kiểm tra NFT tokenId = 3
    const tokenId = 3;
    console.log(`\n🎫 Thông tin NFT #${tokenId}:`);

    const owner = await nftContract.ownerOf(tokenId);
    console.log(`👤 Owner: ${owner}`);

    const tokenURI = await nftContract.tokenURI(tokenId);
    console.log(`🔗 TokenURI: ${tokenURI}`);

    // Kiểm tra tất cả NFT của owner
    console.log(`\n📦 Danh sách tất cả NFT đã mint:`);
    for (let i = 1; i <= totalMinted; i++) {
      try {
        const owner = await nftContract.ownerOf(i);
        const uri = await nftContract.tokenURI(i);
        console.log(
          `  - Token #${i}: Owner ${owner.slice(0, 10)}... | URI: ${uri.slice(
            0,
            50
          )}...`
        );
      } catch (e) {
        console.log(`  - Token #${i}: Không tồn tại hoặc đã bị burn`);
      }
    }

    console.log("\n✅ Kiểm tra hoàn tất!");
  } catch (error) {
    console.error("❌ Lỗi:", error.message);
  }
}

checkNFT();
