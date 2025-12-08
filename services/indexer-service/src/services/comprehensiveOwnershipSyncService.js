/**
 * ========================================================================
 * COMPREHENSIVE OWNERSHIP SYNC SERVICE - "Cảnh sát dữ liệu nâng cao"
 * ========================================================================
 * Nhiệm vụ: Đảm bảo cả NFTs và Properties đồng bộ với Blockchain
 * Logic: Double Update - Cập nhật cả 2 bảng để tránh sai lệch dữ liệu
 * ========================================================================
 */

const { provider, contract } = require("../config/blockchain");
const mongoose = require("mongoose");

// Import models (sử dụng models có sẵn hoặc tạo mới nếu chưa có)
let NFT, Property, User;

try {
  NFT = mongoose.model("NFT");
} catch (error) {
  const NFTSchema = new mongoose.Schema({}, { strict: false });
  NFT = mongoose.model("NFT", NFTSchema, "nfts");
}

try {
  Property = mongoose.model("Property");
} catch (error) {
  const PropertySchema = new mongoose.Schema({}, { strict: false });
  Property = mongoose.model("Property", PropertySchema, "properties");
}

try {
  User = mongoose.model("User");
} catch (error) {
  const UserSchema = new mongoose.Schema({}, { strict: false });
  User = mongoose.model("User", UserSchema, "users");
}

class ComprehensiveOwnershipSyncService {
  constructor() {
    this.syncInterval = null;
    this.SYNC_INTERVAL = 60000; // Chạy mỗi 1 phút
  }

