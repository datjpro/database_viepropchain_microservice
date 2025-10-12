// minting-service/blockchainService.js
const { ethers } = require('ethers');
// Đọc ABI từ file JSON đã copy
const contractABI = require('./contract-abi.json').abi;

// Khởi tạo các đối tượng cần thiết để kết nối và tương tác
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const signer = new ethers.Wallet(process.env.CONTRACT_OWNER_PRIVATE_KEY, provider);
const nftContract = new ethers.Contract(process.env.NFT_CONTRACT_ADDRESS, contractABI, signer);

async function mintNFT(recipient, tokenURI) {
  try {
    console.log(`Bắt đầu mint cho ${recipient} với URI: ${tokenURI}`);
    const tx = await nftContract.mint(recipient, tokenURI);
    console.log('Đang chờ giao dịch được xác nhận...', tx.hash);

    // Chờ giao dịch được khai thác và lấy biên lai
    const receipt = await tx.wait();
    console.log('Giao dịch đã được xác nhận!');

    // Lấy Token ID từ sự kiện "Transfer" trong biên lai
    const transferEvent = receipt.logs.find(log => log.eventName === 'Transfer');
    if (!transferEvent) {
      throw new Error("Không tìm thấy sự kiện Transfer trong giao dịch.");
    }
    const tokenId = transferEvent.args.tokenId.toString();

    return { success: true, tokenId: tokenId, transactionHash: tx.hash };
  } catch (error) {
    console.error("Lỗi khi mint NFT:", error.message);
    return { success: false, error: error.message };
  }
}

module.exports = { mintNFT };