// Script kiểm tra metadata của NFT trên blockchain
const { ethers } = require("ethers");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

async function checkNFTMetadata(tokenId) {
  try {
    console.log('\n🔍 KIỂM TRA METADATA CỦA NFT\n');
    console.log('='.repeat(60));

    // Kết nối với Ganache
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    
    // Load ABI
    const contractABI = require("./contract-abi.json");
    const abi = contractABI.contracts.ViePropChainNFT.abi;
    
    // Kết nối với contract
    const contract = new ethers.Contract(
      process.env.NFT_CONTRACT_ADDRESS,
      abi,
      provider
    );

    console.log(`📋 Contract: ${process.env.NFT_CONTRACT_ADDRESS}`);
    console.log(`📋 Token ID: ${tokenId}\n`);
    
    // Kiểm tra owner
    const owner = await contract.ownerOf(tokenId);
    console.log(`✅ Owner: ${owner}`);
    
    // Lấy tokenURI
    const tokenURI = await contract.tokenURI(tokenId);
    console.log(`✅ Token URI: ${tokenURI}`);
    
    // Kiểm tra xem tokenURI có hợp lệ không
    if (!tokenURI || tokenURI === "") {
      console.log("\n❌ CẢNH BÁO: Token URI rỗng!");
      console.log("MetaMask cần Token URI để hiển thị metadata NFT");
      return;
    }
    
    // Kiểm tra định dạng URI
    if (tokenURI.startsWith("ipfs://")) {
      console.log("\n✅ Token URI sử dụng IPFS protocol");
      const ipfsHash = tokenURI.replace("ipfs://", "");
      console.log(`📦 IPFS Hash: ${ipfsHash}`);
      console.log(`\n💡 Để xem metadata, truy cập:`);
      console.log(`   https://gateway.pinata.cloud/ipfs/${ipfsHash}`);
      console.log(`   hoặc https://ipfs.io/ipfs/${ipfsHash}`);
      
      // Thử fetch metadata
      console.log("\n🔄 Đang fetch metadata từ IPFS...");
      const axios = require("axios");
      try {
        const response = await axios.get(`https://gateway.pinata.cloud/ipfs/${ipfsHash}`, {
          timeout: 10000
        });
        console.log("\n✅ Metadata từ IPFS:");
        console.log(JSON.stringify(response.data, null, 2));
      } catch (error) {
        console.log(`\n⚠️  Không thể fetch metadata: ${error.message}`);
        console.log("Metadata có thể chưa được pin hoặc IPFS gateway chậm");
      }
    } else if (tokenURI.startsWith("http")) {
      console.log("\n✅ Token URI sử dụng HTTP/HTTPS");
      console.log(`💡 URL: ${tokenURI}`);
    } else {
      console.log("\n⚠️  Token URI có định dạng không chuẩn");
      console.log("MetaMask có thể không hiển thị được NFT");
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('\n📱 THÔNG TIN IMPORT VÀO METAMASK:');
    console.log('='.repeat(60));
    console.log(`Network: Ganache Local (localhost:8545, Chain ID: 1337)`);
    console.log(`Account: ${owner}`);
    console.log(`Contract Address: ${process.env.NFT_CONTRACT_ADDRESS}`);
    console.log(`Token ID: ${tokenId}`);
    console.log('='.repeat(60));
    
    console.log('\n💡 LƯU Ý:');
    console.log('- MetaMask cần có thể truy cập được metadata URI');
    console.log('- Đối với IPFS, MetaMask sử dụng gateway công khai');
    console.log('- Metadata phải có định dạng JSON hợp lệ');
    console.log('- Ảnh NFT phải là URL công khai hoặc IPFS URI');
    console.log('='.repeat(60) + '\n');
    
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
    
    if (error.message.includes("ERC721NonexistentToken")) {
      console.log("\n⚠️  NFT này không tồn tại trên blockchain!");
      console.log("Hãy kiểm tra lại Token ID");
    }
  }
}

// Kiểm tra NFT #1
const tokenId = process.argv[2] || 1;
checkNFTMetadata(tokenId);
