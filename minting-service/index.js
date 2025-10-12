// minting-service/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { mintNFT } = require('./blockchainService');

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json()); // Middleware để đọc JSON body

// Endpoint chính để thực hiện mint
app.post('/mint', async (req, res) => {
  const { recipient, tokenURI } = req.body;

  if (!recipient || !tokenURI) {
    return res.status(400).json({ success: false, error: 'Thiếu recipient hoặc tokenURI' });
  }

  console.log(`[API] Nhận được yêu cầu mint cho recipient: ${recipient}`);
  const result = await mintNFT(recipient, tokenURI);

  if (result.success) {
    res.status(200).json(result);
  } else {
    res.status(500).json(result);
  }
});

app.listen(PORT, () => {
  console.log(`✅ Minting Service API đang chạy tại http://localhost:${PORT}`);
});