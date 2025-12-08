/**
 * ========================================================================
 * OWNERSHIP SYNC SERVICE - "Cảnh sát dữ liệu"
 * ========================================================================
 * Nhiệm vụ: Đảm bảo Database luôn trung thực với Blockchain
 * Logic: So sánh chủ sở hữu NFT trên chain vs DB, tự động sửa lỗi
 * ========================================================================
 */

const { provider, contract } = require("../config/blockchain");
const NFT = require("../models/NFT");

class OwnershipSyncService {
  constructor() {
    this.syncInterval = null;
    this.SYNC_INTERVAL = 60000; // Chạy mỗi 1 phút
  }

  /**
   * Bắt đầu service đồng bộ ownership
   */
  start() {
    console.log("🚨 Starting Ownership Sync Service (Data Police)");
    console.log(`⏰ Sync interval: ${this.SYNC_INTERVAL / 1000} seconds`);

    // Chạy ngay lần đầu
    this.syncOwnership();

    // Sau đó chạy định kỳ
    this.syncInterval = setInterval(() => {
      this.syncOwnership();
    }, this.SYNC_INTERVAL);
  }

  /**
   * Dừng service
   */
  stop() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log("🛑 Ownership Sync Service stopped");
    }
  }

  /**
   * Hàm chính: So sánh và sync ownership
   */
  async syncOwnership() {
    try {
      console.log("🔍 Starting ownership sync check...");

      // 1. Lấy tất cả NFT có status 'minted' từ DB
      const nfts = await NFT.find({ status: "minted" }).select(
        "tokenId currentOwner owner"
      );

      if (nfts.length === 0) {
        console.log("📝 No minted NFTs found in database");
        return;
      }

      console.log(`📊 Checking ${nfts.length} NFTs...`);

      let syncedCount = 0;
      let mismatchCount = 0;

      for (const nft of nfts) {
        try {
          // 2. Hỏi Blockchain: "Ai đang giữ Token ID này?"
          const onChainOwner = await contract.ownerOf(nft.tokenId);
          const dbOwner = nft.currentOwner || nft.owner;

          // 3. So sánh với Database (không phân biệt hoa thường)
          if (onChainOwner.toLowerCase() !== dbOwner.toLowerCase()) {
            console.warn(`⚠️ MISMATCH detected for Token #${nft.tokenId}!`);
            console.log(`   💾 DB says: ${dbOwner}`);
            console.log(`   ⛓️  Chain says: ${onChainOwner}`);

            // 4. TỰ ĐỘNG SỬA LỖI (Self-Healing)
            const updateResult = await NFT.findOneAndUpdate(
              { tokenId: nft.tokenId },
              {
                $set: {
                  currentOwner: onChainOwner.toLowerCase(),
                  owner: onChainOwner.toLowerCase(),
                  lastSyncAt: new Date(),
                },
                $push: {
                  transferHistory: {
                    from: dbOwner?.toLowerCase() || "unknown",
                    to: onChainOwner.toLowerCase(),
                    transferType: "indexer_correction",
                    transferredAt: new Date(),
                    note: "Automatic sync correction by indexer service",
                    blockNumber: await provider.getBlockNumber(),
                  },
                },
              },
              { new: true }
            );

            if (updateResult) {
              console.log(
                `✅ FIXED Token #${nft.tokenId} - Updated to ${onChainOwner}`
              );
              mismatchCount++;
            }
          } else {
            // Ownership đã sync đúng
            syncedCount++;
          }
        } catch (nftError) {
          // Token có thể đã bị burn hoặc contract error
          console.error(
            `❌ Error checking Token #${nft.tokenId}:`,
            nftError.message
          );

          // Nếu token không tồn tại trên chain, đánh dấu status
          if (
            nftError.message.includes("nonexistent token") ||
            nftError.message.includes("invalid token")
          ) {
            await NFT.findOneAndUpdate(
              { tokenId: nft.tokenId },
              {
                $set: {
                  status: "burned",
                  lastSyncAt: new Date(),
                },
              }
            );
            console.log(`🔥 Marked Token #${nft.tokenId} as burned`);
          }
        }
      }

      // 5. Báo cáo kết quả
      console.log("📋 SYNC SUMMARY:");
      console.log(`   ✅ Synced: ${syncedCount}`);
      console.log(`   🔧 Fixed: ${mismatchCount}`);
      console.log(`   📊 Total: ${nfts.length}`);
      console.log(
        `   🎯 Success Rate: ${((syncedCount / nfts.length) * 100).toFixed(1)}%`
      );
    } catch (error) {
      console.error("❌ Ownership sync error:", error.message);
    }
  }

  /**
   * Chạy sync một lần (manual trigger)
   */
  async runManualSync() {
    console.log("🔧 Running manual ownership sync...");
    await this.syncOwnership();
  }
}

module.exports = new OwnershipSyncService();
