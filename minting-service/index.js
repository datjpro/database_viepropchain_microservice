// minting-service/index.js
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const { mintNFT } = require("./blockchainService");
const { startEventListener, stopEventListener } = require("./eventListener");

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json()); // Middleware để đọc JSON body

// Kết nối MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ Connected to MongoDB");
    // Khởi động event listener sau khi kết nối MongoDB thành công
    startEventListener();
  })
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// Endpoint chính để thực hiện mint
app.post("/mint", async (req, res) => {
  const { recipient, tokenURI, name, description, image, attributes } =
    req.body;

  // Support both old format (name, description, image, attributes) and new format (tokenURI)
  if (!recipient) {
    return res.status(400).json({ success: false, error: "Thiếu recipient" });
  }

  if (!tokenURI && !name) {
    return res
      .status(400)
      .json({ success: false, error: "Thiếu tokenURI hoặc name" });
  }

  console.log(`[API] Nhận được yêu cầu mint cho recipient: ${recipient}`);

  // If tokenURI is provided, use it directly (new flow)
  if (tokenURI) {
    console.log(`[API] Using tokenURI: ${tokenURI}`);
    const result = await mintNFT(recipient, tokenURI);

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(500).json(result);
    }
  }
  // Otherwise, use old format (backward compatibility)
  else {
    console.log(`[API] Using metadata object (old format)`);
    const result = await mintNFT(recipient, {
      name,
      description,
      image,
      attributes,
    });

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(500).json(result);
    }
  }
});

// Endpoint để lấy thông tin NFT theo tokenId
app.get("/nft/:tokenId", async (req, res) => {
  try {
    const { tokenId } = req.params;
    const NFT = require("./nftModel");

    const nft = await NFT.findOne({ tokenId: parseInt(tokenId) });

    if (!nft) {
      return res.status(404).json({
        success: false,
        error: `Không tìm thấy NFT với tokenId ${tokenId}`,
      });
    }

    res.status(200).json({ success: true, data: nft });
  } catch (error) {
    console.error("❌ Error fetching NFT:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Endpoint để lấy tất cả NFT của một owner
app.get("/nfts/:owner", async (req, res) => {
  try {
    const { owner } = req.params;
    const NFT = require("./nftModel");

    const nfts = await NFT.find({ owner: owner.toLowerCase() });

    res.status(200).json({
      success: true,
      count: nfts.length,
      data: nfts,
    });
  } catch (error) {
    console.error("❌ Error fetching NFTs:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Endpoint để lấy tất cả NFT
app.get("/nfts", async (req, res) => {
  try {
    const NFT = require("./nftModel");
    const nfts = await NFT.find({}).sort({ tokenId: 1 });

    res.status(200).json({
      success: true,
      count: nfts.length,
      data: nfts,
    });
  } catch (error) {
    console.error("❌ Error fetching all NFTs:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Minting Service API đang chạy tại http://localhost:${PORT}`);
});

// Xử lý graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n🛑 Đang dừng service...");
  stopEventListener();
  await mongoose.connection.close();
  console.log("✅ Đã đóng kết nối MongoDB");
  process.exit(0);
});
