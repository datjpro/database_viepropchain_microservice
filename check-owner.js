// Script kiểm tra owner của NFT trên blockchain
const { ethers } = require("ethers");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "minting-service", ".env") });

async function checkNFTOwner(tokenId) {
  try {
    console.log('\n🔍 KIỂM TRA OWNER CỦA NFT TRÊN BLOCKCHAIN\n');
    console.log('='.repeat(60));

    // Kết nối với Ganache
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    
    // Load ABI
    const contractABI = require("./minting-service/contract-abi.json");
    const abi = contractABI.contracts.ViePropChainNFT.abi;
    
    // Kết nối với contract
    const contract = new ethers.Contract(
      process.env.NFT_CONTRACT_ADDRESS,
      abi,
      provider
    );

    console.log(`\n📋 Contract Address: ${process.env.NFT_CONTRACT_ADDRESS}`);
    console.log(`📋 Token ID: ${tokenId}`);
    
    // Lấy owner từ blockchain
    const owner = await contract.ownerOf(tokenId);
    console.log(`\n✅ Owner trên Blockchain: ${owner}`);
    
    // Lấy tokenURI
    const tokenURI = await contract.tokenURI(tokenId);
    console.log(`📄 Token URI: ${tokenURI}`);
    
    // Kiểm tra owner trong database
    console.log('\n📊 Kiểm tra owner trong Database:');
    const mongoose = require("mongoose");
    await mongoose.connect(process.env.MONGO_URI);
    
    const NFT = require("./minting-service/nftModel");
    const nftInDB = await NFT.findOne({ tokenId: tokenId.toString() });
    
    if (nftInDB) {
      console.log(`📋 Owner trong DB: ${nftInDB.owner}`);
      
      if (owner.toLowerCase() !== nftInDB.owner.toLowerCase()) {
        console.log('\n⚠️  CẢNH BÁO: Owner không khớp!');
        console.log(`   Blockchain: ${owner}`);
        console.log(`   Database:   ${nftInDB.owner}`);
        console.log('\n🔄 Đang cập nhật database...');
        
        // Cập nhật owner trong database
        nftInDB.owner = owner.toLowerCase();
        await nftInDB.save();
        
        console.log('✅ Đã cập nhật owner trong database!');
      } else {
        console.log('✅ Owner khớp giữa blockchain và database');
      }
    } else {
      console.log('❌ Không tìm thấy NFT trong database');
    }
    
    await mongoose.disconnect();
    
    console.log('\n' + '='.repeat(60));
    console.log('\n📱 THÔNG TIN IMPORT VÀO METAMASK:');
    console.log('='.repeat(60));
    console.log(`Contract Address: ${process.env.NFT_CONTRACT_ADDRESS}`);
    console.log(`Token ID: ${tokenId}`);
    console.log(`Owner: ${owner}`);
    console.log('\n💡 Import NFT vào account: ' + owner);
    console.log('='.repeat(60) + '\n');
    
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
    process.exit(1);
  }
}

// Kiểm tra NFT #1
checkNFTOwner(1);
