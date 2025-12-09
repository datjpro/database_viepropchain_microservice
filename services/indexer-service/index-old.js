/**
 * ========================================================================
 * INDEXER SERVICE - Background Worker
 * ========================================================================
 * Nhiệm vụ: Lắng nghe blockchain events và update MongoDB
 * ========================================================================
 */

require("dotenv").config();
const mongoose = require("mongoose");

const {
  GANACHE_URL,
  CONTRACT_ADDRESS,
  POLL_INTERVAL,
} = require("./src/config/blockchain");
const eventListenerService = require("./src/services/eventListenerService");
const comprehensiveOwnershipSyncService = require("./src/services/comprehensiveOwnershipSyncService");

console.log(`
╔══════════════════════════════════════════════════════════════╗
║                   INDEXER SERVICE                            ║
║══════════════════════════════════════════════════════════════║
║  Ganache: ${GANACHE_URL}                         ║
║  Contract: ${CONTRACT_ADDRESS}        ║
║  Poll Interval: ${POLL_INTERVAL}ms                                        ║
║  🔄 Service Mode: CONTINUOUS SYNC                            ║
║  💪 Resilient: Auto-retry & Error Recovery                   ║
╚══════════════════════════════════════════════════════════════╝
`);

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================
async function shutdown() {
  console.log("\n🛑 Shutting down indexer service...");

  if (eventListenerService && eventListenerService.stop) {
    eventListenerService.stop();
  }
  if (comprehensiveOwnershipSyncService && comprehensiveOwnershipSyncService.stop) {
    comprehensiveOwnershipSyncService.stop();
  }

  await mongoose.connection.close();
  console.log("✅ MongoDB connection closed");

  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// ============================================================================
// START INDEXER (Cấu trúc mới với async/await đúng cách)
// ============================================================================
const startIndexer = async (retryCount = 0) => {
  try {
    // 1. Kết nối DB trước với longer timeout
    console.log("⏳ Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 30000, // 30 giây timeout
      socketTimeoutMS: 0, // Không timeout
      bufferMaxEntries: 0, // Disable mongoose buffering
      maxPoolSize: 10,
      retryWrites: true,
      retryReads: true,
    });
    console.log("✅ MongoDB connected successfully");

    // 2. SAU KHI kết nối xong mới khởi tạo các thứ khác
    console.log("🔧 Initializing indexer services...");

    // 3. Start event listener với error handling
    try {
      if (eventListenerService && eventListenerService.start) {
        await eventListenerService.start();
      }
    } catch (eventError) {
      console.error("⚠️ Event listener error (continuing):", eventError.message);
    }

    // 4. Start comprehensive ownership sync service (cảnh sát dữ liệu nâng cao)
    if (comprehensiveOwnershipSyncService && comprehensiveOwnershipSyncService.start) {
      comprehensiveOwnershipSyncService.start();
    }

    console.log("✅ Indexer Service started successfully");
    console.log("🔄 Running continuous sync...");

    // 5. Keep service alive với heartbeat
    setInterval(() => {
      console.log(`💓 Indexer heartbeat - ${new Date().toLocaleTimeString()}`);
    }, 60000); // Heartbeat mỗi phút

  } catch (err) {
    console.error("❌ Startup Error:", err.message);
    
    if (retryCount < 5) {
      const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 30000); // Exponential backoff
      console.log(`🔄 Retrying in ${retryDelay}ms... (Attempt ${retryCount + 1}/5)`);
      setTimeout(() => {
        startIndexer(retryCount + 1);
      }, retryDelay);
    } else {
      console.error("❌ Max retry attempts reached. Service will keep running with limited functionality.");
      
      // Even if DB fails, keep service alive for potential recovery
      setInterval(() => {
        console.log(`💔 Service running with errors - ${new Date().toLocaleTimeString()}`);
        
        // Try to reconnect periodically
        if (mongoose.connection.readyState === 0) {
          console.log("🔄 Attempting to reconnect to MongoDB...");
          startIndexer(0);
        }
      }, 60000);
    }
  }
};

// Khởi động indexer
console.log("🚀 Starting Indexer Service...");
startIndexer();



