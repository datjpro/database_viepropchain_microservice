// minting-service/blockchainService.js
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") }); // Load from same directory
const { ethers } = require("ethers");
const mongoose = require("mongoose");
const NFT = require("./nftModel");
const { uploadToIPFS } = require("./ipfsService");
// Đọc ABI từ file JSON đã copy
const contractABI = require("./contract-abi.json").contracts.ViePropChainNFT
  .abi;

// Khởi tạo các đối tượng cần thiết để kết nối và tương tác
let provider, signer, nftContract;

try {
  // Kiểm tra các biến môi trường bắt buộc
  if (!process.env.CONTRACT_OWNER_PRIVATE_KEY) {
    throw new Error("CONTRACT_OWNER_PRIVATE_KEY is not defined in .env file");
  }
  if (!process.env.NFT_CONTRACT_ADDRESS) {
    throw new Error("NFT_CONTRACT_ADDRESS is not defined in .env file");
  }

  provider = new ethers.JsonRpcProvider(
    process.env.RPC_URL || "http://localhost:8545",
    {
      name: "ganache",
      chainId: 1337,
      ensAddress: null,
    }
  );

  // Xử lý private key - loại bỏ dấu ngoặc kép và đảm bảo có 0x prefix
  let privateKey = process.env.CONTRACT_OWNER_PRIVATE_KEY.replace(
    /"/g,
    ""
  ).trim();
  if (!privateKey.startsWith("0x")) {
    privateKey = "0x" + privateKey;
  }

  signer = new ethers.Wallet(privateKey, provider);
  nftContract = new ethers.Contract(
    process.env.NFT_CONTRACT_ADDRESS.replace(/"/g, "").trim(),
    contractABI,
    signer
  );
  console.log("✅ Blockchain service initialized successfully");
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
