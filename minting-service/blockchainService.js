// minting-service/blockchainService.js
const { ethers } = require("ethers");
const mongoose = require("mongoose");
const NFT = require("./nftModel");
const { uploadToIPFS } = require("./ipfsService");
// Đọc ABI từ file JSON đã copy
const contractABI = require("./contract-abi.json").contracts.ViePropChainNFT
  .abi;

// Khởi tạo các đối tượng cần thiết để kết nối và tương tác
try {
  const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL, {
    name: "ganache",
    chainId: 1337,
    ensAddress: null,
  });
  const privateKey = process.env.CONTRACT_OWNER_PRIVATE_KEY;
  console.log("Private key length:", privateKey.length);
  console.log("Private key starts with:", privateKey.substring(0, 4));
  const signer = new ethers.Wallet(privateKey, provider);
  const nftContract = new ethers.Contract(
    process.env.NFT_CONTRACT_ADDRESS,
    contractABI,
    signer
  );
  console.log("Contract initialized successfully");
} catch (error) {
  console.error("Error initializing blockchain:", error.message);
  process.exit(1);
}

async function mintNFT(recipient, metadata) {
  try {
    console.log(`Bắt đầu mint cho ${recipient} với metadata:`, metadata);

    // Tạo metadata JSON
    const nftMetadata = {
      name: metadata.name,
      description: metadata.description || "",
      image: metadata.image || "",
      attributes: metadata.attributes || [],
    };

    // Upload metadata lên IPFS
    // const ipfsHash = await uploadToIPFS(nftMetadata);
    // const tokenURI = `ipfs://${ipfsHash}`;
    const tokenURI = `https://example.com/metadata.json`; // Temporary

    console.log(`TokenURI: ${tokenURI}`);

    // Mint NFT trên blockchain
    const tx = await nftContract.mint(recipient, tokenURI);
    console.log("Đang chờ giao dịch được xác nhận...", tx.hash);

    // Chờ giao dịch được khai thác và lấy biên lai
    const receipt = await tx.wait();
    console.log("Giao dịch đã được xác nhận!");

    // Lấy Token ID từ sự kiện "Transfer" trong biên lai
    const transferEvent = receipt.logs.find((log) => {
      try {
        const parsed = nftContract.interface.parseLog(log);
        return parsed.name === "Transfer";
      } catch {
        return false;
      }
    });
    if (!transferEvent) {
      throw new Error("Không tìm thấy sự kiện Transfer trong giao dịch.");
    }
    const parsedLog = nftContract.interface.parseLog(transferEvent);
    const tokenId = parsedLog.args.tokenId.toString();

    // Lưu thông tin NFT vào MongoDB
    const newNFT = new NFT({
      tokenId,
      owner: recipient,
      name: metadata.name,
      description: metadata.description,
      image: metadata.image,
      attributes: metadata.attributes,
      // ipfsHash,
      tokenURI,
      transactionHash: tx.hash,
    });

    await newNFT.save();
    console.log(`✅ NFT ${tokenId} đã được lưu vào MongoDB`);

    return {
      success: true,
      tokenId,
      transactionHash: tx.hash,
      // ipfsHash,
      tokenURI,
    };
  } catch (error) {
    console.error("Lỗi khi mint NFT:", error.message);
    console.error("Stack:", error.stack);
    return { success: false, error: error.message };
  }
}

module.exports = { mintNFT };