// Listing Model (tạm thời inline, sau này sẽ move vào shared/models)
const ListingSchema = new mongoose.Schema(
  {
    listingId: { type: Number, required: true, unique: true },
    tokenId: { type: Number, required: true },
    contractAddress: { type: String, required: true },
    propertyId: { type: mongoose.Schema.Types.ObjectId, ref: "Property" },
    propertyName: String,
    propertyType: String,
    propertyAddress: {
      city: String,
      district: String,
      ward: String,
    },
    propertyArea: Number,
    propertyImages: [String],
    seller: {
      walletAddress: { type: String, required: true },
      email: String,
    },
    price: {
      amount: { type: String, required: true }, // Wei string
      currency: { type: String, default: "ETH" },
    },
    status: {
      type: String,
      enum: ["active", "sold", "cancelled"],
      default: "active",
    },
    description: String,
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    }, // 90 days
    views: { type: Number, default: 0 },
    favorites: { type: Number, default: 0 },
    offers: [{ type: mongoose.Schema.Types.ObjectId, ref: "Offer" }],
    listedAt: { type: Date, default: Date.now },
    soldAt: Date,
    transactionHash: String,
    blockNumber: Number,
  },
  {
    timestamps: true,
  }
);

const Listing = mongoose.model("Listing", ListingSchema);

// ============================================================================
// MONGODB CONNECTION
// ============================================================================
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });

// ============================================================================
// BLOCKCHAIN CONNECTION
// ============================================================================
const provider = new ethers.JsonRpcProvider(GANACHE_URL);
const nftContract = new ethers.Contract(
  NFT_CONTRACT_ADDRESS,
  NFT_ABI,
  provider
);
const marketplaceContract = new ethers.Contract(
  MARKETPLACE_CONTRACT_ADDRESS,
  MARKETPLACE_ABI,
  provider
);

console.log(`
╔══════════════════════════════════════════════════════════════╗
║                   MARKETPLACE INDEXER                       ║
║══════════════════════════════════════════════════════════════║
║  Ganache: ${GANACHE_URL}                         ║
║  NFT Contract: ${NFT_CONTRACT_ADDRESS}        ║
║  Marketplace: ${MARKETPLACE_CONTRACT_ADDRESS}         ║
║  Poll Interval: ${POLL_INTERVAL}ms                                        ║
║  MongoDB: ${
  mongoose.connection.readyState === 1 ? "Connected" : "Connecting..."
}                                       ║
╚══════════════════════════════════════════════════════════════╝
`);

// ============================================================================
// STATE TRACKING
// ============================================================================
let lastProcessedBlock = 0;
let isProcessing = false;

