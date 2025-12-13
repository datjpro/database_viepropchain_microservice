// Ensure MongoDB collections exist before any operation
async function ensureCollectionsReady() {
  const collections = await mongoose.connection.db.listCollections().toArray();
  const names = collections.map((c) => c.name);
  if (!names.includes("nfts"))
    await mongoose.connection.createCollection("nfts");
  if (!names.includes("properties"))
    await mongoose.connection.createCollection("properties");
  if (!names.includes("transactions"))
    await mongoose.connection.createCollection("transactions");
}

// Wait until MongoDB responds to a ping (writable)
async function waitForDbWritable(maxRetries = 20, interval = 1000) {
  const db = mongoose.connection.db;
  let retries = 0;
  while (retries < maxRetries) {
    try {
      // `command({ ping: 1 })` will throw if server not responding
      await db.command({ ping: 1 });
      return;
    } catch (err) {
      retries++;
      console.log(
        `⏳ Waiting for MongoDB writable (attempt ${retries}/${maxRetries})...`
      );
      await new Promise((resolve) => setTimeout(resolve, interval));
    }
  }
  throw new Error("MongoDB did not become writable in time");
}

async function dbInsertOne(collName, doc, maxRetries = 3) {
  const coll = mongoose.connection.db.collection(collName);
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await coll.insertOne(doc);
    } catch (err) {
      attempt++;
      console.log(
        `   ⚠️ dbInsertOne ${collName} attempt ${attempt}/${maxRetries} failed: ${err.message}`
      );
      if (attempt >= maxRetries) throw err;
      await new Promise((r) => setTimeout(r, 500 * attempt));
    }
  }
}

async function dbUpdateOne(
  collName,
  filter,
  update,
  options = {},
  maxRetries = 3
) {
  const coll = mongoose.connection.db.collection(collName);
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await coll.updateOne(filter, update, options);
    } catch (err) {
      attempt++;
      console.log(
        `   ⚠️ dbUpdateOne ${collName} attempt ${attempt}/${maxRetries} failed: ${err.message}`
      );
      if (attempt >= maxRetries) throw err;
      await new Promise((r) => setTimeout(r, 500 * attempt));
    }
  }
}

// raw find many with retries
async function dbFindMany(collName, query, maxRetries = 3, maxTimeMS = 10000) {
  const coll = mongoose.connection.db.collection(collName);
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await coll.find(query, { maxTimeMS }).toArray();
    } catch (err) {
      attempt++;
      console.log(
        `   ⚠️ dbFindMany ${collName} attempt ${attempt}/${maxRetries} failed: ${err.message}`
      );
      if (attempt >= maxRetries) throw err;
      await new Promise((r) => setTimeout(r, 500 * attempt));
    }
  }
}
/**
 * ========================================================================
 * INDEXER SERVICE - Blockchain Synchronization Service
 * ========================================================================
 * Nhiệm vụ: Đồng bộ dữ liệu giữa Blockchain và MongoDB
 *
 * 1. NFT Events:
 *    - Transfer events → Update NFT owner trong DB
 *    - Mint events → Create/update NFT records
 *
 * 2. Marketplace Events:
 *    - ItemListed → Tạo listing trong MongoDB
 *    - ItemSold → Cập nhật listing và ownership
 *    - ListingCancelled → Hủy listing
 *
 * 3. Sync Functions:
 *    - Sync toàn bộ NFTs từ blockchain → MongoDB
 *    - Sync Properties ownership với blockchain
 *    - Validate data consistency
 * ========================================================================
 */

const { ethers } = require("ethers");
const mongoose = require("mongoose");
const axios = require("axios");
require("dotenv").config();

// Import models
const { NFT, Property, Transaction } = require("../../shared/models");

