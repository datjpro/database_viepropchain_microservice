// minting-service/index.js
require("dotenv").config({ path: "./.env", debug: true });
console.log("MONGO_URI:", process.env.MONGO_URI ? "loaded" : "not loaded");
console.log(
  "SEPOLIA_RPC_URL:",
  process.env.SEPOLIA_RPC_URL ? "loaded" : "not loaded"
);
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const { mintNFT } = require("./blockchainService");

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json()); // Middleware để đọc JSON body

// Kết nối MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// Endpoint chính để thực hiện mint
app.post("/mint", async (req, res) => {
  const { recipient, name, description, image, attributes } = req.body;

  if (!recipient || !name) {
    return res
      .status(400)
      .json({ success: false, error: "Thiếu recipient hoặc name" });
  }

  console.log(`[API] Nhận được yêu cầu mint cho recipient: ${recipient}`);
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
});

app.listen(PORT, () => {
  console.log(`✅ Minting Service API đang chạy tại http://localhost:${PORT}`);
});