// ============================================================================
// GET LAST PROCESSED BLOCK FROM DB
// ============================================================================
async function initializeLastBlock() {
  try {
    const latestTransaction = await Transaction.findOne()
      .sort({ blockNumber: -1 })
      .select("blockNumber");

    if (latestTransaction) {
      lastProcessedBlock = latestTransaction.blockNumber;
      console.log(`📌 Resuming from block ${lastProcessedBlock}`);
    } else {
      const currentBlock = await provider.getBlockNumber();
      lastProcessedBlock = currentBlock;
      console.log(`📌 Starting from current block ${currentBlock}`);
    }
  } catch (error) {
    console.error("❌ Error initializing last block:", error);
    const currentBlock = await provider.getBlockNumber();
    lastProcessedBlock = currentBlock;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Fetch metadata from IPFS
async function fetchMetadataFromIPFS(tokenURI) {
  try {
    if (tokenURI.startsWith("ipfs://")) {
      tokenURI = tokenURI.replace("ipfs://", "https://ipfs.io/ipfs/");
    }

    const response = await axios.get(tokenURI, { timeout: 10000 });
    return response.data;
  } catch (error) {
    console.error(
      `❌ Error fetching metadata from ${tokenURI}:`,
      error.message
    );
    return null;
  }
}

// Get property data by tokenId
async function getPropertyByTokenId(tokenId) {
  try {
    const property = await Property.findOne({ "nft.tokenId": tokenId });
    return property;
  } catch (error) {
    console.error(
      `❌ Error finding property for tokenId ${tokenId}:`,
      error.message
    );
    return null;
  }
}

// Get user data by wallet address
async function getUserByWallet(walletAddress) {
  try {
    // Call user service để lấy thông tin user
    const response = await axios.get(
      `http://localhost:4006/api/users/wallet/${walletAddress}`
    );
    return response.data.data;
  } catch (error) {
    console.error(
      `❌ Error getting user data for ${walletAddress}:`,
      error.message
    );
    return { walletAddress: walletAddress.toLowerCase() };
  }
}

// ============================================================================
// PROCESS ITEMLISTED EVENT
// ============================================================================
async function processItemListedEvent(event) {
  try {
    const { listingId, seller, tokenId, price } = event.args;
    const listingIdNumber = Number(listingId);
    const tokenIdNumber = Number(tokenId);
    const priceString = price.toString();

    console.log(
      `   � Processing ItemListed: Listing ${listingIdNumber}, Token ${tokenIdNumber}, Price ${ethers.formatEther(
        price
      )} ETH`
    );

    // Get transaction details
    const tx = await event.getTransaction();

    // Get property data
    const property = await getPropertyByTokenId(tokenIdNumber);

    // Get seller data
    const sellerData = await getUserByWallet(seller);

    // Get metadata from NFT contract
    let metadata = null;
    try {
      const tokenURI = await nftContract.tokenURI(tokenIdNumber);
      metadata = await fetchMetadataFromIPFS(tokenURI);
    } catch (error) {
      console.error(
        `   ⚠️  Could not fetch metadata for token ${tokenIdNumber}:`,
        error.message
      );
    }

    // Create listing in MongoDB
    const listing = new Listing({
      listingId: listingIdNumber,
      tokenId: tokenIdNumber,
      contractAddress: NFT_CONTRACT_ADDRESS,
      propertyId: property ? property._id : null,
      propertyName: property
        ? property.title
        : metadata
        ? metadata.name
        : `Token #${tokenIdNumber}`,
      propertyType: property ? property.propertyType : "unknown",
      propertyAddress: property ? property.address : {},
      propertyArea: property ? property.area : 0,
      propertyImages: property
        ? property.images
        : metadata
        ? [metadata.image]
        : [],
      seller: {
        walletAddress: seller.toLowerCase(),
        email: sellerData.email || null,
      },
      price: {
        amount: priceString,
        currency: "ETH",
      },
      status: "active",
      description: property
        ? property.description
        : metadata
        ? metadata.description
        : "",
      transactionHash: tx.hash,
      blockNumber: event.blockNumber,
      listedAt: new Date(),
    });

    await listing.save();
    console.log(`   ✅ Listing created in MongoDB: ID ${listingIdNumber}`);

    // Update property status if exists
    if (property) {
      property.marketplaceStatus = "listed";
      property.currentListingId = listingIdNumber;
      await property.save();
      console.log(`   ✅ Property status updated: Listed`);
    }
  } catch (error) {
    console.error("   ❌ Error processing ItemListed event:", error);
  }
}

// ============================================================================
// PROCESS ITEMSOLD EVENT
// ============================================================================
async function processItemSoldEvent(event) {
  try {
    const { listingId, buyer, tokenId } = event.args;
    const listingIdNumber = Number(listingId);
    const tokenIdNumber = Number(tokenId);

    console.log(
      `   💰 Processing ItemSold: Listing ${listingIdNumber}, Token ${tokenIdNumber}, Buyer ${buyer}`
    );

    // Get transaction details
    const tx = await event.getTransaction();

    // Update listing status
    const listing = await Listing.findOne({ listingId: listingIdNumber });
    if (listing) {
      listing.status = "sold";
      listing.soldAt = new Date();
      listing.buyer = {
        walletAddress: buyer.toLowerCase(),
      };
      await listing.save();
      console.log(`   ✅ Listing status updated: Sold`);
    }

    // Update property status
    const property = await getPropertyByTokenId(tokenIdNumber);
    if (property) {
      property.marketplaceStatus = "sold";
      property.owner = buyer.toLowerCase();
      property.currentListingId = null;
      await property.save();
      console.log(`   ✅ Property ownership transferred`);
    }

    // Update NFT owner
    const nft = await NFT.findOne({ tokenId: tokenIdNumber });
    if (nft) {
      nft.owner = buyer.toLowerCase();
      await nft.save();
      console.log(`   ✅ NFT ownership updated`);
    }
  } catch (error) {
    console.error("   ❌ Error processing ItemSold event:", error);
  }
}

// ============================================================================
// PROCESS LISTINGCANCELLED EVENT
// ============================================================================
async function processListingCancelledEvent(event) {
  try {
    const { listingId } = event.args;
    const listingIdNumber = Number(listingId);

    console.log(
      `   ❌ Processing ListingCancelled: Listing ${listingIdNumber}`
    );

    // Update listing status
    const listing = await Listing.findOne({ listingId: listingIdNumber });
    if (listing) {
      listing.status = "cancelled";
      await listing.save();
      console.log(`   ✅ Listing status updated: Cancelled`);

      // Update property status
      const property = await getPropertyByTokenId(listing.tokenId);
      if (property) {
        property.marketplaceStatus = "unlisted";
        property.currentListingId = null;
        await property.save();
        console.log(`   ✅ Property status updated: Unlisted`);
      }
    }
  } catch (error) {
    console.error("   ❌ Error processing ListingCancelled event:", error);
  }
}

// ============================================================================
// POLL FOR NEW EVENTS
// ============================================================================
async function pollEvents() {
  if (isProcessing) {
    console.log("⏭️  Skipping poll - previous poll still processing");
    return;
  }

  isProcessing = true;

  try {
    const currentBlock = await provider.getBlockNumber();

    if (currentBlock <= lastProcessedBlock) {
      isProcessing = false;
      return;
    }

    console.log(
      `\n🔍 Polling blocks ${lastProcessedBlock + 1} to ${currentBlock}...`
    );

    // Query Marketplace events
    const itemListedFilter = marketplaceContract.filters.ItemListed();
    const itemSoldFilter = marketplaceContract.filters.ItemSold();
    const listingCancelledFilter =
      marketplaceContract.filters.ListingCancelled();

    // Get all marketplace events
    const [listedEvents, soldEvents, cancelledEvents] = await Promise.all([
      marketplaceContract.queryFilter(
        itemListedFilter,
        lastProcessedBlock + 1,
        currentBlock
      ),
      marketplaceContract.queryFilter(
        itemSoldFilter,
        lastProcessedBlock + 1,
        currentBlock
      ),
      marketplaceContract.queryFilter(
        listingCancelledFilter,
        lastProcessedBlock + 1,
        currentBlock
      ),
    ]);

    const totalEvents =
      listedEvents.length + soldEvents.length + cancelledEvents.length;

    if (totalEvents > 0) {
      console.log(`📦 Found ${totalEvents} Marketplace event(s):`);
      console.log(`   - ItemListed: ${listedEvents.length}`);
      console.log(`   - ItemSold: ${soldEvents.length}`);
      console.log(`   - ListingCancelled: ${cancelledEvents.length}`);

      // Process events in chronological order
      const allEvents = [
        ...listedEvents.map((e) => ({ ...e, type: "ItemListed" })),
        ...soldEvents.map((e) => ({ ...e, type: "ItemSold" })),
        ...cancelledEvents.map((e) => ({ ...e, type: "ListingCancelled" })),
      ].sort((a, b) => a.blockNumber - b.blockNumber);

      for (const event of allEvents) {
        switch (event.type) {
          case "ItemListed":
            await processItemListedEvent(event);
            break;
          case "ItemSold":
            await processItemSoldEvent(event);
            break;
          case "ListingCancelled":
            await processListingCancelledEvent(event);
            break;
        }
      }
    }

    // Update last processed block
    lastProcessedBlock = currentBlock;
  } catch (error) {
    console.error("❌ Error polling events:", error);
  } finally {
    isProcessing = false;
  }
}

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================
async function shutdown() {
  console.log("\n🛑 Shutting down indexer service...");

  if (pollInterval) {
    clearInterval(pollInterval);
  }

  await mongoose.connection.close();
  console.log("✅ MongoDB connection closed");

  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// ============================================================================
// START INDEXER
// ============================================================================
let pollInterval;

(async function start() {
  try {
    // Wait for MongoDB connection
    while (mongoose.connection.readyState !== 1) {
      console.log("⏳ Waiting for MongoDB connection...");
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // Initialize last processed block
    await initializeLastBlock();

    // Start polling
    console.log(
      `\n✅ Marketplace Indexer started - polling every ${POLL_INTERVAL}ms\n`
    );

    pollInterval = setInterval(pollEvents, POLL_INTERVAL);

    // Initial poll
    await pollEvents();
  } catch (error) {
    console.error("❌ Error starting indexer:", error);
    process.exit(1);
  }
})();
