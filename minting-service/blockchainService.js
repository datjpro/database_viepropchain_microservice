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

async function mintNFT(recipient, metadataOrTokenURI) {
  try {
    console.log(`Bắt đầu mint cho ${recipient}`);

    let tokenURI = "";
    let ipfsHash = null;
    let nftMetadata = {};

    // Check if metadataOrTokenURI is a string (tokenURI) or object (metadata)
    if (typeof metadataOrTokenURI === "string") {
      // NEW FLOW: Property Service already uploaded to IPFS and sends tokenURI
      console.log(
        "✅ Received tokenURI from Property Service:",
        metadataOrTokenURI
      );
      tokenURI = metadataOrTokenURI;

      // Extract IPFS hash from tokenURI if it's an IPFS URL
      if (tokenURI.includes("ipfs://")) {
        ipfsHash = tokenURI.replace("ipfs://", "");
      } else if (tokenURI.includes("/ipfs/")) {
        ipfsHash = tokenURI.split("/ipfs/")[1];
      }

      // We don't have metadata details in this flow, use minimal data
      nftMetadata = {
        name: "Property NFT",
        description: "NFT created via Property Service",
        image: "",
        attributes: [],
      };
    } else {
      // OLD FLOW: Backward compatibility - receive metadata object
      console.log(`Mint với metadata object (old flow):`, metadataOrTokenURI);

      // Tạo metadata JSON
      nftMetadata = {
        name: metadataOrTokenURI.name,
        description: metadataOrTokenURI.description || "",
        image: metadataOrTokenURI.image || "",
        attributes: metadataOrTokenURI.attributes || [],
      };

      // Upload metadata lên IPFS với fallback nếu thất bại
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
    }

    console.log(`TokenURI: ${tokenURI}`);

    // Mint NFT trên blockchain
    const tx = await nftContract.mint(recipient, tokenURI);
    console.log("Đang chờ giao dịch được xác nhận...", tx.hash);

    // Chờ giao dịch được khai thác và lấy biên lai
    const receipt = await tx.wait();
    console.log("Giao dịch đã được xác nhận!");

    // Lấy Token ID từ sự kiện "Transfer" trong biên lai
    console.log(`📋 Số lượng logs: ${receipt.logs.length}`);

    let tokenId = null;

    // Thử parse từng log để tìm Transfer event
    for (const log of receipt.logs) {
      try {
        const parsed = nftContract.interface.parseLog({
          topics: log.topics,
          data: log.data,
        });

        console.log(`🔍 Event tìm thấy: ${parsed.name}`);

        if (parsed.name === "Transfer") {
          tokenId = parsed.args.tokenId.toString();
          console.log(`✅ Tìm thấy Transfer event, tokenId: ${tokenId}`);
          break;
        }
      } catch (error) {
        // Log không phải từ contract này, skip
        continue;
      }
    }

    if (!tokenId) {
      // Fallback 1: Thử lấy từ tokenCounter
      try {
        console.log("⚠️ Không tìm thấy Transfer event, thử tokenCounter...");
        const counter = await nftContract.tokenCounter();
        tokenId = counter.toString();
        console.log(`📊 TokenId từ counter: ${tokenId}`);
      } catch (counterError) {
        console.log("❌ tokenCounter() không hoạt động:", counterError.message);

        // Fallback 2: Parse raw logs trực tiếp
        console.log("🔄 Thử parse raw logs...");
        for (const log of receipt.logs) {
          // Transfer event signature: Transfer(address,address,uint256)
          const transferTopic =
            "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
          if (log.topics[0] === transferTopic && log.topics.length >= 4) {
            // tokenId là topic thứ 4 (index 3)
            tokenId = parseInt(log.topics[3], 16).toString();
            console.log(`✅ Lấy tokenId từ raw log: ${tokenId}`);
            break;
          }
        }

        // Fallback 3: Dùng timestamp nếu không có cách nào khác
        if (!tokenId) {
          tokenId = `temp_${Date.now()}`;
          console.log(`⚠️ Dùng temporary tokenId: ${tokenId}`);
        }
      }
    }

    // Lưu thông tin NFT vào MongoDB theo cấu trúc 3 lớp
    const nftData = {
      // 1. BLOCKCHAIN DATA
      tokenId,
      contractAddress: process.env.NFT_CONTRACT_ADDRESS.replace(
        /"/g,
        ""
      ).trim(),
      owner: recipient.toLowerCase(),
      tokenURI,
      transactionHash: tx.hash,

      // 2. IPFS METADATA
      metadata: {
        name: nftMetadata.name || "Property NFT",
        description: nftMetadata.description || "",
        image: nftMetadata.image || "",
        attributes: nftMetadata.attributes || [],
      },
      ipfsHash: ipfsHash || null,

      // 3. APPLICATION DATA (mặc định)
      status: "NOT_FOR_SALE",
      listingPrice: {
        amount: 0,
        currency: "VND",
      },
      viewCount: 0,
      favoriteCount: 0,
      transactionHistory: [
        {
          type: "MINT",
          from: ethers.ZeroAddress,
          to: recipient.toLowerCase(),
          transactionHash: tx.hash,
          timestamp: new Date(),
        },
      ],
      isBurned: false,
    };

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
