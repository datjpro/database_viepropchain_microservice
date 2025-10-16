// eventListener.js - Lắng nghe sự kiện Transfer từ blockchain
const { ethers } = require("ethers");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

let contract = null;
let provider = null;
let lastCheckedBlock = null;
let pollingInterval = null;

async function startEventListener() {
  try {
    console.log("\n🎧 Bắt đầu lắng nghe sự kiện Transfer từ blockchain...");

    // Kết nối với Ganache qua HTTP (Ganache không hỗ trợ WebSocket)
    provider = new ethers.JsonRpcProvider(process.env.RPC_URL);

    // Load ABI và khởi tạo contract
    const contractABI = require("./contract-abi.json");
    const abi = contractABI.contracts.ViePropChainNFT.abi;

    contract = new ethers.Contract(
      process.env.NFT_CONTRACT_ADDRESS,
      abi,
      provider
    );

    console.log(
      `✅ Đã kết nối với contract: ${process.env.NFT_CONTRACT_ADDRESS}`
    );

    // Lấy block hiện tại
    lastCheckedBlock = await provider.getBlockNumber();
    console.log(`📦 Bắt đầu từ block: ${lastCheckedBlock}`);

    // Sử dụng polling để kiểm tra Transfer events
    console.log(
      "🔄 Sử dụng polling để theo dõi Transfer events (mỗi 3 giây)...\n"
    );
    startPolling();
  } catch (error) {
    console.error("❌ Lỗi khi khởi động event listener:", error.message);
  }
}

function startPolling() {
  pollingInterval = setInterval(async () => {
    try {
      const currentBlock = await provider.getBlockNumber();

      if (currentBlock > lastCheckedBlock) {
        // Kiểm tra Transfer events từ lastCheckedBlock đến currentBlock
        const filter = contract.filters.Transfer();
        const events = await contract.queryFilter(
          filter,
          lastCheckedBlock + 1,
          currentBlock
        );

        for (const event of events) {
          const { from, to, tokenId } = event.args;

          console.log("\n🔔 PHÁT HIỆN TRANSFER NFT!");
          console.log("=".repeat(60));
          console.log(`Token ID: ${tokenId.toString()}`);
          console.log(`From: ${from}`);
          console.log(`To: ${to}`);
          console.log(`Transaction: ${event.transactionHash}`);
          console.log(`Block: ${event.blockNumber}`);

          // Bỏ qua event mint (from = 0x0000...)
          if (from === ethers.ZeroAddress) {
            console.log(
              "ℹ️  Đây là sự kiện MINT, bỏ qua (đã xử lý trong API /mint)"
            );
            continue;
          }

          // Cập nhật owner trong database
          await updateNFTOwner(tokenId.toString(), to);
        }

        lastCheckedBlock = currentBlock;
      }
    } catch (error) {
      console.error("❌ Lỗi khi polling events:", error.message);
    }
  }, 3000); // Kiểm tra mỗi 3 giây
}

async function updateNFTOwner(tokenId, newOwner) {
  try {
    const NFT = require("./nftModel");

    const nft = await NFT.findOne({ tokenId: tokenId });

    if (!nft) {
      console.log(`⚠️  NFT #${tokenId} không tồn tại trong database`);
      return;
    }

    const oldOwner = nft.owner;

    if (oldOwner.toLowerCase() === newOwner.toLowerCase()) {
      console.log("ℹ️  Owner không thay đổi, bỏ qua cập nhật");
      return;
    }

    console.log(`\n🔄 Đang cập nhật owner trong database...`);
    console.log(`   Old: ${oldOwner}`);
    console.log(`   New: ${newOwner}`);

    nft.owner = newOwner.toLowerCase();
    await nft.save();

    console.log("✅ Đã cập nhật owner trong database!");
    console.log("=".repeat(60) + "\n");
  } catch (error) {
    console.error("❌ Lỗi khi cập nhật database:", error.message);
  }
}

function stopEventListener() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    console.log("🛑 Đã dừng polling");
  }
  if (provider) {
    provider.destroy();
  }
}

module.exports = {
  startEventListener,
  stopEventListener,
};