// ============================================================================
// CONFIGURATION
// ============================================================================
const GANACHE_URL = process.env.GANACHE_URL || "http://127.0.0.1:8545";
const contractData = require("./contracts.json");
const NFT_CONTRACT_ADDRESS = contractData.contracts.ViePropChainNFT.address;
const MARKETPLACE_CONTRACT_ADDRESS = contractData.contracts.Marketplace.address;
const POLL_INTERVAL = Number(process.env.POLL_INTERVAL) || 5000; // 5 seconds

// Contract ABIs
const NFT_ABI = contractData.contracts.ViePropChainNFT.abi;
const MARKETPLACE_ABI = contractData.contracts.Marketplace.abi;

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
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
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
║              BLOCKCHAIN SYNCHRONIZATION SERVICE              ║
║══════════════════════════════════════════════════════════════║
║  Ganache: ${GANACHE_URL}                         ║
║  NFT Contract: ${NFT_CONTRACT_ADDRESS}        ║
║  Marketplace: ${MARKETPLACE_CONTRACT_ADDRESS}         ║
║  Poll Interval: ${POLL_INTERVAL}ms                                        ║
║  MongoDB: ${
  mongoose.connection.readyState === 1 ? "Connected ✅" : "Connecting... ⏳"
}                                   ║
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
    // Đợi MongoDB kết nối
    let retries = 0;
    while (mongoose.connection.readyState !== 1 && retries < 10) {
      console.log("⏳ Waiting for MongoDB connection...");
      await new Promise((resolve) => setTimeout(resolve, 1000));
      retries++;
    }

    if (mongoose.connection.readyState !== 1) {
      throw new Error("MongoDB not connected after 10 seconds");
    }

    let latestTransaction = null;
    try {
      latestTransaction = await Transaction.findOne()
        .sort({ blockNumber: -1 })
        .select("blockNumber")
        .maxTimeMS(5000);
    } catch (err) {
      console.warn(
        "⚠️ Transaction collection not found or empty, will create a sample document."
      );
    }

    if (!latestTransaction) {
      // Tạo document mẫu nếu collection rỗng
      const currentBlock = await provider.getBlockNumber();
      try {
        const coll = mongoose.connection.db.collection("transactions");
        await coll.insertOne({
          transactionHash: "init",
          type: "mint",
          from: "0x0",
          to: "0x0",
          tokenId: 0,
          blockNumber: currentBlock,
          gasUsed: 0,
          status: "confirmed",
          timestamp: new Date(),
        });
        lastProcessedBlock = currentBlock;
        console.log(
          `📌 Created sample transaction, starting from current block ${currentBlock}`
        );
      } catch (err) {
        console.error(
          "❌ Failed to create sample transaction via raw insert:",
          err.message
        );
        // fallback to set lastProcessedBlock to current block
        lastProcessedBlock = currentBlock;
      }
    } else {
      lastProcessedBlock = latestTransaction.blockNumber;
      console.log(`📌 Resuming from block ${lastProcessedBlock}`);
    }
  } catch (error) {
    console.error("❌ Error initializing last block:", error.message);
    const currentBlock = await provider.getBlockNumber();
    lastProcessedBlock = currentBlock;
    console.log(`📌 Defaulting to current block ${currentBlock}`);
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
    // ensure DB writable/readable
    await waitForDbWritable(10, 500);
    const property = await Property.findOne({ "nft.tokenId": tokenId })
      .maxTimeMS(10000)
      .exec();
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

// Normalize owner/address value to lowercase string safely
function normalizeAddress(value) {
  if (!value && value !== 0) return "";
  if (typeof value === "string") return value.toLowerCase();
  try {
    return String(value).toLowerCase();
  } catch (err) {
    return "";
  }
}

// ============================================================================
// PROCESS ITEMLISTED EVENT
// ============================================================================
async function processItemListedEvent(event) {
  try {
    const { listingId, seller, tokenId, price } = event.args;
    // Normalize listingId safely. Some events might provide BigNumber-like objects.
    let listingIdNumber = null;
    try {
      if (listingId === null || listingId === undefined) {
        listingIdNumber = null;
      } else if (typeof listingId === "object" && listingId.toString) {
        listingIdNumber = Number(listingId.toString());
      } else {
        listingIdNumber = Number(listingId);
      }
      if (!Number.isFinite(listingIdNumber)) listingIdNumber = null;
    } catch (err) {
      listingIdNumber = null;
    }
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

    // Prepare listing document
    // If listingId is missing/invalid, generate a fallback unique id based on block and logIndex
    if (listingIdNumber === null) {
      listingIdNumber =
        Number(event.blockNumber) * 100000 + Number(event.logIndex || 0);
      console.warn(
        `   ⚠️  Event missing listingId; using generated fallback id ${listingIdNumber}`
      );
    }

    const listingDoc = {
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
    };

    // Upsert by listingId to avoid duplicate key errors and to be idempotent
    try {
      await Listing.findOneAndUpdate(
        { listingId: listingIdNumber },
        { $set: listingDoc },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      ).exec();
      console.log(`   ✅ Listing upserted in MongoDB: ID ${listingIdNumber}`);
    } catch (err) {
      console.error(
        `   ❌ Failed to upsert Listing ${listingIdNumber}:`,
        err.message
      );
    }

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
    let listing = null;
    try {
      listing = await Listing.findOne({ listingId: listingIdNumber })
        .maxTimeMS(10000)
        .exec();
    } catch (err) {
      console.error(
        `   ⚠️  DB query timeout finding Listing ${listingIdNumber}:`,
        err.message
      );
    }
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
      // Also ensure property.nft data is set if property exists
      try {
        const prop = await dbFindOne(
          "properties",
          { "nft.tokenId": tokenId },
          1,
          5000
        );
        if (prop) {
          await dbUpdateOne(
            "properties",
            { _id: prop._id },
            {
              $set: {
                owner: owner.toLowerCase(),
                "nft.isMinted": true,
                "nft.tokenId": tokenId,
                "nft.contractAddress": NFT_CONTRACT_ADDRESS,
                "nft.metadataUri": tokenURI || prop.nft?.metadataUri || "",
                "nft.mintedAt": new Date(),
              },
            }
          );
          console.log(`   ✅ Ensured Property NFT data for token ${tokenId}`);
        }
      } catch (err) {
        console.error(`   ⚠️ Failed to update property NFT data:`, err.message);
      }
      console.log(`   ✅ Property ownership transferred`);
    }

    // Update NFT owner
    let nft = null;
    try {
      nft = await NFT.findOne({ tokenId: tokenIdNumber })
        .maxTimeMS(10000)
        .exec();
    } catch (err) {
      console.error(
        `   ⚠️  DB query timeout finding NFT #${tokenIdNumber}:`,
        err.message
      );
    }
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
    let listing = null;
    try {
      listing = await Listing.findOne({ listingId: listingIdNumber })
        .maxTimeMS(10000)
        .exec();
    } catch (err) {
      console.error(
        `   ⚠️  DB query timeout finding Listing ${listingIdNumber}:`,
        err.message
      );
    }
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
// SYNC NFTs FROM BLOCKCHAIN TO DATABASE
// ============================================================================
async function syncNFTsFromBlockchain() {
  console.log("\n🔄 Starting NFT sync from blockchain...");

  // Ensure DB writable before performing read/write operations
  try {
    await waitForDbWritable(10, 1000);
  } catch (err) {
    console.error("❌ DB not writable, aborting NFT sync:", err.message);
    return;
  }
  try {
    // Get total supply from contract
    const totalSupply = await nftContract.totalSupply();
    const totalSupplyNumber = Number(totalSupply);

    console.log(`📊 Total NFTs on blockchain: ${totalSupplyNumber}`);

    let synced = 0;
    let updated = 0;
    let created = 0;

    for (let tokenId = 0; tokenId < totalSupplyNumber; tokenId++) {
      try {
        // Get owner from blockchain
        const owner = await nftContract.ownerOf(tokenId);

        // Get tokenURI
        let tokenURI = "";
        let metadata = null;
        try {
          tokenURI = await nftContract.tokenURI(tokenId);
          metadata = await fetchMetadataFromIPFS(tokenURI);
        } catch (err) {
          console.log(`   ⚠️  Could not fetch metadata for token ${tokenId}`);
        }

        // Find or create NFT in database using raw collection ops
        let nft = null;
        try {
          nft = await dbFindOne("nfts", { tokenId }, 3, 10000);
        } catch (err) {
          console.error(
            `   ⚠️  DB query error finding NFT #${tokenId}:`,
            err.message
          );
        }

        if (nft) {
          // Update existing NFT
          if ((nft.owner || "").toLowerCase() !== owner.toLowerCase()) {
            try {
              await dbUpdateOne(
                "nfts",
                { tokenId },
                { $set: { owner: owner.toLowerCase() } }
              );
              updated++;
              console.log(`   ✅ Updated NFT #${tokenId} owner: ${owner}`);
            } catch (err) {
              console.error(
                `   ❌ Failed updating NFT #${tokenId}:`,
                err.message
              );
            }
          }
        } else {
          // Create new NFT via raw insert
          const nftDoc = {
            tokenId,
            contractAddress: NFT_CONTRACT_ADDRESS,
            owner: owner.toLowerCase(),
            tokenURI,
            metadata: metadata || {},
            name: metadata?.name || `ViePropChain NFT #${tokenId}`,
            description: metadata?.description || "",
            image: metadata?.image || "",
            createdAt: new Date(),
          };
          try {
            await dbInsertOne("nfts", nftDoc, 3);
            created++;
            console.log(`   ✅ Created NFT #${tokenId} owner: ${owner}`);
          } catch (err) {
            console.error(
              `   ❌ Error inserting NFT #${tokenId}:`,
              err.message
            );
          }
        }

        synced++;

        // Update associated property if exists (raw ops)
        let property = null;
        try {
          property = await dbFindOne(
            "properties",
            { "nft.tokenId": tokenId },
            3,
            10000
          );
        } catch (err) {
          console.error(
            `   ⚠️  DB query error finding Property for NFT #${tokenId}:`,
            err.message
          );
        }
        if (
          property &&
          (property.owner || "").toLowerCase() !== owner.toLowerCase()
        ) {
          try {
            await dbUpdateOne(
              "properties",
              { _id: property._id },
              { $set: { owner: owner.toLowerCase() } }
            );
            console.log(`   ✅ Updated Property ownership for NFT #${tokenId}`);
          } catch (err) {
            console.error(
              `   ❌ Failed updating property for NFT #${tokenId}:`,
              err.message
            );
          }
        }
        // Ensure property has nft metadata set when NFT exists
        try {
          if (property) {
            await dbUpdateOne(
              "properties",
              { _id: property._id },
              {
                $set: {
                  "nft.isMinted": true,
                  "nft.tokenId": tokenId,
                  "nft.contractAddress": NFT_CONTRACT_ADDRESS,
                  "nft.metadataUri":
                    tokenURI || property.nft?.metadataUri || "",
                  "nft.mintedAt": property.nft?.mintedAt || new Date(),
                },
              }
            );
            console.log(
              `   ✅ Ensured Property.nft fields for property ${property._id}`
            );
          }
        } catch (err) {
          console.error(
            `   ⚠️ Failed ensuring Property.nft fields:`,
            err.message
          );
        }
      } catch (error) {
        console.error(`   ❌ Error syncing NFT #${tokenId}:`, error.message);
      }
    }

    console.log(`\n✅ NFT Sync Complete:`);
    console.log(`   - Total Synced: ${synced}/${totalSupplyNumber}`);
    console.log(`   - Created: ${created}`);
    console.log(`   - Updated: ${updated}`);
  } catch (error) {
    console.error("❌ Error syncing NFTs from blockchain:", error);
  }
}

// ============================================================================
// SYNC PROPERTIES WITH BLOCKCHAIN
// ============================================================================
async function syncPropertiesWithBlockchain() {
  console.log("\n🔄 Starting Properties sync with blockchain...");

  try {
    await waitForDbWritable(10, 1000);

    // Try raw collection first to avoid mongoose buffering/timeouts
    let properties = [];
    try {
      properties = await dbFindMany(
        "properties",
        { "nft.tokenId": { $exists: true } },
        3,
        10000
      );
    } catch (err) {
      console.warn(
        "   ⚠️ dbFindMany failed, falling back to Mongoose Property.find():",
        err.message
      );
      try {
        properties = await Property.find({ "nft.tokenId": { $exists: true } })
          .maxTimeMS(10000)
          .exec();
      } catch (err2) {
        console.error(
          "   ❌ Both raw and Mongoose property queries failed:",
          err2.message
        );
        return; // abort properties sync
      }
    }
    console.log(`📊 Total Properties with NFTs: ${properties.length}`);

    let synced = 0;
    let updated = 0;

    for (const property of properties) {
      try {
        const tokenId = property.nft.tokenId;

        // Get owner from blockchain
        const blockchainOwner = normalizeAddress(
          await nftContract.ownerOf(tokenId)
        );

        // Current owner from DB (handle both raw doc and mongoose doc)
        const dbOwner = normalizeAddress(property.owner);

        if (dbOwner !== blockchainOwner) {
          // Update via raw collection to avoid mongoose buffering issues
          try {
            await dbUpdateOne(
              "properties",
              { _id: property._id },
              { $set: { owner: blockchainOwner } }
            );
            updated++;
            console.log(
              `   ✅ Updated Property "${
                property.title || property._id
              }" (NFT #${tokenId}) owner: ${blockchainOwner}`
            );
          } catch (err) {
            console.error(
              `   ❌ Failed to update property ${property._id} via raw update:`,
              err.message
            );
          }
        }

        synced++;
      } catch (error) {
        console.error(
          `   ❌ Error syncing property ${
            property._id || property._id.toString()
          }:`,
          error.message
        );
      }
    }

    console.log(`\n✅ Properties Sync Complete:`);
    console.log(`   - Total Synced: ${synced}/${properties.length}`);
    console.log(`   - Updated: ${updated}`);
  } catch (error) {
    console.error("❌ Error syncing properties with blockchain:", error);
  }
}

// ============================================================================
// PROCESS NFT TRANSFER EVENT
// ============================================================================
async function processTransferEvent(event) {
  try {
    const { from, to, tokenId } = event.args;
    const tokenIdNumber = Number(tokenId);

    console.log(
      `   📤 Processing Transfer: NFT #${tokenIdNumber} from ${from} to ${to}`
    );

    // Skip mint events (from = 0x0)
    if (from === ethers.ZeroAddress) {
      console.log(`   ℹ️  Mint event - will be handled by sync function`);
      return;
    }

    // Update NFT owner in database
    let nft = null;
    try {
      nft = await NFT.findOne({ tokenId: tokenIdNumber })
        .maxTimeMS(10000)
        .exec();
    } catch (err) {
      console.error(
        `   ⚠️  DB query timeout finding NFT #${tokenIdNumber}:`,
        err.message
      );
    }
    if (nft) {
      nft.owner = to.toLowerCase();
      await nft.save();
      console.log(`   ✅ NFT owner updated in database`);
    } else {
      console.log(`   ⚠️  NFT not found in database - creating...`);
      // Create NFT if not exists
      try {
        const tokenURI = await nftContract.tokenURI(tokenIdNumber);
        const metadata = await fetchMetadataFromIPFS(tokenURI);

        nft = new NFT({
          tokenId: tokenIdNumber,
          contractAddress: NFT_CONTRACT_ADDRESS,
          owner: to.toLowerCase(),
          tokenURI,
          metadata: metadata || {},
          name: metadata?.name || `ViePropChain NFT #${tokenIdNumber}`,
          description: metadata?.description || "",
          image: metadata?.image || "",
        });
        await nft.save();
        console.log(`   ✅ NFT created in database`);
      } catch (err) {
        console.error(`   ❌ Error creating NFT:`, err.message);
      }
    }

    // Update property owner if exists
    const property = await Property.findOne({ "nft.tokenId": tokenIdNumber });
    if (property) {
      property.owner = to.toLowerCase();
      await property.save();
      console.log(`   ✅ Property owner updated`);
    }
  } catch (error) {
    console.error("   ❌ Error processing Transfer event:", error);
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

    // Query NFT Transfer events
    const transferFilter = nftContract.filters.Transfer();

    // Query Marketplace events
    const itemListedFilter = marketplaceContract.filters.ItemListed();
    const itemSoldFilter = marketplaceContract.filters.ItemSold();
    const listingCancelledFilter =
      marketplaceContract.filters.ListingCancelled();

    // Get all events
    const [transferEvents, listedEvents, soldEvents, cancelledEvents] =
      await Promise.all([
        nftContract.queryFilter(
          transferFilter,
          lastProcessedBlock + 1,
          currentBlock
        ),
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
      transferEvents.length +
      listedEvents.length +
      soldEvents.length +
      cancelledEvents.length;

    if (totalEvents > 0) {
      console.log(`📦 Found ${totalEvents} event(s):`);
      console.log(`   - NFT Transfer: ${transferEvents.length}`);
      console.log(`   - ItemListed: ${listedEvents.length}`);
      console.log(`   - ItemSold: ${soldEvents.length}`);
      console.log(`   - ListingCancelled: ${cancelledEvents.length}`);

      // Process events in chronological order
      const allEvents = [
        ...transferEvents.map((e) => ({ ...e, type: "Transfer" })),
        ...listedEvents.map((e) => ({ ...e, type: "ItemListed" })),
        ...soldEvents.map((e) => ({ ...e, type: "ItemSold" })),
        ...cancelledEvents.map((e) => ({ ...e, type: "ListingCancelled" })),
      ].sort((a, b) => a.blockNumber - b.blockNumber);

      for (const event of allEvents) {
        switch (event.type) {
          case "Transfer":
            await processTransferEvent(event);
            break;
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
    let retries = 0;
    while (mongoose.connection.readyState !== 1 && retries < 10) {
      console.log("⏳ Waiting for MongoDB connection...");
      await new Promise((resolve) => setTimeout(resolve, 1000));
      retries++;
    }

    if (mongoose.connection.readyState !== 1) {
      console.error("❌ MongoDB failed to connect after 10 seconds");
      process.exit(1);
    }

    // Ensure collections exist before any operation
    await ensureCollectionsReady();

    // Ensure DB is writable before attempting writes
    await waitForDbWritable(20, 1000);

    // Initialize last processed block
    await initializeLastBlock();

    // Perform initial sync
    console.log(
      "\n╔══════════════════════════════════════════════════════════════╗"
    );
    console.log(
      "║              INITIAL BLOCKCHAIN SYNC                        ║"
    );
    console.log(
      "╚══════════════════════════════════════════════════════════════╝"
    );

    await syncNFTsFromBlockchain();
    await syncPropertiesWithBlockchain();

    console.log(
      "\n╔══════════════════════════════════════════════════════════════╗"
    );
    console.log(
      "║              STARTING EVENT LISTENER                        ║"
    );
    console.log(
      "╚══════════════════════════════════════════════════════════════╝"
    );

    // Start polling
    console.log(
      `\n✅ Blockchain Indexer started - polling every ${POLL_INTERVAL}ms`
    );
    console.log(`📡 Listening for NFT and Marketplace events...\n`);

    pollInterval = setInterval(pollEvents, POLL_INTERVAL);

    // Initial poll
    await pollEvents();
  } catch (error) {
    console.error("❌ Error starting indexer:", error);
    process.exit(1);
  }
})();
