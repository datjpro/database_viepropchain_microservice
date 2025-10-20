/**
 * ========================================================================
 * INDEXER SERVICE - Background Worker
 * ========================================================================
 * Nhiệm vụ: Lắng nghe blockchain events và update MongoDB
 * - Transfer events → Update NFT owner
 * - ItemListed events → Update Marketplace
 * - ItemSold events → Update Property status
 * ========================================================================
 */

const { ethers } = require('ethers');
const mongoose = require('mongoose');
require('dotenv').config();

const { NFT, Property, Transaction } = require('../../shared/models');

// ============================================================================
// CONFIGURATION
// ============================================================================
const GANACHE_URL = process.env.GANACHE_URL || 'http://127.0.0.1:8545';
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const POLL_INTERVAL = Number(process.env.POLL_INTERVAL) || 3000; // 3 seconds

// Contract ABI (minimal for events)
const CONTRACT_ABI = require('./contract-abi.json');

// ============================================================================
// MONGODB CONNECTION
// ============================================================================
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB connected'))
.catch(err => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

// ============================================================================
// BLOCKCHAIN CONNECTION
// ============================================================================
const provider = new ethers.JsonRpcProvider(GANACHE_URL);
const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

console.log(`
╔══════════════════════════════════════════════════════════════╗
║                   INDEXER SERVICE                            ║
║══════════════════════════════════════════════════════════════║
║  Ganache: ${GANACHE_URL}                         ║
║  Contract: ${CONTRACT_ADDRESS}        ║
║  Poll Interval: ${POLL_INTERVAL}ms                                        ║
║  MongoDB: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Connecting...'}                                       ║
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
      .select('blockNumber');
    
    if (latestTransaction) {
      lastProcessedBlock = latestTransaction.blockNumber;
      console.log(`📌 Resuming from block ${lastProcessedBlock}`);
    } else {
      const currentBlock = await provider.getBlockNumber();
      lastProcessedBlock = currentBlock;
      console.log(`📌 Starting from current block ${currentBlock}`);
    }
  } catch (error) {
    console.error('❌ Error initializing last block:', error);
    const currentBlock = await provider.getBlockNumber();
    lastProcessedBlock = currentBlock;
  }
}

// ============================================================================
// PROCESS TRANSFER EVENT
// ============================================================================
async function processTransferEvent(event) {
  try {
    const { from, to, tokenId } = event.args;
    const tokenIdNumber = Number(tokenId);
    
    console.log(`   🔄 Processing Transfer: Token ${tokenIdNumber} from ${from} to ${to}`);
    
    // Get transaction details
    const tx = await event.getTransaction();
    const receipt = await event.getTransactionReceipt();
    
    // Update or create NFT document
    let nft = await NFT.findOne({ tokenId: tokenIdNumber });
    
    if (!nft) {
      // New mint
      try {
        const tokenURI = await contract.tokenURI(tokenIdNumber);
        
        nft = new NFT({
          tokenId: tokenIdNumber,
          owner: to.toLowerCase(),
          tokenURI,
          transferHistory: [],
          createdAt: new Date()
        });
        
        console.log(`   ✅ New NFT created: Token ${tokenIdNumber}`);
      } catch (error) {
        console.error(`   ❌ Error fetching tokenURI for ${tokenIdNumber}:`, error.message);
        return;
      }
    } else {
      // Transfer
      nft.owner = to.toLowerCase();
      console.log(`   ✅ NFT ownership updated: Token ${tokenIdNumber}`);
    }
    
    // Add to transfer history
    nft.transferHistory.push({
      from: from.toLowerCase(),
      to: to.toLowerCase(),
      transactionHash: tx.hash,
      blockNumber: event.blockNumber,
      timestamp: new Date()
    });
    
    await nft.save();
    
    // Update Property if exists
    const property = await Property.findOne({ 'nft.tokenId': tokenIdNumber });
    
    if (property) {
      property.nft.currentOwner = to.toLowerCase();
      property.owner = to.toLowerCase();
      await property.save();
      
      console.log(`   ✅ Property ownership updated: ${property._id}`);
    }
    
    // Save transaction
    const transaction = new Transaction({
      transactionHash: tx.hash,
      type: from === ethers.ZeroAddress ? 'mint' : 'transfer',
      from: from.toLowerCase(),
      to: to.toLowerCase(),
      tokenId: tokenIdNumber,
      blockNumber: event.blockNumber,
      gasUsed: receipt ? Number(receipt.gasUsed) : 0,
      status: 'confirmed',
      timestamp: new Date()
    });
    
    await transaction.save();
    
    console.log(`   ✅ Transaction saved: ${tx.hash}`);
    
  } catch (error) {
    console.error('   ❌ Error processing Transfer event:', error);
  }
}

// ============================================================================
// POLL FOR NEW EVENTS
// ============================================================================
async function pollEvents() {
  if (isProcessing) {
    console.log('⏭️  Skipping poll - previous poll still processing');
    return;
  }
  
  isProcessing = true;
  
  try {
    const currentBlock = await provider.getBlockNumber();
    
    if (currentBlock <= lastProcessedBlock) {
      isProcessing = false;
      return;
    }
    
    console.log(`\n🔍 Polling blocks ${lastProcessedBlock + 1} to ${currentBlock}...`);
    
    // Query Transfer events
    const transferFilter = contract.filters.Transfer();
    const events = await contract.queryFilter(
      transferFilter,
      lastProcessedBlock + 1,
      currentBlock
    );
    
    if (events.length > 0) {
      console.log(`📦 Found ${events.length} Transfer event(s)`);
      
      for (const event of events) {
        await processTransferEvent(event);
      }
    }
    
    // Update last processed block
    lastProcessedBlock = currentBlock;
    
  } catch (error) {
    console.error('❌ Error polling events:', error);
  } finally {
    isProcessing = false;
  }
}

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================
async function shutdown() {
  console.log('\n🛑 Shutting down indexer service...');
  
  if (pollInterval) {
    clearInterval(pollInterval);
  }
  
  await mongoose.connection.close();
  console.log('✅ MongoDB connection closed');
  
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// ============================================================================
// START INDEXER
// ============================================================================
let pollInterval;

(async function start() {
  try {
    // Wait for MongoDB connection
    while (mongoose.connection.readyState !== 1) {
      console.log('⏳ Waiting for MongoDB connection...');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Initialize last processed block
    await initializeLastBlock();
    
    // Start polling
    console.log(`\n✅ Indexer service started - polling every ${POLL_INTERVAL}ms\n`);
    
    pollInterval = setInterval(pollEvents, POLL_INTERVAL);
    
    // Initial poll
    await pollEvents();
    
  } catch (error) {
    console.error('❌ Error starting indexer:', error);
    process.exit(1);
  }
})();