  /**
   * Bắt đầu service đồng bộ ownership
   */
  start() {
    console.log("🚨 Starting Comprehensive Ownership Sync Service");
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
      console.log("🛑 Comprehensive Ownership Sync Service stopped");
    }
  }

  /**
   * Hàm chính: So sánh và sync ownership cho cả NFTs và Properties
   */
  async syncOwnership() {
    try {
      console.log("🔍 Starting comprehensive ownership sync check...");

      // 1. Lấy tất cả NFT active từ DB
      const nfts = await NFT.find({
        $or: [
          { status: "minted" },
          { isActive: true },
          { status: { $exists: false } }, // Fallback cho NFTs cũ
        ],
      }).lean();

      if (nfts.length === 0) {
        console.log("📝 No NFTs found in database");
        return;
      }

      console.log(`📊 Checking ${nfts.length} NFTs...`);

      let syncedCount = 0;
      let mismatchCount = 0;
      let fixedProperties = 0;

      for (const nft of nfts) {
        try {
          // 2. Hỏi Blockchain: "Ai đang giữ Token ID này?"
          const onChainOwner = await contract.ownerOf(nft.tokenId);

          // 3. Xác định owner hiện tại trong DB (ưu tiên currentOwner)
          const dbCurrentOwner = (nft.currentOwner || "").toLowerCase();
          const dbOwner = (nft.owner || "").toLowerCase();

          // 4. So sánh với Database - ưu tiên currentOwner
          const primaryOwner = dbCurrentOwner || dbOwner;

          if (onChainOwner.toLowerCase() !== primaryOwner) {
            console.warn(`⚠️ MISMATCH detected for Token #${nft.tokenId}!`);
            console.log(
              `   💾 DB currentOwner: ${dbCurrentOwner || "undefined"}`
            );
            console.log(`   💾 DB owner: ${dbOwner || "undefined"}`);
            console.log(`   ⛓️  Chain says: ${onChainOwner.toLowerCase()}`);

            // --- BƯỚC QUAN TRỌNG: TÌM USER ID TỪ VÍ ---
            const newOwnerUser = await User.findOne({
              $or: [
                {
                  walletAddress: {
                    $regex: new RegExp(`^${onChainOwner}$`, "i"),
                  },
                },
                { wallet: { $regex: new RegExp(`^${onChainOwner}$`, "i") } },
                { address: { $regex: new RegExp(`^${onChainOwner}$`, "i") } },
              ],
            });

            const newOwnerId = newOwnerUser ? newOwnerUser._id : null;
            const ownerInfo = newOwnerUser
              ? `${newOwnerUser.email || newOwnerUser.username || "User"}`
              : "Unknown Wallet";

            // --- ACTION 1: UPDATE BẢNG NFT (Chỉ cập nhật currentOwner) ---
            const updateFields = {
              currentOwner: onChainOwner.toLowerCase(),
              lastSyncedAt: new Date(),
            };

            // Chỉ cập nhật owner field nếu nó chưa được set (cho NFTs mới)
            if (!nft.owner) {
              updateFields.owner = onChainOwner.toLowerCase();
            }

            const nftUpdateResult = await NFT.findOneAndUpdate(
              { tokenId: nft.tokenId },
              {
                $set: updateFields,
                $push: {
                  transferHistory: {
                    from: primaryOwner || "unknown",
                    to: onChainOwner.toLowerCase(),
                    transactionHash: "sync-correction-" + Date.now(),
                    blockNumber: await provider.getBlockNumber(),
                    timestamp: new Date(),
                    transferType: "indexer_correction",
                    note: "Automatic sync correction by comprehensive indexer - currentOwner updated",
                  },
                },
              },
              { new: true }
            );

            // --- ACTION 2: UPDATE BẢNG PROPERTY (Cái quan trọng nhất!) ---
            let propertyUpdateResult = null;

            // Tìm Property tương ứng với NFT này
            const propertyQuery = {
              $or: [
                { "nft.tokenId": nft.tokenId },
                { tokenId: nft.tokenId },
                { _id: nft.propertyId }, // Nếu có liên kết trực tiếp
              ],
            };

            const property = await Property.findOne(propertyQuery);

            if (property) {
              propertyUpdateResult = await Property.findOneAndUpdate(
                propertyQuery,
                {
                  $set: {
                    owner: newOwnerId, // Gán User ID hoặc null
                    ownerWallet: onChainOwner.toLowerCase(), // Backup wallet address
                    lastOwnerSyncAt: new Date(),
                    // Cập nhật thêm nếu có nested structure
                    "nft.currentOwner": onChainOwner.toLowerCase(),
                  },
                },
                { new: true }
              );
              fixedProperties++;
              console.log(`   🏠 Property updated for ${ownerInfo}`);
            } else {
              console.warn(
                `   ⚠️ Property not found for Token #${nft.tokenId}`
              );
            }

            if (nftUpdateResult) {
              console.log(
                `✅ FIXED Token #${nft.tokenId} - Updated to ${ownerInfo}`
              );
              console.log(
                `   📊 NFT Update: ✅ Property Update: ${
                  propertyUpdateResult ? "✅" : "❌"
                }`
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

          if (
            nftError.message.includes("nonexistent token") ||
            nftError.message.includes("invalid token") ||
            nftError.message.includes("revert")
          ) {
            // Đánh dấu NFT inactive
            await NFT.findOneAndUpdate(
              { tokenId: nft.tokenId },
              {
                $set: {
                  isActive: false,
                  status: "burned",
                  lastSyncedAt: new Date(),
                },
              }
            );

            // Đánh dấu Property inactive
            await Property.findOneAndUpdate(
              {
                $or: [{ "nft.tokenId": nft.tokenId }, { tokenId: nft.tokenId }],
              },
              {
                $set: {
                  isActive: false,
                  status: "burned",
                  lastOwnerSyncAt: new Date(),
                },
              }
            );

            console.log(
              `🔥 Marked Token #${nft.tokenId} and related Property as inactive (burned)`
            );
          }
        }
      }

      // 5. Báo cáo kết quả chi tiết
      console.log("📋 COMPREHENSIVE SYNC SUMMARY:");
      console.log(`   ✅ Synced NFTs: ${syncedCount}`);
      console.log(`   🔧 Fixed NFTs: ${mismatchCount}`);
      console.log(`   🏠 Fixed Properties: ${fixedProperties}`);
      console.log(`   📊 Total analyzed: ${nfts.length}`);
      console.log(
        `   🎯 Success Rate: ${((syncedCount / nfts.length) * 100).toFixed(1)}%`
      );

      if (mismatchCount === 0) {
        console.log("🎉 ALL DATA IS PERFECTLY SYNCED! 🎉");
      } else {
        console.log(
          `⚠️ Fixed ${mismatchCount} ownership mismatches with double update`
        );
      }
    } catch (error) {
      console.error("❌ Comprehensive sync error:", error.message);
    }
  }

  /**
   * Chạy sync một lần (manual trigger)
   */
  async runManualSync() {
    console.log("🔧 Running manual comprehensive sync...");
    await this.syncOwnership();
  }

  /**
   * Kiểm tra tính toàn vẹn dữ liệu giữa NFTs và Properties
   */
  async validateDataIntegrity() {
    try {
      console.log(
        "🔍 Validating data integrity between NFTs and Properties..."
      );

      const nfts = await NFT.find({}).lean();
      const properties = await Property.find({}).lean();

      let orphanedNFTs = 0;
      let orphanedProperties = 0;
      let mismatchedOwners = 0;

      // Kiểm tra NFTs có Property tương ứng không
      for (const nft of nfts) {
        const property = properties.find(
          (p) =>
            p.tokenId === nft.tokenId ||
            (p.nft && p.nft.tokenId === nft.tokenId) ||
            (nft.propertyId && p._id.toString() === nft.propertyId.toString())
        );

        if (!property) {
          orphanedNFTs++;
          console.warn(
            `🔍 Orphaned NFT: Token #${nft.tokenId} has no corresponding Property`
          );
        } else {
          // Kiểm tra ownership consistency
          if (property.ownerWallet && nft.currentOwner) {
            if (
              property.ownerWallet.toLowerCase() !==
              nft.currentOwner.toLowerCase()
            ) {
              mismatchedOwners++;
              console.warn(
                `🔍 Owner mismatch: Token #${nft.tokenId} - NFT(${nft.currentOwner}) vs Property(${property.ownerWallet})`
              );
            }
          }
        }
      }

      // Kiểm tra Properties có NFT tương ứng không
      for (const property of properties) {
        const nft = nfts.find(
          (n) =>
            n.tokenId === property.tokenId ||
            (property.nft && n.tokenId === property.nft.tokenId)
        );

        if (!nft && property.tokenId !== undefined) {
          orphanedProperties++;
          console.warn(
            `🔍 Orphaned Property: ${
              property.title || property._id
            } has no corresponding NFT`
          );
        }
      }

      console.log("📋 DATA INTEGRITY REPORT:");
      console.log(`   🔢 Total NFTs: ${nfts.length}`);
      console.log(`   🏠 Total Properties: ${properties.length}`);
      console.log(`   🚫 Orphaned NFTs: ${orphanedNFTs}`);
      console.log(`   🚫 Orphaned Properties: ${orphanedProperties}`);
      console.log(`   ⚠️ Owner mismatches: ${mismatchedOwners}`);
    } catch (error) {
      console.error("❌ Data integrity validation error:", error.message);
    }
  }
}

module.exports = new ComprehensiveOwnershipSyncService();
