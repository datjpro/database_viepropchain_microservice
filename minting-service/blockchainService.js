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

    // Upload metadata lên IPFS với fallback nếu thất bại
    let ipfsHash = null;
    let tokenURI = "";

    try {
      console.log("📤 Đang upload metadata lên IPFS...");
      ipfsHash = await uploadToIPFS(nftMetadata);
      tokenURI = `ipfs://${ipfsHash}`;
      console.log(`✅ Đã upload lên IPFS: ${ipfsHash}`);
    } catch (ipfsError) {
      console.warn("⚠️ IPFS upload thất bại, sử dụng fallback URL");
      console.warn("IPFS Error:", ipfsError.message);
      // Fallback: tạo temporary URL hoặc dùng centralized storage
      tokenURI = `https://api.example.com/metadata/${Date.now()}`;
    }

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
    const nftData = {
      tokenId,
      owner: recipient,
      name: metadata.name,
      description: metadata.description,
      image: metadata.image,
      attributes: metadata.attributes,
      tokenURI,
      transactionHash: tx.hash,
    };

    // Chỉ thêm ipfsHash nếu có
    if (ipfsHash) {
      nftData.ipfsHash = ipfsHash;
    }

    const newNFT = new NFT(nftData);
    await newNFT.save();
    console.log(`✅ NFT ${tokenId} đã được lưu vào MongoDB`);

    const response = {
      success: true,
      tokenId,
      transactionHash: tx.hash,
      tokenURI,
    };

    // Thêm ipfsHash vào response nếu có
    if (ipfsHash) {
      response.ipfsHash = ipfsHash;
    }

    return response;
  } catch (error) {
    console.error("Lỗi khi mint NFT:", error.message);
    console.error("Stack:", error.stack);
    return { success: false, error: error.message };
  }
}

module.exports = { mintNFT };
