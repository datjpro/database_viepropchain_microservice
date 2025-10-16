// Script cập nhật owner của NFT trong database
const axios = require('axios');
const { ethers } = require("ethers");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

async function syncNFTOwner(tokenId) {
  try {
    console.log('\n🔄 ĐỒNG BỘ OWNER CỦA NFT TỪ BLOCKCHAIN VỀ DATABASE\n');
    console.log('='.repeat(60));

    // Kết nối với Ganache để lấy owner thực tế
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    const contractABI = require("./contract-abi.json");
    const abi = contractABI.contracts.ViePropChainNFT.abi;
    
    const contract = new ethers.Contract(
      process.env.NFT_CONTRACT_ADDRESS,
      abi,
      provider
    );

    console.log(`📋 Đang kiểm tra NFT #${tokenId}...`);
    
    // Lấy owner từ blockchain
    const blockchainOwner = await contract.ownerOf(tokenId);
    console.log(`✅ Owner trên Blockchain: ${blockchainOwner}`);
    
    // Cập nhật trong database
    const mongoose = require("mongoose");
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Đã kết nối MongoDB');
    
    const NFT = require("./nftModel");
    const nft = await NFT.findOne({ tokenId: tokenId.toString() });
    
    if (!nft) {
      console.log('❌ Không tìm thấy NFT trong database');
      await mongoose.disconnect();
      return;
    }
    
    console.log(`📋 Owner cũ trong DB: ${nft.owner}`);
    
    if (blockchainOwner.toLowerCase() !== nft.owner.toLowerCase()) {
      console.log('\n🔄 Đang cập nhật owner...');
      nft.owner = blockchainOwner.toLowerCase();
      await nft.save();
      console.log('✅ Đã cập nhật owner mới!');
    } else {
      console.log('✅ Owner đã đồng bộ');
    }
    
    await mongoose.disconnect();
    
    console.log('\n' + '='.repeat(60));
    console.log('📱 IMPORT NFT VÀO METAMASK:');
    console.log('='.repeat(60));
    console.log(`Account: ${blockchainOwner}`);
    console.log(`Contract Address: ${process.env.NFT_CONTRACT_ADDRESS}`);
    console.log(`Token ID: ${tokenId}`);
    console.log('='.repeat(60) + '\n');
    
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
  }
}

syncNFTOwner(1);
